import { readFileSync, writeFileSync } from 'node:fs';
let html = readFileSync('showcase.template.html', 'utf8');
html = html.replace(/\{\{img:([a-z-]+)\}\}/g, (_, n) => 'data:image/jpeg;base64,' + readFileSync(n + '.jpg').toString('base64'));
writeFileSync('/tmp/claude-0/-home-user-LULU-UGC/d0fd8437-bb0e-5c29-995d-208def453ed5/scratchpad/june-design-studio.html', html);
writeFileSync('../../june-design-studio.html', '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + html.replace('</main>', '</main></body></html>'));
console.log('written', (Buffer.byteLength(html)/1048576).toFixed(2), 'MB');
