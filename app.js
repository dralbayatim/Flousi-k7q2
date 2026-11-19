'use strict';
// فلوسي — الواجهة. كل شيء محلي: التخزين IndexedDB باسم flousi (قاعدة المرحلة 0 flousi-p0 لا تُمسّ).
const $ = s => document.querySelector(s);
const h = (t, a, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a || {})) { if (n === 'class') e.className = v; else if (n.startsWith('on')) e[n] = v; else if (v !== false && v != null) e.setAttribute(n, v === true ? '' : v); }
  k.flat(9).forEach(c => { if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(c)); }); return e; };
const L = FL, E = FE, VER = 'f1-v1'; // ارفع VER مع V في sw.js عند كل إصدار
let S, BE, view = { tab: 'home', sub: null, p: {} }, sessionDismiss = false;
const money = n => L.fmt(n) + ' د.ع';
const toast = (m, bad) => { const t = $('#toast'); t.textContent = m; t.className = bad ? 'bad on' : 'on'; clearTimeout(toast.t); toast.t = setTimeout(() => { t.className = ''; }, bad ? 5000 : 2200); };
const go = (tab, sub, p) => { view = { tab, sub: sub || null, p: p || {} }; render(); window.scrollTo(0, 0); };
const act = async (fn, ok) => { try { const r = await FStore.run(BE, S, fn); if (ok) toast(ok); render(); return r; } catch (e) { toast(e.message || String(e), true); } };
const userAccts = f => Object.values(S.acc).filter(a => (a.type || /^u\d+$/.test(a.id)) && !a.metal && (!f || f(a)));
const accOpts = f => userAccts(f).map(a => [a.id, a.name + (a.cur === 'USD' ? ' ($)' : '')]);
const decOf = id => S.acc[id].cur === 'USD' ? 2 : 0;
const amtStr = (n, cur) => cur === 'USD' ? L.fmtUsd(n) : money(n);
const sect = (title, ...k) => h('section', {}, title ? h('h2', {}, title) : null, ...k);
const btn = (t, f, cls) => h('button', { class: cls || '', onclick: f }, t);
const row = (a, b, cls) => h('div', { class: 'r ' + (cls || '') }, h('span', {}, a), h('b', {}, b));
// نموذج عام: fields = [{k,l,t:'text|num|date|select',opts,v,ph,req,show(vals),dyn(ctl,vals)}]
function buildForm(fields, submit, label) {
  const root = h('div', { class: 'form' }), ctl = {}, wrap = {};
  const vals = () => Object.fromEntries(Object.keys(ctl).map(k => [k, ctl[k].value]));
  const refresh = () => { const v = vals(); fields.forEach(f => { wrap[f.k].hidden = f.show ? !f.show(v) : false; if (f.dyn) f.dyn(ctl[f.k], v); }); };
  fields.forEach(f => { const c = f.t === 'select' ? h('select', {}, f.opts.map(([v, t]) => h('option', { value: v }, t))) : h('input', { type: f.t === 'date' ? 'date' : 'text', inputmode: f.t === 'num' ? 'decimal' : null, placeholder: f.ph || '', autocomplete: 'off' });
    if (f.v !== undefined) c.value = f.v; c.onchange = () => refresh(); c.oninput = () => { c.dataset.touched = '1'; refresh(); }; ctl[f.k] = c; wrap[f.k] = h('label', { class: 'f' }, h('span', {}, f.l), c); root.append(wrap[f.k]); });
  root.append(btn(label || 'حفظ', async () => { const v = vals(), miss = fields.find(f => !wrap[f.k].hidden && f.req && !String(v[f.k]).trim()); if (miss) return toast('أكمل: ' + miss.l, true);
    try { await submit(v); } catch (e) { toast(e.message || String(e), true); } }));
  refresh(); return root;
}
const rateDyn = (dateK, show) => ({ k: 'rate', l: 'سعر 100 دولار بالدينار في ذلك اليوم', t: 'num', req: true, show, dyn: (c, v) => { if (!c.dataset.touched && E.okDate(v[dateK]) && S.x.rates.length) c.value = String(L.rateAt(S, v[dateK]) / 100); } });
const seg = (items, cur, f) => h('div', { class: 'seg' }, items.map(([k, t]) => h('button', { class: k === cur ? 'on' : '', onclick: () => f(k) }, t)));
const SCREENS = {}, MORE = []; // MORE: صفحات تبويب «المزيد» [مفتاح، عنوان، دالة]
// ===== المرحلة 2: الشاشة الرئيسية، العمليات، الحسابات، الرصيد الافتتاحي =====
function acctList() {
  const A = L.accountsView(S), grp = [['السائل', a => a.kind === 'asset' && a.liquid], ['أصول أخرى', a => a.kind === 'asset' && !a.liquid], ['الالتزامات', a => a.kind === 'liab']];
  return grp.map(([t, f]) => { const xs = A.filter(f); return xs.length ? sect(t, xs.map(a => row(a.name, a.cur === 'USD' ? L.fmtUsd(a.bal) + ' ≈ ' + money(a.iqd) : money(a.bal)))) : null; });
}
function opsForm(kind) {
  const D = { k: 'date', l: 'التاريخ', t: 'date', v: L.today(), req: true }, N = { k: 'note', l: 'ملاحظة (اختياري)', t: 'text' };
  const isUsd = id => id && S.acc[id] && S.acc[id].cur === 'USD', ok = m => () => toast(m);
  const parse = (id, s) => L.parseAmount(s, decOf(id)), rt = (id, v) => isUsd(id) ? L.parseAmount(v.rate, 2) : null;
  const A = accOpts(), first = A[0] ? A[0][0] : '';
  if (!A.length) return h('p', { class: 'mut' }, 'أنشئ حساباً أولاً من تبويب «الحسابات» (أو سجّل الرصيد الافتتاحي).');
  if (kind === 'income') return buildForm([D, { k: 'acct', l: 'يدخل إلى', t: 'select', opts: A }, { k: 'src', l: 'المصدر', t: 'select', opts: [['inc_salary', 'الراتب'], ['inc_other', 'دخل آخر']] },
    { k: 'amount', l: 'المبلغ', t: 'num', req: true }, rateDyn('date', v => isUsd(v.acct)), N],
    v => act(() => L.income(S, { date: v.date, acct: v.acct, src: v.src, amount: parse(v.acct, v.amount), r: rt(v.acct, v), note: v.note }), 'سُجّل الدخل'), 'سجّل الدخل');
  if (kind === 'expense') return buildForm([D, { k: 'acct', l: 'يُصرف من', t: 'select', opts: A }, { k: 'cat', l: 'الفئة', t: 'select', opts: L.CATS.map(c => [c[0], c[1]]) },
    { k: 'amount', l: 'المبلغ', t: 'num', req: true }, rateDyn('date', v => isUsd(v.acct)), N],
    v => act(() => L.expense(S, { date: v.date, acct: v.acct, cat: v.cat, amount: parse(v.acct, v.amount), r: rt(v.acct, v), note: v.note }), 'سُجّل المصروف'), 'تم');
  if (kind === 'transfer') { const diff = v => v.from && v.to && S.acc[v.from] && S.acc[v.to] && S.acc[v.from].cur !== S.acc[v.to].cur, bothUsd = v => isUsd(v.from) && isUsd(v.to);
    return buildForm([D, { k: 'from', l: 'من', t: 'select', opts: A }, { k: 'to', l: 'إلى', t: 'select', opts: A, v: A[1] ? A[1][0] : first },
      { k: 'amount', l: 'المبلغ المدفوع (بعملة حساب المصدر)', t: 'num', req: true }, { k: 'amount2', l: 'المبلغ المستلم فعلياً (بعملة حساب الوجهة)', t: 'num', req: true, show: diff },
      { ...rateDyn('date', bothUsd), l: 'سعر 100 دولار في ذلك اليوم' }, N],
      v => act(() => L.transfer(S, { date: v.date, from: v.from, to: v.to, amount: parse(v.from, v.amount), amount2: diff(v) ? parse(v.to, v.amount2) : 0, r: bothUsd(v) ? L.parseAmount(v.rate, 2) : null, note: v.note }), 'سُجّل التحويل'), 'حوّل'); }
  const iq = A.filter(a => S.acc[a[0]].cur === 'IQD');
  return buildForm([D, { k: 'acct', l: 'الحساب (بالدينار)', t: 'select', opts: iq }, { k: 'counted', l: 'الرصيد الفعلي بعد العدّ', t: 'num', req: true }, N],
    v => act(() => L.reconcile(S, { date: v.date, acct: v.acct, counted: L.parseAmount(v.counted, 0) }), 'سُجّلت المطابقة'), 'سوِّ الفرق');
}
function txList(n = 40) {
  const xs = L.listTx(S).slice(0, n);
  return sect('آخر العمليات', xs.length ? xs.map(t => h('div', { class: 'tx' + (t.voided || t.reversal ? ' void' : '') },
    h('div', { class: 'r' }, h('span', {}, t.date + ' · ' + t.label), h('b', {}, money(t.amount) + (t.usd ? ' (' + L.fmtUsd(t.usd) + ')' : ''))),
    h('div', { class: 'mut' }, (t.from ? t.from + ' ← ' : '') + t.to + (t.note ? ' — ' + t.note : '') + (t.voided ? ' (معكوسة)' : '')),
    (!t.voided && !t.reversal && t.label !== 'رصيد افتتاحي') ? btn('تراجع', () => { if (confirm('عكس هذه العملية؟ تبقى ظاهرة في السجل.')) act(() => { const o = S.tx.find(x => x.id === t.id); L.undo(S, t.id, L.today() > o.date ? L.today() : o.date); }, 'عُكست العملية'); }, 'mini') : null))
    : h('p', { class: 'mut' }, 'لا عمليات بعد.'));
}
SCREENS.ops = (sub, p) => { const kind = view.p.kind || 'expense';
  return h('div', {}, h('h1', {}, 'عملية جديدة'), seg([['expense', 'مصروف'], ['income', 'دخل'], ['transfer', 'تحويل'], ['reconcile', 'مطابقة نقد']], kind, k => go('ops', null, { kind: k })), opsForm(kind), txList()); };

function openingWizard() {
  const rows = h('div', {}), mk = (pre = {}) => { const r = h('div', { class: 'orow' }); const f = {};
    f.name = h('input', { placeholder: 'اسم الحساب', value: pre.name || '' }); f.type = h('select', {}, Object.entries(L.TYPES).map(([k, v]) => h('option', { value: k }, v[0]))); if (pre.type) f.type.value = pre.type;
    f.cur = h('select', {}, [['IQD', 'دينار'], ['USD', 'دولار']].map(([k, t]) => h('option', { value: k }, t))); f.amount = h('input', { placeholder: 'الرصيد', inputmode: 'decimal' });
    f.rate = h('input', { placeholder: 'متوسط سعر شرائه (دينار لكل 100$)', inputmode: 'decimal' });
    const sync = () => { f.rate.hidden = f.cur.value !== 'USD'; }; f.cur.onchange = sync; sync(); r._f = f;
    r.append(f.name, f.type, f.cur, f.amount, f.rate, btn('حذف', () => r.remove(), 'mini')); rows.append(r); };
  mk({ name: 'نقد', type: 'asset_cash' }); mk({ name: 'فيزا', type: 'visa' });
  const date = h('input', { type: 'date', value: L.today() }), rate = h('input', { placeholder: 'سعر 100 دولار اليوم بالدينار (إن وُجد دولار)', inputmode: 'decimal' });
  return sect('الرصيد الافتتاحي', h('p', { class: 'mut' }, 'أدخل ما تملكه وتدين به اليوم. لا يُحسب دخلاً. للدولار أدخل متوسط سعر شرائه إن عرفته وإلا سعر اليوم.'),
    h('label', { class: 'f' }, h('span', {}, 'تاريخ البدء'), date), rows, btn('إضافة حساب', () => mk(), 'alt'), h('label', { class: 'f' }, h('span', {}, 'سعر الدولار اليوم'), rate),
    btn('سجّل الرصيد الافتتاحي', () => { try {
      const data = [...rows.children].map(r => { const f = r._f, cur = f.cur.value, kind = L.TYPES[f.type.value][1]; if (!f.amount.value.trim()) return null;
        if (cur === 'USD' && kind === 'liab') throw new Error('الالتزام بالدولار غير مدعوم'); return { name: f.name.value, type: f.type.value, cur, amount: L.parseAmount(f.amount.value, cur === 'USD' ? 2 : 0), r: cur === 'USD' ? L.parseAmount(f.rate.value, 2) : null }; }).filter(Boolean);
      if (!data.length) throw new Error('أدخل رصيد حساب واحد على الأقل'); const hasUsd = data.some(d => d.cur === 'USD');
      act(() => { if (hasUsd) L.setRate(S, date.value, L.parseAmount(rate.value, 2)); L.opening(S, date.value, data); }, 'سُجّل الرصيد الافتتاحي').then(() => go('home')); } catch (e) { toast(e.message, true); } }));
}
SCREENS.accts = (sub) => {
  if (sub === 'open' || !S.x.openDate && sub !== 'list') return h('div', {}, h('h1', {}, 'الحسابات'), openingWizard());
  const f = buildForm([{ k: 'name', l: 'اسم الحساب', t: 'text', req: true }, { k: 'type', l: 'النوع', t: 'select', opts: Object.entries(L.TYPES).map(([k, v]) => [k, v[0]]) }, { k: 'cur', l: 'العملة', t: 'select', opts: [['IQD', 'دينار'], ['USD', 'دولار']] }],
    v => act(() => L.addAccount(S, v), 'أُضيف الحساب'), 'أضف حساباً');
  return h('div', {}, h('h1', {}, 'الحسابات'), acctList(), sect('حساب جديد', h('p', { class: 'mut' }, 'يبدأ الحساب بصفر. للمال الموجود سلفاً استعمل الرصيد الافتتاحي عند البدء، أو سجّل تحويلاً/دخلاً.'), f));
};
function nwBlock() {
  const p = L.panel(S), hide = S.x.set.hideNw && !view.reveal, mask = v => hide ? '••••••' : v, d = v => v == null ? '—' : (v > 0 ? '+' : '') + L.fmt(v) + ' د.ع';
  return sect('صافي الثروة', h('div', { class: 'big', onclick: () => { view.reveal = !view.reveal; render(); } }, mask(money(p.nw))), h('p', { class: 'mut' }, hide ? 'اضغط الرقم للإظهار' : 'اضغط الرقم للإخفاء'),
    row('الأصول', mask(money(p.cur.assets))), row('الالتزامات', mask(money(p.cur.liab))), row('التغير هذا الشهر', mask(d(p.dMonth))), row('التغير منذ بداية السنة', mask(d(p.dYear))),
    S.x.set.valuation === 'cost' ? null : row('أرباح/خسائر غير محققة', mask(d(p.U))));
}
SCREENS.home = () => {
  if (!S.x.openDate) return h('div', {}, h('h1', {}, 'فلوسي'), sect('', h('p', {}, 'مرحباً. ابدأ بتسجيل الرصيد الافتتاحي لتبدأ التقارير بأرقام صحيحة.'), btn('ابدأ الرصيد الافتتاحي', () => go('accts', 'open'))));
  const s = E.snap(S); return h('div', {}, h('h1', {}, 'فلوسي'), sect('المتاح للصرف', h('div', { class: 'big' }, money(s.avail)), row('السائل', money(s.liq))), nwBlock(), acctList());
};
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
document.addEventListener('visibilitychange', () => { if (!S) return;
  if (document.hidden) { hiddenAt = Date.now(); if (lockOn()) lockCover(true); }
  else if (lockOn()) { if (Date.now() - hiddenAt >= S.x.set.lockMin * 60000) { unlocked = false; showLock(); } else lockCover(false); } });
// ---- شريط التذكير ----
function backupBanner() { const b = FB.status(S); if (b.level === 'ok') return null;
  const t = b.days == null ? 'لا توجد نسخة احتياطية خارجية بعد' : `آخر نسخة قبل ${b.days} يوماً و${b.since} عملية جديدة`;
  return h('div', { class: 'ticker alert', onclick: () => go('more', 'backup') }, '⚠ ' + t + ' — اضغط لأخذ نسخة'); }
// ---- صفحات «المزيد» ----
MORE.push(['lock', 'القفل', () => { const st = S.x.set, set = S.sec.pin;
  const pf = buildForm([{ k: 'a', l: 'رمز جديد (6 أرقام)', t: 'num', req: true }, { k: 'b', l: 'أعد كتابته', t: 'num', req: true }], async v => { const a = FB.checkPinFormat(v.a); if (a !== FB.checkPinFormat(v.b)) throw new Error('الرمزان مختلفان');
    S.sec.pin = await FB.hashPin(a); st.lockOn = true; await FStore.saveSec(BE, S); await act(() => {}, 'فُعّل القفل'); go('more', 'lock'); }, set ? 'غيّر الرمز' : 'فعّل القفل');
  return h('div', {}, sect('رمز التطبيق', h('p', { class: 'mut' }, set ? 'القفل مفعّل. يُقفل التطبيق عند مغادرته بعد المهلة، وتُحجب الشاشة فوراً.' : 'لا يوجد قفل. هذا قفل للواجهة، والحاجز الفعلي هو رمز هاتفك فاجعله قوياً.'), pf),
    set ? sect('المهلة', seg([['0', 'فوراً'], ['1', 'دقيقة'], ['5', '5 دقائق']], String(st.lockMin), k => act(() => { st.lockMin = +k; }, 'تم')),
      btn('إلغاء القفل', async () => { const p = prompt('أدخل الرمز الحالي'); if (p && await FB.verifyPin(p, S.sec.pin)) { S.sec.pin = null; S.sec.passkey = null; st.lockOn = false; await FStore.saveSec(BE, S); await act(() => {}, 'أُلغي القفل'); go('more', 'lock'); } else toast('رمز خاطئ', true); }, 'alt')) : null,
    set ? sect('بصمة الوجه (تجريبية)', h('p', { class: 'mut' }, 'اختيارية. الرمز يعمل دائماً بديلاً. جرّبها بإغلاق التطبيق وفتحه قبل الاعتماد عليها.'),
      btn(S.sec.passkey ? 'ألغِ البصمة' : 'فعّل البصمة', async () => { try { if (S.sec.passkey) { S.sec.passkey = null; } else { const r = n => crypto.getRandomValues(new Uint8Array(n)), c = await navigator.credentials.create({ publicKey: { challenge: r(32), rp: { name: 'Flousi', id: location.hostname }, user: { id: r(16), name: 'flousi', displayName: 'Flousi' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000 } }); S.sec.passkey = b64(c.rawId); }
        await FStore.saveSec(BE, S); toast('تم'); go('more', 'lock'); } catch (e) { toast('تعذّر: ' + e.name, true); } }, 'alt')) : null); }]);
let pending = null;
MORE.push(['backup', 'النسخ الاحتياطي والتصدير', () => { const b = FB.status(S), box = h('div', {});
  const stat = sect('الحالة', row('آخر نسخة', S.x.backup ? new Date(S.x.backup.t).toLocaleDateString('en-GB') + ' (' + b.days + ' يوماً)' : 'لا توجد'), row('عمليات بعد آخر نسخة', String(b.since)), row('مفتاح الاسترداد', S.sec.key ? 'مُعدّ' : 'غير مُعدّ'),
    h('p', { class: 'mut' }, 'احفظ النسخة في iCloud Drive (ملفات ثم iCloud Drive) لا على الهاتف وحده. لا نسخ تلقائي خارج الهاتف في تطبيق الويب.'));
  if (!S.sec.key) { const key = FLS.fmtKey(FLS.newKey()); box.append(stat, sect('مفتاح الاسترداد', h('p', {}, 'اكتب هذا المفتاح على ورقة واحفظها في مكانين. بدونه لا تُفتح أي نسخة، ولن يظهر مرة ثانية.'), h('div', { class: 'big', style: 'direction:ltr;font-size:1.15rem;letter-spacing:.04em' }, key),
      buildForm([{ k: 'k', l: 'أعد كتابة المفتاح للتأكيد', t: 'text', req: true }], async v => { if (FLS.normKey(v.k) !== FLS.normKey(key)) throw new Error('المفتاح غير مطابق'); S.sec.key = FLS.normKey(key); await FStore.saveSec(BE, S); toast('حُفظ المفتاح'); go('more', 'backup'); }, 'أكّدتُ وكتبتُه'))); return box; }
  const prep = btn('جهّز نسخة مشفّرة', async () => { toast('جارٍ التشفير…'); const bytes = await FB.build(S, S.sec.key); pending = new File([bytes], 'flousi-' + L.today() + '.flousibak', { type: 'application/octet-stream' }); go('more', 'backup'); });
  const save = pending ? btn('احفظ النسخة', async () => { const how = await shareFile(pending); if (how) { await act(() => { S.x.backup = { t: Date.now(), tx: S.tx.length, how }; }, 'سُجّلت النسخة'); pending = null; go('more', 'backup'); } }) : null;
  const expo = btn('تصدير CSV (ملف مضغوط)', async () => { const z = new File([FB.exportZip(S)], 'flousi-export-' + L.today() + '.zip', { type: 'application/zip' }); await shareFile(z); }, 'alt');
  const key = h('input', { placeholder: 'مفتاح الاسترداد', autocomplete: 'off' }), file = h('input', { type: 'file', accept: '*/*', hidden: true });
  file.onchange = async () => { const f = file.files[0]; file.value = ''; if (!f) return; try { const bytes = new Uint8Array(await f.arrayBuffer()), { payload } = await FB.open(bytes, key.value);
      const m = payload.manifest; if (!confirm(`استعادة ${m.txCount} عملية، صافي الثروة ${L.fmt(m.nw)} د.ع؟ ستستبدل بياناتك الحالية (وتُحفظ لقطة منها 30 يوماً).`)) return;
      await FB.restore(BE, S, bytes, key.value); S = await FStore.load(BE); toast('تمت الاستعادة: ' + m.txCount + ' عملية'); go('home'); } catch (e) { toast(e.message === 'auth' ? 'المفتاح خاطئ أو الملف تالف' : e.message === 'format' ? 'ملف غير صالح' : e.message, true); } };
  box.append(stat, sect('نسخة احتياطية', prep, save, expo), sect('استعادة', h('p', { class: 'mut' }, 'اكتب المفتاح ثم اختر الملف.'), key, h('label', { class: 'btn', onclick: () => file.click() }, 'اختر ملف النسخة'), file,
    btn('التراجع عن آخر استعادة', async () => { try { await FB.undoRestore(BE, S); S = await FStore.load(BE); toast('تم الرجوع'); go('home'); } catch (e) { toast(e.message, true); } }, 'alt mini')));
  return box; }]);
// ===== المرحلة 4: تبويب الأصول (الأسعار، الدولار، الذهب والفضة) =====
const gramsTxt = mg => Math.trunc(mg / 1000) + '.' + String(mg % 1000).padStart(3, '0') + ' غ';
const fineTxt = p => p.metal === 'G' ? 'عيار ' + Math.round(p.fine * 24 / 100) / 100 : 'نقاوة ' + p.fine / 10;
const pieceName = p => (p.label || 'قطعة') + ' · ' + (p.metal === 'G' ? 'ذهب' : 'فضة') + ' ' + fineTxt(p) + ' · ' + gramsTxt(p.mg) + (p.form === 'jewelry' ? ' · مصوغات' : p.form === 'bullion' ? ' · سبيكة/عملة' : '');
const priceDyn = (metalOf, dateK = 'date') => ({ k: 'price', l: 'سعر أونصة المعدن بالدولار في ذلك اليوم', t: 'num', req: true, dyn: (c, v) => { const m = metalOf(v);
  if (!c.dataset.touched && E.okDate(v[dateK]) && S.x.prices.some(x => x[m] != null)) c.value = String(L.priceAt(S, v[dateK])[m] / 100); } });
const lastDate = a => a.length ? ' (' + a[a.length - 1].d + ')' : '';
function ratesBlock() {
  const hasUsd = userAccts(a => a.cur === 'USD').length > 0, f = buildForm([{ k: 'date', l: 'التاريخ', t: 'date', v: L.today(), req: true }, { k: 'rate', l: 'سعر 100 دولار بالدينار (اختياري)', t: 'num' }, { k: 'g', l: 'سعر أونصة الذهب بالدولار (اختياري)', t: 'num' }, { k: 's', l: 'سعر أونصة الفضة بالدولار (اختياري)', t: 'num' }],
    v => act(() => { if (!v.rate.trim() && !v.g.trim() && !v.s.trim()) throw new Error('أدخل سعراً واحداً على الأقل'); if (v.rate.trim()) L.setRate(S, v.date, L.parseAmount(v.rate, 2));
      if (v.g.trim() || v.s.trim()) L.setPrices(S, v.date, { G: v.g.trim() ? L.parseAmount(v.g, 2) : undefined, S: v.s.trim() ? L.parseAmount(v.s, 2) : undefined }); }, 'حُدّثت الأسعار'), 'حدّث');
  const gp = S.x.prices.filter(x => x.G != null), sp = S.x.prices.filter(x => x.S != null);
  return sect('الأسعار وسعر الصرف', h('p', { class: 'mut' }, 'تحديث الأسعار لا يغيّر أي عملية سابقة، بل يغيّر التقييم فقط. سعر كل عملية محفوظ فيها.'),
    row('100 دولار', S.x.rates.length ? L.fmtRate(S.rate) + ' د.ع' + lastDate(S.x.rates) : (hasUsd ? '⚠ لم يُدخل بعد' : 'لم يُدخل')), row('أونصة الذهب', gp.length ? L.fmtUsd(S.price.G) + lastDate(gp) : 'لم تُدخل'), row('أونصة الفضة', sp.length ? L.fmtUsd(S.price.S) + lastDate(sp) : 'لم تُدخل'), f);
}
function usdBlock() { const U = L.usdInfo(S); if (!U.length) return null; const s = E.snap(S);
  return sect('الدولار (متوسط التكلفة)', U.map(u => h('div', { class: 'tx' }, row(u.name, L.fmtUsd(u.bal)), row('متوسط الشراء (لكل 100$)', L.fmtRate(u.avg) + ' د.ع'), row('القيمة الحالية', money(u.mkt)), row('غير محقق', (u.unreal > 0 ? '+' : '') + L.fmt(u.unreal) + ' د.ع'))), row('محقق من الصرف حتى الآن', L.fmt(s.fx) + ' د.ع')); }
function metalsBlock() {
  const P = L.pieces(S), held = P.filter(p => p.held), sold = P.filter(p => !p.held && S.tx.some(t => t.type === 'sell_metal' && t.meta && t.meta.piece === p.id && !t.voided));
  const tot = held.reduce((a, p) => ({ c: a.c + p.cost, t: a.t + p.theo }), { c: 0, t: 0 });
  return sect('الذهب والفضة', btn('شراء قطعة', () => go('assets', 'buy')), btn('قطعة موجودة قبل البدء', () => go('assets', 'old'), 'alt'),
    held.length ? held.map(p => h('div', { class: 'tx' }, h('div', {}, pieceName(p) + (p.buy && p.buy.est ? ' (تكلفة تقديرية)' : '')), row('تكلفتها', money(p.cost)), row('قيمتها المعدنية النظرية', money(p.theo)), row('الفرق (غير محقق)', (p.unreal > 0 ? '+' : '') + L.fmt(p.unreal) + ' د.ع'), btn('بيع', () => go('assets', 'sell', { id: p.id }), 'mini')))
      : h('p', { class: 'mut' }, 'لا قطع محتفَظ بها.'), held.length ? row('المجموع: التكلفة / النظرية', money(tot.c) + ' / ' + money(tot.t)) : null,
    sold.length ? h('div', {}, h('h2', {}, 'مبيعة'), sold.map(p => { const r = L.saleReport(S, p.id); return h('div', { class: 'tx' }, h('div', {}, pieceName(p)), row('النتيجة المحققة', (r.total > 0 ? '+' : '') + L.fmt(r.total) + ' د.ع'), btn('التقرير', () => go('assets', 'report', { id: p.id }), 'mini')); })) : null);
}
const metalFields = (old) => [{ k: 'metal', l: 'المعدن', t: 'select', opts: [['G', 'ذهب'], ['S', 'فضة']] }, { k: 'grams', l: 'الوزن بالغرام (حتى 3 منازل)', t: 'num', req: true },
  { k: 'karat', l: 'العيار (1 إلى 24)', t: 'num', v: '21', req: true, show: v => v.metal === 'G' }, { k: 'mille', l: 'النقاوة من 1000 (مثل 925)', t: 'num', v: '925', req: true, show: v => v.metal === 'S' },
  { k: 'form', l: 'النوع', t: 'select', opts: [['jewelry', 'مصوغات'], ['bullion', 'سبيكة أو عملة']] }, { k: 'label', l: 'وصف القطعة (اختياري)', t: 'text' }];
const metalArgs = v => ({ metal: v.metal, mg: L.parseAmount(v.grams, 3), karat: v.metal === 'G' ? Number(L.norm(v.karat)) : null, mille: v.metal === 'S' ? Number(L.norm(v.mille)) : null, form: v.form, label: v.label.trim() });
function buyForm() { const iq = accOpts(a => a.cur === 'IQD' && a.kind === 'asset');
  return buildForm([{ k: 'date', l: 'التاريخ', t: 'date', v: L.today(), req: true }, ...metalFields(), { k: 'paid', l: 'ما دفعته فعلاً (دينار، شامل الصياغة)', t: 'num', req: true }, { k: 'from', l: 'ادفع من', t: 'select', opts: iq }, priceDyn(v => v.metal), rateDyn('date', () => true)],
    v => act(() => L.buyPiece(S, { ...metalArgs(v), date: v.date, paid: L.parseAmount(v.paid, 0), from: v.from, price: L.parseAmount(v.price, 2), rate: L.parseAmount(v.rate, 2) }), 'سُجّل الشراء').then(r => { if (r) go('assets'); }), 'سجّل الشراء'); }
function oldForm() { return buildForm([...metalFields(), { k: 'cost', l: 'تكلفتها بالدينار إن عرفتها (وإلا تُقدَّر)', t: 'num' }, { ...priceDyn(v => v.metal, 'od'), l: 'سعر الأونصة بالدولار يوم البدء' }, { ...rateDyn('od', () => true), l: 'سعر 100 دولار يوم البدء' }],
  v => act(() => L.addPiece(S, { ...metalArgs(v), cost: v.cost.trim() ? L.parseAmount(v.cost, 0) : 0, price: L.parseAmount(v.price, 2), rate: L.parseAmount(v.rate, 2) }), 'أُضيفت القطعة').then(r => { if (r) go('assets'); }), 'أضف القطعة'); }
function sellForm(id) { const p = L.pieces(S).find(x => x.id === id); if (!p || !p.held) return h('p', {}, 'القطعة غير متاحة للبيع.'); const iq = accOpts(a => a.cur === 'IQD' && a.kind === 'asset');
  return h('div', {}, h('p', {}, pieceName(p)), row('تكلفتها', money(p.cost)), row('قيمتها النظرية الآن', money(p.theo)),
    buildForm([{ k: 'date', l: 'تاريخ البيع', t: 'date', v: L.today(), req: true }, { k: 'proceeds', l: 'مبلغ البيع الفعلي بالدينار', t: 'num', req: true }, { k: 'to', l: 'تذهب النقود إلى', t: 'select', opts: iq }, { k: 'note', l: 'الغرض من البيع / ملاحظة', t: 'text' },
      { ...priceDyn(() => p.metal), l: 'سعر الأونصة بالدولار يوم البيع' }, rateDyn('date', () => true)],
    v => { const pr = L.parseAmount(v.proceeds, 0); if (!confirm(`تأكيد بيع «${p.label || 'القطعة'}» بمبلغ ${L.fmt(pr)} د.ع وسعر أونصة ${v.price}$؟`)) return;
      return act(() => L.sellPiece(S, { date: v.date, id, proceeds: pr, to: v.to, note: v.note, price: L.parseAmount(v.price, 2), rate: L.parseAmount(v.rate, 2) }), 'سُجّل البيع').then(r => { if (r) go('assets', 'report', { id }); }); }, 'أكّد البيع')); }
function reportView(id) { const p = S.pieces[id]; let r; try { r = L.saleReport(S, id); } catch (e) { return h('p', {}, e.message); } const sg = n => n == null ? '—' : (n > 0 ? '+' : '') + L.fmt(n) + ' د.ع';
  return h('div', {}, h('h2', {}, pieceName(p)), row('تاريخ البيع', r.date), row('سعر الشراء الفعلي (التكلفة)', money(r.cost)), row('سعر البيع الفعلي', money(r.proceeds)), row('الربح/الخسارة المحققة', sg(r.total), r.total < 0 ? 'bad' : ''),
    sect('التفكيك', r.market == null ? h('p', { class: 'mut' }, 'لا يتوفر سعر أونصة وقت الشراء، فلا يمكن تفكيك النتيجة.') : null, row('أثر حركة السعر والصرف', sg(r.market)), row('أجور الصياغة الضائعة', sg(r.making == null ? null : -r.making)), row('خصم التاجر عن القيمة المعدنية', sg(r.dealer == null ? null : -r.dealer)),
      r.dealerBp != null ? row('نسبة خصم التاجر الفعلية', (r.dealerBp / 100).toFixed(2) + '%') : null, r.est ? h('p', { class: 'mut' }, 'تكلفة هذه القطعة تقديرية (قيمتها يوم البدء)، فالأجور الضائعة صفر بالتعريف.') : null),
    row('ذهبت النقود إلى', r.to || '—'), r.note ? row('الغرض', r.note) : null, btn('رجوع', () => go('assets'), 'alt')); }
SCREENS.assets = (sub, p) => { if (!S.x.openDate) return h('div', {}, h('h1', {}, 'الأصول'), h('p', {}, 'سجّل الرصيد الافتتاحي أولاً.'));
  if (sub === 'buy') return h('div', {}, btn('رجوع', () => go('assets'), 'alt mini'), h('h1', {}, 'شراء قطعة'), h('p', { class: 'mut' }, 'الدفع بالدينار. للشراء بالدولار حوّل الدولار إلى دينار أولاً.'), buyForm());
  if (sub === 'old') return h('div', {}, btn('رجوع', () => go('assets'), 'alt mini'), h('h1', {}, 'قطعة موجودة قبل البدء'), h('p', { class: 'mut' }, 'تُسجَّل بتاريخ البدء ولا تُحسب دخلاً.'), oldForm());
  if (sub === 'sell') return h('div', {}, btn('رجوع', () => go('assets'), 'alt mini'), h('h1', {}, 'بيع قطعة'), sellForm(p.id));
  if (sub === 'report') return h('div', {}, h('h1', {}, 'تقرير البيع'), reportView(p.id));
  return h('div', {}, h('h1', {}, 'الأصول'), ratesBlock(), usdBlock(), metalsBlock()); };
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
    d.settled ? null : btn('سداد', () => go('more', 'debts', { id: d.id }), 'mini'))) : h('p', { class: 'mut' }, 'لا ديون مسجّلة.'));
  const repay = cur && !cur.settled ? sect('سداد: ' + cur.person, h('p', { class: 'mut' }, 'المتبقي ' + money(cur.remaining)), buildForm([dt(), { k: 'amount', l: 'المبلغ', t: 'num', v: String(cur.remaining), req: true }, { k: 'acct', l: cur.dir === 'lent' ? 'يدخل إلى' : 'يُدفع من', t: 'select', opts: iqOpts() },
      { k: 'fee', l: 'فائدة/رسوم إضافية (اختياري)', t: 'num', show: () => cur.dir === 'borrowed' }], v => act(() => L.debtRepay(S, { id: cur.id, date: v.date, amount: n0(v.amount), acct: v.acct, fee: v.fee && v.fee.trim() ? n0(v.fee) : 0 }), 'سُجّل السداد').then(() => go('more', 'debts')), 'سجّل السداد')) : null;
  const add = sect('دين جديد', h('p', { class: 'mut' }, 'الدين بالدينار. للدولار حوّله إلى دينار أولاً.'), buildForm([dt(), { k: 'dir', l: 'النوع', t: 'select', opts: [['lent', 'أقرضتُ شخصاً'], ['borrowed', 'اقترضتُ من شخص']] }, { k: 'person', l: 'الشخص', t: 'text', req: true }, { k: 'amount', l: 'المبلغ', t: 'num', req: true },
    { k: 'acct', l: 'الحساب', t: 'select', opts: iqOpts() }, { k: 'due', l: 'تاريخ الاستحقاق (اختياري)', t: 'date' }, { k: 'note', l: 'ملاحظة', t: 'text' }], v => act(() => L.debtNew(S, { date: v.date, dir: v.dir, person: v.person, amount: n0(v.amount), acct: v.acct, due: v.due || null, note: v.note }), 'سُجّل الدين'), 'سجّل'));
  return h('div', {}, list, repay, add); }]);
// ---- الجمعيات ----
MORE.push(['jams', 'الجمعيات', () => { const p = view.p, J = S.x.jams.map(j => L.jamState(S, j)), cur = p.id && J.find(j => j.id === p.id);
  if (needAcct()) return needAcct();
  const list = sect('الجمعيات', J.length ? J.map(j => h('div', { class: 'tx' }, h('div', {}, j.name), row('القسط / الحصيلة', money(j.s) + ' / ' + money(j.pot)), row('الحالة', j.done ? 'اكتملت' : j.received ? `قبضتَ. بقي ${j.remaining} قسط (${money(j.remaining * j.s)} التزام)` : `دفعتَ ${j.paid} من ${j.turn} قبل القبض`),
    j.done ? null : h('div', {}, row('القسط القادم', j.next), btn('دفع قسط', () => go('more', 'jams', { id: j.id, mode: 'pay' }), 'mini'), j.received ? null : btn('قبض الحصيلة', () => go('more', 'jams', { id: j.id, mode: 'recv' }), 'mini')))) : h('p', { class: 'mut' }, 'لا جمعيات.'));
  const act1 = cur ? sect(cur.name + ' — ' + (p.mode === 'pay' ? 'دفع قسط' : 'قبض'), buildForm([dt(), { k: 'acct', l: p.mode === 'pay' ? 'يُدفع من' : 'تدخل إلى', t: 'select', opts: iqOpts() }],
    v => act(() => p.mode === 'pay' ? L.jamPay(S, { id: cur.id, from: v.acct, date: v.date }) : L.jamReceive(S, { id: cur.id, to: v.acct, date: v.date }), p.mode === 'pay' ? 'سُجّل القسط' : 'سُجّل القبض').then(() => go('more', 'jams')), 'سجّل')) : null;
  const add = sect('جمعية جديدة', buildForm([{ k: 'name', l: 'الاسم', t: 'text', req: true }, { k: 'N', l: 'عدد الأعضاء', t: 'num', req: true }, { k: 's', l: 'القسط الشهري', t: 'num', req: true }, { k: 'turn', l: 'رقم دورك (شهر القبض)', t: 'num', req: true }, dt('start', 'تاريخ أول قسط')],
    v => act(() => L.jamNew(S, { name: v.name, N: Number(L.norm(v.N)), s: n0(v.s), turn: Number(L.norm(v.turn)), start: v.start }), 'أُنشئت الجمعية'), 'أنشئ'));
  return h('div', {}, list, act1, add); }]);
// ---- الأهداف ----
MORE.push(['goals', 'الأهداف', () => { const p = view.p, G = L.goalView(S), cur = p.id && G.find(g => g.id === p.id);
  const list = sect('الأهداف', G.length ? G.map(g => h('div', { class: 'tx' }, h('div', { class: 'r' }, h('span', {}, g.name + (g.kind === 'long' ? ' (طويل الأمد)' : ' (قصير الأمد)')), h('b', {}, g.pct + '%')),
    row('المخصص / المستهدف', money(g.allocated) + ' / ' + money(g.target)), row('الموعد', g.targetDate + (g.skipped ? ` (مُدِّد ${g.skipped})` : '')), g.done ? h('p', { class: 'okc' }, 'اكتمل الهدف') : h('div', {}, row('القسط الشهري المطلوب', money(g.monthly)), row('المخصص هذا الشهر', money(g.paidMonth)), g.behind > 0 ? row('متأخر عن الخطة', money(g.behind), 'bad') : null),
    btn('تخصيص', () => go('more', 'goals', { id: g.id, mode: 'alloc' }), 'mini'), btn('تحرير', () => go('more', 'goals', { id: g.id, mode: 'release' }), 'mini'),
    !g.done && g.behind > 0 ? btn('تخطَّ شهراً ومدِّد الموعد', () => { if (confirm('تمديد موعد الهدف شهراً بدل بقاء المتأخر مستحقاً؟')) act(() => L.goalSkip(S, g.id), 'مُدِّد الموعد'); }, 'mini alt') : null)) : h('p', { class: 'mut' }, 'لا أهداف.'),
    h('p', { class: 'mut' }, 'التخصيص ظرف افتراضي: لا يحرك أي حساب ولا ينقص صافي الثروة، لكنه ينقص «المتاح للصرف».'));
  const mv = cur ? sect((p.mode === 'alloc' ? 'تخصيص لـ ' : 'تحرير من ') + cur.name, buildForm([dt(), { k: 'amount', l: 'المبلغ', t: 'num', req: true }],
    async v => { const amt = n0(v.amount); if (p.mode === 'alloc') { const w = L.goalAdvice(S, cur.id, amt); if (w.length && !confirm(w.join('\n') + '\nمتابعة؟')) return; }
      await act(() => L.goalMove(S, { id: cur.id, amount: amt, date: v.date, release: p.mode === 'release' }), 'تم'); go('more', 'goals'); }, 'نفّذ')) : null;
  const add = sect('هدف جديد', buildForm([{ k: 'name', l: 'الاسم', t: 'text', req: true }, { k: 'target', l: 'المبلغ المستهدف (دينار)', t: 'num', req: true }, { k: 'targetDate', l: 'الموعد', t: 'date', req: true }, { k: 'priority', l: 'الأولوية', t: 'select', opts: [['1', 'عالية'], ['2', 'متوسطة'], ['3', 'منخفضة']] }, { k: 'kind', l: 'النوع', t: 'select', opts: [['short', 'قصير الأمد'], ['long', 'طويل الأمد']] }],
    v => act(() => L.goalNew(S, { name: v.name, target: n0(v.target), targetDate: v.targetDate, priority: Number(v.priority), kind: v.kind }), 'أُضيف الهدف'), 'أضف'));
  return h('div', {}, list, mv, add); }]);
// ---- المتكررات والراتب ----
MORE.push(['recurring', 'المتكررات والراتب', () => { const p = view.p, D = L.recurDue(S), cur = p.confirm && S.x.recur.find(r => r.id === p.confirm);
  if (needAcct()) return needAcct();
  const conf = cur ? (() => { const amt = h('input', { value: String(cur.amount), inputmode: 'decimal' }), dateIn = h('input', { type: 'date', value: L.today() }), step = d => () => { try { amt.value = String(Math.max(1, n0(amt.value) + d)); } catch (e) { toast(e.message, true); } };
    return sect(cur.salary ? 'هل استلمت الراتب؟' : 'تأكيد: ' + cur.name, h('label', { class: 'f' }, h('span', {}, 'التاريخ'), dateIn), h('label', { class: 'f' }, h('span', {}, 'المبلغ (عدّله إن اختلف)'), amt),
      cur.salary ? h('div', {}, btn('+ 50,000', step(50000), 'alt mini'), btn('− 50,000', step(-50000), 'alt mini')) : null,
      btn('سجّل', () => act(() => L.recurConfirm(S, { id: cur.id, date: dateIn.value, amount: n0(amt.value) }), 'سُجّل').then(() => go('more', 'recurring'))), btn('تخطَّ هذا الشهر', () => act(() => L.recurSkip(S, cur.id), 'تُخطّي').then(() => go('more', 'recurring')), 'alt'), btn('ليس الآن', () => go('more', 'recurring'), 'alt')); })() : null;
  const due = !cur && D.length ? dueBlock() : null;
  const all = sect('كل البنود', S.x.recur.length ? S.x.recur.map(r => h('div', { class: 'tx' + (r.active ? '' : ' void') }, row(r.name + (r.salary ? ' (راتب)' : ''), money(r.amount)), h('div', { class: 'mut' }, (r.kind === 'income' ? 'دخل' : 'مصروف') + ` · يوم ${r.day} · تذكير قبل ${r.remind} أيام · ` + (r.active ? 'فعّال' : 'موقوف')),
    btn(r.active ? 'أوقف' : 'فعّل', () => act(() => L.recurToggle(S, r.id)), 'mini alt'), btn('احذف', () => { if (confirm('حذف هذا البند؟ لا تُحذف عملياته المسجّلة.')) act(() => L.recurDelete(S, r.id)); }, 'mini alt'))) : h('p', { class: 'mut' }, 'لا بنود. يظهر التذكير داخل التطبيق فقط عند فتحه.'));
  const add = sect('بند جديد', buildForm([{ k: 'kind', l: 'النوع', t: 'select', opts: [['expense', 'مصروف متكرر'], ['income', 'دخل متكرر (راتب)']] }, { k: 'name', l: 'الاسم', t: 'text', req: true }, { k: 'amount', l: 'المبلغ المتوقع', t: 'num', req: true },
    { k: 'acct', l: 'الحساب', t: 'select', opts: iqOpts() }, { k: 'cat', l: 'الفئة', t: 'select', opts: L.CATS.map(c => [c[0], c[1]]), show: v => v.kind === 'expense' }, { k: 'src', l: 'المصدر', t: 'select', opts: [['inc_salary', 'الراتب'], ['inc_other', 'دخل آخر']], show: v => v.kind === 'income' },
    { k: 'day', l: 'يوم الشهر (1 إلى 28)', t: 'num', req: true }, { k: 'remind', l: 'التذكير قبل كم يوماً (0 إلى 7)', t: 'num', v: '2', req: true }, { k: 'salary', l: 'هل هو الراتب؟', t: 'select', opts: [['0', 'لا'], ['1', 'نعم']], show: v => v.kind === 'income' }],
    v => act(() => L.recurNew(S, { kind: v.kind, name: v.name, amount: n0(v.amount), acct: v.acct, cat: v.kind === 'expense' ? v.cat : null, src: v.kind === 'income' ? v.src : null, day: Number(L.norm(v.day)), remind: Number(L.norm(v.remind)), salary: v.kind === 'income' && v.salary === '1' }), 'أُضيف البند'), 'أضف'));
  return h('div', {}, conf, due, all, add); }]);
// ===== المرحلة 6: شاشة الحالة (الرئيسية)، الشريط المتحرك، التقارير، حدود التنبيه =====
let tickTimer = null;
const sgn = n => n == null ? '—' : (n > 0 ? '+' : '') + L.fmt(n) + ' د.ع';
function tickerBlock(st) { clearInterval(tickTimer); let i = 0, items = st.ticker; const lv = k => (st.alerts[k] || {}).lv;
  const box = h('div', { class: 'ticker' }), set = () => { box.textContent = items[i % items.length]; box.className = 'ticker' + (i % items.length < st.alerts.length ? (lv(i % items.length) === 'red' ? ' alert' : lv(i % items.length) === 'warn' ? ' warn' : '') : ''); };
  set(); if (items.length > 1) tickTimer = setInterval(() => { if (!document.body || !box.isConnected) return clearInterval(tickTimer); i++; set(); }, 5000); return box; }
SCREENS.home = () => {
  if (!S.x.openDate) return h('div', {}, h('h1', {}, 'فلوسي'), sect('', h('p', {}, 'مرحباً. ابدأ بتسجيل الرصيد الافتتاحي لتبدأ التقارير بأرقام صحيحة.'), btn('ابدأ الرصيد الافتتاحي', () => go('accts', 'open'))));
  const st = L.status(S), hide = S.x.set.hideNw && !view.reveal, mask = v => hide ? '••••••' : v;
  return h('div', {}, h('h1', {}, 'فلوسي'), tickerBlock(st),
    sect('المتاح للصرف', h('div', { class: 'big ' + (st.level === 'red' ? 'badc' : st.level === 'ok' ? 'okc' : ''), onclick: () => go('more', 'reports') }, money(st.avail)), row('السائل', money(st.liq)),
      row('دخل هذا الشهر', money(st.income)), row('مصروف هذا الشهر', money(st.expense)), row('المتبقي من دخل الشهر', sgn(st.left))),
    st.alerts.length ? sect('تنبيهات', st.alerts.slice(0, 6).map(a => h('div', { class: 'ticker ' + (a.lv === 'red' ? 'alert' : a.lv === 'warn' ? 'warn' : ''), onclick: () => go(a.go[0], a.go[1] || null) }, a.t))) : null,
    nwBlock(), acctList());
};
const monthsList = () => { const od = S.x.openDate; if (!od) return []; const out = []; let k = L.mkey(od); const last = L.mkey(L.today()); for (let i = 0; i < 1200 && k <= last; i++, k = L.addMonths(k + '-01', 1).slice(0, 7)) out.push(k); return out.reverse(); };
function monthView(k) { let r; try { r = L.monthReport(S, k); } catch (e) { return h('p', {}, e.message); }
  const catRows = Object.entries(r.cat).sort((a, b) => b[1] - a[1]).map(([n, v]) => row(n, money(v))), flowRows = Object.entries(r.flows).map(([t, v]) => row(L.FLOW[t] || t, sgn(v)));
  const prev = (() => { try { return L.monthReport(S, L.prevMonth(k)); } catch (e) { return null; } })();
  return h('div', {}, r.sinceStart ? h('p', { class: 'mut' }, 'هذا أول شهر: المقارنة من لحظة الرصيد الافتتاحي.') : null,
    sect('الدخل والمصروف', row('الدخل', money(r.income)), row('المصروف', money(r.expense)), row('الوفر', sgn(r.savings)), prev ? row('المصروف قبل شهر', money(prev.expense) + (r.expense > prev.expense ? ' ▲' : r.expense < prev.expense ? ' ▼' : '')) : null),
    sect('المصروف حسب الفئة', catRows.length ? catRows : h('p', { class: 'mut' }, 'لا مصروفات.')),
    sect('جسر صافي الثروة', row('أول الشهر', money(r.nw0)), row('+ الدخل − المصروف', sgn(r.income - r.expense)), row('+ المحقق (معادن وصرف)', sgn(r.realized)), row('+ فروقات المطابقة', sgn(r.adj)), row('+ التغير غير المحقق (أسعار)', sgn(r.dU)), row('= آخر الشهر', money(r.nw1)), row('التغير', sgn(r.dNw)),
      h('p', { class: r.bridgeOk ? 'okc' : 'badc' }, r.bridgeOk ? '✓ المعادلة متطابقة' : '✗ المعادلة مختلة')),
    sect('حركة السيولة', flowRows.length ? flowRows : h('p', { class: 'mut' }, 'لا حركة.'), row('صافي حركة السيولة', sgn(r.liqNet))));
}
function yearView(y) { const r = L.yearReport(S, y); if (!r.months.length) return h('p', { class: 'mut' }, 'لا بيانات لهذه السنة.'); const t = r.tot;
  return h('div', {}, sect('ملخص ' + y, row('الدخل', money(t.income)), row('المصروف', money(t.expense)), row('الوفر', sgn(t.savings)), row('شراء معادن', money(t.buys)), row('بيع معادن', money(t.sales)), row('محقق', sgn(t.realized)), row('مطابقة', sgn(t.adj)), row('غير محقق', sgn(t.dU)), row('صافي الثروة أول الفترة', money(t.nwStart)), row('صافي الثروة آخر الفترة', money(t.nwEnd))),
    sect('الأشهر', h('table', {}, h('tr', {}, h('th', {}, 'الشهر'), h('th', {}, 'الدخل'), h('th', {}, 'المصروف'), h('th', {}, 'الثروة')), r.months.map(m => h('tr', {}, h('td', {}, m.month), h('td', {}, L.fmt(m.income)), h('td', {}, L.fmt(m.expense)), h('td', {}, L.fmt(m.nw1)))))));
}
MORE.push(['reports', 'التقارير والحدود', () => { const ms = monthsList(); if (!ms.length) return h('p', {}, 'سجّل الرصيد الافتتاحي أولاً.'); const p = view.p, mode = p.mode || 'month', k = p.k || ms[0], y = p.y || +L.today().slice(0, 4);
  const stale = L.snapStale(S), bd = L.budget(S);
  const tabs = seg([['month', 'شهري'], ['year', 'سنوي'], ['limits', 'الحدود']], mode, m => go('more', 'reports', { mode: m, k, y }));
  const body = mode === 'year' ? h('div', {}, seg([[y - 1, String(y - 1)], [y, String(y)]], y, v => go('more', 'reports', { mode, k, y: +v })), yearView(y))
    : mode === 'limits' ? h('div', {}, h('p', { class: 'mut' }, 'نسب افتراضية من دخل الشهر، وهي قواعد بسيطة قابلة للتعديل وليست استشارة مالية. عدّلها بما يناسبك.'), bd.map(x => h('div', { class: 'tx' }, row(x.g, x.pct + '% = ' + money(x.limit)), row('المصروف هذا الشهر', money(x.spent), x.over ? 'bad' : ''),
        h('label', { class: 'f' }, h('span', {}, 'النسبة %'), h('input', { value: String(x.pct), inputmode: 'numeric', onchange: e => act(() => L.setLimit(S, x.g, Number(L.norm(e.target.value))), 'حُفظ الحد') })))))
    : h('div', {}, h('label', { class: 'f' }, h('span', {}, 'الشهر'), h('select', { onchange: e => go('more', 'reports', { mode: 'month', k: e.target.value }) }, ms.map(m => h('option', { value: m, selected: m === k }, m)))), monthView(k));
  return h('div', {}, stale.length ? sect('أشهر تغيّرت بعد إغلاقها', stale.map(m => h('div', { class: 'r' }, h('span', {}, m + ' (' + sgn(S.x.snaps[m].stale.diff) + ')'), btn('اعتمد', () => act(() => L.acceptSnap(S, m), 'اعتُمد'), 'mini')))) : null, tabs, body); }]);
// ===== «المزيد»: الإعدادات والاختبار الذاتي (وتُضاف إليه صفحات المراحل التالية) =====
MORE.push(['settings', 'الإعدادات', () => { const st = S.x.set;
  return h('div', {}, sect('طريقة التقييم', h('p', { class: 'mut' }, 'محافظ: المعادن بقيمتها النظرية والدولار بسعر التقييم. بالتكلفة: لا أرباح غير محققة.'),
    seg([['conservative', 'محافظ'], ['cost', 'بالتكلفة']], st.valuation, k => act(() => { st.valuation = k; }, 'تم'))),
    sect('الخصوصية', seg([['1', 'إخفاء صافي الثروة'], ['0', 'إظهاره']], st.hideNw ? '1' : '0', k => act(() => { st.hideNw = k === '1'; }, 'تم'))),
    sect('الإصدار', row('التطبيق', VER), h('p', { class: 'mut' }, 'قاعدة البيانات: flousi (محلية على هذا الهاتف). فحوصات المرحلة 0 في الصفحة المنفصلة:'), h('a', { href: 'diagnostics.html', class: 'btn' }, 'فتح صفحة الفحوصات'))); }]);
MORE.push(['selftest', 'الاختبار الذاتي', () => { const box = h('div', {}), out = h('div', {});
  const show = (r1, r2) => { const all = [...r1.results, ...r2.results], ok = all.filter(x => x.ok).length; out.replaceChildren(h('div', { class: 'big ' + (ok === all.length ? 'okc' : 'badc') }, ok + ' من ' + all.length),
    ...all.map(x => h('div', { class: 'tx' + (x.ok ? '' : ' bad') }, (x.ok ? '✓ ' : '✗ ') + x.id + ' ' + x.name + (x.ok ? '' : ' — ' + x.msg))));
    out._txt = VER + '\n' + all.map(x => (x.ok ? '✓ ' : '✗ ') + x.id + ' ' + x.name + (x.ok ? '' : ' — ' + x.msg)).join('\n') + '\nالنتيجة: ' + ok + ' من ' + all.length; };
  box.append(sect('الاختبار الذاتي', h('p', { class: 'mut' }, 'يشغّل اختبارات المحرك والتخزين على قاعدة مؤقتة في الذاكرة، ولا يمس بياناتك.'),
    btn('شغّل الاختبارات', async () => { out.replaceChildren('…'); show(FSelfTest.run(), await FSelfTest2.run()); }),
    btn('انسخ النتيجة', async () => { if (out._txt) { try { await navigator.clipboard.writeText(out._txt); toast('نُسخت النتيجة'); } catch (e) { toast('تعذّر النسخ', true); } } }, 'alt'), out)); return box; }]);
SCREENS.more = (sub) => { const m = MORE.find(x => x[0] === sub);
  if (m) return h('div', {}, btn('رجوع', () => go('more'), 'alt mini'), h('h1', {}, m[1]), m[2]());
  return h('div', {}, h('h1', {}, 'المزيد'), sect('', MORE.map(x => h('button', { class: 'lnk', onclick: () => go('more', x[0]) }, x[1])))); };
// ===== الإطار: التنقل والإقلاع =====
const TABS = [['home', 'الحالة'], ['ops', 'العمليات'], ['accts', 'الحسابات'], ['assets', 'الأصول'], ['more', 'المزيد']];
function render() {
  const app = $('#app'); app.replaceChildren(); const scr = SCREENS[view.tab] || SCREENS.home, bb = S.x.openDate && view.sub !== 'backup' ? backupBanner() : null; app.append(...[bb, scr(view.sub, view.p)].filter(Boolean)); // append(null) في المتصفح يكتب النص null
  if (S.x.openDate && !sessionDismiss && FB.status(S).level === 'block') { sessionDismiss = true; if (confirm('مضى أكثر من 14 يوماً على آخر نسخة احتياطية. فتح صفحة النسخ الآن؟')) { view = { tab: 'more', sub: 'backup', p: {} }; return render(); } }
  $('#nav').replaceChildren(...TABS.map(([k, t]) => h('button', { class: k === view.tab ? 'on' : '', onclick: () => go(k) }, t)));
}
(async () => {
  try { BE = FStore.idb(); S = await FStore.load(BE); } catch (e) { $('#app').textContent = 'تعذّر فتح التخزين: ' + e.message; return; }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if (lockOn()) showLock(); else unlocked = true;
  if (S.x.openDate) { try { await FStore.run(BE, S, () => L.snapMonths(S)); } catch (e) {} }
  render();
})();
