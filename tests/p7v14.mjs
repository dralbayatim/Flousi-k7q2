// اختبار المرحلة 7 بعد تكييفه لواجهة f1-v4.14 (الحسابات والبيانات المفحوصة كما هي؛ تغيّرت أماكن الأزرار فقط). أصله p7test.mjs (f1-v4.10): الأداء والذاكرة، قائمة الرغبات، يوم الراتب، الفئة التلقائية (+ المواسم، بطاقة الشهر، الإنجازات، الحركة). Chromium، بيانات تجريبية فقط.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [BASE, NEW, PORT] = process.argv.slice(2), SITE = '/home/claude/work/site', URL0 = `http://127.0.0.1:${PORT}/index.html`;
const link = d => { try { fs.unlinkSync(SITE); } catch (e) {} fs.symlinkSync(d, SITE); };
let pass = 0, fail = 0; const errs = [];
const ok = (c, n, info) => { if (c) pass++; else { fail++; errs.push(n + (info !== undefined ? ' → ' + JSON.stringify(info) : '')); } };
const eq = (a, b, n) => ok(a === b, n, [a, b]);
link(BASE);
const srv = spawn('python3', ['-m', 'http.server', PORT, '--bind', '127.0.0.1', '--directory', SITE], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const browser = await chromium.launch();
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } }); await ctx.route('**/*', r => r.continue()); await ctx.addInitScript(() => { try { localStorage.setItem('flousi-coach', JSON.stringify({ off: true, seen: {} })); } catch (e) {} });
const page = await ctx.newPage(), cerr = [];
page.on('pageerror', e => cerr.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/market|data\/|404|Failed to load/.test(m.text())) cerr.push(m.text()); });
const boot = async () => { await page.goto(URL0); await page.waitForFunction(() => typeof S !== 'undefined' && S && document.querySelector('#nav button'), null, { timeout: 15000 }); };
const ev = (f, a) => page.evaluate(f, a), W = () => page.waitForTimeout(220), txt = () => ev(() => document.querySelector('#app').textContent);
const T = () => ev(() => ({ tx: S.tx.length, nw: L.panel(S).nw, fp: fpLines().join('\n'), integ: L.integrity(S) }));
try {
  await boot();
  await ev(async () => { await act(() => { S.x.set.featDone = true; L.setRate(S, '2026-09-01', 15000000);
    L.opening(S, '2026-09-01', [{ name: 'نقد', type: 'asset_cash', cur: 'IQD', amount: 3000000 }, { name: 'ادخار', type: 'asset_cash', cur: 'IQD', amount: 1 }]); });
    const c = Object.values(S.acc).find(a => a.name === 'نقد').id;
    await act(() => { for (const m of ['09', '10']) { L.income(S, { date: '2026-' + m + '-02', acct: c, src: 'inc_salary', amount: 1000000 }); L.expense(S, { date: '2026-' + m + '-10', acct: c, cat: 'c_food', amount: 600000 }); }
      L.expense(S, { date: '2026-10-12', acct: c, cat: 'c_gift', amount: 20000, note: 'حلويات' }); L.expense(S, { date: '2026-10-14', acct: c, cat: 'c_gift', amount: 20000, note: 'حلويات' });
      L.recurNew(S, { kind: 'expense', name: 'إنترنت', amount: 25000, acct: c, cat: 'c_comm', src: null, day: 25, remind: 2, salary: false });
      L.goalNew(S, { name: 'طوارئ', cur: 'IQD', target: 1200000, targetDate: '2027-11-01', priority: 1, kind: 'long' }); }); });
  const b0 = await T(); link(NEW); await boot(); eq(await ev(() => VER), process.env.NEWVER || 'f1-v4.10', 'new version');
  const a0 = await T(); eq(a0.fp, b0.fp, 'upgrade fingerprint'); eq(a0.integ.length, 0, 'upgrade integrity');
  const ids = await ev(() => Object.fromEntries(Object.values(S.acc).filter(a => a.type).map(a => [a.name, a.id])));
  // ===== الأداء: الذاكرة تتحدّث بعد كل تعديل =====
  const s0 = await ev(() => FD.safe(S).spentToday);
  await ev(c => act(() => L.expense(S, { date: L.today(), acct: c, cat: 'c_food', amount: 7000 })), ids['نقد']);
  eq(await ev(() => FD.safe(S).spentToday), s0 + 7000, 'memo invalidated after save');
  const lt = await ev(() => L.listTx(S).length); await ev(c => act(() => L.expense(S, { date: L.today(), acct: c, cat: 'c_food', amount: 1000 })), ids['نقد']); eq(await ev(() => L.listTx(S).length), lt + 1, 'listTx fresh after save');
  ok(await ev(() => L.listTx(S) === L.listTx(S)), 'memo reused within same data');
  ok(await ev(() => { const a = FD.path(S); DGEN++; const b = FD.path(S); return a !== b && JSON.stringify(a) === JSON.stringify(b); }), 'recompute gives identical result');
  // ===== قائمة الرغبات =====
  await ev(() => go('more', 'wish')); await W(); ok((await txt()).includes('لا رغبات منتظرة'), 'wish empty state');
  await page.locator('label.f', { hasText: 'ماذا تريد' }).locator('input').fill('سماعات'); await page.locator('label.f', { hasText: 'سعره' }).locator('input').fill('150,000');
  await page.click('button.prim:has-text("انتظر يوماً")'); await W();
  ok(await ev(() => S.x.wish.length === 1 && S.x.wish[0].amount === 150000 && !S.x.wish[0].done), 'wish added');
  ok((await txt()).includes('يُسأل بعد 24 ساعة'), 'countdown shown');
  await ev(() => go('home')); await W(); ok(!(await txt()).includes('مرّ يوم على'), 'no banner before 24h');
  await ev(() => act(() => { S.x.wish[0].t = Date.now() - 25 * 3600e3; })); await ev(() => go('home')); await W();
  ok((await txt()).includes('مرّ يوم على «سماعات»'), 'banner after 24h');
  { const i = await ev(() => [...document.querySelectorAll('.upn')].findIndex(x => x.textContent.includes('مرّ يوم'))); if (i >= 3) await page.click('summary:has-text("المزيد")'); await page.click('.upn:has-text("مرّ يوم") button.upnb'); await W(); } ok((await txt()).includes('حان وقت القرار'), 'ready section');
  await page.click('button:has-text("لا، تراجعت")'); await W(); eq(await ev(() => wishSaved()), 150000, 'saved by waiting');
  ok((await txt()).includes('تراجعت ✓'), 'past decision listed');
  await ev(() => act(() => { S.x.wish.push({ id: 'w2', name: 'ساعة', amount: 90000, type: null, t: Date.now() - 30 * 3600e3, done: null, at: null }); })); await ev(() => go('more', 'wish')); await W();
  await page.click('button:has-text("نعم، سأشتريه")'); await W();
  ok(await ev(() => view.tab === 'ops' && QX.amt === '90000' && QX.note === 'ساعة'), 'buy → quick expense prefilled');
  eq(await ev(() => S.x.wish.find(w => w.id === 'w2').done), 'buy', 'marked bought');
  await ev(() => { QX.amt = ''; QX.note = ''; NB.buy = null; NB.buyIn = null; go('insights', 'buy'); }); await W();
  await page.locator('label.f', { hasText: 'المبلغ' }).locator('input').fill('300000'); await page.click('button.prim:has-text("افحص القرار")'); await W();
  await page.click('button:has-text("انتظر يوماً (قائمة الرغبات)")'); await W();
  ok(await ev(() => view.sub === 'wish' && S.x.wish.some(w => w.amount === 300000 && !w.done)), 'buy check → wait a day');
  // ===== الفئة التلقائية =====
  await ev(() => { QX.picked = false; QX.cat = null; go('ops', null, { kind: 'expense' }); }); await W();
  await page.fill('.qx input[placeholder^="ملاحظة"]', 'بنزين'); await W(); eq(await ev(() => QX.cat), 'c_trans', 'auto category from word');
  ok((await txt()).includes('من الملاحظة'), 'auto label (word)');
  await page.fill('.qx input[placeholder^="ملاحظة"]', 'حلويات'); await W(); eq(await ev(() => QX.cat), 'c_gift', 'auto category from history');
  ok((await txt()).includes('من سجلّك'), 'auto label (history)');
  await page.click('button.chipb[data-cat="c_ent"]'); await page.fill('.qx input[placeholder^="ملاحظة"]', 'بنزين'); await W(); eq(await ev(() => QX.cat), 'c_ent', 'manual pick not overridden');
  await page.click('.qpad button[aria-label="5"]'); await page.click('button.prim:has-text("تم")'); await W(); ok(await ev(() => S.post.some(p => p.tx === S.tx[S.tx.length - 1].id && p.a === 'c_ent')), 'saved with chosen category');
  // ===== يوم الراتب =====
  await ev(() => go('ops', null, { kind: 'income' })); await W();
  await page.click('.qi .chipb[data-src="inc_salary"]'); await W(); await page.click(`.qi .chipb[data-acct="${ids['نقد']}"]`); await W(); for (const ch of '1000000') await page.click(`.qpad button[aria-label="${ch}"]`);
  await page.click('button.prim:has-text("تم")'); await W(); ok(await ev(() => view.sub === 'pyf' && view.p.flow === 1), 'payday step 1 (pyf)');
  await page.locator('label.f', { hasText: 'إلى' }).locator('select').selectOption(ids['ادخار']); await page.click('button.prim:has-text("سجّل التحويل")'); await W();
  ok(await ev(() => view.sub === 'payday' && view.p.step === 2 && !!document.querySelector('.pdsteps .on')), 'payday step 2 with step bar');
  ok((await txt()).includes('أقساط أهدافك') && (await txt()).includes('طوارئ'), 'goals listed');
  const g0 = await ev(() => L.goalView(S)[0].allocated), gm = await ev(() => { const g = L.goalView(S)[0]; return g.monthly - g.paidMonth; });
  await page.click('button.prim:has-text("خصّص المحدد")'); await W(); eq(await ev(() => L.goalView(S)[0].allocated), g0 + gm, 'goal allocated');
  ok(await ev(() => view.p.step === 3) && (await txt()).includes('إنترنت'), 'payday step 3 bills');
  await page.click('button.prim:has-text("سجّل المحدد كمدفوع")'); await W();
  ok(await ev(() => S.x.recur[0].last === L.mkey(L.today())), 'bill recorded');
  ok(await ev(() => view.p.step === 4), 'payday sheet');
  const sh = await ev(() => paydaySheet(1000000, L.today()));
  eq(sh.saved, 100000, 'sheet: saved (pyf 10%)'); eq(sh.goals, gm, 'sheet: goals'); eq(sh.bills, 25000, 'sheet: bills'); eq(sh.free, 1000000 - 100000 - gm - 25000, 'sheet: free');
  ok((await txt()).includes('ورقة الراتب') && (await txt()).includes('حرّ للصرف'), 'sheet UI');
  await page.click('button.prim:has-text("إلى الرئيسية")'); await W(); ok(await ev(() => view.tab === 'home'), 'finish → home');
  eq((await ev(() => L.integrity(S))).length, 0, 'integrity after payday');
  // تخطّي الخطوات
  await ev(c => go('more', 'payday', { salary: 500000, acct: c, date: L.today(), step: 2 }), ids['نقد']); await W(); await page.click('button:has-text("التالي"), button:has-text("تخطَّ")'); await W();
  ok(await ev(() => view.p.step === 3), 'skip goals'); await page.click('button:has-text("التالي"), button:has-text("تخطَّ")'); await W(); ok(await ev(() => view.p.step === 4), 'skip bills');
  // ===== (ج) المواسم =====
  const se = await ev(() => FD.seasons(S, '2027-01-15'));
  ok(se.length >= 1 && se[0].k === 'r' && se[0].d === '2027-02-08' && se[0].days === 24, 'seasons: ramadan 2027', se[0]);
  ok(se[0].est > 0 && se[0].weekly >= 1000 && se[0].weekly % 1000 === 0 && se[0].last === null, 'seasons: estimate & weekly');
  eq((await ev(() => FD.seasons(S, '2026-11-21'))).length, 0, 'seasons: none within 45 days now');
  ok((await ev(() => FD.seasons(S, '2027-01-15', 300))).some(x => x.k === 's' && x.d === '2027-10-01'), 'seasons: school start');
  ok(await ev(() => FD.seasons(S, '2027-01-15', 100).map(x => x.d).join() === FD.seasons(S, '2027-01-15', 100).slice().sort((a, b) => a.d < b.d ? -1 : 1).map(x => x.d).join()), 'seasons sorted');
  await ev(() => { window.__os = FD.seasons; FD.seasons = S0 => window.__os(S0, L.today(), 100); DGEN++; go('home'); }); await W();
  { const i = await ev(() => [...document.querySelectorAll('.upn')].findIndex(x => x.textContent.includes('رمضان'))); if (i >= 3) await page.click('summary:has-text("المزيد")'); await page.click('.upn:has-text("رمضان") button.upnb'); await W(); }
  ok(!!(await ev(() => document.querySelector('section.season'))), 'season card on home (from يهمّك الآن)');
  const sg0 = await ev(() => S.x.goalsDef.length); await page.click('section.season button:has-text("اجعله هدفاً")'); await page.waitForTimeout(400);
  eq(await ev(() => S.x.goalsDef.length), sg0 + 1, 'season → goal'); ok(await ev(() => S.x.goalsDef.at(-1).name.startsWith('رمضان') && S.x.goalsDef.at(-1).targetDate === '2027-02-08'), 'season goal fields');
  await ev(() => { UPN_OPEN = 'season'; go('home'); }); await W(); ok((await txt()).includes('هدفه موجود'), 'season: goal exists label');
  await page.click('section.season button:has-text("إخفاء")'); await W(); ok(!(await ev(() => document.querySelector('section.season'))) && !(await txt()).includes('رمضان بعد'), 'season hidden');
  await ev(() => { FD.seasons = window.__os; localStorage.removeItem('flousi-season-r2027-02-08'); DGEN++; });
  // ===== (ج) بطاقة الشهر =====
  const mc = await ev(() => { const c = FD.monthCard(S, '2026-10'), r = L.monthReport(S, '2026-10'); return { c, inc: r.income, exp: r.expense }; });
  eq(mc.c.income, mc.inc, 'card income'); eq(mc.c.expense, mc.exp, 'card expense'); eq(mc.c.savings, mc.inc - mc.exp, 'card savings'); eq(mc.c.days, 31, 'card days');
  ok(mc.c.calm >= 0 && mc.c.calm < 31 && mc.c.bigDay && mc.c.top, 'card fields', mc.c);
  eq(mc.c.rate, Math.round((mc.inc - mc.exp) / mc.inc * 100), 'card rate');
  eq((await ev(() => FD.monthCard(S, '2026-09'))).days, 30, 'card first month days');
  ok(await ev(() => wrapBanner() === null), 'wrap banner hidden after day 7');
  await ev(() => go('insights', 'wrap', { k: '2026-09' })); await W(); ok((await txt()).includes('أيلول 2026') && !!(await ev(() => document.querySelector('.wrapc'))), 'wrap screen');
  await page.selectOption('#app select', '2026-10'); await W(); ok((await txt()).includes('تشرين الأول 2026'), 'wrap month switch');
  await ev(() => { window.__sf = null; window.shareFile = async f => { window.__sf = { n: f.name, t: f.type, s: f.size }; }; });
  await page.click('button:has-text("احفظها صورة")'); await page.waitForTimeout(900);
  const sf = await ev(() => window.__sf); ok(sf && sf.t === 'image/png' && sf.n === 'flousi-2026-10.png' && sf.s > 20000, 'wrap image png', sf);
  // ===== (ج) الإنجازات =====
  await ev(() => { localStorage.removeItem('flousi-badges'); go('home'); }); await page.waitForTimeout(900);
  const bs = await ev(() => JSON.parse(localStorage.getItem('flousi-badges') || '{}')); ok(bs.first === (await ev(() => L.today())), 'badge first stored', bs);
  ok(await ev(() => document.querySelector('#toast') ? document.querySelector('#toast').textContent.includes('إنجاز') : true), 'badge toast');
  const nb = Object.keys(bs).length; await ev(() => go('home')); await page.waitForTimeout(300); eq(Object.keys(await ev(() => JSON.parse(localStorage.getItem('flousi-badges')))).length, nb, 'badges not repeated');
  ok(await ev(() => badgeState(S).wish === (wishSaved() > 0)), 'badge wish consistent');
  await ev(() => go('more', 'badges')); await W(); ok((await txt()).includes('من ' + (await ev(() => BADGES.length))) && (await ev(() => document.querySelectorAll('.badge').length)) === (await ev(() => BADGES.length)), 'badges page');
  ok(await ev(() => document.querySelectorAll('.badge.on').length) === Object.values(await ev(() => badgeOn().on)).filter(Boolean).length, 'badges on count');
  // ===== (ج) الحركة =====
  await ev(() => go('home')); await W(1500); const av = await ev(() => ({ t: document.querySelector('#app .big').textContent, m: money(L.status(S).avail) })); eq(av.t, av.m, 'hero number final');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await ev(c => act(() => L.expense(S, { date: L.today(), acct: c, cat: 'c_food', amount: 3000 })), ids['نقد']); await page.waitForTimeout(60);
  const av2 = await ev(() => ({ t: document.querySelector('#app .big').textContent, m: money(L.status(S).avail), cls: document.querySelector('#app').className })); eq(av2.t, av2.m, 'reduced motion: immediate number');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await ev(c => act(() => L.expense(S, { date: L.today(), acct: c, cat: 'c_food', amount: 2000 })), ids['نقد']); await page.waitForTimeout(1500);
  const av3 = await ev(() => ({ t: document.querySelector('#app .big').textContent, m: money(L.status(S).avail) })); eq(av3.t, av3.m, 'count-up lands on exact value');
  await ev(() => go('ops')); ok(await ev(() => document.querySelector('#app').classList.contains('tabin')), 'tab fade class');
  ok(await ev(() => !!document.querySelector('#snack .ck')), 'snack ✓ element');
  // ===== المراحل اللاحقة تُضاف هنا =====
  if (globalThis.__extra) await globalThis.__extra({ ev, page, W, txt, ok, eq, ids });
  for (const tb of ['home', 'ops', 'accts', 'assets', 'nabd', 'insights']) { await ev(x => go(x), tb); ok(!((await ev(() => (document.querySelector('#app h1') || {}).textContent || '')).includes('تعذّر')), 'tab ' + tb); }
  const s1 = await T(); await boot(); const s2 = await T(); ok(s1.fp === s2.fp && s1.tx === s2.tx, 'persisted after reload'); eq(s2.integ.length, 0, 'integrity final');
  ok(cerr.length === 0, 'no page errors', cerr.slice(0, 5));
} catch (e) { fail++; errs.push('CRASH ' + (e.stack || e)); }
await browser.close(); srv.kill();
console.log(`PASS ${pass}  FAIL ${fail}`); errs.forEach(e => console.log('  ✗ ' + e)); process.exit(fail ? 1 : 0);
