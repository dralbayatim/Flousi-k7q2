'use strict'; // جزء من الواجهة (f1-v4.13): مقسوم حرفياً من app.js بالترتيب نفسه
// ===== الإطار: التنقل والإقلاع =====
const TABS = [['home', 'الرئيسية'], ['ops', 'العمليات'], ['accts', 'أموالي'], ['nabd', 'نبض السوق'], ['insights', 'تحليلاتي']]; // f1-v4.14: «الأصول» دُمج في «أموالي»
// المرحلة 2: لا «المزيد». صفحاته الفرعية تبقى بمساراتها نفسها (go('more', x)) لكنها تتبع زراً واضحاً في الشريط، ورجوعها إليه.
// الإعدادات والأدوات تُفتح من زر ⚙ أعلى الرئيسية.
const PARENT = { badges: 'insights', wish: 'insights', debts: 'accts', jams: 'accts', recurring: 'accts', goals: 'accts', reports: 'insights' }; // ما لم يُذكر يتبع الرئيسية (⚙)
const parOf = sub => sub === 'goals' && !fOn('assets') ? 'accts' : PARENT[sub]; // الأهداف تتبع «أموالي» إن أُوقفت «الأصول»
const navTab = () => view.tab === 'more' ? (parOf(view.sub) || 'home') : view.tab === 'assets' ? 'accts' : view.tab; // f1-v4.14: صفحات «الأصول» الفرعية تتبع «أموالي»
const MONEY_LINKS = [['debts', 'الديون'], ['jams', 'الجمعيات'], ['recurring', 'المتكررات والراتب']];
// ===== معالج الأخطاء العام بعد الإقلاع =====
// render لا يرمي أبداً: إن تعطّلت شاشة يظهر بدلها تنبيه مع التبويبات، فلا تبقى الشاشة فارغة. لا يكتب في التخزين.
function render() { try { renderView(); } catch (e) { screenFail(e); } try { coachMaybe(); } catch (e) { /* الشروح لا تُسقط الشاشة */ } }
const errInfo = e => VER + ' — ' + view.tab + (view.sub ? '/' + view.sub : '') + ': ' + ((e && (e.message || String(e))) || '');
const copyInfo = t => async () => { try { await navigator.clipboard.writeText(t); toast('نُسخت التفاصيل'); } catch (x) { toast('تعذّر النسخ', true); } };
function screenFail(e) {
  tickTimers.forEach(clearInterval); tickTimers = []; const msg = (e && (e.message || String(e))) || '', home = view.tab === 'home' && !view.sub;
  $('#app').replaceChildren(h('h1', {}, 'تعذّر عرض هذه الشاشة'),
    sect('', h('p', {}, 'بياناتك المحفوظة لم تتأثر. انتقل إلى تبويب آخر أو أعد المحاولة.'), msg ? h('p', { class: 'mut', style: 'direction:ltr;text-align:left;word-break:break-word' }, msg) : null,
      home ? btn('أعد التشغيل', () => location.reload()) : btn('العودة إلى الرئيسية', () => go('home')), btn('انسخ تفاصيل الخطأ', copyInfo(errInfo(e)), 'alt')));
  try { $('#nav').replaceChildren(...TABS.map(([k, t]) => h('button', { class: k === navTab() ? 'on' : '', onclick: () => go(k) }, ico(k), h('span', {}, t)))); } catch (x) {}
}
// أخطاء لم يلتقطها أي جزء (زر أو مهمة غير متزامنة): رسالة قصيرة، والشاشة كما هي. تُفعَّل بعد نجاح الإقلاع فقط
let lastErr = { m: '', t: 0 };
function globalErr(e) { if (bootErr) return; const m = (e && (e.message || String(e))) || 'خطأ غير معروف';
  if (m === lastErr.m && Date.now() - lastErr.t < 3000) return; lastErr = { m, t: Date.now() }; toast('حدث خطأ غير متوقع: ' + m, true); }
let LASTTAB = null;
function renderView() {
  const app = $('#app'); app.replaceChildren(); const scr = SCREENS[view.tab] || SCREENS.home, bb = S.x.openDate && view.sub !== 'backup' ? backupBanner() : null; app.append(...[integBanner(), bb, scr(view.sub, view.p)].filter(Boolean)); // append(null) في المتصفح يكتب النص null
  if (S.x.openDate && !sessionDismiss && FB.status(S).level === 'block') { sessionDismiss = true; if (confirm('مضى أكثر من 14 يوماً على آخر نسخة احتياطية. فتح صفحة النسخ الآن؟')) { view = { tab: 'more', sub: 'backup', p: {} }; return render(); } }
  if (view.tab === 'home' && !view.sub) badgeCheck(); if (LASTTAB !== view.tab && !REDUCED()) { app.classList.remove('tabin'); void app.offsetWidth; app.classList.add('tabin'); } LASTTAB = view.tab;
  $('#nav').replaceChildren(...TABS.filter(([k]) => fOn(k) || k === navTab()).map(([k, t]) => h('button', { class: k === navTab() ? 'on' : '', onclick: () => go(k) }, ico(k), h('span', {}, t))));
  privApply();
}
// شاشة خطأ الإقلاع: تحل محل «…» عند أي فشل. للقراءة فقط: لا تكتب في التخزين ولا تحذف شيئاً، إلا إذا اخترتَ الاستعادة بنفسك
let bootErr = false;
// استعادة من شاشة الخطأ: الطريقة نفسها في صفحة النسخ (فتح وتحقق كامل ثم تأكيد ثم استبدال ذري مع لقطة 30 يوماً قابلة للتراجع). تظهر فقط إن كانت ملفات النسخ والتخزين محمّلة
function bootRestore() {
  const ready = (() => { try { return !!(FB && FStore && FLS && BE); } catch (e) { return false; } })(); if (!ready) return null;
  const key = h('input', { placeholder: 'مفتاح الاسترداد', autocomplete: 'off' }), file = h('input', { type: 'file', accept: '*/*', hidden: true });
  file.onchange = async () => { const f = file.files[0]; file.value = ''; if (!f) return;
    try { const bytes = new Uint8Array(await f.arrayBuffer()), { payload } = await FB.open(bytes, key.value), m = payload.manifest;
      if (!confirm(`استعادة ${m.txCount} عملية، صافي الثروة ${FL.fmt(m.nw)} د.ع؟ ستستبدل البيانات الحالية (وتُحفظ لقطة منها 30 يوماً يمكن التراجع إليها).`)) return;
      const cur = S || Object.assign(FE.create(), { x: {}, sec: {} }); await FB.restore(BE, cur, bytes, key.value); toast('تمت الاستعادة: ' + m.txCount + ' عملية. يُعاد التشغيل…'); setTimeout(() => location.reload(), 800); }
    catch (e) { toast(e.message === 'auth' ? 'المفتاح خاطئ أو الملف تالف' : e.message === 'format' ? 'ملف غير صالح' : 'تعذّرت الاستعادة: ' + (e.message || e), true); } };
  return sect('استعادة من نسخة احتياطية', h('p', { class: 'mut' }, 'إن تكرّر الخطأ بعد إعادة المحاولة: اكتب مفتاح الاسترداد ثم اختر آخر نسخة. تُحفظ البيانات الحالية لقطةً 30 يوماً، ويمكن التراجع من صفحة النسخ بعد أن يعمل التطبيق.'),
    key, h('label', { class: 'btn', onclick: () => file.click() }, 'اختر ملف النسخة'), file); }
function bootFail(why, e) {
  bootErr = true; tickTimers.forEach(clearInterval); tickTimers = [];
  const msg = e ? (e.message || String(e)) : '', info = VER + ' — ' + why + (msg ? ': ' + msg : '');
  const lock = $('#lock'); if (lock) lock.hidden = true; // لا بيانات معروضة هنا، فلا حاجة للقفل فوقها
  $('#app').replaceChildren(h('h1', {}, 'تعذّر تشغيل فلوسي'),
    sect('', h('p', {}, why), h('p', {}, 'بياناتك محفوظة على هذا الهاتف ولم يُحذف منها شيء.'), h('p', { class: 'mut' }, 'أغلق التطبيق وافتحه مع اتصال بالإنترنت. إن تكرّر الخطأ فانسخ التفاصيل وأرسلها.'),
      msg ? h('p', { class: 'mut', style: 'direction:ltr;text-align:left;word-break:break-word' }, msg) : null,
      btn('أعد المحاولة', () => location.reload()),
      btn('انسخ تفاصيل الخطأ', async () => { try { await navigator.clipboard.writeText(info + (integ.length ? '\n' + integ.join('\n') : '')); toast('نُسخت التفاصيل'); } catch (x) { toast('تعذّر النسخ', true); } }, 'alt')),
    integ.length ? sect('فحص السلامة وجد ' + integ.length + ' مشكلة', h('p', { class: 'mut' }, 'هذا سبب الخطأ على الأرجح. لا تحذف التطبيق، واحتفظ بآخر نسخة احتياطية خارجية، وأرسل التفاصيل.'), integ.map(m => h('div', { class: 'tx bad' }, m))) : null,
    bootRestore());
  $('#nav').replaceChildren();
}
(async () => {
  try { if (L && !L.__memo) { L.__memo = 1; ['monthReport', 'listTx', 'budget', 'status'].forEach(k => { L[k] = memo('L.' + k, L[k]); }); }
    if (typeof FD !== 'undefined') ['safe', 'forecast', 'monthSummary', 'wealthNotes', 'baseline', 'path', 'pathAdvice'].forEach(k => { FD[k] = memo('FD.' + k, FD[k]); });
    if (typeof FM !== 'undefined') ['months', 'alloc', 'savings'].forEach(k => { FM[k] = memo('FM.' + k, FM[k]); }); } catch (e) {}
  const has = f => { try { return f() != null; } catch (e) { return false; } }; // ملف فشل أثناء تحميله يرمي حتى مع typeof، فنلتقطه
  const miss = [[() => FLS, 'core.js'], [() => FE, 'engine.js'], [() => FL, 'logic.js'], [() => FStore, 'store.js'], [() => FB, 'backup.js']].filter(x => !has(x[0])).map(x => x[1]);
  if (miss.length) return bootFail('ملفات التطبيق ناقصة أو تالفة: ' + miss.join('، '));
  try { BE = FStore.idb(); S = await FStore.load(BE); } catch (e) { return bootFail('تعذّر فتح التخزين', e); }
  try {
    if (navigator.storage && navigator.storage.persist) { (navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false)).then(p => p || navigator.storage.persist())
      .then(r => { persist = !!r; if (!persist && !bootErr && view.tab === 'home' && !view.sub) render(); }).catch(() => { persist = 'na'; }); } else persist = 'na';
    if (lockOn()) showLock(); else unlocked = true;
    if (S.x.openDate) { INACT++; try { await FStore.run(BE, S, () => L.snapMonths(S)); } catch (e) {} INACT--; DGEN++; }
    try { integ = L.integrity(S); } catch (e) { integ = ['تعذّر تشغيل فحص السلامة: ' + (e.message || e)]; }
    privObs = new MutationObserver(() => privApply()); const st0 = S.x.set.start === 'assets' ? 'accts' : S.x.set.start; if (S.x.openDate && st0 && fOn(st0) && TABS.some(t => t[0] === st0)) view = { tab: st0, sub: null, p: {} }; // البند 19: شاشة البداية
    setTimeout(() => prebuild(), 2500); renderView(); // الإقلاع يبقى كما اعتُمد: خطأ الشاشة الأولى يذهب إلى bootFail
    addEventListener('error', ev => globalErr(ev.error || ev.message)); addEventListener('unhandledrejection', ev => globalErr(ev.reason));
  } catch (e) { bootFail('خطأ أثناء عرض الشاشة', e); }
})();
