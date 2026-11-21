// يثبت أن إصدارين يعرضان الشاشات نفسها: نفس البيانات التجريبية في كليهما، ثم مقارنة نص كل شاشة حرفاً بحرف (رقم الإصدار مستثنى)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
const [A, B, PA, PB] = process.argv.slice(2);
const srvs = [[A, PA], [B, PB]].map(([d, p]) => spawn('python3', ['-m', 'http.server', p, '--bind', '127.0.0.1', '--directory', d], { stdio: 'ignore' }));
await new Promise(r => setTimeout(r, 800));
const br = await chromium.launch();
const SCREENS = [['home'], ['ops'], ['ops', null, { kind: 'income' }], ['ops', null, { kind: 'transfer' }], ['ops', null, { kind: 'reconcile' }], ['ops', null, { kind: 'fx' }], ['accts'], ['assets'], ['nabd', null, { t: 'now' }], ['nabd', null, { t: 'why' }], ['nabd', null, { t: 'mine' }], ['nabd', null, { t: 'archive' }], ['insights'], ['insights', 'buy'], ['insights', 'whatif'], ['insights', 'path'], ['insights', 'advisor'], ['insights', 'wrap', { k: '2026-10' }],
  ['more'], ['more', 'help'], ['more', 'lock'], ['more', 'backup'], ['more', 'print'], ['more', 'integrity'], ['more', 'debts'], ['more', 'jams'], ['more', 'goals'], ['more', 'recurring'], ['more', 'reports'], ['more', 'log'], ['more', 'pyf'], ['more', 'monthrecon'], ['more', 'wish'], ['more', 'badges'],
  ...['start', 'pathview', 'skin', 'mode', 'feat', 'savings', 'pyf', 'dec', 'valuation', 'privacy'].map(s => ['more', 'set', { s }])];
async function grab(port) {
  const ctx = await br.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Baghdad' }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.clock.install({ time: new Date('2026-11-21T12:00:00+03:00') });
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForFunction(() => typeof S !== 'undefined' && S && document.querySelector('#nav button'), null, { timeout: 15000 });
  await p.evaluate(async () => { await act(() => { S.x.set.featDone = true; L.setRate(S, '2026-09-01', 15000000);
      L.opening(S, '2026-09-01', [{ name: 'نقد', type: 'asset_cash', cur: 'IQD', amount: 3000000 }, { name: 'دولار', type: 'asset_cash', cur: 'USD', amount: 50000, r: 15000000 }, { name: 'بيت', type: 'other', cur: 'IQD', amount: 90000000 }]); });
    const c = Object.values(S.acc).find(a => a.name === 'نقد').id;
    await act(() => { for (const m of ['09', '10', '11']) { L.income(S, { date: '2026-' + m + '-02', acct: c, src: 'inc_salary', amount: 1000000 }); L.expense(S, { date: '2026-' + m + '-10', acct: c, cat: 'c_food', amount: 400000, note: 'سوق' }); }
      L.setPrices(S, '2026-09-01', { G: 400000, S: 5000 }); L.buyPiece(S, { date: '2026-10-05', metal: 'G', karat: 21, mg: 10000, from: c, paid: 1700000 });
      L.recurNew(S, { kind: 'expense', name: 'إنترنت', amount: 25000, acct: c, cat: 'c_comm', src: null, day: 25, remind: 2, salary: false });
      L.goalNew(S, { name: 'طوارئ', cur: 'IQD', target: 1200000, targetDate: '2027-11-01', priority: 1, kind: 'long' }); });
    await Promise.all([FN.load(true), FN.loadAux(true)]); });
  const out = {};
  for (const [tab, sub, pp] of SCREENS) { const k = [tab, sub, JSON.stringify(pp || {})].join('|');
    await p.evaluate(([t, s, q]) => go(t, s, q || {}), [tab, sub, pp]); await p.waitForTimeout(250);
    out[k] = (await p.evaluate(() => document.querySelector('#app').textContent + ' ‖NAV‖ ' + document.querySelector('#nav').textContent)).replace(/f1-v4\.\d+/g, 'VER').replace(/[A-Z0-9]{4}(-[A-Z0-9]{4}){5}/g, 'KEY').replace(/\s+/g, ' '); }
  await ctx.close(); return { out, errs };
}
const a = await grab(PA), b = await grab(PB); let same = 0; const diff = [];
for (const k of Object.keys(a.out)) { if (a.out[k] === b.out[k]) same++; else { const x = a.out[k], y = b.out[k]; let i = 0; while (x[i] === y[i]) i++; diff.push(k + ' @' + i + ': «' + x.slice(i, i + 60) + '» ≠ «' + y.slice(i, i + 60) + '»'); } }
console.log(`SCREENS identical ${same}/${Object.keys(a.out).length}`); diff.forEach(d => console.log('  ✗ ' + d));
console.log('page errors:', a.errs.length, b.errs.length, [...a.errs, ...b.errs].slice(0, 3));
await br.close(); srvs.forEach(s => s.kill()); process.exit(diff.length || a.errs.length || b.errs.length ? 1 : 0);
