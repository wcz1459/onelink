// functions/templates.ts (Optimized & Final Full Version)

// --- 新增：可复用的页脚模块 ---
const renderSharedFooter = () => {
    const currentYear = new Date().getFullYear();

    return `
    <footer>
        <div class="footer-line">
            <span>Powered by Cloudflare</span>
            <img src="/cflogo.svg" alt="Cloudflare Logo" class="cf-logo">
        </div>
        <p class="tribute-text">Cloudflare的恩情还不完🤚😭✋</p>
        <p class="dev-footer">© ${currentYear} Linkium · All Rights Reserved.</p>
    </footer>
    `;
};


// --- 统一的 <head> 和页脚样式 ---
const sharedHead = (title: string, logoUrl: string) => `
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | OneLink</title>
    <link rel="icon" href="${logoUrl}" type="image/svg+xml">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f2f5; color: #333; text-align: center; padding: 1rem; box-sizing: border-box; }
        .card { background: white; padding: 2rem 3rem; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); max-width: 90%; width: 500px; margin-bottom: auto; margin-top: auto; }
        .logo { width: 50px; height: 50px; margin-bottom: 1rem; }
        h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
        p { margin: 0 0 1.5rem 0; color: #666; }
        a { color: #007aff; text-decoration: none; word-break: break-all; }
        .countdown { font-size: 1.2rem; font-weight: bold; margin-top: 1rem; }
        .download-button { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background-color: #007aff; color: white; border-radius: 8px; text-decoration: none; font-size: 1.1rem; }
        
        footer { width: 100%; text-align: center; margin-top: 3rem; padding: 1.5rem 0; border-top: 1px solid #e0e0e0; opacity: 0.8; }
        .footer-line { display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 0.9rem; margin-bottom: 0.75rem; }
        .footer-line img.cf-logo { width: 20px; height: auto; }
        .tribute-text { font-size: 0.8rem; font-family: 'Courier New', Courier, monospace; opacity: 0.7; margin-bottom: 1rem; color: #555; }
        .dev-footer { font-size: 0.85rem; opacity: 0.9; color: #333; }
        
        @media (prefers-color-scheme: dark) {
            body { background: #121212; color: #eee; }
            .card { background: #1e1e1e; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
            p { color: #aaa; }
            a { color: #0a84ff; }
            .download-button { background-color: #0a84ff; }
            footer { border-top-color: #333; }
            .tribute-text { color: #888; }
            .dev-footer { color: #ccc; }
        }
    </style>
</head>
`;

// --- 所有页面模板都将使用新的页脚 ---

export const renderRedirectPage = (targetUrl: string, logoUrl: string) => `
<!DOCTYPE html><html lang="en">
${sharedHead('Redirecting...', logoUrl)}
<body>
    <div class="card">
        <img src="${logoUrl}" alt="Logo" class="logo">
        <h1>正在跳转...</h1>
        <p>您将被重定向到：<br><a>${targetUrl}</a></p>
        <div id="countdown" class="countdown">3</div>
    </div>
    <script>
        const target = "${targetUrl}";
        const countdownElement = document.getElementById('countdown');
        let count = 3;
        const interval = setInterval(() => {
            count--;
            countdownElement.textContent = count > 0 ? count : '🚀';
            if (count <= 0) {
                clearInterval(interval);
                window.location.href = target;
            }
        }, 1000);
    </script>
    ${renderSharedFooter()}
</body></html>`;

export const renderMessage = (content: string, logoUrl: string, downloadUrl?: string) => {
    const downloadButtonHtml = downloadUrl 
        ? `<div class="download-container"><a href="${downloadUrl}?download=true" class="download-button">下载原始文件</a></div>` 
        : '';
    
    return `
    <!DOCTYPE html><html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shared Content | OneLink</title>
        <link rel="icon" href="${logoUrl}" type="image/svg+xml">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 40px auto; background: #fff; color: #333; }
            @media (prefers-color-scheme: dark) { body { background: #121212; color: #eee; } code, pre { background-color: #2d2d2d; } .download-button { background-color: #0a84ff; } footer { border-top-color: #333; } .tribute-text { color: #888; } .dev-footer { color: #ccc; } }
            pre { padding: 1em; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
            .logo-container { text-align: center; margin-bottom: 2rem; }
            .logo { width: 50px; height: 50px; }
            .download-container { text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e0e0e0; }
            .download-button { display: inline-block; padding: 0.5rem 1rem; background-color: #007aff; color: white; border-radius: 8px; text-decoration: none; }
            footer { text-align: center; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0; opacity: 0.8; }
            .footer-line { display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 0.9rem; margin-bottom: 0.75rem; }
            .footer-line img.cf-logo { width: 20px; height: auto; }
            .tribute-text { font-size: 0.8rem; font-family: 'Courier New', Courier, monospace; opacity: 0.7; margin-bottom: 1rem; color: #555; }
            .dev-footer { font-size: 0.85rem; opacity: 0.9; color: #333; }
        </style>
    </head>
    <body>
        <div class="logo-container"><a href="/"><img src="${logoUrl}" alt="Logo" class="logo"></a></div>
        <div id="content"></div>
        ${downloadButtonHtml}
        ${renderSharedFooter()}
        <script>
            const contentDiv = document.querySelector('#content');
            if (contentDiv) {
                const rawContent = \`${content.replace(/`/g, '\\`')}\`;
                contentDiv.innerHTML = marked.parse(rawContent);
                document.querySelectorAll('pre code').forEach((block) => { hljs.highlightBlock(block); });
            }
        </script>
    </body></html>`;
};

export const renderStatsPage = (stats: any, logoUrl: string) => `
<!DOCTYPE html><html lang="en">
${sharedHead(`Stats for /${stats.code}`, logoUrl)}
<style>
    .card { width: 700px; max-width: 95%; }
    .stats-table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; text-align: left; }
    .stats-table th, .stats-table td { padding: 0.75rem; border-bottom: 1px solid #e0e0e0; }
    .stats-table th { font-weight: 600; }
    .table-container { max-height: 300px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px; }
    @media (prefers-color-scheme: dark) { 
        .stats-table th, .stats-table td { border-bottom-color: #333; }
        .table-container { border-color: #333; }
    }
</style>
<body>
    <div class="card">
        <a href="/"><img src="${logoUrl}" alt="Logo" class="logo"></a>
        <h1>访问统计</h1>
        <p>短链接: <strong>/${stats.code}</strong> | 总访问量: <strong>${stats.views}</strong></p>
        <div class="table-container">
            <table class="stats-table">
                <thead><tr><th>时间 (UTC)</th><th>来源国家</th></tr></thead>
                <tbody>
                    ${stats.history.length > 0 ? stats.history.map((h: any) => `<tr><td>${new Date(h.time).toLocaleString('sv-SE', { timeZone: 'UTC' })}</td><td>${h.country || 'N/A'}</td></tr>`).join('') : '<tr><td colspan="2" style="text-align: center; padding: 2rem;">暂无访问记录</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>
    ${renderSharedFooter()}
</body></html>`;

export const renderPasswordPrompt = (code: string, logoUrl: string) => `
<!DOCTYPE html><html lang="en">
${sharedHead('Password Required', logoUrl)}
<body>
    <div class="card">
        <img src="${logoUrl}" alt="Logo" class="logo">
        <h1>需要密码</h1>
        <p>此内容受密码保护</p>
        <form action="/${code}" method="GET" style="display: flex; gap: 0.5rem;">
            <input type="password" name="password" placeholder="输入密码" required autofocus style="flex-grow: 1; padding: 0.75rem; border: 1px solid #ccc; border-radius: 8px; font-size: 1rem;">
            <button type="submit" style="padding: 0.75rem 1.5rem; border: none; background-color: #007aff; color: white; border-radius: 8px; cursor: pointer; font-size: 1rem;">提交</button>
        </form>
    </div>
    ${renderSharedFooter()}
</body></html>`;

export const renderFilePreviewPage = (fileUrl: string, mimeType: string, filename: string, logoUrl: string) => `
<!DOCTYPE html><html lang="en">
${sharedHead(`Preview: ${filename}`, logoUrl)}
<style>
    .card { padding: 1.5rem; width: 80vw; max-width: 1000px; }
</style>
<body>
    <div class="card">
        <a href="/"><img src="${logoUrl}" alt="Logo" class="logo"></a>
        <h1>${filename}</h1>
        ${mimeType.startsWith('video/') ? `<video controls autoplay style="max-width: 100%; max-height: 70vh; border-radius: 8px;" src="${fileUrl}"></video>` : ''}
        ${mimeType.startsWith('audio/') ? `<audio controls autoplay src="${fileUrl}"></audio>` : ''}
        ${mimeType === 'application/pdf' ? `<embed src="${fileUrl}" type="application/pdf" style="width:100%; height: 75vh; border: none; border-radius: 8px;">` : ''}
        <p style="margin-top: 1.5rem;"><a href="${fileUrl}?download=true" class="download-button">下载文件</a></p>
    </div>
    ${renderSharedFooter()}
</body></html>`;

export const renderDownloadPage = (fileUrl: string, filename: string, contentType: string, logoUrl: string) => `
<!DOCTYPE html><html lang="en">
${sharedHead(`Download: ${filename}`, logoUrl)}
<body>
    <div class="card">
        <a href="/"><img src="${logoUrl}" alt="Logo" class="logo"></a>
        <h1>准备下载</h1>
        <p><strong>文件名:</strong> ${filename}</p>
        <p><strong>文件类型:</strong> ${contentType}</p>
        <a href="${fileUrl}?download=true" class="download-button">立即下载</a>
    </div>
    ${renderSharedFooter()}
</body></html>`;