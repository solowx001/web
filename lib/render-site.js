function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
}

function webUrl(value) {
  const url = String(value || '');
  return /^https?:\/\//i.test(url) ? esc(url) : '#';
}

function formatIssueDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return `${month} 月 ${day} 日`;
}

function renderPages(c) {
  const projectCards = c.projects.map((p, i) => `<div class="project"><span class="project-num">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(p.title)}</h3><span class="project-type">${esc(p.type)}</span></div><p class="project-desc">${esc(p.description)}</p><a class="arrow" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(p.title)}" aria-label="咨询${esc(p.title)}">↗</a></div>`).join('\n');
  const facts = [['目前身份',c.occupation],['所在城市',c.city],['关注领域',c.focus],['最近在做',c.now]].map(([label,value]) => `<div class="fact"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('');
  const projectsBlock = `<section id="projects" aria-labelledby="projects-title"><div class="section-head"><span class="section-kicker">02 / 项目产品</span><h2 id="projects-title">${esc(c.projectTitle)}</h2></div><div class="projects">${projectCards}</div></section>`;
  const aboutBlock = `<section id="about" aria-labelledby="about-title"><div class="section-head"><span class="section-kicker">01 / 关于我</span><h2 id="about-title">${esc(c.aboutTitle)}</h2></div><div class="about-grid"><div><p>${esc(c.bio1)}</p><p>${esc(c.bio2)}</p></div><div class="facts">${facts}</div></div></section>`;
  const contactBlock = `<section id="contact" aria-labelledby="contact-title"><div class="contact"><div><span class="section-kicker">04 / 联系方式</span><h2 id="contact-title">${esc(c.contactTitle)}</h2><p>${esc(c.contactText)}</p></div><a class="contact-mail" href="mailto:${esc(c.email)}">${esc(c.email)} ↗</a></div></section>`;
  const home = `<section class="hero" aria-labelledby="hero-title"><div><p class="eyebrow">${esc(c.role)}</p><h1 id="hero-title">你好，我是<br><em>${esc(c.name)}。</em></h1><p class="intro-copy">${esc(c.intro)}</p><div class="hero-links"><a class="button" href="#projects">看看我的项目 <span aria-hidden="true">↗</span></a><a class="text-link" href="#about">更多关于我</a></div></div><div class="portrait"><img src="myphoto.jpg" alt="${esc(c.name)}的个人照片"><span class="portrait-mark" aria-hidden="true">${esc(c.name.slice(0,1))}</span></div></section>${aboutBlock}${projectsBlock}${contactBlock}`;
  const nav = '<a href="index.html#about">关于</a><a href="projects.html">项目</a><a href="discover.html">创作发现</a><a href="contact.html">联系</a>';
  const social = `${c.xiaohongshu ? `<a href="${webUrl(c.xiaohongshu)}" target="_blank" rel="noreferrer">小红书</a>` : ''}${c.github ? `<a href="${webUrl(c.github)}" target="_blank" rel="noreferrer">GitHub</a>` : ''}<a href="mailto:${esc(c.email)}">邮件</a>`;

  function page(title, body) {
    return `<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f7f7f5"><meta name="description" content="${esc(title)} — ${esc(c.name)}的个人主页"><title>${esc(c.name)} — ${esc(title)}</title><link rel="stylesheet" href="styles.css"></head>\n<body><div class="shell"><header><a class="brand" href="index.html">${esc(c.name)}<span>.</span></a><nav aria-label="主导航">${nav}</nav></header><main>${body}</main><footer><span>© ${new Date().getFullYear()} ${esc(c.name)} · 用心制作</span><div class="socials">${social}</div></footer></div></body></html>`;
  }

  const discoveries = [...(c.discoveries || [])].sort((a, b) => b.date.localeCompare(a.date));
  const dates = [...new Set(discoveries.map(item => item.date))];
  const categories = [...new Set(discoveries.map(item => item.category).filter(Boolean))];
  const dateFilters = dates.map(date => `<button type="button" class="discover-filter" data-date-filter="${esc(date)}" aria-pressed="false"><span>${esc(formatIssueDate(date))}</span><span class="discover-count">${discoveries.filter(item => item.date === date).length}</span></button>`).join('');
  const categoryFilters = categories.map(category => `<button type="button" class="discover-chip" data-category-filter="${esc(category)}" aria-pressed="false">${esc(category)}</button>`).join('');
  const issues = dates.map(date => {
    const items = discoveries.filter(item => item.date === date);
    const cards = items.map(item => {
      const searchable = [item.title,item.summary,item.source,item.category,item.sourceType].join(' ').toLowerCase();
      const image = item.image && /^https?:\/\//i.test(item.image) ? `<a class="discover-image" href="${webUrl(item.url)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true"><img loading="lazy" src="${webUrl(item.image)}" alt=""></a>` : '';
      return `<article class="discover-card" data-date="${esc(item.date)}" data-category="${esc(item.category)}" data-search="${esc(searchable)}">${image}<div class="discover-card-body"><div class="discover-meta"><span class="discover-category">${esc(item.category)}</span><span>${esc(item.sourceType)}${item.source ? ` · ${esc(item.source)}` : ''}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><div class="discover-card-foot"><time datetime="${esc(item.date)}">${esc(formatIssueDate(item.date))}</time><a href="${webUrl(item.url)}" target="_blank" rel="noopener noreferrer">阅读原文 ↗</a></div></div></article>`;
    }).join('');
    return `<section class="discover-issue" data-issue="${esc(date)}"><header class="discover-issue-head"><div><span class="section-kicker">采集期次</span><h2>${esc(formatIssueDate(date))}</h2></div><span>${items.length} 条发现</span></header><div class="discover-grid">${cards}</div></section>`;
  }).join('');
  const discoverBody = `<section class="discover-page"><div class="discover-hero"><div><span class="section-kicker">创作灵感 · 持续更新</span><h1>创作发现</h1><p>${esc(c.discoverIntro || 'AI 创作、产品设计与实践动态。读一则新发现，回到原作者。')}</p></div><div class="discover-note"><strong>发现值得记录的想法</strong><span>按日期与主题整理，每条内容都链接回原文。</span></div></div><div class="discover-layout" id="discoverLayout"><aside class="discover-sidebar"><label class="discover-label" for="discoverSearch">搜索本期内容</label><input class="discover-search" id="discoverSearch" type="search" placeholder="输入关键词…" autocomplete="off"><div class="discover-side-section"><h2>采集期次</h2><button type="button" class="discover-filter is-active" data-date-filter="all" aria-pressed="true"><span>全部期次</span><span class="discover-count">${discoveries.length}</span></button>${dateFilters || '<p class="discover-hint">新增内容后会按日期自动归档。</p>'}</div><div class="discover-side-section"><h2>内容主题</h2><div class="discover-chips"><button type="button" class="discover-chip is-active" data-category-filter="all" aria-pressed="true">全部</button>${categoryFilters || '<p class="discover-hint">后台添加条目时填写主题。</p>'}</div></div><div class="discover-side-section"><h2>阅读方式</h2><div class="discover-view-toggle"><button type="button" class="is-active" data-view-mode="cards" aria-pressed="true">▦ 图文卡片</button><button type="button" data-view-mode="list" aria-pressed="false">☷ 全部速读</button></div></div></aside><div class="discover-feed"><div class="discover-feed-top"><span id="discoverResultCount">${discoveries.length} 条发现</span><button type="button" id="discoverReset">清空筛选</button></div><div id="discoverIssues">${issues || '<div class="discover-empty">还没有收录内容。你可以登录后台，添加第一条创作发现。</div>'}</div><div class="discover-empty" id="discoverNoResults" hidden>没有找到符合条件的内容，试试调整关键词或筛选条件。</div></div></div></section><script>
  (()=>{const layout=document.querySelector('#discoverLayout');if(!layout)return;const search=document.querySelector('#discoverSearch'),cards=[...document.querySelectorAll('.discover-card')],issues=[...document.querySelectorAll('.discover-issue')],count=document.querySelector('#discoverResultCount');let activeDate='all',activeCategory='all';function apply(){const query=search.value.trim().toLowerCase();let visible=0;for(const card of cards){const show=(activeDate==='all'||card.dataset.date===activeDate)&&(activeCategory==='all'||card.dataset.category===activeCategory)&&(!query||card.dataset.search.includes(query));card.hidden=!show;if(show)visible++}for(const issue of issues){issue.hidden=!issue.querySelector('.discover-card:not([hidden])')}count.textContent=visible+' 条发现';document.querySelector('#discoverNoResults').hidden=visible>0||cards.length===0}document.querySelectorAll('[data-date-filter]').forEach(button=>button.addEventListener('click',()=>{activeDate=button.dataset.dateFilter;document.querySelectorAll('[data-date-filter]').forEach(el=>{const on=el===button;el.classList.toggle('is-active',on);el.setAttribute('aria-pressed',String(on))});apply()}));document.querySelectorAll('[data-category-filter]').forEach(button=>button.addEventListener('click',()=>{activeCategory=button.dataset.categoryFilter;document.querySelectorAll('[data-category-filter]').forEach(el=>{const on=el===button;el.classList.toggle('is-active',on);el.setAttribute('aria-pressed',String(on))});apply()}));search.addEventListener('input',apply);document.querySelectorAll('[data-view-mode]').forEach(button=>button.addEventListener('click',()=>{const list=button.dataset.viewMode==='list';layout.classList.toggle('is-list',list);document.querySelectorAll('[data-view-mode]').forEach(el=>{const on=el===button;el.classList.toggle('is-active',on);el.setAttribute('aria-pressed',String(on))})}));document.querySelector('#discoverReset').addEventListener('click',()=>{search.value='';activeDate='all';activeCategory='all';document.querySelectorAll('[data-date-filter]').forEach(el=>{const on=el.dataset.dateFilter==='all';el.classList.toggle('is-active',on);el.setAttribute('aria-pressed',String(on))});document.querySelectorAll('[data-category-filter]').forEach(el=>{const on=el.dataset.categoryFilter==='all';el.classList.toggle('is-active',on);el.setAttribute('aria-pressed',String(on))});apply()})})();
  </script>`;

  return {
    'index.html': page('设计与创造', home),
    'about.html': page('关于我', `<section class="page-content"><div class="section-head"><span class="section-kicker">01 / 关于我</span><h2>${esc(c.aboutTitle)}</h2></div><div class="about-grid"><div><p>${esc(c.bio1)}</p><p>${esc(c.bio2)}</p></div><div class="facts">${facts}</div></div></section>`),
    'projects.html': page('项目产品', `<section class="page-content"><div class="section-head"><span class="section-kicker">02 / 项目产品</span><h2>${esc(c.projectTitle)}</h2></div><div class="projects">${projectCards}</div></section>`),
    'discover.html': page('创作发现', discoverBody),
    'contact.html': page('联系方式', `<section class="page-content">${contactBlock}</section>`)
  };
}

module.exports = { renderPages };
