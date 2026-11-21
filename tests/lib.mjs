// أدوات اختبار مشتركة لـ f1-v4.14: خادم محلي، متصفح، وبيانات تجريبية غنية (لا بيانات حقيقية)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
export async function open(dir, port, { coach = false, time = '2026-11-21T12:00:00+03:00' } = {}) {
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', dir], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 700));
  const br = await chromium.launch(), ctx = await br.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Baghdad' }), page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/market|data\/|404|Failed to load/.test(m.text())) errs.push(m.text()); });
  if (time) await page.clock.install({ time: new Date(time) });
  if (!coach) await ctx.addInitScript(() => { try { localStorage.setItem('flousi-coach', JSON.stringify({ off: true, seen: {} })); } catch (e) {} });
  const boot = async () => { await page.goto(`http://127.0.0.1:${port}/index.html`); await page.waitForFunction(() => typeof S !== 'undefined' && S && document.querySelector('#nav button'), null, { timeout: 15000 }); };
  await boot();
  const ev = (f, a) => page.evaluate(f, a), W = (ms = 250) => page.waitForTimeout(ms), txt = () => ev(() => document.querySelector('#app').textContent);
  const close = async () => { await br.close(); srv.kill(); };
  return { page, ev, W, txt, errs, boot, close, ctx };
}
export async function seed(ev) {
  return ev(async () => {
    await act(() => { S.x.set.featDone = true; L.setRate(S, '2026-08-01', 15000000); L.setPrices(S, '2026-08-01', { G: 300000, S: 3500 });
      L.opening(S, '2026-08-01', [{ name: 'نقد', type: 'asset_cash', cur: 'IQD', amount: 3000000 }, { name: 'فيزا', type: 'visa', cur: 'IQD', amount: 1500000 }, { name: 'دولار', type: 'asset_cash', cur: 'USD', amount: 50000, r: 14800000 },
        { name: 'بيت', type: 'other', cur: 'IQD', amount: 90000000 }, { name: 'قرض سيارة', type: 'liab', cur: 'IQD', amount: 4000000 }]); });
    const id = n => Object.values(S.acc).find(a => a.name === n).id, c = id('نقد'), v = id('فيزا');
    await act(() => { for (const m of ['08', '09', '10', '11']) { L.income(S, { date: '2026-' + m + '-02', acct: c, src: 'inc_salary', amount: 1200000 }); L.expense(S, { date: '2026-' + m + '-10', acct: c, cat: 'c_food', amount: 350000, note: 'سوق' }); L.expense(S, { date: '2026-' + m + '-15', acct: v, cat: 'c_bills', amount: 90000, note: 'كهرباء' }); }
      L.setPrices(S, '2026-10-01', { G: 330000, S: 3900 }); L.setRate(S, '2026-10-01', 15200000);
      L.buyPiece(S, { date: '2026-09-05', metal: 'G', karat: 21, mg: 10000, from: c, paid: 1700000, form: 'jewelry', label: 'سوار', price: 300000, rate: 15000000 });
      L.buyPiece(S, { date: '2026-10-05', metal: 'G', karat: 18, mg: 4500, from: c, paid: 600000, form: 'jewelry', label: 'خاتم', price: 330000, rate: 15200000 });
      L.addPiece(S, { metal: 'S', mille: 999, mg: 250000, form: 'bullion', label: 'سبيكة فضة', cost: 0, price: 3500, rate: 15000000 });
      L.setValuation(S, { acct: id('بيت'), date: '2026-10-20', value: 95000000 });
      L.recurNew(S, { kind: 'expense', name: 'إنترنت', amount: 25000, acct: c, cat: 'c_comm', src: null, day: 25, remind: 2, salary: false });
      L.goalNew(S, { name: 'طوارئ', cur: 'IQD', target: 1200000, targetDate: '2027-11-01', priority: 1, kind: 'long' });
      L.debtNew(S, { date: '2026-10-01', dir: 'lent', person: 'علي', amount: 200000, acct: c, due: null, note: '' });
      L.transfer(S, { date: '2026-11-03', from: c, to: v, amount: 100000, amount2: 0, r: null, note: '' }); });
    await Promise.all([FN.load(true), FN.loadAux(true)]).catch(() => {});
    return { c, v, usd: id('دولار'), home: id('بيت'), liab: id('قرض سيارة') };
  });
}
export function T() { let pass = 0, fail = 0; const errs = []; const ok = (c, n, i) => { if (c) pass++; else { fail++; errs.push(n + (i !== undefined ? ' → ' + JSON.stringify(i).slice(0, 300) : '')); } };
  return { ok, eq: (a, b, n) => ok(a === b, n, [a, b]), done: () => { console.log(`PASS ${pass}  FAIL ${fail}`); errs.forEach(e => console.log('  ✗ ' + e)); return fail; } }; }
