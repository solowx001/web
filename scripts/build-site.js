const fs = require('node:fs');
const path = require('node:path');
const { renderPages } = require('../lib/render-site');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'outputs', 'site');
const content = require('../outputs/admin/content.json');
fs.mkdirSync(output, { recursive: true });
for (const [name, html] of Object.entries(renderPages(content))) fs.writeFileSync(path.join(output, name), html, 'utf8');
fs.copyFileSync(path.join(root, 'outputs', 'styles.css'), path.join(output, 'styles.css'));
const photoCandidates = [path.join(root, 'outputs', 'myphoto.jpg'), path.join(root, 'myphoto.jpg')];
const photo = photoCandidates.find(file => fs.existsSync(file));
if (!photo) throw new Error('Missing myphoto.jpg');
fs.copyFileSync(photo, path.join(output, 'myphoto.jpg'));
fs.copyFileSync(path.join(root, 'outputs', 'admin', 'admin.html'), path.join(output, 'admin.html'));
console.log('Generated homepage, about, projects, discovery, contact, and admin pages.');
