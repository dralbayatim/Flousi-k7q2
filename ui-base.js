'use strict'; // جزء من الواجهة (f1-v4.13): مقسوم حرفياً من app.js بالترتيب نفسه
// ===== المرحلة 2: الشاشة الرئيسية، العمليات، الحسابات، الرصيد الافتتاحي =====
function acctList() {
  const A = L.accountsView(S), grp = [['السائل', a => a.kind === 'asset' && a.liquid], ['أصول أخرى', a => a.kind === 'asset' && !a.liquid], ['الالتزامات', a => a.kind === 'liab']];
  const V = {}; L.valuations(S).forEach(v => { if (v.last && v.book !== 0) V[v.id] = v.value; });
  const SK = fOn('stocks') ? FSK.view(S).filter(x => !x.hidden && x.qty > 0) : [];
  return grp.map(([t, f]) => { const xs = A.filter(a => f(a) && !S.acc[a.id].hidden && S.acc[a.id].type !== 'stock' && typeOn(S.acc[a.id].type)), sk = t === 'أصول أخرى' ? SK : [];
    return xs.length || sk.length ? sect(t, xs.map(a => row(a.name, a.cur === 'USD' ? L.fmtUsd(a.bal) + ' ≈ ' + money(a.iqd) : V[a.id] != null ? money(V[a.id]) + ' (مقدّر)' : money(a.bal))), sk.map(x => row(x.name + ' (أسهم)', money(x.mkt)))) : null; });
}
function opsForm(kind) {
  const D = { k: 'date', l: 'التاريخ', t: 'date', v: L.today(), req: true }, N = { k: 'note', l: 'ملاحظة (اختياري)', t: 'text' };
  const isUsd = id => id && S.acc[id] && S.acc[id].cur === 'USD', ok = m => () => toast(m);
  const parse = (id, s) => L.parseAmount(s, decOf(id)), rt = (id, v) => isUsd(id) ? L.parseAmount(v.rate, 2) : null;
  const A = accOpts(), first = A[0] ? A[0][0] : '';
  if (!A.length) return h('p', { class: 'mut' }, 'أنشئ حساباً أولاً من تبويب «الحسابات» (أو سجّل الرصيد الافتتاحي).');
  if (kind === 'income') return buildForm([D, { k: 'acct', l: 'يدخل إلى', t: 'select', opts: A }, { k: 'src', l: 'المصدر', t: 'select', opts: [['inc_salary', 'الراتب'], ['inc_other', 'دخل آخر']] },
    { k: 'amount', l: 'المبلغ', t: 'num', req: true }, rateDyn('date', v => isUsd(v.acct)), N],
    async v => { const amount = parse(v.acct, v.amount), id = await saveTx(() => L.income(S, { date: v.date, acct: v.acct, src: v.src, amount, r: rt(v.acct, v), note: v.note }), 'دخل ' + amtStr(amount, S.acc[v.acct].cur));
      if (id && v.src === 'inc_salary') pyfAfterSalary(amount, v.acct, v.date); }, 'سجّل الدخل');
  if (kind === 'expense') return quickExpense();
  if (kind === 'expense_full') return buildForm([D, { k: 'acct', l: 'يُصرف من', t: 'select', opts: A }, { k: 'amount', l: 'المبلغ', t: 'num', req: true },
    { k: 'cat', l: 'الفئة', t: 'select', opts: L.CATS.map(c => [c[0], c[1]]) }, rateDyn('date', v => isUsd(v.acct)), N],
    v => saveTx(() => L.expense(S, { date: v.date, acct: v.acct, cat: v.cat, amount: parse(v.acct, v.amount), r: rt(v.acct, v), note: v.note }), 'سُجّل المصروف'), 'تم');
  if (kind === 'transfer') { const diff = v => v.from && v.to && S.acc[v.from] && S.acc[v.to] && S.acc[v.from].cur !== S.acc[v.to].cur, bothUsd = v => isUsd(v.from) && isUsd(v.to);
    return buildForm([D, { k: 'from', l: 'من', t: 'select', opts: A }, { k: 'to', l: 'إلى', t: 'select', opts: A, v: A[1] ? A[1][0] : first },
      { k: 'amount', l: 'المبلغ المدفوع (بعملة حساب المصدر)', t: 'num', req: true }, { k: 'amount2', l: 'المبلغ المستلم فعلياً (بعملة حساب الوجهة)', t: 'num', req: true, show: diff },
      { ...rateDyn('date', bothUsd), l: 'سعر 100 دولار في ذلك اليوم' }, N],
      v => saveTx(() => L.transfer(S, { date: v.date, from: v.from, to: v.to, amount: parse(v.from, v.amount), amount2: diff(v) ? parse(v.to, v.amount2) : 0, r: bothUsd(v) ? L.parseAmount(v.rate, 2) : null, note: v.note }), 'سُجّل التحويل'), 'حوّل'); }
  const iq = A.filter(a => S.acc[a[0]].cur === 'IQD');
  return buildForm([D, { k: 'acct', l: 'الحساب (بالدينار)', t: 'select', opts: iq }, { k: 'counted', l: 'الرصيد الفعلي بعد العدّ', t: 'num', req: true }, N],
    v => saveTx(() => L.reconcile(S, { date: v.date, acct: v.acct, counted: L.parseAmount(v.counted, 0) }), 'سُجّلت المطابقة'), 'سوِّ الفرق');
}
function txList(n = 40) {
  const xs = L.listTx(S).slice(0, n);
  return sect('آخر العمليات', xs.length ? xs.map(t => h('div', { class: 'tx' + (t.voided || t.reversal ? ' void' : '') },
    h('div', { class: 'r' }, h('span', {}, h('span', { class: 'cat' }, catIco(t.label)), t.date + ' · ' + t.label), h('b', {}, money(t.amount) + (t.usd ? ' (' + L.fmtUsd(t.usd) + ')' : ''))),
    h('div', { class: 'mut' }, (t.from ? t.from + ' ← ' : '') + t.to + (t.note ? ' — ' + t.note : '') + (t.voided ? ' (معكوسة)' : '')),
    (!t.voided && !t.reversal && t.label !== 'رصيد افتتاحي' && t.label !== 'تصحيح افتتاحي') ? btn('تراجع', () => { if (confirm('عكس هذه العملية؟ تبقى ظاهرة في السجل.')) act(() => { const o = S.tx.find(x => x.id === t.id); L.undo(S, t.id, L.today() > o.date ? L.today() : o.date); }, 'عُكست العملية'); }, 'mini') : null))
    : h('p', { class: 'mut' }, 'لا عمليات بعد.'));
}
SCREENS.ops = (sub, p) => { if (sub === 'edit') return editScreen(view.p.id); const kind = view.p.kind || 'expense';
  return h('div', {}, h('h1', {}, 'عملية جديدة'), seg([['expense', 'مصروف'], ['income', 'دخل'], ['transfer', 'تحويل'], ['reconcile', 'مطابقة نقد'], ['fx', 'تحويل العملات']], kind, k => go('ops', null, { kind: k })), kind === 'fx' ? fxForm() : opsForm(kind), txList2()); };

function openingWizard() {
  const rows = h('div', {}), lab = (t, c) => h('label', { class: 'f' }, h('span', {}, t), c), mk = (pre = {}) => { const r = h('div', { class: 'orow card' }); const f = {};
    f.name = h('input', { placeholder: 'مثال: نقد في الجيب', value: pre.name || '' }); f.type = h('select', {}, typeOpts().map(([k, v]) => h('option', { value: k }, v))); if (pre.type && typeOpts().some(o => o[0] === pre.type)) f.type.value = pre.type;
    f.cur = h('select', {}, [['IQD', 'دينار عراقي'], ['USD', 'دولار']].map(([k, t]) => h('option', { value: k }, t))); if (pre.cur) f.cur.value = pre.cur; f.amount = h('input', { placeholder: 'اتركه فارغاً إن لم يوجد', inputmode: 'decimal' });
    f.rate = h('input', { placeholder: 'مثال: 150000', inputmode: 'decimal' }); const rl = lab('متوسط سعر شرائه: دينار لكل 100 دولار (اختياري)', f.rate);
    const sync = () => { rl.hidden = f.cur.value !== 'USD'; }; f.cur.onchange = sync; sync(); r._f = f;
    r.append(lab('اسم الحساب', f.name), lab('النوع', f.type), lab('العملة', f.cur), lab('كم فيه الآن؟', f.amount), rl, btn('حذف هذا السطر', () => { if (confirm('حذف هذا السطر من النموذج؟\nلم يُحفظ بعد، فلن يُحذف أي حساب أو بيانات محفوظة.')) r.remove(); }, 'mini alt')); rows.append(r); };
  if (fOn('t_asset_cash')) mk({ name: 'نقد', type: 'asset_cash' }); if (fOn('t_visa')) mk({ name: 'فيزا', type: 'visa' }); if (fOn('t_asset_cash')) mk({ name: 'دولار', type: 'asset_cash', cur: 'USD' }); if (!rows.children.length) mk();
  const date = h('input', { type: 'date', value: L.today(), max: L.today() }), rate = h('input', { placeholder: 'مثال: 150000', inputmode: 'decimal' });
  return h('div', {}, sect('الخطوة 1: ما تملكه اليوم', h('p', { class: 'mut' }, 'اكتب كم عندك الآن في كل حساب. لا يُحسب دخلاً. اترك الحساب الذي لا تملكه فارغاً. الذهب والفضة والراتب يأتيان بعد هذه الخطوة.'),
      lab('تاريخ البدء', date)), rows, btn('+ إضافة حساب آخر (عقار، التزام...)', () => mk(), 'alt'),
    sect('', lab('سعر الصرف اليوم: كم دينار يساوي 100 دولار (مطلوب إن أدخلت دولاراً)', rate), nabdRateBtn(v => { rate.value = String(v); toast('وُضع السعر في الخانة، ويُحفظ مع «سجّل وابدأ»'); }, 'ضعه في الخانة'),
    btn('سجّل وابدأ', () => { try {
      const data = [...rows.children].map(r => { const f = r._f, cur = f.cur.value, kind = L.TYPES[f.type.value][1]; if (!f.amount.value.trim()) return null;
        if (cur === 'USD' && kind === 'liab') throw new Error('الالتزام بالدولار غير مدعوم'); return { name: f.name.value, type: f.type.value, cur, amount: L.parseAmount(f.amount.value, cur === 'USD' ? 2 : 0), r: cur === 'USD' ? (f.rate.value.trim() || rate.value.trim() ? L.parseAmount(f.rate.value || rate.value, 2) : (() => { throw new Error('اكتب سعر الصرف اليوم (كم دينار يساوي 100 دولار): مطلوب لحساب «' + f.name.value + '»'); })()) : null }; }).filter(Boolean);
      if (!data.length) throw new Error('أدخل رصيد حساب واحد على الأقل'); const hasUsd = data.some(d => d.cur === 'USD');
      act(() => { if (hasUsd) L.setRate(S, date.value, L.parseAmount(rate.value, 2)); L.opening(S, date.value, data); }, 'سُجّل. الآن أضف الراتب والذهب من الصفحة الرئيسية').then(() => { if (S.x.openDate) go('home'); /* عند الفشل يبقى المعالج بمدخلاته */ }); } catch (e) { toast(e.message, true); } })));
}
SCREENS.accts = (sub) => {
  if (sub === 'open' || !S.x.openDate && sub !== 'list') return h('div', {}, h('h1', {}, 'الحسابات'), openingWizard());
  const f = buildForm([{ k: 'name', l: 'اسم الحساب', t: 'text', req: true }, { k: 'type', l: 'النوع', t: 'select', opts: typeOpts() }, { k: 'cur', l: 'العملة', t: 'select', opts: [['IQD', 'دينار'], ['USD', 'دولار']] }],
    v => act(() => L.addAccount(S, v), 'أُضيف الحساب'), 'أضف حساباً');
  return h('div', {}, h('h1', {}, 'أموالي'), sect('', moneyLinks().map(([k, t]) => h('button', { class: 'lnk', onclick: () => go('more', k) }, t))), h('h2', { class: 'sub' }, 'الحسابات'), acctList(), sect('حساب جديد', h('p', { class: 'mut' }, 'يبدأ الحساب بصفر. للمال الموجود سلفاً استعمل الرصيد الافتتاحي عند البدء، أو سجّل تحويلاً/دخلاً.'), f), openingFixBlock(), manageBlock());
};
// تعديل اسم حساب وإخفاء حساب غير مستعمل (رصيده صفر). الإخفاء ليس حذفاً: القيود باقية، ويمكن الإظهار متى شئت
function manageBlock() { const A = accOpts(), zero = accOpts(a => E.bal(S, a.id) === 0), H = Object.values(S.acc).filter(a => a.type && a.hidden);
  if (!A.length && !H.length) return null;
  return sect('', fold('إدارة الحسابات (تعديل الاسم وإخفاء حساب)', false,
    A.length ? buildForm([{ k: 'acct', l: 'الحساب', t: 'select', opts: A }, { k: 'name', l: 'الاسم الجديد', t: 'text', req: true, dyn: (c, v) => { c.placeholder = 'الاسم الحالي: ' + ((S.acc[v.acct] || {}).name || ''); } }],
      v => act(() => L.renameAccount(S, v.acct, v.name), 'غُيّر الاسم'), 'غيّر الاسم') : null,
    h('p', { class: 'mut' }, 'الإخفاء لحساب لم تعد تستعمله ورصيده صفر: يختفي من القوائم والنماذج، وتبقى عملياته كلها في السجل والتقارير.'),
    zero.length ? buildForm([{ k: 'acct', l: 'حساب رصيده صفر', t: 'select', opts: zero }], v => act(() => L.hideAccount(S, v.acct, true), 'أُخفي الحساب'), 'أخفِ الحساب') : h('p', { class: 'mut' }, 'لا يوجد حساب رصيده صفر.'),
    H.length ? h('div', {}, h('h2', {}, 'حسابات مخفية'), H.map(a => h('div', { class: 'r' }, h('span', {}, a.name), btn('أظهر', () => act(() => L.hideAccount(S, a.id, false), 'أُظهر الحساب'), 'mini alt')))) : null)); }
// تصحيح الرصيد الافتتاحي: الرصيد الصحيح يوم البدء، والفرق يُسجَّل بتاريخ البدء مقابل «الرصيد الافتتاحي» (لا دخل ولا مصروف). لا «تراجع» له، يُصحَّح بتصحيح آخر
function openingFixBlock() { if (!S.x.openDate) return null; const A = accOpts(); if (!A.length) return null;
  const cur = id => { const a = S.acc[id]; return a ? amtStr(Math.abs(L.openingAmt(S, id)), a.cur) : ''; };
  return sect('', fold('تصحيح الرصيد الافتتاحي (عند خطأ في البداية)', false, h('p', { class: 'mut' }, 'إن أخطأت في رصيد حساب يوم البدء (' + S.x.openDate + ')، أو نسيت حساباً كان عندك قبل البدء: اختره واكتب رصيده الصحيح يومها. يُسجَّل الفرق بتاريخ البدء، فلا يُحسب دخلاً ولا مصروفاً. إن كانت أشهر قد أُغلقت فستظهر «تغيّرت بعد إغلاقها» في التقارير لتعتمدها.'),
    buildForm([{ k: 'acct', l: 'الحساب', t: 'select', opts: A }, { k: 'amount', l: 'رصيده الصحيح يوم البدء (بعملة الحساب)', t: 'num', req: true, dyn: (c, v) => { c.placeholder = 'المسجّل الآن: ' + cur(v.acct); } },
      { k: 'rate', l: 'متوسط سعر شراء الدولار الإضافي: دينار لكل 100 دولار', t: 'num', show: v => !!S.acc[v.acct] && S.acc[v.acct].cur === 'USD', dyn: (c, v) => { if (!c.dataset.touched) { const r = S.acc[v.acct] && L.openingRate(S, v.acct); c.value = r ? String(r / 100) : ''; } } }],
      v => { const a = S.acc[v.acct], amt = L.parseAmount(v.amount, decOf(v.acct)); if (!confirm(`تصحيح الرصيد الافتتاحي لـ «${a.name}» من ${cur(v.acct)} إلى ${amtStr(amt, a.cur)}؟`)) return;
        return act(() => L.openingFix(S, { acct: v.acct, amount: amt, r: a.cur === 'USD' && v.rate.trim() ? L.parseAmount(v.rate, 2) : null }), 'صُحّح الرصيد الافتتاحي'); }, 'صحّح')));
};
// صافي الثروة بالدولار بآخر سعر صرف مسجّل (عرض فقط، لا يُخزَّن). دينار × 1,000,000 ÷ السعر = سنت
const nwUsd = n => S.x.rates.length ? L.fmtUsd(Number(E.rd(BigInt(n) * 1000000n, BigInt(S.rate)))) : '— (أدخل سعر الصرف)';
function nwBlock() {
  const p = L.panel(S), mask = v => v, d = v => v == null ? '—' : (v > 0 ? '+' : '') + L.fmt(v) + ' د.ع';
  const ex = exclInfo(), shown = p.nw - ex.amt; // الاستبعاد (البند 11) عرض فقط: القيود والتقارير والجسر بالأرقام الكاملة
  return sect(ti('صافي الثروة'), h('div', { class: 'big', onclick: () => privHidden() ? privReveal() : null }, mask(money(shown))), privOn() ? h('p', { class: 'mut' }, 'الأرقام مخفية: اضغط 👁 أو الرقم لإظهارها 5 ثوانٍ') : null,
    ex.names.length ? h('p', { class: 'mut', 'data-excl': '1' }, 'مستبعد من هذا الرقم: ' + ex.names.join('، ') + ' (من ⚙ ← الأقسام والميزات)') : null, ex.names.length ? row('صافي الثروة الكامل', mask(money(p.nw))) : null,
    row('بالدولار', mask(nwUsd(shown))), row('الأصول', mask(money(p.cur.assets))), row('الالتزامات', mask(money(p.cur.liab))), row('التغير هذا الشهر', mask(d(p.dMonth))), row('التغير منذ بداية السنة', mask(d(p.dYear))),
    S.x.set.valuation === 'cost' ? null : row(ti('أرباح/خسائر غير محققة', 'غير محقق'), mask(d(p.U))));
}
// ===== المرحلة 3: القفل، النسخ الاحتياطي والاستعادة، التصدير، شريط التذكير =====
const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u))), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
let hiddenAt = 0, unlocked = false;
async function shareFile(file, ok) { // مشاركة عبر ورقة iOS، وإن لم تتوفر فتنزيل. يعيد true عند الحفظ/المشاركة، false عند الإلغاء
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return 'share'; } throw 0; }
  catch (e) { if (e && e.name === 'AbortError') return false; const a = h('a', { href: URL.createObjectURL(file), download: file.name }); a.click(); return 'download'; } }
// ---- القفل ----
function lockCover(on) { const l = $('#lock'); l.hidden = !on; if (on) l.replaceChildren(h('h1', {}, 'فلوسي')); }
function showLock() {
  const l = $('#lock'), pin = h('input', { type: 'password', inputmode: 'numeric', maxlength: 6, placeholder: '••••••', autocomplete: 'off' }), msg = h('p', { class: 'bad' }, '');
  const done = () => { unlocked = true; l.hidden = true; render(); };
  const tryPin = async () => { try { if (await FB.verifyPin(pin.value, S.sec.pin)) return done(); msg.textContent = 'رمز خاطئ'; pin.value = ''; } catch (e) { msg.textContent = 'رمز غير صالح'; } };
  pin.oninput = () => { if (pin.value.length === 6) tryPin(); };
  l.hidden = false; l.replaceChildren(h('h1', {}, 'فلوسي'), h('p', { class: 'mut' }, 'أدخل الرمز'), pin, msg, btn('فتح', tryPin),
    S.sec.passkey ? btn('بصمة الوجه', async () => { try { await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rpId: location.hostname, allowCredentials: [{ type: 'public-key', id: unb64(S.sec.passkey) }], userVerification: 'required', timeout: 60000 } }); done(); } catch (e) { msg.textContent = 'تعذّرت البصمة، استخدم الرمز'; } }, 'alt') : null);
  setTimeout(() => pin.focus && pin.focus(), 50);
}
const lockOn = () => !!(S.sec.pin && S.x.set.lockOn);
document.addEventListener('visibilitychange', () => { if (!S || bootErr) return;
  if (document.hidden) { hiddenAt = Date.now(); if (lockOn()) lockCover(true); }
  else if (lockOn()) { if (Date.now() - hiddenAt >= S.x.set.lockMin * 60000) { unlocked = false; showLock(); } else lockCover(false); } });
// ---- شريط التذكير ----
const strictDue = b => persist === false && b.level === 'ok' && b.days != null && (b.days > 3 || b.since >= 5); // التخزين غير مثبّت: تذكير بعد 3 أيام أو 5 عمليات بدل 7 و10
function backupBanner() { const b = FB.status(S); if (b.level === 'ok' && !strictDue(b)) return null;
  const t = (b.days == null ? 'لا توجد نسخة احتياطية خارجية بعد' : `آخر نسخة قبل ${b.days} يوماً و${b.since} عملية جديدة`) + (persist === false ? ' (تخزين الهاتف غير مثبّت)' : '');
  return h('div', { class: 'ticker alert', onclick: () => go('more', 'backup') }, '⚠ ' + t + ' — اضغط لأخذ نسخة'); }
// ---- الصفحات الفرعية (تُفتح من أزرار الشريط أو من ⚙) ----
// إلغاء القفل بحقل رمز مخفي بدل prompt() الذي يُظهر الأرقام أثناء كتابتها. التحقق والحفظ كما كانا حرفياً
function offForm(st) {
  const pin = h('input', { type: 'password', inputmode: 'numeric', maxlength: 6, placeholder: '••••••', autocomplete: 'off', 'aria-label': 'الرمز الحالي' });
  let busy = false; // يمنع الإرسال المزدوج بضغطتين سريعتين
  const ok = async () => { if (busy) return; busy = true; try { const p = pin.value;
    if (p && await FB.verifyPin(p, S.sec.pin)) { S.sec.pin = null; S.sec.passkey = null; st.lockOn = false; await FStore.saveSec(BE, S); await act(() => {}, 'أُلغي القفل'); go('more', 'lock'); }
    else { toast('رمز خاطئ', true); pin.value = ''; pin.focus(); } } finally { busy = false; } };
  pin.onkeydown = e => { if (e.key === 'Enter') ok(); };
  setTimeout(() => pin.focus && pin.focus(), 50);
  return h('div', {}, h('label', { class: 'f' }, h('span', {}, 'أدخل الرمز الحالي لإلغاء القفل'), pin), btn('أكّد إلغاء القفل', ok), btn('تراجع', () => go('more', 'lock'), 'alt'));
}
MORE.push(['lock', 'القفل', () => { const st = S.x.set, set = S.sec.pin;
  const pf = buildForm([{ k: 'a', l: 'رمز جديد (6 أرقام)', t: 'num', req: true }, { k: 'b', l: 'أعد كتابته', t: 'num', req: true }], async v => { const a = FB.checkPinFormat(v.a); if (a !== FB.checkPinFormat(v.b)) throw new Error('الرمزان مختلفان');
    S.sec.pin = await FB.hashPin(a); st.lockOn = true; await FStore.saveSec(BE, S); await act(() => {}, 'فُعّل القفل'); go('more', 'lock'); }, set ? 'غيّر الرمز' : 'فعّل القفل');
  return h('div', {}, sect('رمز التطبيق', h('p', { class: 'mut' }, set ? 'القفل مفعّل. يُقفل التطبيق عند مغادرته بعد المهلة، وتُحجب الشاشة فوراً.' : 'لا يوجد قفل. هذا قفل للواجهة، والحاجز الفعلي هو رمز هاتفك فاجعله قوياً.'), pf),
    set ? sect('المهلة', seg([['0', 'فوراً'], ['1', 'دقيقة'], ['5', '5 دقائق']], String(st.lockMin), k => act(() => { st.lockMin = +k; }, 'تم')),
      view.p.off ? offForm(st) : btn('إلغاء القفل', () => go('more', 'lock', { off: 1 }), 'alt')) : null,
    set ? sect('بصمة الوجه (تجريبية)', h('p', { class: 'mut' }, 'اختيارية. الرمز يعمل دائماً بديلاً. جرّبها بإغلاق التطبيق وفتحه قبل الاعتماد عليها.'),
      btn(S.sec.passkey ? 'ألغِ البصمة' : 'فعّل البصمة', async () => { try { if (S.sec.passkey) { S.sec.passkey = null; } else { const r = n => crypto.getRandomValues(new Uint8Array(n)), c = await navigator.credentials.create({ publicKey: { challenge: r(32), rp: { name: 'Flousi', id: location.hostname }, user: { id: r(16), name: 'flousi', displayName: 'Flousi' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000 } }); S.sec.passkey = b64(c.rawId); }
        await FStore.saveSec(BE, S); toast('تم'); go('more', 'lock'); } catch (e) { toast('تعذّر: ' + e.name, true); } }, 'alt')) : null); }]);
let pending = null, pendSig = null, building = null;
// نسخة بضغطة واحدة (f1-v3): تُجهَّز مشفّرة في الخلفية باسم ثابت، فيفتح زر الحفظ ورقة المشاركة فوراً (iOS يرفض المشاركة إن سبقها انتظار طويل)
const BAK_NAME = 'flousi-backup.flousibak';
const bakSig = () => { const x = { ...S.x }; delete x.backup; const j = JSON.stringify([S.tx.length, S.goals.length, S.post.length, x]); let h2 = 7; for (let i = 0; i < j.length; i++) h2 = (h2 * 31 + j.charCodeAt(i)) >>> 0; return h2 + ':' + j.length; };
function prebuild(rerender) { if (!S || !S.sec.key || !S.x.openDate) return; const sig = bakSig(); if (pending && pendSig === sig) return; if (building) return;
  building = FB.build(S, S.sec.key).then(bytes => { pending = new File([bytes], BAK_NAME, { type: 'application/octet-stream' }); pendSig = sig; }).catch(() => { pending = null; }).finally(() => { building = null; if (rerender && view.tab === 'more' && view.sub === 'backup') render(); }); }
async function oneTapBackup() { if (!pending || pendSig !== bakSig()) { toast('النسخة تُجهَّز… اضغط مرة أخرى بعد ثانية', true); prebuild(true); return; }
  const how = await shareFile(pending); if (how) await act(() => { S.x.backup = { t: Date.now(), tx: S.tx.length, how }; }, 'سُجّلت النسخة: ' + BAK_NAME); }
// قسم الاستعادة ظاهر دائماً (f1-v3.1)، حتى على جهاز جديد فارغ لم يُنشأ عليه مفتاح بعد: اختر الملف واكتب مفتاحك القديم
function restoreSect() {
  const key = h('input', { placeholder: 'مفتاح الاسترداد', autocomplete: 'off' }), file = h('input', { type: 'file', accept: '*/*', hidden: true }), sum = h('div', {});
  // f1-v4: فحص كامل للنسخة (التشفير والبصمة والأرصدة) ثم ملخص محتوياتها، ولا تبدأ الاستعادة إلا بعد ضغطك «استعد»؛ والنسخة الأقدم من بياناتك تحتاج تأكيداً إضافياً
  file.onchange = async () => { const f = file.files[0]; file.value = ''; if (!f) return; sum.replaceChildren(h('p', { class: 'mut' }, 'جارٍ فحص النسخة…'));
    try { const bytes = new Uint8Array(await f.arrayBuffer()), kv = key.value, { payload } = await FB.open(bytes, kv), m = payload.manifest, d = payload.dump || {};
      const lastB = (d.tx || []).filter(t => t.type !== 'opening').map(t => t.date).sort().pop() || '—', lastC = S.tx.filter(t => t.type !== 'opening').map(t => t.date).sort().pop() || null;
      const older = S.tx.length > 0 && (m.txCount < S.tx.length || (lastC && lastB !== '—' && lastB < lastC));
      const n = k => Array.isArray(d[k]) ? d[k].length : d[k] && typeof d[k] === 'object' ? Object.keys(d[k]).length : 0, x = d.x || {};
      sum.replaceChildren(h('div', { class: 'card' + (older ? ' warnb' : '') }, h('b', {}, '✓ النسخة سليمة — ملخص محتوياتها'),
        row('تاريخ إنشاء النسخة', payload.created ? new Date(payload.created).toLocaleString('en-GB') : '—'), row('عدد العمليات', String(m.txCount)), row('آخر عملية فيها', lastB), row('الحسابات', String(m.accounts)),
        row('الأهداف', String((x.goalsDef || []).length)), row('قطع الذهب والفضة', String(n('pieces'))), row('صافي الثروة فيها', money(m.nw)),
        h('div', { class: 'r' }, h('span', {}, 'بياناتك الحالية'), h('b', {}, S.tx.length ? S.tx.length + ' عملية' + (lastC ? '، آخرها ' + lastC : '') : 'فارغة')),
        older ? h('p', { class: 'bad' }, '⚠ هذه النسخة أقدم من بياناتك الحالية: ستفقد ما سجّلته بعدها. تأكد أنها النسخة الصحيحة.') : null,
        h('p', { class: 'mut' }, 'الاستعادة تستبدل بياناتك الحالية، وتُحفظ لقطة منها 30 يوماً يمكن التراجع إليها.'),
        btn('استعد هذه النسخة', async () => { if (older && !confirm('النسخة أقدم من بياناتك الحالية (' + m.txCount + ' عملية مقابل ' + S.tx.length + '). هل أنت متأكد من استبدال بياناتك بها؟')) return;
          try { await FB.restore(BE, S, bytes, kv); S = await FStore.load(BE); DGEN++; integ = L.integrity(S); toast('تمت الاستعادة: ' + m.txCount + ' عملية'); go('home'); } catch (e) { toast('تعذّرت الاستعادة: ' + (e.message || e), true); } }, 'prim'),
        btn('إلغاء', () => { sum.replaceChildren(); toast('لم يتغير شيء'); }, 'alt'))); }
    catch (e) { sum.replaceChildren(); toast(e.message === 'auth' ? 'المفتاح خاطئ أو الملف تالف' : e.message === 'format' ? 'ملف غير صالح' : e.message, true); } };
  return sect('استعادة نسخة', h('p', { class: 'mut' }, 'اكتب مفتاح الاسترداد الخاص بالنسخة (القديم) ثم اختر الملف. بعد الاستعادة يصبح هذا المفتاح مفتاحك على هذا الجهاز.'), key, h('label', { class: 'btn', onclick: () => file.click() }, 'اختر ملف النسخة'), file,
    sum, btn('التراجع عن آخر استعادة', async () => { try { await FB.undoRestore(BE, S); S = await FStore.load(BE); DGEN++; integ = L.integrity(S); toast('تم الرجوع'); go('home'); } catch (e) { toast(e.message, true); } }, 'alt mini')); }
MORE.push(['backup', 'النسخ الاحتياطي والتصدير', () => { const b = FB.status(S), box = h('div', {});
  const stat = sect('الحالة', row('آخر نسخة', S.x.backup ? new Date(S.x.backup.t).toLocaleDateString('en-GB') + ' (' + b.days + ' يوماً)' : 'لا توجد'), row('عمليات بعد آخر نسخة', String(b.since)), row('مفتاح الاسترداد', S.sec.key ? 'مُعدّ' : 'غير مُعدّ'), row('التخزين الدائم', persist === true ? 'مثبّت ✓' : persist === false ? '⚠ غير مثبّت' : persist === 'na' ? 'غير مدعوم في هذا المتصفح' : '…', persist === false ? 'bad' : ''),
    persist === false ? h('p', { class: 'bad' }, 'رفض النظام تثبيت التخزين: قد يحذف بيانات التطبيق إن امتلأت ذاكرة الهاتف. افتح التطبيق من أيقونة الشاشة الرئيسية، وأبقِ مساحة فارغة، وخذ نسخة احتياطية بعد كل جلسة إدخال. التذكير صار بعد 3 أيام أو 5 عمليات.') : null,
    h('p', { class: 'mut' }, 'احفظ النسخة في iCloud Drive (ملفات ثم iCloud Drive) لا على الهاتف وحده. لا نسخ تلقائي خارج الهاتف في تطبيق الويب.'));
  if (!S.sec.key) { const key = FLS.fmtKey(FLS.newKey()); box.append(stat, sect('مفتاح الاسترداد', h('p', {}, 'اكتب هذا المفتاح على ورقة واحفظها في مكانين. بدونه لا تُفتح أي نسخة، ولن يظهر مرة ثانية.'), h('div', { class: 'big', style: 'direction:ltr;font-size:1.15rem;letter-spacing:.04em' }, key), btn('📋 نسخ المفتاح', () => copyText(key, 'نُسخ المفتاح ✓ اكتبه أيضاً على ورقة'), 'alt mini'),
      buildForm([{ k: 'k', l: 'أعد كتابة المفتاح للتأكيد', t: 'text', req: true }], async v => { if (FLS.normKey(v.k) !== FLS.normKey(key)) throw new Error('المفتاح غير مطابق'); S.sec.key = FLS.normKey(key); await FStore.saveSec(BE, S); toast('حُفظ المفتاح'); go('more', 'backup'); }, 'أكّدتُ وكتبتُه')));
    if (S.x.openDate) box.append(restoreSect()); else box.insertBefore(restoreSect(), box.children[1]); return box; }
  prebuild(true); const ready = pending && pendSig === bakSig();
  const prep = btn(ready ? '💾 احفظ نسخة الآن' : '… جارٍ تجهيز النسخة', oneTapBackup, ready ? 'prim' : 'alt');
  const save = h('p', { class: 'mut' }, 'ضغطة واحدة: تفتح ورقة المشاركة بملف «' + BAK_NAME + '». اختر «حفظ في الملفات» ثم iCloud Drive، واستبدل الملف القديم إن سُئلت. (النسخ إلى تليجرام يُضاف لاحقاً.)');
  const expo = btn('تصدير CSV (ملف مضغوط)', async () => { const z = new File([FB.exportZip(S)], 'flousi-export-' + L.today() + '.zip', { type: 'application/zip' }); await shareFile(z); }, 'alt');
  box.append(stat, sect('نسخة احتياطية', prep, save, expo), restoreSect());
  return box; }]);
// ---- شاشة «البصمة» (الوثيقة 3.0، القسم 8.6): للقراءة فقط. تُعرض قبل النسخ وبعد الاستعادة، والشرط مطابقة حرفية ----
function fpLines() { // نص حتمي لا يعتمد على تاريخ اليوم ولا على الإعدادات: يتطابق ما دامت البيانات نفسها
  const sn = E.snap(S), out = ['عدد العمليات: ' + S.tx.length, 'صافي الثروة (السوقي): ' + money(sn.nw), 'صافي الثروة (بالتكلفة): ' + money(sn.nwc), 'المخصص للأهداف: ' + money(sn.liq - sn.avail), '— الحسابات'];
  L.accountsView(S).sort((a, b) => a.id < b.id ? -1 : 1).forEach(a => out.push(a.name + ': ' + amtStr(a.bal, a.cur)));
  const D = L.debts(S); if (D.length) { out.push('— الديون'); D.forEach(d => out.push((d.dir === 'lent' ? 'لي عند ' : 'عليّ لـ ') + d.person + ': ' + money(d.remaining))); }
  const J = S.x.jams; if (J.length) { out.push('— الجمعيات'); J.map(j => L.jamState(S, j)).forEach(j => out.push(j.name + ': مدفوع ' + j.paid + ' من ' + j.N + (j.received ? '، مقبوضة' : ''))); }
  const P = L.pieces(S); if (P.length) { out.push('— الذهب والفضة'); P.sort((a, b) => a.id < b.id ? -1 : 1).forEach(p => out.push(pieceName(p) + ': ' + (p.held ? 'محتفَظ بها، تكلفتها ' + money(p.cost) : 'مبيعة'))); }
  const G = S.x.goalsDef; if (G.length) { out.push('— الأهداف'); const GV = L.goalView(S); G.map(d => GV.find(x => x.id === d.id)).forEach(g => out.push(g.name + ': ' + gm(g, g.allocated) + ' من ' + gm(g, g.target) + (g.iqd ? '، محجوز ' + money(g.iqd.reserved) : ''))); }
  const RC = S.x.recur; if (RC.length) { out.push('— المتكررات'); RC.forEach(r => out.push(r.name + (r.salary ? ' (راتب)' : '') + ': ' + (r.kind === 'income' ? 'دخل ' : 'مصروف ') + money(r.amount) + '، يوم ' + r.day + '، تذكير قبل ' + r.remind
    + '، ' + ((S.acc[r.acct] || {}).name || r.acct) + (r.cat ? '، ' + ((S.acc[r.cat] || {}).name || r.cat) : '') + '، ' + (r.active ? 'فعّال' : 'موقوف') + (r.last ? '، آخر تسجيل ' + r.last : ''))); }
  const SKL = FSK.view(S); if (SKL.length) { out.push('— الأسهم'); SKL.forEach(x => out.push(x.name + ': ' + qTxt(x.qty) + ' سهم، تكلفتها ' + money(x.cost) + (x.price != null ? '، آخر سعر ' + pTxt(x.price, x.cur) + ' (' + x.priceDate + ')' : ''))); }
  const VL = (S.x.vals || []).filter(v => (S.acc[v.a] || {}).type !== 'stock'); if (VL.length) { out.push('— التقييم اليدوي'); VL.forEach(v => out.push(((S.acc[v.a] || {}).name || v.a) + ' ' + v.d + ': ' + money(v.v))); }
  out.push('— حدود التنبيه'); Object.keys(L.GROUPS).forEach(g => out.push(g + ': ' + S.x.limits[g] + '%'));
  return out; }
const fpCode = async t => { const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))); return [...b.slice(0, 6)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase().match(/.{4}/g).join('-'); };
MORE.push(['print', 'بصمة البيانات', () => { const lines = fpLines(), txt = lines.join('\n'), code = h('div', { class: 'big', 'data-fp': '1' }, '…');
  fpCode(txt).then(c => { code.textContent = c; }).catch(() => { code.textContent = '—'; });
  return h('div', {}, sect('رمز البصمة', h('p', { class: 'mut' }, 'خذ لقطة لهذه الشاشة قبل النسخ الاحتياطي، ثم قارنها بعد الاستعادة: يجب أن يتطابق الرمز وكل رقم. للقراءة فقط، لا تغيّر شيئاً.'), code,
      btn('انسخ البصمة كاملة', async () => { try { await navigator.clipboard.writeText(txt + '\nالرمز: ' + code.textContent); toast('نُسخت البصمة'); } catch (e) { toast('تعذّر النسخ', true); } }, 'alt')),
    sect('التفاصيل', lines.map(l => l.startsWith('— ') ? h('h2', {}, l.slice(2)) : h('div', { class: 'tx' }, l)))); }]);
// ---- فحص السلامة (4.4): يُشغَّل عند كل فتح وبعد كل استعادة، ويمكن تشغيله يدوياً. للقراءة فقط، لا يُصلح شيئاً بصمت ----
function integBanner() { return integ.length && view.sub !== 'integrity' ? h('div', { class: 'ticker alert', onclick: () => go('more', 'integrity') }, '⚠ فحص السلامة وجد ' + integ.length + ' مشكلة في البيانات — اضغط للتفاصيل') : null; }
MORE.push(['integrity', 'فحص السلامة', () => h('div', {},
  sect('النتيجة', integ.length ? h('p', { class: 'badc' }, '✗ وُجدت ' + integ.length + ' مشكلة. لا تُدخل عمليات جديدة، وخذ نسخة احتياطية، وأرسل التفاصيل.') : h('p', { class: 'okc' }, '✓ كل الفحوصات سليمة'),
    h('p', { class: 'mut' }, 'يتحقق من: توازن كل عملية، وأن كل قيد يشير إلى عملية وحساب موجودين، والهوية الدفترية، ومعادلة صافي الثروة لكل شهر. يُشغَّل تلقائياً عند كل فتح.'),
    btn('أعد الفحص الآن', () => { integ = L.integrity(S); toast(integ.length ? 'وُجدت مشاكل' : 'كل الفحوصات سليمة', !!integ.length); render(); }, 'alt'),
    integ.length ? btn('انسخ التفاصيل', async () => { try { await navigator.clipboard.writeText(VER + '\n' + integ.join('\n')); toast('نُسخت'); } catch (e) { toast('تعذّر النسخ', true); } }, 'alt') : null),
  integ.length ? sect('التفاصيل', integ.map(m => h('div', { class: 'tx bad' }, m))) : null)]);
// ===== المرحلة 4: تبويب الأصول (الأسعار، الدولار، الذهب والفضة) =====
const gramsTxt = mg => Math.trunc(mg / 1000) + '.' + String(mg % 1000).padStart(3, '0') + ' غ';
const fineTxt = p => p.metal === 'G' ? 'عيار ' + Math.round(p.fine * 24 / 100) / 100 : 'نقاوة ' + p.fine / 10;
const pieceName = p => (p.label || 'قطعة') + ' · ' + (p.metal === 'G' ? 'ذهب' : 'فضة') + ' ' + fineTxt(p) + ' · ' + gramsTxt(p.mg) + (p.form === 'jewelry' ? ' · مصوغات' : p.form === 'bullion' ? ' · سبيكة/عملة' : '');
const priceDyn = (metalOf, dateK = 'date') => ({ k: 'price', l: 'سعر أونصة المعدن بالدولار في ذلك اليوم', t: 'num', req: true, dyn: (c, v) => { const m = metalOf(v);
  if (!c.dataset.touched && E.okDate(v[dateK]) && S.x.prices.some(x => x[m] != null)) c.value = String(L.priceAt(S, v[dateK])[m] / 100); } });
const lastDate = a => a.length ? ' (' + a[a.length - 1].d + ')' : '';
function ratesBlock(open) {
  const hasUsd = userAccts(a => a.cur === 'USD').length > 0, f = buildForm([{ k: 'date', l: 'التاريخ', t: 'date', v: L.today(), req: true }, { k: 'rate', l: 'سعر 100 دولار بالدينار (اختياري)', t: 'num' }, { k: 'g', l: 'سعر أونصة الذهب بالدولار (اختياري)', t: 'num' }, { k: 's', l: 'سعر أونصة الفضة بالدولار (اختياري)', t: 'num' }],
    v => act(() => { if (!v.rate.trim() && !v.g.trim() && !v.s.trim()) throw new Error('أدخل سعراً واحداً على الأقل'); if (v.rate.trim()) L.setRate(S, v.date, L.parseAmount(v.rate, 2));
      if (v.g.trim() || v.s.trim()) L.setPrices(S, v.date, { G: v.g.trim() ? L.parseAmount(v.g, 2) : undefined, S: v.s.trim() ? L.parseAmount(v.s, 2) : undefined }); }, 'حُدّثت الأسعار'), 'حدّث');
  const gp = S.x.prices.filter(x => x.G != null), sp = S.x.prices.filter(x => x.S != null);
  return pubSect('أسعارك المعتمدة', h('p', { class: 'mut' }, 'تحديث الأسعار لا يغيّر أي عملية سابقة، بل يغيّر التقييم فقط. سعر كل عملية محفوظ فيها.'),
    S.x.rates.length ? h('div', { class: 'r' }, h('span', {}, 'عمر سعر الصرف'), rateAge()) : null, row('100 دولار', S.x.rates.length ? L.fmtRate(S.rate) + ' د.ع' + lastDate(S.x.rates) : (hasUsd ? '⚠ لم يُدخل بعد' : 'لم يُدخل')), row('أونصة الذهب', gp.length ? L.fmtUsd(S.price.G) + lastDate(gp) : 'لم تُدخل'), row('أونصة الفضة', sp.length ? L.fmtUsd(S.price.S) + lastDate(sp) : 'لم تُدخل'), nabdRateBtn(saveNabdRate, 'أكّد واحفظ'), fold('تحديث الأسعار وسعر الصرف', open, f));
}
function usdBlock() { const U = L.usdInfo(S); if (!U.length) return null; const s = E.snap(S);
  return sect('الدولار (متوسط التكلفة)', U.map(u => h('div', { class: 'tx' }, row(u.name, L.fmtUsd(u.bal)), row(ti('متوسط الشراء (لكل 100$)', 'متوسط التكلفة'), L.fmtRate(u.avg) + ' د.ع'), row('القيمة الحالية', money(u.mkt)), row(ti('غير محقق'), (u.unreal > 0 ? '+' : '') + L.fmt(u.unreal) + ' د.ع'))), row(ti('محقق من الصرف حتى الآن', 'محقق'), L.fmt(s.fx) + ' د.ع')); }
function metalsBlock() {
  const P = L.pieces(S), held = P.filter(p => p.held), sold = P.filter(p => !p.held && S.tx.some(t => t.type === 'sell_metal' && t.meta && t.meta.piece === p.id && !t.voided));
  const tot = held.reduce((a, p) => ({ c: a.c + p.cost, t: a.t + p.theo }), { c: 0, t: 0 });
  return sect('الذهب والفضة', btn('شراء قطعة', () => go('assets', 'buy')), btn('قطعة موجودة قبل البدء', () => go('assets', 'old'), 'alt'),
    held.length ? held.map(p => h('div', { class: 'tx' }, h('div', {}, pieceName(p) + (p.buy && p.buy.est ? ' (تكلفة تقديرية)' : '')), row('تكلفتها', money(p.cost)), row(ti('قيمتها المعدنية النظرية', 'القيمة المعدنية النظرية'), money(p.theo)), row('الفرق (غير محقق)', (p.unreal > 0 ? '+' : '') + L.fmt(p.unreal) + ' د.ع'), btn('بيع', () => go('assets', 'sell', { id: p.id }), 'mini')))
      : emptyState('🪙', 'لا قطع ذهب أو فضة', 'سجّل قطعة اشتريتها، أو قطعة كانت عندك قبل البدء.'), held.length ? row('المجموع: التكلفة / النظرية', money(tot.c) + ' / ' + money(tot.t)) : null,
    sold.length ? h('div', {}, h('h2', {}, 'مبيعة'), sold.map(p => { const r = L.saleReport(S, p.id); return h('div', { class: 'tx' }, h('div', {}, pieceName(p)), row('النتيجة المحققة', (r.total > 0 ? '+' : '') + L.fmt(r.total) + ' د.ع'), btn('التقرير', () => go('assets', 'report', { id: p.id }), 'mini')); })) : null);
}
const metalFields = (old) => [{ k: 'metal', l: 'المعدن', t: 'select', opts: [['G', 'ذهب'], ['S', 'فضة']] }, { k: 'grams', l: 'الوزن بالغرام (حتى 3 منازل)', t: 'num', req: true },
  { k: 'karat', l: 'العيار (1 إلى 24)', t: 'num', v: '21', req: true, show: v => v.metal === 'G' }, { k: 'mille', l: 'النقاوة من 1000 (مثل 925)', t: 'num', v: '925', req: true, show: v => v.metal === 'S' },
  { k: 'form', l: 'النوع', t: 'select', opts: [['jewelry', 'مصوغات'], ['bullion', 'سبيكة أو عملة']] }, { k: 'label', l: 'وصف القطعة (اختياري)', t: 'text' }];
const metalArgs = v => ({ metal: v.metal, mg: L.parseAmount(v.grams, 3), karat: v.metal === 'G' ? Number(L.norm(v.karat)) : null, mille: v.metal === 'S' ? Number(L.norm(v.mille)) : null, form: v.form, label: v.label.trim() });
function buyForm() { const iq = accOpts(a => a.cur === 'IQD' && a.kind === 'asset');
  return buildForm([{ k: 'date', l: 'التاريخ', t: 'date', v: L.today(), req: true }, ...metalFields(), { k: 'paid', l: 'ما دفعته فعلاً (دينار، شامل الصياغة)', t: 'num', req: true }, { k: 'from', l: 'ادفع من', t: 'select', opts: iq }, priceDyn(v => v.metal), rateDyn('date', () => true)],
    v => act(() => L.buyPiece(S, { ...metalArgs(v), date: v.date, paid: L.parseAmount(v.paid, 0), from: v.from, price: L.parseAmount(v.price, 2), rate: L.parseAmount(v.rate, 2) }), 'سُجّل الشراء').then(r => { if (r) { go('accts', 'gold'); whyOffer(S.tx[S.tx.length - 1].id); } }), 'سجّل الشراء'); }
function oldForm() { return buildForm([{ k: 'od', l: 'تاريخ البدء', t: 'date', v: S.x.openDate, show: () => false }, ...metalFields(), { k: 'cost', l: 'تكلفتها بالدينار إن عرفتها (وإلا تُقدَّر)', t: 'num' }, { ...priceDyn(v => v.metal, 'od'), l: 'سعر الأونصة بالدولار يوم البدء' }, { ...rateDyn('od', () => true), l: 'سعر 100 دولار يوم البدء' }],
  v => act(() => L.addPiece(S, { ...metalArgs(v), cost: v.cost.trim() ? L.parseAmount(v.cost, 0) : 0, price: L.parseAmount(v.price, 2), rate: L.parseAmount(v.rate, 2) }), 'أُضيفت القطعة').then(r => { if (r) go('accts', 'gold'); }), 'أضف القطعة'); }
function sellForm(id) { const p = L.pieces(S).find(x => x.id === id); if (!p || !p.held) return h('p', {}, 'القطعة غير متاحة للبيع.'); const iq = accOpts(a => a.cur === 'IQD' && a.kind === 'asset');
  return h('div', {}, h('p', {}, pieceName(p)), row('تكلفتها', money(p.cost)), row('قيمتها النظرية الآن', money(p.theo)),
    buildForm([{ k: 'date', l: 'تاريخ البيع', t: 'date', v: L.today(), req: true }, { k: 'proceeds', l: 'مبلغ البيع الفعلي بالدينار', t: 'num', req: true }, { k: 'to', l: 'تذهب النقود إلى', t: 'select', opts: iq }, { k: 'note', l: 'الغرض من البيع / ملاحظة', t: 'text' },
      { ...priceDyn(() => p.metal), l: 'سعر الأونصة بالدولار يوم البيع' }, rateDyn('date', () => true)],
    v => { const pr = L.parseAmount(v.proceeds, 0); if (!confirm(`تأكيد بيع «${p.label || 'القطعة'}» بمبلغ ${L.fmt(pr)} د.ع وسعر أونصة ${v.price}$؟`)) return;
      return act(() => L.sellPiece(S, { date: v.date, id, proceeds: pr, to: v.to, note: v.note, price: L.parseAmount(v.price, 2), rate: L.parseAmount(v.rate, 2) }), 'سُجّل البيع').then(r => { if (r) { go('assets', 'report', { id }); whyOffer(S.tx[S.tx.length - 1].id); } }); }, 'أكّد البيع')); }
function reportView(id) { const p = S.pieces[id]; let r; try { r = L.saleReport(S, id); } catch (e) { return h('p', {}, e.message); } const sg = n => n == null ? '—' : (n > 0 ? '+' : '') + L.fmt(n) + ' د.ع';
  return h('div', {}, h('h2', {}, pieceName(p)), row('تاريخ البيع', r.date), row('سعر الشراء الفعلي (التكلفة)', money(r.cost)), row('سعر البيع الفعلي', money(r.proceeds)), row('الربح/الخسارة المحققة', sg(r.total), r.total < 0 ? 'bad' : ''),
    sect('التفكيك', r.market == null ? h('p', { class: 'mut' }, 'لا يتوفر سعر أونصة وقت الشراء، فلا يمكن تفكيك النتيجة.') : null, row('أثر حركة السعر والصرف', sg(r.market)), row('أجور الصياغة الضائعة', sg(r.making == null ? null : -r.making)), row('خصم التاجر عن القيمة المعدنية', sg(r.dealer == null ? null : -r.dealer)),
      r.dealerBp != null ? row('نسبة خصم التاجر الفعلية', (r.dealerBp / 100).toFixed(2) + '%') : null, r.est ? h('p', { class: 'mut' }, 'تكلفة هذه القطعة تقديرية (قيمتها يوم البدء)، فالأجور الضائعة صفر بالتعريف.') : null),
    row('ذهبت النقود إلى', r.to || '—'), r.note ? row('الغرض', r.note) : null, backBtn(() => go('accts', 'gold'))); }
SCREENS.assets = (sub, p) => { if (!S.x.openDate) return h('div', {}, h('h1', {}, 'الأصول'), h('p', {}, 'سجّل الرصيد الافتتاحي أولاً.'));
  if (sub === 'stock') return stockScreen(p.mode, p.id);
  if (sub === 'buy') return h('div', {}, backBtn(() => go('accts', 'gold')), h('h1', {}, 'شراء قطعة'), h('p', { class: 'mut' }, 'الدفع بالدينار. للشراء بالدولار حوّل الدولار إلى دينار أولاً.'), buyForm());
  if (sub === 'old') return h('div', {}, backBtn(() => go('accts', 'gold')), h('h1', {}, 'قطعة موجودة قبل البدء'), h('p', { class: 'mut' }, 'تُسجَّل بتاريخ البدء ولا تُحسب دخلاً.'), oldForm());
  if (sub === 'sell') return h('div', {}, backBtn(() => go('accts', 'gold')), h('h1', {}, 'بيع قطعة'), sellForm(p.id));
  if (sub === 'report') return h('div', {}, h('h1', {}, 'تقرير البيع'), reportView(p.id));
  return h('div', {}, h('h1', {}, 'الأصول'), fOn('goals') ? sect('', h('button', { class: 'lnk', onclick: () => go('more', 'goals') }, 'الأهداف')) : null, ratesBlock(p && p.open === 'prices'), usdBlock(), fOn('metals') ? metalsBlock() : null, fOn('stocks') ? stocksBlock() : null, valsBlock()); };
// التقييم اليدوي (عقار، أرض، سيارة): قيمتها التقديرية اليوم بالدينار. لا قيد ولا دخل: يغيّر التقييم فقط، والفرق عن التكلفة «غير محقق»
function valsBlock() { const V = L.valuations(S).filter(v => !v.hidden && (v.book !== 0 || v.hist.length)); if (!V.length) return null;
  const sg = n => (n > 0 ? '+' : '') + L.fmt(n) + ' د.ع', live = V.filter(v => v.book !== 0);
  return sect('التقييم اليدوي (عقار، أرض، سيارة)', h('p', { class: 'mut' }, 'اكتب قيمة الأصل التقديرية اليوم. لا يُسجَّل دخلاً ولا مصروفاً، بل يغيّر صافي الثروة السوقي فقط، والفرق عن تكلفته يظهر «غير محقق». التقييم الأحدث هو المعتمد.'),
    V.map(v => h('div', { class: 'tx' }, h('div', {}, v.name), row('التكلفة (الدفتر)', money(v.book)), row('آخر تقييم', v.last ? money(v.last.v) + ' (' + v.last.d + ')' : 'لم يُقيَّم'), v.last && v.book !== 0 ? row('الفرق (غير محقق)', sg(v.unreal)) : null,
      v.hist.length ? h('details', {}, h('summary', {}, 'سجل التقييمات (' + v.hist.length + ')'), v.hist.slice().reverse().map(x => h('div', { class: 'r' }, h('span', {}, x.d + ': ' + money(x.v)),
        btn('احذف', async () => { if (await act(() => { L.removeValuation(S, v.id, x.d); return true; })) snack('حُذف تقييم ' + x.d, () => L.setValuation(S, { acct: v.id, date: x.d, value: x.v })); }, 'mini alt')))) : null)),
    live.length ? buildForm([{ k: 'acct', l: 'الأصل', t: 'select', opts: live.map(v => [v.id, v.name]) }, { k: 'date', l: 'تاريخ التقييم', t: 'date', v: L.today(), req: true }, { k: 'value', l: 'القيمة التقديرية بالدينار', t: 'num', req: true }],
      v => act(() => L.setValuation(S, { acct: v.acct, date: v.date, value: L.parseAmount(v.value, 0) }), 'سُجّل التقييم'), 'سجّل التقييم') : null); }
// ===== المرحلة 5: الديون، الجمعيات، الأهداف، المتكررات =====
const iqOpts = () => accOpts(a => a.cur === 'IQD' && a.kind === 'asset');
const n0 = s => L.parseAmount(s, 0), dt = (k = 'date', l = 'التاريخ') => ({ k, l, t: 'date', v: L.today(), req: true });
const needAcct = () => iqOpts().length ? null : h('p', { class: 'mut' }, 'أنشئ حساباً بالدينار أولاً.');
function dueBlock() { const D = L.recurDue(S); if (!D.length) return null;
  return sect('مستحق الآن', D.map(x => h('div', { class: 'tx' }, h('div', { class: 'r' }, h('span', {}, (x.r.salary ? 'هل استلمت الراتب؟ ' : '') + x.r.name), h('b', {}, money(x.r.amount))), h('div', { class: 'mut' }, 'الموعد ' + x.due + (x.overdue ? ' (فات الموعد)' : '')),
    btn(x.r.salary ? 'نعم، استلمت' : 'سجّل', () => go('more', 'recurring', { confirm: x.r.id }), 'mini')))); }
// ---- الديون ----
MORE.push(['debts', 'الديون', () => { const p = view.p, D = L.debts(S), cur = p.id && D.find(d => d.id === p.id);
  if (needAcct()) return needAcct();
  const list = sect('الديون', D.length ? D.map(d => h('div', { class: 'tx' }, row((d.dir === 'lent' ? 'لي عند ' : 'عليّ لـ ') + d.person, d.settled ? 'مسدّد' : money(d.remaining), d.overdue ? 'bad' : ''), h('div', { class: 'mut' }, `الأصل ${L.fmt(d.amount)} · المسدّد ${L.fmt(d.paid)}` + (d.due ? ' · الاستحقاق ' + d.due : '') + (d.overdue ? ' (متأخر)' : '')),
    d.settled ? null : btn('سداد', () => go('more', 'debts', { id: d.id }), 'mini'))) : emptyState('🤝', 'لا ديون مسجّلة', 'سجّل ما أقرضته أو اقترضته من الأسفل، فيذكّرك التطبيق بالمتبقي وموعده.'));
  const repay = cur && !cur.settled ? sect('سداد: ' + cur.person, h('p', { class: 'mut' }, 'المتبقي ' + money(cur.remaining)), buildForm([dt(), { k: 'amount', l: 'المبلغ', t: 'num', v: String(cur.remaining), req: true }, { k: 'acct', l: cur.dir === 'lent' ? 'يدخل إلى' : 'يُدفع من', t: 'select', opts: iqOpts() },
      { k: 'fee', l: 'فائدة/رسوم إضافية (اختياري)', t: 'num', show: () => cur.dir === 'borrowed' }], v => act(() => L.debtRepay(S, { id: cur.id, date: v.date, amount: n0(v.amount), acct: v.acct, fee: v.fee && v.fee.trim() ? n0(v.fee) : 0 }), 'سُجّل السداد').then(() => go('more', 'debts')), 'سجّل السداد')) : null;
  const add = sect('دين جديد', h('p', { class: 'mut' }, 'الدين بالدينار. للدولار حوّله إلى دينار أولاً.'), buildForm([dt(), { k: 'dir', l: 'النوع', t: 'select', opts: [['lent', 'أقرضتُ شخصاً'], ['borrowed', 'اقترضتُ من شخص']] }, { k: 'person', l: 'الشخص', t: 'text', req: true }, { k: 'amount', l: 'المبلغ', t: 'num', req: true },
    { k: 'acct', l: 'الحساب', t: 'select', opts: iqOpts() }, { k: 'due', l: 'تاريخ الاستحقاق (اختياري)', t: 'date', future: true }, { k: 'note', l: 'ملاحظة', t: 'text' }], v => act(() => L.debtNew(S, { date: v.date, dir: v.dir, person: v.person, amount: n0(v.amount), acct: v.acct, due: v.due || null, note: v.note }), 'سُجّل الدين'), 'سجّل'));
  return h('div', {}, list, repay, add); }]);
// ---- الجمعيات ----
MORE.push(['jams', 'الجمعيات', () => { const p = view.p, J = S.x.jams.map(j => L.jamState(S, j)), cur = p.id && J.find(j => j.id === p.id);
  if (needAcct()) return needAcct();
  const list = sect(ti('الجمعيات', 'الجمعية'), J.length ? J.map(j => h('div', { class: 'tx' }, h('div', {}, j.name), row('القسط / الحصيلة', money(j.s) + ' / ' + money(j.pot)), row('الحالة', j.done ? 'اكتملت' : j.received ? `قبضتَ. بقي ${j.remaining} قسط (${money(j.remaining * j.s)} التزام)` : `دفعتَ ${j.paid} من ${j.turn} قبل القبض`),
    j.done ? null : h('div', {}, row('القسط القادم', j.next), btn('دفع قسط', () => go('more', 'jams', { id: j.id, mode: 'pay' }), 'mini'), j.received ? null : btn('قبض الحصيلة', () => go('more', 'jams', { id: j.id, mode: 'recv' }), 'mini')))) : emptyState('🔄', 'لا جمعيات', 'أنشئ جمعية من الأسفل لتتابع أقساطها ودورك في القبض.'));
  const act1 = cur ? sect(cur.name + ' — ' + (p.mode === 'pay' ? 'دفع قسط' : 'قبض'), buildForm([dt(), { k: 'acct', l: p.mode === 'pay' ? 'يُدفع من' : 'تدخل إلى', t: 'select', opts: iqOpts() }],
    v => act(() => p.mode === 'pay' ? L.jamPay(S, { id: cur.id, from: v.acct, date: v.date }) : L.jamReceive(S, { id: cur.id, to: v.acct, date: v.date }), p.mode === 'pay' ? 'سُجّل القسط' : 'سُجّل القبض').then(() => go('more', 'jams')), 'سجّل')) : null;
  const add = sect('جمعية جديدة', buildForm([{ k: 'name', l: 'الاسم', t: 'text', req: true }, { k: 'N', l: 'عدد الأعضاء', t: 'num', req: true }, { k: 's', l: 'القسط الشهري', t: 'num', req: true }, { k: 'turn', l: 'رقم دورك (شهر القبض)', t: 'num', req: true }, { ...dt('start', 'تاريخ أول قسط'), future: true }],
    v => act(() => L.jamNew(S, { name: v.name, N: Number(L.norm(v.N)), s: n0(v.s), turn: Number(L.norm(v.turn)), start: v.start }), 'أُنشئت الجمعية'), 'أنشئ'));
  return h('div', {}, list, act1, add); }]);
// ---- الأهداف ----
// هدف الدولار يُعرض بالدولار ومعه ما يعادله بالدينار بآخر سعر صرف. هدف الدينار بالدينار فقط
const gm = (g, n) => g.cur === 'USD' ? L.fmtUsd(n) : money(n);
MORE.push(['goals', 'الأهداف', () => { const p = view.p, G = L.goalView(S), cur = p.id && G.find(g => g.id === p.id);
  const list = sect('الأهداف', G.length ? G.map(g => h('div', { class: 'tx' }, h('div', { class: 'r' }, h('span', {}, g.name + (g.kind === 'long' ? ' (طويل الأمد)' : ' (قصير الأمد)')), h('b', {}, g.pct + '%')),
    row(ti('المخصص / المستهدف', 'التخصيص'), gm(g, g.allocated) + ' / ' + gm(g, g.target)), g.iqd ? row('بالدينار بآخر سعر صرف', '≈ ' + L.fmt(g.iqd.allocated) + ' / ' + money(g.iqd.target)) : null,
    row('الموعد', g.targetDate + (g.skipped ? ` (مُدِّد ${g.skipped})` : '')), g.done ? h('p', { class: 'okc' }, 'اكتمل الهدف') : h('div', {}, row('القسط الشهري المطلوب', gm(g, g.monthly) + (g.iqd ? ' ≈ ' + money(g.iqd.monthly) : '')), g.iqd ? row('المتبقي بالدينار بآخر سعر', '≈ ' + money(g.iqd.remaining)) : null, row('المخصص هذا الشهر', gm(g, g.paidMonth)), g.behind > 0 ? (g.firstMonth ? row('القسط المطلوب هذا الشهر', gm(g, g.behind)) : row('متأخر عن الخطة', gm(g, g.behind), 'bad')) : null),
    btn('تخصيص', () => go('more', 'goals', { id: g.id, mode: 'alloc' }), 'mini'), btn('تحرير', () => go('more', 'goals', { id: g.id, mode: 'release' }), 'mini'),
    !g.done && g.behind > 0 && !g.firstMonth ? btn('تخطَّ شهراً ومدِّد الموعد', () => { if (confirm('تمديد موعد الهدف شهراً بدل بقاء المتأخر مستحقاً؟')) act(() => L.goalSkip(S, g.id), 'مُدِّد الموعد'); }, 'mini alt') : null)) : emptyState('🎯', 'لا أهداف بعد', 'الهدف يحوّل الادخار إلى خطة: مبلغ وموعد وقسط شهري.'),
    h('p', { class: 'mut' }, 'التخصيص ظرف افتراضي: لا يحرك أي حساب ولا ينقص صافي الثروة، لكنه ينقص «المتاح للصرف».'), G.some(g => g.iqd) ? h('p', { class: 'mut' }, 'هدف الدولار: يُحجز من «المتاح للصرف» ما يعادل المبلغ بسعر يوم التخصيص، ويُعرض ما يعادله بالدينار بآخر سعر صرف أدخلته (' + (S.x.rates.length ? L.fmtRate(S.rate) + ' د.ع لكل 100$' : '—') + ').') : null);
  const mv = cur ? sect((p.mode === 'alloc' ? 'تخصيص لـ ' : 'تحرير من ') + cur.name, buildForm([dt(), { k: 'amount', l: cur.cur === 'USD' ? 'المبلغ (دولار)' : 'المبلغ', t: 'num', req: true }],
    async v => { const amt = cur.cur === 'USD' ? L.parseAmount(v.amount, 2) : n0(v.amount); if (p.mode === 'alloc') { const w = L.goalAdvice(S, cur.id, amt); if (w.length && !confirm(w.join('\n') + '\nمتابعة؟')) return; }
      await act(() => L.goalMove(S, { id: cur.id, amount: amt, date: v.date, release: p.mode === 'release' }), 'تم'); go('more', 'goals'); }, 'نفّذ')) : null;
  const add = sect('هدف جديد', buildForm([{ k: 'name', l: 'الاسم', t: 'text', req: true }, { k: 'cur', l: 'عملة الهدف', t: 'select', opts: [['IQD', 'دينار'], ['USD', 'دولار (ومعه ما يعادله بالدينار)']] },
    { k: 'target', l: 'المبلغ المستهدف (دينار)', t: 'num', req: true, show: v => v.cur !== 'USD' }, { k: 'targetUsd', l: 'المبلغ المستهدف (دولار)', t: 'num', req: true, show: v => v.cur === 'USD' }, { k: 'targetDate', l: 'الموعد', t: 'date', req: true, future: true }, { k: 'sav', l: 'هل هو هدف المدخرات (الطوارئ)؟', t: 'select', opts: [['0', 'لا'], ['1', 'نعم']] }, { k: 'priority', l: 'الأولوية', t: 'select', opts: [['1', 'عالية'], ['2', 'متوسطة'], ['3', 'منخفضة']] }, { k: 'kind', l: 'النوع', t: 'select', opts: [['short', 'قصير الأمد'], ['long', 'طويل الأمد']] }],
    async v => { const id = await act(() => { const id = L.goalNew(S, { name: v.name, cur: v.cur, target: v.cur === 'USD' ? L.parseAmount(v.targetUsd, 2) : n0(v.target), targetDate: v.targetDate, priority: Number(v.priority), kind: v.kind }); if (v.sav === '1') S.x.set.savingsGoal = id; return id; }, 'أُضيف الهدف');
      if (id) { const g = L.goalView(S).find(x => x.id === id); go('more', 'goals', { adv: { ...FM.goalAdviceText(S, g.iqd ? g.iqd.target : g.target, g.targetDate), name: g.name, sav: v.sav === '1' } }); } }, 'أضف'));
  const adv = p.adv ? sect('', h('div', { class: 'adv a-' + p.adv.lv }, h('b', {}, 'تعليق المستشار على «' + p.adv.name + '»' + (p.adv.sav ? ' (هدف المدخرات)' : '')), h('p', { class: 'advt' }, p.adv.text))) : null;
  return h('div', {}, adv, list, mv, add); }]);
// ---- المتكررات والراتب ----
MORE.push(['recurring', 'المتكررات والراتب', () => { const p = view.p, D = L.recurDue(S), cur = p.confirm && S.x.recur.find(r => r.id === p.confirm);
  if (needAcct()) return needAcct();
  const conf = cur ? (() => { const amt = h('input', { value: String(cur.amount), inputmode: 'decimal' }), dateIn = h('input', { type: 'date', value: L.today(), max: L.today() }), step = d => () => { try { amt.value = String(Math.max(1, n0(amt.value) + d)); } catch (e) { toast(e.message, true); } };
    return sect(cur.salary ? 'هل استلمت الراتب؟' : 'تأكيد: ' + cur.name, h('label', { class: 'f' }, h('span', {}, 'التاريخ'), dateIn), h('label', { class: 'f' }, h('span', {}, 'المبلغ (عدّله إن اختلف)'), amt),
      cur.salary ? h('div', {}, btn('+ 50,000', step(50000), 'alt mini'), btn('− 50,000', step(-50000), 'alt mini')) : null,
      btn('سجّل', async () => { let a; try { a = n0(amt.value); } catch (e) { return toast(e.message, true); } const prev = cur.last, d = dateIn.value;
        const id = await saveTx(() => L.recurConfirm(S, { id: cur.id, date: d, amount: a }), (cur.salary ? 'الراتب ' : cur.name + ' ') + money(a), () => { cur.last = prev; });
        if (id && !(cur.salary && cur.kind === 'income' && pyfAfterSalary(a, cur.acct, d))) go('more', 'recurring'); }), btn('تخطَّ هذا الشهر', () => act(() => L.recurSkip(S, cur.id), 'تُخطّي').then(() => go('more', 'recurring')), 'alt'), btn('ليس الآن', () => go('more', 'recurring'), 'alt')); })() : null;
  const due = !cur && D.length ? dueBlock() : null;
  const all = sect('كل البنود', S.x.recur.length ? S.x.recur.map(r => h('div', { class: 'tx' + (r.active ? '' : ' void') }, row(r.name + (r.salary ? ' (راتب)' : ''), money(r.amount)), h('div', { class: 'mut' }, (r.kind === 'income' ? 'دخل' : 'مصروف') + ` · يوم ${r.day} · تذكير قبل ${r.remind} أيام · ` + (r.active ? 'فعّال' : 'موقوف')),
    btn(r.active ? 'أوقف' : 'فعّل', () => act(() => L.recurToggle(S, r.id)), 'mini alt'), btn('احذف', async () => { const i = S.x.recur.indexOf(r), copy = JSON.parse(JSON.stringify(r)); if (await act(() => { L.recurDelete(S, r.id); return true; })) snack('حُذف البند «' + r.name + '» (عملياته باقية)', () => { S.x.recur.splice(i, 0, copy); }); }, 'mini alt'))) : emptyState('🔁', 'لا بنود متكررة', 'أضف راتبك وفواتيرك الثابتة، فيذكّرك التطبيق بها داخله عند فتحه.'));
  const add = sect('بند جديد', buildForm([{ k: 'kind', l: 'النوع', t: 'select', opts: [['expense', 'مصروف متكرر'], ['income', 'دخل متكرر (راتب)']] }, { k: 'name', l: 'الاسم', t: 'text', req: true }, { k: 'amount', l: 'المبلغ المتوقع', t: 'num', req: true },
    { k: 'acct', l: 'الحساب', t: 'select', opts: iqOpts() }, { k: 'cat', l: 'الفئة', t: 'select', opts: L.CATS.map(c => [c[0], c[1]]), show: v => v.kind === 'expense' }, { k: 'src', l: 'المصدر', t: 'select', opts: [['inc_salary', 'الراتب'], ['inc_other', 'دخل آخر']], show: v => v.kind === 'income' },
    { k: 'day', l: 'يوم الشهر (1 إلى 28)', t: 'num', req: true }, { k: 'remind', l: 'التذكير قبل كم يوماً (0 إلى 7)', t: 'num', v: '2', req: true }, { k: 'salary', l: 'هل هو الراتب؟', t: 'select', opts: [['0', 'لا'], ['1', 'نعم']], show: v => v.kind === 'income' }],
    v => act(() => L.recurNew(S, { kind: v.kind, name: v.name, amount: n0(v.amount), acct: v.acct, cat: v.kind === 'expense' ? v.cat : null, src: v.kind === 'income' ? v.src : null, day: Number(L.norm(v.day)), remind: Number(L.norm(v.remind)), salary: v.kind === 'income' && v.salary === '1' }), 'أُضيف البند'), 'أضف'));
  return h('div', {}, conf, due, all, add); }]);
