'use strict';
// فلوسي — المرحلة 0: دوال التشفير والبصمة (بلا أي اعتماد على الواجهة)
const FLS = (() => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 حرفاً بلا I وO و0 و1
  const ITER = 600000;
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  const sha256 = async t => hex(await crypto.subtle.digest('SHA-256', enc.encode(t)));
  const newKey = () => [...crypto.getRandomValues(new Uint8Array(24))].map(x => ALPHA[x % 32]).join('');
  const fmtKey = k => k.match(/.{1,4}/g).join('-');
  const normKey = s => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']'
    : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}'
    : JSON.stringify(v);
  const fingerprint = recs => sha256(canon([...recs].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
  async function derive(key, salt, iter) {
    const m = await crypto.subtle.importKey('raw', enc.encode(normKey(key)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, m,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  // الملف: FLSY | إصدار(1) | تكرارات(4) | ملح(16) | iv(12) | نص مشفّر (AES-256-GCM)
  async function encrypt(obj, key) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const k = await derive(key, salt, ITER);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(obj))));
    const out = new Uint8Array(37 + ct.length);
    out.set(enc.encode('FLSY'), 0); out[4] = 1;
    new DataView(out.buffer).setUint32(5, ITER);
    out.set(salt, 9); out.set(iv, 25); out.set(ct, 37);
    return out;
  }
  async function decrypt(bytes, key) {
    if (bytes.length < 53 || dec.decode(bytes.slice(0, 4)) !== 'FLSY' || bytes[4] !== 1) throw new Error('format');
    const iter = new DataView(bytes.buffer, bytes.byteOffset).getUint32(5);
    if (iter < 100000 || iter > 5000000) throw new Error('format');
    const k = await derive(key, bytes.slice(9, 25), iter);
    let pt;
    try { pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(25, 37) }, k, bytes.slice(37)); }
    catch (e) { throw new Error('auth'); }
    return JSON.parse(dec.decode(pt));
  }
  return { newKey, fmtKey, normKey, fingerprint, encrypt, decrypt };
})();
if (typeof module !== 'undefined') module.exports = FLS;
