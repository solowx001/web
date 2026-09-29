# GitHub + Vercel 部署

项目包含公开静态网站、在线管理后台和 Vercel Functions。运行环境为 Node.js 18+，不依赖第三方 npm 包。

## 1. 推送到 GitHub

在 GitHub 创建一个仓库（建议设为 Private），把此项目根目录作为仓库根目录推送。生产分支默认使用 `main`。

## 2. 连接 Vercel

在 Vercel 控制台导入刚创建的 GitHub 仓库。项目根目录选择仓库根目录；框架选择 Other。仓库中的 `vercel.json` 已设置构建输出目录 `outputs/site` 和干净 URL。构建命令为 `npm run build`。

## 3. 配置 Vercel 环境变量

在 Vercel 项目 Settings → Environment Variables 中添加以下变量，至少添加到 Production。若要在预览部署上使用后台，也需加入 Preview。

| 变量 | 值 |
| --- | --- |
| `ADMIN_PASSWORD` | 你自己的管理员密码，至少 8 位 |
| `SESSION_SECRET` | 随机生成的至少 32 字符密钥 |
| `GITHUB_OWNER` | GitHub 用户名或组织名 |
| `GITHUB_REPO` | 仓库名，不带 `.git` |
| `GITHUB_TOKEN` | 仅授权该仓库的 Fine-grained token，Repository permissions 设为 Contents: Read and write |
| `GITHUB_BRANCH` | 生产分支，通常为 `main` |
| `GITHUB_DRAFT_BRANCH` | 草稿分支，填写 `cms-draft` |

可用 PowerShell 生成会话密钥：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

不要把密码、会话密钥或 GitHub Token 提交到仓库，也不要发到聊天中。GitHub Token 必须能创建分支、提交内容并更新引用；仓库生产分支若开启了禁止直接推送的规则，需要允许该 Token 更新生产分支。

## 4. 登录和发布

首次部署完成后，访问 `https://你的域名/admin` 登录。点击“保存内容”会把草稿保存到 GitHub 的 `cms-draft` 分支；点击“静态化”会把内容提交到生产分支。后台的“创作发现”面板粘贴公开文章链接后会自动读取网页标题、摘要、作者/来源、日期、主题和配图；检查并修改提取结果，再加入采集清单。部分网站会限制自动抓取，遇到这种情况可以手动填写。条目可新增、编辑和删除。Vercel 监听生产分支提交并自动重新部署，构建过程会生成 `index.html`、`about.html`、`projects.html`、`discover.html`、`contact.html`，并一并部署样式表、照片和管理后台。公开的“创作发现”页面支持按日期、主题筛选，关键词搜索，并切换图文卡片或速读列表。

草稿与正式站点分离：保存草稿不会更改生产主页；静态化才会发布。静态化提交成功后，等待 Vercel 部署完成，再打开网站查看更新。

## 本地预览

在项目根目录 PowerShell 中运行：

```powershell
$env:ADMIN_PASSWORD = "至少 8 位的管理员密码"
node .\outputs\admin\server.js
```

然后打开 <http://127.0.0.1:3000>。本地服务只监听本机。Vercel 版在线后台由 `api/` 下的 Functions 提供。
