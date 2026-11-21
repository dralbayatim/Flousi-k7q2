'use strict'; // جزء من الواجهة (f1-v4.13): مقسوم حرفياً من app.js بالترتيب نفسه
// ===== f1-v4.5 (المرحلة 2): الأسهم في «الأصول» (12، 13) — الحساب في stocks.js =====
const qTxt = q => (q / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 }), pTxt = (p, cur) => cur === 'USD' ? L.fmtUsd(p) : money(p), pAmt = (s, cur) => L.parseAmount(s, cur === 'USD' ? 2 : 0);
function stocksBlock() { const X = FSK.view(S).filter(x => !x.hidden), live = X.filter(x => x.qty > 0), tm = live.reduce((a, x) => a + x.mkt, 0), tu = live.reduce((a, x) => a + x.unreal, 0), rz = FSK.realized(S);
  return sect('الأسهم', h('p', { class: 'mut' }, 'الأسعار يدوية تحدّثها أنت. الشراء تحويل من حسابك وليس مصروفاً.'), btn('+ سهم جديد', () => go('assets', 'stock', { mode: 'new' })),
    X.length ? X.map(x => h('div', { class: 'tx', 'data-stock': x.id }, h('div', {}, h('b', {}, x.name), ' · ' + (x.cur === 'USD' ? 'بالدولار' : 'بالدينار')),
      row('العدد', qTxt(x.qty)), x.qty > 0 ? row('متوسط الشراء للسهم', money(x.avg)) : null, x.price != null ? row('آخر سعر · ' + nWhen(x.priceDate), pTxt(x.price, x.cur)) : null,
      x.qty > 0 ? row('القيمة الحالية', money(x.mkt) + (x.cur === 'USD' ? ' (' + L.fmtUsd(x.mktNative) + ')' : '')) : null, x.qty > 0 ? row('التكلفة', money(x.cost)) : null,
      x.qty > 0 ? row(ti('غير محقق'), sgn(x.unreal), x.unreal < 0 ? 'bad' : '') : null, x.realized ? row(ti('محقق من البيع', 'محقق'), sgn(x.realized), x.realized < 0 ? 'bad' : '') : null,
      h('div', { class: 'quick' }, btn('شراء', () => go('assets', 'stock', { mode: 'buy', id: x.id }), 'mini'), x.qty > 0 ? btn('بيع', () => go('assets', 'stock', { mode: 'sell', id: x.id }), 'mini') : null,
        x.qty > 0 ? btn('حدّث السعر', () => go('assets', 'stock', { mode: 'price', id: x.id }), 'mini alt') : null,
        x.qty === 0 && !S.tx.some(t => t.meta && t.meta.stock === x.id && !t.voided && !t.reverses) ? btn('إخفاء', () => act(() => { S.acc[x.id].hidden = true; }, 'أُخفي السهم'), 'mini alt') : null)))
      : emptyState('📈', 'لا أسهم بعد', 'أضف سهماً بزر «+ سهم جديد» لتتابع قيمته وربحك.'),
    live.length ? h('div', {}, row('مجموع القيمة الحالية', money(tm)), row(ti('مجموع غير المحقق', 'غير محقق'), sgn(tu), tu < 0 ? 'bad' : '')) : null, rz ? row(ti('محقق من الأسهم حتى الآن', 'محقق'), sgn(rz), rz < 0 ? 'bad' : '') : null); }
function stockScreen(mode, id) { const st = id ? FSK.list(S).find(x => x.id === id) : null, nm = st ? S.acc[id].name : '', back = backBtn(() => go('accts', 'stocks'));
  const pay = accOpts(a => a.kind === 'asset' && a.liquid), isUsd = k => k && S.acc[k] && S.acc[k].cur === 'USD', done = r => { if (r) go('accts', 'stocks'); };
  if (!pay.length) return h('div', {}, back, h('p', { class: 'mut' }, 'أنشئ حساباً سائلاً أولاً (نقد أو فيزا أو دولار).'));
  // المدفوع/المستلم: إن كانت عملة الحساب مثل عملة السهم يُحسب تلقائياً (العدد × السعر) ويمكن تعديله للعمولة؛ وإلا فهو مطلوب
  const amtF = (k, l, acctK, curOf) => ({ k, l, t: 'num', dyn: (c, v) => { const same = S.acc[v[acctK]] && (S.acc[v[acctK]].cur === curOf(v)); c.placeholder = same ? 'فارغ = العدد × السعر' : 'مطلوب: بعملة الحساب (' + (isUsd(v[acctK]) ? 'دولار' : 'دينار') + ')'; } });
  const amtOf = (v, k, acctK, cur) => { if (String(v[k] || '').trim()) return L.parseAmount(v[k], isUsd(v[acctK]) ? 2 : 0); if ((isUsd(v[acctK]) ? 'USD' : 'IQD') !== cur) throw new Error('اكتب المبلغ بعملة الحساب'); return FSK.native(L.parseAmount(v.qty, 3), pAmt(v.price, cur)); };
  const rt = (v, k) => isUsd(v[k]) ? L.parseAmount(v.rate, 2) : null;
  if (mode === 'new') return h('div', {}, back, h('h1', {}, 'سهم جديد'), buildForm([{ k: 'name', l: 'اسم السهم أو الشركة', t: 'text', req: true }, { k: 'cur', l: 'عملة السعر', t: 'select', opts: [['IQD', 'دينار'], ['USD', 'دولار']] },
      { k: 'how', l: 'كيف صار عندك؟', t: 'select', opts: [['buy', 'اشتريته الآن من حساب'], ['old', 'كان عندي قبل البدء (' + S.x.openDate + ')']] }, { k: 'qty', l: 'عدد الأسهم (حتى 3 منازل)', t: 'num', req: true },
      { k: 'price', l: 'سعر السهم عند الشراء (بعملة السعر)', t: 'num', req: true, dyn: (c, v) => { c.parentNode.firstChild.textContent = v.how === 'old' ? 'متوسط سعر شراء السهم (بعملة السعر)' : 'سعر السهم عند الشراء (بعملة السعر)'; } },
      { k: 'date', l: 'تاريخ الشراء', t: 'date', v: L.today(), req: true, show: v => v.how === 'buy' }, { k: 'from', l: 'دُفع من', t: 'select', opts: pay, show: v => v.how === 'buy' },
      { ...amtF('paid', 'المدفوع فعلاً شاملاً العمولة', 'from', v => v.cur), show: v => v.how === 'buy' }, { ...rateDyn('date', v => v.how === 'buy' && isUsd(v.from)) },
      { k: 'today', l: 'سعر السهم اليوم (اختياري)', t: 'num' }],
    v => act(() => { const nid = FSK.add(S, { name: v.name, cur: v.cur }), q = L.parseAmount(v.qty, 3), p = pAmt(v.price, v.cur);
      if (v.how === 'old') FSK.addOld(S, { id: nid, qty: q, avg: p }); else FSK.buy(S, { id: nid, date: v.date, qty: q, price: p, from: v.from, paid: amtOf(v, 'paid', 'from', v.cur), r: rt(v, 'from') });
      if (String(v.today || '').trim()) FSK.setPrice(S, nid, L.today(), pAmt(v.today, v.cur)); return nid; }, 'أُضيف السهم').then(done), 'أضف السهم'));
  if (!st) return h('div', {}, back, h('p', {}, 'السهم غير موجود.'));
  const cur = st.cur, held = FSK.qtyAt(S, id), head = h('p', { class: 'mut' }, 'تملك ' + qTxt(held) + ' سهماً · العملة: ' + (cur === 'USD' ? 'دولار' : 'دينار'));
  if (mode === 'price') return h('div', {}, back, h('h1', {}, 'سعر «' + nm + '»'), head, buildForm([dt(), { k: 'price', l: 'سعر السهم (بعملة السعر)', t: 'num', req: true }],
    v => act(() => FSK.setPrice(S, id, v.date, pAmt(v.price, cur)), 'حُدّث السعر').then(() => go('accts', 'stocks')), 'حدّث'));
  if (mode === 'sell') return h('div', {}, back, h('h1', {}, 'بيع «' + nm + '»'), head, buildForm([dt('date', 'تاريخ البيع'), { k: 'qty', l: 'عدد الأسهم المبيعة', t: 'num', req: true, v: qTxt(held).replace(/,/g, '') }, { k: 'price', l: 'سعر البيع للسهم (بعملة السعر)', t: 'num', req: true },
      { k: 'to', l: 'تذهب النقود إلى', t: 'select', opts: pay }, amtF('proceeds', 'صافي ما استلمته بعد العمولة', 'to', () => cur), rateDyn('date', v => isUsd(v.to)), { k: 'note', l: 'ملاحظة', t: 'text' }],
    v => { const q = L.parseAmount(v.qty, 3), o = { id, date: v.date, qty: q, price: pAmt(v.price, cur), to: v.to, proceeds: amtOf(v, 'proceeds', 'to', cur), r: rt(v, 'to'), note: v.note };
      if (!confirm('تأكيد بيع ' + qTxt(q) + ' من «' + nm + '»؟')) return; let rz = 0;
      return act(() => { const tid = FSK.sell(S, o); rz = S.tx.find(t => t.id === tid).meta.realized; }, 'سُجّل البيع').then(() => { toast('سُجّل البيع · المحقق ' + sgn(rz), rz < 0); go('accts', 'stocks'); }); }, 'أكّد البيع'));
  return h('div', {}, back, h('h1', {}, 'شراء «' + nm + '»'), head, buildForm([dt('date', 'تاريخ الشراء'), { k: 'qty', l: 'عدد الأسهم', t: 'num', req: true }, { k: 'price', l: 'سعر السهم (بعملة السعر)', t: 'num', req: true },
      { k: 'from', l: 'دُفع من', t: 'select', opts: pay }, amtF('paid', 'المدفوع فعلاً شاملاً العمولة', 'from', () => cur), rateDyn('date', v => isUsd(v.from)), { k: 'note', l: 'ملاحظة', t: 'text' }],
    v => act(() => FSK.buy(S, { id, date: v.date, qty: L.parseAmount(v.qty, 3), price: pAmt(v.price, cur), from: v.from, paid: amtOf(v, 'paid', 'from', cur), r: rt(v, 'from'), note: v.note }), 'سُجّل الشراء').then(done), 'سجّل الشراء')); }
// ===== f1-v4.6 (المرحلة 3): التسجيل السريع (2)، شريط التراجع بعد الحفظ (3، 8)، الشرائح المتكررة (21)، ادفع لنفسك أولاً (24) =====
// ---- شريط التراجع: يظهر بعد الحفظ 7 ثوانٍ. «تراجع» يعكس العملية عكساً ظاهراً (تبقى في السجل للأمانة)، كما يفعل زر «تراجع» في القائمة ----
// extra: [نص، دالة] زر إضافي اختياري (f1-v4.14: «لماذا قررت؟»)
function snack(msg, undo, extra) { let b = $('#snack'); if (!b) { b = h('div', { id: 'snack', role: 'status' }); document.body.append(b); }
  clearTimeout(snack.t); const u = undo ? btn('تراجع', () => { b.className = ''; clearTimeout(snack.t); act(undo, 'أُلغي'); }, 'mini') : null;
  const x = extra ? btn(extra[0], () => { b.className = ''; clearTimeout(snack.t); extra[1](); }, 'mini alt') : null; b.replaceChildren(h('span', {}, h('i', { class: 'ck' }, '✓'), ' ' + msg), h('span', { class: 'snb' }, x, u)); b.className = 'on'; snack.t = setTimeout(() => { b.className = ''; }, 7000); if (extra) setTimeout(() => { try { coachShow('snack-why'); } catch (e) {} }, 300); }
const undoTx = id => () => { const t = S.tx.find(x => x.id === id); if (!t || t.voided) throw new Error('العملية عُكست من قبل'); L.undo(S, id, L.today() > t.date ? L.today() : t.date); };
// يحفظ عملية (fn تعيد رقمها) ثم يعرض الشريط. extra: ما يُعاد مع التراجع (مثل موعد الراتب)
async function saveTx(fn, msg, extra) { const n = S.tx.length, r = await act(fn); if (S.tx.length === n) return null; const id = typeof r === 'number' ? r : S.tx[S.tx.length - 1].id;
  snack(msg, () => { undoTx(id)(); if (extra) extra(); }, typeof whyBtn === 'function' ? whyBtn(id) : null); return id; }
// ---- التسجيل السريع للمصروف: المبلغ أولاً بلوحة أرقام، ثم الفئة (الأكثر استعمالاً أولاً)، ثم «تم» ----
const QX = { amt: '', cat: null, picked: false, acct: null, day: 'today', date: '', note: '', rate: '' };
const daysAgo = n => L.iso(new Date(Date.now() - n * 864e5));
const PIXA = new WeakMap(), postsOf = id => { let c = PIXA.get(S); if (!c || c.n !== S.post.length || c.arr !== S.post) { const m = new Map(); S.post.forEach(p => { const a = m.get(p.tx); a ? a.push(p) : m.set(p.tx, [p]); }); c = { n: S.post.length, arr: S.post, m }; PIXA.set(S, c); } return c.m.get(id) || []; }; // فهرس القيود (أداء فقط)
const expTx = (days) => { const lim = daysAgo(days); return S.tx.filter(t => t.type === 'expense' && !t.voided && !t.reverses && t.date >= lim).map(t => { const ps = postsOf(t.id), c = ps.find(p => S.acc[p.a].kind === 'expense'), a = ps.find(p => S.acc[p.a].kind === 'asset');
  return c && a ? { id: t.id, date: t.date, cat: c.a, acct: a.a, amt: Math.abs(a.n), usd: S.acc[a.a].cur === 'USD', note: t.note || '' } : null; }).filter(Boolean); };
function catOrder() { const n = {}; expTx(90).forEach(x => { n[x.cat] = (n[x.cat] || 0) + 1; }); return L.CATS.map((c, i) => [c[0], c[1], n[c[0]] || 0, i]).sort((a, b) => b[2] - a[2] || a[3] - b[3]); }
// الشرائح المتكررة (21): مصروف تكرر مرتين فأكثر بالمبلغ والفئة والحساب والملاحظة نفسها خلال 120 يوماً. الشريحة تعبّئ النموذج فقط
// الذكاء هنا بسيط وشفاف: الوزن = مجموع (½ ^ (عمر المرة بالأيام ÷ 30))، فالمتكرر كثيراً وحديثاً يتقدّم ويكبر، والقديم يصغر ثم يختفي وحده.
// الحجم بالنسبة لأعلى وزن: كبير (≥ ⅔)، متوسط (≥ ⅓)، صغير. حتى 12 شريحة
function freqChips() { const g = {}, now = Date.parse(L.today()); expTx(120).forEach(x => { const k = [x.cat, x.amt, x.acct, x.note].join('|'), w = Math.pow(0.5, (now - Date.parse(x.date)) / 864e5 / 30);
    (g[k] = g[k] || { ...x, n: 0, w: 0, last: '' }).n++; g[k].w += w; if (x.date > g[k].last) g[k].last = x.date; });
  const xs = Object.values(g).filter(x => x.n >= 2 && S.acc[x.acct] && !S.acc[x.acct].hidden).sort((a, b) => b.w - a.w || (a.last < b.last ? 1 : -1)).slice(0, 12), top = xs.length ? xs[0].w : 1;
  return xs.map(x => ({ ...x, sz: x.w >= top * 2 / 3 ? 'lg' : x.w >= top / 3 ? 'md' : 'sm' })); }
function quickExpense() { const A = accOpts(); if (!A.length) return h('p', { class: 'mut' }, 'أنشئ حساباً أولاً من «أموالي».');
  const last = (t => t ? expTx(3650).find(x => x.id === t.id) : null)(S.tx.slice().reverse().find(t => t.type === 'expense' && !t.voided && !t.reverses)), C = catOrder();
  if (!QX.acct || !A.some(a => a[0] === QX.acct)) QX.acct = last && A.some(a => a[0] === last.acct) ? last.acct : A[0][0];
  if (!QX.picked || !QX.cat) QX.cat = C[0][0]; // الفئة الأكثر استعمالاً ما لم تختر غيرها
  const usd = () => S.acc[QX.acct].cur === 'USD', disp = h('div', { class: 'qamt', 'aria-live': 'polite' }), rateIn = h('input', { inputmode: 'decimal', placeholder: 'سعر 100 دولار بالدينار', value: QX.rate }), rateL = h('label', { class: 'f' }, h('span', {}, 'سعر 100 دولار بالدينار في ذلك اليوم'), rateIn);
  const show = () => { const s = QX.amt; disp.replaceChildren(h('b', {}, s ? (s.includes('.') ? s.split('.')[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + s.split('.')[1] : s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')) : '0'), h('span', {}, usd() ? ' $' : ' د.ع'));
    rateL.hidden = !usd(); if (usd() && !rateIn.value && S.x.rates.length) rateIn.value = String(L.rateAt(S, dateOf()) / 100); };
  const key = k => () => { let s = QX.amt; if (k === '⌫') s = s.slice(0, -1); else if (k === '.') { if (!usd() || s.includes('.')) return; s = (s || '0') + '.'; }
    else { if (s.includes('.') && s.split('.')[1].length >= 2) return; if (s === '0') s = ''; s = (s + k).slice(0, 15); } QX.amt = s; show(); };
  const pad = h('div', { class: 'qpad noswipe' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', usd() ? '.' : '000', '0', '⌫'].map(k => h('button', { type: 'button', class: 'qk2', onclick: key(k), 'aria-label': k === '⌫' ? 'مسح' : k }, k)));
  const cats = h('div', { class: 'qcats' }, C.map(([id, n]) => h('button', { type: 'button', class: 'chipb' + (id === QX.cat ? ' on' : ''), 'data-cat': id, onclick: e => { QX.cat = id; QX.picked = true; cats.querySelectorAll('.chipb').forEach(b => b.classList.toggle('on', b.dataset.cat === id)); } }, catIco(n), n)));
  const accS = h('select', { onchange: e => { QX.acct = e.target.value; QX.amt = ''; render(); } }, A.map(([v, t]) => h('option', { value: v, selected: v === QX.acct }, t)));
  const dateOf = () => QX.day === 'today' ? L.today() : QX.day === 'yest' ? daysAgo(1) : (QX.date || L.today());
  const dIn = h('input', { type: 'date', max: L.today(), value: QX.date || L.today(), onchange: e => { QX.date = e.target.value; } });
  const autoL = h('small', { class: 'autoc' }), noteIn = h('input', { placeholder: 'ملاحظة (اختياري): أين صُرف؟', value: QX.note, oninput: e => { QX.note = e.target.value; if (QX.picked) return; const g = guessCat(QX.note);
    if (g && g.cat !== QX.cat) { QX.cat = g.cat; cats.querySelectorAll('.chipb').forEach(b => b.classList.toggle('on', b.dataset.cat === g.cat)); } autoL.textContent = g ? '✨ الفئة «' + S.acc[g.cat].name + '» ' + (g.from === 'h' ? 'من سجلّك' : 'من الملاحظة') + '. غيّرها إن شئت.' : ''; } });
  const F = freqChips(), fill = x => { QX.amt = x.usd ? (x.amt / 100).toFixed(2) : String(x.amt); QX.cat = x.cat; QX.picked = true; QX.acct = x.acct; QX.note = x.note; QX.rate = ''; render(); toast('عُبّئ النموذج، راجعه ثم اضغط «تم»'); };
  const freq = F.length ? h('div', { class: 'qfreq' }, h('h2', {}, 'متكرر عندك'), h('div', { class: 'qchips' }, F.map(x => h('button', { type: 'button', class: 'fchip ' + x.sz, onclick: () => fill(x) },
    h('b', {}, x.note || (S.acc[x.cat] || {}).name || ''), h('span', { class: 'fa' }, x.usd ? L.fmtUsd(x.amt) : L.fmt(x.amt)), x.sz === 'lg' ? h('small', {}, 'آخر مرة ' + nWhen(x.last) + ' · ' + x.n + ' مرات') : x.sz === 'md' ? h('small', {}, x.n + ' مرات') : null)))) : null;
  const done = async () => { try { if (!QX.amt || /^0*\.?0*$/.test(QX.amt)) throw new Error('اكتب المبلغ'); const amount = L.parseAmount(QX.amt, usd() ? 2 : 0), d = dateOf(), cn = (S.acc[QX.cat] || {}).name;
      const r = usd() ? L.parseAmount(rateIn.value, 2) : null, a = QX.acct, note = QX.note.trim();
      const id = await saveTx(() => L.expense(S, { date: d, acct: a, cat: QX.cat, amount, r, note }), 'مصروف ' + (usd() ? L.fmtUsd(amount) : money(amount)) + ' · ' + cn);
      if (id) { QX.amt = ''; QX.note = ''; QX.rate = ''; QX.cat = null; QX.picked = false; QX.day = 'today'; render(); } } catch (e) { toast(e.message || String(e), true); } };
  show();
  return h('div', { class: 'qx' }, freq, sect('', disp, pad), sect('الفئة', cats),
    sect('', h('label', { class: 'f' }, h('span', {}, 'يُصرف من'), accS), rateL, h('label', { class: 'f' }, h('span', {}, 'التاريخ'), seg([['today', 'اليوم'], ['yest', 'أمس'], ['other', 'تاريخ آخر']], QX.day, k => { QX.day = k; render(); })),
      QX.day === 'other' ? dIn : null, noteIn, autoL, btn('تم', done, 'prim'))); }
// ---- ادفع لنفسك أولاً (24): بعد تسجيل الراتب فقط. «سجّل التحويل» يسجّله في التطبيق فقط ولا يحرك مالاً حقيقياً ----
const pyfCfg = () => S.x.set.pyf || {};
function pyfAfterSalary(amount, acct, date) { const c = pyfCfg(); if (!S.acc[acct]) return false; // يوم الراتب: ادفع لنفسك أولاً (إن لم يُوقف وكان الحساب بالدينار) ثم الأهداف ثم الفواتير ثم الخلاصة
  if (c.never || S.acc[acct].cur !== 'IQD') go('more', 'payday', { salary: amount, acct, date, step: 2 }); else go('more', 'pyf', { salary: amount, acct, date, flow: 1 }); return true; }
function pyfDests(acct) { const st = S.x.set, G = L.goalView(S), sg = st.savingsGoal && G.find(g => g.id === st.savingsGoal && g.cur !== 'USD');
  return (sg ? [['goal:' + sg.id, 'تخصيص لهدف «' + sg.name + '»']] : []).concat(accOpts(a => a.cur === 'IQD' && a.kind === 'asset' && a.id !== acct)); }
MORE.push(['pyf', 'ادفع لنفسك أولاً', () => { const p = view.p, c = pyfCfg(), sal = p.salary;
  if (!sal) return h('div', {}, h('p', { class: 'mut' }, 'يظهر هذا بعد تسجيل الراتب. إعداداته في ⚙ ← «ادفع لنفسك أولاً».'), btn('الرئيسية', () => go('home'), 'alt'));
  const D = pyfDests(p.acct); if (!D.length) return h('div', {}, h('p', {}, 'لا يوجد حساب ادخار أو هدف مدخرات. أنشئ حساباً بالدينار أو حدّد هدف المدخرات أولاً.'), btn('ليس الآن', () => pyfDone(), 'alt'));
  let pct = c.mode === 'amt' && c.amt ? null : (c.pct || 10), amt = c.mode === 'amt' && c.amt ? c.amt : Math.round(sal * pct / 100);
  const pIn = h('input', { inputmode: 'decimal', value: pct == null ? String(Math.round(amt / sal * 1000) / 10) : String(pct) }), aIn = h('input', { inputmode: 'numeric', value: String(amt) }), chips = h('div', {});
  const drawChips = () => chips.replaceChildren(seg([5, 10, 15, 20].map(x => [String(x), x + '%']), pIn.value, k => { pIn.value = k; aIn.value = String(Math.round(sal * +k / 100)); drawChips(); }));
  pIn.oninput = () => { const v = Number(L.norm(pIn.value)); if (v >= 0 && v <= 100) aIn.value = String(Math.round(sal * v / 100)); drawChips(); };
  aIn.oninput = () => { try { const v = L.parseAmount(aIn.value, 0); pIn.value = String(Math.round(v / sal * 1000) / 10); } catch (e) {} drawChips(); };
  const to = h('select', {}, D.map(([v, t]) => h('option', { value: v, selected: v === c.to }, t))); let mode = c.mode || 'pct'; const modeBox = h('div', {});
  const drawMode = () => modeBox.replaceChildren(seg([['pct', 'احفظ كنسبة'], ['amt', 'احفظ كمبلغ ثابت']], mode, k => { mode = k; drawMode(); })); drawChips(); drawMode();
  const rec = async () => { let a; try { a = L.parseAmount(aIn.value, 0); if (a <= 0) throw new Error('اكتب مبلغاً موجباً'); } catch (e) { return toast(e.message, true); } const pv = Number(L.norm(pIn.value)), dest = to.value, d = p.date || L.today();
    const save = () => { S.x.set.pyf = { ...pyfCfg(), mode, pct: mode === 'pct' ? pv : null, amt: mode === 'amt' ? a : null, to: dest, never: false }; };
    if (dest.startsWith('goal:')) { const gid = dest.slice(5), ok = await act(() => { save(); L.goalMove(S, { id: gid, amount: a, date: d }); S.goals[S.goals.length - 1].pyf = true; return true; });
      if (ok) { snack('خُصّص ' + money(a) + ' للمدخرات', () => { L.goalMove(S, { id: gid, amount: a, date: d, release: true }); S.goals[S.goals.length - 1].pyf = true; }); pyfDone(); } }
    else { const id = await saveTx(() => { save(); const tid = L.transfer(S, { date: d, from: p.acct, to: dest, amount: a, note: 'ادفع لنفسك أولاً' }); S.tx.find(t => t.id === tid).meta = { pyf: 1 }; return tid; }, 'سُجّل تحويل ' + money(a) + ' للادخار'); if (id) pyfDone(); } };
  return h('div', {}, sect('', h('p', {}, 'قبل أن تصرف من راتبك، انقل جزءاً إلى مدخراتك.'), row('الراتب المسجّل', money(sal)), h('label', { class: 'f' }, h('span', {}, 'النسبة'), chips),
      h('div', { class: 'two' }, h('label', { class: 'f' }, h('span', {}, 'النسبة %'), pIn), h('label', { class: 'f' }, h('span', {}, 'المبلغ (د.ع)'), aIn)),
      h('label', { class: 'f' }, h('span', {}, 'إلى'), to), modeBox, h('p', { class: 'mut' }, '«سجّل التحويل» يسجّله في التطبيق فقط؛ انقل المال الحقيقي بنفسك.'),
      btn('سجّل التحويل', rec, 'prim'), btn('ليس الآن', () => pyfDone(), 'alt'), btn('لا تسأل ثانية', () => act(() => { S.x.set.pyf = { ...pyfCfg(), never: true }; }, 'لن يُسأل بعد الآن. أعده من ⚙ ← «ادفع لنفسك أولاً»').then(() => pyfDone()), 'alt'))); }]);
function pyfPanel() { const c = pyfCfg(), on = !c.never;
  return sect('ادفع لنفسك أولاً', h('p', { class: 'mut' }, 'بعد تسجيل الراتب يقترح التطبيق نقل نسبة أو مبلغ ثابت إلى مدخراتك. التسجيل لا يتم إلا بضغطك «سجّل التحويل».'),
    seg([['1', 'يُسأل بعد الراتب'], ['0', 'متوقف']], on ? '1' : '0', k => act(() => { S.x.set.pyf = { ...c, never: k === '0' }; }, k === '1' ? 'فُعّل' : 'أُوقف')),
    row('المحفوظ', c.mode === 'amt' && c.amt ? money(c.amt) + ' (مبلغ ثابت)' : (c.pct || 10) + '%' + (c.pct ? '' : ' (افتراضي)'))); }
const pyfSummary = () => { const c = pyfCfg(); return c.never ? 'متوقف' : c.mode === 'amt' && c.amt ? money(c.amt) : (c.pct || 10) + '%'; };
// ===== f1-v4.7 (المرحلة 4): أدوات القرار (31–36) والرئيسية الأخف (1). الحساب في decide.js، عرض فقط =====
const LVC = { red: 'badc', warn: 'warnc', ok: 'okc', info: '' };
function decisionCard() { let sf; try { sf = FD.safe(S); } catch (e) { return null; } if (!sf) return null;
  const today = L.today(), soon = sf.commit.find(c => c.d <= L.iso(new Date(Date.parse(today) + 3 * 864e5))), after = sf.days > 1 ? Math.max(0, Math.floor((sf.base - sf.commitTotal) / (sf.days - 1))) : 0;
  const d = sf.noIncome ? { lv: 'info', t: 'لم يُسجَّل دخل بعد، فالمصروف الآمن صفر.', a: 'سجّل راتبك عند استلامه ليحسب التطبيق ما تستطيع صرفه يومياً.' }
    : sf.short > 0 ? { lv: 'red', t: 'التزاماتك القادمة أكبر من المتبقي لديك بـ ' + money(sf.short) + '.', a: 'أجّل أي مصروف غير ضروري حتى الراتب القادم.' }
    : sf.leftToday < 0 ? { lv: 'red', t: 'تجاوزت المصروف الآمن اليوم بـ ' + money(-sf.leftToday) + '.', a: 'ليبقى شهرك متوازناً: لا تتجاوز ' + money(after) + ' يومياً من الغد.' }
    : soon ? { lv: 'warn', t: '«' + soon.t + '» بمبلغ ' + money(soon.amt) + ' · ' + nWhen(soon.d) + '.', a: 'أبقِ هذا المبلغ متاحاً، وهو محسوب في المصروف الآمن.' }
    : { lv: 'ok', t: 'تستطيع صرف ' + money(sf.leftToday) + ' أخرى اليوم وتبقى ضمن خطتك حتى آخر الشهر.', a: '' };
  const how = fold('كيف حُسب؟', false, row('المتبقي من دخلك منذ البدء', money(sf.pool)), row('المتاح للصرف', money(sf.avail)), row('المعتمد (الأقل منهما، صباح اليوم)', money(sf.base0)),
    row('− الالتزامات القادمة حتى آخر الشهر', money(sf.commitTotal)), sf.commit.map(c => row('   ' + c.t + ' · ' + nWhen(c.d), money(c.amt), 'mut')), row('÷ الأيام المتبقية مع اليوم', String(sf.days)), row('= المصروف الآمن اليوم', money(sf.safe)),
    h('p', { class: 'mut' }, 'المتبقي = دخلك منذ البدء − مصروفك − ما ادخرته بـ«ادفع لنفسك أولاً». أقساط الأهداف ' + (S.x.set.decGoals ? 'محسوبة' : 'غير محسوبة') + ' (⚙ ← «المصروف الآمن»).'));
  const el = sect('قرار اليوم', h('div', { class: 'r dsafe' }, h('span', {}, 'المصروف الآمن اليوم'), animNum(h('b', {}), sf.safe, 'safe', money)), row('صرفت اليوم', money(sf.spentToday)), row('يتبقى لليوم', money(sf.leftToday), sf.leftToday < 0 ? 'bad' : ''),
    h('div', { class: 'dnote ' + d.lv }, h('b', { class: LVC[d.lv] }, d.t), d.a ? h('p', {}, d.a) : null), how);
  el.classList.add('dcard'); el.dataset.lv = d.lv; return el; }
function wealthStrip() { const p = L.panel(S), ex = exclInfo(), shown = p.nw - ex.amt, N = FD.wealthNotes(S), dm = p.dMonth;
  const el = sect(ti('صافي الثروة'), h('div', { class: 'r wbig' }, animNum(h('b', {}), shown, 'nw', money), dm == null ? null : h('span', { class: dm < 0 ? 'badc' : 'okc' }, (dm > 0 ? '▲ +' : dm < 0 ? '▼ ' : '') + L.fmt(dm) + ' هذا الشهر')),
    ex.names.length ? h('p', { class: 'mut' }, 'دون: ' + ex.names.join('، ')) : null, monthsShield(), N.filter(n => FM.savings(S) || !n.t.startsWith('سيولتك تكفي')).map(n => h('p', { class: 'wn ' + (LVC[n.lv] || '') }, (n.lv === 'warn' ? '⚠ ' : n.lv === 'ok' ? '✓ ' : 'ℹ ') + n.t)));
  el.classList.add('wstrip'); return el; }
function monthCard() { let m; try { m = FD.monthSummary(S); } catch (e) { return null; } if (!m) return null; const f = m.forecast, dec = m.decision;
  return sect('ملخص الشهر حتى اليوم', row('مصروفك حتى اليوم', money(m.now) + (m.prev != null ? (m.now > m.prev ? ' ▲' : m.now < m.prev ? ' ▼' : '') : '')), m.prev != null ? row('الفترة نفسها الشهر الماضي', money(m.prev)) : null,
    m.diffs.filter(x => x.d).map(x => row('   ' + x.n, (x.d > 0 ? '+' : '') + L.fmt(x.d) + (x.p != null ? ' (' + (x.p > 0 ? '+' : '') + x.p + '%)' : ''), x.d > 0 ? 'bad' : 'okc')),
    (x => x ? h('div', { class: 'fc' }, h('h2', {}, 'دخل هذا الشهر'), x) : null)(splitRows(L.mkey(L.today()) + '-01', L.today())),
    f ? h('div', { class: 'fc' }, h('h2', {}, 'المتوقع آخر الشهر' + (f.early ? ' (تقدير أولي)' : '')), row('الدخل', money(f.income) + (f.pendInc ? ' (منه ' + L.fmt(f.pendInc) + ' منتظر)' : '')),
      row('المصروف', money(f.expense)), row('الوفر' + (f.rate != null ? ' (' + f.rate + '%)' : ''), sgn(f.savings), f.savings < 0 ? 'bad' : ''),
      h('p', { class: 'mut' }, 'المصروف = ما صرفته (' + L.fmt(f.sofar) + ') + وتيرتك اليومية (' + L.fmt(f.pace) + ') × ' + f.rest + ' يوماً + الالتزامات القادمة (' + L.fmt(f.commit) + ').')) : null,
    h('div', { class: 'dnote ' + dec.lv }, h('b', { class: LVC[dec.lv] }, 'قرار مقترح: ' + dec.t), h('p', {}, dec.a))); }
function whatIfScreen() { const b = FD.baseline(S), back = backBtn(() => go('insights'));
  if (!b) return h('div', {}, back, h('h1', {}, 'ماذا لو؟'), h('p', { class: 'mut' }, 'سجّل الرصيد الافتتاحي وبعض الدخل والمصروف أولاً.'));
  const V = { ok: ['okc', 'يتحمّله وضعك'], warn: ['warnc', 'ممكن بحذر: ادخارك ينزل تحت 10%'], red: ['badc', 'لا يتحمّله وضعك الآن'] };
  const out1 = h('div', {}), inIn = h('input', { inputmode: 'numeric', placeholder: 'مثال: 250,000' });
  const upd1 = () => { let a = 0; try { a = inIn.value.trim() ? L.parseAmount(inIn.value, 0) : 0; } catch (e) { return out1.replaceChildren(h('p', { class: 'bad' }, e.message)); } if (!a) return out1.replaceChildren();
    const r = FD.whatIfInstallment(S, a); out1.replaceChildren(row('وفرك الشهري الآن', sgn(r.sav0)), row('وفرك بعد القسط', sgn(r.sav), r.sav < 0 ? 'bad' : ''), row('نسبة الادخار بعده', r.rate == null ? '—' : r.rate + '%'), row('القسط من دخلك', r.share == null ? '—' : r.share + '%', r.share > 30 ? 'bad' : ''),
      h('p', { class: V[r.lv][0] }, '◀ ' + (r.share != null && r.share > 30 ? 'القسط أكثر من 30% من دخلك: عبء كبير' : V[r.lv][1]))); };
  inIn.oninput = upd1;
  const out2 = h('div', {}), seg2 = h('div', {}); let pct = 20;
  const upd2 = () => { const r = FD.whatIfIncomeDrop(S, pct); seg2.replaceChildren(seg([[10, '10%'], [20, '20%'], [30, '30%'], [50, '50%']].map(([k, t]) => [String(k), t]), String(pct), k => { pct = +k; upd2(); }));
    out2.replaceChildren(row('دخلك يصبح', money(r.newInc)), row('وفرك يصبح', sgn(r.sav), r.sav < 0 ? 'bad' : ''), r.months != null ? row('سيولتك تغطي العجز', r.months + ' شهر', 'bad') : row('نسبة الادخار', r.rate == null ? '—' : r.rate + '%'), h('p', { class: V[r.lv][0] }, '◀ ' + V[r.lv][1])); };
  upd2();
  const u = FD.whatIfUsd(S, 5), u2 = FD.whatIfUsd(S, -5);
  return h('div', {}, back, h('h1', {}, 'ماذا لو؟'), h('p', { class: 'mut' }, 'الأساس: متوسط دخلك ' + money(b.inc) + ' ومصروفك ' + money(b.exp) + (b.n ? ' لآخر ' + b.n + ' أشهر كاملة' : ' (تقدير هذا الشهر)') + (b.est ? '. البيانات قليلة، فالنتيجة تقريبية.' : '.') + ' حساب فقط، لا يُحفظ شيء.'),
    sect('قسط شهري جديد', h('label', { class: 'f' }, h('span', {}, 'القسط الشهري (د.ع)'), inIn), out1),
    sect('هبوط الدخل', seg2, out2),
    sect('سعر الدولار ±5%', h('p', { class: 'mut' }, 'يتأثر ما قيمته بالدولار: الدولار، والأسهم الدولارية، والذهب والفضة. الدينار لا يتغير.'), row('دولار', money(u.usd)), u.stocks ? row('أسهم دولارية', money(u.stocks)) : null, row('ذهب وفضة', money(u.metals)), row('المجموع المتأثر', money(u.total) + (u.share != null ? ' (' + u.share + '% من ثروتك)' : '')),
      row('إن ارتفع 5%', sgn(u.delta), 'okc'), row('إن انخفض 5%', sgn(u2.delta), u2.delta < 0 ? 'bad' : ''))); }
function decPanel() { const st = S.x.set; return sect('المصروف الآمن اليوم', h('p', { class: 'mut' }, 'الالتزامات القادمة: المتكررة غير المسجّلة هذا الشهر، وأقساط الجمعيات، والديون التي عليك المستحقة قبل آخر الشهر. وأقساط الأهداف إن اخترت.'),
  seg([['0', 'بدون أقساط الأهداف'], ['1', 'مع أقساط الأهداف']], st.decGoals ? '1' : '0', k => act(() => { st.decGoals = k === '1'; }, 'حُفظ'))); }
// ===== f1-v4.8 (المرحلة 5): المسار المالي المستقبلي داخل «تحليلاتي» (38–41). الحساب في decide.js، عرض فقط =====
const PV = { cur: 'IQD' };
const pMoney = (n, P) => PV.cur === 'USD' && P.rate ? L.fmtUsd(Number(E.rd(BigInt(n) * 1000000n, BigInt(P.rate)))) : money(n);
const pShort = (n, P) => { if (PV.cur === 'USD' && P.rate) { const d = n * 10000 / P.rate; return (Math.abs(d) >= 1e6 ? (d / 1e6).toFixed(1) + 'م' : Math.abs(d) >= 1e3 ? Math.round(d / 1e3) + 'ألف' : Math.round(d)) + ' $'; } const t = x => String(+x); return Math.abs(n) >= 1e9 ? t((n / 1e9).toFixed(2)) + ' مليار' : Math.abs(n) >= 1e6 ? t((n / 1e6).toFixed(1)) + ' مليون' : Math.round(n / 1e3) + ' ألف'; };
const pathNote = P => h('p', { class: 'mut' }, 'تقدير لا وعد: صافي ثروتك الآن + ادخارك الشهري × الأشهر' + (P.cfg.growth ? '، مع نمو أصول ' + P.cfg.growth + '% سنوياً' : '، بلا نمو للأصول') + (P.cfg.real && P.cfg.infl ? '، بأسعار اليوم (تضخم ' + P.cfg.infl + '%)' : '') + '. محلي على هاتفك، ويتحدّث مع كل شهر مكتمل.');
// ---- f1-v4.8b: تصميم جديد للمسار — بطاقة رئيسية، اختيار الأفق، رسم مروحي للسيناريوهات الثلاثة، بطاقات السيناريو مع التفكيك، ومحطات «متى تصل؟» ----
const SC_COL = { cur: 'var(--acc)', up: 'var(--ok)', down: 'var(--bad)' }, SC_DESC = { cur: 'كما أنت الآن', up: 'مصروف أقل 15%', down: 'دخل أقل 20% ومصروف أكثر 10%' };
if (!PV.h) PV.h = 'y5'; if (!PV.s) PV.s = 'cur';
const yrsTxt = m => { const y = Math.floor(m / 12), mo = Math.round(m % 12); return (y ? (y === 1 ? 'سنة' : y === 2 ? 'سنتان' : y + (y <= 10 ? ' سنوات' : ' سنة')) : '') + (y && mo ? ' و' : '') + (mo ? (mo === 1 ? 'شهر' : mo === 2 ? 'شهران' : mo + (mo <= 10 ? ' أشهر' : ' شهراً')) : '') || 'الآن'; };
// قيمة سيناريو بعد m شهراً كما تُعرض (مع النمو والتضخم إن اختيرا)
const pathAt = (P, s, m) => { const r = FD.fv(P.nw, s, m, P.cfg.growth), d = P.cfg.real && P.cfg.infl ? Math.pow(1 + P.cfg.infl / 100, m / 12) : 1; return Math.round(r.end / d); };
// ---- f1-v4.8c: ثلاثة أشكال للمسار المالي يختارها المستخدم من الإعدادات كالثيمات: آلة الزمن (الافتراضي)، رحلتك المالية، نخلتك المالية ----
// الحساب واحد للثلاثة (FD.path و pathAt)؛ الشكل وحده يتغير. الاختيار محفوظ على هذا الجهاز (localStorage) ولا يدخل البيانات المالية.
const PSTYLES = [['dial', 'آلة الزمن', 'قرص تديره فتختار السنة، مع قصة الرقم'], ['road', 'رحلتك المالية', 'طريق بمحطات وأعلام للأهداف'], ['palm', 'نخلتك المالية', 'نخلة تطول مع ثروتك، وتمرها أهدافك']];
const PS_KEY = 'flousi-pathview', pStyle = () => { try { const v = localStorage.getItem(PS_KEY); return PSTYLES.some(x => x[0] === v) ? v : 'dial'; } catch (e) { return 'dial'; } };
const setPStyle = v => { try { localStorage.setItem(PS_KEY, v); } catch (e) {} };
if (PV.m == null) PV.m = 60;
const SC_ICO = { cur: '☀', up: '🌱', down: '🌧' };
function milestones(P, s, upTo = 300) { const nw = P.nw, base = Math.max(nw, 1), step = [1e7, 2.5e7, 5e7, 1e8, 2.5e8, 5e8, 1e9, 2.5e9, 5e9, 1e10].filter(v => v > base * 1.05).slice(0, 4), out = [];
  step.forEach(t => { let m = null; for (let i = 1; i <= upTo; i++) if (pathAt(P, s.s, i) >= t) { m = i; break; } out.push({ t, m }); }); return out; }
const yearAt = m => { const t = L.today(); return +t.slice(0, 4) + Math.floor((+t.slice(5, 7) - 1 + Math.round(m)) / 12); };
const scOf = P => P.scen.find(x => x.id === PV.s) || P.scen[0];
// عدّاد يتحرك من القيمة السابقة إلى الجديدة (300 ملّي ثانية)
function countTo(el, v, fmt) { const from = +(el.dataset.v || v), t0 = performance.now(); el.dataset.v = v; cancelAnimationFrame(el._raf);
  const step = t => { const k = Math.min(1, (t - t0) / 300), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(from + (v - from) * e)); if (k < 1) el._raf = requestAnimationFrame(step); }; el._raf = requestAnimationFrame(step); }
const scenChips = P => h('div', { class: 'chips2 noswipe' }, P.scen.map(x => h('button', { type: 'button', class: x.id === PV.s ? 'on' : '', style: '--sc:' + SC_COL[x.id], onclick: () => { PV.s = x.id; render(); } }, SC_ICO[x.id] + ' ' + x.n)));
const hzChips = (P, on) => h('div', { class: 'hz noswipe' }, P.rows.map(x => h('button', { type: 'button', class: Math.abs(x.m - PV.m) < 0.05 ? 'on' : '', onclick: () => { PV.m = x.m; on ? on() : render(); } }, x.id === 'm1' ? 'شهر' : x.id === 'eoy' ? 'آخر السنة' : x.id === 'y5' ? '5 سنوات' : x.id === 'y10' ? '10 سنوات' : '25 سنة')));
function pathBreak(P, m) { const s = scOf(P), r = FD.fv(P.nw, s.s, m, P.cfg.growth), d = P.cfg.real && P.cfg.infl ? Math.pow(1 + P.cfg.infl / 100, m / 12) : 1;
  return fold('كيف وصل الرقم؟', false, row('ثروتك الآن', pMoney(P.nw, P)), row('+ ادخارك ' + yrsTxt(m) + ' × ' + money(s.s), pMoney(r.saved, P), r.saved < 0 ? 'bad' : ''), r.growth ? row('+ نمو الأصول ' + P.cfg.growth + '%', pMoney(r.growth, P)) : null,
    d > 1 ? row('÷ التضخم (بأسعار اليوم)', '÷ ' + d.toFixed(2)) : null, row('= المتوقع', pMoney(Math.round(r.end / d), P)), s.s < 0 ? h('p', { class: 'badc' }, 'في هذا السيناريو تصرف أكثر من دخلك، فتنقص ثروتك كل شهر.') : null); }
function storyText(P, m) { const s = scOf(P), v = pathAt(P, s.s, m), sav = Math.round(s.s * m), y = yearAt(m), up = P.scen.find(x => x.id === 'up'), gain = pathAt(P, up.s, m) - pathAt(P, P.scen[0].s, m), cut = up.s - P.scen[0].s;
  if (m < 0.5) return [['اليوم ثروتك '], [pShort(P.nw, P), 1], ['. حرّك الزمن لترى أين تصل.']];
  if (s.s < 0) return [['في '], [String(y), 1], [' ستكون ثروتك نحو '], [pShort(v, P), 1], ['، أقل من اليوم بـ '], [pShort(P.nw - v, P), 1], [' لأن مصروفك في هذا السيناريو أكبر من دخلك بـ '], [pShort(-s.s, P), 1], [' شهرياً.']];
  const share = v > 0 ? Math.round(sav / v * 100) : 0;
  return [['في '], [String(y), 1], [' ستكون ثروتك نحو '], [pShort(v, P), 1], ['. '], ...(sav > 0 ? [[share + '%', 1], [' منها من ادخارك الشهري '], [pShort(s.s, P), 1], ['. ']] : []),
    ...(PV.s === 'cur' && gain > 0 ? [['لو صرفت أقل بـ '], [pShort(cut, P), 1], [' شهرياً تكسب '], [pShort(gain, P), 1], [' إضافية.']] : [])]; }
const storyEl = (P, m) => h('div', { class: 'story' }, storyText(P, m).map(([t, b]) => b ? h('b', {}, t) : t));
// ===== 1) آلة الزمن (الافتراضي): القرص دورة كاملة = 25 سنة =====
function pathDial(P) { const box = h('div', {}), R = 128, C = 165, L2 = 2 * Math.PI * R;
  const draw = () => { const m = PV.m, s = scOf(P), v = pathAt(P, s.s, m), a = m / 300 * 2 * Math.PI, kx = C + R * Math.sin(a), ky = C - R * Math.cos(a), mult = P.nw > 0 ? v / P.nw : null, ms = milestones(P, s).find(x => x.m && x.m > m);
    const svg = svgEl(`<svg viewBox="-14 0 358 330" width="100%" style="direction:ltr;touch-action:none" role="slider" aria-label="اختر السنة"><circle cx="${C}" cy="${C}" r="150" style="fill:var(--bar);stroke:var(--line)"/>`
      + `<circle cx="${C}" cy="${C}" r="${R}" fill="none" style="stroke:var(--soft)" stroke-width="18"/>`
      + `<circle cx="${C}" cy="${C}" r="${R}" fill="none" style="stroke:${SC_COL[s.id]}" stroke-width="18" stroke-linecap="round" stroke-dasharray="${(L2 * m / 300).toFixed(1)} ${L2.toFixed(1)}" transform="rotate(-90 ${C} ${C})"/>`
      + [0, 5, 10, 15, 20].map(y => { const b = y / 25 * 2 * Math.PI; return `<text x="${(C + 152 * Math.sin(b)).toFixed(0)}" y="${(C - 152 * Math.cos(b) + 4).toFixed(0)}" font-size="11" font-weight="700" text-anchor="middle" style="fill:var(--mute);paint-order:stroke;stroke:var(--bar);stroke-width:4px">${y ? y + ' س' : 'الآن'}</text>`; }).join('')
      + `<circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="16" style="fill:var(--btn);stroke:var(--btnt)" stroke-width="4"/></svg>`, 'dialsvg');
    const num = h('b', { class: 'dv' }); num.dataset.v = box._last != null ? box._last : v; box._last = v;
    box.replaceChildren(h('div', { class: 'dial noswipe' }, svg, h('div', { class: 'dc' }, h('span', { class: 'dy' }, String(yearAt(m))), h('small', {}, (m < 0.5 ? 'اليوم' : 'بعد ' + yrsTxt(m)) + ' · ' + s.n), num,
        mult != null && m >= 0.5 ? h('i', { class: v < P.nw ? 'badc' : 'okc' }, '× ' + mult.toFixed(1) + ' ثروتك اليوم') : null)),
      hzChips(P, draw),
      h('div', { class: 'facts' }, P.scen.filter(x => x.id !== s.id).map(x => h('div', {}, h('small', {}, SC_ICO[x.id] + ' ' + (x.id === 'up' ? 'لو خفّضت مصروفك 15%' : x.id === 'down' ? 'لو قلّ دخلك 20%' : 'كما أنت الآن')), h('b', {}, pShort(pathAt(P, x.s, m), P)))),
        h('div', {}, h('small', {}, 'ادخارك حتى ذلك الوقت'), h('b', { class: s.s < 0 ? 'badc' : '' }, pShort(Math.round(s.s * m), P))), h('div', {}, h('small', {}, 'المحطة القادمة'), h('b', {}, ms ? pShort(ms.t, P) + ' · ' + yearAt(ms.m) : '—'))),
      storyEl(P, m), pathBreak(P, m), lettersEl(m));
    countTo(num, v, x => pShort(x, P));
    const el = svg.querySelector('svg'), pick = e => { const r = el.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2; let ang = Math.atan2(x, -y); if (ang < 0) ang += 2 * Math.PI;
      let nm = Math.round(ang / (2 * Math.PI) * 300); if (PV.m > 240 && nm < 60) nm = 300; if (PV.m < 60 && nm > 240) nm = 0; nm = Math.max(0, Math.min(300, nm)); if (nm !== PV.m) { PV.m = nm; draw(); } };
    el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); el._drag = true; pick(e); }); el.addEventListener('pointermove', e => { if (el._drag) pick(e); }); el.addEventListener('pointerup', () => { el._drag = false; }); };
  draw(); return box; }
// ===== 2) رحلتك المالية: طريق متعرج ومحطات وأعلام الأهداف =====
function pathRoad(P) { const s = scOf(P), rows = P.rows, ms = milestones(P, s), W = 362, step = 210, H = 70 + rows.length * step;
  const pts = rows.map((r, i) => [i % 2 ? 70 : 292, 90 + i * step]), start = [292, 30];
  let d = 'M' + start.join(' '); [start, ...pts].forEach((p, i, a) => { if (!i) return; const q = a[i - 1]; d += ` C ${q[0]} ${q[1] + step * 0.55}, ${p[0]} ${p[1] - step * 0.55}, ${p[0]} ${p[1]}`; });
  const svg = svgEl(`<svg width="100%" viewBox="0 0 ${W} ${H}" style="direction:ltr" aria-hidden="true"><path d="${d}" fill="none" style="stroke:var(--soft)" stroke-width="34" stroke-linecap="round"/><path class="rd" d="${d}" fill="none" style="stroke:${SC_COL[s.id]}" stroke-width="6" stroke-dasharray="14 10" stroke-linecap="round"/>`
    + `<circle cx="${start[0]}" cy="${start[1]}" r="13" style="fill:var(--btn)"/>` + pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 15 : 11}" style="fill:${i === pts.length - 1 ? 'var(--btn)' : 'var(--wait)'}"/>`).join('') + '</svg>', 'roadsvg');
  const cards = rows.map((r, i) => { const v = pathAt(P, s.s, r.m), prev = i ? rows[i - 1].m : 0, fl = ms.filter(x => x.m && x.m > prev && x.m <= r.m), last = i === rows.length - 1;
    return h('div', { class: 'st' + (last ? ' fin' : ''), style: 'top:' + (pts[i][1] - 44) + 'px;' + (i % 2 ? 'right:8px' : 'left:8px') + ';animation-delay:' + (i * 90) + 'ms' },
      h('span', { class: 't' }, r.n + (r.m >= 12 ? ' · ' + yearAt(r.m) : '')), h('b', {}, pShort(v, P)), h('small', { class: v < P.nw ? 'badc' : '' }, (v >= P.nw ? '+' : '−') + pShort(Math.abs(v - P.nw), P) + ' عن اليوم'),
      r.m >= 60 ? h('div', { class: 'tri' }, P.scen.filter(x => x.id !== s.id).map(x => h('i', { style: '--sc:' + SC_COL[x.id] }, SC_ICO[x.id] + ' ' + pShort(pathAt(P, x.s, r.m), P)))) : null,
      fl.map(x => h('small', { class: 'flag' }, (last ? '🏆 ' : '🏁 ') + 'تتجاوز ' + pShort(x.t, P) + ' في ' + yearAt(x.m)))); });
  const A = pathAdv(60), signs = A.slice(0, Math.min(4, rows.length - 1)).map((a, i) => { const p2 = pts[i + 1], x = p2[0] + (i % 2 ? 6 : -6), y = p2[1] - 62; // على الطريق قرب المحطة التالية، بعيداً عن بطاقتها
    return h('span', { class: 'rsg sgi ' + SIGN[a.lv][0], style: 'left:' + (x / W * 100).toFixed(1) + '%;top:' + (y - 17) + 'px', title: ADVT.road[a.k] }, h('b', {}, String(i + 1))); });
  return h('div', {}, h('div', { class: 'road', style: 'height:' + H + 'px' }, svg, ...signs, h('div', { class: 'you', style: 'right:20px;top:0' }, '📍 أنت هنا · ' + pShort(P.nw, P)), ...cards), storyEl(P, 60), signsEl(A), pathBreak(P, 60)); }
// ===== 3) نخلتك المالية: النخلة تطول مع الثروة، والتمر أهداف مستديرة تصلها =====
function pathPalm(P) { const box = h('div', {}), top = Math.max(P.nw, ...P.scen.map(x => pathAt(P, x.s, 300))) || 1, bot = Math.min(0, ...P.scen.map(x => pathAt(P, x.s, 300)));
  const Y = v => 318 - Math.max(0, (v - bot) / (top - bot)) * 250; // ارتفاع رأس النخلة
  const draw = () => { const m = PV.m, s = scOf(P), v = pathAt(P, s.s, m), hy = Y(v), ms = milestones(P, s).filter(x => x.m && x.m <= m), lv = P.scen.map(x => ({ x, y: Y(pathAt(P, x.s, m)) }));
    const rings = []; for (let y = 312; y > hy + 14; y -= 18) rings.push(`<line x1="103" y1="${y}" x2="118" y2="${y - 2}" stroke="#6E4523" stroke-width="2"/>`);
    const dates = ms.slice(0, 6).map((x, i) => `<circle cx="${98 + (i % 3) * 13}" cy="${hy + 12 + Math.floor(i / 3) * 12}" r="7" fill="${i % 2 ? '#E0B860' : '#C7A24B'}"/>`).join('');
    const svg = svgEl(`<svg viewBox="0 0 362 380" width="100%" style="direction:ltr" aria-hidden="true"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B4A3B"/><stop offset="1" stop-color="#13785F"/></linearGradient></defs>`
      + `<rect width="362" height="322" fill="url(#sky)"/><rect y="322" width="362" height="58" fill="#E3CF97"/><circle cx="300" cy="${(200 - m / 3).toFixed(0)}" r="22" fill="#F5E6B0" opacity=".85"/>`
      + `<path d="M110 322 C 106 240, 116 150, 112 ${Y(top).toFixed(0)}" stroke="#FFFBEA" stroke-opacity=".18" stroke-width="14" fill="none" stroke-dasharray="4 6"/>`
      + `<ellipse cx="110" cy="324" rx="110" ry="8" fill="#B8954A" opacity=".5"/><path d="M110 324 C 106 ${(324 + hy) / 2 + 10}, 114 ${(324 + hy) / 2 - 10}, 111 ${hy.toFixed(1)}" stroke="#8B5E34" stroke-width="15" fill="none" stroke-linecap="round"/>` + rings.join('')
      + `<g fill="none" stroke-linecap="round" stroke-width="7" transform="translate(0 ${(hy - 196).toFixed(1)})"><path d="M111 196 C 76 178, 50 186, 30 210" stroke="#2E9B6E"/><path d="M111 196 C 148 176, 174 184, 196 206" stroke="#2E9B6E"/><path d="M111 196 C 84 160, 60 152, 40 158" stroke="#3DB07F"/><path d="M111 196 C 140 158, 166 150, 186 156" stroke="#3DB07F"/><path d="M111 196 C 106 162, 114 142, 124 128" stroke="#48C38D"/></g>` + dates
      + lv.filter(o => o.x.id !== s.id).map(o => `<line x1="140" y1="${o.y.toFixed(1)}" x2="262" y2="${o.y.toFixed(1)}" stroke="${o.x.id === 'up' ? '#B6F5D6' : '#FFD3C7'}" stroke-dasharray="3 4"/><text x="266" y="${(o.y + 4).toFixed(1)}" font-size="11" font-weight="700" fill="${o.x.id === 'up' ? '#B6F5D6' : '#FFD3C7'}">${SC_ICO[o.x.id]} ${esc(pShort(pathAt(P, o.x.s, m), P))}</text>`).join('')
      + `<text x="181" y="356" text-anchor="middle" fill="#10312A" font-size="12.5" font-weight="700">🌱 جذورها اليوم: ${esc(pShort(P.nw, P))} · ${ms.length ? 'قطفت ' + ms.length + ' تمرة' : 'كل تمرة هدف تصله'}</text></svg>`, 'palmsvg');
    const num = h('b', {}); num.dataset.v = box._last != null ? box._last : v; box._last = v;
    const rng = h('input', { type: 'range', min: '0', max: '300', step: '1', value: String(Math.round(m)), class: 'prange', 'aria-label': 'الزمن' }); rng.oninput = () => { PV.m = +rng.value; draw(); const r2 = box.querySelector('.prange'); r2 && r2.focus(); };
    box.replaceChildren(h('div', { class: 'scene' }, svg, h('div', { class: 'big' }, h('small', {}, (m < 0.5 ? 'اليوم' : 'بعد ' + yrsTxt(m) + ' · ' + yearAt(m)) + ' · ' + s.n), num, m >= 0.5 ? h('i', { class: v < P.nw ? 'down' : '' }, (v >= P.nw ? '▲ نمت ' : '▼ نقصت ') + pShort(Math.abs(v - P.nw), P)) : null)),
      h('div', { class: 'slider noswipe' }, rng), h('div', { class: 'ticks' }, ['الآن', '5 س', '10 س', '15 س', '20 س', '25 س'].map(t => h('span', {}, t))),
      ms.length ? h('div', { class: 'dates' }, ms.map(x => h('span', {}, '🌴 ' + pShort(x.t, P) + ' · ' + yearAt(x.m)))) : null, storyEl(P, m), pathBreak(P, m), careEl(m));
    countTo(num, v, x => pShort(x, P)); };
  draw(); return box; }
// ---- استشارات المسار بثلاثة تصاميم: رسائل من المستقبل (آلة الزمن)، إشارات الطريق (الرحلة)، دليل العناية (النخلة) ----
const ADVT = {
  dial: { leak: 'أوقف النزيف', rate: 'ادّخر أولاً', shield: 'ابنِ درعك قبل أي شيء', idle: 'نقدك نائم', debt: 'تحرّر من الدين', fragile: 'لا تعتمد على راتب واحد', cut: '15% تصنع فرقاً', mile: 'محطتك القادمة', compound: 'دع الزمن يعمل لك', diversify: 'لا تضع البيض في سلة واحدة', fx: 'احمِ قيمة ثروتك', goal: 'هدفك ينتظرك', pyf: 'ادفع لنفسك أولاً', real: 'القيمة الحقيقية' },
  road: { leak: 'منحدر خطر', rate: 'زِد السرعة', shield: 'محطة وقود قبل الطريق الطويل', idle: 'سيارة متوقفة', debt: 'حاجز على الطريق', fragile: 'طريق بمسار واحد', cut: 'طريق مختصر', mile: 'المحطة القادمة', compound: 'طريق سريع', diversify: 'لا تسلك طريقاً واحداً', fx: 'منعطف العملة', goal: 'محطة فاتتك', pyf: 'املأ الخزان أولاً', real: 'المسافة الحقيقية' },
  palm: { leak: ['🐛', 'آفة في الجذع'], rate: ['💧', 'السقاية'], shield: ['🛡', 'سياج النخلة'], idle: ['🧺', 'تمر مكدّس بلا قطاف'], debt: ['🪓', 'جذع مُثقل'], fragile: ['🌬', 'ريح قوية قادمة'], cut: ['✂', 'التقليم'], mile: ['🌴', 'التمرة القادمة'], compound: ['🌱', 'فسائل الزمن'], diversify: ['🌳', 'بستان لا نخلة واحدة'], fx: ['🏜', 'تربة واحدة'], goal: ['🍂', 'سعفة ذابلة'], pyf: ['🚿', 'اسقِ أولاً'], real: ['⚖', 'وزن التمر الحقيقي'] } };
const advDisc = () => h('p', { class: 'mut advd' }, 'استشارات مبنية على أرقامك وتتغير بتغيّرها، وهي قواعد عامة وليست استشارة مالية ملزمة.');
const ADVM = {}; // ذاكرة قصيرة أثناء السحب: الحساب يتكرر فقط عند تغيّر السيناريو أو كل 6 أشهر أو تغيّر البيانات
const pathAdv = m => { const k = PV.s + ':' + Math.round(m / 6) + ':' + S.tx.length + ':' + JSON.stringify(S.x.set.path || {}); if (ADVM.k === k) return ADVM.v; let v; try { v = FD.pathAdvice(S, L.today(), m, PV.s); } catch (e) { v = []; } ADVM.k = k; ADVM.v = v; return v; };
function lettersEl(m) { const A = pathAdv(m), yr = yearAt(Math.max(m, 1)); if (!A.length) return null;
  const card = a => h('div', { class: 'letter lv-' + a.lv }, h('div', { class: 'lh' }, h('span', {}, '✉ من نفسك في ' + yr), h('i', { class: 'stamp' }, a.lv === 'red' ? '!' : a.lv === 'warn' ? '⚠' : a.lv === 'ok' ? '✓' : '★')),
    h('h3', {}, ADVT.dial[a.k] || ''), h('p', {}, a.body), h('p', { class: 'step' }, h('b', {}, 'الخطوة: '), a.step));
  return h('div', { class: 'advp' }, h('h2', { class: 'sub' }, 'رسائل من المستقبل'), ...A.slice(0, 3).map(card), A.length > 3 ? fold('رسائل أخرى (' + (A.length - 3) + ')', false, ...A.slice(3).map(card)) : null, advDisc()); }
const SIGN = { red: ['sg-red', '⛔'], warn: ['sg-warn', '!'], ok: ['sg-ok', '✓'], info: ['sg-info', 'i'] };
function signsEl(A) { if (!A.length) return null;
  const card = (a, i) => h('div', { class: 'sign' }, h('span', { class: 'sgi ' + SIGN[a.lv][0] }, h('b', {}, String(i + 1))), h('div', {}, h('h3', {}, ADVT.road[a.k] || ''), h('p', {}, a.body), h('p', { class: 'step' }, h('b', {}, '➜ '), a.step)));
  return h('div', { class: 'advp' }, h('h2', { class: 'sub' }, 'إشارات على طريقك'), ...A.slice(0, 4).map(card), A.length > 4 ? fold('إشارات أخرى (' + (A.length - 4) + ')', false, ...A.slice(4).map((a, i) => card(a, i + 4))) : null, advDisc()); }
function careEl(m) { const A = pathAdv(m); if (!A.length) return null;
  const card = a => { const [ic, t] = ADVT.palm[a.k] || ['🌴', '']; return h('div', { class: 'care lv-' + a.lv }, h('span', { class: 'cic' }, ic), h('div', {}, h('h3', {}, t), h('p', {}, a.body), h('p', { class: 'step' }, h('b', {}, '🌿 '), a.step))); };
  return h('div', { class: 'advp' }, h('h2', { class: 'sub' }, 'دليل العناية بنخلتك'), ...A.slice(0, 3).map(card), A.length > 3 ? fold('نصائح أخرى (' + (A.length - 3) + ')', false, ...A.slice(3).map(card)) : null, advDisc()); }
function pathCard() { let P; try { P = FD.path(S); } catch (e) { return null; } if (!P) return null; const st = PSTYLES.find(x => x[0] === pStyle()), v = P.rows.find(r => r.id === 'y5').v, cur = v[0], mult = P.nw > 0 ? cur.show / P.nw : null;
  const el = sect('', h('div', { class: 'pc-h' }, h('span', {}, (st[0] === 'palm' ? '🌴 ' : st[0] === 'road' ? '🛣 ' : '⏳ ') + st[1] + ' · بعد 5 سنوات · ' + yearAt(60)), h('b', {}, pShort(cur.show, P)), mult != null ? h('small', { class: cur.show < P.nw ? 'badc' : 'okc' }, '× ' + mult.toFixed(1) + ' ثروتك اليوم') : null),
    h('div', { class: 'pc-l' }, v.map(x => h('span', {}, SC_ICO[x.id] + ' ' + x.n + ' ' + pShort(x.show, P)))), btn('افتح المسار المالي', () => go('insights', 'path'), 'alt'));
  el.classList.add('pcard', 'hero'); return el; }
function pathScreen(sub) { let P; try { P = FD.path(S); } catch (e) { P = null; } const fromSet = view.p.from === 'set', back = backBtn(() => sub === 'assume' ? go('insights', 'path') : fromSet ? go('more', 'set', { s: 'pathview' }) : go('insights'));
  if (!P) return h('div', {}, back, h('h1', {}, 'المسار المالي المستقبلي'), h('p', { class: 'mut' }, 'سجّل الرصيد الافتتاحي وبعض الدخل والمصروف أولاً.'));
  if (sub === 'assume') return pathAssume(P, back);
  const hz = sub && P.rows.find(r => r.id === sub); if (hz) PV.m = hz.m;
  const st = PSTYLES.find(x => x[0] === pStyle()), body = st[0] === 'road' ? pathRoad(P) : st[0] === 'palm' ? pathPalm(P) : pathDial(P);
  return h('div', { class: 'pathv ps-' + st[0] }, back, h('div', { class: 'hdr' }, h('h1', {}, st[1]), seg([['IQD', 'د.ع'], ['USD', '$']], PV.cur, k => { PV.cur = k; render(); })),
    h('p', { class: 'mut' }, st[0] === 'dial' ? 'أدِر القرص لتختار السنة، فتظهر ثروتك وقصتها.' : st[0] === 'road' ? 'كل محطة على الطريق = ثروتك المتوقعة. انزل لتسافر في الزمن.' : 'حرّك المؤشر وشاهد نخلتك تكبر. كل تمرة هدف تصله.'),
    scenChips(P), body, sect('', pathNote(P), h('div', { class: 'quick' }, btn('الافتراضات', () => go('insights', 'path', { h: 'assume' }), 'alt'), btn('غيّر الشكل', () => go('more', 'set', { s: 'pathview' }), 'alt')))); }
function pathViewPanel() { const cur = pStyle(), box = h('div', { class: 'skins' });
  PSTYLES.forEach(([id, n, d]) => box.append(h('button', { class: 'sk' + (id === cur ? ' on' : ''), 'aria-pressed': id === cur ? 'true' : 'false', 'data-pv': id, onclick: () => { setPStyle(id); toast('شكل المسار: ' + n); go('insights', 'path', { from: 'set' }); } },
    id === cur ? h('span', { class: 'ck' }, '✓') : null, h('div', { class: 'pvp' }, id === 'dial' ? '⏳' : id === 'road' ? '🛣' : '🌴'), h('span', { class: 'sn' }, n + (id === 'dial' ? ' (الافتراضي)' : '')), h('span', { class: 'sd' }, d))));
  return sect('شكل المسار المالي', h('p', { class: 'mut' }, 'الأرقام والحساب واحد في الأشكال الثلاثة، ويتغير العرض فقط. يُحفظ على هذا الجهاز.'), box, btn('افتح المسار المالي', () => go('insights', 'path'), 'alt')); }
function pathAssume(P, back) { const c = P.cfg, gIn = h('input', { inputmode: 'decimal', value: String(c.growth) }), iIn = h('input', { inputmode: 'decimal', value: String(c.infl) });
    const save = (patch, ok) => act(() => { S.x.set.path = { ...FD.pathCfg(S), ...patch }; }, ok);
    const num = (el, k, lo, hi) => () => { const v = Number(L.norm(el.value)); if (!Number.isFinite(v) || v < lo || v > hi) return toast('أدخل رقماً من ' + lo + ' إلى ' + hi, true); save({ [k]: v }, 'حُفظ'); };
    return h('div', {}, back, h('h1', {}, 'الافتراضات'),
      sect('من أين الأرقام', row('صافي الثروة الآن', money(P.nw)), row('متوسط الدخل الشهري', money(P.base.inc)), row('متوسط المصروف الشهري', money(P.base.exp)),
        h('p', { class: 'mut' }, P.base.n ? 'متوسط آخر ' + P.base.n + ' أشهر كاملة' + (P.base.est ? ' (أقل من 3: تقدير أولي)' : '') + '. يتحدّث تلقائياً مع كل شهر جديد.' : 'لا يوجد شهر كامل بعد: الأرقام من توقع هذا الشهر.')),
      sect('السيناريوهات', P.scen.map(x => row(x.n + (x.id === 'up' ? ' (المصروف −15%)' : x.id === 'down' ? ' (الدخل −20%، المصروف +10%)' : ' (كما هو)'), money(x.s) + ' شهرياً', x.s < 0 ? 'bad' : ''))),
      sect('نمو الأصول سنوياً %', h('p', { class: 'mut' }, 'افتراضياً 0%: لا نفترض أرباحاً. إن رفعته يُطبّق على ثروتك وادخارك معاً.'), h('label', { class: 'f' }, h('span', {}, 'النسبة السنوية (−10 إلى 15)'), gIn), btn('احفظ', num(gIn, 'growth', -10, 15), 'alt mini')),
      sect('بأسعار اليوم', h('p', { class: 'mut' }, 'يعرض المبالغ المستقبلية بقيمتها الشرائية اليوم، بخصم التضخم المفترض. مع تضخم 0% لا يتغير شيء.'), h('label', { class: 'f' }, h('span', {}, 'التضخم السنوي المفترض % (0 إلى 30)'), iIn), btn('احفظ', num(iIn, 'infl', 0, 30), 'alt mini'),
        seg([['0', 'بالأرقام الاسمية'], ['1', 'بأسعار اليوم']], c.real ? '1' : '0', k => save({ real: k === '1' }, k === '1' ? 'بأسعار اليوم' : 'بالأرقام الاسمية'))),
      btn('إعادة الافتراضات الافتراضية', () => act(() => { delete S.x.set.path; }, 'أُعيدت'), 'alt')); }
// ===== f1-v4.9 (المرحلة 6): 4 شريط الحدود، 6 الحالات الفارغة، 15 تعديل عملية، 17 بحث وتصفية، 19 شاشة البداية، 23 تذكير التسجيل، 26 الادخار بالأشهر، 27 الراتب والدخل الإضافي، 28 عمر سعر الصرف، 29 المطابقة الشهرية =====
// ---- 6: حالة فارغة واضحة بأيقونة وجملة وزر ----
const emptyState = (ic, t, d, b) => h('div', { class: 'empty' }, h('span', { class: 'eic' }, ic), h('b', {}, t), d ? h('p', {}, d) : null, b ? btn(b[0], b[1], 'alt mini') : null);
// ---- 4: شريط تقدّم حدود المصروف ----
function limitBar(x) { const p = x.limit > 0 ? x.spent / x.limit : 0, cls = x.over ? 'over' : x.near || x.pace ? 'near' : 'okb';
  return h('div', { class: 'lbar ' + cls }, h('div', { class: 'r' }, h('span', {}, x.g), h('b', {}, money(x.spent) + ' / ' + money(x.limit))), h('div', { class: 'lt' }, h('i', { style: 'width:' + Math.min(100, p * 100).toFixed(1) + '%' }), h('u', { style: 'right:' + Math.min(100, (+L.today().slice(8)) / (+L.monthEnd(L.mkey(L.today())).slice(8)) * 100).toFixed(1) + '%' })),
    h('small', { class: x.over ? 'badc' : cls === 'near' ? 'warnc' : 'mut' }, x.over ? 'تجاوزت الحد بـ ' + money(x.spent - x.limit) : x.limit > x.spent ? 'بقي ' + money(x.limit - x.spent) + ' · ' + Math.round(p * 100) + '%' : '')); }
function limitsHome() { let B; try { B = L.budget(S).filter(x => x.limit > 0 && x.spent >= x.limit * 0.5); } catch (e) { return null; } if (!B.length) return null;
  return sect('حدود هذا الشهر', B.map(limitBar), h('p', { class: 'mut' }, 'الخط الرفيع = أين يجب أن تكون حسب أيام الشهر.'), btn('كل الحدود', () => go('more', 'reports', { mode: 'limits' }), 'alt mini')); }
// ---- 28: عمر سعر الصرف ----
function rateAge() { if (!S.x.rates.length) return null; const d = S.x.rates[S.x.rates.length - 1].d, n = Math.max(0, Math.round((Date.parse(L.today()) - Date.parse(d)) / 864e5));
  return h('span', { class: 'chip ' + (n <= 3 ? 'c-cur' : n <= 14 ? 'c-old' : 'c-na rate-bad') }, n === 0 ? 'اليوم' : n === 1 ? 'أمس' : 'منذ ' + n + ' يوماً'); }
// ---- 27: الراتب مقابل الدخل الإضافي ----
function incSplit(from, to) { const o = { salary: 0, other: 0 }; S.tx.filter(t => !t.voided && !t.reverses && t.type === 'income' && t.date >= from && t.date <= to).forEach(t => postsOf(t.id).filter(p => S.acc[p.a].kind === 'income').forEach(p => { if (p.a === 'inc_salary') o.salary -= p.iqd; else o.other -= p.iqd; })); return o; }
const splitRows = (from, to) => { const s = incSplit(from, to), t = s.salary + s.other; if (!t) return null; const pc = v => Math.round(v / t * 100);
  return h('div', { class: 'isplit' }, h('div', { class: 'ib2' }, h('i', { style: 'width:' + pc(s.salary) + '%' })), row('الراتب الأساسي', money(s.salary) + ' · ' + pc(s.salary) + '%'), row('دخل إضافي', money(s.other) + ' · ' + pc(s.other) + '%'),
    s.other === 0 ? h('p', { class: 'mut' }, 'دخلك كله من الراتب: أي توقف فيه يوقف كل شيء.') : null); };
// ---- 26: الادخار بالأشهر نحو هدف الستة أشهر ----
function monthsShield() { const ms = typeof FM !== 'undefined' ? FM.months(S, 4).slice(0, -1).filter(m => m.expense > 0) : [], avg = ms.length ? ms.reduce((a, m) => a + m.expense, 0) / ms.length : 0; if (!avg) return null;
  const sv = FM.savings(S), amt = sv ? sv.amount : E.snap(S).liq, mo = Math.round(amt / avg * 10) / 10;
  return h('div', { class: 'shield' }, h('div', { class: 'r' }, h('span', {}, (sv ? 'مدخراتك «' + sv.name + '»' : 'سيولتك') + ' تكفي'), h('b', {}, mo + ' من 6 أشهر')), h('div', { class: 'lt' }, h('i', { style: 'width:' + Math.min(100, mo / 6 * 100).toFixed(1) + '%' })),
    h('small', { class: 'mut' }, mo >= 6 ? '✓ درع الطوارئ مكتمل: ما يزيد يذهب لأهدافك.' : 'ينقصك ' + money(Math.round((6 - mo) * avg)) + ' لتكتمل 6 أشهر (متوسط مصروفك ' + money(Math.round(avg)) + ').')); }
// ---- 23: تذكير داخل التطبيق إن لم تسجّل منذ 3 أيام ----
const NUDGE = 'flousi-nudge';
function nudgeBanner() { if (!S.x.openDate) return null; const ds = S.tx.filter(t => !['opening', 'opening_fix', 'reversal'].includes(t.type) && !t.voided).map(t => t.date).sort(), last = ds.length ? ds[ds.length - 1] : S.x.openDate;
  const n = Math.round((Date.parse(L.today()) - Date.parse(last)) / 864e5); let off = null; try { off = localStorage.getItem(NUDGE); } catch (e) {} if (n < 3 || off === L.today()) return null;
  return h('div', { class: 'ticker warn nudge' }, h('span', {}, '✍ لم تسجّل شيئاً منذ ' + n + ' أيام. ما صرفته وتنساه يضيع من الحساب.'), h('div', { class: 'quick' }, btn('سجّل الآن', () => go('ops', null, { kind: 'expense' }), 'mini'), btn('لاحقاً', () => { try { localStorage.setItem(NUDGE, L.today()); } catch (e) {} render(); }, 'mini alt'))); }
// ---- 29: المطابقة الشهرية ----
const reconKey = () => { const t = L.today(), d = +t.slice(8); return d >= 25 ? L.mkey(t) : d <= 3 ? L.prevMonth(L.mkey(t)) : null; };
function reconBanner() { if (!S.x.openDate) return null; const k = reconKey(); if (!k || (S.x.reconDone || {})[k]) return null;
  return h('div', { class: 'ticker nudge', onclick: () => go('more', 'monthrecon') }, '🧮 مطابقة آخر الشهر: عدّ نقدك وتأكد أن أرصدتك في التطبيق مطابقة. دقيقة واحدة ›'); }
MORE.push(['monthrecon', 'المطابقة الشهرية', () => { const A = userAccts(a => a.kind === 'asset' && a.liquid), k = reconKey() || L.mkey(L.today()), done = (S.x.reconDone || {})[k], ins = {};
  if (!A.length) return emptyState('🧮', 'لا حسابات سائلة', 'أنشئ حساباً من «أموالي» أولاً.');
  const rows = A.map(a => { const b = E.bal(S, a.id); if (a.cur === 'USD') return h('div', { class: 'tx' }, row(a.name, L.fmtUsd(b)), h('small', { class: 'mut' }, 'حساب الدولار: صحّحه بتحويل أو مصروف إن اختلف.'));
    ins[a.id] = h('input', { inputmode: 'numeric', placeholder: 'المسجّل: ' + L.fmt(b) }); return h('div', { class: 'tx' }, row(a.name, money(b)), h('label', { class: 'f' }, h('span', {}, 'الموجود فعلاً (اتركه فارغاً إن كان مطابقاً)'), ins[a.id])); });
  const mark = () => { S.x.reconDone = { ...(S.x.reconDone || {}), [k]: L.today() }; };
  return h('div', {}, h('p', { class: 'mut' }, 'شهر ' + k + (done ? ' · طوبق في ' + done + ' ✓' : '') + '. اكتب الموجود فعلاً فقط حيث يختلف؛ يُسجَّل الفرق «مطابقة» لا دخلاً ولا مصروفاً.'), sect('', ...rows),
    btn('طابق وسجّل الفروق', () => { let n = 0; act(() => { Object.entries(ins).forEach(([id, el]) => { if (!el.value.trim()) return; const c = L.parseAmount(el.value, 0); if (c !== E.bal(S, id)) { L.reconcile(S, { date: L.today(), acct: id, counted: c }); n++; } }); mark(); }, 'تمت المطابقة').then(() => { toast(n ? 'سُجّل ' + n + ' فرق' : 'كل الأرصدة مطابقة ✓'); go('home'); }); }, 'prim'),
    btn('كلها مطابقة ✓', () => act(mark, 'كل الأرصدة مطابقة ✓').then(() => go('home')), 'alt')); }]);
// ---- 17: بحث وتصفية العمليات + 15: زر التعديل ----
const TXF = { q: '', t: 'all', per: 'm' };
const ndig = s => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬,]/g, '').toLowerCase();
const editable = r => r && !r.voided && !r.reverses && ['expense', 'income', 'transfer'].includes(r.type) && !(r.meta && r.meta.stock);
function txRow(t, r) { return h('div', { class: 'tx' + (t.voided || t.reversal ? ' void' : '') },
  h('div', { class: 'r' }, h('span', {}, h('span', { class: 'cat' }, catIco(t.label)), t.date + ' · ' + t.label), h('b', {}, money(t.amount) + (t.usd ? ' (' + L.fmtUsd(t.usd) + ')' : ''))),
  h('div', { class: 'mut' }, (t.from ? t.from + ' ← ' : '') + t.to + (t.note ? ' — ' + t.note : '') + (t.voided ? ' (معكوسة)' : '')),
  (!t.voided && !t.reversal && t.label !== 'رصيد افتتاحي' && t.label !== 'تصحيح افتتاحي') ? h('div', { class: 'quick' }, editable(r) ? btn('تعديل', () => go('ops', 'edit', { id: t.id }), 'mini alt') : null,
    btn('تراجع', () => { if (confirm('عكس هذه العملية؟ تبقى ظاهرة في السجل.')) act(() => { const o = S.tx.find(x => x.id === t.id); L.undo(S, t.id, L.today() > o.date ? L.today() : o.date); }, 'عُكست العملية'); }, 'mini')) : null); }
function txList2() { const all = L.listTx(S), raw = new Map(S.tx.map(t => [t.id, t])), list = h('div', {}), sum = h('p', { class: 'mut' });
  if (!all.filter(t => t.label !== 'رصيد افتتاحي').length) return sect('العمليات', emptyState('🧾', 'لا عمليات بعد', 'سجّل أول مصروف من الأعلى، وستظهر عملياتك هنا مع البحث والتصفية.'));
  const q = h('input', { type: 'search', placeholder: '🔍 ابحث: ملاحظة، مبلغ، فئة، حساب', value: TXF.q, autocomplete: 'off', 'aria-label': 'بحث في العمليات' });
  const draw = () => { const m = L.mkey(L.today()), pm = L.prevMonth(m), w = ndig(TXF.q).trim().split(/\s+/).filter(Boolean);
    const xs = all.filter(t => { const r = raw.get(t.id), ty = r.type; if (TXF.t !== 'all' && !(TXF.t === 'transfer' ? ['transfer', 'convert'].includes(ty) : TXF.t === 'other' ? !['expense', 'income', 'transfer', 'convert'].includes(ty) : ty === TXF.t)) return false;
      if (TXF.per === 'm' && t.date.slice(0, 7) !== m) return false; if (TXF.per === 'pm' && t.date.slice(0, 7) !== pm) return false;
      if (w.length) { const hay = ndig([t.label, t.note, t.from, t.to, t.date, t.amount, L.fmt(t.amount)].join(' ')); return w.every(x => hay.includes(x)); } return true; });
    const live = xs.filter(t => !t.voided && !t.reversal), tot = live.reduce((a, t) => a + t.amount, 0);
    sum.textContent = xs.length + ' عملية' + (TXF.t !== 'all' && live.length ? ' · المجموع ' + money(tot) : '') + (xs.length > 200 ? ' · يُعرض أحدث 200' : '');
    list.replaceChildren(...(xs.length ? xs.slice(0, 200).map(t => txRow(t, raw.get(t.id))) : [emptyState('🔎', 'لا نتائج', 'غيّر كلمة البحث أو الفترة.')])); };
  q.oninput = () => { TXF.q = q.value; draw(); }; draw();
  return sect('العمليات', h('div', { class: 'sq' }, q), seg([['all', 'الكل'], ['expense', 'مصروف'], ['income', 'دخل'], ['transfer', 'تحويل'], ['other', 'أخرى']], TXF.t, k => { TXF.t = k; render(); }),
    seg([['m', 'هذا الشهر'], ['pm', 'الشهر الماضي'], ['all', 'كل الفترات']], TXF.per, k => { TXF.per = k; render(); }), sum, list); }
// ---- 15: تعديل عملية = عكس الأصل (يبقى ظاهراً في السجل) + قيد جديد صحيح، في خطوة واحدة ----
function editScreen(id) { const r = S.tx.find(x => x.id === id), back = backBtn(() => go('ops'));
  if (!editable(r)) return h('div', {}, back, h('h1', {}, 'تعديل عملية'), h('p', { class: 'mut' }, 'لا يمكن تعديل هذه العملية. استعمل «تراجع» ثم سجّلها من جديد.'));
  const ps = S.post.filter(p => p.tx === id), A = accOpts(), isUsd = a => a && S.acc[a] && S.acc[a].cur === 'USD', nat = (a, n) => isUsd(a) ? (Math.abs(n) / 100).toFixed(2) : String(Math.abs(n));
  const D = { k: 'date', l: 'التاريخ', t: 'date', v: r.date, req: true }, N = { k: 'note', l: 'ملاحظة', t: 'text', v: r.note || '' };
  const save = (fn, extra) => { if (!confirm('حفظ التعديل؟ تُعكس العملية القديمة (تبقى ظاهرة في السجل) وتُسجَّل الجديدة.')) return;
    return act(() => { const o = S.tx.find(x => x.id === id); L.undo(S, id, L.today() > o.date ? L.today() : o.date); const nid = fn(); if (r.meta && r.meta.pyf) S.tx.find(x => x.id === nid).meta = { pyf: 1 }; return nid; }, 'عُدّلت العملية').then(x => { if (x) go('ops'); }); };
  const rt = (a, v) => isUsd(a) ? L.parseAmount(v.rate, 2) : null, amt = (a, v) => L.parseAmount(v.amount, isUsd(a) ? 2 : 0);
  let form;
  if (r.type === 'expense') { const c = ps.find(p => S.acc[p.a].kind === 'expense'), a = ps.find(p => S.acc[p.a].kind === 'asset');
    form = buildForm([D, { k: 'acct', l: 'يُصرف من', t: 'select', opts: A, v: a.a }, { k: 'amount', l: 'المبلغ', t: 'num', req: true, v: nat(a.a, a.n) }, { k: 'cat', l: 'الفئة', t: 'select', opts: L.CATS.map(x => [x[0], x[1]]), v: c.a },
      { ...rateDyn('date', v => isUsd(v.acct)), v: a.rate ? String(a.rate / 100) : undefined }, N], v => save(() => L.expense(S, { date: v.date, acct: v.acct, cat: v.cat, amount: amt(v.acct, v), r: rt(v.acct, v), note: v.note })), 'احفظ التعديل'); }
  else if (r.type === 'income') { const c = ps.find(p => S.acc[p.a].kind === 'income'), a = ps.find(p => S.acc[p.a].kind === 'asset');
    form = buildForm([D, { k: 'acct', l: 'يدخل إلى', t: 'select', opts: A, v: a.a }, { k: 'src', l: 'المصدر', t: 'select', opts: [['inc_salary', 'الراتب'], ['inc_other', 'دخل آخر']], v: c.a }, { k: 'amount', l: 'المبلغ', t: 'num', req: true, v: nat(a.a, a.n) },
      { ...rateDyn('date', v => isUsd(v.acct)), v: a.rate ? String(a.rate / 100) : undefined }, N], v => save(() => L.income(S, { date: v.date, acct: v.acct, src: v.src, amount: amt(v.acct, v), r: rt(v.acct, v), note: v.note })), 'احفظ التعديل'); }
  else { const f = ps.find(p => p.n < 0), t = ps.find(p => p.n > 0); if (!f || !t || S.acc[f.a].cur !== 'IQD' || S.acc[t.a].cur !== 'IQD') return h('div', {}, back, h('h1', {}, 'تعديل عملية'), h('p', { class: 'mut' }, 'تعديل التحويل متاح بين حسابين بالدينار فقط. استعمل «تراجع» ثم سجّله من جديد.'));
    const IQ = accOpts(a => a.cur === 'IQD'); form = buildForm([D, { k: 'from', l: 'من', t: 'select', opts: IQ, v: f.a }, { k: 'to', l: 'إلى', t: 'select', opts: IQ, v: t.a }, { k: 'amount', l: 'المبلغ', t: 'num', req: true, v: String(t.n) }, N],
      v => save(() => L.transfer(S, { date: v.date, from: v.from, to: v.to, amount: L.parseAmount(v.amount, 0), note: v.note })), 'احفظ التعديل'); }
  const d = L.listTx(S).find(x => x.id === id);
  return h('div', {}, back, h('h1', {}, 'تعديل عملية'), sect('الأصل', row(d.date + ' · ' + d.label, money(d.amount)), h('p', { class: 'mut' }, (d.from ? d.from + ' ← ' : '') + d.to + (d.note ? ' — ' + d.note : ''))),
    h('p', { class: 'mut' }, 'التعديل لا يمحو شيئاً: تُعكس العملية القديمة وتبقى في السجل للأمانة، وتُسجَّل الصحيحة مكانها.'), sect('', form)); }
// ---- 19: شاشة البداية ----
function startPanel() { const cur = (S.x.set.start === 'assets' ? 'accts' : S.x.set.start) || 'home'; // «الأصول» القديمة تُقرأ «أموالي»
  return sect('شاشة البداية', h('p', { class: 'mut' }, 'الشاشة التي يفتح عليها التطبيق.'), seg(TABS.filter(([k]) => fOn(k)).map(([k, t]) => [k, t]), cur, k => act(() => { S.x.set.start = k === 'home' ? undefined : k; if (!S.x.set.start) delete S.x.set.start; }, 'حُفظت شاشة البداية'))); }
// ===== f1-v4.10 (ب): قائمة الرغبات وقاعدة 24 ساعة، يوم الراتب، الفئة التلقائية من الملاحظة =====
// ---- قائمة الرغبات: تؤجّل الشراء يوماً، ثم تسأل «ما زلت تريده؟». ما تتراجع عنه يُجمع في «وفّرت بالتريث» ----
const WAIT_MS = 24 * 3600e3, wishes = () => (S.x.wish || []);
const wishReady = () => wishes().filter(w => !w.done && Date.now() - w.t >= WAIT_MS);
const wishSaved = () => wishes().filter(w => w.done === 'skip').reduce((a, w) => a + w.amount, 0);
const addWish = (name, amount, type) => act(() => { if (!String(name || '').trim()) throw new Error('اكتب اسم الشيء'); if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('اكتب مبلغاً موجباً');
  S.x.wish = wishes().concat([{ id: 'w' + Date.now().toString(36), name: String(name).trim(), amount, type: type || null, t: Date.now(), done: null, at: null }]); }, 'أُضيف إلى قائمة الرغبات. سأسألك بعد 24 ساعة');
const wishSet = (id, v) => act(() => { S.x.wish = wishes().map(w => w.id === id ? { ...w, done: v, at: L.today() } : w); }, v === 'skip' ? 'أحسنت: وفّرت بالتريث' : v === 'buy' ? 'سجّل المصروف الآن' : 'حُذف');
const leftTxt = ms => { const h2 = Math.ceil(ms / 3600e3); return h2 >= 1 ? 'يُسأل بعد ' + h2 + ' ساعة' : 'يُسأل بعد دقائق'; };
function wishBanner() { const r = wishReady(); if (!r.length) return null;
  return h('div', { class: 'ticker nudge', onclick: () => go('more', 'wish') }, '🛍 مرّ يوم على «' + r[0].name + '» (' + money(r[0].amount) + '). ما زلت تريده؟' + (r.length > 1 ? ' و' + (r.length - 1) + ' غيره' : '') + ' ›'); }
MORE.push(['wish', 'قائمة الرغبات', () => { const W = wishes(), pend = W.filter(w => !w.done), ready = pend.filter(w => Date.now() - w.t >= WAIT_MS), wait = pend.filter(w => Date.now() - w.t < WAIT_MS), past = W.filter(w => w.done).slice(-10).reverse(), sv = wishSaved();
  const buy = w => { QX.amt = String(w.amount); QX.note = w.name; QX.picked = false; wishSet(w.id, 'buy').then(() => go('ops', null, { kind: 'expense' })); };
  const f = buildForm([{ k: 'name', l: 'ماذا تريد أن تشتري؟', t: 'text', req: true }, { k: 'amount', l: 'سعره (د.ع)', t: 'num', req: true }], v => addWish(v.name, L.parseAmount(v.amount, 0)), 'انتظر يوماً');
  return h('div', {}, sect('', h('div', { class: 'wsave' }, h('span', {}, '🧘 وفّرت بالتريث'), h('b', {}, money(sv))), h('p', { class: 'mut' }, 'قاعدة الـ24 ساعة: أغلب الرغبات تبرد خلال يوم. اكتب ما تريده، وسأسألك غداً إن كنت ما زلت تريده.')),
    ready.length ? sect('حان وقت القرار', ready.map(w => h('div', { class: 'wish rdy' }, row(w.name, money(w.amount)), h('p', { class: 'mut' }, 'ما زلت تريده بعد يوم كامل؟'),
      h('div', { class: 'quick' }, btn('نعم، سأشتريه', () => buy(w), 'mini'), btn('لا، تراجعت', () => wishSet(w.id, 'skip'), 'mini alt'))))) : null,
    wait.length ? sect('في الانتظار', wait.map(w => h('div', { class: 'wish' }, row(w.name, money(w.amount)), h('div', { class: 'r' }, h('small', { class: 'mut' }, '⏳ ' + leftTxt(WAIT_MS - (Date.now() - w.t))), btn('احذف', () => wishSet(w.id, 'del'), 'mini alt'))))) : null,
    !pend.length ? emptyState('🛍', 'لا رغبات منتظرة', 'قبل أي شراء غير ضروري أضفه هنا، أو اضغط «انتظر يوماً» في «هل أشتري؟».') : null,
    sect('رغبة جديدة', f), past.length ? sect('القرارات السابقة', past.filter(w => w.done !== 'del').map(w => row(w.name + ' · ' + (w.done === 'skip' ? 'تراجعت ✓' : 'اشتريت'), money(w.amount), w.done === 'skip' ? 'okc' : ''))) : null); }]);
// ---- يوم الراتب: ادفع لنفسك أولاً ← أقساط الأهداف ← الفواتير الثابتة ← ورقة الراتب ----
function pyfDone() { const p = view.p; if (p.flow) go('more', 'payday', { salary: p.salary, acct: p.acct, date: p.date, step: 2 }); else go('home'); }
const pdSteps = n => h('div', { class: 'pdsteps' }, ['ادّخر', 'الأهداف', 'الفواتير', 'الخلاصة'].map((t, i) => h('span', { class: i + 1 < n ? 'done' : i + 1 === n ? 'on' : '' }, (i + 1 < n ? '✓ ' : (i + 1) + ' ') + t)));
function paydaySheet(sal, d) { const m = L.mkey(d), from = m + '-01', to = L.monthEnd(m), live = S.tx.filter(t => !t.voided && !t.reverses && t.date >= from && t.date <= to);
  const saved = live.filter(t => t.meta && t.meta.pyf).reduce((a, t) => a + postsOf(t.id).filter(p => p.iqd > 0).reduce((x, p) => x + p.iqd, 0), 0) + S.goals.filter(g => g.pyf && g.date >= from && g.date <= to).reduce((a, g) => a + g.amount, 0);
  const goals = S.goals.filter(g => !g.pyf && g.date && g.date >= from && g.date <= to).reduce((a, g) => a + g.amount, 0);
  const names = new Set(S.x.recur.filter(r => r.kind === 'expense').map(r => r.name)), bills = live.filter(t => t.type === 'expense' && names.has(t.note)).reduce((a, t) => a + postsOf(t.id).filter(p => S.acc[p.a].kind === 'expense').reduce((x, p) => x + p.iqd, 0), 0);
  const free = sal - saved - goals - bills, days = FD.daysLeft(L.today()); return { saved, goals, bills, free, days, perDay: free > 0 ? Math.floor(free / days) : 0 }; }
MORE.push(['payday', 'يوم الراتب', () => { const p = view.p, sal = p.salary, d = p.date || L.today(), step = p.step || 2, nx = n => go('more', 'payday', { ...p, step: n });
  if (!sal) return emptyState('💰', 'يوم الراتب', 'يبدأ تلقائياً بعد تسجيل راتبك.');
  if (step === 2) { const G = L.goalView(S).filter(g => !g.done && g.cur !== 'USD' && g.monthly > g.paidMonth), sel = {};
    return h('div', {}, pdSteps(2), sect('أقساط أهدافك هذا الشهر', G.length ? G.map(g => { const a = Math.max(0, g.monthly - g.paidMonth), cb = h('input', { type: 'checkbox', checked: true, class: 'pdc' }); sel[g.id] = [cb, a];
        return h('label', { class: 'pdrow' }, cb, h('span', {}, g.name + (g.id === S.x.set.savingsGoal ? ' (المدخرات)' : '')), h('b', {}, money(a))); }) : emptyState('🎯', 'لا أقساط مستحقة', 'أهدافك مغطاة هذا الشهر، أو لا توجد أهداف بالدينار.'),
      G.length ? btn('خصّص المحدد', () => { let n = 0; act(() => { Object.entries(sel).forEach(([id, [cb, a]]) => { if (cb.checked && a > 0) { L.goalMove(S, { id, amount: a, date: d }); n++; } }); return true; }, 'خُصّص لـ ' + Object.values(sel).filter(([cb]) => cb.checked).length + ' هدف').then(r => { if (r) nx(3); }); }, 'prim') : null,
      btn(G.length ? 'تخطَّ' : 'التالي', () => nx(3), 'alt'))); }
  if (step === 3) { const m = L.mkey(d), R = S.x.recur.filter(r => r.active && r.kind === 'expense' && r.last !== m), sel = {};
    return h('div', {}, pdSteps(3), sect('فواتيرك الثابتة هذا الشهر', R.length ? R.map(r => { const cb = h('input', { type: 'checkbox', checked: true, class: 'pdc' }); sel[r.id] = cb;
        return h('label', { class: 'pdrow' }, cb, h('span', {}, r.name + ' · يوم ' + r.day), h('b', {}, money(r.amount))); }) : emptyState('🧾', 'لا فواتير منتظرة', 'كل بنودك المتكررة مسجّلة لهذا الشهر.'),
      R.length ? h('p', { class: 'mut' }, 'سجّل ما دفعته فعلاً اليوم فقط؛ الباقي يبقى تذكيراً في موعده.') : null,
      R.length ? btn('سجّل المحدد كمدفوع', () => act(() => { R.forEach(r => { if (sel[r.id].checked) L.recurConfirm(S, { id: r.id, date: L.today() < d ? d : L.today(), amount: r.amount }); }); return true; }, 'سُجّلت الفواتير').then(r => { if (r) nx(4); }), 'prim') : null,
      btn(R.length ? 'تخطَّ' : 'التالي', () => nx(4), 'alt'))); }
  const x = paydaySheet(sal, d), parts = [['ادّخرت', x.saved, 'var(--ok)'], ['أهداف', x.goals, 'var(--acc)'], ['فواتير', x.bills, 'var(--wait)'], ['حرّ للصرف', Math.max(0, x.free), 'var(--mute)']];
  return h('div', {}, pdSteps(5), sect('', h('div', { class: 'pdsheet' }, h('small', {}, 'ورقة الراتب · ' + nWhen(d)), h('b', {}, money(sal)),
      h('div', { class: 'pdbar' }, parts.map(([, v, c]) => h('i', { style: 'width:' + (sal > 0 ? Math.max(0, v) / sal * 100 : 0).toFixed(1) + '%;background:' + c }))),
      parts.map(([t, v, c]) => row(h('span', {}, h('i', { class: 'dotc', style: 'background:' + c }), t), money(v) + (sal > 0 ? ' · ' + Math.round(v / sal * 100) + '%' : ''))),
      x.free < 0 ? h('p', { class: 'badc' }, 'ما خصّصته أكبر من الراتب بـ ' + money(-x.free) + ': الفرق خرج من رصيدك السابق.') : h('p', { class: 'okc' }, 'الحرّ للصرف ' + money(x.free) + ' ≈ ' + money(x.perDay) + ' يومياً حتى آخر الشهر.'))),
    h('p', { class: 'mut' }, 'كل دينار من راتبك صار له مكان. التحويلات والتخصيصات مسجّلة في التطبيق فقط؛ انقل المال الحقيقي بنفسك.'), btn('إلى الرئيسية', () => go('home'), 'prim')); }]);
// ---- الفئة التلقائية من الملاحظة: من سجلّك أولاً (الأكثر تكراراً لهذه الكلمة)، ثم قاموس كلمات عراقية شائعة ----
const CAT_WORDS = { c_food: ['صمون', 'خبز', 'مطعم', 'غداء', 'عشاء', 'فطور', 'سوق', 'خضرة', 'فواكه', 'لحم', 'دجاج', 'مسواك', 'كص', 'فلافل', 'بيتزا', 'برغر', 'أكل', 'اكل'], c_trans: ['تكسي', 'تاكسي', 'بنزين', 'وقود', 'كروة', 'باص', 'كيا', 'تصليح', 'غسيل سيارة', 'كراج', 'اوبر', 'كريم'],
  c_comm: ['كارت', 'رصيد', 'انترنت', 'إنترنت', 'اشتراك', 'زين', 'آسيا', 'اسيا', 'كورك'], c_bills: ['كهرباء', 'مولدة', 'ماء', 'غاز', 'قنينة', 'نفط', 'ايجار', 'إيجار'], c_health: ['دواء', 'صيدلية', 'طبيب', 'دكتور', 'تحليل', 'مستشفى', 'عيادة', 'أشعة', 'اسنان'],
  c_cloth: ['ملابس', 'حذاء', 'قميص', 'بنطرون', 'جاكيت', 'دشداشة'], c_gift: ['هدية', 'عرس', 'عيدية', 'تعزية', 'مناسبة', 'نقوط'], c_edu: ['كتاب', 'دورة', 'كورس', 'قرطاسية', 'مدرسة', 'جامعة'], c_ent: ['قهوة', 'كافيه', 'سينما', 'نزهة', 'ألعاب', 'العاب', 'شيشة', 'نركيلة'], c_home: ['أثاث', 'اثاث', 'منظفات', 'أدوات', 'تصليح بيت'] };
const ntext = s => String(s || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
function guessCat(note) { const n = ntext(note); if (n.length < 2) return null; const c = {}; expTx(365).forEach(x => { const xn = ntext(x.note); if (xn && (xn === n || (n.length >= 3 && xn.startsWith(n)))) c[x.cat] = (c[x.cat] || 0) + 1; });
  const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; if (best) return { cat: best[0], from: 'h' };
  for (const [cat, ws] of Object.entries(CAT_WORDS)) if (S.acc[cat] && ws.some(w => n.includes(ntext(w)))) return { cat, from: 'w' }; return null; }
// ===== f1-v4.10 (ج): مواسم العراق، بطاقة الشهر، الإنجازات، الحركة الموحّدة =====
const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const REDUCED = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
// ---- 4: الموسم القادم ----
function seasonCard() { let X; try { X = FD.seasons(S); } catch (e) { return null; } const x = X.find(e => LS.get('flousi-season-' + e.id) !== 'off'); if (!x) return null;
  const has = S.x.goalsDef.some(g => g.name === x.n + ' ' + x.d.slice(0, 4));
  const el = sect('', h('div', { class: 'seah' }, h('span', { class: 'seai' }, x.ic), h('div', {}, h('b', {}, x.n + ' بعد ' + x.days + ' يوماً'), h('small', {}, nWhen(x.d) + (x.k === 's' ? ' تقريباً' : ' (تقريباً، حسب رؤية الهلال)')))),
    x.last ? row('في ' + x.n + ' الماضي صرفت', money(x.last.v) + (x.last.extra ? ' (+' + L.fmt(x.last.extra) + ' فوق عادتك)' : '')) : row('تقدير مصروفه الإضافي', money(x.est)),
    h('p', { class: 'okc' }, 'جنّب ' + money(x.weekly) + ' أسبوعياً من الآن، فيأتي ' + x.n + ' ومصروفه جاهز ولا يمسّ شهرك.'),
    h('div', { class: 'quick' }, has ? btn('هدفه موجود', () => go('more', 'goals'), 'mini alt') : btn('اجعله هدفاً', () => act(() => { const id = L.goalNew(S, { name: x.n + ' ' + x.d.slice(0, 4), cur: 'IQD', target: Math.ceil(x.est / 1000) * 1000, targetDate: x.d, priority: 2, kind: 'short' }); return id; }, 'أُضيف هدف «' + x.n + '»').then(r => { if (r) go('more', 'goals'); }), 'mini'),
      btn('إخفاء', () => { LS.set('flousi-season-' + x.id, 'off'); render(); }, 'mini alt')));
  el.classList.add('season'); return el; }
// ---- 5: بطاقة الشهر ----
const MNAMES = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'], mName = k => MNAMES[+k.slice(5) - 1] + ' ' + k.slice(0, 4);
function wrapBanner() { if (!S.x.openDate || +L.today().slice(8) > 7) return null; const k = L.prevMonth(L.mkey(L.today())); if (L.monthEnd(k) < S.x.openDate || LS.get('flousi-wrap-' + k)) return null;
  return h('div', { class: 'ticker nudge wrapb', onclick: () => go('insights', 'wrap', { k }) }, '🎴 بطاقة شهرك (' + mName(k) + ') جاهزة ›'); }
function wrapScreen(k0) { const ks = monthsList().filter(k => k < L.mkey(L.today()) && L.monthEnd(k) >= S.x.openDate), k = k0 && ks.includes(k0) ? k0 : ks[0], back = backBtn(() => go('insights'));
  if (!k) return h('div', {}, back, h('h1', {}, 'بطاقة الشهر'), emptyState('🎴', 'لا شهر مكتمل بعد', 'تظهر بطاقة شهرك في أول الشهر القادم.'));
  LS.set('flousi-wrap-' + k, '1'); const c = FD.monthCard(S, k), rate = c.rate;
  const card = h('div', { class: 'wrapc' }, h('small', {}, 'شهرك في فلوسي'), h('h2', {}, mName(k)),
    h('div', { class: 'wrbig' }, rate == null ? '—' : (rate >= 0 ? 'ادّخرت ' : 'عجز ') + Math.abs(rate) + '%'), h('p', {}, rate == null ? 'لا دخل مسجّل في هذا الشهر.' : rate >= 20 ? 'شهر من شهور بناة الثروة 💎' : rate >= 10 ? 'شهر متوازن 👍' : rate >= 0 ? 'شهر ضيّق: الشهر القادم أفضل' : 'صرفت أكثر من دخلك'),
    h('div', { class: 'wgrid' }, h('div', {}, h('small', {}, 'الدخل'), h('b', {}, pShortI(c.income))), h('div', {}, h('small', {}, 'المصروف'), h('b', {}, pShortI(c.expense))), h('div', {}, h('small', {}, 'الوفر'), h('b', {}, pShortI(c.savings))),
      c.top ? h('div', {}, h('small', {}, 'أكبر فئة'), h('b', {}, c.top.n + ' ' + c.top.p + '%')) : null, c.bigDay ? h('div', {}, h('small', {}, 'أغلى يوم'), h('b', {}, nWhen(c.bigDay.d))) : null, h('div', {}, h('small', {}, 'أيام بلا صرف'), h('b', {}, c.calm + ' من ' + c.days))),
    c.diff != null ? h('p', { class: 'wcmp' }, 'مصروفك ' + (c.diff > 0 ? 'أعلى' : c.diff < 0 ? 'أقل' : 'مثل') + ' الشهر الماضي' + (c.diff ? ' بـ ' + Math.abs(c.diff) + '%' : '') + (c.diff < 0 ? ' 👏' : '')) : null, h('small', { class: 'wft' }, 'فلوسي · سجّلت في ' + c.logged + ' يوماً'));
  return h('div', {}, back, h('h1', {}, 'بطاقة الشهر'), ks.length > 1 ? h('label', { class: 'f' }, h('span', {}, 'الشهر'), h('select', { onchange: e => go('insights', 'wrap', { k: e.target.value }) }, ks.map(m => h('option', { value: m, selected: m === k }, mName(m))))) : null,
    card, btn('📷 احفظها صورة', () => wrapImage(c), 'prim'), h('p', { class: 'mut' }, 'تُحفظ في هاتفك أو تشاركها من ورقة المشاركة. لا تُرسل إلى أي مكان.')); }
const pShortI = n => { const a = Math.abs(n), t = x => String(+x); return (n < 0 ? '−' : '') + (a >= 1e6 ? t((a / 1e6).toFixed(1)) + ' مليون' : Math.round(a / 1e3) + ' ألف'); };
async function wrapImage(c) { try { const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), sk = FTheme.SKINS[FTheme.pick(FTheme.cfg())], dark = FTheme.resolve(FTheme.get()) === 'dark', P = sk[dark ? 'D' : 'L'];
    const m = P[1].match(/#[0-9a-fA-F]{6}/g), cols = m && m.length >= 2 ? m : ['#10202A', '#1D4A40'], gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1] || cols[0]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const ink = '#FFF8E6', acc = '#F0D78C', T = (t, y, sz, col, w) => { g.font = (w || 700) + ' ' + sz + 'px "Geeza Pro","SF Arabic",system-ui,sans-serif'; g.fillStyle = col || ink; g.textAlign = 'center'; g.direction = 'rtl'; g.fillText(t, W / 2, y); };
    g.globalAlpha = .12; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(W * .85, H * .12, 120 + i * 60, 0, 7); g.strokeStyle = acc; g.lineWidth = 3; g.stroke(); } g.globalAlpha = 1;
    T('شهرك في فلوسي', 150, 44, acc); T(mName(c.k), 240, 72); T(c.rate == null ? '—' : (c.rate >= 0 ? 'ادّخرت ' : 'عجز ') + Math.abs(c.rate) + '%', 440, 150, acc, 800);
    T(c.rate == null ? '' : c.rate >= 20 ? 'شهر من شهور بناة الثروة' : c.rate >= 10 ? 'شهر متوازن' : c.rate >= 0 ? 'شهر ضيّق' : 'صرفت أكثر من دخلك', 530, 44, ink, 600);
    const cells = [['الدخل', pShortI(c.income)], ['المصروف', pShortI(c.expense)], ['الوفر', pShortI(c.savings)], ['أكبر فئة', c.top ? c.top.n + ' ' + c.top.p + '%' : '—'], ['أغلى يوم', c.bigDay ? nWhen(c.bigDay.d) : '—'], ['أيام بلا صرف', c.calm + ' من ' + c.days]];
    cells.forEach(([a, b], i) => { const x = i % 2 ? W * .27 : W * .73, y = 680 + Math.floor(i / 2) * 170; g.globalAlpha = .14; g.fillStyle = '#fff'; g.beginPath(); g.roundRect ? g.roundRect(x - 230, y - 80, 460, 140, 30) : g.rect(x - 230, y - 80, 460, 140); g.fill(); g.globalAlpha = 1;
      g.textAlign = 'center'; g.direction = 'rtl'; g.font = '600 34px "Geeza Pro",system-ui'; g.fillStyle = acc; g.fillText(a, x, y - 20); g.font = '800 46px "Geeza Pro",system-ui'; g.fillStyle = ink; g.fillText(b, x, y + 38); });
    if (c.diff != null) T('مصروفك ' + (c.diff > 0 ? 'أعلى' : c.diff < 0 ? 'أقل' : 'مثل') + ' الشهر الماضي' + (c.diff ? ' بـ ' + Math.abs(c.diff) + '%' : ''), 1210, 40, ink, 600); T('فلوسي', 1300, 34, acc);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png')); await shareFile(new File([blob], 'flousi-' + c.k + '.png', { type: 'image/png' })); } catch (e) { toast('تعذّر إنشاء الصورة: ' + (e.message || e), true); } }
// ---- 6: الإنجازات (تُحسب من بياناتك؛ تاريخ أول ظهور يُحفظ على هذا الجهاز) ----
const BKEY = 'flousi-badges';
const streak = () => { const ds = new Set(S.tx.filter(t => !t.voided && !t.reverses && !['opening', 'opening_fix'].includes(t.type)).map(t => t.date)); let d = L.today(); if (!ds.has(d)) d = L.iso(new Date(Date.parse(d) - 864e5)); let n = 0; while (ds.has(d)) { n++; d = L.iso(new Date(Date.parse(d) - 864e5)); } return n; };
const BADGES = [['first', '✍', 'البداية', 'سجّلت أول مصروف', () => S.tx.some(t => t.type === 'expense' && !t.voided)], ['streak7', '🔥', '7 أيام متتالية', 'سجّلت شيئاً كل يوم أسبوعاً كاملاً', () => streak() >= 7], ['streak30', '🔥', 'شهر بلا انقطاع', 'سجّلت كل يوم 30 يوماً', () => streak() >= 30],
  ['nw10', '🎯', 'أول 10 ملايين', 'صافي ثروتك تجاوز 10 ملايين', () => L.panel(S).nw >= 1e7], ['nw50', '🌴', '50 مليوناً', 'صافي ثروتك تجاوز 50 مليوناً', () => L.panel(S).nw >= 5e7], ['nw100', '🏆', '100 مليون', 'صافي ثروتك تجاوز 100 مليون', () => L.panel(S).nw >= 1e8],
  ['shield', '🛡', 'درع الطوارئ', 'مدخراتك تكفي 6 أشهر من مصروفك', () => { const ms = FM.months(S, 4).slice(0, -1).filter(m => m.expense > 0), avg = ms.length ? ms.reduce((a, m) => a + m.expense, 0) / ms.length : 0, sv = FM.savings(S); return avg > 0 && (sv ? sv.amount : E.snap(S).liq) >= avg * 6; }],
  ['saver20', '💎', 'بانٍ للثروة', 'ادّخرت 20% فأكثر في شهر كامل', () => FM.months(S, 13).slice(0, -1).some(m => m.rate != null && m.rate >= 20)],
  ['pyf3', '🚿', 'ادفع لنفسك 3 أشهر', 'ادّخرت أولاً يوم الراتب 3 أشهر متتالية', () => { const ms = new Set(S.tx.filter(t => t.meta && t.meta.pyf && !t.voided).map(t => t.date.slice(0, 7)).concat(S.goals.filter(g => g.pyf && g.date).map(g => g.date.slice(0, 7)))); let k = L.mkey(L.today()), n = 0, best = 0; for (let i = 0; i < 24; i++, k = L.prevMonth(k)) { if (ms.has(k)) { n++; best = Math.max(best, n); } else n = 0; } return best >= 3; }],
  ['budget', '✅', 'شهر داخل الحدود', 'شهر كامل لم تتجاوز فيه أي حد', () => { let k = L.prevMonth(L.mkey(L.today())); for (let i = 0; i < 6 && L.monthEnd(k) >= S.x.openDate; i++, k = L.prevMonth(k)) { const b = L.budget(S, L.monthEnd(k)); if (b.some(x => x.limit > 0) && !b.some(x => x.over)) return true; } return false; }],
  ['debtfree', '🕊', 'بلا ديون', 'سددت كل ما عليك', () => { const D = L.debts(S).filter(d => d.dir === 'borrowed'); return D.length > 0 && D.every(d => d.settled); }], ['wish', '🧘', 'قاومت رغبة', 'تراجعت عن شراء بعد يوم من التفكير', () => wishSaved() > 0],
  ['recon', '🧮', 'حساباتي مضبوطة', 'أجريت المطابقة الشهرية', () => Object.keys(S.x.reconDone || {}).length > 0]];
const badgeState = memo('badges', S0 => { const r = {}; BADGES.forEach(([id, , , , f]) => { try { r[id] = !!f(); } catch (e) { r[id] = false; } }); return r; });
let BCHK = -1; // يُفحص فقط ما لم يُحقَّق بعد، وبعد الرسم (لا يؤخّر الشاشة)، ومرة لكل تعديل
function badgeCheck() { if (!S || !S.x.openDate || BCHK === DGEN) return; BCHK = DGEN; const g = DGEN;
  setTimeout(() => { if (g !== DGEN || !S) return; let st = {}; try { st = JSON.parse(LS.get(BKEY) || '{}') || {}; } catch (e) {}
    const fresh = BADGES.filter(([id, , , , f]) => { if (st[id]) return false; try { return !!f(); } catch (e) { return false; } }); if (!fresh.length) return;
    fresh.forEach(b => { st[b[0]] = L.today(); }); LS.set(BKEY, JSON.stringify(st)); const b = fresh[fresh.length - 1]; toast('🏅 إنجاز جديد: ' + b[1] + ' ' + b[2]); }, 700); }
const badgeOn = () => { let st = {}; try { st = JSON.parse(LS.get(BKEY) || '{}') || {}; } catch (e) {} const now = badgeState(S), r = {}; BADGES.forEach(([id]) => { r[id] = !!(st[id] || now[id]); }); return { on: r, st }; };
MORE.push(['badges', 'إنجازاتي', () => { const { on: now, st } = badgeOn(); const n = BADGES.filter(b => now[b[0]]).length;
  return h('div', {}, h('p', { class: 'mut' }, n + ' من ' + BADGES.length + ' · تُحسب من بياناتك، وتظهر مرة واحدة عند تحقيقها.' + (streak() ? ' سلسلة التسجيل الحالية: ' + streak() + ' يوماً 🔥' : '')),
    h('div', { class: 'bgrid' }, BADGES.map(([id, ic, t, d]) => h('div', { class: 'badge' + (now[id] ? ' on' : '') }, h('span', { class: 'bic' }, now[id] ? ic : '🔒'), h('b', {}, t), h('small', {}, now[id] ? (st[id] ? 'منذ ' + nWhen(st[id]) : 'تحقق') : d))))); }]);
// ---- 8: حركة موحّدة: الأرقام الكبيرة تعدّ صعوداً من آخر قيمة رأيتها، وتتوقف مع «تقليل الحركة» أو إخفاء الثروة ----
const LASTN = new Map();
function animNum(el, v, key, fmt) { const from = LASTN.has(key) ? LASTN.get(key) : v; LASTN.set(key, v); if (from === v || REDUCED() || privOn()) { el.textContent = fmt(v); return el; } el.textContent = fmt(from); el.dataset.v = from; requestAnimationFrame(() => countTo(el, v, fmt)); return el; }
