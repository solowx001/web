function requireText(value, label, maxLength, required = false) {
  if (typeof value !== 'string') throw new Error(`字段“${label}”必须是文本`);
  const result = value.trim().slice(0, maxLength);
  if (required && !result) throw new Error(`请填写${label}`);
  return result;
}

function validWebUrl(value, label, required = false) {
  const url = requireText(value, label, 1600, required);
  if (url && !/^https?:\/\//i.test(url)) throw new Error(`${label}需要以 http:// 或 https:// 开头`);
  return url;
}

function cleanContent(input) {
  const fields = ['name','role','intro','aboutTitle','bio1','bio2','occupation','city','focus','now','projectTitle','contactTitle','contactText','email','xiaohongshu','github','discoverIntro'];
  const result = {};
  for (const key of fields) result[key] = requireText(input[key], key, 3000);
  if (!result.name) throw new Error('姓名不能为空');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('请填写有效的邮箱地址');
  for (const key of ['xiaohongshu','github']) if (result[key] && !/^https:\/\//i.test(result[key])) throw new Error(`${key} 地址需要以 https:// 开头`);

  if (!Array.isArray(input.projects) || input.projects.length > 20) throw new Error('项目数量无效（最多 20 个）');
  result.projects = input.projects.map((project, i) => {
    if (!project || typeof project !== 'object') throw new Error(`第 ${i + 1} 个项目格式无效`);
    return {
      title: requireText(String(project.title || ''), '项目名称', 120),
      type: requireText(String(project.type || ''), '项目类型', 120),
      description: requireText(String(project.description || ''), '项目介绍', 500)
    };
  });

  if (!Array.isArray(input.discoveries) || input.discoveries.length > 200) throw new Error('创作发现条目无效（最多 200 条）');
  result.discoveries = input.discoveries.map((item, i) => {
    if (!item || typeof item !== 'object') throw new Error(`第 ${i + 1} 条创作发现格式无效`);
    const date = requireText(String(item.date || ''), '发布日期', 10, true);
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) throw new Error(`第 ${i + 1} 条日期无效`);
    const sourceType = requireText(String(item.sourceType || '其他'), '来源类型', 30) || '其他';
    if (!['RSS','X','官网','Newsletter','其他'].includes(sourceType)) throw new Error(`第 ${i + 1} 条来源类型无效`);
    return {
      id: requireText(String(item.id || `discovery-${i + 1}`), '条目编号', 80),
      date,
      title: requireText(String(item.title || ''), '标题', 180, true),
      summary: requireText(String(item.summary || ''), '内容摘要', 1600, true),
      url: validWebUrl(item.url, '原文链接', true),
      image: validWebUrl(item.image || '', '配图链接'),
      source: requireText(String(item.source || ''), '来源名称', 120),
      category: requireText(String(item.category || ''), '内容主题', 60, true),
      sourceType
    };
  });
  return result;
}

module.exports = { cleanContent };
