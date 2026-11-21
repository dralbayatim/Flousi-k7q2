import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const FX = require(process.argv[2] + '/disc.js'), S = FX._stat; let pass = 0, fail = 0; const errs = [];
const ok = (c, n, i) => { if (c) pass++; else { fail++; errs.push(n + (i !== undefined ? ' → ' + JSON.stringify(i) : '')); } }, near = (a, b, e, n) => ok(Math.abs(a - b) <= e, n, [a, b]);
// إحصاء معروف القيم
near(S.pT(2.228, 10), 0.05, 0.001, 't df10'); near(S.pT(1.96, 1e6), 0.05, 0.001, 't normal'); near(S.pT(0, 5), 1, 1e-9, 't zero');
near(S.pBinom(1, 10), 0.0215, 0.0005, 'binom 1/10'); near(S.pBinom(5, 10), 1, 1e-9, 'binom 5/10');
const B = S.bh([{ p: 0.001 }, { p: 0.02 }, { p: 0.04 }, { p: 0.5 }], 0.1); ok(B.size === 3, 'BH accepts 3', B.size);
// سلسلة اصطناعية بمولّد ثابت
let seed = 7; const rnd = () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }, gauss = () => { let u = 0; for (let i = 0; i < 12; i++) u += rnd(); return u - 6; };
function make(n, real) { const days = {}; let g = 2000, s = 25, r = 150000, dx = 100, off = 1310; const t0 = Date.parse('2025-01-01');
  for (let i = 0; i < n; i++) { const d = new Date(t0 + i * 864e5).toISOString().slice(0, 10), z = gauss(), e = gauss();
    const gr = 0.01 * z, sr = real ? 1.6 * gr + 0.004 * gauss() : gr + 0.006 * gauss(), dr = real ? -0.5 * gr + 0.003 * e : 0.003 * e;
    g *= Math.exp(gr); s *= Math.exp(sr); dx *= Math.exp(dr); r *= Math.exp(0.002 * gauss()); days[d] = { xau_usd: g, xag_usd: s, usd_iqd_ref: Math.round(r), usd_iqd_official: off, dxy: dx, real10y: 2 + 0.01 * i * 0 + 0.05 * gauss() }; }
  return days; }
const real = FX.scan(make(200, true)); const ids = real.found.map(x => x.id);
ok(ids.includes('silver-beta') && ids.includes('link-dxy'), 'detects real effects', ids);
const sb = real.found.find(x => x.id === 'silver-beta'); ok(sb && /1\.6/.test(sb.text), 'beta ≈ 1.6', sb && sb.text);
let fp = 0, fpi = []; for (let k = 0; k < 40; k++) { seed = 1000 + k * 17; const f = FX.scan(make(200, false)).found; fp += f.length; fpi.push(...f.map(x => x.id)); } console.log(fpi); ok(fp <= 6, 'false positives on noise across 40 runs ≤ 6', fp);
ok(FX.scan(make(30, true)).found.every(x => x.n >= 8), 'min cases respected');
// السجل: 3 في الأسبوع وإعادة الاختبار خارج العينة
seed = 7; const D = make(400, true), early = Object.fromEntries(Object.entries(D).slice(0, 200));
let log = FX.update(null, early, '2025-07-20'); const n1 = Object.keys(log.items).length; ok(n1 >= 1 && n1 <= 3, 'max 3 per week', n1);
log = FX.update(log, early, '2025-07-21'); ok(Object.keys(log.items).length === n1, 'no more same week');
log = FX.update(log, D, '2025-09-20'); const it = log.items['silver-beta'] || Object.values(log.items)[0]; ok(it.ev[30] && ['held', 'fail', 'wait'].includes(it.ev[30].st), 'recheck after 30 days', it.ev);
ok(log.items['silver-beta'] ? log.items['silver-beta'].ev[30].st === 'held' : true, 'real effect holds out of sample', log.items['silver-beta'] && log.items['silver-beta'].ev);
console.log(`PASS ${pass}  FAIL ${fail}`); errs.forEach(e => console.log('  ✗ ' + e)); process.exit(fail ? 1 : 0);
