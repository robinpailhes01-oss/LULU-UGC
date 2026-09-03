import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const file = 'file://' + new URL('../june-preview.html', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [name, vp] of [['desk', { width: 1440, height: 900 }], ['mob', { width: 390, height: 844 }]]) {
  const out = new URL('./shots/' + name + '/', import.meta.url).pathname; mkdirSync(out, { recursive: true });
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await p.goto(file, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  // positions : top, puis le séjour à 6 points, puis chaque section
  const stay = await p.evaluate(() => { const s = document.querySelector('.stay'); const r = s.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; });
  const ids = ['livraison', 'lieux', 'ludivine', 'offre', 'reserver'];
  const secs = await p.evaluate(ids => ids.map(id => document.getElementById(id).getBoundingClientRect().top + scrollY), ids);
  const ys = [0, vp.height * 0.9];
  for (const f of [0.02, 0.2, 0.4, 0.55, 0.75, 0.95]) ys.push(stay.top + (stay.h - vp.height) * f);
  secs.forEach(y => ys.push(y - 40));
  ys.push(H - vp.height);
  let i = 0;
  for (const y of ys) {
    await p.evaluate(y => scrollTo(0, y), y);
    await p.waitForTimeout(450);
    await p.screenshot({ path: out + String(i++).padStart(2, '0') + '.png' });
  }
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(name, 'height', H, 'overflowX', overflow);
  await p.close();
}
await b.close();
