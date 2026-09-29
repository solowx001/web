function normalize(value) {
  return String(value || '').toLowerCase().replace(/[\s@._·•|｜:：()（）]/g, '');
}

function finishSentence(value) {
  const sentence = String(value || '').replace(/\s+/g, ' ').trim().replace(/^[-–—|｜:：\s]+/, '');
  if (!sentence) return '';
  const chars = Array.from(sentence);
  const endsWithPunctuation = /[。！？!?…]$/.test(sentence);
  if (chars.length <= 30 && endsWithPunctuation) return sentence;
  const limit = chars.length > 30 ? 29 : 29;
  const shortened = chars.slice(0, limit).join('').replace(/[，、：:;；\s]+$/, '');
  if (chars.length > 30) return `${shortened}…`;
  return `${shortened}。`;
}

function topicTitle(article) {
  const title = String(article.title || '').trim();
  const source = String(article.source || '').split('·')[0].trim();
  const titleIsByline = (source && normalize(title) === normalize(source)) || /\bon\s+x\s*$/i.test(title) || /^x\s*上的?\s*[^：:"“]{1,40}$/i.test(title);
  const summary = String(article.summary || '').trim();
  const sentences = summary.split(/(?<=[。！？!?；;.])\s*/).map(value => value.trim()).filter(value => Array.from(value).length >= 8);
  const fromContent = sentences.map(value => {
    if (!source || !normalize(value).startsWith(normalize(source))) return value;
    const delimiter = value.search(/[:：—–-]/);
    return delimiter >= 0 && delimiter <= source.length + 4 ? value.slice(delimiter + 1).trim() : value;
  }).find(value => value && (!source || normalize(value) !== normalize(source)));
  if (fromContent) return finishSentence(fromContent);
  if (!titleIsByline && title) return finishSentence(title);
  return '网页内容暂不可提炼。';
}

module.exports = { topicTitle };
