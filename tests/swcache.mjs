// اختبار العامل الخدمي: يُثبَّت، ويخزّن كل ملفات التطبيق في الذاكرة المؤقتة، ويعمل التطبيق دون إنترنت بعد ذلك
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [DIR, PORT] = process.argv.slice(2), URL0 = `http://127.0.0.1:${PORT}/index.html`;
const srv = spawn('python3', ['-m', 'http.server', PORT, '--bind', '127.0.0.1', '--directory', DIR], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 700));
const b = await chromium.launch(), ctx = await b.newContext(), p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
let pass = 0, fail = 0; const bad = []; const ok = (c, n, i) => { if (c) pass++; else { fail++; bad.push(n + (i !== undefined ? ' → ' + JSON.stringify(i) : '')); } };
try {
  await p.goto(URL0); await p.waitForFunction(() => typeof S !== 'undefined' && S, null, { timeout: 15000 });
  await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller || (navigator.serviceWorker.ready.then(() => true)), null, { timeout: 15000 });
  await p.waitForTimeout(2500);
  const swsrc = fs.readFileSync(DIR + '/sw.js', 'utf8'), want = [...swsrc.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
  const V = (swsrc.match(/const V = '([^']+)'/) || [])[1];
  const got = await p.evaluate(async () => { const ks = await caches.keys(), out = {}; for (const k of ks) { const c = await caches.open(k); out[k] = (await c.keys()).map(r => new URL(r.url).pathname.replace(/^\//, '')); } return out; });
  const cache = got['flousi-' + V] || []; ok(cache.length > 0, 'cache flousi-' + V + ' exists', Object.keys(got));
  for (const f of new Set(want)) ok(cache.includes(f), 'cached ' + f);
  for (const f of fs.readdirSync(DIR).filter(f => /^(ui-|tab-).*\.js$|^app\.js$/.test(f))) ok(want.includes(f), 'sw lists ' + f);
  await ctx.setOffline(true); await p.reload(); await p.waitForFunction(() => typeof S !== 'undefined' && S && document.querySelector('#nav button'), null, { timeout: 15000 });
  ok(await p.evaluate(() => VER), 'app runs offline'); ok(errs.length === 0, 'no page errors', errs.slice(0, 3));
} catch (e) { fail++; bad.push('CRASH ' + (e.stack || e)); }
await b.close(); srv.kill(); console.log(`PASS ${pass}  FAIL ${fail}`); bad.forEach(x => console.log('  ✗ ' + x)); process.exit(fail ? 1 : 0);
