const { validSession } = require('../lib/auth');
const { cleanContent } = require('../lib/content');
const { renderPages } = require('../lib/render-site');
const { commitFiles } = require('../lib/github');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: '仅支持 POST 请求' });
  if (!validSession(req, process.env.SESSION_SECRET)) return res.status(401).json({ error: '登录已过期，请重新登录' });
  const owner = process.env.GITHUB_OWNER || 'solowx001';
  const repo = process.env.GITHUB_REPO || 'web';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN;
  if (!owner || !repo || !token) return res.status(503).json({ error: '未配置 GitHub 仓库信息或访问令牌' });
  try {
    const content = cleanContent(req.body || {});
    const pages = renderPages(content);
    const files = {
      'outputs/admin/content.json': JSON.stringify(content, null, 2) + '\n',
      ...Object.fromEntries(Object.entries(pages).map(([name, html]) => [`outputs/site/${name}`, html]))
    };
    const sha = await commitFiles({ owner, repo, branch, token, files, message: `Publish website content (${new Date().toISOString()})` });
    return res.status(200).json({ ok: true, commit: sha, pages: Object.keys(pages), deployment: 'GitHub 已更新；Vercel 将自动开始部署。' });
  } catch (error) {
    console.error('Static publish failed:', error);
    return res.status(400).json({ error: error.message || '静态化发布失败' });
  }
};
