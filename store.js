'use strict';
// فلوسي — التخزين الدائم. العملية وكل ما يتبعها تُكتب في معاملة واحدة ذرّية؛ وعند أي فشل تعود الذاكرة كما كانت.
const FStore = (() => {
  const E = typeof FE !== 'undefined' ? FE : require('./engine.js'), L = typeof FL !== 'undefined' ? FL : require('./logic.js');
  const cp = o => JSON.parse(JSON.stringify(o));
  const bundle = S => ({ acc: S.acc, pieces: S.pieces, goals: S.goals, rate: S.rate, price: S.price, x: S.x });
  const rec = (S, t) => ({ ...t, posts: S.post.filter(p => p.tx === t.id) });

  function mem() { // نسخة في الذاكرة لنفس الواجهة (للاختبار)
    const d = { tx: new Map(), meta: new Map() };
    return { d, async readAll() { return { tx: [...d.tx.values()].map(cp), meta: Object.fromEntries([...d.meta].map(([k, v]) => [k, cp(v)])) }; },
      async commit(c) { const tx = (c.tx || []).map(cp), meta = Object.entries(c.meta || {}).map(([k, v]) => [k, cp(v)]); if (c.clear) { d.tx.clear(); d.meta.clear(); }
        tx.forEach(t => d.tx.set(t.id, t)); meta.forEach(([k, v]) => d.meta.set(k, v)); } };
  }
  function idb(name = 'flousi') { // اسم مختلف عن flousi-p0 فلا تُمسّ بيانات المرحلة 0
    const db = new Promise((res, rej) => { const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('tx', { keyPath: 'id' }); r.result.createObjectStore('meta'); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const run = (mode, fn) => db.then(d => new Promise((res, rej) => { const t = d.transaction(['tx', 'meta'], mode), out = fn(t);
      t.oncomplete = () => res(out); t.onerror = t.onabort = () => rej(t.error || new Error('تعذّر الحفظ')); }));
    return {
      readAll: () => run('readonly', t => { const o = { tx: [], meta: {} }; t.objectStore('tx').getAll().onsuccess = e => { o.tx = e.target.result; };
        t.objectStore('meta').openCursor().onsuccess = e => { const c = e.target.result; if (c) { o.meta[c.key] = c.value; c.continue(); } }; return o; }),
      commit: c => run('readwrite', t => { const a = t.objectStore('tx'), m = t.objectStore('meta'); if (c.clear) { a.clear(); m.clear(); }
        (c.tx || []).forEach(x => a.put(x)); for (const k in c.meta || {}) m.put(c.meta[k], k); }) };
  }
  function build(tx, meta) {
    const S = E.create(), st = meta.state;
    if (st) { S.acc = st.acc; S.pieces = st.pieces; S.goals = st.goals; S.rate = st.rate; S.price = st.price; S.x = st.x; }
    [...tx].sort((a, b) => a.id - b.id).forEach(t => { const { posts, ...h } = t; S.tx.push(h); S.post.push(...posts); });
    S.sec = meta.sec || {}; // الرمز ومفتاح الاسترداد: خارج النسخ الاحتياطية عمداً
    return L.init(S);
  }
  async function load(be) { const { tx, meta } = await be.readAll(); return build(tx, meta); }
  async function run(be, S, fn) { // يشغّل العملية ثم يحفظها ذرياً. عند الفشل: لا أثر في الذاكرة ولا في التخزين
    const n = S.tx.length, v = S.tx.map(t => t.voided), b0 = cp(bundle(S)), np = S.post.length;
    const revert = () => { S.tx.length = n; S.post.length = np; S.tx.forEach((t, i) => { t.voided = v[i]; }); Object.assign(S, { acc: b0.acc, pieces: b0.pieces, goals: b0.goals, rate: b0.rate, price: b0.price, x: b0.x }); };
    try {
      const out = fn(); const ids = new Set(S.tx.slice(n).map(t => t.id)); S.tx.forEach((t, i) => { if (i < n && t.voided !== v[i]) ids.add(t.id); });
      await be.commit({ tx: S.tx.filter(t => ids.has(t.id)).map(t => rec(S, t)), meta: { state: cp(bundle(S)) } }); return out;
    } catch (e) { revert(); throw e; }
  }
  const dump = S => ({ tx: S.tx.map(t => rec(S, t)), state: cp(bundle(S)) });
  async function replaceAll(be, d, extraMeta = {}) { // استبدال كامل في معاملة واحدة (للاستعادة)
    await be.commit({ clear: true, tx: d.tx, meta: { state: d.state, ...extraMeta } }); }
  const saveSec = (be, S) => be.commit({ meta: { sec: cp(S.sec) } });
  return { saveSec, mem, idb, load, run, build, dump, replaceAll, bundle };
})();
if (typeof module !== 'undefined') module.exports = FStore;
