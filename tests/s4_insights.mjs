// الخطوة 4: تحليلاتي — خط ثروتك (يطابق صافي الثروة المحفوظ)، قبل أن تصرف، شهري، المستشار الموحّد، قراراتي
import { open, seed, T } from './lib.mjs';
const [DIR, PORT] = process.argv.slice(2); const { ok, eq, done } = T();
const { page, ev, W, txt, errs, close } = await open(DIR, PORT);
try {
  const id = await seed(ev);
  // خط ثروتك: مجموع الأقسام = صافي الثروة الذي يحسبه المحرك لكل نهاية شهر، بطريقتي التقييم
  for (const mode of ['market', 'cost']) {
    const r = await ev(m => { S.x.set.valuation = m; const ms = wealthSeries(1200); return ms.map(x => ({ k: x.k, a: x.nw, b: L.nwv(S, L.at(S, x.d)) })); }, mode);
    ok(r.length >= 4 && r.every(x => x.a === x.b), 'wealth line sums to engine net worth (' + mode + ')', r.filter(x => x.a !== x.b));
  }
  await ev(() => { S.x.set.valuation = 'market'; });
  const parts = await ev(() => wealthAt(L.today())); ok(parts.metals > 0 && parts.usd > 0 && parts.other > 0 && parts.liab > 0 && parts.cash > 0, 'components present', parts);
  await ev(() => go('insights')); await W(500); let t = await txt();
  ok(t.includes('خط ثروتك') && t.includes('اضغط أي شهر'), 'wealth line shown');
  ok(!t.includes('هل أشتري؟') && !t.includes('ماذا لو؟') && !t.includes('ملخص الشهر حتى اليوم'), 'old buttons/cards removed from main');
  ok(['قبل أن تصرف', 'شهري', 'المستشار', 'قراراتي'].every(x => t.includes(x)), 'new tiles');
  ok(t.includes('المصروف حسب الفئة') && t.includes('توزيع الأصول') && t.includes('الأهداف') && t.includes('الدخل والمصروف'), 'other insights kept');
  ok(t.includes('بعد 5 سنوات'), 'path card kept');
  // الضغط على شهر
  const k = await ev(() => document.querySelector('.wl rect[data-k]').getAttribute('data-k'));
  await page.click(`.wl rect[data-k="${k}"]`, { force: true }); await W(); ok(await ev(k => view.p.wm === k, k) && (await txt()).includes('تفصيل'), 'tap month → breakdown');
  // قبل أن تصرف
  await ev(() => go('insights', 'buy')); await W(); t = await txt(); ok(t.includes('قبل أن تصرف') && t.includes('شراء الآن') && t.includes('افحص القرار'), 'before-spend: buy');
  await page.locator('label.f', { hasText: 'المبلغ' }).locator('input').fill('300000'); await page.click('button.prim:has-text("افحص القرار")'); await W();
  ok((await txt()).includes('انتظر يوماً (قائمة الرغبات)'), 'buy verdict');
  await page.click('#app > div > .seg button:has-text("التزام أو تغيّر في الدخل")'); await W(); ok(await ev(() => view.sub === 'whatif') && (await txt()).includes('قبل أن تصرف'), 'before-spend: what-if');
  ok(await ev(() => document.querySelectorAll('#app h1').length === 1), 'single header');
  // شهري
  await ev(() => go('insights', 'wrap')); await W(); t = await txt(); ok(t.includes('شهري') && t.includes('بطاقة الشهر') && t.includes('إنجازاتي'), 'shahri card tab');
  await page.click('#app > div > .seg button:has-text("التفاصيل")'); await W(); t = await txt();
  ok(t.includes('الخُردة هذا الشهر') && t.includes('جسر صافي الثروة') && t.includes('المصروف حسب الفئة'), 'shahri details');
  await page.click('#app > div > .seg button:has-text("سنوي")'); await W(); ok((await txt()).includes('ملخص 2026'), 'shahri year');
  await page.click('#app > div > .seg button:has-text("الحدود")'); await W(); ok((await txt()).includes('النسبة %'), 'shahri limits');
  // الخُردة تُحسب
  const bal = await ev(c => E.bal(S, c), id.c); await ev(([c, n]) => act(() => L.reconcile(S, { date: L.today(), acct: c, counted: n })), [id.c, bal - 15000]);
  ok(await ev(() => khurda(L.mkey(L.today())).s === 15000), 'khurda month total');
  // المستشار الموحّد
  await ev(() => go('insights', 'advisor')); await W(); t = await txt(); ok(t.includes('المستشار'), 'advisor');
  await ev(() => go('nabd', null, { t: 'mine' })); await W(); ok((await txt()).includes('صفحة المستشار'), 'market advice points to advisor');
  // قراراتي
  await ev(c => act(() => L.expense(S, { date: L.today(), acct: c, cat: 'c_home', amount: 600000, note: 'ثلاجة' })), id.c);
  const tx = await ev(() => S.tx.at(-1).id);
  await ev(t => go('insights', 'decisions', { tx: t }), tx); await W(); t = await txt(); ok(t.includes('بانتظار سببك') && t.includes('ثلاجة'), 'pending decision');
  await page.fill('.dfocus textarea', 'القديمة خربت'); await page.click('.dfocus button:has-text("احفظ السبب")'); await W();
  ok(await ev(t => (S.x.set.decs || []).some(d => d.tx === t && d.why === 'القديمة خربت'), tx), 'decision saved in settings');
  ok(await ev(() => L.integrity(S).length === 0), 'integrity after decision');
  // بعد 3 أشهر: نتيجة مستحقة وسؤال التقييم
  await page.clock.setFixedTime(new Date('2027-03-01T12:00:00+03:00')); await ev(() => { DGEN++; go('home'); }); await W(400);
  ok((await txt()).includes('حان موعد نتيجة قرارك'), 'decision due in upn');
  await ev(() => go('insights', 'decisions')); await W(); await page.click('button:has-text("👍 كان صائباً")'); await W();
  ok(await ev(t => { const d = S.x.set.decs.find(x => x.tx === t); return d.rate === 'good' && d.seen.includes(90); }, tx), 'rating saved');
  // قرار ذهب: النتيجة من الأسعار
  const gtx = await ev(() => S.tx.find(t => t.type === 'buy_metal').id); await ev(t => decSave(t, { why: 'تجربة' }), gtx); await W();
  await ev(() => go('insights', 'decisions')); await W(); ok((await txt()).includes('قيمة القطعة المعدنية'), 'metal decision outcome from prices');
  // النسخة الاحتياطية تحمل القرارات
  ok(await ev(() => JSON.stringify(S.x).includes('القديمة خربت')), 'decisions inside S.x (backed up)');
  eq((await ev(() => L.integrity(S))).length, 0, 'integrity'); ok(errs.length === 0, 'no page errors', errs.slice(0, 3));
} catch (e) { ok(false, 'CRASH ' + (e.stack || e)); }
await close(); process.exit(done() ? 1 : 0);
