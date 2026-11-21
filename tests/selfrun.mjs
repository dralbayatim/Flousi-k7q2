import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
const [DIR, PORT] = process.argv.slice(2);
const srv = spawn('python3', ['-m', 'http.server', PORT, '--bind', '127.0.0.1', '--directory', DIR], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 700));
const b = await chromium.launch(), p = await (await b.newContext({ serviceWorkers: 'block' })).newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(`http://127.0.0.1:${PORT}/index.html`); await p.waitForFunction(() => typeof S !== 'undefined' && S, null, { timeout: 15000 });
const r = await p.evaluate(async () => { const a = FSelfTest.run().results, c = (await FSelfTest2.run()).results, d = (await FSelfTest3.run()).results, all = [...a, ...c, ...d]; return { n: all.length, ok: all.filter(x => x.ok).length, bad: all.filter(x => !x.ok).map(x => x.id + ' ' + x.name + ' — ' + x.msg) }; });
console.log(`SELFTEST ${r.ok}/${r.n}`, r.bad, errs); await b.close(); srv.kill();
