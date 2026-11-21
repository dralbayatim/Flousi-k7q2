// اختبار وحدات pulse.js (f1-v4.11) في Node ببيانات مصطنعة: الوحدات، السعر المرجعي، الفجوة، تفكيك الحركة، التنبيهات، الذاكرة، الراتب بالمثقال
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const DIR = process.argv[2]; let pass = 0, fail = 0; const errs = [];
const ok = (c, n, i) => { if (c) pass++; else { fail++; errs.push(n + (i !== undefined ? ' → ' + JSON.stringify(i) : '')); } }, near = (a, b, e, n) => ok(Math.abs(a - b) <= e, n, [a, b]);
const DAY = 864e5, NOW = Date.now(), iso = t => new Date(t).toISOString(), bag = t => new Date(t + 3 * 3600e3).toISOString().slice(0, 10);
// FN حقيقي (nabd.js) مع ملف سوق مصطنع
global.fetch = null; const FN = require(DIR + '/nabd.js'); global.FN = FN;
const ind = (id, value, t, max = 3000) => ({ id, value, data_time: t, fetched_ok_at: t, status: 'current', update: 'ok', max_age_min: max });
const mk = (o = {}) => ({ schema: 'nabd-market/1', generated_at: iso(NOW - 60e3), indicators: [ind('xau_usd', o.g ?? 3600, iso(NOW - 600e3)), ind('xag_usd', o.s ?? 45, iso(NOW - 600e3)), ind('usd_iqd_parallel', o.p ?? 171250, iso(NOW - 3600e3)),
  ...(o.noShops ? [] : [ind('usd_iqd_shops_baghdad', { sell: 171500, buy: 170500 }, iso(NOW - 3600e3))]), ind('usd_iqd_official', 1510, null, 99999)].map(x => (x.id === 'usd_iqd_official' ? { ...x, fetched_ok_at: iso(NOW - 3600e3) } : x)), derived: [] });
const load = async m => { FN._test.reset(); FN._test.setFetch(async () => ({ ok: true, json: async () => m })); await FN.load(true); };
const FP = require(DIR + '/pulse.js'); global.FP = FP;
const setDays = d => FN._test.setAux({ history: { schema: 'nabd-history/1', days: d, intraday: {} }, ref: { gold: [] }, series: null });
await load(mk());
// 1) السعر المرجعي = متوسط البيع والشراء
let r = FN.ref(); ok(r.value === 171000 && r.kind === 'calc' && r.basis === 'mid' && r.buy === 170500 && r.sell === 171500, 'ref mid', r);
await load(mk({ noShops: true })); r = FN.ref(); ok(r.value === 171250 && r.kind === 'obs' && r.basis === 'bourse', 'ref bourse fallback', r);
await load(mk());
// 2) الوحدات
const U = Object.fromEntries(FP.units().map(u => [u.id, u])), OZ = 31.1034768;
near(U.m21.usd, 3600 * 4.375 / OZ, 0.006, 'm21 usd'); ok(U.m21.iqd === Math.round(3600 * 4.375 / OZ * 1710), 'm21 iqd', U.m21);
near(U.m24.usd, 3600 * 5 / OZ, 0.006, 'm24 usd'); near(U.g24.usd, 3600 / OZ, 0.006, 'g24'); near(U.oz.usd, 3600, 0.001, 'ounce'); near(U.skg.usd, 45 * 999 / OZ, 0.006, 'silver kg 999');
ok(Object.values(U).every(u => u.kind === 'calc' && u.live === 'current'), 'units calc/current');
// 3) الفجوة
const g = FP.gap(); near(g.v, (1710 / 1510 - 1) * 100, 0.01, 'gap'); ok(g.kind === 'calc', 'gap kind');
// 4) تفكيك الحركة: يوم = إغلاق اليوم السابق في السجل
const today = bag(NOW), y1 = bag(NOW - DAY), y8 = bag(NOW - 8 * DAY), y31 = bag(NOW - 31 * DAY);
setDays({ [y1]: { xau_usd: 3500, xag_usd: 44, usd_iqd_ref: 170000 } });
let d = FP.decompose('d'); ok(d.ok, 'decompose d ok', d);
near(d.fromOunce, Math.log(3600 / 3500) * 100, 0.01, 'from ounce'); near(d.fromDollar, Math.log(171000 / 170000) * 100, 0.01, 'from dollar');
near(d.total, (3600 * 171000 / (3500 * 170000) - 1) * 100, 0.01, 'total multiplicative'); near(d.m1 / d.m0 - 1, d.total / 100, 1e-4, 'mithqal consistent');
ok(/خلال يوم: \+2.82% من الأونصة و\+0.59% من الدولار، والمحرّك الأكبر الأونصة\./.test(FP.sentence(d)), 'sentence', FP.sentence(d));
ok(!FP.decompose('w').ok && /لا تكفي البيانات/.test(FP.decompose('w').why), 'week insufficient → honest message');
setDays({ [y8]: { xau_usd: 3400, usd_iqd_ref: 168000 }, [y1]: { xau_usd: 3500, usd_iqd_ref: 170000 } }); FN._test.setAux({ ref: { gold: [] } });
d = FP.decompose('w'); ok(d.ok, 'week ok with 8-day point', d); near(d.fromDollar, Math.log(171000 / 168000) * 100, 0.01, 'week dollar');
setDays({ [y31]: { xau_usd: 3000, usd_iqd_ref: 150000 } }); d = FP.decompose('m'); ok(d.ok && d.fromOunce > 0, 'month ok', d);
ok(FP.decompose('d').ok === false, 'no previous day → not ok');
// السعر القديم: لا تفكيك
await load({ ...mk(), indicators: mk().indicators.map(x => x.id === 'xau_usd' ? { ...x, data_time: iso(NOW - 30 * DAY), fetched_ok_at: iso(NOW - 30 * DAY) } : x) });
const closedNow = (() => { const t = new Date(NOW), w = t.getUTCDay(), h = t.getUTCHours(); return w === 6 || (w === 0 && h < 22) || (w === 5 && h >= 22); })();
setDays({ [y1]: { xau_usd: 3500, usd_iqd_ref: 170000 } }); ok(!FP.decompose('d').ok, 'stale gold → no decomposition');
await load(mk());
// 5) التنبيهات
const S = { x: { set: {} } };
FP.alertAdd(S, { k: 'usd', op: '>', v: 170000 }); FP.alertAdd(S, { k: 'usd', op: '<', v: 100000 }); FP.alertAdd(S, { k: 'xau', op: '>', v: 3599.999 }); FP.alertAdd(S, { k: 'm21', op: '<', v: 999999999 });
let hits = FP.alertsCheck(S); ok(hits.length === 3 && hits.every(h => h.t.startsWith('🔔')), 'alerts hit', hits.map(h => h.t));
ok(hits[0].t.includes('171,000') && hits[0].t.includes('170,000'), 'alert text values', hits[0].t);
let threw = 0; for (const o of [{ k: 'x', op: '>', v: 1 }, { k: 'usd', op: '=', v: 1 }, { k: 'usd', op: '>', v: 0 }, { k: 'usd', op: '>', v: NaN }]) try { FP.alertAdd(S, o); } catch (e) { threw++; } ok(threw === 4, 'alert validation');
FP.alertDel(S, S.x.set.palerts[0].id); ok(S.x.set.palerts.length === 3, 'alert delete');
for (let i = 0; i < 9; i++) FP.alertAdd(S, { k: 'usd', op: '>', v: 1 }); threw = 0; try { FP.alertAdd(S, { k: 'usd', op: '>', v: 1 }); } catch (e) { threw = 1; } ok(threw === 1 && S.x.set.palerts.length === 12, 'max 12 alerts');
const ref0 = FN.ref; FN.ref = () => ({ ...ref0(), live: 'stale' }); ok(!FP.alertsCheck({ x: { set: { palerts: [{ id: 'a', k: 'usd', op: '>', v: 1 }] } } }).length, 'stale price never triggers'); FN.ref = ref0;
// 6) الذاكرة: ما بعد الحدث من سلسلة الذهب
FN._test.setAux({ ref: { gold: [['2020-12-01', 1800], ['2020-12-18', 1880], ['2021-01-19', 1840], ['2021-03-19', 1740], ['2023-02-07', 1880], ['2023-03-08', 1820], ['2023-05-08', 2020]] }, history: { days: {}, intraday: {} }, series: { schema: 'nabd-series/1', generated_at: iso(NOW), fred: { FEDTARU: { obs: [['2020-03-15', 0.25], ['2022-03-17', 0.5], ['2026-09-17', 4]] } }, cot: {}, releases: {} } });
const M = FP.memory(), e20 = M.find(e => e.d === '2020-12-19'), e23 = M.find(e => e.d === '2023-02-07'), e26 = M.find(e => e.d === '2026-10-07');
near(e20.g30, (1840 / 1880 - 1) * 100, 0.05, 'event 2020 +30'); near(e20.g90, (1740 / 1880 - 1) * 100, 0.05, 'event 2020 +90'); near(e23.g90, (2020 / 1880 - 1) * 100, 0.05, 'event 2023 +90');
ok(e26.g90 == null, 'recent event: no future data'); ok(M.some(e => e.k === 'fed' && e.d === '2022-03-17' && e.t.includes('يرفع')), 'fed events from data'); ok(M[0].d >= M[M.length - 1].d, 'memory newest first');
// 7) الراتب بالمثقال
global.FM = { salary: () => ({ amount: 1500000, from: 'recurring' }) };
const k0 = bag(NOW).slice(0, 7), Sx = { tx: [{ id: 1 }], post: [{ tx: 1, a: 'inc_salary', date: k0 + '-02', iqd: -1600000 }], x: { set: {} } }; global.FE = {};
setDays({ [today]: { xau_usd: 3600, usd_iqd_ref: 170000 }, [y1]: { xau_usd: 3500, usd_iqd_ref: 170000 } });
const P = FP.salaryPower(Sx), last = P.last, m21avg = (Math.round(3600 * 4.375 / OZ * 1700) + Math.round(3500 * 4.375 / OZ * 1700)) / 2;
ok(last && last.salary === 1600000 && !last.est, 'recorded salary used', last); near(last.mithqal, 1600000 / Math.round(m21avg), 0.01, 'salary in mithqal'); ok(last.usd === Math.round(1600000 / 1700), 'salary in usd', last.usd);
const P2 = FP.salaryPower({ tx: [], post: [], x: { set: {} } }); ok(P2.last.est && P2.last.salary === 1500000, 'expected salary when not recorded (estimated)');
// 8) الأثر: لا تعرض شيئاً بلا تعرّض
global.FL = { pieces: () => [], usdInfo: () => [] }; ok(FP.impact({}).none, 'no exposure → none');
global.FL = { pieces: () => [{ held: true, metal: 'G', mg: 10000, fine: 8750 }], usdInfo: () => [{ bal: 10000 }] };
setDays({ [y1]: { xau_usd: 3500, xag_usd: 44, usd_iqd_ref: 170000 } });
const im = FP.impact({}); const gNow = Math.round(8.75 / OZ * 3600 * 1710), gB = Math.round(8.75 / OZ * 3500 * 1700);
ok(im.d && im.d.gold === gNow - gB && im.d.usd === Math.round(100 * 1710) - Math.round(100 * 1700) && im.d.total === im.d.gold + im.d.usd, 'impact numbers', im.d);
console.log(`PASS ${pass}  FAIL ${fail}`); errs.forEach(e => console.log('  ✗ ' + e)); process.exit(fail ? 1 : 0);
