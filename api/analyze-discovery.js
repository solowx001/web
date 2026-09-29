const { validSession } = require('../lib/auth');
const { analyzeDiscoveryUrl } = require('../lib/discovery');
const { topicTitle } = require('../lib/discovery-title');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: '仅支持 POST 请求' });
  if (!validSession(req, process.env.SESSION_SECRET)) return res.status(401).json({ error: '请先登录' });
  try {
    const result = await analyzeDiscoveryUrl(req.body?.url);
    return res.status(200).json({ ...result, title: topicTitle(result) });
  } catch (error) {
    console.error('Discovery page analysis failed:', error);
    return res.status(422).json({ error: error.message || '网页分析失败，请检查链接或手动填写。' });
  }
};
