// public/script.js

// 在你的 wrangler.toml 中设置 TURNSTILE_SITE_KEY 后，
// Pages 会自动将其注入到前端，我们不需要在这里硬编码。
// 但如果注入失败，可以手动替换下面的值作为备用方案。
const TURNSTILE_SITE_KEY = '0x4AAAAAABpUuSS5NWXiCyXD';

document.addEventListener('DOMContentLoaded', () => {
    // 主题切换
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (isDark) => {
        document.documentElement.classList.toggle('dark', isDark);
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    };

    applyTheme(localStorage.getItem('theme') === 'dark' || (localStorage.getItem('theme') === null && prefersDark.matches));
    
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', !isDark ? 'dark' : 'light');
        applyTheme(!isDark);
    });
    prefersDark.addEventListener('change', (e) => {
        if (localStorage.getItem('theme') === null) {
            applyTheme(e.matches);
        }
    });

    // Tab 切换
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
            // 清理其他 tab 的输入
            if (tab.dataset.tab !== 'link') document.getElementById('url-input').value = '';
            if (tab.dataset.tab !== 'message') document.getElementById('message-input').value = '';
            if (tab.dataset.tab !== 'file') document.getElementById('file-input').value = '';
        });
    });

    // Go 按钮逻辑
    const goBtn = document.getElementById('go-btn');
    const accessCodeInput = document.getElementById('access-code');
    const handleGo = () => {
        const value = accessCodeInput.value.trim();
        if (!value) return;

        try {
            const url = new URL(value);
            document.getElementById('url-input').value = value;
            document.querySelector('.tab-btn[data-tab="link"]').click();
            accessCodeInput.value = ''; // 清空输入框
        } catch (_) {
            window.location.href = `/${value}`;
        }
    };
    goBtn.addEventListener('click', handleGo);
    accessCodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleGo();
        }
    });

    // 表单提交逻辑
    const createBtn = document.getElementById('create-btn');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error-message');
    
    // 动态获取 Turnstile Site Key
    let turnstileSiteKey = 'YOUR_TURNSTILE_SITE_KEY'; // 默认值
    if (window.CFFeatureFlags && window.CFFeatureFlags.turnstile) {
        turnstileSiteKey = window.CFFeatureFlags.turnstile.sitekey;
    }

    // 渲染 Turnstile
    window.onloadTurnstileCallback = function () {
        if (typeof turnstile !== 'undefined') {
            turnstile.render('#turnstile-widget', {
                sitekey: turnstileSiteKey,
            });
        }
    };
    const tsScript = document.createElement('script');
    tsScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
    tsScript.async = true;
    tsScript.defer = true;
    document.head.appendChild(tsScript);

    createBtn.addEventListener('click', async () => {
        createBtn.disabled = true;
        createBtn.textContent = '生成中...';
        resultDiv.style.display = 'none';
        errorDiv.style.display = 'none';

        const formData = new FormData();
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        
        formData.append('type', activeTab);
        formData.append('customCode', document.getElementById('custom-code').value);
        formData.append('password', document.getElementById('password').value);
        formData.append('oneTime', document.getElementById('one-time').checked);
        
        const turnstileResponse = document.querySelector('[name="cf-turnstile-response"]');
        if (turnstileResponse) {
            formData.append('cf-turnstile-response', turnstileResponse.value);
        }

        if (activeTab === 'url') {
            formData.append('target', document.getElementById('url-input').value);
        } else if (activeTab === 'message') {
            formData.append('content', document.getElementById('message-input').value);
        } else if (activeTab === 'file') {
            const fileInput = document.getElementById('file-input');
            if (fileInput.files.length > 0) {
                formData.append('file', fileInput.files[0]);
            }
        }

        try {
            const response = await fetch('/api/create', {
                method: 'POST',
                body: formData,
            });

            // 总是先尝试解析 JSON，因为我们的后端无论成功失败都返回 JSON
            const data = await response.json();

            if (!response.ok) {
                // 如果 HTTP 状态码不是 2xx，就从 JSON 数据中提取错误信息
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            showResult(data.shortUrl);
        } catch (err) {
            // catch 块可以捕获网络错误 (fetch 失败) 和上面 throw 的错误
            showError(err.message);
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = '生成分享链接';
            if (typeof turnstile !== 'undefined') {
                turnstile.reset();
            }
        }
    });
    
    const showError = (message) => {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    };

    const showResult = (url) => {
        const resultUrlInput = document.getElementById('result-url');
        const qrcodeDiv = document.getElementById('qrcode');
        const infoLink = document.getElementById('info-link');

        resultUrlInput.value = url;
        infoLink.href = `${url}+`;
        
        qrcodeDiv.innerHTML = '';
        new QRCode(qrcodeDiv, {
            text: url,
            width: 128,
            height: 128,
            colorDark : document.documentElement.classList.contains('dark') ? '#FFFFFF' : '#000000',
            colorLight : document.documentElement.classList.contains('dark') ? '#211F26' : '#FFFFFF',
            correctLevel : QRCode.CorrectLevel.H
        });

        resultDiv.style.display = 'block';
    };
    
    document.getElementById('copy-btn').addEventListener('click', (e) => {
        const urlInput = document.getElementById('result-url');
        navigator.clipboard.writeText(urlInput.value).then(() => {
            e.target.textContent = '已复制!';
            setTimeout(() => e.target.textContent = '复制', 2000);
        });
    });
});
