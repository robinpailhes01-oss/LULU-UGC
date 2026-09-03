import { writeFileSync } from 'node:fs';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const url = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..600,0..100;1,9..144,300..600,0..100&family=Manrope:wght@400;500;600;700&display=swap';
const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
const re = /\/\* latin \*\/\s*(@font-face\s*\{[^}]*\})/g;
let out = '', m;
while ((m = re.exec(css))) {
  const block = m[1];
  const u = block.match(/url\((https:[^)]+)\)/)[1];
  const bin = Buffer.from(await (await fetch(u, { headers: { 'User-Agent': UA } })).arrayBuffer());
  out += block.replace(u, 'data:font/woff2;base64,' + bin.toString('base64')) + '\n';
}
writeFileSync('fonts.css', out);
console.log('fonts.css', (out.length / 1024).toFixed(0), 'KB;', (out.match(/@font-face/g) || []).length, 'latin faces');
