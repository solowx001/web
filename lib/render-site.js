function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
}
function renderPages(c) {
  const projectCards = c.projects.map((p, i) => `<div class="project"><span class="project-num">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(p.title)}</h3><span class="project-type">${esc(p.type)}</span></div><p class="project-desc">${esc(p.description)}</p><a class="arrow" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(p.title)}" aria-label="咨询${esc(p.title)}">↗</a></div>`).join('\n');
  const facts = [['目前身份',c.occupation],['所在城市',c.city],['关注领域',c.focus],['最近在做',c.now]].map(([label,value]) => `<div class="fact"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('');
  const projectsBlock = `<section id="projects" aria-labelledby="projects-title"><div class="section-head"><span class="section-kicker">02 / 项目产品</span><h2 id="projects-title">${esc(c.projectTitle)}</h2></div><div class="projects">${projectCards}</div></section>`;
  const aboutBlock = `<section id="about" aria-labelledby="about-title"><div class="section-head"><span class="section-kicker">01 / 关于我</span><h2 id="about-title">${esc(c.aboutTitle)}</h2></div><div class="about-grid"><div><p>${esc(c.bio1)}</p><p>${esc(c.bio2)}</p></div><div class="facts">${facts}</div></div></section>`;
  const contactBlock = `<section id="contact" aria-labelledby="contact-title"><div class="contact"><div><span class="section-kicker">03 / 联系方式</span><h2 id="contact-title">${esc(c.contactTitle)}</h2><p>${esc(c.contactText)}</p></div><a class="contact-mail" href="mailto:${esc(c.email)}">${esc(c.email)} ↗</a></div></section>`;
  const home = `<section class="hero" aria-labelledby="hero-title"><div><p class="eyebrow">${esc(c.role)}</p><h1 id="hero-title">你好，我是<br><em>${esc(c.name)}。</em></h1><p class="intro-copy">${esc(c.intro)}</p><div class="hero-links"><a class="button" href="#projects">看看我的项目 <span aria-hidden="true">↗</span></a><a class="text-link" href="#about">更多关于我</a></div></div><div class="portrait"><img src="myphoto.jpg" alt="${esc(c.name)}的个人照片"><span class="portrait-mark" aria-hidden="true">${esc(c.name.slice(0,1))}</span></div></section>${aboutBlock}${projectsBlock}${contactBlock}`;
  const nav = '<a href="index.html#about">关于</a><a href="projects.html">项目</a><a href="contact.html">联系</a>';
  const social = `${c.xiaohongshu ? `<a href="${esc(c.xiaohongshu)}" target="_blank" rel="noreferrer">小红书</a>` : ''}${c.github ? `<a href="${esc(c.github)}" target="_blank" rel="noreferrer">GitHub</a>` : ''}<a href="mailto:${esc(c.email)}">邮件</a>`;
  function page(title, body) {
    return `<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f7f7f5"><meta name="description" content="${esc(title)} — ${esc(c.name)}的个人主页"><title>${esc(c.name)} — ${esc(title)}</title><link rel="stylesheet" href="styles.css"></head>\n<body><div class="shell"><header><a class="brand" href="index.html">${esc(c.name)}<span>.</span></a><nav aria-label="主导航">${nav}</nav></header><main>${body}</main><footer><span>© ${new Date().getFullYear()} ${esc(c.name)} · 用心制作</span><div class="socials">${social}</div></footer></div></body></html>`;
  }
  return {
    'index.html': page('设计与创造', home),
    'about.html': page('关于我', `<section class="page-content"><div class="section-head"><span class="section-kicker">01 / 关于我</span><h2>${esc(c.aboutTitle)}</h2></div><div class="about-grid"><div><p>${esc(c.bio1)}</p><p>${esc(c.bio2)}</p></div><div class="facts">${facts}</div></div></section>`),
    'projects.html': page('项目产品', `<section class="page-content"><div class="section-head"><span class="section-kicker">02 / 项目产品</span><h2>${esc(c.projectTitle)}</h2></div><div class="projects">${projectCards}</div></section>`),
    'contact.html': page('联系方式', `<section class="page-content"><div class="contact"><div><span class="section-kicker">03 / 联系方式</span><h2>${esc(c.contactTitle)}</h2><p>${esc(c.contactText)}</p></div><a class="contact-mail" href="mailto:${esc(c.email)}">${esc(c.email)} ↗</a></div></section>`)
  };
}
module.exports = { renderPages };
