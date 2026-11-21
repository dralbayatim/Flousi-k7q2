'use strict';
// فلوسي — منطق التطبيق (بلا واجهة): أدوات، عمليات، تقارير، تنبيهات، خطط. يبني فوق engine.js ولا يغيّر معادلاته.
const FL = {};
// ===== المرحلة 2: أدوات، الحسابات، الرصيد الافتتاحي، الدخل والمصروف والتحويل، لوحة صافي الثروة =====
(() => {
  const E = typeof FE !== 'undefined' ? FE : require('./engine.js');
  const AD = '٠١٢٣٤٥٦٧٨٩';
  const norm = s => String(s).replace(/[٠-٩]/g, d => AD.indexOf(d)).replace(/[٬,\s]/g, '').replace('٫', '.');
  function parseAmount(s, dec) {
    const m = /^(\d+)(?:\.(\d+))?$/.exec(norm(s)); if (!m) throw new Error('مبلغ غير صالح');
    const f = m[2] || ''; if (f.length > dec) throw new Error(dec ? 'منزلتان عشريتان كحد أقصى' : 'الدينار بلا كسور');
    const n = Number(m[1] + f.padEnd(dec, '0')); if (!Number.isSafeInteger(n)) throw new Error('مبلغ كبير جداً'); return n;
  }
  const fmt = n => (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US');
  const fmtUsd = c => (c < 0 ? '-' : '') + '$' + Math.trunc(Math.abs(c) / 100).toLocaleString('en-US') + '.' + String(Math.abs(c) % 100).padStart(2, '0');
  const fmtRate = r => fmt(Math.trunc(r / 100)) + (r % 100 ? '.' + String(r % 100).padStart(2, '0') : ''); // دينار لكل 100 دولار (r هو دينار لكل 1$ × 10,000)
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => iso(new Date());
  const mkey = d => d.slice(0, 7);
  const monthEnd = k => { const [y, m] = k.split('-').map(Number); return k + '-' + pad(new Date(Date.UTC(y, m, 0)).getUTCDate()); };
  const prevMonth = k => { const [y, m] = k.split('-').map(Number); return m === 1 ? (y - 1) + '-12' : y + '-' + pad(m - 1); };
  const addMonths = (d, n) => { const [y, m, dd] = d.split('-').map(Number), t = new Date(Date.UTC(y, m - 1 + n, 1)), k = t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1);
    return k + '-' + pad(Math.min(dd, +monthEnd(k).slice(8))); };
  const monthsDiff = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));

  const CATS = [['c_fixed', 'ثابتة', 'ثابتة'], ['c_bills', 'فواتير وخدمات', 'ثابتة'], ['c_comm', 'اتصالات وإنترنت', 'ثابتة'], ['c_home', 'منزل وأثاث', 'ثابتة'],
    ['c_food', 'أكل', 'أكل'], ['c_trans', 'مواصلات ووقود', 'احتياجات'], ['c_health', 'صحة', 'احتياجات'], ['c_edu', 'تعليم وكتب', 'احتياجات'], ['c_cloth', 'ملابس', 'احتياجات'],
    ['c_ent', 'ترفيه', 'ترفيه'], ['c_gift', 'هدايا ومناسبات', 'ترفيه'], ['c_fee', 'فوائد ورسوم', 'أخرى'], ['c_other', 'أخرى', 'أخرى']];
  const GROUPS = { 'ثابتة': 50, 'أكل': 15, 'احتياجات': 15, 'ترفيه': 10, 'أخرى': 10 }; // نسب افتراضية من دخل الشهر، قابلة للتعديل، وليست استشارة

  function init(S) {
    const D = { seq: 1, openDate: null, set: { valuation: 'conservative', hideNw: true, lockOn: false, lockMin: 1, passkey: false }, rates: [], prices: [], debts: [], jams: [], goalsDef: [],
      recur: [], limits: { ...GROUPS }, snaps: {}, backup: null, audit: [], dismissed: {}, vals: [] };
    S.x = S.x || {}; for (const k in D) if (S.x[k] === undefined) S.x[k] = D[k];
    [['eq_open', 'equity', 'الرصيد الافتتاحي'], ['pnlm', 'pnlm', 'أرباح وخسائر المعادن المحققة'], ['recon', 'recon', 'فروقات المطابقة'], ['inc_salary', 'income', 'الراتب'], ['inc_other', 'income', 'دخل آخر']]
      .forEach(([id, k, n]) => { if (!S.acc[id]) { E.addAcc(S, id, k); S.acc[id].name = n; } });
    [['gold', 'ذهب', 'G'], ['silver', 'فضة', 'S']].forEach(([id, n, m]) => { if (!S.acc[id]) { E.addAcc(S, id, 'asset', 'IQD', false, m); S.acc[id].name = n; } });
    CATS.forEach(([id, n, g]) => { if (!S.acc[id]) { E.addAcc(S, id, 'expense'); S.acc[id].name = n; S.acc[id].group = g; } });
    // التقييمات اليدوية السارية الآن، تُقرأ وقت الحساب (لا تُخزَّن): خاصية غير قابلة للعدّ فلا تدخل الحفظ ولا النسخ
    if (!Object.getOwnPropertyDescriptor(S, 'vals')) Object.defineProperty(S, 'vals', { get: () => valsAt(S, '9999-12-31'), configurable: true, enumerable: false });
    return S;
  }
  // آخر تقييم يدوي لكل حساب حتى تاريخ معيّن
  const valsAt = (S, d) => { const o = {}; (S.x && S.x.vals || []).forEach(v => { if (v.d <= d) o[v.a] = v.v; }); return o; };
  const rateAt = (S, d) => { const r = S.x.rates.filter(x => x.d <= d).sort((a, b) => a.d < b.d ? -1 : 1).pop() || S.x.rates[0]; return r ? r.r : S.rate; };
  const priceAt = (S, d) => { const pick = k => { const xs = S.x.prices.filter(x => x[k] != null).sort((a, b) => a.d < b.d ? -1 : 1), e = xs.filter(x => x.d <= d).pop() || xs[0]; return e ? e[k] : S.price[k]; }; return { G: pick('G'), S: pick('S') }; };
  function setRate(S, d, r) { if (!E.okDate(d)) throw new Error('تاريخ غير صالح'); if (!Number.isSafeInteger(r) || r <= 0) throw new Error('سعر الصرف غير صالح');
    S.x.rates = S.x.rates.filter(x => x.d !== d).concat([{ d, r }]).sort((a, b) => a.d < b.d ? -1 : 1); S.rate = S.x.rates[S.x.rates.length - 1].r; }

  const TYPES = { asset_cash: ['نقد', 'asset', true], bank: ['حساب مصرفي', 'asset', true], visa: ['فيزا', 'asset', true], wallet: ['محفظة إلكترونية', 'asset', true], other: ['أصل آخر (عقار، سيارة...)', 'asset', false], liab: ['التزام', 'liab', false] };
  function addAccount(S, { name, type, cur = 'IQD' }) {
    name = String(name || '').trim(); if (!name) throw new Error('اسم الحساب مطلوب'); const t = TYPES[type]; if (!t) throw new Error('نوع غير معروف');
    if (cur !== 'IQD' && cur !== 'USD') throw new Error('عملة غير صالحة'); if (cur === 'USD' && t[1] === 'liab') throw new Error('الالتزام بالدولار غير مدعوم');
    if (Object.values(S.acc).some(a => a.name === name)) throw new Error('الاسم مستخدم');
    const id = 'u' + S.x.seq++; E.addAcc(S, id, t[1], cur, t[2]); S.acc[id].name = name; S.acc[id].type = type; return id;
  }
  // الرصيد الافتتاحي: عملية واحدة متوازنة، والفرق يذهب إلى «الرصيد الافتتاحي» لا إلى الدخل (5.3)
  function opening(S, date, rows) {
    if (S.x.openDate) throw new Error('الرصيد الافتتاحي سُجّل من قبل');
    return E.atomic(S, () => { const items = rows.map(r => { const id = r.id || addAccount(S, r), a = S.acc[id];
      if (a.cur === 'USD') { if (!r.r) throw new Error('متوسط سعر شراء الدولار مطلوب'); return { a: id, n: r.amount, r: r.r }; }
      return { a: id, n: a.kind === 'liab' ? -Math.abs(r.amount) : r.amount }; });
      const id = E.opening(S, date, items, 'eq_open'); S.x.openDate = date; return id; });
  }
  const assetAcc = (S, id) => { const a = S.acc[id]; if (!a || a.kind !== 'asset' || a.metal) throw new Error('حساب غير صالح'); return a; };
  const pos = n => { if (!Number.isSafeInteger(n) || n <= 0) throw new Error('المبلغ يجب أن يكون موجباً'); return n; };
  const cash = (S, a, n, r) => { const acc = assetAcc(S, a); return acc.cur === 'USD' ? { leg: { a, n, r: r || (() => { throw new Error('سعر الصرف مطلوب'); })() }, iqd: E.usdToIqd(n, r) } : { leg: { a, n }, iqd: n }; };
  function income(S, o) { pos(o.amount); const c = cash(S, o.acct, o.amount, o.r); const src = S.acc[o.src]; if (!src || src.kind !== 'income') throw new Error('مصدر دخل غير صالح');
    return E.post(S, o.date, 'income', [c.leg, { a: o.src, n: -c.iqd }], o.note || ''); }
  function expense(S, o) { pos(o.amount); const c = cash(S, o.acct, -o.amount, o.r); const cat = S.acc[o.cat]; if (!cat || cat.kind !== 'expense') throw new Error('فئة غير صالحة');
    return E.post(S, o.date, 'expense', [{ a: o.cat, n: -c.iqd }, c.leg], o.note || ''); }
  const rateFrom = (iqd, cents) => Number(E.rd(BigInt(iqd) * 1000000n, BigInt(cents)));
  function transfer(S, o) { // من وإلى حسابين لك: لا دخل ولا مصروف
    const f = assetAcc(S, o.from), t = assetAcc(S, o.to); if (o.from === o.to) throw new Error('الحسابان متطابقان'); pos(o.amount);
    if (f.cur === 'IQD' && t.cur === 'IQD') return E.post(S, o.date, 'transfer', [{ a: o.to, n: o.amount }, { a: o.from, n: -o.amount }], o.note || '');
    if (f.cur === 'USD' && t.cur === 'USD') { if (!o.r) throw new Error('سعر الصرف مطلوب'); return E.post(S, o.date, 'transfer', [{ a: o.to, n: o.amount, r: o.r }, { a: o.from, n: -o.amount, r: o.r }], o.note || ''); }
    pos(o.amount2); // تحويل بين عملتين: المدفوع والمستلم الفعليان، والسعر الفعلي = المستلم ÷ المدفوع
    if (f.cur === 'IQD') { const r = rateFrom(o.amount, o.amount2); return E.post(S, o.date, 'convert', [{ a: o.to, n: o.amount2, r, iqd: o.amount }, { a: o.from, n: -o.amount }], o.note || ''); }
    const r = rateFrom(o.amount2, o.amount); return E.post(S, o.date, 'convert', [{ a: o.to, n: o.amount2 }, { a: o.from, n: -o.amount, r, iqd: -o.amount2 }], o.note || '');
  }
  function reconcile(S, o) { assetAcc(S, o.acct); if (S.acc[o.acct].cur !== 'IQD') throw new Error('المطابقة بالدينار فقط'); if (!Number.isSafeInteger(o.counted) || o.counted < 0) throw new Error('المبلغ غير صالح');
    if (o.counted === E.bal(S, o.acct)) throw new Error('الرصيد مطابق، لا حاجة لتسوية'); return E.reconcile(S, o.date, o.acct, o.counted, 'recon'); }
  const audit = (S, action, id) => { S.x.audit.push({ t: Date.now(), action, id }); if (S.x.audit.length > 500) S.x.audit.shift(); };
  const undo = (S, id, date) => { E.reverse(S, id, date); audit(S, 'reverse', id); };

  const LABEL = { opening: 'رصيد افتتاحي', income: 'دخل', expense: 'مصروف', transfer: 'تحويل', convert: 'تحويل عملة', buy_metal: 'شراء معدن', sell_metal: 'بيع معدن', lend: 'إقراض', borrow: 'اقتراض',
    repay_in: 'سداد لي', repay_out: 'سداد مني', debt_fee: 'فائدة/رسوم دين', jam_pay: 'قسط جمعية', jam_receive: 'قبض جمعية', reconcile: 'مطابقة', reversal: 'عكس', buy_usd: 'شراء دولار', opening_fix: 'تصحيح افتتاحي', buy_stock: 'شراء أسهم', sell_stock: 'بيع أسهم' };
  function describe(S, t, ix) {
    const ps = ix ? (ix.get(t.id) || []) : S.post.filter(p => p.tx === t.id), nm = id => S.acc[id].name || id, ids = k => [...new Set(ps.filter(p => k(p.iqd)).map(p => nm(p.a)))].join('، ');
    const usd = ps.find(p => S.acc[p.a].cur === 'USD');
    return { id: t.id, date: t.date, label: LABEL[t.type] || t.type, amount: ps.reduce((s, p) => s + Math.max(p.iqd, 0), 0), usd: usd ? Math.abs(usd.n) : 0, rate: usd ? usd.rate : null,
      from: ids(v => v < 0), to: ids(v => v > 0), note: t.note || '', voided: t.voided, reversal: !!t.reverses };
  }
  const listTx = S => { const ix = new Map(); S.post.forEach(p => { const a = ix.get(p.tx); a ? a.push(p) : ix.set(p.tx, [p]); }); return S.tx.map(t => describe(S, t, ix)).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id); };

  const nwv = (S, s) => S.x.set.valuation === 'cost' ? s.nwc : s.nw;
  const at = (S, d) => E.snapAt(S, d, rateAt(S, d), priceAt(S, d), valsAt(S, d));
  function panel(S, d = today()) {
    const cur = E.snap(S), mEnd = monthEnd(prevMonth(mkey(d))), yEnd = (+d.slice(0, 4) - 1) + '-12-31', od = S.x.openDate;
    const delta = e => !od ? null : nwv(S, cur) - nwv(S, at(S, e < od ? od : e)); // قبل البدء: المقارنة مع لحظة الافتتاح (التغير منذ البدء)
    return { cur, nw: nwv(S, cur), U: S.x.set.valuation === 'cost' ? 0 : cur.U, dMonth: delta(mEnd), dYear: delta(yEnd) };
  }
  const accountsView = S => Object.values(S.acc).filter(a => a.type || /^u\d+$/.test(a.id)).map(a => { const b = E.bal(S, a.id);
    return { id: a.id, name: a.name, kind: a.kind, cur: a.cur, liquid: a.liquid, bal: a.kind === 'liab' ? -b : b, iqd: a.cur === 'USD' ? E.usdToIqd(b, S.rate) : (a.kind === 'liab' ? -b : b) }; });

  Object.assign(FL, { parseAmount, fmt, fmtUsd, fmtRate, iso, today, mkey, monthEnd, prevMonth, addMonths, monthsDiff, CATS, GROUPS, init, rateAt, priceAt, setRate, TYPES, addAccount, opening,
    income, expense, transfer, reconcile, undo, audit, describe, listTx, nwv, at, panel, accountsView, norm, valsAt });
})();
// ===== المرحلة 4: الأسعار وسعر الصرف، الدولار (WAC)، الذهب والفضة قطعةً قطعة، تقرير البيع =====
(() => {
  const E = typeof FE !== 'undefined' ? FE : require('./engine.js');
  const fineKarat = k => { if (!Number.isInteger(k) || k < 1 || k > 24) throw new Error('العيار من 1 إلى 24'); return Number(E.rd(BigInt(k) * 10000n, 24n)); };
  const fineMille = m => { if (!Number.isInteger(m) || m < 1 || m > 1000) throw new Error('النقاوة من 1 إلى 1000'); return m * 10; };
  function setPrices(S, d, o) { // سعر الأونصة بالسنت. يمكن إدخال معدن واحد فقط؛ الآخر لا يتأثر
    if (!E.okDate(d)) throw new Error('تاريخ غير صالح'); const ks = ['G', 'S'].filter(k => o[k] != null); if (!ks.length) throw new Error('أدخل سعر الذهب أو الفضة');
    ks.forEach(k => { if (!Number.isSafeInteger(o[k]) || o[k] <= 0) throw new Error('سعر الأونصة غير صالح'); });
    const e = S.x.prices.find(x => x.d === d) || (S.x.prices.push({ d, G: null, S: null }), S.x.prices[S.x.prices.length - 1]); ks.forEach(k => { e[k] = o[k]; });
    S.x.prices.sort((a, b) => a.d < b.d ? -1 : 1); S.price = FL.priceAt(S, '9999-12-31'); }
  const needRate = S => { if (!S.x.rates.length) throw new Error('أدخل سعر صرف الدولار أولاً (تبويب الأصول)'); };
  const needPrice = (S, metal) => { if (!S.x.prices.some(x => x[metal] != null)) throw new Error('أدخل سعر أونصة ' + (metal === 'G' ? 'الذهب' : 'الفضة') + ' أولاً'); };
  function buyPiece(S, o) { // شراء قطعة بدينار. السعر والصرف المستخدمان يُحفظان مع العملية فلا يتغيران لاحقاً
    const to = o.metal === 'G' ? 'gold' : 'silver', fa = S.acc[o.from]; if (!fa || fa.cur !== 'IQD') throw new Error('ادفع من حساب بالدينار (حوّل الدولار أولاً)');
    const fine = o.metal === 'G' ? fineKarat(o.karat) : fineMille(o.mille);
    return E.atomic(S, () => { if (o.price) setPrices(S, o.date, { [o.metal]: o.price }); if (o.rate) FL.setRate(S, o.date, o.rate); needRate(S); needPrice(S, o.metal);
      const id = 'm' + S.x.seq++; E.buyMetal(S, o.date, { id, metal: o.metal, mg: o.mg, fine, from: o.from, to, paid: o.paid, price: FL.priceAt(S, o.date)[o.metal], rate: FL.rateAt(S, o.date), form: o.form, label: o.label, note: o.note });
      return id; }); }
  function addPiece(S, o) { // قطعة موجودة قبل البدء: تكلفتها المدخلة، وإلا قيمتها النظرية يوم البدء مع علامة «تقديري». ليست دخلاً
    if (!S.x.openDate) throw new Error('سجّل الرصيد الافتتاحي أولاً'); const d = S.x.openDate, fine = o.metal === 'G' ? fineKarat(o.karat) : fineMille(o.mille);
    return E.atomic(S, () => { if (o.price) setPrices(S, d, { [o.metal]: o.price }); if (o.rate) FL.setRate(S, d, o.rate); needRate(S); needPrice(S, o.metal);
      const price = FL.priceAt(S, d)[o.metal], rate = FL.rateAt(S, d), est = !o.cost, cost = o.cost || E.metalIqd(o.mg, fine, price, rate), id = 'm' + S.x.seq++;
      E.buyMetal(S, d, { id, metal: o.metal, mg: o.mg, fine, from: 'eq_open', to: o.metal === 'G' ? 'gold' : 'silver', paid: cost, price, rate, form: o.form, label: o.label, est, type: 'opening', note: est ? 'تكلفة تقديرية = القيمة النظرية يوم البدء' : '' }); return id; }); }
  function sellPiece(S, o) { // يعيد معرّف عملية البيع. التقرير من saleReport
    const p = S.pieces[o.id]; if (!p) throw new Error('قطعة غير معروفة'); const to = S.acc[o.to]; if (!to || to.kind !== 'asset' || to.cur !== 'IQD' || to.metal) throw new Error('استلم النقود في حساب بالدينار');
    if (!Number.isSafeInteger(o.proceeds) || o.proceeds < 0) throw new Error('مبلغ البيع غير صالح');
    return E.atomic(S, () => { if (o.price) setPrices(S, o.date, { [p.metal]: o.price }); if (o.rate) FL.setRate(S, o.date, o.rate); needRate(S); needPrice(S, p.metal);
      return E.sellMetal(S, o.date, { id: o.id, to: o.to, proceeds: o.proceeds, pnl: 'pnlm', price: FL.priceAt(S, o.date)[p.metal], rate: FL.rateAt(S, o.date), note: o.note }); }); }
  function saleReport(S, id) {
    const p = S.pieces[id], sale = S.tx.find(t => t.type === 'sell_metal' && t.meta && t.meta.piece === id && !t.voided); if (!sale) throw new Error('لا توجد عملية بيع لهذه القطعة');
    const buy = S.tx.find(t => (t.type === 'buy_metal' || t.type === 'opening') && t.meta && t.meta.piece === id && !t.voided), bm = buy.meta;
    const cost = S.post.filter(x => x.tx === buy.id && x.piece === id && x.iqd > 0).reduce((s, x) => s + x.iqd, 0), proceeds = S.post.filter(x => x.tx === sale.id && S.acc[x.a].kind === 'asset' && x.iqd > 0).reduce((s, x) => s + x.iqd, 0);
    const vBuy = bm.price && bm.rate ? E.metalIqd(p.mg, p.fine, bm.price, bm.rate) : null, vSale = sale.meta.price && sale.meta.rate ? E.metalIqd(p.mg, p.fine, sale.meta.price, sale.meta.rate) : null;
    const dealer = vSale != null ? vSale - proceeds : null;
    return { id, date: sale.date, cost, proceeds, total: proceeds - cost, vBuy, vSale, making: vBuy != null ? cost - vBuy : null, market: vBuy != null && vSale != null ? vSale - vBuy : null, dealer,
      dealerBp: dealer != null && vSale > 0 ? Number(E.rd(BigInt(dealer) * 10000n, BigInt(vSale))) : null, est: !!bm.est, note: sale.note, to: S.post.filter(x => x.tx === sale.id && x.iqd > 0 && S.acc[x.a].kind === 'asset').map(x => S.acc[x.a].name).join('، ') };
  }
  function pieces(S) { return Object.entries(S.pieces).map(([id, p]) => { const cost = E.pieceCost(S, id), held = cost !== 0, theo = held ? E.metalIqd(p.mg, p.fine, S.price[p.metal], S.rate) : 0;
    return { id, ...p, held, cost, theo, unreal: held ? theo - cost : 0 }; }); }
  function usdInfo(S) { const d = E.derive(S);
    return Object.values(S.acc).filter(a => a.cur === 'USD' && a.kind === 'asset').map(a => { const w = d.usd[a.id] || { B: 0n, C: 0n }, bal = E.bal(S, a.id), mkt = E.usdToIqd(bal, S.rate), cost = Number(w.C);
      return { id: a.id, name: a.name, bal, cost, mkt, avg: bal > 0 ? Number(E.rd(w.C * 1000000n, w.B)) : 0, unreal: mkt - cost }; }); }
  Object.assign(FL, { fineKarat, fineMille, setPrices, buyPiece, addPiece, sellPiece, saleReport, pieces, usdInfo });
})();
// ===== المرحلة 5: الديون، الجمعيات، الأهداف، المتكررات والراتب المتوقع =====
(() => {
  const E = typeof FE !== 'undefined' ? FE : require('./engine.js');
  const posInt = (n, m) => { if (!Number.isSafeInteger(n) || n <= 0) throw new Error(m || 'المبلغ يجب أن يكون موجباً'); return n; };
  const iqAsset = (S, id) => { const a = S.acc[id]; if (!a || a.kind !== 'asset' || a.cur !== 'IQD' || a.metal || a.debt || a.jam) throw new Error('اختر حساباً بالدينار'); return a; };
  const newAcc = (S, prefix, kind, name, tag) => { const id = prefix + S.x.seq++; E.addAcc(S, id, kind, 'IQD', false); S.acc[id].name = name; Object.assign(S.acc[id], tag); return id; };
  const need = (v, m) => { v = String(v || '').trim(); if (!v) throw new Error(m); return v; };
  const date = d => { if (!E.okDate(d)) throw new Error('تاريخ غير صالح'); return d; };

  // ---------- الديون (بالدينار فقط) ----------
  const debtRem = (S, d) => d.dir === 'lent' ? E.bal(S, d.acct) : -E.bal(S, d.acct);
  function debtNew(S, o) {
    const person = need(o.person, 'اسم الشخص مطلوب'); posInt(o.amount); date(o.date); iqAsset(S, o.acct); if (o.dir !== 'lent' && o.dir !== 'borrowed') throw new Error('نوع الدين غير صالح'); if (o.due) date(o.due);
    return E.atomic(S, () => { const lent = o.dir === 'lent', id = newAcc(S, 'd', lent ? 'asset' : 'liab', (lent ? 'ذمة لي: ' : 'التزام: ') + person, { debt: true });
      E.post(S, o.date, lent ? 'lend' : 'borrow', lent ? [{ a: id, n: o.amount }, { a: o.acct, n: -o.amount }] : [{ a: o.acct, n: o.amount }, { a: id, n: -o.amount }], o.note || '', { debt: id });
      S.x.debts.push({ id, acct: id, person, dir: o.dir, amount: o.amount, date: o.date, due: o.due || null }); return id; });
  }
  function debtRepay(S, o) {
    const d = S.x.debts.find(x => x.id === o.id); if (!d) throw new Error('دين غير معروف'); date(o.date); iqAsset(S, o.acct); posInt(o.amount); const rem = debtRem(S, d);
    if (o.amount > rem) throw new Error('المبلغ أكبر من المتبقي (' + FL.fmt(rem) + ')'); if (o.fee) { posInt(o.fee, 'الرسوم يجب أن تكون موجبة'); if (d.dir === 'lent') throw new Error('الرسوم تُسجَّل على ما اقترضته فقط'); }
    return E.atomic(S, () => { const lent = d.dir === 'lent';
      E.post(S, o.date, lent ? 'repay_in' : 'repay_out', lent ? [{ a: o.acct, n: o.amount }, { a: d.acct, n: -o.amount }] : [{ a: d.acct, n: o.amount }, { a: o.acct, n: -o.amount }], o.note || '', { debt: d.id });
      if (o.fee) E.post(S, o.date, 'debt_fee', [{ a: 'c_fee', n: o.fee }, { a: o.acct, n: -o.fee }], 'رسوم/فائدة: ' + d.person, { debt: d.id }); });
  }
  const debts = (S, today = FL.today()) => S.x.debts.map(d => { const rem = debtRem(S, d); return { ...d, remaining: rem, paid: d.amount - rem, settled: rem === 0, overdue: rem > 0 && !!d.due && d.due < today }; });

  // ---------- الجمعيات ----------
  const jamReceived = (S, j) => S.tx.some(t => t.type === 'jam_receive' && !t.voided && t.meta && t.meta.jam === j.id);
  function jamNew(S, o) {
    const name = need(o.name, 'اسم الجمعية مطلوب'); if (!Number.isInteger(o.N) || o.N < 2 || o.N > 120) throw new Error('عدد الأعضاء من 2 إلى 120'); posInt(o.s, 'القسط يجب أن يكون موجباً');
    if (!Number.isInteger(o.turn) || o.turn < 1 || o.turn > o.N) throw new Error('دورك بين 1 وعدد الأعضاء'); date(o.start);
    return E.atomic(S, () => { const id = 'j' + S.x.seq++, asset = newAcc(S, 'ja', 'asset', 'أصل الجمعية: ' + name, { jam: id }), liab = newAcc(S, 'jl', 'liab', 'التزام الجمعية: ' + name, { jam: id });
      S.x.jams.push({ id, name, N: o.N, s: o.s, turn: o.turn, start: o.start, asset, liab }); return id; });
  }
  const jamState = (S, j) => { const rec = jamReceived(S, j), a = E.bal(S, j.asset), l = -E.bal(S, j.liab), paid = rec ? j.N - l / j.s : a / j.s;
    return { ...j, received: rec, paid, remaining: j.N - paid, pot: j.N * j.s, next: FL.addMonths(j.start, Math.max(0, paid)), done: rec && l === 0 }; };
  function jamPay(S, o) {
    const j = S.x.jams.find(x => x.id === o.id); if (!j) throw new Error('جمعية غير معروفة'); date(o.date); iqAsset(S, o.from); const st = jamState(S, j);
    if (st.received) { if (E.bal(S, j.liab) === 0) throw new Error('سُدّدت كل الأقساط'); return E.post(S, o.date, 'jam_pay', [{ a: j.liab, n: j.s }, { a: o.from, n: -j.s }], o.note || '', { jam: j.id }); }
    if (st.paid >= j.turn) throw new Error('دفعتَ حتى شهر القبض (' + j.turn + ')، سجّل القبض أولاً');
    return E.post(S, o.date, 'jam_pay', [{ a: j.asset, n: j.s }, { a: o.from, n: -j.s }], o.note || '', { jam: j.id });
  }
  function jamReceive(S, o) {
    const j = S.x.jams.find(x => x.id === o.id); if (!j) throw new Error('جمعية غير معروفة'); date(o.date); iqAsset(S, o.to); const st = jamState(S, j);
    if (st.received) throw new Error('قبضتَ هذه الجمعية من قبل'); if (st.paid !== j.turn) throw new Error('ادفع الأقساط حتى شهر القبض أولاً (مدفوع ' + st.paid + ' من ' + j.turn + ')');
    return E.atomic(S, () => { const id = E.jamReceive(S, o.date, { cash: o.to, asset: j.asset, liab: j.liab, N: j.N, s: j.s, k: st.paid }); S.tx.find(t => t.id === id).meta = { jam: j.id }; return id; });
  }

  // ---------- الأهداف (بالدينار، أو بالدولار مع ما يعادله بالدينار بآخر سعر) ----------
  // هدف الدولار: المستهدف والتخصيص بالسنت (usd)، ويُحجز ما يعادله بالدينار بسعر يوم التخصيص (amount) فيبقى «المتاح للصرف» صحيحاً
  const isUsdGoal = g => g && g.cur === 'USD';
  const goalAlloc = (S, id) => { const g = S.x.goalsDef.find(x => x.id === id), u = isUsdGoal(g); return S.goals.filter(x => x.name === id).reduce((s, x) => s + (u ? x.usd || 0 : x.amount), 0); };
  const goalIqd = (S, id) => S.goals.filter(x => x.name === id).reduce((s, x) => s + x.amount, 0);
  function goalNew(S, o) { const name = need(o.name, 'اسم الهدف مطلوب'); posInt(o.target, 'المبلغ المستهدف يجب أن يكون موجباً'); date(o.targetDate); if (o.targetDate < FL.today()) throw new Error('موعد الهدف في الماضي');
    if (![1, 2, 3].includes(o.priority)) throw new Error('الأولوية من 1 إلى 3'); if (o.kind !== 'short' && o.kind !== 'long') throw new Error('نوع الهدف غير صالح');
    const cur = o.cur || 'IQD'; if (cur !== 'IQD' && cur !== 'USD') throw new Error('عملة غير صالحة'); if (cur === 'USD' && !S.x.rates.length) throw new Error('أدخل سعر صرف الدولار أولاً (تبويب «الأصول»)');
    const id = 'g' + S.x.seq++, g = { id, name, target: o.target, targetDate: o.targetDate, priority: o.priority, kind: o.kind, created: FL.today(), skipped: 0 }; if (cur === 'USD') g.cur = 'USD'; S.x.goalsDef.push(g); return id; }
  function goalMove(S, o) { const g = S.x.goalsDef.find(x => x.id === o.id); if (!g) throw new Error('هدف غير معروف'); date(o.date);
    if (isUsdGoal(g)) return goalMoveUsd(S, g, o);
    if (o.release) return E.goalRelease(S, g.id, o.amount, o.date);
    if (!Number.isSafeInteger(o.amount) || o.amount < 0) throw new Error('مبلغ التخصيص يجب أن يكون عدداً صحيحاً غير سالب');
    const avail = E.snap(S).avail; if (o.amount > avail) throw new Error('المتاح للصرف (' + FL.fmt(avail) + ') أقل من المبلغ'); return E.goalAlloc(S, g.id, o.amount, o.date); }
  // o.amount بالسنت. التحرير الجزئي يحرّر من الدينار المحجوز بالنسبة نفسها، والتحرير الكامل يحرّره كله بلا بواقٍ
  function goalMoveUsd(S, g, o) { if (!Number.isSafeInteger(o.amount) || o.amount <= 0) throw new Error('المبلغ يجب أن يكون موجباً'); const last = () => { S.goals[S.goals.length - 1].usd = o.release ? -o.amount : o.amount; };
    if (o.release) { const u = goalAlloc(S, g.id), iq = goalIqd(S, g.id); if (o.amount > u) throw new Error('المخصص للهدف (' + FL.fmtUsd(u) + ') أقل من المبلغ');
      const n = o.amount === u ? iq : Number(E.rd(BigInt(iq) * BigInt(o.amount), BigInt(u))); if (n > 0) E.goalRelease(S, g.id, n, o.date); else E.goalAlloc(S, g.id, 0, o.date); return last(); }
    if (!S.x.rates.length) throw new Error('أدخل سعر صرف الدولار أولاً (تبويب «الأصول»)'); const iq = E.usdToIqd(o.amount, FL.rateAt(S, o.date)), avail = E.snap(S).avail;
    if (iq > avail) throw new Error('المتاح للصرف (' + FL.fmt(avail) + ') أقل من ' + FL.fmt(iq) + ' (ما يعادل ' + FL.fmtUsd(o.amount) + ')'); E.goalAlloc(S, g.id, iq, o.date); return last(); }
  function goalSkip(S, id) { const g = S.x.goalsDef.find(x => x.id === id); if (!g) throw new Error('هدف غير معروف'); g.targetDate = FL.addMonths(g.targetDate, 1); g.skipped++; }
  function goalView(S, today = FL.today()) {
    return S.x.goalsDef.map(g => { const a = goalAlloc(S, g.id), rem = Math.max(0, g.target - a), left = Math.max(1, FL.monthsDiff(today, g.targetDate)), T = Math.max(1, FL.monthsDiff(g.created, g.targetDate)), m = Math.min(T, Math.max(1, FL.monthsDiff(g.created, today) + 1));
      const expected = Math.floor((g.target * m + T - 1) / T), month = FL.mkey(today);
      const u = isUsdGoal(g), eq = n => u ? E.usdToIqd(n, S.rate) : n; // ما يعادله بالدينار بآخر سعر صرف (عرض فقط)
      return { ...g, cur: u ? 'USD' : 'IQD', allocated: a, remaining: rem, iqd: u ? { target: eq(g.target), allocated: eq(a), remaining: eq(rem), monthly: eq(Math.ceil(rem / left)), reserved: goalIqd(S, g.id) } : null, pct: Math.min(100, Math.floor(a * 100 / g.target)), monthly: Math.ceil(rem / left), behind: Math.max(0, Math.min(expected, g.target) - a), firstMonth: FL.mkey(g.created) === month, done: a >= g.target,
        paidMonth: S.goals.filter(x => x.name === g.id && (u ? x.usd > 0 : x.amount > 0) && x.date && FL.mkey(x.date) === month).reduce((s, x) => s + (u ? x.usd : x.amount), 0) }; }).sort((x, y) => x.priority - y.priority || (x.targetDate < y.targetDate ? -1 : 1));
  }
  const goalFmt = (g, n) => isUsdGoal(g) ? FL.fmtUsd(n) : FL.fmt(n);
  function goalAdvice(S, id, amount, today = FL.today()) { const v = goalView(S, today).find(x => x.id === id), w = [], av = E.snap(S).avail; if (!v) return w;
    const iq = v.cur === 'USD' ? E.usdToIqd(amount, FL.rateAt(S, today)) : amount;
    if (amount < v.monthly) w.push('أقل من القسط الشهري المطلوب (' + goalFmt(v, v.monthly) + ')، فسيتأخر الهدف أو يُمدَّد موعده.'); if (av > 0 && iq > av / 2) w.push('أكثر من نصف المتاح للصرف، فتنخفض سيولتك المتاحة بشدة.'); return w; }

  // ---------- المتكررات والراتب المتوقع (بالدينار، تذكير داخل التطبيق فقط) ----------
  function recurNew(S, o) { const name = need(o.name, 'الاسم مطلوب'); posInt(o.amount); iqAsset(S, o.acct); if (o.kind !== 'expense' && o.kind !== 'income') throw new Error('النوع غير صالح');
    if (!Number.isInteger(o.day) || o.day < 1 || o.day > 28) throw new Error('اليوم من 1 إلى 28'); if (!Number.isInteger(o.remind) || o.remind < 0 || o.remind > 7) throw new Error('التذكير من 0 إلى 7 أيام');
    if (o.kind === 'expense' && !(S.acc[o.cat] && S.acc[o.cat].kind === 'expense')) throw new Error('فئة غير صالحة'); if (o.kind === 'income' && !(S.acc[o.src] && S.acc[o.src].kind === 'income')) throw new Error('مصدر غير صالح');
    const id = 'r' + S.x.seq++; S.x.recur.push({ id, kind: o.kind, name, amount: o.amount, acct: o.acct, cat: o.cat || null, src: o.src || null, day: o.day, remind: o.remind, active: true, last: null, salary: !!o.salary }); return id; }
  const recurDue = (S, today = FL.today()) => S.x.recur.filter(r => r.active && r.last !== FL.mkey(today)).map(r => { const due = FL.mkey(today) + '-' + String(r.day).padStart(2, '0'), from = new Date(due + 'T00:00:00Z'); from.setUTCDate(from.getUTCDate() - r.remind);
    return { r, due, overdue: today > due, show: today >= from.toISOString().slice(0, 10) }; }).filter(x => x.show);
  function recurConfirm(S, o) { const r = S.x.recur.find(x => x.id === o.id); if (!r) throw new Error('بند غير معروف'); date(o.date); const amount = posInt(o.amount === undefined ? r.amount : o.amount);
    return E.atomic(S, () => { if (r.kind === 'income') FL.income(S, { date: o.date, acct: r.acct, src: r.src, amount, note: r.name }); else FL.expense(S, { date: o.date, acct: r.acct, cat: r.cat, amount, note: r.name }); r.last = FL.mkey(o.date); }); }
  function recurSkip(S, id, today = FL.today()) { const r = S.x.recur.find(x => x.id === id); if (!r) throw new Error('بند غير معروف'); r.last = FL.mkey(today); }
  const recurToggle = (S, id) => { const r = S.x.recur.find(x => x.id === id); if (!r) throw new Error('بند غير معروف'); r.active = !r.active; };
  const recurDelete = (S, id) => { S.x.recur = S.x.recur.filter(x => x.id !== id); };

  Object.assign(FL, { debtNew, debtRepay, debts, jamNew, jamState, jamPay, jamReceive, goalNew, goalMove, goalSkip, goalView, goalAdvice, goalFmt, recurNew, recurDue, recurConfirm, recurSkip, recurToggle, recurDelete });
})();
// ===== المرحلة 6: التقارير الشهرية والسنوية، حدود التنبيه، التنبيهات، اللقطات الشهرية، شاشة الحالة =====
(() => {
  const E = typeof FE !== 'undefined' ? FE : require('./engine.js');
  const live = (S, p) => { const t = S.tx[p.tx - 1]; return !t.voided && !t.reverses; };
  const inMonth = (p, k) => FL.mkey(p.date) === k;
  const FLOW = { income: 'دخل', expense: 'مصروف', transfer: 'تحويلات داخلية', convert: 'تحويل عملة', buy_metal: 'شراء معادن', sell_metal: 'بيع معادن', lend: 'إقراض', borrow: 'اقتراض', repay_in: 'سداد لي', repay_out: 'سداد مني', debt_fee: 'رسوم الديون', jam_pay: 'أقساط الجمعيات', jam_receive: 'قبض جمعية', reconcile: 'مطابقة', opening: 'رصيد افتتاحي', buy_stock: 'شراء أسهم', sell_stock: 'بيع أسهم' };
  // تقرير شهر: الدخل والمصروف حسب الفئة، المحقق، المطابقة، جسر صافي الثروة، حركة السيولة
  function monthReport(S, k) {
    const od = S.x.openDate; if (!od || k < FL.mkey(od)) throw new Error('هذا الشهر قبل بدء التسجيل');
    const e = FL.monthEnd(k), pe = FL.monthEnd(FL.prevMonth(k)), base = pe < od ? od : pe, A = S.post.filter(p => live(S, p) && p.date > base && p.date <= e); // الشهر الأول يبدأ من لحظة الافتتاح
    const cat = {}, grp = {}; let inc = 0, exp = 0;
    A.forEach(p => { const a = S.acc[p.a]; if (a.kind === 'income') inc -= p.iqd; else if (a.kind === 'expense') { exp += p.iqd; cat[a.name] = (cat[a.name] || 0) + p.iqd; grp[a.group] = (grp[a.group] || 0) + p.iqd; } });
    const s1 = FL.at(S, e), s0 = FL.at(S, base), v = s => FL.nwv(S, s), U = s => S.x.set.valuation === 'cost' ? 0 : s.U;
    // حركة السيولة بالقيمة الدفترية (بالدينار) حسب نوع العملية
    const flows = {}; S.tx.filter(t => !t.voided && !t.reverses && t.date > base && t.date <= e && t.type !== 'opening').forEach(t => { const d = S.post.filter(p => p.tx === t.id && S.acc[p.a].liquid).reduce((s, p) => s + p.iqd, 0); if (d) flows[t.type] = (flows[t.type] || 0) + d; });
    const liqNet = Object.values(flows).reduce((a, b) => a + b, 0);
    return { month: k, income: inc, expense: exp, cat, grp, realized: s1.real - s0.real, adj: s1.adj - s0.adj, dU: U(s1) - U(s0), nw0: v(s0), nw1: v(s1), dNw: v(s1) - v(s0),
      bridgeOk: v(s1) - v(s0) === (s1.inc - s0.inc) - (s1.exp - s0.exp) + (s1.real - s0.real) + (s1.adj - s0.adj) + (U(s1) - U(s0)),
      flows, liqNet, savings: inc - exp, sinceStart: pe < od };
  }
  function yearReport(S, y) {
    const od = S.x.openDate, cy = +FL.today().slice(0, 4); if (!od || y < +od.slice(0, 4) || y > cy) return { year: y, months: [], tot: { income: 0, expense: 0, savings: 0, realized: 0, adj: 0, dU: 0, buys: 0, sales: 0, nwStart: 0, nwEnd: 0 } }; const first = Math.max(+od.slice(0, 4) === y ? +od.slice(5, 7) : 1, 1), last = y === +FL.today().slice(0, 4) ? +FL.today().slice(5, 7) : 12, months = [];
    for (let m = first; m <= last; m++) months.push(monthReport(S, y + '-' + String(m).padStart(2, '0')));
    const sum = k => months.reduce((s, r) => s + r[k], 0), buys = S.tx.filter(t => !t.voided && !t.reverses && t.type === 'buy_metal' && +t.date.slice(0, 4) === y).reduce((s, t) => s + S.post.filter(p => p.tx === t.id && p.iqd > 0).reduce((a, p) => a + p.iqd, 0), 0);
    const sales = S.tx.filter(t => !t.voided && !t.reverses && t.type === 'sell_metal' && +t.date.slice(0, 4) === y).reduce((s, t) => s + S.post.filter(p => p.tx === t.id && S.acc[p.a].kind === 'asset' && p.iqd > 0).reduce((a, p) => a + p.iqd, 0), 0);
    return { year: y, months, tot: { income: sum('income'), expense: sum('expense'), savings: sum('savings'), realized: sum('realized'), adj: sum('adj'), dU: sum('dU'), buys, sales, nwStart: months[0] ? months[0].nw0 : 0, nwEnd: months.length ? months[months.length - 1].nw1 : 0 } };
  }
  // اللقطات الشهرية: تُحفظ للأشهر المنتهية، وتُعلَّم قديمة إن تغيّر ما يخصها بعد حفظها
  function snapMonths(S, today = FL.today()) { const od = S.x.openDate; if (!od) return []; let k = FL.mkey(od), last = FL.prevMonth(FL.mkey(today)), changed = [];
    for (let i = 0; i < 1200 && k <= last; i++, k = FL.addMonths(k + '-01', 1).slice(0, 7)) { const sn = FL.at(S, FL.monthEnd(k)), rec = { nw: FL.nwv(S, sn), nwc: sn.nwc, tx: S.tx.filter(t => t.date <= FL.monthEnd(k)).length, t: Date.now() }, old = S.x.snaps[k];
      if (!old) S.x.snaps[k] = rec; else if (old.nw !== rec.nw && !old.stale) { old.stale = { nw: rec.nw, diff: rec.nw - old.nw }; changed.push(k); } }
    return changed; }
  const acceptSnap = (S, k) => { const sn = FL.at(S, FL.monthEnd(k)); S.x.snaps[k] = { nw: FL.nwv(S, sn), nwc: sn.nwc, tx: S.tx.filter(t => t.date <= FL.monthEnd(k)).length, t: Date.now() }; };

  // حدود التنبيه: نسبة من دخل الشهر لكل مجموعة (افتراضية وقابلة للتعديل وليست استشارة)
  function setLimit(S, g, pct) { if (!(g in FL.GROUPS)) throw new Error('مجموعة غير معروفة'); if (!Number.isInteger(pct) || pct < 0 || pct > 100) throw new Error('النسبة من 0 إلى 100'); S.x.limits[g] = pct; }
  function budget(S, today = FL.today()) { const k = FL.mkey(today), r = monthReport(S, k), inc = r.income; const day = +today.slice(8), days = +FL.monthEnd(k).slice(8);
    return Object.keys(FL.GROUPS).map(g => { const lim = Math.floor(inc * S.x.limits[g] / 100), spent = r.grp[g] || 0; return { g, pct: S.x.limits[g], limit: lim, spent, over: inc > 0 && spent > lim, near: inc > 0 && spent > lim * 0.8 && spent <= lim, pace: inc > 0 && spent > lim * (day / days) * 1.3 && spent <= lim }; }); }
  // التنبيهات مرتبة بالأهم: أحمر ثم أصفر ثم معلومة. لا تدخل في أي حساب.
  function alerts(S, today = FL.today()) { const out = [], s = E.snap(S), push = (lv, t, go) => out.push({ lv, t, go });
    if (!S.x.openDate) return [{ lv: 'info', t: 'سجّل الرصيد الافتتاحي لتبدأ التقارير', go: ['accts', 'open'] }];
    const b = (typeof FB !== 'undefined' ? FB : require('./backup.js')).status(S); if (b.level === 'block') push('red', `مضى أكثر من 14 يوماً على آخر نسخة احتياطية`, ['more', 'backup']); else if (b.level === 'red') push('red', b.days == null ? 'لا توجد نسخة احتياطية خارجية' : `نسخة قديمة: ${b.days} يوماً و${b.since} عملية جديدة`, ['more', 'backup']);
    if (s.avail < 0) push('red', 'المخصص للأهداف أكبر من السيولة المتاحة', ['more', 'goals']);
    if (userHasUsd(S) && !S.x.rates.length) push('red', 'لم تُدخل سعر صرف الدولار: التقييم غير دقيق', ['assets']);
    L2.recurDue(S, today).forEach(x => push(x.overdue ? 'red' : 'warn', (x.r.salary ? 'هل استلمت الراتب؟ ' : 'مستحق: ') + x.r.name, ['more', 'recurring']));
    L2.debts(S, today).filter(d => d.overdue).forEach(d => push('red', 'دين متأخر: ' + d.person + ' (' + FL.fmt(d.remaining) + ')', ['more', 'debts']));
    budget(S, today).forEach(x => { if (x.over) push('red', `تجاوزتَ حد «${x.g}» هذا الشهر (${FL.fmt(x.spent)} من ${FL.fmt(x.limit)})`, ['more', 'reports']); else if (x.near) push('warn', `اقتربتَ من حد «${x.g}» (${FL.fmt(x.spent)} من ${FL.fmt(x.limit)})`, ['more', 'reports']); else if (x.pace) push('warn', `إنفاقك على «${x.g}» أسرع من وتيرة الشهر`, ['more', 'reports']); });
    L2.goalView(S, today).filter(g => !g.done && g.behind > 0 && !g.firstMonth).forEach(g => push('warn', `الهدف «${g.name}» متأخر ${FL.goalFmt(g, g.behind)}`, ['more', 'goals']));
    snapStale(S).forEach(k => push('warn', `تغيّرت أرقام شهر ${k} بعد إغلاقه`, ['more', 'reports']));
    return out.sort((a, c) => ({ red: 0, warn: 1, info: 2 })[a.lv] - ({ red: 0, warn: 1, info: 2 })[c.lv]); }
  const userHasUsd = S => Object.values(S.acc).some(a => a.cur === 'USD' && a.kind === 'asset');
  const snapStale = S => Object.entries(S.x.snaps).filter(([, v]) => v.stale).map(([k]) => k);
  const TIPS = ['سجّل كل عملية في يومها ليبقى كل شيء دقيقاً.', 'خذ نسخة احتياطية بعد كل جلسة إدخال كبيرة واحفظها في iCloud Drive.', 'راجع حدود التنبيه مرة كل فترة وعدّلها بما يناسب دخلك.', 'سعر الصرف الذي تُدخله هو ما تتعامل به فعلاً عند الصيرفة.', 'القيمة المعدنية النظرية ليست ما تقبضه عند البيع: الصياغة وخصم التاجر يقللانه.', 'هذه التنبيهات قواعد بسيطة قابلة للتعديل، وليست استشارة مالية.'];
  function status(S, today = FL.today()) { const s = E.snap(S), al = alerts(S, today), r = monthReport(S, FL.mkey(today)), level = al.some(a => a.lv === 'red') || s.avail < 0 ? 'red' : al.some(a => a.lv === 'warn') ? 'warn' : 'ok';
    return { avail: s.avail, liq: s.liq, nw: FL.nwv(S, s), income: r.income, expense: r.expense, left: r.income - r.expense, level, alerts: al, ticker: al.map(a => a.t).concat(TIPS) }; }
  const L2 = FL; // مراجع الدوال المعرَّفة في مراحل سابقة تُقرأ وقت التنفيذ
  Object.assign(FL, { FLOW, monthReport, yearReport, snapMonths, acceptSnap, setLimit, budget, alerts, snapStale, status, TIPS });
})();
// ===== تصحيح الرصيد الافتتاحي (5.3): قيد بتاريخ البدء مقابل «الرصيد الافتتاحي»، فلا دخل ولا مصروف ولا مطابقة ولا ربح صرف =====
(() => {
  const E = typeof FE !== 'undefined' ? FE : require('./engine.js');
  const live = t => t && !t.voided && !t.reverses, isOpen = t => t.type === 'opening' || t.type === 'opening_fix';
  // الرصيد الافتتاحي الحالي للحساب بعملته (موجب للأصل، سالب للالتزام) = الافتتاحي الأصلي + تصحيحاته
  const openingAmt = (S, id) => S.post.filter(p => p.a === id && live(S.tx[p.tx - 1]) && isOpen(S.tx[p.tx - 1])).reduce((s, p) => s + p.n, 0);
  const openingRate = (S, id) => { const p = S.post.find(p => p.a === id && p.rate && live(S.tx[p.tx - 1]) && S.tx[p.tx - 1].type === 'opening'); return p ? p.rate : null; };
  function openingFix(S, o) {
    const od = S.x.openDate; if (!od) throw new Error('سجّل الرصيد الافتتاحي أولاً');
    const a = S.acc[o.acct]; if (!a || !a.type) throw new Error('اختر حساباً من حساباتك');
    if (!Number.isSafeInteger(o.amount) || o.amount < 0) throw new Error('المبلغ يجب أن يكون صفراً أو أكثر');
    const diff = (a.kind === 'liab' ? -o.amount : o.amount) - openingAmt(S, o.acct); if (diff === 0) throw new Error('الرصيد الافتتاحي لهذا الحساب هو هذا المبلغ أصلاً');
    let leg = { a: o.acct, n: diff };
    if (a.cur === 'USD') {
      if (diff > 0) { const r = o.r || openingRate(S, o.acct); if (!r) throw new Error('اكتب متوسط سعر شراء الدولار الإضافي'); leg.r = r; }
      else { // التخفيض يُخرَج بتكلفته يوم البدء بالضبط، فلا يظهر ربح أو خسارة صرف وهمية
        const w = E.derive({ acc: S.acc, tx: S.tx.filter(t => t.date <= od), post: S.post.filter(p => p.date <= od) }).usd[o.acct];
        if (!w || w.B < BigInt(-diff)) throw new Error('رصيد الدولار يوم البدء لا يكفي لهذا التخفيض');
        leg.r = Number(E.rd(w.C * 1000000n, w.B)); leg.iqd = -Number(E.rd(w.C * BigInt(-diff), w.B)); }
    }
    const iqd = leg.iqd !== undefined ? leg.iqd : a.cur === 'USD' ? E.usdToIqd(leg.n, leg.r) : leg.n;
    return E.post(S, od, 'opening_fix', [leg, { a: 'eq_open', n: -iqd }], o.note || 'تصحيح الرصيد الافتتاحي', { fix: o.acct }); }
  // تعديل اسم حساب وإخفاؤه: بيانات عرض فقط، لا تمس أي قيد. الإخفاء ليس حذفاً، ولا يُخفى حساب فيه رصيد
  const userAcc = (S, id) => { const a = S.acc[id]; if (!a || !a.type) throw new Error('اختر حساباً من حساباتك'); return a; };
  function renameAccount(S, id, name) { const a = userAcc(S, id); name = String(name || '').trim(); if (!name) throw new Error('الاسم مطلوب');
    if (Object.values(S.acc).some(x => x !== a && x.name === name)) throw new Error('الاسم مستخدم'); a.name = name; }
  function hideAccount(S, id, hide = true) { const a = userAcc(S, id);
    if (!hide) { delete a.hidden; return; }
    if (E.bal(S, id) !== 0) throw new Error('لا يُخفى حساب فيه رصيد. انقل رصيده إلى حساب آخر أولاً');
    if (S.x.recur.some(r => r.active && r.acct === id)) throw new Error('يستعمله بند متكرر فعّال. أوقفه أو غيّره أولاً'); a.hidden = true; }
  // التقييم اليدوي (الوثيقة 3.0: manual_valuations) لحسابات «أصل آخر» بالدينار: عرض وتقييم فقط، لا قيد. الفرق عن التكلفة غير محقق
  const valAcc = (S, id) => { const a = S.acc[id]; if (!a || a.type !== 'other' || a.cur !== 'IQD') throw new Error('التقييم اليدوي لحسابات «أصل آخر» (عقار، أرض، سيارة) فقط'); return a; };
  function setValuation(S, o) { valAcc(S, o.acct); if (!E.okDate(o.date)) throw new Error('تاريخ غير صالح'); if (S.x.openDate && o.date < S.x.openDate) throw new Error('التاريخ قبل بدء التسجيل');
    if (!Number.isSafeInteger(o.value) || o.value < 0) throw new Error('القيمة يجب أن تكون صفراً أو أكثر');
    S.x.vals = (S.x.vals || []).filter(v => !(v.a === o.acct && v.d === o.date)).concat([{ a: o.acct, d: o.date, v: o.value }]).sort((x, y) => x.d < y.d ? -1 : x.d > y.d ? 1 : 0); }
  function removeValuation(S, acct, date) { const n = (S.x.vals || []).length; S.x.vals = (S.x.vals || []).filter(v => !(v.a === acct && v.d === date)); if (S.x.vals.length === n) throw new Error('لا يوجد تقييم بهذا التاريخ'); }
  const valuations = S => Object.values(S.acc).filter(a => a.type === 'other' && a.cur === 'IQD').map(a => { const hist = (S.x.vals || []).filter(v => v.a === a.id), last = hist[hist.length - 1], book = E.bal(S, a.id), on = !!last && book !== 0;
    return { id: a.id, name: a.name, hidden: !!a.hidden, book, last: last || null, value: on ? last.v : book, unreal: on ? last.v - book : 0, hist }; });
  Object.assign(FL, { openingAmt, openingRate, openingFix, renameAccount, hideAccount, setValuation, removeValuation, valuations });
})();
// ===== فحوصات السلامة (الوثيقة 3.0، القسم 4.4): للقراءة فقط، تكشف ولا تُصلح شيئاً =====
(() => {
  const E = typeof FE !== 'undefined' ? FE : require('./engine.js');
  function integrity(S, today = FL.today()) { // يعيد قائمة المشاكل بالعربية؛ فارغة = سليم
    const bad = [], add = m => { if (!bad.includes(m) && bad.length < 30) bad.push(m); }, sums = new Map();
    S.tx.forEach((t, i) => { if (t.id !== i + 1) add('تسلسل العمليات مختل عند العملية ' + t.id); if (!E.okDate(t.date)) add('تاريخ غير صالح في العملية ' + t.id);
      if (t.reverses && !(S.tx[t.reverses - 1] || {}).voided) add('العملية ' + t.id + ' تعكس عملية غير معلَّمة كمعكوسة'); });
    S.post.forEach(p => { const t = S.tx[p.tx - 1], a = S.acc[p.a];
      if (!t) return add('رجل قيد بلا عملية (' + p.tx + ')'); if (!a) add('العملية ' + p.tx + ' على حساب غير موجود (' + p.a + ')');
      if (!Number.isSafeInteger(p.n) || !Number.isSafeInteger(p.iqd)) add('مبلغ غير صحيح في العملية ' + p.tx);
      if (p.date !== t.date) add('تاريخ رجل يخالف تاريخ عمليته ' + p.tx); if (a && a.cur === 'USD' && !p.rate) add('رجل دولار بلا سعر صرف في العملية ' + p.tx);
      if (p.piece && !S.pieces[p.piece]) add('العملية ' + p.tx + ' تشير إلى قطعة غير موجودة'); sums.set(p.tx, (sums.get(p.tx) || 0) + p.iqd); });
    S.tx.forEach(t => { if (!sums.has(t.id)) add('العملية ' + t.id + ' بلا قيود'); else if (sums.get(t.id) !== 0) add('العملية ' + t.id + ' غير متوازنة بالدينار'); });
    const has = id => !!S.acc[id];
    S.x.debts.forEach(d => { if (!has(d.acct)) add('دين «' + d.person + '» يشير إلى حساب غير موجود'); });
    S.x.jams.forEach(j => { if (!has(j.asset) || !has(j.liab)) add('جمعية «' + j.name + '» تشير إلى حساب غير موجود'); });
    S.x.recur.forEach(r => { if (!has(r.acct) || (r.cat && !has(r.cat)) || (r.src && !has(r.src))) add('البند المتكرر «' + r.name + '» يشير إلى حساب أو فئة غير موجودة'); });
    (S.x.vals || []).forEach(v => { if (!has(v.a)) add('تقييم يدوي لحساب غير موجود (' + v.a + ')'); });
    const gids = new Set(S.x.goalsDef.map(g => g.id)); S.goals.forEach(g => { if (!gids.has(g.name)) add('تخصيص لهدف غير موجود (' + g.name + ')'); });
    S.x.goalsDef.filter(g => g.cur === 'USD').forEach(g => { if (S.goals.some(x => x.name === g.id && !Number.isSafeInteger(x.usd))) add('تخصيص بلا مبلغ بالدولار للهدف «' + g.name + '»'); });
    try { if (!E.identity(E.snap(S))) add('الهوية الدفترية مختلة: الأرصدة لا تطابق مجموع الحركات'); } catch (e) { add('تعذّر احتساب الأرصدة: ' + e.message); }
    if (S.x.openDate && !bad.length) { let k = FL.mkey(S.x.openDate); const last = FL.mkey(today);
      for (let i = 0; i < 1200 && k <= last; i++, k = FL.addMonths(k + '-01', 1).slice(0, 7)) { try { if (!FL.monthReport(S, k).bridgeOk) add('معادلة صافي الثروة مختلة في شهر ' + k); } catch (e) { add('تعذّر فحص شهر ' + k + ': ' + e.message); } } }
    return bad; }
  Object.assign(FL, { integrity });
})();
if (typeof module !== 'undefined') module.exports = FL;
