'use strict';
// فلوسي — المرحلة 1: محرك المحاسبة (بلا واجهة وبلا تخزين). المبالغ أعداد صحيحة، وBigInt داخل الحسابات فقط.
// المعادلات كما في الوثيقة 3.0 (الأقسام 4.1 و5 و6). الدينار عملة الأساس، سعر الصرف = دينار لكل دولار × 10,000.
const FE = (() => {
  const OZ_DEN = 311034768n; // 1000 × 10,000 × 31.1034768 (الأونصة التروية بالغرام)
  const rd = (n, d) => { const s = n < 0n; if (s) n = -n; const q = (2n * n + d) / (2n * d); return s ? -q : q; }; // نصف للأعلى بعيداً عن الصفر
  const N = b => { if (b > 9007199254740991n || b < -9007199254740991n) throw new Error('خارج النطاق الآمن'); return Number(b); };
  const usdToIqd = (cents, rate) => N(rd(BigInt(cents) * BigInt(rate), 1000000n));
  const metalUsd = (mg, fine, price) => N(rd(BigInt(mg) * BigInt(fine) * BigInt(price), OZ_DEN)); // سنت
  const metalIqd = (mg, fine, price, rate) => usdToIqd(metalUsd(mg, fine, price), rate);

  const okDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); if (!m) return false; const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return t.getUTCFullYear() === +m[1] && t.getUTCMonth() === +m[2] - 1 && t.getUTCDate() === +m[3]; };

  const create = () => ({ acc: {}, tx: [], post: [], pieces: {}, goals: [], rate: 15000000, price: { G: 400000, S: 5000 } });
  // kind: asset | liab | equity | income | expense | pnlm (ربح/خسارة معادن محققة) | recon (فروقات المطابقة)
  const addAcc = (S, id, kind, cur = 'IQD', liquid = false, metal = null) => { S.acc[id] = { id, kind, cur, liquid, metal }; };

  const legIqd = (S, l) => {
    const a = S.acc[l.a]; if (!a) throw new Error('حساب غير معروف: ' + l.a);
    if (!Number.isSafeInteger(l.n)) throw new Error('المبلغ يجب أن يكون عدداً صحيحاً');
    if (a.cur === 'IQD') return l.n;
    if (a.kind === 'liab') throw new Error('الالتزام بالدولار غير مدعوم في هذه المرحلة');
    if (!l.r) throw new Error('سعر الصرف مطلوب لحساب الدولار');
    if (l.iqd !== undefined) { if (!Number.isSafeInteger(l.iqd) || Math.sign(l.iqd) !== Math.sign(l.n)) throw new Error('القيمة الفعلية بالدينار غير صالحة'); return l.iqd; }
    return usdToIqd(l.n, l.r);
  };
  const act = S => { const ok = new Set(S.tx.filter(t => !t.voided && !t.reverses).map(t => t.id));
    return S.post.filter(p => ok.has(p.tx)).sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : x.tx - y.tx); };

  // إعادة احتساب حتمية للحقول المشتقة (متوسط التكلفة المرجّح للدولار والمحقق منه) بترتيب (التاريخ، التسلسل)
  const isUsdTransfer = (S, t, ps) => t.type === 'transfer' && ps.length === 2 && ps.every(p => S.acc[p.a].cur === 'USD') && ps[0].n === -ps[1].n && ps[0].n !== 0 && ps[0].a !== ps[1].a;
  function derive(S) {
    const u = {}; let fx = 0n; const by = new Map(), tm = new Map(S.tx.map(t => [t.id, t]));
    act(S).forEach(p => { if (!by.has(p.tx)) by.set(p.tx, []); by.get(p.tx).push(p); }); // الترتيب: (التاريخ، التسلسل)
    const W = a => u[a] || (u[a] = { B: 0n, C: 0n });
    for (const [id, ps] of by) {
      if (isUsdTransfer(S, tm.get(id), ps)) { // تحويل بين حسابين دولاريين لك: تنتقل التكلفة التاريخية كما هي، ولا محقق
        const s = ps.find(p => p.n < 0), d = ps.find(p => p.n > 0), x = BigInt(d.n), ws = W(s.a);
        if (x > ws.B) throw new Error('رصيد الدولار لا يكفي');
        const used = rd(ws.C * x, ws.B); ws.B -= x; ws.C -= used; const wd = W(d.a); wd.B += x; wd.C += used; continue;
      }
      for (const p of ps) {
        if (S.acc[p.a].cur !== 'USD') continue;
        const w = W(p.a), n = BigInt(p.n);
        if (n > 0n) { w.B += n; w.C += BigInt(p.iqd); }
        else if (n < 0n) {
          const x = -n; if (x > w.B) throw new Error('رصيد الدولار لا يكفي');
          const used = rd(w.C * x, w.B); fx += BigInt(-p.iqd) - used; w.B -= x; w.C -= used;
        }
      }
    }
    return { usd: u, fx };
  }

  function post(S, date, type, legs, note = '', meta = null) {
    if (!okDate(date)) throw new Error('تاريخ غير صالح');
    const id = S.tx.length + 1;
    const ps = legs.map(l => ({ tx: id, date, a: l.a, n: l.n, rate: l.r || null, iqd: legIqd(S, l), piece: l.p || null }));
    if (type === 'transfer' && ps.length === 2 && ps.every(p => S.acc[p.a].cur === 'USD') && (ps[0].rate !== ps[1].rate || ps[0].n !== -ps[1].n))
      throw new Error('التحويل بين حسابين دولاريين يتطلب المبلغ نفسه والسعر نفسه');
    if (ps.reduce((s, p) => s + BigInt(p.iqd), 0n) !== 0n) throw new Error('العملية غير متوازنة بالدينار');
    S.tx.push({ id, date, type, note, voided: false, reverses: null, meta }); S.post.push(...ps);
    try { derive(S); } catch (e) { S.tx.pop(); S.post.length -= ps.length; throw e; }
    return id;
  }
  function reverse(S, txid, date) { // عكس ظاهر: الأصل والعكس يُستبعدان معاً من الحساب ويبقيان في السجل
    const t = S.tx.find(x => x.id === txid); if (!t || t.voided || t.reverses) throw new Error('لا يمكن عكس هذه العملية');
    if (!okDate(date)) throw new Error('تاريخ العكس غير صالح');
    if (date < t.date) throw new Error('تاريخ العكس قبل تاريخ العملية');
    const id = S.tx.length + 1; t.voided = true;
    S.tx.push({ id, date, type: 'reversal', note: 'عكس ' + txid, voided: false, reverses: txid });
    S.post.filter(p => p.tx === txid).forEach(p => S.post.push({ ...p, tx: id, date, n: -p.n, iqd: -p.iqd }));
    return id;
  }

  const sum = (arr, f) => arr.reduce((s, p) => s + BigInt(f(p)), 0n);
  const bal = (S, id) => N(sum(act(S).filter(p => p.a === id), p => p.n)); // موجب للأصل، سالب للالتزام
  const pieceCost = (S, pid) => N(sum(act(S).filter(p => p.piece === pid), p => p.iqd));

  function snap(S) {
    const A = act(S), d = derive(S);
    let am = 0n, ac = 0n, li = 0n, inc = 0n, exp = 0n, rm = 0n, adj = 0n, eq = 0n, liq = 0n, usdC = 0n;
    for (const id in S.acc) {
      const a = S.acc[id], ps = A.filter(p => p.a === id), nat = sum(ps, p => p.n), iq = sum(ps, p => p.iqd);
      if (a.kind === 'asset') {
        let m, c;
        if (a.cur === 'USD') { m = BigInt(usdToIqd(N(nat), S.rate)); c = d.usd[id] ? d.usd[id].C : 0n; usdC += c; }
        else if (a.metal) { m = 0n; c = iq; }
        else { m = iq; c = iq; }
        am += m; ac += c; if (a.liquid) liq += m;
      } else if (a.kind === 'liab') li += -iq;
      else if (a.kind === 'income') inc += -iq;
      else if (a.kind === 'expense') exp += iq;
      else if (a.kind === 'pnlm') rm += -iq;
      else if (a.kind === 'recon') adj += -iq;
      else if (a.kind === 'equity') eq += -iq;
    }
    const mv = { G: 0n, S: 0n };
    for (const pid in S.pieces) { const p = S.pieces[pid]; if (pieceCost(S, pid) !== 0) mv[p.metal] += BigInt(metalIqd(p.mg, p.fine, S.price[p.metal], S.rate)); }
    am += mv.G + mv.S;
    const alloc = S.goals.reduce((s, g) => s + g.amount, 0);
    const real = rm + d.fx;
    return { assets: N(am), liab: N(li), nw: N(am - li), nwc: N(ac - li), U: N(am - ac), liq: N(liq), avail: N(liq) - alloc, inc: N(inc), exp: N(exp),
      real: N(real), adj: N(adj), eq: N(eq), gold: N(mv.G), silver: N(mv.S), usdCost: N(usdC), fx: N(d.fx) };
  }
  // فحوصات: (1) الهوية الدفترية  (2) معادلة التسوية بين لقطتين
  const identity = s => s.nwc === s.eq + s.inc - s.exp + s.real + s.adj;
  const bridge = (a, b) => (b.nw - a.nw) === (b.inc - a.inc) - (b.exp - a.exp) + (b.real - a.real) + (b.adj - a.adj) + (b.U - a.U);

  // ===== عمليات جاهزة =====
  const opening = (S, date, items, eqAcc) => { // items: [{a, n, r?}] (الأصل موجب، الالتزام سالب)
    const tot = items.reduce((s, l) => s + legIqd(S, l), 0);
    return post(S, date, 'opening', [...items, { a: eqAcc, n: -tot }]);
  };
  const buyMetal = (S, date, o) => { // التحقق أولاً، والقطعة لا تُسجَّل إلا بعد نجاح العملية (لا بيانات يتيمة)
    if (typeof o.id !== 'string' || !o.id) throw new Error('معرّف القطعة مطلوب');
    if (Object.prototype.hasOwnProperty.call(S.pieces, o.id)) throw new Error('معرّف القطعة مكرر');
    if (o.metal !== 'G' && o.metal !== 'S') throw new Error('نوع المعدن غير صالح');
    if (!Number.isSafeInteger(o.mg) || o.mg <= 0) throw new Error('الوزن غير صالح');
    if (!Number.isSafeInteger(o.fine) || o.fine <= 0 || o.fine > 10000) throw new Error('النقاوة غير صالحة');
    if (!Number.isSafeInteger(o.paid) || o.paid <= 0) throw new Error('سعر الشراء يجب أن يكون عدداً صحيحاً موجباً');
    const to = S.acc[o.to], from = S.acc[o.from];
    if (!to || to.kind !== 'asset' || to.metal !== o.metal) throw new Error('حساب المعدن غير صالح');
    if (!from || from.metal || !(from.kind === 'asset' || (o.type === 'opening' && from.kind === 'equity'))) throw new Error('حساب الدفع غير صالح');
    const id = post(S, date, o.type || 'buy_metal', [{ a: o.to, n: o.paid, p: o.id }, { a: o.from, n: -o.paid }], o.note || '', { piece: o.id, price: o.price || null, rate: o.rate || null, est: !!o.est });
    S.pieces[o.id] = { metal: o.metal, mg: o.mg, fine: o.fine, acct: o.to, form: o.form || null, label: o.label || '', buy: { date, price: o.price || null, rate: o.rate || null, est: !!o.est } }; return id; };
  const sellMetal = (S, date, o) => { const p = Object.prototype.hasOwnProperty.call(S.pieces, o.id) ? S.pieces[o.id] : null;
    if (!p) throw new Error('قطعة غير معروفة'); const c = pieceCost(S, o.id);
    if (!c) throw new Error('القطعة غير محتفَظ بها');
    return post(S, date, 'sell_metal', [{ a: o.to, n: o.proceeds }, { a: p.acct, n: -c, p: o.id }, { a: o.pnl, n: c - o.proceeds }], o.note || '', { piece: o.id, price: o.price || null, rate: o.rate || null }); };
  const reconcile = (S, date, cash, counted, reconAcct) => { const diff = counted - bal(S, cash);
    return post(S, date, 'reconcile', [{ a: cash, n: diff }, { a: reconAcct, n: -diff }]); };
  const jamReceive = (S, date, o) => { // N أعضاء، قسط s، دُفع k قسطاً: النقد +N·s، الأصل −k·s، الالتزام −(N−k)·s
    if (bal(S, o.asset) !== o.k * o.s) throw new Error('رصيد أصل الجمعية لا يطابق الأقساط المدفوعة');
    return post(S, date, 'jam_receive', [{ a: o.cash, n: o.N * o.s }, { a: o.asset, n: -o.k * o.s }, { a: o.liab, n: -(o.N - o.k) * o.s }]); };
  const goalAlloc = (S, name, amount, date = null) => { if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('مبلغ التخصيص يجب أن يكون عدداً صحيحاً غير سالب');
    S.goals.push({ name, amount, date }); };
  const goalRelease = (S, name, amount, date = null) => { if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('مبلغ التحرير يجب أن يكون عدداً صحيحاً موجباً');
    if (S.goals.filter(g => g.name === name).reduce((s, g) => s + g.amount, 0) < amount) throw new Error('المخصص للهدف أقل من المبلغ');
    S.goals.push({ name, amount: -amount, date }); };
  const snapAt = (S, date, rate, price) => snap({ acc: S.acc, tx: S.tx.filter(t => t.date <= date), post: S.post.filter(p => p.date <= date), pieces: S.pieces,
    goals: S.goals.filter(g => !g.date || g.date <= date), rate: rate || S.rate, price: price || S.price });
  const atomic = (S, fn) => { const n = S.tx.length, p = S.post.length, g = S.goals.length, v = S.tx.map(t => t.voided), pk = Object.keys(S.pieces);
    try { return fn(); } catch (e) { S.tx.length = n; S.post.length = p; S.goals.length = g; S.tx.forEach((t, i) => { t.voided = v[i]; }); Object.keys(S.pieces).forEach(k => { if (!pk.includes(k)) delete S.pieces[k]; }); throw e; } };

  return { create, addAcc, post, reverse, bal, pieceCost, snap, identity, bridge, opening, buyMetal, sellMetal, reconcile, jamReceive,
    goalAlloc, goalRelease, snapAt, atomic, okDate, derive, usdToIqd, metalUsd, metalIqd, rd };
})();
if (typeof module !== 'undefined') module.exports = FE;
