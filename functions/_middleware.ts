// functions/_middleware.ts (Final & Verified Version)

// --- 类型和接口定义 ---
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
	expiresAt?: number;
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
const renderPasswordPrompt = (code: string) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Password Required</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f0f0}form{background:white;padding:2rem;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1)}input{font-size:1rem;padding:.5rem;margin-right:.5rem}button{font-size:1rem;padding:.5rem 1rem}</style></head><body><form action="/${code}" method="GET"><h3>Password Required</h3><input type="password" name="password" placeholder="Enter password" required autofocus><button type="submit">Submit</button></form></body></html>`;
const renderMessage = (content: string) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Shared Message</title><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css"><script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6;padding:20px;max-width:800px;margin:0 auto;background:#fff;color:#333}@media(prefers-color-scheme:dark){body{background:#121212;color:#eee}pre,code{background-color:#2d2d2d}}pre{padding:1em;border-radius:5px;overflow-x:auto}</style></head><body><div id="content"></div><script>document.getElementById('content').innerHTML=marked.parse(\`${content.replace(/`/g, '\\`')}\`);hljs.highlightAll();</script></body></html>`;


// --- 中间件总处理器 ---
export const onRequest: PagesFunction<Env> = async (context) => {
	const { request, env, next } = context;
	const url = new URL(request.url);

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
			const type = formData.get('type') as 'url' | 'message' | 'file';
			const customCode = formData.get('customCode') as string;
			const password = formData.get('password') as string;
			const oneTime = formData.get('oneTime') === 'true';
			let shortCode = customCode ? customCode.trim().replace(/\s/g, '-') : await generateShortCode(env.LINKS_KV);
			if (customCode && (await env.LINKS_KV.get(shortCode))) { return new Response(JSON.stringify({ error: 'Custom code is already in use.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });}
			const item: ShareItem = { type, oneTime, createdAt: new Date().toISOString(), views: 0 };
			if (password) { item.password = password; }
			switch (type) {
				case 'link':
    let targetUrl = formData.get('target') as string;
    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'URL cannot be empty.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 如果用户输入的 URL 既不以 http:// 也不以 https:// 开头
    if (!/^https?:\/\//i.test(targetUrl)) {
        // 我们就默认给它加上 https://
        targetUrl = 'https://' + targetUrl;
    }

    // 补全后再进行一次最终的、更宽松的 URL 格式验证
    try {
        new URL(targetUrl); // 尝试用标准的 URL 解析器来验证格式
    } catch (_) {
        return new Response(JSON.stringify({ error: 'Invalid URL format after auto-completion.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

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
					if (!isAdmin) { item.expiresAt = Date.now() + 24 * 60 * 60 * 1000; }
					await env.FILES_R2.put(shortCode, file.stream(), { httpMetadata: { contentType: file.type, contentDisposition: `attachment; filename="${file.name}"` }, customMetadata: { filename: file.name } });
					item.filename = file.name;
					item.contentType = file.type;
					break;
				default:
					return new Response(JSON.stringify({ error: 'Invalid share type.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
			}
			const expiration = item.expiresAt ? { expirationTtl: Math.ceil((item.expiresAt - Date.now()) / 1000) } : {};
			await env.LINKS_KV.put(shortCode, JSON.stringify(item), expiration);
			return new Response(JSON.stringify({ shortUrl: `${env.APP_URL}/${shortCode}` }), { headers: { 'Content-Type': 'application/json' } });
		} catch (err: any) {
			console.error('API Error:', err);
			return new Response(JSON.stringify({ error: err.message || 'An unexpected error occurred in API.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
		}
	}

	// 路由 2: 判断是否是短链接路径
	const pathSegments = url.pathname.substring(1).split('/');
	// 条件：只有一个路径段，不能为空，且不包含 `.` (以排除 a.css, b.js 等文件)
	if (pathSegments.length === 1 && pathSegments[0] && !pathSegments[0].includes('.')) {
		try {
			let code = pathSegments[0];
			const isInfoRequest = code.endsWith('+');
			if (isInfoRequest) { code = code.slice(0, -1); }
			const dataStr = await env.LINKS_KV.get(code);

			// 如果在KV里找不到，它不是一个有效的短链接。
			// 我们让它继续执行到 `next()`，由Pages的静态服务返回一个标准的404页面。
			if (!dataStr) {
				return next();
			}
			
			const data: ShareItem = JSON.parse(dataStr);
			if (isInfoRequest) {
				const info = { type: data.type, createdAt: data.createdAt, views: data.views, oneTime: data.oneTime, hasPassword: !!data.password, ...(data.expiresAt && { expiresAt: new Date(data.expiresAt).toISOString() }), ...(data.filename && { filename: data.filename }) };
				return new Response(JSON.stringify(info, null, 2), { headers: { 'Content-Type': 'application/json' } });
			}
			if (data.password) {
				const providedPassword = url.searchParams.get('password');
				if (providedPassword !== data.password) {
					return new Response(renderPasswordPrompt(code), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
				}
			}
			data.views += 1;
			if (data.oneTime) {
				await env.LINKS_KV.delete(code);
				if (data.type === 'file') { await env.FILES_R2.delete(code); }
			} else {
				const expiration = data.expiresAt ? { expirationTtl: Math.ceil((data.expiresAt - Date.now()) / 1000) } : {};
				await env.LINKS_KV.put(code, JSON.stringify(data), expiration);
			}
			if (data.type === 'file' && data.expiresAt && Date.now() > data.expiresAt) {
				await env.LINKS_KV.delete(code);
				await env.FILES_R2.delete(code);
				return new Response('Sorry, this file has expired and been deleted.', { status: 410 });
			}
			switch (data.type) {
				case 'url':
					return Response.redirect(data.target!, 302);
				case 'message':
					return new Response(renderMessage(data.content!), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
				case 'file':
					const object = await env.FILES_R2.get(code);
					if (object === null) {
						await env.LINKS_KV.delete(code);
						return new Response('File not found in storage.', { status: 404 });
					}
					const headers = new Headers();
					object.writeHttpMetadata(headers);
					const disposition = (object.httpMetadata?.contentType?.startsWith('image/')) ? 'inline' : `attachment; filename*=UTF-8''${encodeURIComponent(data.filename || 'file')}`;
					headers.set('content-disposition', disposition);
					headers.set('etag', object.httpEtag);
					return new Response(object.body, { headers });
			}
			return new Response('Invalid share type found in database.', { status: 500 });
			
		} catch (err: any) {
			console.error('Shortlink Error:', err);
			return new Response(err.message || 'An unexpected error occurred.', { status: 500 });
		}
	}

	// 默认行为：如果不是API调用，也不是短链接，就交给Pages的静态文件处理器
	// 这会处理 /index.html, /style.css, /script.js 等所有静态资源
	return next();
};
