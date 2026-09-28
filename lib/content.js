function cleanContent(input) {
  const fields = ['name','role','intro','aboutTitle','bio1','bio2','occupation','city','focus','now','projectTitle','contactTitle','contactText','email','xiaohongshu','github'];
  const result = {};
  for (const key of fields) {
    if (typeof input[key] !== 'string') throw new Error(`字段“${key}”必须是文本`);
    result[key] = input[key].trim().slice(0, 3000);
  }
  if (!result.name) throw new Error('姓名不能为空');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('请填写有效的邮箱地址');
  for (const key of ['xiaohongshu','github']) if (result[key] && !/^https:\/\//i.test(result[key])) throw new Error(`${key} 地址需要以 https:// 开头`);
  if (!Array.isArray(input.projects) || input.projects.length > 20) throw new Error('项目数量无效（最多 20 个）');
  result.projects = input.projects.map((p, i) => {
    if (!p || typeof p !== 'object') throw new Error(`第 ${i + 1} 个项目格式无效`);
    return { title: String(p.title || '').trim().slice(0,120), type: String(p.type || '').trim().slice(0,120), description: String(p.description || '').trim().slice(0,500) };
  });
  return result;
}
module.exports = { cleanContent };
