const crypto = require('node:crypto');
const { createSession } = require('../lib/auth');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: '仅支持 POST 请求' });
  const password = process.env.ADMIN_PASSWORD || '';
  const secret = process.env.SESSION_SECRET || '';
  if (password.length < 8 || secret.length < 32) return res.status(503).json({ error: '后台尚未配置管理员密码或会话密钥' });
  const supplied = crypto.createHash('sha256').update(String(req.body?.password || '')).digest();
  const expected = crypto.createHash('sha256').update(password).digest();
  if (!crypto.timingSafeEqual(supplied, expected)) return res.status(401).json({ error: '密码不正确' });
  const token = createSession(secret);
  res.setHeader('Set-Cookie', `admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`);
  return res.status(200).json({ ok: true });
};
