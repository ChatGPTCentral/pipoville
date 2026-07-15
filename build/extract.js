const fs = require('fs');
const p = "/root/.claude/projects/-home-user-gta-whitepaper/34fe3e3d-6bdd-5c6a-8bfa-e6af162cfc77/tool-results/toolu_01AquK6yt9csYUhDEixvYx75.txt";
const raw = fs.readFileSync(p,'utf8');
const obj = JSON.parse(raw);
fs.writeFileSync('build/whitepaper-g.raw.html', obj.content);
const html = obj.content;
// find all {{ ... }} tokens
const toks = [...new Set((html.match(/\{\{[^}]*\}\}/g)||[]).map(s=>s.trim()))];
console.log("TOKENS:", JSON.stringify(toks,null,0));
// image-slot ids
const slots = [...new Set((html.match(/<image-slot[^>]*id="([^"]+)"/g)||[]))];
console.log("IMAGE-SLOTS:", JSON.stringify(slots));
// asset references
const assets = [...new Set((html.match(/assets\/[A-Za-z0-9._-]+/g)||[]))];
console.log("ASSETS:", JSON.stringify(assets));
const fonts = [...new Set((html.match(/fonts\/[A-Za-z0-9._-]+/g)||[]))];
console.log("FONTS:", JSON.stringify(fonts));
// count sections (pages)
console.log("PAGES:", (html.match(/<section class="page"/g)||[]).length);
console.log("LEN:", html.length);
