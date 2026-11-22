'use strict';
// فلوسي — الأسهم (f1-v4.5، البندان 12 و13). اختيارية. لا تغيّر معادلات المحرك المعتمدة:
// • كل سهم حساب أصل غير سائل (type: 'stock') تكلفته بالدينار في الدفتر.
// • الشراء تحويل من حساب دفع إلى السهم (ليس مصروفاً). البيع: التكلفة تخرج بالمتوسط المرجّح، والفرق ربح/خسارة محققة في حساب 'pnls' (نوع pnlm).
// • القيمة السوقية = العدد × سعر اليوم اليدوي (× سعر الصرف للسهم الدولاري)، تُكتب في سلسلة التقييم اليدوي S.x.vals نفسها المعتمدة للعقار،
//   فتظهر في صافي الثروة السوقي والفرق «غير محقق»، وتبقى الأشهر السابقة صحيحة لأن السلسلة تُعاد بناؤها كاملة من العمليات والأسعار.
// • العدد بالألف من السهم (3 منازل)، السعر بأصغر وحدة: دينار أو سنت. التوزيعات مؤجلة.
const FSK = (() => {
  const E = FE, L = FL, PNL = 'pnls', MAX = '9999-12-31';
  const ensure = S => { if (!S.acc[PNL]) { E.addAcc(S, PNL, 'pnlm'); S.acc[PNL].name = 'أرباح وخسائر الأسهم المحققة'; } if (!Array.isArray(S.x.stocks)) S.x.stocks = []; };
  const list = S => Array.isArray(S.x.stocks) ? S.x.stocks : [];
  const get = (S, id) => { const s = list(S).find(x => x.id === id); if (!s || !S.acc[id]) throw new Error('سهم غير معروف'); return s; };
  const ops = (S, id) => S.tx.filter(t => !t.voided && !t.reverses && t.meta && t.meta.stock === id);
  const qtyAt = (S, id, d = MAX) => ops(S, id).filter(t => t.date <= d).reduce((a, t) => a + t.meta.qty, 0);
  const lastOp = (S, id) => ops(S, id).map(t => t.date).sort().pop() || null;
  const priceAt = (st, d) => { const xs = st.prices.filter(p => p.d <= d); return (xs.length ? xs[xs.length - 1] : st.prices[0] || { p: 0 }).p; };
  const native = (q, p) => Number(E.rd(BigInt(q) * BigInt(p), 1000n)); // العدد × السعر بأصغر وحدة
  const toIqd = (S, st, n, d) => st.cur === 'USD' ? E.usdToIqd(n, L.rateAt(S, d)) : n;
  // إعادة بناء سلسلة التقييم لسهم واحد: عند كل عملية وكل سعر (وكل سعر صرف للسهم الدولاري)
  function regen(S, id) { const st = get(S, id), first = ops(S, id).map(t => t.date).sort()[0];
    const keep = (S.x.vals || []).filter(v => v.a !== id); if (!first) { S.x.vals = keep; return; }
    const ds = new Set([...ops(S, id).map(t => t.date), ...st.prices.map(p => p.d), ...(st.cur === 'USD' ? S.x.rates.map(r => r.d) : [])].filter(d => d >= first));
    const add = [...ds].sort().map(d => { const q = qtyAt(S, id, d); return q > 0 ? { a: id, d, v: toIqd(S, st, native(q, priceAt(st, d)), d) } : null; }).filter(Boolean);
    S.x.vals = keep.concat(add).sort((x, y) => x.d < y.d ? -1 : x.d > y.d ? 1 : 0); }
  const regenAll = (S, f) => list(S).filter(s => !f || f(s)).forEach(s => regen(S, s.id));
  const okQty = q => { if (!Number.isSafeInteger(q) || q <= 0) throw new Error('عدد الأسهم يجب أن يكون موجباً'); return q; };
  const okPrice = p => { if (!Number.isSafeInteger(p) || p <= 0) throw new Error('السعر يجب أن يكون موجباً'); return p; };
  const okDate = (S, id, d) => { if (!E.okDate(d)) throw new Error('تاريخ غير صالح'); if (S.x.openDate && d < S.x.openDate) throw new Error('التاريخ قبل بدء التسجيل (' + S.x.openDate + ')');
    const lo = lastOp(S, id); if (lo && d < lo) throw new Error('آخر عملية على هذا السهم بتاريخ ' + lo + '. سجّل بتاريخ مساوٍ أو بعده حتى يبقى متوسط التكلفة صحيحاً.'); };
  const payAcc = (S, id) => { const a = S.acc[id]; if (!a || a.kind !== 'asset' || a.metal || a.type === 'stock' || !a.liquid) throw new Error('اختر حساباً سائلاً (نقد، فيزا، دولار...)'); return a; };
  const needRate = (S, st) => { if (st.cur === 'USD' && !S.x.rates.length) throw new Error('أدخل سعر صرف الدولار أولاً («نبض السوق» ← «أسعارك المعتمدة»)'); };
  function setPrice(S, id, d, p) { const st = get(S, id); if (!E.okDate(d)) throw new Error('تاريخ غير صالح'); okPrice(p);
    st.prices = st.prices.filter(x => x.d !== d).concat([{ d, p }]).sort((a, b) => a.d < b.d ? -1 : 1); regen(S, id); }
  function add(S, { name, cur }) { ensure(S); name = String(name || '').trim(); if (!name) throw new Error('اسم السهم مطلوب'); if (cur !== 'IQD' && cur !== 'USD') throw new Error('عملة غير صالحة');
    if (Object.values(S.acc).some(a => a.name === name)) throw new Error('الاسم مستخدم'); const id = 'u' + S.x.seq++;
    E.addAcc(S, id, 'asset', 'IQD', false); S.acc[id].name = name; S.acc[id].type = 'stock'; S.x.stocks.push({ id, cur, prices: [] }); return id; }
  // شراء: from حساب دفع، paid بعملة حساب الدفع (شامل العمولة)، r سعر 100$ إن كان حساب الدفع دولارياً
  function buy(S, o) { ensure(S); const st = get(S, o.id); needRate(S, st); okDate(S, o.id, o.date); okQty(o.qty); okPrice(o.price); const f = payAcc(S, o.from);
    if (!Number.isSafeInteger(o.paid) || o.paid <= 0) throw new Error('المبلغ المدفوع يجب أن يكون موجباً');
    let legs, cost; if (f.cur === 'USD') { if (!o.r) throw new Error('سعر الصرف مطلوب'); cost = E.usdToIqd(o.paid, o.r); legs = [{ a: o.id, n: cost }, { a: o.from, n: -o.paid, r: o.r, iqd: -cost }]; }
    else { cost = o.paid; legs = [{ a: o.id, n: cost }, { a: o.from, n: -o.paid }]; }
    return E.atomic(S, () => { const id = E.post(S, o.date, 'buy_stock', legs, o.note || '', { stock: o.id, qty: o.qty, price: o.price }); setPrice(S, o.id, o.date, o.price); return id; }); }
  // سهم كان عندك قبل البدء: يُسجَّل بتاريخ البدء مقابل «الرصيد الافتتاحي» (لا دخل ولا مصروف)، وتكلفته = العدد × متوسط الشراء
  function addOld(S, o) { ensure(S); const st = get(S, o.id), od = S.x.openDate; if (!od) throw new Error('سجّل الرصيد الافتتاحي أولاً'); needRate(S, st);
    if (ops(S, o.id).length) throw new Error('لهذا السهم عمليات مسجّلة. استعمل «شراء».'); okQty(o.qty); okPrice(o.avg);
    const cost = toIqd(S, st, native(o.qty, o.avg), od); if (cost <= 0) throw new Error('التكلفة صفر');
    return E.atomic(S, () => { const id = E.post(S, od, 'opening_fix', [{ a: o.id, n: cost }, { a: 'eq_open', n: -cost }], 'أسهم قبل البدء', { stock: o.id, qty: o.qty, price: o.avg }); setPrice(S, o.id, od, o.avg); return id; }); }
  // بيع: التكلفة الخارجة بالمتوسط المرجّح، والمحقق = صافي البيع بالدينار − التكلفة الخارجة
  function sell(S, o) { ensure(S); const st = get(S, o.id); okDate(S, o.id, o.date); okQty(o.qty); okPrice(o.price); const t = payAcc(S, o.to), held = qtyAt(S, o.id);
    if (o.qty > held) throw new Error('تملك ' + (held / 1000) + ' سهماً فقط'); if (!Number.isSafeInteger(o.proceeds) || o.proceeds <= 0) throw new Error('مبلغ البيع يجب أن يكون موجباً');
    const book = E.bal(S, o.id), out = o.qty === held ? book : Number(E.rd(BigInt(book) * BigInt(o.qty), BigInt(held)));
    let leg; if (t.cur === 'USD') { if (!o.r) throw new Error('سعر الصرف مطلوب'); leg = { a: o.to, n: o.proceeds, r: o.r }; } else leg = { a: o.to, n: o.proceeds };
    const pIqd = t.cur === 'USD' ? E.usdToIqd(o.proceeds, o.r) : o.proceeds, legs = [leg, { a: o.id, n: -out }]; if (out - pIqd) legs.push({ a: PNL, n: out - pIqd });
    return E.atomic(S, () => { const id = E.post(S, o.date, 'sell_stock', legs, o.note || '', { stock: o.id, qty: -o.qty, price: o.price, realized: pIqd - out }); setPrice(S, o.id, o.date, o.price); return id; }); }
  function view(S) { const V = L.valsAt(S, MAX);
    return list(S).map(st => { const a = S.acc[st.id], q = qtyAt(S, st.id), cost = E.bal(S, st.id), last = st.prices[st.prices.length - 1] || null, mkt = q > 0 && cost !== 0 && V[st.id] != null ? V[st.id] : cost;
      return { id: st.id, name: a.name, cur: st.cur, hidden: !!a.hidden, qty: q, cost, avg: q > 0 ? Number(E.rd(BigInt(cost) * 1000n, BigInt(q))) : 0, price: last ? last.p : null, priceDate: last ? last.d : null,
        mktNative: q > 0 && last ? native(q, last.p) : 0, mkt, unreal: mkt - cost,
        realized: ops(S, st.id).filter(t => t.type === 'sell_stock').reduce((s, t) => s + (t.meta.realized || 0), 0) }; }); }
  const realized = S => S.acc[PNL] ? -E.bal(S, PNL) : 0;
  // سعر الصرف يغيّر قيمة السهم الدولاري، والتراجع عن عملية سهم يغيّر عدده: يُعاد بناء السلسلة تلقائياً
  const setRate0 = L.setRate; L.setRate = function (S, d, r) { const out = setRate0(S, d, r); regenAll(S, s => s.cur === 'USD'); return out; };
  const undo0 = L.undo; L.undo = function (S, id, d) { const t = S.tx.find(x => x.id === id), out = undo0(S, id, d); if (t && t.meta && t.meta.stock && list(S).some(s => s.id === t.meta.stock)) { const st = get(S, t.meta.stock);
    // سعر يوم العملية المعكوسة يُحذف إن لم تبقَ عملية أخرى في اليوم نفسه، فلا يبقى سعر عملية ملغاة معتمداً
    if (!ops(S, st.id).some(x => x.date === t.date)) st.prices = st.prices.filter(p => !(p.d === t.date && p.p === t.meta.price)); regen(S, st.id); } return out; };
  return { PNL, ensure, list, add, buy, addOld, sell, setPrice, view, qtyAt, realized, regen, regenAll, native };
})();
