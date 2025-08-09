import { renderMessage, renderPasswordPrompt, renderRedirectPage, renderStatsPage, renderFilePreviewPage, renderDownloadPage } from './templates';

// --- 类型定义 ---
interface ShareItem {
    type: 'link' | 'message' | 'file';
    target?: string;
    content?: string;
    filename?: string;
    contentType?: string;
    password?: string;
    oneTime?: boolean;
    createdAt: string;
    views: number;
    history: { time: number; country: string }[];
    expiryTimestamp?: number;
}

export interface Env {
	LINKS_KV: KVNamespace;
	FILES_R2: R2Bucket;
	TURNSTILE_SECRET_KEY: string;
	ADMIN_SECRET: string;
	APP_URL: string;
}

// --- 辅助函数 ---
const generateShortCode = async (kv: KVNamespace): Promise<string> => {
	const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
	for (let i = 0; i < 10; i++) {
		let code = '';
		for (let j = 0; j < 6; j++) { code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length)); }
		if (!(await kv.get(code))) { return code; }
	}
	throw new Error('Failed to generate a unique short code.');
};
const verifyTurnstile = async (token: string, secretKey: string, ip: string): Promise<boolean> => {
	const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ secret: secretKey, response: token, remoteip: ip }),
	});
	const data: any = await response.json();
	return data.success;
};


// --- 中间件总处理器 ---
export const onRequest: PagesFunction<Env> = async (context) => {
	const { request, env, next } = context;
	const url = new URL(request.url);
    const logoUrl = `${url.origin}/logo.svg`;

	// 路由 1: API 创建接口
	if (url.pathname === '/api/create' && request.method === 'POST') {
        try {
			const isAdmin = request.headers.get('x-admin-secret') === env.ADMIN_SECRET;
			const formData = await request.formData();
			if (!isAdmin) {
				const token = formData.get('cf-turnstile-response') as string;
				const ip = request.headers.get('cf-connecting-ip') as string;
				if (!token || !(await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, ip))) {
					return new Response(JSON.stringify({ error: 'Turnstile verification failed.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
				}
			}
			const type = formData.get('type') as 'link' | 'message' | 'file';
			const customCode = formData.get('customCode') as string;
			const password = formData.get('password') as string;
			const oneTime = formData.get('oneTime') === 'true';
            const expiry = formData.get('expiry') as string;
			
            let shortCode = customCode ? customCode.trim().replace(/\s/g, '-') : await generateShortCode(env.LINKS_KV);
			if (customCode && (await env.LINKS_KV.get(shortCode))) { return new Response(JSON.stringify({ error: 'Custom code is already in use.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });}
			
            const item: ShareItem = { type, oneTime, createdAt: new Date().toISOString(), views: 0, history: [] };
			if (password) { item.password = password; }
            
            if (expiry && expiry !== 'never') {
                const now = Date.now();
                const days = parseInt(expiry.replace('d', ''));
                item.expiryTimestamp = now + days * 24 * 60 * 60 * 1000;
            }

			switch (type) {
				case 'link':
					const targetUrl = formData.get('target') as string;
                    if (!targetUrl || !/^https?:\/\//.test(targetUrl)) { return new Response(JSON.stringify({ error: 'Invalid URL format.' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
					item.target = targetUrl;
					break;
				case 'message':
					const message = formData.get('content') as string;
                    if (!message) { return new Response(JSON.stringify({ error: 'Message content cannot be empty.' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
					item.content = message;
					break;
				case 'file':
					const file = formData.get('file') as File;
                    if (!file) { return new Response(JSON.stringify({ error: 'File not provided.' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
					// 对于非管理员上传的文件，强制24小时有效期，除非用户选择了更短的
					if (!isAdmin) {
                        const twentyFourHours = Date.now() + 24 * 60 * 60 * 1000;
                        item.expiryTimestamp = item.expiryTimestamp ? Math.min(item.expiryTimestamp, twentyFourHours) : twentyFourHours;
                    }
					await env.FILES_R2.put(shortCode, file.stream(), { httpMetadata: { contentType: file.type || 'application/octet-stream' }, customMetadata: { filename: file.name } });
					item.filename = file.name;
					item.contentType = file.type || 'application/octet-stream';
					break;
				default:
					return new Response(JSON.stringify({ error: 'Invalid share type.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
			}
			const kvOptions: any = {};
            if (item.expiryTimestamp) {
                kvOptions.expiration = Math.floor(item.expiryTimestamp / 1000);
            }
			await env.LINKS_KV.put(shortCode, JSON.stringify(item), kvOptions);
			return new Response(JSON.stringify({ shortUrl: `${env.APP_URL}/${shortCode}` }), { headers: { 'Content-Type': 'application/json' } });
		} catch (err: any) {
			console.error('API Error:', err);
			return new Response(JSON.stringify({ error: err.message || 'An unexpected error occurred in API.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
		}
	}

	// 路由 2: 判断是否是短链接路径
	const pathSegments = url.pathname.substring(1).split('/');
	if (pathSegments.length !== 1 || !pathSegments[0] || pathSegments[0].includes('.')) {
        return next();
    }

	// 路由 3: 短链接处理
    try {
        let code = pathSegments[0];
        const isInfoRequest = code.endsWith('+');
		if (isInfoRequest) { code = code.slice(0, -1); }

        const dataStr = await env.LINKS_KV.get(code);
        if (!dataStr) { return next(); }
        
        const data: ShareItem = JSON.parse(dataStr);
        
        if (isInfoRequest) {
            const stats = { code, views: data.views, history: data.history || [] };
            return new Response(renderStatsPage(stats, logoUrl), { headers: { 'Content-Type': 'text/html; charset=utf-8' }});
        }
        
        if (data.password) {
			const providedPassword = url.searchParams.get('password');
			if (providedPassword !== data.password) {
				return new Response(renderPasswordPrompt(code, logoUrl), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
			}
		}

        data.views += 1;
        if (!data.history) data.history = [];
        data.history.unshift({ time: Date.now(), country: request.headers.get('cf-ipcountry') || 'Unknown' });
        data.history = data.history.slice(0, 100);

        const kvOptions: any = {};
        if (data.expiryTimestamp) {
            kvOptions.expiration = Math.floor(data.expiryTimestamp / 1000);
        }

        if (data.oneTime) {
			await env.LINKS_KV.delete(code);
			if (data.type === 'file') { await env.FILES_R2.delete(code); }
		} else {
			await env.LINKS_KV.put(code, JSON.stringify(data), kvOptions);
		}
        
        switch (data.type) {
			case 'link':
				return new Response(renderRedirectPage(data.target!, logoUrl), { headers: { 'Content-Type': 'text/html; charset=utf-8' }});
			case 'message':
				return new Response(renderMessage(data.content!, logoUrl), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
			case 'file':
				const object = await env.FILES_R2.get(code);
				if (object === null) {
					await env.LINKS_KV.delete(code);
					return new Response('File not found in storage.', { status: 404 });
				}
                const filename = data.filename || 'file';
                const contentType = data.contentType || 'application/octet-stream';
                
                const textPreviewExtensions = ['.md', '.txt', '.js', '.ts', '.py', '.html', '.css', '.json', '.java', '.c', '.cpp', '.go', '.rs', '.xml', '.yml', '.yaml'];
                if (textPreviewExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
                    const fileContent = await object.text();
                    return new Response(renderMessage(fileContent, logoUrl, url.href), { headers: { 'Content-Type': 'text/html; charset=utf-8' }});
                }

                if (url.searchParams.get('download') === 'true') {
                    const headers = new Headers();
				    object.writeHttpMetadata(headers);
                    headers.set('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
				    return new Response(object.body, { headers });
                }

                const supportedMediaTypes = ['image/', 'video/', 'audio/', 'application/pdf'];
                if (supportedMediaTypes.some(prefix => contentType.startsWith(prefix))) {
                    if (contentType.startsWith('image/')) {
                        const headers = new Headers();
                        object.writeHttpMetadata(headers);
                        headers.set('content-disposition', 'inline');
                        return new Response(object.body, { headers });
                    }
                    return new Response(renderFilePreviewPage(url.href, contentType, filename, logoUrl), { headers: { 'Content-Type': 'text/html; charset=utf-8' }});
                }
                
                return new Response(renderDownloadPage(url.href, filename, contentType, logoUrl), { headers: { 'Content-Type': 'text/html; charset=utf-8' }});
		}
        return new Response('Invalid share type found in database.', { status: 500 });
        
    } catch (err: any) {
        console.error('Shortlink Error:', err);
		return new Response(err.message || 'An unexpected error occurred.', { status: 500 });
    }
};