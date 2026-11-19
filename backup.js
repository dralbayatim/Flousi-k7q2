'use strict';
// فلوسي — المرحلة 3: النسخ الاحتياطي المشفّر والاستعادة والتصدير والرمز. الصيغة .flousibak كما في المرحلة 0 (FLSY + AES-256-GCM).
const FB = (() => {
  const E = typeof FE !== 'undefined' ? FE : require('./engine.js'), L = typeof FL !== 'undefined' ? FL : require('./logic.js'),
    St = typeof FStore !== 'undefined' ? FStore : require('./store.js'), C = typeof FLS !== 'undefined' ? FLS : require('./core.js');
  const sub = (typeof crypto !== 'undefined' ? crypto : require('crypto').webcrypto).subtle, enc = new TextEncoder();
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''), unhex = h => Uint8Array.from(h.match(/../g).map(x => parseInt(x, 16)));
  const rnd = n => (typeof crypto !== 'undefined' ? crypto : require('crypto').webcrypto).getRandomValues(new Uint8Array(n));

  // ----- الرمز (6 أرقام): PBKDF2-SHA256 -----
  async function hashPin(pin, rec) { const salt = rec ? unhex(rec.salt) : rnd(16), iter = rec ? rec.iter : 200000;
    const k = await sub.importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
    return { salt: hex(salt), iter, h: hex(await sub.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 256)) }; }
  const checkPinFormat = p => { if (!/^\d{6}$/.test(L.norm(p))) throw new Error('الرمز 6 أرقام'); return L.norm(p); };
  async function verifyPin(pin, rec) { if (!rec) return false; const r = await hashPin(L.norm(pin), rec); return r.h === rec.h; }

  // ----- النسخة الاحتياطية -----
  const manifest = S => { const d = St.dump(S), sn = E.snap(S); return { txCount: S.tx.length, nw: sn.nw, nwc: sn.nwc, accounts: Object.keys(S.acc).length, fp: null, d }; };
  async function build(S, key) { const m = manifest(S); const d = m.d; const fp = await C.fingerprint(d.tx);
    const payload = { v: 2, app: 'flousi', created: Date.now(), manifest: { txCount: m.txCount, nw: m.nw, nwc: m.nwc, accounts: m.accounts, fp }, dump: d };
    return C.encrypt(payload, key); }
  async function open(bytes, key) { // يعيد { S, payload } بعد التحقق الكامل، أو يرمي خطأً واضحاً
    const p = await C.decrypt(bytes, key);
    if (p.v === 1 || !p.dump) throw new Error('هذه نسخة اختبار من المرحلة 0 وليست نسخة فلوسي');
    if (p.app !== 'flousi' || p.v !== 2) throw new Error('إصدار النسخة غير مدعوم');
    if (await C.fingerprint(p.dump.tx) !== p.manifest.fp) throw new Error('بصمة العمليات لا تطابق: النسخة تالفة');
    for (const t of p.dump.tx) { if (t.posts.reduce((a, x) => a + x.iqd, 0) !== 0) throw new Error('عملية غير متوازنة في النسخة'); }
    const S = St.build(p.dump.tx, { state: p.dump.state }), sn = E.snap(S);
    if (!E.identity(sn) || sn.nw !== p.manifest.nw || sn.nwc !== p.manifest.nwc || S.tx.length !== p.manifest.txCount) throw new Error('الأرصدة المحسوبة لا تطابق بيانات النسخة');
    return { S, payload: p }; }
  async function restore(be, S, bytes, key) { // استبدال كامل في معاملة واحدة، مع حفظ لقطة ما قبل الاستعادة (30 يوماً)
    const { S: S2, payload } = await open(bytes, key);
    const sec = { ...S.sec, key: C.normKey(key) }; S2.sec = sec;
    await St.replaceAll(be, payload.dump, { sec, prerestore: { t: Date.now(), dump: St.dump(S) } }); return payload.manifest; }
  async function undoRestore(be, S) { const { meta } = await be.readAll(); const pr = meta.prerestore; if (!pr) throw new Error('لا توجد لقطة قبل الاستعادة'); if (Date.now() - pr.t > 30 * 864e5) throw new Error('انتهت مدة اللقطة (30 يوماً)');
    await St.replaceAll(be, pr.dump, { sec: S.sec, prerestore: null }); }
  function status(S, now = Date.now()) { // 7.2/8.2: أحمر بعد 10 عمليات جديدة أو 7 أيام، ويسبق كل فتح بعد 14 يوماً
    const b = S.x.backup, n = S.tx.length; if (!n) return { level: 'ok', days: null, since: 0 };
    if (!b) return { level: 'red', days: null, since: n };
    const days = Math.floor((now - b.t) / 864e5), since = n - b.tx; return { level: days > 14 ? 'block' : (days > 7 || since >= 10) ? 'red' : 'ok', days, since }; }

  // ----- التصدير: CSV داخل ملف مضغوط واحد + JSON موثَّق -----
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = d => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = crcT[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  function zip(files) {
    const parts = [], cen = []; let off = 0;
    for (const f of files) { const name = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      const lh = Uint8Array.from([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 33, 0, ...u32(crc), ...u32(sz), ...u32(sz), ...u16(name.length), 0, 0]);
      parts.push(lh, name, f.data); cen.push({ name, crc, sz, off }); off += lh.length + name.length + sz; }
    let cl = 0; for (const c of cen) { const e = Uint8Array.from([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 33, 0, ...u32(c.crc), ...u32(c.sz), ...u32(c.sz), ...u16(c.name.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(c.off)]); parts.push(e, c.name); cl += e.length + c.name.length; }
    parts.push(Uint8Array.from([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(cen.length), ...u16(cen.length), ...u32(cl), ...u32(off), 0, 0]));
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; }); return out; }
  const cell = v => { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const csv = (head, rows) => '\uFEFF' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
  function exportFiles(S) {
    const nm = id => (S.acc[id] && S.acc[id].name) || id, files = {}, mo = [];
    files['transactions.csv'] = csv(['id', 'date', 'type', 'voided', 'reverses', 'note'], S.tx.map(t => [t.id, t.date, t.type, t.voided ? 1 : 0, t.reverses || '', t.note]));
    files['postings.csv'] = csv(['tx', 'date', 'account_id', 'account', 'native', 'currency', 'rate_x10000', 'iqd', 'piece'], S.post.map(p => [p.tx, p.date, p.a, nm(p.a), p.n, S.acc[p.a].cur, p.rate || '', p.iqd, p.piece || '']));
    files['accounts.csv'] = csv(['id', 'name', 'kind', 'currency', 'liquid'], Object.values(S.acc).map(a => [a.id, a.name, a.kind, a.cur, a.liquid ? 1 : 0]));
    files['metal_pieces.csv'] = csv(['id', 'metal', 'weight_mg', 'fineness_x10000', 'form', 'label', 'buy_date', 'cost_iqd_remaining'], Object.entries(S.pieces).map(([id, p]) => [id, p.metal, p.mg, p.fine, p.form || '', p.label || '', p.buy ? p.buy.date : '', E.pieceCost(S, id)]));
    files['fx_rates.csv'] = csv(['date', 'iqd_per_usd_x10000'], S.x.rates.map(r => [r.d, r.r]));
    files['metal_prices.csv'] = csv(['date', 'gold_usd_cents_per_oz', 'silver_usd_cents_per_oz'], S.x.prices.map(r => [r.d, r.G, r.S]));
    files['goals.csv'] = csv(['goal', 'date', 'amount_iqd'], S.goals.map(g => [g.name, g.date || '', g.amount]));
    if (S.tx.length) { const first = L.mkey(S.tx.map(t => t.date).sort()[0]); let k = first; const last = L.mkey(L.today());
      for (let i = 0; i < 600 && k <= last; i++) { const e = L.monthEnd(k), inc = S.post.filter(p => S.acc[p.a].kind === 'income' && L.mkey(p.date) === k && !S.tx[p.tx - 1].voided && !S.tx[p.tx - 1].reverses).reduce((s, p) => s - p.iqd, 0),
          ex = S.post.filter(p => S.acc[p.a].kind === 'expense' && L.mkey(p.date) === k && !S.tx[p.tx - 1].voided && !S.tx[p.tx - 1].reverses).reduce((s, p) => s + p.iqd, 0);
        mo.push([k, inc, ex, L.nwv(S, L.at(S, e))]); k = L.addMonths(k + '-01', 1).slice(0, 7); } }
    files['monthly_summary.csv'] = csv(['month', 'income_iqd', 'expense_iqd', 'net_worth_iqd_at_month_end'], mo);
    return files; }
  const exportJson = S => JSON.stringify({ format: 'flousi-export-v1', exported: new Date().toISOString(), note: 'المبالغ أعداد صحيحة: دينار، سنت للدولار، ملّيغرام للمعادن، السعر دينار لكل 1$ × 10,000', ...St.dump(S) });
  function exportZip(S) { const f = exportFiles(S), list = Object.entries(f).map(([name, t]) => ({ name, data: enc.encode(t) })); list.push({ name: 'flousi-export-v1.json', data: enc.encode(exportJson(S)) }); return zip(list); }
  function unzipList(b) { // قارئ مبسّط للتحقق الذاتي (طريقة الحفظ بلا ضغط)
    const dv = new DataView(b.buffer, b.byteOffset), n = dv.getUint16(b.length - 12, true); let o = dv.getUint32(b.length - 6, true), out = [];
    for (let i = 0; i < n; i++) { const sz = dv.getUint32(o + 20, true), nl = dv.getUint16(o + 28, true), lo = dv.getUint32(o + 42, true), name = new TextDecoder().decode(b.slice(o + 46, o + 46 + nl)), crc = dv.getUint32(o + 16, true);
      const ln = dv.getUint16(lo + 26, true), data = b.slice(lo + 30 + ln, lo + 30 + ln + sz); out.push({ name, crc, ok: crc32(data) === crc, data }); o += 46 + nl; } return out; }
  return { hashPin, verifyPin, checkPinFormat, build, open, restore, undoRestore, status, zip, crc32, csv, exportFiles, exportJson, exportZip, unzipList, hex };
})();
if (typeof module !== 'undefined') module.exports = FB;
