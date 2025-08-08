// public/script.js (Final Hardened Version)

document.addEventListener('DOMContentLoaded', () => {
    // --- 主题切换、Tab切换、Go按钮逻辑 (这部分和之前一样，保持不变) ---
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
        if (localStorage.getItem('theme') === null) { applyTheme(e.matches); }
    });

    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
            if (tab.dataset.tab !== 'link') document.getElementById('url-input').value = '';
            if (tab.dataset.tab !== 'message') document.getElementById('message-input').value = '';
            if (tab.dataset.tab !== 'file') document.getElementById('file-input').value = '';
        });
    });

    const goBtn = document.getElementById('go-btn');
    const accessCodeInput = document.getElementById('access-code');
    const handleGo = () => {
        const value = accessCodeInput.value.trim();
        if (!value) return;
        try {
            new URL(value);
            document.getElementById('url-input').value = value;
            document.querySelector('.tab-btn[data-tab="link"]').click();
            accessCodeInput.value = '';
        } catch (_) {
            window.location.href = `/${value}`;
        }
    };
    goBtn.addEventListener('click', handleGo);
    accessCodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { handleGo(); }
    });

    // --- 表单提交逻辑 (这是修改的重点) ---
    const createBtn = document.getElementById('create-btn');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error-message');
    
    // 渲染 Turnstile
    // Pages 部署时会自动注入一个包含 sitekey 的全局对象
    // 我们从那里安全地获取 sitekey
    let turnstileSiteKey = '1x00000000000000000000AA'; // 这是一个用于测试的、总会失败的 key
    if (window.CFFeatureFlags && window.CFFeatureFlags.turnstile) {
        turnstileSiteKey = window.CFFeatureFlags.turnstile.sitekey;
    }
    
    // 确保 turnstile 对象存在后再调用 render
    function renderTurnstile() {
        if (typeof turnstile !== 'undefined') {
            turnstile.render('#turnstile-widget', {
                sitekey: turnstileSiteKey,
            });
        }
    }
    
    window.onloadTurnstileCallback = renderTurnstile;
    
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
        
        // =========================================================
        //                 !!! 关键修复在这里 !!!
        // =========================================================
        const turnstileResponseInput = document.querySelector('[name="cf-turnstile-response"]');
        const turnstileToken = turnstileResponseInput ? turnstileResponseInput.value : '';

        if (!turnstileToken) {
            showError('无法获取人机验证令牌，请刷新页面后重试。');
            createBtn.disabled = false;
            createBtn.textContent = '生成分享链接';
            if (typeof turnstile !== 'undefined') { turnstile.reset(); }
            return; // 提前退出，不发送请求
        }
        
        formData.append('cf-turnstile-response', turnstileToken);
        // =========================================================

        formData.append('type', activeTab);
        formData.append('customCode', document.getElementById('custom-code').value);
        formData.append('password', document.getElementById('password').value);
        formData.append('oneTime', document.getElementById('one-time').checked);

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
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            showResult(data.shortUrl);
        } catch (err) {
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
            width: 128, height: 128,
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