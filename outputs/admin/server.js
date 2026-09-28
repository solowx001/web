const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!PASSWORD || PASSWORD.length < 8) {
  console.error('请先设置至少 8 位的 ADMIN_PASSWORD 环境变量，再启动后台。');
  process.exit(1);
}

const OUTPUTS = path.resolve(__dirname, '..');
const SITE_DIR = path.join(OUTPUTS, 'site');
const DATA_FILE = path.join(__dirname, 'content.json');
const ADMIN_FILE = path.join(__dirname, 'admin.html');
const sessions = new Map();
const SESSION_MS = 12 * 60 * 60 * 1000;

const defaults = {
  name: '王冰焰', role: '设计师 · 创作者 · 终身学习者',
  intro: '我专注于设计与数字产品，用清晰的思考和细致的执行，把复杂的问题变成简单、好用的体验。这里记录我的想法、作品，以及正在发生的事。',
  aboutTitle: '保持好奇，认真创造。',
  bio1: '我是一名独立设计师，目前生活和工作在中国无锡。过去几年里，我与不同规模的团队合作，从早期概念到最终上线，参与打造面向真实生活的数字产品。',
  bio2: '工作之外，我喜欢阅读、拍照，也享受在城市里漫无目的地散步。我相信好的设计来自观察、倾听，以及不断把事情做得更好的耐心。',
  occupation: '产品设计师 / 自由职业', city: '中国 · 无锡', focus: '产品设计 · 品牌 · 技术', now: '探索更好的数字生活',
  projectTitle: '一些近期作品。',
  projects: [
    { title: '慢慢 · 日常习惯', type: '移动应用 · 2025', description: '为想要建立可持续习惯的人，设计一款温和而专注的记录工具。' },
    { title: '栖居 · 城市指南', type: '品牌与网页设计 · 2024', description: '重新发现街区日常，为独立咖啡馆与城市探索者搭建连接。' },
    { title: '开源组件集', type: '开源工具 · 2024', description: '一套轻量、易用的界面组件，帮助小团队更快开始构建产品。' }
  ],
  contactTitle: '有想法？我们聊聊。', contactText: '欢迎聊聊合作、项目，或者任何有趣的新点子。',
  email: 'solowx@163.com', xiaohongshu: 'https://www.xiaohongshu.com/', github: 'https://github.com/'
};

function loadContent() {
  try { return { ...defaults, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }; }
  catch (err) {
    if (err.code !== 'ENOENT') throw err;
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaults, null, 2), 'utf8');
    return structuredClone(defaults);
  }
}
let content = loadContent();

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', ...extra });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}
function cookieToken(req) {
  const raw = req.headers.cookie || '';
  const item = raw.split(';').map(v => v.trim()).find(v => v.startsWith('admin_session='));
  return item ? decodeURIComponent(item.slice('admin_session='.length)) : '';
}
function isAuthed(req) {
  const token = cookieToken(req);
  const expires = sessions.get(token);
  if (!expires || expires < Date.now()) { sessions.delete(token); return false; }
  sessions.set(token, Date.now() + SESSION_MS);
  return true;
}
function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = ''; let size = 0;
    req.setEncoding('utf8');
    req.on('data', chunk => { size += Buffer.byteLength(chunk); if (size > limit) { reject(new Error('请求内容过大')); req.destroy(); } else body += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('请求格式无效')); } });
    req.on('error', reject);
  });
}
function cleanContent(input) {
  const text = (key, max = 3000) => {
    const value = input[key];
    if (typeof value !== 'string') throw new Error(`字段“${key}”必须是文本`);
    return value.trim().slice(0, max);
  };
  if (!Array.isArray(input.projects) || input.projects.length > 20) throw new Error('项目数量无效（最多 20 个）');
  const projects = input.projects.map((p, i) => {
    if (!p || typeof p !== 'object') throw new Error(`第 ${i + 1} 个项目格式无效`);
    return { title: String(p.title || '').trim().slice(0, 120), type: String(p.type || '').trim().slice(0, 120), description: String(p.description || '').trim().slice(0, 500) };
  });
  const next = {};
  for (const key of ['name','role','intro','aboutTitle','bio1','bio2','occupation','city','focus','now','projectTitle','contactTitle','contactText','email','xiaohongshu','github']) next[key] = text(key);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) throw new Error('请填写有效的邮箱地址');
  for (const key of ['xiaohongshu','github']) if (next[key] && !/^https:\/\//i.test(next[key])) throw new Error(`${key} 地址需要以 https:// 开头`);
  next.projects = projects;
  return next;
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
}
function page(title, body, c, active = '') {
  const nav = `<a href="index.html#about">关于</a><a href="projects.html">项目</a><a href="contact.html">联系</a>`;
  const socials = `${c.xiaohongshu ? `<a href="${esc(c.xiaohongshu)}" target="_blank" rel="noreferrer">小红书</a>` : ''}${c.github ? `<a href="${esc(c.github)}" target="_blank" rel="noreferrer">GitHub</a>` : ''}<a href="mailto:${esc(c.email)}">邮件</a>`;
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f7f7f5"><meta name="description" content="${esc(title)} — ${esc(c.name)}的个人主页"><title>${esc(c.name)} — ${esc(title)}</title><link rel="stylesheet" href="styles.css"></head>
<body><div class="shell"><header><a class="brand" href="index.html">${esc(c.name)}<span>.</span></a><nav aria-label="主导航">${nav}</nav></header><main>${body}</main><footer><span>© ${new Date().getFullYear()} ${esc(c.name)} · 用心制作</span><div class="socials">${socials}</div></footer></div></body></html>`;
}
function renderSite(c) {
  const projectCards = c.projects.map((p, i) => `<div class="project"><span class="project-num">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(p.title)}</h3><span class="project-type">${esc(p.type)}</span></div><p class="project-desc">${esc(p.description)}</p><a class="arrow" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(p.title)}" aria-label="咨询${esc(p.title)}">↗</a></div>`).join('\n');
  const facts = [['目前身份',c.occupation],['所在城市',c.city],['关注领域',c.focus],['最近在做',c.now]].map(([label,value]) => `<div class="fact"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('');
  const projectsBlock = `<section id="projects" aria-labelledby="projects-title"><div class="section-head"><span class="section-kicker">02 / 项目产品</span><h2 id="projects-title">${esc(c.projectTitle)}</h2></div><div class="projects">${projectCards}</div></section>`;
  const aboutBlock = `<section id="about" aria-labelledby="about-title"><div class="section-head"><span class="section-kicker">01 / 关于我</span><h2 id="about-title">${esc(c.aboutTitle)}</h2></div><div class="about-grid"><div><p>${esc(c.bio1)}</p><p>${esc(c.bio2)}</p></div><div class="facts">${facts}</div></div></section>`;
  const contactBlock = `<section id="contact" aria-labelledby="contact-title"><div class="contact"><div><span class="section-kicker">03 / 联系方式</span><h2 id="contact-title">${esc(c.contactTitle)}</h2><p>${esc(c.contactText)}</p></div><a class="contact-mail" href="mailto:${esc(c.email)}">${esc(c.email)} ↗</a></div></section>`;
  const home = `<section class="hero" aria-labelledby="hero-title"><div><p class="eyebrow">${esc(c.role)}</p><h1 id="hero-title">你好，我是<br><em>${esc(c.name)}。</em></h1><p class="intro-copy">${esc(c.intro)}</p><div class="hero-links"><a class="button" href="#projects">看看我的项目 <span aria-hidden="true">↗</span></a><a class="text-link" href="#about">更多关于我</a></div></div><div class="portrait"><img src="myphoto.jpg" alt="${esc(c.name)}的个人照片"><span class="portrait-mark" aria-hidden="true">${esc(c.name.slice(0,1))}</span></div></section>${aboutBlock}${projectsBlock}${contactBlock}`;
  const aboutPage = `<section class="page-content"><div class="section-head"><span class="section-kicker">01 / 关于我</span><h2>${esc(c.aboutTitle)}</h2></div><div class="about-grid"><div><p>${esc(c.bio1)}</p><p>${esc(c.bio2)}</p></div><div class="facts">${facts}</div></div></section>`;
  const projectsPage = `<section class="page-content"><div class="section-head"><span class="section-kicker">02 / 项目产品</span><h2>${esc(c.projectTitle)}</h2></div><div class="projects">${projectCards}</div></section>`;
  const contactPage = `<section class="page-content"><div class="contact"><div><span class="section-kicker">03 / 联系方式</span><h2>${esc(c.contactTitle)}</h2><p>${esc(c.contactText)}</p></div><a class="contact-mail" href="mailto:${esc(c.email)}">${esc(c.email)} ↗</a></div></section>`;
  fs.mkdirSync(SITE_DIR, { recursive: true });
  fs.writeFileSync(path.join(SITE_DIR, 'index.html'), page('设计与创造', home, c), 'utf8');
  fs.writeFileSync(path.join(SITE_DIR, 'about.html'), page('关于我', aboutPage, c), 'utf8');
  fs.writeFileSync(path.join(SITE_DIR, 'projects.html'), page('项目产品', projectsPage, c), 'utf8');
  fs.writeFileSync(path.join(SITE_DIR, 'contact.html'), page('联系方式', contactPage, c), 'utf8');
  fs.copyFileSync(path.join(OUTPUTS, 'styles.css'), path.join(SITE_DIR, 'styles.css'));
  const photo = path.join(OUTPUTS, 'myphoto.jpg');
  if (fs.existsSync(photo)) fs.copyFileSync(photo, path.join(SITE_DIR, 'myphoto.jpg'));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/admin')) {
      return send(res, 200, fs.readFileSync(ADMIN_FILE, 'utf8'), 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/api/session') return send(res, 200, { authenticated: isAuthed(req) });
    if (req.method === 'POST' && url.pathname === '/api/login') {
      const input = await readBody(req);
      const expected = crypto.createHash('sha256').update(PASSWORD).digest();
      const supplied = crypto.createHash('sha256').update(String(input.password || '')).digest();
      if (!crypto.timingSafeEqual(expected, supplied)) return send(res, 401, { error: '密码不正确' });
      const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, Date.now() + SESSION_MS);
      return send(res, 200, { ok: true }, 'application/json; charset=utf-8', { 'Set-Cookie': `admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}` });
    }
    if (req.method === 'POST' && url.pathname === '/api/logout') {
      sessions.delete(cookieToken(req));
      return send(res, 200, { ok: true }, 'application/json; charset=utf-8', { 'Set-Cookie': 'admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    }
    if (url.pathname.startsWith('/api/')) {
      if (!isAuthed(req)) return send(res, 401, { error: '请先登录' });
      if (req.method === 'GET' && url.pathname === '/api/content') return send(res, 200, content);
      if (req.method === 'PUT' && url.pathname === '/api/content') {
        content = cleanContent(await readBody(req));
        const temp = `${DATA_FILE}.tmp`;
        fs.writeFileSync(temp, JSON.stringify(content, null, 2), 'utf8'); fs.renameSync(temp, DATA_FILE);
        return send(res, 200, { ok: true, message: '内容已保存' });
      }
      if (req.method === 'POST' && url.pathname === '/api/publish') {
        content = cleanContent(await readBody(req));
        const temp = `${DATA_FILE}.tmp`;
        fs.writeFileSync(temp, JSON.stringify(content, null, 2), 'utf8'); fs.renameSync(temp, DATA_FILE);
        renderSite(content);
        return send(res, 200, { ok: true, pages: ['index.html','about.html','projects.html','contact.html'], deployment: '已在本地生成静态页面。' });
      }
      return send(res, 404, { error: '接口不存在' });
    }
    if (req.method === 'GET' && ['/index.html','/about.html','/projects.html','/contact.html','/styles.css','/myphoto.jpg'].includes(url.pathname)) {
      const name = path.basename(url.pathname);
      const file = path.join(SITE_DIR, name);
      if (!fs.existsSync(file)) return send(res, 404, '请先在后台点击“静态化”', 'text/plain; charset=utf-8');
      const type = name.endsWith('.css') ? 'text/css; charset=utf-8' : name.endsWith('.jpg') ? 'image/jpeg' : 'text/html; charset=utf-8';
      return send(res, 200, fs.readFileSync(file), type);
    }
    if (url.pathname.startsWith('/published/')) {
      const relative = decodeURIComponent(url.pathname.slice('/published/'.length));
      const file = path.resolve(SITE_DIR, relative);
      if (!file.startsWith(SITE_DIR + path.sep) && file !== SITE_DIR) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, '尚未生成此页面', 'text/plain; charset=utf-8');
      const type = file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.jpg') ? 'image/jpeg' : 'text/html; charset=utf-8';
      return send(res, 200, fs.readFileSync(file), type, { 'Cache-Control': 'no-cache' });
    }
    return send(res, 404, { error: '页面不存在' });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 400, { error: err.message || '请求处理失败' });
  }
});

server.listen(PORT, HOST, () => console.log(`个人主页后台已启动：http://${HOST}:${PORT}`));
