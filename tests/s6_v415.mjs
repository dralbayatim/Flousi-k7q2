// f1-v4.15: اختبار إصلاحات المراجعة (أ، ب، ج، د)
import { open, seed, T } from './lib.mjs';
const [DIR, PORT] = process.argv.slice(2); const { ok, eq, done } = T();
const { page, ev, W, txt, errs, close, ctx } = await open(DIR, PORT, { time: '2026-11-27T12:00:00+03:00' });
try {
  // ---- أ5: بند متكرر موعده قبل يوم البدء في شهر البدء لا يُسأل عنه (داخل في الرصيد الافتتاحي) ----
  await page.clock.setFixedTime(new Date('2026-11-22T12:00:00+03:00'));
  await ev(async () => { await act(() => { S.x.set.featDone = true; L.opening(S, '2026-11-22', [{ name: 'نقد', type: 'asset_cash', cur: 'IQD', amount: 5000000 }]); }); });
  const c0 = await ev(() => Object.values(S.acc).find(a => a.name === 'نقد').id);
  const addRec = async (name, day) => { await ev(() => go('more', 'recurring')); await W(250);
    const sec = page.locator('section', { hasText: 'بند جديد' }).last();
    await sec.getByLabel('النوع').selectOption('income'); await sec.getByLabel('الاسم', { exact: true }).fill(name); await sec.getByLabel('المبلغ المتوقع').fill('1000000');
    await sec.getByLabel('يوم الشهر (1 إلى 28)').fill(String(day)); await sec.getByLabel('التذكير قبل كم يوماً (0 إلى 7)').fill('0'); await sec.getByLabel('هل هو الراتب؟').selectOption('1');
    await sec.getByRole('button', { name: 'أضف' }).click(); await W(500); return ev(n => S.x.recur.find(r => r.name === n) || null, name); };
  const r1 = await addRec('راتب', 20); const tst = await ev(() => (document.querySelector('#toast') || {}).textContent || ''); ok(tst.includes('الشهر القادم'), 'toast explains next month', tst); const r2 = await addRec('إيجار وارد', 25);
  ok(r1 && r1.last === '2026-11', 'salary day 20 < start 22 → starts next month', r1);
  ok(r2 && r2.last === null, 'item day 25 > start 22 → asked this month', r2);
  const due = await ev(() => L.recurDue(S).map(x => x.r.name)); ok(!due.includes('راتب') && due.length <= 1, 'salary not due now', due);
  // الشهر التالي: يُسأل عنه بعد موعده
  await page.clock.setFixedTime(new Date('2026-12-21T12:00:00+03:00'));
  ok(await ev(() => L.recurDue(S).some(x => x.r.name === 'راتب')), 'salary due next month after its day');
  // بند يُضاف في شهر لاحق لا يتأثر (القاعدة لشهر البدء فقط)
  const r3 = await addRec('مكافأة', 5); ok(r3 && r3.last === null, 'later month: rule does not apply', r3);
  // البيانات: لا عمليات أنشأتها الإضافة
  eq(await ev(() => S.tx.filter(t => t.type !== 'opening').length), 0, 'no transactions created by adding recurring');

  // ---- بيانات غنية للبقية ----
  await ev(() => indexedDB.deleteDatabase('flousi')); await ctx.clearCookies();
  await page.clock.setFixedTime(new Date('2026-11-27T12:00:00+03:00'));
  await page.reload(); await page.waitForFunction(() => typeof S !== 'undefined' && S && document.querySelector('#nav button'));
  const id = await seed(ev);
  // ---- أ1: اسم البطاقة الرئيسية ----
  await ev(() => go('home')); await W(600); let t = await txt();
  ok(t.includes('المتاح للصرف') && !t.includes('تستطيع أن تصرف اليوم'), 'hero label is المتاح للصرف');
  // ---- أ2/أ3: لا تكرار، وحد أقصى 6 ----
  await ev(async () => { await act(() => { L.setLimit(S, 'أكل', 100000); }); go('home'); }); await W(500);
  const lines = await ev(() => [...document.querySelectorAll('.upns .upn')].map(x => x.textContent));
  ok(await ev(() => [...document.querySelectorAll('.upns .upn i')].filter(i => i.textContent === '💡').length <= 2), 'at most 2 advisor tips on home', lines.length);
  ok(lines.filter(x => x.includes('حد «أكل»')).length <= 1, 'limit alert once', lines);
  ok(lines.filter(x => x.includes('تركّز')).length <= 1, 'concentration once', lines);
  ok(!lines.some(x => x.includes('نسبة الذهب/الفضة')), 'no gold/silver ratio advice on home');
  ok(!lines.some(x => x.includes('لا عمليات مسجّلة منذ أيام')), 'no H1 duplicate of nudge');
  // ---- ج15/ج16: وحدات سطر السوق، ولا «0» وحيد ----
  const ml = await ev(() => { const b = document.querySelector('button.mline'); return b ? b.textContent : ''; });
  ok(!ml.includes('مثقال 21') || (ml.includes('د.ع') && ml.includes('100 دولار')), 'market line units', ml);
  ok(await ev(() => { const s = document.querySelector('section.hero .wbig small'); return !s || s.textContent.trim() !== '0'; }), 'no lone 0 beside net worth');
  // ---- أ4: الصندوق الذهبي سطران واضحان ----
  await ev(() => go('accts', 'gold')); await W(400); t = await txt();
  const hasMkt = await ev(() => { try { return !!FM.metalsNow(S); } catch (e) { return false; } });
  if (hasMkt) ok(t.includes('الفرق عن التكلفة بسعر السوق') && t.includes('بأسعارك المعتمدة (المحتسبة في ثروتك)') && t.includes('الفرق بأسعارك المعتمدة'), 'gold box shows both bases with diffs');
  else ok(t.includes('الفرق (غير محقق)') && !t.includes('بسعر السوق'), 'gold box recorded basis only');
  const g = await ev(() => { const g = goldSummary(); return g; });
  ok(g.unreal === g.theo - g.cost, 'gold unrealized math unchanged');
  // ---- ج12: بطاقة الأسهم مخفية حتى أول سهم ----
  await ev(() => go('accts')); await W(300);
  ok(!(await ev(() => !!document.querySelector('[data-stocks]'))), 'stocks card hidden with no stocks');
  ok(await ev(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('إضافة')); if (b) b.click(); return true; }), 'open add');
  await W(200); ok((await txt()).includes('سهم'), 'stock still available in add menu');
  // ---- ج13: زر التراجع هادئ ----
  await ev(() => go('ops')); await W(300);
  const und = await ev(() => [...document.querySelectorAll('button')].filter(b => b.textContent === 'تراجع').map(b => b.className));
  ok(und.length > 0 && und.every(c => c.includes('alt')), 'undo buttons are calm (alt)', und);
  // ---- ج18: الرجوع إلى المكان الذي فُتحت منه ----
  await ev(() => go('insights', 'wrap')); await W(300);
  await ev(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('إنجازاتي')); b && b.click(); }); await W(300);
  eq(await ev(() => view.sub), 'badges', 'opened badges from shahri');
  await ev(() => document.querySelector('.back, button.back').click()); await W(300);
  eq(await ev(() => view.tab + '/' + view.sub), 'insights/wrap', 'back from badges → shahri');
  await ev(() => go('insights', 'buy')); await W(300);
  await ev(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('قائمة الرغبات')); b && b.click(); }); await W(300);
  eq(await ev(() => view.sub), 'wish', 'opened wish from before-spend');
  await ev(() => document.querySelector('.back, button.back').click()); await W(300);
  eq(await ev(() => view.tab + '/' + view.sub), 'insights/buy', 'back from wish → before-spend');
  await ev(() => go('more', 'wish')); await W(200); await ev(() => document.querySelector('.back, button.back').click()); await W(200);
  eq(await ev(() => view.tab), 'insights', 'wish opened directly → parent insights');
  // ---- ج19: لا ملاحظة «حساب مصرفي» لمن لا يملكه ----
  await ev(() => go('more', 'set', { s: 'feat' })); await W(300);
  ok(!(await txt()).includes('«حساب مصرفي» أُزيل'), 'no bank note for user without bank');
  // ---- ب10: لون «عقار وأصول أخرى» مميّز ----
  ok(await ev(() => WCOMP.find(x => x[0] === 'other')[2] !== '#3a9d7a'), 'distinct real-estate color');
  // ---- ج11: الشروح واحداً تلو الآخر ----
  await ev(() => { localStorage.setItem('flousi-coach', JSON.stringify({ off: false, seen: {} })); coachLast = null; go('home'); }); await W(900);
  const c1 = await ev(() => ({ b: document.querySelectorAll('#coach .cbub').length, step: (document.querySelector('#coach .cfoot small') || {}).textContent || '', next: !!document.querySelector('#coach .cnext') }));
  ok(c1.b === 1 && /1 من \d/.test(c1.step) && c1.next, 'coach shows one tip with next', c1);
  await ev(() => document.querySelector('#coach .cnext').click()); await W(200);
  const c2 = await ev(() => ({ b: document.querySelectorAll('#coach .cbub').length, step: (document.querySelector('#coach .cfoot small') || {}).textContent || '' }));
  ok(c2.b === 1 && /^2 من/.test(c2.step), 'next moves to tip 2', c2);
  await ev(() => document.getElementById('coach').click()); await W(200);
  ok(!(await ev(() => !!document.getElementById('coach'))), 'tap anywhere closes');
  await ev(() => localStorage.setItem('flousi-coach', JSON.stringify({ off: true, seen: {} })));
  // ---- د21: خط ثروتك = حساب كل شهر من الصفر ----
  const eqw = await ev(() => { const a = wealthSeries(1200); DGEN++; const b = wealthSeries(1200), c = wealthSeries(12); return JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a.slice(-12)) === JSON.stringify(c) && a.every(m => m.nw === wealthAt(m.d).nw); });
  ok(eqw, 'wealth series memo/slice equals full recompute');
  eq(await ev(() => VER), 'f1-v4.15', 'version');
} catch (e) { ok(false, 'exception', String(e).slice(0, 300)); }
ok(errs.length === 0, 'no page errors', errs.slice(0, 3));
await close(); process.exit(done() ? 1 : 0);
