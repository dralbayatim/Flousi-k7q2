'use strict';
// ===== f1-v4.14: تبويب «العمليات» — لوحة الأرقام للمصروف والدخل والتحويل، و«لماذا قررت؟» =====
// كل حفظ يمر بالدوال المحاسبية نفسها (L.income، L.transfer، L.expense). التحويل يبقى عملية مستقلة بين حسابين، لا دخلاً ولا مصروفاً.
const QI = { amt: '', src: 'inc_salary', acct: null, day: 'today', date: '', note: '', rate: '' };
const QT = { amt: '', amt2: '', from: null, to: null, day: 'today', date: '', note: '', rate: '', touched2: false };
const fmtAmtStr = s => s ? (s.includes('.') ? s.split('.')[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + s.split('.')[1] : s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')) : '0';
// لوحة أرقام عامة: st.amt نص المبلغ، usd() هل الحساب بالدولار، onChange بعد كل ضغطة
function numPad(st, usd, onChange) { const disp = h('div', { class: 'qamt', 'aria-live': 'polite' });
  const show = () => { disp.replaceChildren(h('b', {}, fmtAmtStr(st.amt)), h('span', {}, usd() ? ' $' : ' د.ع')); if (onChange) onChange(); };
  const key = k => () => { let s = st.amt; if (k === '⌫') s = s.slice(0, -1); else if (k === '.') { if (!usd() || s.includes('.')) return; s = (s || '0') + '.'; }
    else { if (s.includes('.') && s.split('.')[1].length >= 2) return; if (s === '0') s = ''; s = (s + k).slice(0, 15); } st.amt = s; show(); };
  const pad = h('div', { class: 'qpad noswipe' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', usd() ? '.' : '000', '0', '⌫'].map(k => h('button', { type: 'button', class: 'qk2', onclick: key(k), 'aria-label': k === '⌫' ? 'مسح' : k }, k)));
  show(); return { disp, pad, show }; }
const dayOf = st => st.day === 'today' ? L.today() : st.day === 'yest' ? daysAgo(1) : (st.date || L.today());
const daySeg = st => [h('label', { class: 'f' }, h('span', {}, 'التاريخ'), seg([['today', 'اليوم'], ['yest', 'أمس'], ['other', 'تاريخ آخر']], st.day, k => { st.day = k; render(); })),
  st.day === 'other' ? h('input', { type: 'date', max: L.today(), value: st.date || L.today(), onchange: e => { st.date = e.target.value; } }) : null];
const acctChips = (A, cur, pick, attr) => h('div', { class: 'qcats noswipe' }, A.map(([id, n]) => h('button', { type: 'button', class: 'chipb' + (id === cur ? ' on' : ''), [attr]: id, onclick: () => pick(id) }, n)));
const emptyAmt = s => !s || /^0*\.?0*$/.test(s);
// ---- الدخل ----
function incomePad() { const A = accOpts(); if (!A.length) return h('p', { class: 'mut' }, 'أنشئ حساباً أولاً من «أموالي».');
  if (!QI.acct || !A.some(a => a[0] === QI.acct)) QI.acct = A[0][0];
  const usd = () => S.acc[QI.acct].cur === 'USD', rateIn = h('input', { inputmode: 'decimal', placeholder: 'سعر 100 دولار بالدينار', value: QI.rate, oninput: e => { QI.rate = e.target.value; } });
  const rateL = h('label', { class: 'f' }, h('span', {}, 'سعر 100 دولار بالدينار في ذلك اليوم'), rateIn);
  const P = numPad(QI, usd, () => { rateL.hidden = !usd(); if (usd() && !rateIn.value && S.x.rates.length) rateIn.value = String(L.rateAt(S, dayOf(QI)) / 100); });
  const done = async () => { try { if (emptyAmt(QI.amt)) throw new Error('اكتب المبلغ'); const amount = L.parseAmount(QI.amt, usd() ? 2 : 0), d = dayOf(QI), a = QI.acct, src = QI.src, r = usd() ? L.parseAmount(rateIn.value, 2) : null;
      const id = await saveTx(() => L.income(S, { date: d, acct: a, src, amount, r, note: QI.note.trim() }), 'دخل ' + amtStr(amount, S.acc[a].cur) + ' · ' + (src === 'inc_salary' ? 'الراتب' : 'دخل آخر'));
      if (id) { Object.assign(QI, { amt: '', note: '', rate: '', day: 'today' }); if (src === 'inc_salary') pyfAfterSalary(amount, a, d); else render(); } } catch (e) { toast(e.message || String(e), true); } };
  return h('div', { class: 'qx qi' }, sect('', P.disp, P.pad),
    sect('المصدر', h('div', { class: 'qcats' }, [['inc_salary', 'الراتب'], ['inc_other', 'دخل آخر']].map(([k, t]) => h('button', { type: 'button', class: 'chipb' + (QI.src === k ? ' on' : ''), 'data-src': k, onclick: () => { QI.src = k; render(); } }, t)))),
    sect('يدخل إلى', acctChips(A, QI.acct, id => { QI.acct = id; QI.amt = ''; QI.rate = ''; render(); }, 'data-acct'), rateL, ...daySeg(QI),
      h('input', { placeholder: 'ملاحظة (اختياري)', value: QI.note, oninput: e => { QI.note = e.target.value; } }), btn('تم', done, 'prim'))); }
// ---- التحويل: بطاقة «من» وبطاقة «إلى». إن اختلفت العملتان يظهر المبلغ المستلم محسوباً بالسعر المعتمد (قابل للتعديل) ----
function transferPad() { const A = accOpts(); if (A.length < 2) return h('p', { class: 'mut' }, 'التحويل يحتاج حسابين. أضف حساباً من «أموالي» ← «+ إضافة».');
  if (!QT.from || !A.some(a => a[0] === QT.from)) QT.from = A[0][0]; if (!QT.to || QT.to === QT.from || !A.some(a => a[0] === QT.to)) QT.to = A.find(a => a[0] !== QT.from)[0];
  const F = S.acc[QT.from], Tt = S.acc[QT.to], diff = F.cur !== Tt.cur, bothUsd = F.cur === 'USD' && Tt.cur === 'USD', usd = () => F.cur === 'USD';
  const amt2 = h('input', { inputmode: 'decimal', value: QT.amt2, oninput: e => { QT.amt2 = e.target.value; QT.touched2 = true; } }), rateIn = h('input', { inputmode: 'decimal', value: QT.rate, oninput: e => { QT.rate = e.target.value; } });
  const auto = () => { if (!diff || QT.touched2 || !S.x.rates.length) return; let a; try { a = L.parseAmount(QT.amt || '0', usd() ? 2 : 0); } catch (e) { return; } if (!a) { amt2.value = ''; QT.amt2 = ''; return; }
    const r = S.rate, v = F.cur === 'IQD' ? Number(E.rd(BigInt(a) * 1000000n, BigInt(r))) : E.usdToIqd(a, r); QT.amt2 = Tt.cur === 'USD' ? (v / 100).toFixed(2) : String(v); amt2.value = QT.amt2; };
  const P = numPad(QT, usd, auto); if (bothUsd && !QT.rate && S.x.rates.length) { QT.rate = String(L.rateAt(S, dayOf(QT)) / 100); rateIn.value = QT.rate; }
  const swap = () => { const f = QT.from; QT.from = QT.to; QT.to = f; QT.amt = ''; QT.amt2 = ''; QT.touched2 = false; render(); };
  const done = async () => { try { if (emptyAmt(QT.amt)) throw new Error('اكتب المبلغ'); if (QT.from === QT.to) throw new Error('اختر حسابين مختلفين');
      const amount = L.parseAmount(QT.amt, decOf(QT.from)), amount2 = diff ? L.parseAmount(QT.amt2, decOf(QT.to)) : 0, r = bothUsd ? L.parseAmount(QT.rate, 2) : null, d = dayOf(QT), f = QT.from, t = QT.to;
      if (diff && !(amount2 > 0)) throw new Error('اكتب المبلغ المستلم بعملة ' + S.acc[t].name);
      const id = await saveTx(() => L.transfer(S, { date: d, from: f, to: t, amount, amount2, r, note: QT.note.trim() }), 'تحويل ' + amtStr(amount, S.acc[f].cur) + ' · ' + S.acc[f].name + ' ← ' + S.acc[t].name);
      if (id) { Object.assign(QT, { amt: '', amt2: '', note: '', touched2: false, day: 'today' }); render(); } } catch (e) { toast(e.message || String(e), true); } };
  return h('div', { class: 'qx qt' }, sect('', P.disp, P.pad),
    sect('', h('div', { class: 'tpair' }, h('div', { class: 'tend' }, h('small', {}, 'من'), h('b', {}, F.name)), h('button', { type: 'button', class: 'tswap', 'aria-label': 'بدّل الاتجاه', onclick: swap }, '⇄'), h('div', { class: 'tend' }, h('small', {}, 'إلى'), h('b', {}, Tt.name))),
      h('label', { class: 'f' }, h('span', {}, 'من'), acctChips(A, QT.from, id => { QT.from = id; if (QT.to === id) QT.to = A.find(a => a[0] !== id)[0]; QT.amt = ''; QT.amt2 = ''; QT.touched2 = false; render(); }, 'data-from')),
      h('label', { class: 'f' }, h('span', {}, 'إلى'), acctChips(A.filter(a => a[0] !== QT.from), QT.to, id => { QT.to = id; QT.amt2 = ''; QT.touched2 = false; render(); }, 'data-to')),
      diff ? h('label', { class: 'f' }, h('span', {}, 'المبلغ المستلم فعلاً بعملة «' + Tt.name + '»' + (S.x.rates.length ? ' (محسوب بالسعر المعتمد ويمكن تعديله)' : '')), amt2) : null,
      bothUsd ? h('label', { class: 'f' }, h('span', {}, 'سعر 100 دولار في ذلك اليوم'), rateIn) : null, ...daySeg(QT),
      h('input', { placeholder: 'ملاحظة (اختياري)', value: QT.note, oninput: e => { QT.note = e.target.value; } }), btn('تم', done, 'prim'),
      h('p', { class: 'mut' }, 'التحويل بين حساباتك لا يُحسب دخلاً ولا مصروفاً.')),
    sect('', fold('حاسبة الدينار والدولار، واعتماد سعر جديد', view.p.kind === 'fx', fxForm()))); }
// ---- «لماذا قررت؟»: سبب اختياري للعمليات الكبيرة، يُحفظ في S.x.set.decs (حقل اختياري داخل النسخة الاحتياطية، لا يمس العمليات ولا القيود) ----
const BIG_IQD = 250000, BIG_TYPES = ['buy_metal', 'sell_metal', 'buy_stock', 'sell_stock', 'convert'];
const txAmt = id => postsOf(id).reduce((s, p) => s + Math.max(p.iqd, 0), 0);
const isConvert = t => t.type === 'transfer' && new Set(postsOf(t.id).map(p => S.acc[p.a].cur)).size > 1;
function txBig(id) { const t = S.tx.find(x => x.id === id); if (!t || t.voided || t.reverses) return false; if (BIG_TYPES.includes(t.type) || isConvert(t)) return true;
  return ['expense', 'transfer'].includes(t.type) && txAmt(id) >= BIG_IQD; }
const decs = () => S.x.set.decs || [];
const decOfTx = id => decs().find(d => d.tx === id);
const whyBtn = id => typeof txBig === 'function' && txBig(id) && !decOfTx(id) ? ['لماذا قررت؟', () => go('insights', 'decisions', { tx: id })] : null;
function whyOffer(id) { const w = whyBtn(id); if (w) snack('سُجّلت العملية', null, w); }
// ---- الشاشة ----
SCREENS.ops = (sub) => { if (sub === 'edit') return editScreen(view.p.id); const p = view.p, kind = p.kind || 'expense';
  if (!p._in) { p._in = 1; if (p.acct) { if (kind === 'income') QI.acct = p.acct; else QX.acct = p.acct; } if (p.from) { QT.from = p.from; QT.to = null; } }
  const body = kind === 'income' ? incomePad() : kind === 'transfer' || kind === 'fx' ? transferPad()
    : kind === 'reconcile' ? h('div', {}, sect('', h('p', { class: 'mut' }, 'المطابقة صارت من «أموالي» ← بطاقة الحساب ← «طابق الرصيد»، وفيها خيار «الخُردة». هذا النموذج يبقى للتسوية المباشرة.'), btn('افتح أموالي', () => go('accts'), 'alt mini')), sect('مطابقة نقد', opsForm('reconcile')))
    : h('div', {}, reconBar(), quickExpense());
  const tab = ['income', 'transfer'].includes(kind) ? kind : kind === 'fx' ? 'transfer' : kind === 'reconcile' ? null : 'expense';
  return h('div', {}, h('h1', {}, 'عملية جديدة'), seg([['expense', 'مصروف'], ['income', 'دخل'], ['transfer', 'تحويل']], tab, k => go('ops', null, { kind: k })), body, txList2()); };
