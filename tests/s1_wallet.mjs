// الخطوة 1: المحفظة — كل وظيفة من «أموالي» و«الأصول» تعمل من مكانها الجديد
import { open, seed, T } from './lib.mjs';
const [DIR, PORT] = process.argv.slice(2); const { ok, eq, done } = T();
const { page, ev, W, txt, errs, close, boot } = await open(DIR, PORT);
try {
  const id = await seed(ev);
  await ev(() => go('accts')); await W(); let t = await txt();
  ok(t.includes('المال السائل') && t.includes('ما تملكه') && t.includes('الالتزامات'), 'wallet sections');
  ok(await ev(() => !!document.querySelector('[data-gold]') && !document.querySelector('[data-stocks]')), 'gold card; stocks card hidden until first stock (v4.15)');
  ok(t.includes('الصندوق الذهبي') && t.includes('ذهب 21') && t.includes('فضة'), 'gold summary by karat');
  ok(await ev(() => document.querySelectorAll('.wrow button.wcard').length) >= 4, 'account cards (liquid + liab)');
  ok(t.includes('يحتاج متابعتك') && t.includes('الديون') && t.includes('الأهداف') && t.includes('المتكررات والراتب'), 'tiles shown when relevant');
  ok(!t.includes('الجمعيات'), 'jams tile hidden when none');
  ok(t.includes('بيت') && t.includes('95,000,000'), 'real estate card with valuation');
  ok(await ev(() => !!document.querySelector('nav button.on') && document.querySelector('nav button.on').textContent.includes('أموالي')), 'nav highlight');
  // ترتيب: الأكثر استعمالاً أولاً، ثم التثبيت
  const first = await ev(() => document.querySelector('.wrow button.wcard .wn').textContent); ok(first.includes('نقد'), 'most used first', first);
  // تفاصيل الحساب
  await page.click('.wrow button.wcard[data-acct="' + id.v + '"]'); await W(); t = await txt();
  ok(t.includes('أضف إليه') && t.includes('اصرف منه') && t.includes('حوّل منه') && t.includes('هذا الشهر') && t.includes('آخر الحركات') && t.includes('كهرباء'), 'account detail', t.slice(0, 200));
  await page.click('button:has-text("ثبّت في المقدمة")'); await W(); await ev(() => go('accts')); await W();
  ok((await ev(() => document.querySelector('.wrow button.wcard .wn').textContent)).includes('فيزا'), 'pinned first');
  await ev(v => { go('accts', 'acct', { id: v }); }, id.v); await W(); await page.click('button:has-text("ألغِ التثبيت")'); await W();
  // الدولار
  await ev(u => go('accts', 'acct', { id: u }), id.usd); await W(); t = await txt(); ok(t.includes('متوسط الشراء') && t.includes('غير محقق') && t.includes('القيمة الحالية'), 'usd WAC in card');
  // التقييم
  await ev(x => go('accts', 'acct', { id: x }), id.home); await W(); t = await txt(); ok(t.includes('التقييم') && t.includes('سجل التقييمات') && t.includes('حدّث التقييم'), 'valuation in card');
  await page.locator('label.f', { hasText: 'القيمة التقديرية' }).locator('input').fill('96,000,000'); await page.click('button:has-text("حدّث التقييم")'); await W();
  ok(await ev(x => L.valuations(S).find(v => v.id === x).last.v === 96000000, id.home), 'valuation saved');
  // الأزرار الثلاثة تفتح العمليات والحساب معبّأ
  await ev(c => go('accts', 'acct', { id: c }), id.c); await W(); await page.click('.wact button:has-text("اصرف منه")'); await W();
  ok(await ev(c => view.tab === 'ops' && QX.acct === c, id.c), 'spend from → expense pad with account');
  // طابق الرصيد: الخُردة
  const bal = await ev(c => E.bal(S, c), id.c);
  await ev(c => go('accts', 'recon', { id: c }), id.c); await W(); await page.fill('#app input', String(bal - 23000)); await page.click('button.prim:has-text("طابق")'); await W();
  ok((await txt()).includes('نقص 23,000') && (await txt()).includes('ضعها في الخُردة'), 'shortage shown');
  const n0 = await ev(() => S.tx.length); await page.click('button:has-text("ضعها في الخُردة")'); await W(400);
  ok(await ev(([c, b]) => E.bal(S, c) === b - 23000 && S.tx.at(-1).type === 'reconcile', [id.c, bal]), 'khurda recorded via reconcile');
  ok(await ev(() => { const t = S.tx.at(-1); return S.post.some(p => p.tx === t.id && p.a === 'recon' && p.n === 23000); }), 'shortage → recon account +');
  // أتذكّرها الآن
  const bal2 = await ev(c => E.bal(S, c), id.c); await ev(c => go('accts', 'recon', { id: c }), id.c); await W(); await page.fill('#app input', String(bal2 - 10000)); await page.click('button.prim:has-text("طابق")'); await W();
  await page.click('button:has-text("أتذكّرها الآن")'); await W(); ok(await ev(() => view.tab === 'ops' && RECON && RECON.counted >= 0), 'remember now → expense with bar');
  // لاحقاً
  await ev(c => go('accts', 'recon', { id: c }), id.c); await W(); await page.fill('#app input', String(bal2 - 5000)); await page.click('button.prim:has-text("طابق")'); await W(); await page.click('button:has-text("لاحقاً")'); await W();
  ok(await ev(() => !!JSON.parse(localStorage.getItem('flousi-recon-later'))), 'later stored'); await ev(() => { localStorage.removeItem('flousi-recon-later'); RECON = null; });
  // زيادة
  const bal3 = await ev(c => E.bal(S, c), id.c); await ev(c => go('accts', 'recon', { id: c }), id.c); await W(); await page.fill('#app input', String(bal3 + 7000)); await page.click('button.prim:has-text("طابق")'); await W();
  await page.click('button:has-text("سجّلها «مبلغ غير مسجّل»")'); await W(400); ok(await ev(([c, b]) => E.bal(S, c) === b + 7000, [id.c, bal3]), 'surplus recorded');
  // الصندوق الذهبي
  await ev(() => go('accts')); await W(); await page.click('[data-gold]'); await W(); t = await txt();
  ok(t.includes('الصندوق الذهبي') && t.includes('قطعك') && t.includes('سوار') && t.includes('خاتم') && t.includes('سبيكة فضة') && t.includes('اشترِ') && t.includes('سجل الذهب'), 'gold box');
  await page.click('button.ptile:has-text("سوار")'); await W(); t = await txt();
  ok(t.includes('عيار 21') && t.includes('10.000 غ') && t.includes('تاريخ الشراء') && t.includes('2026-09-05') && t.includes('1,700,000') && t.includes('سجل القطعة'), 'piece detail: weight, karat, buy price, date', t.slice(0, 300));
  await page.click('button.prim:has-text("بِع")'); await W(); ok(await ev(() => view.tab === 'assets' && view.sub === 'sell'), 'sell screen');
  await page.locator('label.f', { hasText: 'مبلغ البيع' }).locator('input').fill('1,800,000'); page.once('dialog', d => d.accept()); await page.click('button:has-text("أكّد البيع")'); await W(500);
  ok(await ev(() => view.sub === 'report'), 'sale report after sell'); await page.click('button.back'); await W(); ok(await ev(() => view.tab === 'accts' && view.sub === 'gold'), 'report back → gold box');
  t = await txt(); ok(t.includes('مبيعة') && t.includes('سوار'), 'sold listed');
  await page.click('button:has-text("سجل الذهب")'); await W(); t = await txt(); ok(t.includes('شراء') && t.includes('بيع') && t.includes('2026-10-05'), 'gold log');
  await ev(() => go('assets', 'buy')); await W(); await page.click('button.back'); await W(); ok(await ev(() => view.tab === 'accts' && view.sub === 'gold'), 'buy back → gold');
  await ev(() => go('assets', 'old')); await W(); ok((await txt()).includes('قطعة موجودة قبل البدء'), 'old piece route');
  // الأسهم
  await ev(() => go('accts', 'stocks')); await W(); ok((await txt()).includes('+ سهم جديد'), 'stocks screen'); await page.click('button:has-text("+ سهم جديد")'); await W(); await page.click('button.back'); await W();
  ok(await ev(() => view.sub === 'stocks'), 'stock back → stocks');
  // الأصول القديمة تفتح المحفظة
  await ev(() => go('assets')); await W(); ok((await txt()).includes('المال السائل'), 'old assets route → wallet');
  // المربعات والإضافة والإدارة
  await ev(() => go('accts')); await W(); await page.click('[data-tile="debts"]'); await W(); ok(await ev(() => view.sub === 'debts'), 'debts tile'); await page.click('button.back'); await W(); ok(await ev(() => view.tab === 'accts'), 'debts back → wallet');
  await ev(() => go('accts')); await W(); await page.click('summary:has-text("+ إضافة")'); await W(); t = await txt();
  ok(['حساب جديد', 'قطعة ذهب أو فضة', 'سهم', 'دين', 'جمعية', 'بند متكرر أو الراتب', 'هدف'].every(x => t.includes(x)), 'add menu covers all sections');
  await page.locator('label.f', { hasText: 'اسم الحساب' }).locator('input').fill('محفظة زين'); await page.click('button:has-text("أضف حساباً")'); await W();
  ok(await ev(() => Object.values(S.acc).some(a => a.name === 'محفظة زين')), 'new account');
  await page.click('summary:has-text("⋯ إدارة")'); await W(); t = await txt(); ok(t.includes('إدارة الحسابات') && t.includes('تصحيح الرصيد الافتتاحي'), 'manage section');
  // أسعارك المعتمدة في نبض السوق
  await ev(() => go('nabd', null, { t: 'now' })); await W(); ok((await txt()).includes('أسعارك المعتمدة'), 'rates in nabd now');
  eq((await ev(() => L.integrity(S))).length, 0, 'integrity');
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3));
} catch (e) { ok(false, 'CRASH ' + (e.stack || e)); }
await close(); process.exit(done() ? 1 : 0);
