// الخطوة 2: العمليات — المصروف والدخل والتحويل بلوحة الأرقام، تحويل العملات، المطابقة القديمة، «لماذا قررت؟»
import { open, seed, T } from './lib.mjs';
const [DIR, PORT] = process.argv.slice(2); const { ok, eq, done } = T();
const { page, ev, W, txt, errs, close } = await open(DIR, PORT);
const tap = async s => { for (const ch of s) await page.click(`.qpad button[aria-label="${ch}"]`); };
try {
  const id = await seed(ev);
  await ev(() => go('ops')); await W(); let t = await txt();
  ok(await ev(() => [...document.querySelectorAll('#app > div > .seg button')].map(b => b.textContent).join('|')) === 'مصروف|دخل|تحويل', 'three kinds only');
  // مصروف
  await tap('15000'); await page.click('button.prim:has-text("تم")'); await W(400); ok(await ev(() => S.tx.at(-1).type === 'expense'), 'expense saved');
  // دخل بلوحة الأرقام
  await ev(() => go('ops', null, { kind: 'income' })); await W(); ok(!!(await ev(() => document.querySelector('.qi .qpad'))), 'income pad');
  await page.click('.qi .chipb[data-src="inc_other"]'); await W(); await page.click(`.qi .chipb[data-acct="${id.v}"]`); await W();
  await tap('75000'); await page.fill('.qi input[placeholder^="ملاحظة"]', 'استشارة'); await page.click('button.prim:has-text("تم")'); await W(400);
  ok(await ev(v => { const t = S.tx.at(-1); return t.type === 'income' && t.note === 'استشارة' && S.post.some(p => p.tx === t.id && p.a === v && p.n === 75000) && S.post.some(p => p.tx === t.id && p.a === 'inc_other'); }, id.v), 'income saved to chosen account & source');
  // الراتب يفتح «ادفع لنفسك أولاً»
  await page.click('.qi .chipb[data-src="inc_salary"]'); await W(); await tap('1000000'); await page.click('button.prim:has-text("تم")'); await W(400);
  ok(await ev(() => view.sub === 'pyf' || view.sub === 'payday'), 'salary → pay yourself first flow');
  // دخل بالدولار يطلب السعر
  await ev(u => go('ops', null, { kind: 'income', acct: u }), id.usd); await W(); ok(await ev(u => QI.acct === u, id.usd), 'prefilled income account');
  ok(!(await ev(() => document.querySelector('.qi label.f:has(input[placeholder^="سعر"])').hidden)), 'usd rate field visible'); await tap('20'); await page.click('button.prim:has-text("تم")'); await W(400);
  ok(await ev(u => S.post.some(p => p.tx === S.tx.at(-1).id && p.a === u && p.n === 2000), id.usd), 'usd income 20$');
  // تحويل بالدينار
  await ev(c => go('ops', null, { kind: 'transfer', from: c }), id.c); await W(); ok(await ev(c => QT.from === c, id.c), 'transfer from prefilled');
  await page.click(`.qt .chipb[data-to="${id.v}"]`); await W(); await tap('50000'); await page.click('button.prim:has-text("تم")'); await W(400);
  ok(await ev(([c, v]) => { const t = S.tx.at(-1); const ps = S.post.filter(p => p.tx === t.id); return t.type === 'transfer' && ps.length === 2 && ps.some(p => p.a === c && p.n === -50000) && ps.some(p => p.a === v && p.n === 50000); }, [id.c, id.v]), 'transfer: independent op, not income/expense');
  // تحويل عملات: المبلغ المستلم محسوب
  await ev(c => go('ops', null, { kind: 'transfer', from: c }), id.c); await W(); await page.click(`.qt .chipb[data-to="${id.usd}"]`); await W(); await tap('152000'); await W();
  eq(await ev(() => QT.amt2), '100.00', 'auto received amount at app rate');
  await page.click('button.prim:has-text("تم")'); await W(400);
  ok(await ev(([c, u]) => { const t = S.tx.at(-1); return S.post.some(p => p.tx === t.id && p.a === u && p.n === 10000) && S.post.some(p => p.tx === t.id && p.a === c && p.n === -152000); }, [id.c, id.usd]), 'currency transfer recorded');
  ok((await ev(() => document.querySelector('#snack') && document.querySelector('#snack').textContent)).includes('لماذا قررت؟'), 'why? offered for currency conversion');
  // التبديل والحاسبة
  await page.click('button.tswap'); await W(); ok(await ev(u => QT.from === u, id.usd), 'swap direction');
  await page.click('summary:has-text("حاسبة الدينار والدولار")'); await W(); ok((await txt()).includes('السعر المستخدم'), 'fx calculator inside transfer');
  await ev(() => go('ops', null, { kind: 'fx' })); await W(); ok(await ev(() => document.querySelector('details.fold[open]') && document.querySelector('#app .seg .on').textContent === 'تحويل'), 'old fx route → transfer with calculator open');
  // مطابقة قديمة
  await ev(() => go('ops', null, { kind: 'reconcile' })); await W(); ok((await txt()).includes('طابق الرصيد') && (await txt()).includes('سوِّ الفرق'), 'old reconcile route still works');
  // مصروف كبير → لماذا قررت؟
  await ev(() => go('ops')); await W(); await tap('400000'); await page.click('button.prim:has-text("تم")'); await W(400);
  ok((await ev(() => document.querySelector('#snack').textContent)).includes('لماذا قررت؟'), 'why? on big expense');
  await ev(() => go('ops')); await W(); await tap('5000'); await page.click('button.prim:has-text("تم")'); await W(400);
  ok(!(await ev(() => document.querySelector('#snack').textContent)).includes('لماذا قررت؟'), 'no why? on small expense');
  // «أتذكّرها الآن» من المطابقة
  const b = await ev(c => E.bal(S, c), id.c); await ev(([c, n]) => { RECON = { acct: c, counted: n }; go('ops'); }, [id.c, b - 12000]); await W();
  ok((await txt()).includes('باقي غير مسجّل') && (await txt()).includes('12,000'), 'recon bar');
  await tap('7000'); await page.click('button.prim:has-text("تم")'); await W(400); ok((await txt()).includes('5,000'), 'recon bar decreases');
  await page.click('button:has-text("الباقي خُردة")'); await W(400); ok(await ev(([c, n]) => E.bal(S, c) === n, [id.c, b - 12000]), 'rest to khurda');
  // تعديل وتراجع من السجل
  ok((await txt()).includes('تعديل') && (await txt()).includes('تراجع'), 'history edit/undo');
  eq((await ev(() => L.integrity(S))).length, 0, 'integrity');
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3));
} catch (e) { ok(false, 'CRASH ' + (e.stack || e)); }
await close(); process.exit(done() ? 1 : 0);
