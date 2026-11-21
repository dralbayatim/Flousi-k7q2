// الخطوة 5: التبويبات الخمسة، الإعدادات (8 مفاتيح + متقدم)، شاشة البداية القديمة، الشروح على الشاشات، التعليمات
import { open, seed, T } from './lib.mjs';
const [DIR, PORT] = process.argv.slice(2); const { ok, eq, done } = T();
// أولاً بالشروح مفعّلة
const A = await open(DIR, PORT, { coach: true });
try {
  const { page, ev, W, txt } = A;
  await ev(() => { localStorage.removeItem('flousi-coach'); }); await A.boot(); await seed(ev); await ev(() => go('home')); await W(900);
  ok(await ev(() => !!document.getElementById('coach')), 'coach shows on opening home');
  ok(await ev(() => { const n = document.querySelectorAll('#coach .cbub').length + document.querySelectorAll('#coach .cbelow li').length; return n >= 3 && n <= 5; }), 'coach 3–5 tips (visible + below)');
  await page.mouse.click(200, 300); await W(); ok(await ev(() => !document.getElementById('coach')), 'tap anywhere closes');
  await ev(() => go('ops')); await W(900); ok(await ev(() => !!document.getElementById('coach')), 'coach on ops');
  await page.click('#coach button:has-text("لا تُظهر شروح هذه الشاشة مجدداً")'); await W();
  await ev(() => go('home')); await W(900); ok(await ev(() => !!document.getElementById('coach')), 'home shows again (not skipped)'); await page.mouse.click(200, 300);
  await ev(() => go('ops')); await W(900); ok(await ev(() => !document.getElementById('coach')), 'ops skipped forever');
  await ev(() => go('accts')); await W(900); await page.click('#coach button:has-text("أوقف كل الشروح")'); await W();
  await ev(() => go('home')); await W(900); ok(await ev(() => !document.getElementById('coach')), 'all coach stopped');
  // الإعدادات تعيدها
  await ev(() => go('more', 'set', { s: 'coach' })); await W(); ok((await txt()).includes('الشروح على الشاشات') && (await txt()).includes('متوقفة'), 'coach settings');
  await page.click('button:has-text("أظهر الشروح من جديد")'); await W(); await ev(() => go('ops')); await W(900); ok(await ev(() => !!document.getElementById('coach')), 'coach restored');
  await page.mouse.click(200, 300);
  // شرح «لماذا قررت؟» مرة واحدة عند أول ظهور
  await ev(() => go('ops')); await W(900); await page.mouse.click(200, 300); await W();
  for (const ch of '400000') await page.click(`.qpad button[aria-label="${ch}"]`); await page.click('button.prim:has-text("تم")'); await W(900);
  ok(await ev(() => !!document.getElementById('coach') && document.getElementById('coach').textContent.includes('لماذا قررت؟')), 'why? explained on first appearance');
  ok(await ev(() => JSON.parse(localStorage.getItem('flousi-coach')).seen['snack-why'] === true), 'why? tip once');
  ok(A.errs.length === 0, 'no page errors (coach)', A.errs.slice(0, 3));
} catch (e) { ok(false, 'CRASH coach ' + (e.stack || e)); }
await A.close();
// ثانياً البنية والإعدادات
const B = await open(DIR, +PORT + 1);
try {
  const { page, ev, W, txt } = B; await seed(ev);
  eq(await ev(() => [...document.querySelectorAll('#nav button')].map(b => b.textContent).join('|')), 'الرئيسية|العمليات|أموالي|نبض السوق|تحليلاتي', 'five tabs');
  eq(await ev(() => PAGES.map(p => p.tab).join()), 'home,ops,accts,nabd,insights', 'swipe pages');
  await ev(() => go('more', 'set', { s: 'feat' })); await W(); const fr = await ev(() => [...document.querySelectorAll('.frow')].filter(e => e.checkVisibility()).map(e => e.dataset.f));
  eq(fr.filter(k => !['home', 'ops'].includes(k)).length, 8, 'eight main switches visible');
  await page.click('summary:has-text("متقدم")'); await W(); ok(await ev(() => ['accts', 'assets', 'goals', 'recurring', 't_visa', 't_liab'].every(k => document.querySelector(`.frow[data-f="${k}"]`).checkVisibility())), 'advanced switches reachable');
  // مفتاح قديم «الأصول» = false يخفي الذهب والأسهم من المحفظة ويمكن إعادته
  await ev(() => act(() => { S.x.set.feat = { assets: false }; })); await ev(() => go('accts')); await W(); ok(!(await ev(() => !!document.querySelector('[data-gold]'))), 'legacy assets:false hides gold card');
  await ev(() => go('more', 'set', { s: 'feat' })); await W(); await page.click('summary:has-text("متقدم")'); await page.click('.frow[data-f="assets"] button.swt'); await W(); ok(await ev(() => fOn('assets')), 'legacy key re-enabled from UI');
  // «world» القديم لا يكسر شيئاً، و«بسيط» يعمل
  await ev(() => act(() => { S.x.set.feat = { world: false }; })); ok(await ev(() => featPreset()) === 'full', 'legacy world key ignored');
  // شاشة البداية القديمة «الأصول» تفتح «أموالي»
  await ev(() => act(() => { S.x.set.start = 'assets'; })); await B.boot(); ok(await ev(() => view.tab === 'accts'), 'start=assets → wallet');
  await ev(() => go('more', 'settings')); await W(); ok((await txt()).includes('شاشة البداية') && (await txt()).includes('أموالي'), 'start shown as wallet');
  ok(!(await txt()).includes('إنجازاتي'), 'badges row moved out of settings'); ok((await txt()).includes('الشروح على الشاشات'), 'coach row in settings');
  await ev(() => act(() => { delete S.x.set.start; }));
  // التعليمات: كل الأقسام تُفتح بلا خطأ
  await ev(() => go('more', 'help')); await W(); const ht = await txt(); ok(ht.includes('التبويبات الخمسة') && ht.includes('«يهمّك الآن» في الرئيسية') && ht.includes('طابق الرصيد و«الخُردة»') && ht.includes('المستشار وقراراتي') && ht.includes('f1-v4.14'), 'help sections');
  // الإصدار
  eq(await ev(() => VER), 'f1-v4.14', 'version');
  for (const tb of ['home', 'ops', 'accts', 'nabd', 'insights']) { await ev(x => go(x), tb); await W(); ok(!(await txt()).includes('تعذّر عرض'), 'tab renders ' + tb); }
  eq((await ev(() => L.integrity(S))).length, 0, 'integrity'); ok(B.errs.length === 0, 'no page errors', B.errs.slice(0, 3));
} catch (e) { ok(false, 'CRASH ' + (e.stack || e)); }
await B.close(); process.exit(done() ? 1 : 0);
