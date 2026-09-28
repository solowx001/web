async function requestGitHub(path, token, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'personal-site-static-publisher',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `GitHub API 请求失败（${response.status}）`);
  return data;
}
async function ensureBranch({ owner, repo, branch, fromBranch, token }) {
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/`;
  try { return await requestGitHub(`${base}${encodeURIComponent(branch)}`, token); }
  catch (error) {
    if (!/reference does not exist|not found/i.test(error.message)) throw error;
    const source = await requestGitHub(`${base}${encodeURIComponent(fromBranch)}`, token);
    return requestGitHub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`, token, {
      method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: source.object.sha })
    });
  }
}
async function readFile({ owner, repo, branch, token, filePath }) {
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}`;
  const file = await requestGitHub(`${base}?ref=${encodeURIComponent(branch)}`, token);
  if (!file.content || file.encoding !== 'base64') throw new Error(`无法读取 GitHub 文件：${filePath}`);
  return Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8');
}
async function commitFiles({ owner, repo, branch, token, files, message }) {
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const ref = await ensureBranch({ owner, repo, branch, fromBranch: process.env.GITHUB_BRANCH || 'main', token });
  const parentSha = ref.object.sha;
  const parent = await requestGitHub(`${base}/git/commits/${parentSha}`, token);
  const tree = Object.entries(files).map(([filePath, content]) => ({ path: filePath, mode: '100644', type: 'blob', content }));
  const nextTree = await requestGitHub(`${base}/git/trees`, token, { method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
  const commit = await requestGitHub(`${base}/git/commits`, token, { method: 'POST', body: JSON.stringify({ message, tree: nextTree.sha, parents: [parentSha] }) });
  await requestGitHub(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, token, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
  return commit.sha;
}
module.exports = { commitFiles, ensureBranch, readFile };
