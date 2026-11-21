// الخطوة 3: الرئيسية — بطاقة واحدة، أربعة اختصارات، سطر السوق، «يهمّك الآن» بكل مصادره
import { open, seed, T } from './lib.mjs';
const [DIR, PORT] = process.argv.slice(2); const { ok, eq, done } = T();
const { page, ev, W, txt, errs, close } = await open(DIR, PORT, { time: '2026-11-27T12:00:00+03:00' });
try {
  const id = await seed(ev);
  await ev(() => go('home')); await W(600); let t = await txt();
  ok(t.includes('تستطيع أن تصرف اليوم') && t.includes('صافي الثروة') && t.includes('دخل هذا الشهر'), 'hero');
  ok(!t.includes('العالم') && !(await ev(() => !!document.querySelector('.ticker.tk'))), 'world ticker removed');
  eq(await ev(() => [...document.querySelectorAll('.qhome .qk')].map(b => b.textContent).join('|')), 'مصروف|دخل|تحويل|طابق', 'four shortcuts');
  ok(t.includes('يهمّك الآن'), 'upn section');
  ok(!!(await ev(() => document.querySelector('button.mline'))), 'market line');
  // المطابقة الشهرية (اليوم 27) والمستحقات تظهر
  ok(t.includes('مطابقة آخر الشهر'), 'month recon in upn', t.slice(0, 600));
  // تنبيه سعر
  await ev(async () => { await act(() => { S.x.set.palerts = [{ id: 'a1', k: 'usd', op: '>', v: 100000 }]; }); go('home'); }); await W(500);
  ok(await ev(() => { const live = FN.get() && FN.ref() && FN.ref().live === 'current', shown = [...document.querySelectorAll('.upn')].some(x => x.textContent.includes('تجاوز') && x.textContent.includes('الدولار')); return live ? shown : !shown; }), 'price alert in upn only when price is current');
  await page.clock.setFixedTime(new Date('2026-11-21T20:00:00+03:00')); await ev(() => { DGEN++; go('home'); }); await W(400);
  ok(await ev(() => !(FN.ref() && FN.ref().live === 'current') || [...document.querySelectorAll('.upn')].some(x => x.textContent.includes('الدولار'))), 'price alert shown with current price');
  await page.clock.setFixedTime(new Date('2026-11-27T12:00:00+03:00')); await ev(() => { DGEN++; go('home'); }); await W(300);
  // رغبة جاهزة
  await ev(async () => { await act(() => { S.x.wish = [{ id: 'w1', name: 'سماعات', amount: 150000, type: null, t: Date.now() - 30 * 3600e3, done: null, at: null }]; }); go('home'); }); await W(400);
  t = await txt(); ok(t.includes('سماعات'), 'wish in upn');
  // مطابقة معلّقة مع إخفاء
  await ev(c => { localStorage.setItem('flousi-recon-later', JSON.stringify({ acct: c, counted: E.bal(S, c) - 9000, d: L.today() })); go('home'); }, id.c); await W(400);
  t = await txt(); ok(t.includes('مطابقة معلّقة') && t.includes('9,000'), 'recon later in upn');
  const line = await ev(() => [...document.querySelectorAll('.upn')].findIndex(x => x.textContent.includes('مطابقة معلّقة')));
  if (line >= 3) await page.click('summary:has-text("المزيد")');
  await page.click('.upn:has-text("مطابقة معلّقة") button.upnb'); await W(); ok(await ev(() => view.sub === 'recon' && view.p.c != null), 'recon later → recon screen prefilled');
  await ev(() => go('home')); await W(); if (line >= 3) await page.click('summary:has-text("المزيد")');
  await page.click('.upn:has-text("مطابقة معلّقة") button.upnx'); await W(); ok(!(await txt()).includes('مطابقة معلّقة'), 'dismiss recon later');
  // «المزيد» يحوي الباقي
  const n = await ev(() => document.querySelectorAll('.upn').length); ok(n >= 3, 'upn lines', n);
  // الاختصارات
  await page.click('.qhome .qk:has-text("تحويل")'); await W(); ok(await ev(() => view.tab === 'ops' && view.p.kind === 'transfer'), 'transfer shortcut');
  await ev(() => go('home')); await W(); await page.click('.qhome .qk:has-text("طابق")'); await W(); ok(await ev(() => view.sub === 'recon') && (await txt()).includes('أي حساب تعدّه؟'), 'recon shortcut → picker (2 IQD accounts)');
  await page.click('button.srow:has-text("نقد")'); await W(); ok(await ev(c => view.p.id === c, id.c), 'picker → account');
  await ev(() => go('home')); await W(); await page.click('button.mline'); await W(); ok(await ev(() => view.tab === 'nabd'), 'market line → nabd');
  // الموسم: سطر يفتح بطاقته داخل الرئيسية (رمضان 2027 بعد أقل من 45 يوماً في 2027-01-15)
  await page.clock.setFixedTime(new Date('2027-01-15T12:00:00+03:00')); await ev(() => { DGEN++; go('home'); }); await W(400);
  t = await txt(); ok(t.includes('رمضان بعد'), 'season line', t.slice(0, 500));
  const sl = await ev(() => [...document.querySelectorAll('.upn')].findIndex(x => x.textContent.includes('رمضان'))); if (sl >= 3) await page.click('summary:has-text("المزيد")');
  await page.click('.upn:has-text("رمضان") button.upnb'); await W(); ok((await txt()).includes('اجعله هدفاً'), 'season card opens in home');
  // بطاقة الشهر أول 7 أيام
  await page.clock.setFixedTime(new Date('2026-12-03T12:00:00+03:00')); await ev(() => { DGEN++; go('home'); }); await W(400); ok((await txt()).includes('في «شهري»'), 'month card line in first week');
  // الرقم الرئيسي يطابق الحساب
  const av = await ev(() => ({ t: document.querySelector('#app section.hero .big').textContent, m: money(L.status(S).avail) })); await W(1500);
  const av2 = await ev(() => ({ t: document.querySelector('#app section.hero .big').textContent, m: money(L.status(S).avail) })); eq(av2.t, av2.m, 'hero number exact');
  eq((await ev(() => L.integrity(S))).length, 0, 'integrity'); ok(errs.length === 0, 'no page errors', errs.slice(0, 3));
} catch (e) { ok(false, 'CRASH ' + (e.stack || e)); }
await close(); process.exit(done() ? 1 : 0);
