import { chromium } from "playwright-core";
import { resolve } from "node:path";
const file = "file://" + resolve("previews/june-impeccable.html");
const out = process.argv[2] || ".impeccable/review";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
async function run(name, w, h, spots) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.goto(file, { waitUntil: "load" });
  await p.waitForTimeout(2600); // entrée du mur
  await p.screenshot({ path: `${out}/${name}-hero.png` });
  // viewport spots (fraction of scrollable height or selector)
  for (const [label, target] of spots) {
    if (typeof target === "string") await p.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: "start" }), target);
    else await p.evaluate((y) => window.scrollTo(0, y), target);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/${name}-${label}.png` });
  }
  // full page : état posé (reduced motion → tout visible, plaques développées, étapes actives)
  await p.close();
  const q = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await q.goto(file, { waitUntil: "load" });
  await q.evaluate(async () => { document.querySelectorAll('.rv').forEach(e => e.classList.add('in')); const imgs = [...document.images]; imgs.forEach(i => i.loading = 'eager'); await Promise.all(imgs.map(i => i.decode().catch(() => {}))); });
  await q.waitForTimeout(800);
  const H = await q.evaluate(() => document.body.scrollHeight);
  await q.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  await q.close();
  console.log(name, "height", H);
}
await run("desktop", 1440, 900, [["pain1", 900 + 500], ["pain2", 900 + 1500], ["pain3", 900 + 2500], ["formats", "#formats"], ["offres", "#offres"], ["alpe", "#alpe"], ["how", "#how"], ["contact", "#contact"]]);
await run("mobile", 390, 844, [["pain1", 844 * 1.2], ["pain2", 844 * 2.4], ["pain3", 844 * 4.2], ["formats", "#formats"], ["offres", "#offres"], ["alpe", "#alpe"], ["how", "#how"], ["contact", "#contact"]]);
await run("user-1280", 1280, 800, []);
await b.close();
