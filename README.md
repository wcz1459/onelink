# OneLink - Share Everything With One Link

<p align="center">
  <img src="[https://github.com/Linkium-suki/onelink/public/logo.svg](https://raw.githubusercontent.com/Linkium-suki/onelink/436bc09ab8cca21d93f00759d7f94932bfd0ab4d/public/logo.svg)" alt="OneLink Logo" width="128" height="128">
</p>

<h3 align="center">一个功能强大、美观、完全免费的“万物分享”服务，100% 运行在 Cloudflare 的免费生态之上。</h3>

<p align="center">
    <a href="https://1url.icu">
        <img src="https://img.shields.io/badge/Live%20Demo-Visit%20Now-brightgreen" alt="Live Demo">
    </a>
    <a href="#">
        <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT">
    </a>
    <a href="https://www.cloudflare.com">
        <img src="https://img.shields.io/badge/Powered%20by-Cloudflare-F48020" alt="Powered by Cloudflare">
    </a>
</p>

---

## ✨ 项目简介

**OneLink** 不仅仅是一个短链服务。它的诞生是为了实现一个简单的 Slogan: **"Share everything with one link"**。无论是长链接、临时文件，还是 Markdown 格式的笔记、代码片段，你都可以通过 OneLink 生成一个简洁的短链接进行分享。

最酷的是，整个项目被设计为**完全运行在 Cloudflare 的免费套餐**上，利用 Workers, Pages, R2, KV 和 Turnstile，为你提供了一个零成本、高性能、高可用的企业级分享解决方案。


---

## 🚀 功能亮点

我们在这个项目中实现了超过20个精心设计的功能：

#### 核心与分享功能
- ✅ **多类型分享**: 短链接、临时文件、Markdown 消息。
- ✅ **临时文件**: 文件上传到 R2，24小时后自动删除，保护隐私。
- ✅ **自定义短代码**: 创建时可指定你喜欢的短代码。
- ✅ **密码保护**: 为你的分享链接设置访问密码。
- ✅ **阅后即焚**: 创建一次性链接，访问后立即销毁。
- ✅ **自定义有效期**: 可为链接设置1天、7天、30天或永久的有效期。

#### 预览与体验
- ✅ **智能在线预览**:
  - 🖼️ **图片**: 直接在浏览器中打开。
  - 🎬 **视频/音频**: 使用美观的内嵌播放器预览。
  - 📄 **PDF**: 直接在浏览器中查看。
  - ✍️ **Markdown/纯文本/代码**: 以格式化和语法高亮的形式在线阅读，并提供下载按钮。
- ✅ **安全跳转页**: 访问短链接时，会有一个3秒倒计时的安全提示页面，防止恶意跳转。
- ✅ **二维码生成**: 成功创建分享后，自动生成二维码方便移动端分享。
- ✅ **一键复制**: 轻松复制生成的短链接。

#### 设计与用户体验
- ✅ **Material Design 3**: 现代、美观的设计语言。
- ✅ **深色/浅色模式**: 自动适配系统，并可手动切换。
- ✅ **完全响应式**: 完美适配桌面、平板和移动端。
- ✅ **统一品牌页脚**: 所有页面（包括主页、预览页、跳转页）都拥有统一、精美的页脚设计。

#### 安全与管理
- ✅ **Cloudflare Turnstile**: 无感、尊重隐私的人机验证，有效防止机器人滥用。
- ✅ **管理员后台**: 通过 `ADMIN_SECRET`，你可以使用 API 或其他工具创建永久性的、无限制的分享。
- ✅ **详细访问统计**: 在短链接后加 `+` (例如 `s.xxxx.com/xyz+`)，即可查看该链接的访问次数、访问时间和来源国家。

---

## 🛠️ 技术栈

本项目是 Cloudflare Serverless 生态的一个完美实践范例：

| 服务 | 角色 |
| :--- | :--- |
| **Cloudflare Pages** | 托管前端静态资源 (`/public`) 并运行后端逻辑 (`/functions`) |
| **Cloudflare Workers** | 作为 Pages Functions 的底层技术，处理所有 API 和动态请求 |
| **Cloudflare KV** | 存储短链接的元数据（目标地址、密码、有效期等） |
| **Cloudflare R2** | 存储用户上传的临时文件 |
| **Cloudflare Turnstile**| 提供免费、强大的人机验证服务 |

---

## 部署指南

你可以通过以下步骤，在5分钟内拥有一个属于你自己的 OneLink 服务。

### 前提条件
1.  一个 Cloudflare 账户。
2.  一个你自己的域名，并已将其 NS 记录指向 Cloudflare。
3.  一个 GitHub 账户。
4.  本地安装了 `Node.js` 和 `Git`。

### 部署步骤

#### 1. 准备代码库
- **Fork** 本项目，或者点击 **Use this template** 创建一个你自己的代码仓库。
- 使用 `git clone` 将你的仓库克隆到本地。

#### 2. 配置 Cloudflare 服务
登录 Cloudflare Dashboard，进行以下操作：

- **创建 R2 存储桶**:
  - 进入 R2 -> 创建存储桶。记下你的 **存储桶名称** (例如 `onelink-files`)。
- **创建 KV 命名空间**:
  - 进入 Workers & Pages -> KV -> 创建命名- 空间。记下你的 **命名空间名称** (例如 `ONELINK_KV`)。
- **创建 Turnstile 站点**:
  - 进入 Turnstile -> 添加站点。输入你的站点名称和域名，选择 "Invisible" 类型。记下 **Site Key** 和 **Secret Key**。

#### 3. 通过 Git 部署到 Cloudflare Pages
这是最可靠的部署方式。

1.  在 Cloudflare Dashboard, 进入 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
2.  选择你刚刚创建的 GitHub 仓库。
3.  在 **Build settings** 页面:
    - **Framework preset**: 选择 `None`。
    - **Build command**: **留空**。
    - **Build output directory**: 输入 `public`。
4.  展开 **Environment Variables**，添加以下绑定和变量：
    - **Bindings**:
      - **KV Namespace Bindings**:
        - Variable name: `LINKS_KV`
        - KV namespace: 选择你创建的 `ONELINK_KV`。
      - **R2 Bucket Bindings**:
        - Variable name: `FILES_R2`
        - R2 bucket: 选择你创建的 R2 存储桶。
    - **Environment Variables (普通变量)**:
      - `APP_URL`: `https://s.yourdomain.com` (替换为你的域名)
    - **Secrets (加密变量)**:
      - `TURNSTILE_SITE_KEY`: 粘贴你的 Turnstile **Site Key**。 *(注：这个 key 其实不敏感，但为保持一致性，也可作为 secret)*
      - `TURNSTILE_SECRET_KEY`: 粘贴你的 Turnstile **Secret Key**。
      - `ADMIN_SECRET`: 设置一个复杂的管理员密码。
5.  点击 **Save and Deploy**。

#### 4. 配置自定义域名
- 部署成功后，进入新创建的 Pages 项目的 **Custom domains** 标签页。
- 添加你的自定义域名，例如 `s.linkium.xyz`。

**完成！你的 OneLink 服务现在已经在线上运行了！**

---

## 🙏 致敬

<div align="center">
  <p>Powered by Cloudflare
    <a href="https://www.cloudflare.com">
      <img src="public/cflogo.svg" alt="Cloudflare Logo" width="20" style="vertical-align: middle; margin-left: 8px;">
    </a>
  </p>
  <p>
    <code>Cloudflare的恩情还不完🤚😭✋</code>
  </p>
</div>

---

<div align="center">
  <p>
    © 2024 Linkium · Forged with ❤️ and powered by caffeine.
  </p>
  <p>
    <a href="https://github.com/Linkium-suki/OneLink">GitHub Repo</a>
  </p>
</div>
