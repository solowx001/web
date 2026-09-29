const dns = require('node:dns/promises');
const net = require('node:net');

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10000;

function decodeHtml(value = '') {
  return String(value)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

function cleanText(value = '') {
  return decodeHtml(String(value).replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form|button)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')).replace(/[\t\u00a0 ]+/g, ' ').replace(/\n\s*/g, '\n').trim();
}

function isPrivateAddress(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') ||
      normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('ff') ||
      normalized.startsWith('::ffff:');
  }
  return true;
}

async function assertPublicUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('链接格式无效，请填写完整的网址。'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('只支持公开的 HTTP 或 HTTPS 网页链接。');
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('暂不支持内网或本机地址。');
  const addresses = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('链接地址无法安全访问。');
  return url;
}

async function fetchPublicPage(input) {
  let url = input;
  for (let redirect = 0; redirect <= 4; redirect++) {
    const parsed = await assertPublicUrl(url);
    const response = await fetch(parsed, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BingyanDiscovery/1.0; +https://solowx.cc.cd)', Accept: 'text/html,application/xhtml+xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.5' }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirect === 4) throw new Error('网页跳转次数过多或跳转地址无效。');
      url = new URL(location, parsed).href;
      continue;
    }
    if (!response.ok) throw new Error(`网页暂时无法读取（HTTP ${response.status}）。`);
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (!/(text\/html|application\/xhtml\+xml|application\/(rss|atom)\+xml|application\/xml|text\/xml)/.test(type)) throw new Error('这个链接不是可读取的网页或订阅源。');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('网页没有返回可读取的内容。');
    const chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_HTML_BYTES) { await reader.cancel(); throw new Error('网页内容超过 2 MB，暂时无法分析。'); }
      chunks.push(Buffer.from(value));
    }
    return { html: Buffer.concat(chunks).toString('utf8'), url: response.url || parsed.href, contentType: type };
  }
  throw new Error('网页跳转次数过多。');
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

function parseJsonLd(html) {
  const found = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].replace(/^\s*<!--|-->\s*$/g, ''));
      const visit = value => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) return value.forEach(visit);
        found.push(value);
        if (value['@graph']) visit(value['@graph']);
        if (value.mainEntity) visit(value.mainEntity);
      };
      visit(parsed);
    } catch { /* Ignore malformed embedded metadata. */ }
  }
  return found;
}

function firstText(...values) {
  for (const value of values) {
    const text = Array.isArray(value) ? value.map(v => typeof v === 'object' ? v.name || v['@id'] : v).filter(Boolean).join(', ') : typeof value === 'object' && value ? value.name || value['@id'] : value;
    if (typeof text === 'string' && text.trim()) return cleanText(text).replace(/\s+/g, ' ').slice(0, 1600);
  }
  return '';
}

function summarize(text, fallback) {
  const source = cleanText(text).replace(/https?:\/\/\S+/g, '').replace(/\b(cookie policy|privacy policy|sign in|subscribe now|登录|订阅|隐私政策)\b/gi, ' ');
  const candidates = source.split(/(?<=[。！？!?；;\n])\s*/).map(s => s.trim()).filter(s => s.length >= 24 && s.length <= 500);
  const chosen = [];
  for (const sentence of candidates) {
    if (chosen.some(item => item === sentence || item.includes(sentence) || sentence.includes(item))) continue;
    chosen.push(sentence);
    if (chosen.length === 3) break;
  }
  let summary = chosen.join(' ');
  if (summary.length < 35) summary = cleanText(fallback).replace(/\s+/g, ' ');
  if (!summary) summary = source.replace(/\s+/g, ' ');
  return summary.slice(0, 900);
}

function inferCategory(text) {
  const value = text.toLowerCase();
  const categories = [
    ['AI 生图与视频', /图像生成|生图|文生图|视频生成|视频模型|image generation|text-to-video|text to video|midjourney|sora|veo|runway/],
    ['AI 编程与工作流', /编程|代码|开发者工具|coding|code agent|agentic coding|github copilot|cursor|claude code|workflow|工作流/],
    ['AI 资讯与工具', /人工智能|大模型|语言模型|llm|openai|anthropic|gemini|gpt-|claude|ai tool|ai 工具/],
    ['产品与交互设计', /交互设计|用户体验|产品设计|ux design|ui design|design system|usability/],
    ['独立开发与产品', /独立开发|创业|产品发布|product launch|indie hacker|startup|saas/],
    ['内容与增长', /内容创作|增长|营销|newsletter|创作者经济|creator|audience/]
  ];
  return categories.find(([, pattern]) => pattern.test(value))?.[0] || '网页采集';
}

function metadata(html) {
  const meta = {};
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    if (key && attrs.content && !meta[key]) meta[key] = attrs.content;
  }
  const title = cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const json = parseJsonLd(html);
  const article = json.find(item => /Article|NewsArticle|BlogPosting|ReportageNewsArticle/i.test(String(item['@type'] || ''))) || json[0] || {};
  const body = firstText(article.articleBody, article.text);
  const paragraphText = [...html.matchAll(/<(?:p|h[1-6])\b[^>]*>([\s\S]*?)<\/(?:p|h[1-6])>/gi)].map(match => cleanText(match[1])).filter(text => text.length > 20).slice(0, 40).join('\n');
  const description = firstText(meta.description, meta['og:description'], meta['twitter:description'], article.description);
  const articleTitle = firstText(meta['og:title'], meta['twitter:title'], article.headline, article.name, title);
  const date = firstText(meta['article:published_time'], meta['og:published_time'], meta.datepublished, meta['date'], article.datePublished, article.dateCreated);
  const author = firstText(meta.author, article.author);
  const publisher = firstText(meta['og:site_name'], article.publisher, meta['application-name']);
  const imageRaw = firstText(meta['og:image'], meta['twitter:image'], article.image);
  let image = '';
  try {
    const candidate = imageRaw ? new URL(imageRaw, meta['og:url'] || 'https://example.com') : null;
    if (candidate && ['http:', 'https:'].includes(candidate.protocol)) image = candidate.href;
  } catch { /* Ignore malformed image metadata. */ }
  const titleText = articleTitle.replace(/\s*[|｜—–-]\s*[^|｜—–-]{1,60}$/, '').trim();
  const content = body.length > paragraphText.length ? body : paragraphText;
  return { title: titleText.slice(0, 180), description, content, date, author, publisher, image };
}

function normalizedDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

async function analyzeDiscoveryUrl(input) {
  if (typeof input !== 'string' || input.length > 2000) throw new Error('请填写有效的网页链接。');
  const { html, url: finalUrl, contentType } = await fetchPublicPage(input);
  const data = metadata(html);
  if (!data.title && !data.description && !data.content) throw new Error('页面没有提供可提取的标题或正文。');
  const hostname = new URL(finalUrl).hostname.replace(/^www\./i, '');
  const sourceType = /(^|\.)x\.com$/i.test(hostname) || /(^|\.)twitter\.com$/i.test(hostname) ? 'X' : /newsletter|substack|beehiiv|ghost\.io/i.test(`${hostname} ${data.title}`) ? 'Newsletter' : /rss|atom\+xml|xml/.test(contentType) ? 'RSS' : data.publisher ? '官网' : '其他';
  const source = data.author ? `${data.author}${data.publisher ? ` · ${data.publisher}` : ''}` : data.publisher || hostname;
  const extracted = [data.title, data.description, data.content].filter(Boolean).join('\n');
  return {
    title: data.title,
    summary: summarize(data.content, data.description),
    date: normalizedDate(data.date) || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }),
    category: inferCategory(extracted),
    source,
    sourceType,
    image: data.image,
    url: finalUrl
  };
}

module.exports = { analyzeDiscoveryUrl };
