'use strict';
// ===== f1-v4.14: تبويب «أموالي» — المحفظة (تجمع «أموالي» و«الأصول») =====
// واجهة فقط فوق الدوال الموجودة: لا يغيّر المحرك ولا القيود ولا بنية البيانات.
// تثبيت البطاقات في المقدمة تفضيل عرض على هذا الجهاز (localStorage)، لا يدخل في بياناتك المالية.
const WPIN = 'flousi-wpin', RLATER = 'flousi-recon-later';
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* التخزين غير متاح: لا بأس */ } };
const wPins = () => lsGet(WPIN, []);
const wPinSet = (id, on) => { const p = wPins().filter(x => x !== id); if (on) p.unshift(id); lsSet(WPIN, p); };
function wUse() { const n = {}, lim = daysAgo(90); S.post.forEach(p => { if (p.date >= lim) n[p.a] = (n[p.a] || 0) + 1; }); return n; }
const wSort = xs => { const pin = wPins(), u = wUse(), ix = id => { const i = pin.indexOf(id); return i < 0 ? 1e9 : i; };
  return xs.slice().sort((a, b) => ix(a.id) - ix(b.id) || (u[b.id] || 0) - (u[a.id] || 0)); };
const wVals = () => { const V = {}; L.valuations(S).forEach(v => { if (v.last && v.book !== 0) V[v.id] = v; }); return V; };
const wAccts = () => L.accountsView(S).filter(a => !S.acc[a.id].hidden && S.acc[a.id].type !== 'stock' && typeOn(S.acc[a.id].type));
const assetsOn = () => fOn('assets'); // المفتاح القديم «الأصول»: إن أُوقف تختفي أقسام الذهب والأسهم كما كانت تختفي مع تبويبها
const gramsOf = mg => (Math.round(mg) / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 }) + ' غ';
// بطاقة حساب في المحفظة
function wCard(a, V) { const usd = a.cur === 'USD', v = V[a.id], pin = wPins().includes(a.id);
  const main = usd ? L.fmtUsd(a.bal) : v ? L.fmt(v.value) : L.fmt(a.bal), sub = usd ? '≈ ' + money(a.iqd) : v ? 'تقدير ' + v.last.d : a.kind === 'liab' ? 'عليك' : 'د.ع';
  return h('button', { type: 'button', class: 'wcard' + (a.kind === 'liab' ? ' liab' : ''), 'data-acct': a.id, onclick: () => go('accts', 'acct', { id: a.id }) },
    h('span', { class: 'wn' }, (pin ? '📌 ' : '') + a.name), h('b', {}, main), h('small', {}, sub)); }
const wRow = (title, cards) => cards.length ? h('div', { class: 'wsec' }, h('h2', {}, title), h('div', { class: 'wrow noswipe' }, cards)) : null;
// الصندوق الذهبي (بطاقة المحفظة)
function goldSummary() { const held = L.pieces(S).filter(p => p.held), by = {};
  held.forEach(p => { const k = p.metal === 'G' ? 'ذهب ' + Math.round(p.fine * 24 / 100) / 100 : 'فضة'; by[k] = (by[k] || 0) + p.mg; });
  const theo = held.reduce((t, p) => t + p.theo, 0), cost = held.reduce((t, p) => t + p.cost, 0);
  let mn = null; try { mn = FM.metalsNow(S); } catch (e) {}
  return { held, by, theo, cost, unreal: theo - cost, now: mn ? Math.round(mn.gold + mn.silver) : null }; }
function goldCard() { const g = goldSummary();
  return h('button', { type: 'button', class: 'wgold', 'data-gold': '1', onclick: () => go('accts', 'gold') },
    h('div', { class: 'r' }, h('span', { class: 'wn' }, '🪙 الصندوق الذهبي'), g.held.length ? h('small', {}, g.held.length + ' قطعة') : null),
    g.held.length ? [h('b', {}, money(g.now != null ? g.now : g.theo)), h('small', {}, Object.entries(g.by).map(([k, mg]) => k + ': ' + gramsOf(mg)).join(' · ')),
      h('small', {}, g.now != null ? 'بسعر السوق الآن · التكلفة ' + L.fmt(g.cost) : 'بالأسعار المعتمدة · التكلفة ' + L.fmt(g.cost))]
      : h('small', {}, 'أضف ذهبك وفضتك: كل قطعة بوزنها وعيارها وسعر شرائها.')); }
function stocksCard() { const X = FSK.view(S).filter(x => !x.hidden && x.qty > 0), m = X.reduce((t, x) => t + x.mkt, 0), u = X.reduce((t, x) => t + x.unreal, 0);
  return h('button', { type: 'button', class: 'wcard', 'data-stocks': '1', onclick: () => go('accts', 'stocks') }, h('span', { class: 'wn' }, '📈 أسهم'), h('b', {}, X.length ? L.fmt(m) : '—'), h('small', {}, X.length ? 'غير محقق ' + sgn(u) : 'أضف سهماً')); }
// المربعات: تظهر عند وجود ما يخصّها فقط، ويبقى كل قسم متاحاً دائماً من «+ إضافة»
function wTiles() { const T = [];
  if (fOn('debts')) { const D = L.debts(S).filter(d => !d.settled); if (D.length) { const lent = D.filter(d => d.dir === 'lent').reduce((t, d) => t + d.remaining, 0), bor = D.filter(d => d.dir !== 'lent').reduce((t, d) => t + d.remaining, 0);
    T.push(['debts', 'الديون', 'لك ' + L.fmt(lent) + ' · عليك ' + L.fmt(bor) + (D.some(d => d.overdue) ? ' · متأخر' : '')]); } }
  if (fOn('jams')) { const J = S.x.jams.map(j => L.jamState(S, j)).filter(j => !j.done); if (J.length) T.push(['jams', 'الجمعيات', J.length + ' جمعية' + (J[0].next ? ' · القسط ' + J[0].next : '')]); }
  if (fOn('recurring') && S.x.recur.length) { const D = L.recurDue(S); T.push(['recurring', 'المتكررات والراتب', D.length ? D.length + ' مستحق الآن' : S.x.recur.length + ' بند']); }
  if (fOn('goals')) { const G = L.goalView(S); if (G.length) T.push(['goals', 'الأهداف', G[0].name + ' ' + G[0].pct + '%' + (G.length > 1 ? ' · +' + (G.length - 1) : '')]); }
  return T.length ? h('div', { class: 'wsec' }, h('h2', {}, 'يحتاج متابعتك'), h('div', { class: 'wtiles' }, T.map(([k, t, l]) => h('button', { type: 'button', class: 'wtile', 'data-tile': k, onclick: () => go('more', k) }, h('b', {}, t), h('small', {}, l))))) : null; }
function wAdd() { const f = buildForm([{ k: 'name', l: 'اسم الحساب', t: 'text', req: true }, { k: 'type', l: 'النوع', t: 'select', opts: typeOpts() }, { k: 'cur', l: 'العملة', t: 'select', opts: [['IQD', 'دينار'], ['USD', 'دولار']] }],
    v => act(() => L.addAccount(S, v), 'أُضيف الحساب'), 'أضف حساباً');
  const items = [['حساب جديد', null], fOn('metals') && assetsOn() ? ['قطعة ذهب أو فضة', () => go('assets', 'buy')] : null, fOn('stocks') && assetsOn() ? ['سهم', () => go('assets', 'stock', { mode: 'new' })] : null,
    fOn('debts') ? ['دين', () => go('more', 'debts')] : null, fOn('jams') ? ['جمعية', () => go('more', 'jams')] : null, fOn('recurring') ? ['بند متكرر أو الراتب', () => go('more', 'recurring')] : null, fOn('goals') ? ['هدف', () => go('more', 'goals')] : null].filter(Boolean);
  return sect('', fold('+ إضافة', !!view.p.add, h('div', { class: 'quick' }, items.filter(x => x[1]).map(([t, fn]) => btn(t, fn, 'alt mini'))),
    h('h2', {}, 'حساب جديد'), h('p', { class: 'mut' }, 'يبدأ الحساب بصفر. للمال الموجود سلفاً استعمل الرصيد الافتتاحي عند البدء، أو سجّل تحويلاً/دخلاً.'), f)); }
function walletMain() {
  const A = wAccts(), V = wVals(), p = L.panel(S), ex = exclInfo();
  const liq = wSort(A.filter(a => a.kind === 'asset' && a.liquid)), oth = wSort(A.filter(a => a.kind === 'asset' && !a.liquid)), lia = wSort(A.filter(a => a.kind === 'liab'));
  const own = [fOn('metals') && assetsOn() ? goldCard() : null, fOn('stocks') && assetsOn() ? stocksCard() : null, ...oth.map(a => wCard(a, V))].filter(Boolean);
  return h('div', {}, h('div', { class: 'hdr' }, h('h1', {}, 'أموالي'), h('small', { class: 'mut' }, ti('صافي الثروة') , ' ', h('b', {}, money(p.nw - ex.amt)))),
    wRow('المال السائل', liq.map(a => wCard(a, V))), own.length ? h('div', { class: 'wsec' }, h('h2', {}, 'ما تملكه'), h('div', { class: 'wown' }, own)) : null,
    wRow('الالتزامات', lia.map(a => wCard(a, V))), wTiles(), wAdd(),
    sect('', fold('⋯ إدارة', false, manageBlock(), openingFixBlock(), fold('الأرصدة وتفاصيل الثروة', false, nwBlock(), ...acctList().filter(Boolean))))); }
// تفاصيل الحساب: أزراره الثلاثة، ملخص الشهر، آخر الحركات، المطابقة، والتقييم أو متوسط تكلفة الدولار
function acctMoves(id, n = 12) { const raw = new Map(S.tx.map(t => [t.id, t]));
  return L.listTx(S).filter(t => postsOf(t.id).some(p => p.a === id)).slice(0, n).map(t => txRow(t, raw.get(t.id))); }
function acctMonth(id) { const k = L.mkey(L.today()); let i = 0, o = 0; S.tx.forEach(t => { if (t.voided || t.reverses || t.date.slice(0, 7) !== k || ['opening', 'opening_fix'].includes(t.type)) return;
    postsOf(t.id).forEach(p => { if (p.a === id) { if (p.n > 0) i += p.n; else o -= p.n; } }); }); return { i, o }; }
function acctDetail(id) { const a = S.acc[id]; if (!a) return h('p', {}, 'الحساب غير موجود.'); const v = L.accountsView(S).find(x => x.id === id), usd = a.cur === 'USD', fmtN = n => usd ? L.fmtUsd(n) : money(n);
  const user = userAccts().some(x => x.id === id), liquid = a.kind === 'asset' && a.liquid, pin = wPins().includes(id), m = acctMonth(id), V = wVals()[id];
  const acts = user && liquid ? h('div', { class: 'wact' }, btn('أضف إليه', () => go('ops', null, { kind: 'income', acct: id }), 'alt'), btn('اصرف منه', () => { QX.acct = id; QX.amt = ''; go('ops', null, { kind: 'expense' }); }, 'alt'), btn('حوّل منه', () => go('ops', null, { kind: 'transfer', from: id }), 'alt')) : null;
  const U = usd ? L.usdInfo(S).find(u => u.id === id) : null;
  return h('div', {}, backBtn(() => go('accts')), h('h1', {}, a.name),
    sect('', h('div', { class: 'big' }, fmtN(v ? v.bal : E.bal(S, id))), usd && v ? h('p', { class: 'mut' }, '≈ ' + money(v.iqd)) : null, a.kind === 'liab' ? h('p', { class: 'mut' }, 'التزام عليك') : null, acts,
      liquid && a.cur === 'IQD' && user ? btn('⚖ طابق الرصيد', () => go('accts', 'recon', { id }), 'alt mini') : null,
      btn(pin ? 'ألغِ التثبيت' : '📌 ثبّت في المقدمة', () => { wPinSet(id, !pin); render(); }, 'alt mini')),
    U ? sect('الدولار (متوسط التكلفة)', row(ti('متوسط الشراء (لكل 100$)', 'متوسط التكلفة'), L.fmtRate(U.avg) + ' د.ع'), row('القيمة الحالية', money(U.mkt)), row(ti('غير محقق'), sgn(U.unreal), U.unreal < 0 ? 'bad' : '')) : null,
    V || (!liquid && a.kind === 'asset' && L.valuations(S).some(x => x.id === id)) ? valOne(id) : null,
    sect('هذا الشهر', row('دخل إليه', fmtN(m.i)), row('خرج منه', fmtN(m.o))),
    sect('آخر الحركات', ...(acctMoves(id).length ? acctMoves(id) : [h('p', { class: 'mut' }, 'لا حركات بعد.')]))); }
function valOne(id) { const v = L.valuations(S).find(x => x.id === id); if (!v) return null;
  return sect('التقييم', h('p', { class: 'mut' }, 'القيمة التقديرية لا تُسجَّل دخلاً ولا مصروفاً، بل تغيّر صافي الثروة السوقي فقط.'), row('التكلفة (الدفتر)', money(v.book)), row('آخر تقييم', v.last ? money(v.last.v) + ' (' + v.last.d + ')' : 'لم يُقيَّم'),
    v.last && v.book !== 0 ? row(ti('الفرق (غير محقق)', 'غير محقق'), sgn(v.unreal)) : null,
    v.hist.length ? h('details', {}, h('summary', {}, 'سجل التقييمات (' + v.hist.length + ')'), v.hist.slice().reverse().map(x => h('div', { class: 'r' }, h('span', {}, x.d + ': ' + money(x.v))))) : null,
    v.book !== 0 ? buildForm([{ k: 'date', l: 'تاريخ التقييم', t: 'date', v: L.today(), req: true }, { k: 'value', l: 'القيمة التقديرية بالدينار', t: 'num', req: true }],
      x => act(() => L.setValuation(S, { acct: id, date: x.date, value: L.parseAmount(x.value, 0) }), 'سُجّل التقييم'), 'حدّث التقييم') : null); }
// ---- طابق الرصيد: النقص «خُردة» (يُسجَّل في «فروقات المطابقة» الموجود، لا دخلاً ولا مصروفاً) والزيادة «مبلغ غير مسجّل» ----
let RECON = null; // { acct, counted }: «أتذكّرها الآن» — يبقى ظاهراً في المصروف حتى يتم
const reconDo = (acct, counted, msg) => act(() => L.reconcile(S, { date: L.today(), acct, counted }), msg).then(r => { RECON = null; lsSet(RLATER, null); return r; });
function reconPick() { const A = userAccts(a => a.kind === 'asset' && a.liquid && a.cur === 'IQD');
  return h('div', {}, backBtn(() => go('home')), h('h1', {}, 'طابق الرصيد'), sect('أي حساب تعدّه؟', A.length ? A.map(a => h('button', { type: 'button', class: 'lnk srow', onclick: () => go('accts', 'recon', { id: a.id }) }, h('span', {}, a.name), h('b', { class: 'sv' }, money(E.bal(S, a.id))))) : h('p', { class: 'mut' }, 'لا حساب سائل بالدينار.')),
    sect('', h('p', { class: 'mut' }, 'لعدّ كل حساباتك دفعة واحدة آخر الشهر:'), btn('المطابقة الشهرية', () => go('more', 'monthrecon'), 'alt mini'))); }
function reconScreen(id) { if (!id) return reconPick(); const a = S.acc[id]; if (!a || a.cur !== 'IQD') return h('p', {}, 'المطابقة للحسابات بالدينار فقط.'); const bal = E.bal(S, id), st = view.p;
  const inp = h('input', { inputmode: 'numeric', placeholder: 'المسجّل: ' + L.fmt(bal), value: st.c != null ? L.fmt(st.c) : '' });
  const res = h('div', {});
  const show = c => { const d = c - bal;
    if (d === 0) return res.replaceChildren(h('p', { class: 'okc' }, 'الرصيد مطابق ✓'));
    if (d < 0) return res.replaceChildren(sect('نقص ' + money(-d), h('p', { class: 'mut' }, 'في جيبك أقل مما في التطبيق. غالباً مصروفات صغيرة لم تُسجَّل.'),
      btn('أتذكّرها الآن', () => { RECON = { acct: id, counted: c }; QX.acct = id; QX.amt = ''; go('ops', null, { kind: 'expense' }); }, 'prim'),
      btn('ضعها في الخُردة', () => reconDo(id, c, 'سُجّل النقص في «الخُردة»').then(r => { if (r !== undefined) go('accts', 'acct', { id }); }), 'alt'),
      btn('لاحقاً', () => { lsSet(RLATER, { acct: id, counted: c, d: L.today() }); toast('سيبقى تذكير في «يهمّك الآن»'); go('home'); }, 'alt'),
      h('p', { class: 'mut' }, ti('«الخُردة»', 'المطابقة') , ': تُسجَّل في «فروقات المطابقة»، لا دخلاً ولا مصروفاً، وتظهر في «شهري».')));
    res.replaceChildren(sect('زيادة ' + money(d), h('p', { class: 'mut' }, 'في جيبك أكثر مما في التطبيق.'), btn('أتذكّر دخلاً', () => go('ops', null, { kind: 'income', acct: id }), 'alt'),
      btn('سجّلها «مبلغ غير مسجّل»', () => reconDo(id, c, 'سُجّلت الزيادة «مبلغ غير مسجّل»').then(r => { if (r !== undefined) go('accts', 'acct', { id }); }), 'prim'))); };
  const check = () => { let c; try { c = L.parseAmount(inp.value, 0); } catch (e) { return toast('اكتب المبلغ الموجود فعلاً', true); } if (!(c >= 0)) return toast('المبلغ غير صالح', true); show(c); };
  if (st.c != null) setTimeout(() => show(st.c), 0);
  return h('div', {}, backBtn(() => go('accts', 'acct', { id })), h('h1', {}, 'طابق الرصيد'), sect(a.name, row('المسجّل في التطبيق', money(bal)), h('label', { class: 'f' }, h('span', {}, 'كم يوجد فعلاً؟'), inp), btn('طابق', check, 'prim')), res); }
// شريط «أتذكّرها الآن» داخل المصروف: الباقي غير المسجّل يقل مع كل مصروف حتى يصل صفراً
function reconBar() { if (!RECON || !S.acc[RECON.acct]) return null; const left = E.bal(S, RECON.acct) - RECON.counted;
  if (left <= 0) { const over = -left, done = RECON; RECON = null; return sect('', h('p', { class: 'okc' }, over ? 'سجّلت أكثر من النقص بـ ' + money(over) + '. راجع آخر العمليات.' : 'اكتملت المطابقة: سُجّل النقص كله ✓'), over ? btn('طابق الرصيد من جديد', () => go('accts', 'recon', { id: done.acct }), 'alt mini') : null); }
  setTimeout(() => { try { coachShow('reconbar'); } catch (e) {} }, 500);
  return h('section', { class: 'reconbar' }, h('div', { class: 'r' }, h('span', {}, 'باقي غير مسجّل في ' + S.acc[RECON.acct].name), h('b', {}, money(left))),
    h('div', { class: 'quick' }, btn('الباقي خُردة', () => reconDo(RECON.acct, RECON.counted, 'سُجّل الباقي في «الخُردة»'), 'mini'), btn('إلغاء', () => { RECON = null; render(); }, 'mini alt'))); }
// ---- الصندوق الذهبي: كل قطعة بوزنها وعيارها وسعر شرائها، وسجل البيع والشراء كاملاً ----
const pieceIco = p => p.form === 'bullion' ? '▬' : p.metal === 'S' ? '◇' : '◯';
function goldBox() { const g = goldSummary(), sold = L.pieces(S).filter(p => !p.held && S.tx.some(t => t.type === 'sell_metal' && t.meta && t.meta.piece === p.id && !t.voided));
  return h('div', {}, backBtn(() => go('accts')), h('h1', {}, 'الصندوق الذهبي'),
    sect('', g.held.length ? [h('div', { class: 'big' }, money(g.now != null ? g.now : g.theo)), h('p', { class: 'mut' }, g.now != null ? 'بسعر السوق الآن (بلا مصنعية)' : 'بالأسعار المعتمدة'),
      g.now != null ? row('بالأسعار المعتمدة', money(g.theo)) : null, row('التكلفة', money(g.cost)), row(ti('الفرق (غير محقق)', 'غير محقق'), sgn(g.unreal), g.unreal < 0 ? 'bad' : ''),
      Object.entries(g.by).map(([k, mg]) => row(k, gramsOf(mg)))] : emptyState('🪙', 'الصندوق فارغ', 'سجّل قطعة اشتريتها، أو قطعة كانت عندك قبل البدء.'),
      h('div', { class: 'quick' }, btn('اشترِ', () => go('assets', 'buy')), btn('كانت عندي قبل البدء', () => go('assets', 'old'), 'alt'), btn('سجل الذهب', () => go('accts', 'goldlog'), 'alt'))),
    g.held.length ? sect('قطعك', h('div', { class: 'ptiles' }, g.held.map(p => h('button', { type: 'button', class: 'ptile', 'data-piece': p.id, onclick: () => go('accts', 'piece', { id: p.id }) },
      h('i', {}, pieceIco(p)), h('b', {}, p.label || (p.metal === 'G' ? 'ذهب' : 'فضة')), h('small', {}, fineTxt(p) + ' · ' + gramsTxt(p.mg)))))) : null,
    sold.length ? sect('مبيعة', sold.map(p => h('button', { type: 'button', class: 'lnk', onclick: () => go('accts', 'piece', { id: p.id }) }, pieceName(p)))) : null,
    pubSect('', h('p', { class: 'mut' }, 'أسعار الذهب والفضة المعتمدة وسعر الصرف في «نبض السوق» ← «الآن» ← «أسعارك المعتمدة».'), btn('افتح الأسعار', () => go('nabd', null, { t: 'now', open: 'prices' }), 'alt mini'))); }
function pieceTx(id) { return S.tx.filter(t => t.meta && t.meta.piece === id && ['buy_metal', 'opening', 'sell_metal'].includes(t.type)); }
function pieceScreen(id) { const p = L.pieces(S).find(x => x.id === id); if (!p) return h('p', {}, 'القطعة غير موجودة.'); const T = pieceTx(id), buy = T.find(t => t.type !== 'sell_metal' && !t.voided);
  return h('div', {}, backBtn(() => go('accts', 'gold')), h('h1', {}, p.label || 'قطعة'),
    sect('', row('المعدن', p.metal === 'G' ? 'ذهب' : 'فضة'), row(p.metal === 'G' ? 'العيار' : 'النقاوة', fineTxt(p)), row('الوزن', gramsTxt(p.mg)), row('النوع', p.form === 'bullion' ? 'سبيكة أو عملة' : 'مصوغات'),
      buy ? row(buy.type === 'opening' ? 'كانت عندك يوم البدء' : 'تاريخ الشراء', buy.date) : null, p.held ? row('سعر الشراء (التكلفة)', money(p.cost) + (p.buy && p.buy.est ? ' (تقديرية)' : '')) : null,
      p.held ? row(ti('قيمتها المعدنية النظرية', 'القيمة المعدنية النظرية'), money(p.theo)) : null, p.held ? row(ti('الفرق (غير محقق)', 'غير محقق'), sgn(p.unreal), p.unreal < 0 ? 'bad' : '') : null,
      p.held ? btn('بِع', () => go('assets', 'sell', { id }), 'prim') : btn('تقرير البيع', () => go('assets', 'report', { id }), 'alt')),
    sect('سجل القطعة', T.map(t => row(t.date + ' · ' + (t.type === 'sell_metal' ? 'بيع' : t.type === 'opening' ? 'رصيد افتتاحي' : 'شراء') + (t.voided ? ' (معكوسة)' : ''), money(postsOf(t.id).reduce((s, x) => s + Math.max(x.iqd, 0), 0)))))); }
function goldLog() { const T = S.tx.filter(t => ['buy_metal', 'sell_metal'].includes(t.type) || (t.type === 'opening' && t.meta && t.meta.piece)).slice().reverse();
  return h('div', {}, backBtn(() => go('accts', 'gold')), h('h1', {}, 'سجل الذهب'), sect('', T.length ? T.map(t => { const p = t.meta && S.pieces[t.meta.piece];
    return h('button', { type: 'button', class: 'lnk', onclick: () => p ? go('accts', 'piece', { id: t.meta.piece }) : null }, h('div', { class: 'r' }, h('span', {}, t.date + ' · ' + (t.type === 'sell_metal' ? 'بيع' : t.type === 'opening' ? 'رصيد افتتاحي' : 'شراء') + (t.voided ? ' (معكوسة)' : '')),
      h('b', {}, money(postsOf(t.id).reduce((s, x) => s + Math.max(x.iqd, 0), 0)))), p ? h('small', { class: 'mut' }, pieceName({ ...p, mg: p.mg })) : null); }) : h('p', { class: 'mut' }, 'لا عمليات ذهب أو فضة بعد.'))); }
// ---- الشاشة ----
SCREENS.accts = (sub) => {
  if (sub === 'open' || !S.x.openDate && sub !== 'list') return h('div', {}, h('h1', {}, 'الحسابات'), openingWizard());
  if (sub === 'acct') return acctDetail(view.p.id);
  if (sub === 'recon') return reconScreen(view.p.id);
  if (sub === 'gold') return goldBox();
  if (sub === 'piece') return pieceScreen(view.p.id);
  if (sub === 'goldlog') return goldLog();
  if (sub === 'stocks') return h('div', {}, backBtn(() => go('accts')), h('h1', {}, 'الأسهم'), stocksBlock());
  return walletMain(); };
// «الأصول» لم يعد تبويباً: صفحاته الفرعية (شراء، بيع، قطعة قديمة، تقرير، أسهم) تبقى بمساراتها، والرئيسية تفتح المحفظة
{ const assetsSub = SCREENS.assets; SCREENS.assets = (sub, p) => sub ? assetsSub(sub, p) : SCREENS.accts(null); }
