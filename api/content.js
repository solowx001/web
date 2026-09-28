const content = require('../outputs/admin/content.json');
const { validSession } = require('../lib/auth');
const { cleanContent } = require('../lib/content');
const { commitFiles, ensureBranch, readFile } = require('../lib/github');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!validSession(req, process.env.SESSION_SECRET)) return res.status(401).json({ error: '请先登录' });
  const owner = process.env.GITHUB_OWNER || 'solowx001';
  const repo = process.env.GITHUB_REPO || 'web';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const draft = process.env.GITHUB_DRAFT_BRANCH || 'cms-draft';
  const token = process.env.GITHUB_TOKEN;
  if (!owner || !repo || !token) return res.status(503).json({ error: '未配置 GitHub 仓库信息或访问令牌' });
  try {
    if (req.method === 'GET') {
      try {
        await ensureBranch({ owner, repo, branch: draft, fromBranch: branch, token });
        return res.status(200).json(JSON.parse(await readFile({ owner, repo, branch: draft, token, filePath: 'outputs/admin/content.json' })));
      } catch (error) {
        if (!/not found|reference does not exist/i.test(error.message)) throw error;
        return res.status(200).json(content);
      }
    }
    if (req.method === 'PUT') {
      const next = cleanContent(req.body || {});
      await ensureBranch({ owner, repo, branch: draft, fromBranch: branch, token });
      await commitFiles({ owner, repo, branch: draft, token, files: { 'outputs/admin/content.json': JSON.stringify(next, null, 2) + '\n' }, message: 'Save website content draft' });
      return res.status(200).json({ ok: true, message: '草稿已安全保存到 GitHub' });
    }
    return res.status(405).json({ error: '仅支持 GET 或 PUT 请求' });
  } catch (error) {
    console.error('GitHub content operation failed:', error);
    return res.status(400).json({ error: error.message || '读取或保存内容失败' });
  }
};
