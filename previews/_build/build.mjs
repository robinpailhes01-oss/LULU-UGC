import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('./', import.meta.url).pathname;
let html = readFileSync(dir + 'template.html', 'utf8');
html = html.replace('{{fonts}}', readFileSync(dir + 'fonts.css', 'utf8'));
html = html.replace(/\{\{img:([a-z]+)\}\}/g, (_, name) => 'data:image/jpeg;base64,' + readFileSync(dir + name + '.jpg').toString('base64'));
writeFileSync(dir + '../june-preview.html', html);
console.log('written', (Buffer.byteLength(html) / 1048576).toFixed(2), 'MB');
