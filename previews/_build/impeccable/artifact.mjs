// Variante Artifact : même page, sans l'enveloppe doctype/html/head/body (le publieur l'ajoute).
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('./', import.meta.url).pathname;
let html = readFileSync(dir + '../../june-impeccable.html', 'utf8');
const head = html.slice(html.indexOf('<title>'), html.indexOf('</head>'));
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
writeFileSync(dir + 'artifact.html', head + '\n' + body);
console.log('artifact.html', (Buffer.byteLength(head + body) / 1048576).toFixed(2), 'MB');
