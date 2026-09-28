const crypto = require('node:crypto');

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => part.trim().split(/=(.*)/s).slice(0,2)).filter(pair => pair[0]));
}
function signature(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}
function createSession(secret) {
  const payload = `${Date.now() + 12 * 60 * 60 * 1000}.${crypto.randomBytes(18).toString('base64url')}`;
  return `${payload}.${signature(payload, secret)}`;
}
function validSession(req, secret) {
  if (!secret || secret.length < 32) return false;
  const token = parseCookies(req.headers.cookie).admin_session;
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(signature(payload, secret));
  const actual = Buffer.from(parts[2]);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual) && Number(parts[0]) > Date.now();
}
module.exports = { createSession, validSession };
