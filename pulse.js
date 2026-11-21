'use strict';
// نبض السوق الجديد (f1-v4.11): حسابات البوابة فقط — «الآن» و«لماذا تحرّك» و«أموالي». عرض فقط: لا يكتب شيئاً في بياناتك.
// القواعد المعتمدة:
//  • كل رقم يحمل نوعه: مرصود (كما نُشر) · محسوب (من أرقام مرصودة) · مقدّر · نموذجنا. لا خلط بينها.
//  • لا تُعرض أسماء المصادر في الواجهة (تبقى في الأرشيف). لا أسعار صاغة ولا مصنعية في البوابة.
//  • سعر التحويل = متوسط بيع وشراء الدولار الموازي (FN.ref). المثقال العراقي = 5 غرامات.
//  • لا توقع ولا نسبة دقة: ما لا تكفيه البيانات يُقال صراحة «لا تكفي البيانات بعد».
const FP = (() => {
  const OZ = 31.1034768, DAY = 864e5, MITHQAL = 5;
  const KIND = { obs: ['مرصود', 'قيمة كما نُشرت في السوق دون تعديل.'], calc: ['محسوب', 'ناتج حساب من أرقام مرصودة (تحويل أو متوسط أو نسبة).'], est: ['مقدّر', 'تقدير تقريبي حين لا يتوفر رقم مرصود؛ لا يُعامل كرقم دقيق.'], model: ['نموذجنا', 'قاعدة تحليل ثابتة وضعناها؛ ليست توقعاً ولم تُختبر تاريخياً بعد.'] };
  const N = () => (typeof FN !== 'undefined' ? FN : null);
  const tOf = d => { const x = Date.parse(d && d.length === 10 ? d + 'T12:00:00Z' : d); return Number.isFinite(x) ? x : null; };
  const worst = (...ls) => ls.includes('unavailable') || ls.includes(undefined) ? 'unavailable' : ls.includes('stale') || ls.includes('review') ? 'stale' : 'current';
  const r2 = x => Math.round(x * 100) / 100, r1 = x => Math.round(x * 10) / 10;
  const bagDay = t => new Date(t + 3 * 3600e3).toISOString().slice(0, 10); // اليوم بتوقيت بغداد

  // ---- الوحدات: من الأونصة العالمية بسعر التحويل المرجعي ----
  const UNITS = [['m21', 'مثقال ذهب 21', 'G', 21 / 24 * MITHQAL], ['m24', 'مثقال ذهب 24', 'G', MITHQAL], ['g21', 'غرام ذهب 21', 'G', 21 / 24], ['g24', 'غرام ذهب 24', 'G', 1],
    ['oz', 'أونصة ذهب', 'G', OZ], ['skg', 'كيلو فضة 999', 'S', 999], ['soz', 'أونصة فضة', 'S', OZ]];
  // grams = غرامات معدن خالص في الوحدة. القيمة = غرامات ÷ 31.1034768 × سعر الأونصة
  const unitUsd = (gramsPure, ounce) => gramsPure / OZ * ounce;
  const toIqd = (usd, ref100) => Math.round(usd * ref100 / 100);
  function units() { const F = N(); if (!F || !F.get()) return [];
    const g = F.ind('xau_usd'), s = F.ind('xag_usd'), rf = F.ref();
    return UNITS.map(([id, label, m, grams]) => { const o = m === 'G' ? g : s; if (!o || o.value == null) return null; const usd = unitUsd(grams, o.value);
      return { id, label, metal: m, usd: r2(usd), iqd: rf ? toIqd(usd, rf.value) : null, live: worst(o.live, rf ? rf.live : 'unavailable'), t: o.data_time, kind: 'calc' }; }).filter(Boolean); }
  const unit = id => units().find(u => u.id === id) || null;
  // فجوة الرسمي عن المرجعي (%)
  function gap() { const F = N(); if (!F || !F.get()) return null; const o = F.ind('usd_iqd_official'), rf = F.ref(); if (!o || o.value == null || !rf) return null;
    return { v: r2((rf.value / 100 / o.value - 1) * 100), official: o.value, ref: rf.value, live: worst(o.live, rf.live), kind: 'calc' }; }

  // ---- السلاسل اليومية من سجل الجالب (السجل الخفيف للتطبيق؛ الأرشيف الكامل على GitHub) ----
  const days = () => { const F = N(); return F ? (((F.aux() || {}).history || {}).days || {}) : {}; };
  const dayRef = x => x.usd_iqd_ref != null ? x.usd_iqd_ref : x.usd_iqd_parallel != null ? x.usd_iqd_parallel : null;
  function dollarSeries() { const F = N(), out = new Map(), today = bagDay(Date.now());
    Object.entries(days()).forEach(([d, x]) => { const v = dayRef(x); if (v != null && d < today) out.set(Date.parse(d + 'T20:00:00Z'), v); });
    const rf = F && F.get() ? F.ref() : null; if (rf && rf.live === 'current') out.set(tOf(rf.data_time) || Date.now(), rf.value);
    return [...out.entries()].filter(([t]) => t != null).sort((a, b) => a[0] - b[0]); }
  const goldSeries = () => { const F = N(); return F ? F.metalSeries('gold') : []; };
  // قيمة السلسلة قرب لحظة t (أقرب نقطة قبلها ضمن سماحية)، وإلا null
  function near(ser, t, tol) { let p = null; for (const q of ser) { if (q[0] <= t) p = q; else break; } return p && t - p[0] <= tol ? p : null; }

  // ---- تفكيك حركة المثقال: Δln(المثقال) = Δln(الأونصة) + Δln(الدولار) ----
  const WIN = [['d', 'يوم', 1], ['w', 'أسبوع', 7], ['m', 'شهر', 30]];
  function decompose(win = 'd') { const F = N(); if (!F || !F.get()) return { ok: false, why: 'لا بيانات' };
    const w = WIN.find(x => x[0] === win) || WIN[0], g = F.ind('xau_usd'), rf = F.ref();
    if (!g || g.live !== 'current' || !rf || rf.live !== 'current') return { ok: false, why: 'السعر الحالي قديم أو غير متاح' };
    const now = Date.now(), tol = Math.max(2.2 * DAY, 0.35 * w[2] * DAY), t0 = now - w[2] * DAY;
    let o0, r0; // «يوم» = مقارنة بإغلاق آخر يوم سابق في السجل (بتوقيت بغداد)، والأسبوع والشهر = أقرب نقطة قبل المدة
    if (w[0] === 'd') { const today = bagDay(now), prev = Object.keys(days()).filter(k => k < today).sort().pop(), x = prev ? days()[prev] : null; if (x && x.xau_usd != null && dayRef(x) != null && now - tOf(prev) <= 4.5 * DAY) { o0 = [tOf(prev), x.xau_usd]; r0 = [tOf(prev), dayRef(x)]; } } // إغلاق قديم جداً (أكثر من 4 أيام) لا يُعد «يوماً»
    else { const gs = goldSeries(), ds = dollarSeries(); o0 = near(gs, t0, tol); r0 = near(ds, t0, tol); }
    if (!o0 || !r0) return { ok: false, why: 'لا تكفي البيانات بعد لمقارنة ' + w[1] + ' (السجل بدأ حديثاً ويتجمّع يومياً)', win: w };
    const lo = Math.log(g.value / o0[1]), lr = Math.log(rf.value / r0[1]), tot = (Math.exp(lo + lr) - 1) * 100;
    const m1 = toIqd(unitUsd(21 / 24 * MITHQAL, g.value), rf.value), m0 = toIqd(unitUsd(21 / 24 * MITHQAL, o0[1]), r0[1]);
    return { ok: true, win: w, total: r2(tot), fromOunce: r2(lo * 100), fromDollar: r2(lr * 100), m0, m1, o0: o0[1], o1: g.value, r0: r0[1], r1: rf.value, kind: 'calc' }; }
  const sgn = x => (x >= 0 ? '+' : '−') + Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '%';
  function sentence(d) { if (!d || !d.ok) return null; const t = Math.abs(d.total) < 0.05 ? 'ثابت تقريباً' : (d.total > 0 ? 'ارتفع ' : 'انخفض ') + Math.abs(d.total).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '%';
    const lead = Math.abs(d.fromOunce) >= Math.abs(d.fromDollar) ? 'الأونصة' : 'الدولار';
    return 'مثقال 21 ' + t + ' خلال ' + d.win[1] + ': ' + sgn(d.fromOunce) + ' من الأونصة و' + sgn(d.fromDollar) + ' من الدولار' + (Math.abs(d.total) >= 0.05 ? '، والمحرّك الأكبر ' + lead + '.' : '.'); }

  // ---- مقياس الفجوة عبر الأيام ----
  function gapSeries() { return Object.entries(days()).filter(([, x]) => dayRef(x) != null && x.usd_iqd_official).map(([d, x]) => [tOf(d), r2((dayRef(x) / 100 / x.usd_iqd_official - 1) * 100)]).sort((a, b) => a[0] - b[0]); }

  // ---- أثر السوق على أموالك اليوم (ذهبك وفضتك ودولارك وأسهمك الدولارية) مقارنة بإغلاق آخر يوم سابق في السجل ----
  function exposure(S) { if (typeof FL === 'undefined' || !S) return null; const o = { gPure: 0, sPure: 0, usdCents: 0 };
    FL.pieces(S).filter(p => p.held).forEach(p => { const pure = p.mg / 1000 * p.fine / 10000; if (p.metal === 'G') o.gPure += pure; else o.sPure += pure; });
    FL.usdInfo(S).forEach(u => { o.usdCents += Math.max(0, u.bal); });
    if (typeof FSK !== 'undefined') FSK.view(S).filter(x => x.cur === 'USD' && x.qty > 0 && !x.hidden).forEach(x => { o.usdCents += x.mktNative; });
    return o.gPure || o.sPure || o.usdCents ? o : null; }
  const valueOf = (e, gold, silver, ref) => ({ gold: toIqd(unitUsd(e.gPure, gold), ref), silver: toIqd(unitUsd(e.sPure, silver), ref), usd: Math.round(e.usdCents / 100 * ref / 100) });
  function impact(S) { const F = N(), e = exposure(S); if (!e) return { none: true }; if (!F || !F.get()) return { stale: true };
    const g = F.ind('xau_usd'), s = F.ind('xag_usd'), rf = F.ref(); if (!g || !s || !rf || g.live !== 'current' || s.live !== 'current' || rf.live !== 'current') return { stale: true };
    const today = bagDay(Date.now()), prev = Object.keys(days()).filter(d => d < today).sort().pop(), x = prev ? days()[prev] : null;
    if (!x || x.xau_usd == null || x.xag_usd == null || dayRef(x) == null || Date.now() - tOf(prev) > 4.5 * DAY) return { noBase: true };
    const v1 = valueOf(e, g.value, s.value, rf.value), v0 = valueOf(e, x.xau_usd, x.xag_usd, dayRef(x));
    const d = { gold: v1.gold - v0.gold, silver: v1.silver - v0.silver, usd: v1.usd - v0.usd }; d.total = d.gold + d.silver + d.usd;
    return { since: prev, now: v1, before: v0, d, kind: 'calc' }; }

  // ---- راتبك بالمثقال وبالدولار عبر الأشهر (من السجل اليومي وراتبك المسجّل) ----
  const m21Of = x => x.xau_usd != null && dayRef(x) != null ? toIqd(unitUsd(21 / 24 * MITHQAL, x.xau_usd), dayRef(x)) : null;
  function salaryAt(S, k) { if (typeof FE === 'undefined') return 0; return S.post.filter(p => p.a === 'inc_salary' && p.date.slice(0, 7) === k && (t => t && !t.voided && !t.reverses)(S.tx[p.tx - 1])).reduce((a, p) => a - p.iqd, 0); }
  function salaryPower(S) { const sal = typeof FM !== 'undefined' ? FM.salary(S) : null, by = {};
    Object.entries(days()).forEach(([d, x]) => { const m = m21Of(x), r = dayRef(x); if (m == null) return; const k = d.slice(0, 7); (by[k] = by[k] || { m: [], r: [] }).m.push(m); by[k].r.push(r); });
    const rows = Object.keys(by).sort().map(k => { const m = by[k].m.reduce((a, b) => a + b, 0) / by[k].m.length, r = by[k].r.reduce((a, b) => a + b, 0) / by[k].r.length, got = salaryAt(S, k), amt = got || (sal ? sal.amount : 0);
      return amt ? { k, salary: amt, est: !got, m21: Math.round(m), ref: Math.round(r), mithqal: r2(amt / m), usd: Math.round(amt / (r / 100)), n: by[k].m.length } : null; }).filter(Boolean);
    const last = rows[rows.length - 1] || null, first = rows[0] || null;
    return { rows, last, first, change: last && first && last !== first ? { mithqal: r1((last.mithqal / first.mithqal - 1) * 100), usd: r1((last.usd / first.usd - 1) * 100) } : null, hasSalary: !!sal }; }

  // ---- تنبيهات بحدود يختارها المستخدم (تُخزَّن في إعداداته وتظهر في شريط الرئيسية عند فتح التطبيق) ----
  const AK = { usd: ['الدولار (لكل 100$)', 'د.ع'], m21: ['مثقال ذهب 21', 'د.ع'], xau: ['أونصة الذهب', '$'] };
  const list = S => (S && S.x && S.x.set && Array.isArray(S.x.set.palerts) ? S.x.set.palerts : []);
  function current(k) { const F = N(); if (!F || !F.get()) return null;
    if (k === 'usd') { const r = F.ref(); return r ? { v: r.value, live: r.live } : null; }
    if (k === 'xau') { const g = F.ind('xau_usd'); return g && g.value != null ? { v: g.value, live: g.live } : null; }
    if (k === 'm21') { const u = unit('m21'); return u && u.iqd != null ? { v: u.iqd, live: u.live } : null; } return null; }
  const fmtA = (k, v) => k === 'xau' ? Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '$' : Math.round(v).toLocaleString('en-US');
  function alertsCheck(S) { return list(S).map(a => { const c = current(a.k); if (!c || c.live !== 'current') return null; const hit = a.op === '>' ? c.v >= a.v : c.v <= a.v; if (!hit) return null;
    return { a, v: c.v, t: '🔔 ' + AK[a.k][0] + (a.op === '>' ? ' تجاوز ' : ' نزل تحت ') + fmtA(a.k, a.v) + ' (الآن ' + fmtA(a.k, c.v) + ')' }; }).filter(Boolean); }
  function alertAdd(S, o) { if (!AK[o.k]) throw new Error('اختر المؤشر'); if (o.op !== '>' && o.op !== '<') throw new Error('اختر الاتجاه'); if (!(o.v > 0) || !Number.isFinite(o.v)) throw new Error('اكتب حداً صالحاً');
    if (list(S).length >= 12) throw new Error('12 تنبيهاً كحد أقصى'); S.x.set.palerts = list(S).concat([{ id: 'pa' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), k: o.k, op: o.op, v: o.k === 'xau' ? r2(o.v) : Math.round(o.v) }]); }
  function alertDel(S, id) { S.x.set.palerts = list(S).filter(a => a.id !== id); }

  // ---- الذاكرة: أحداث مؤرخة وما فعله الذهب بعدها (محسوب من مراجعك التاريخية وسجل الجالب) ----
  const EVENTS = [['2020-12-19', 'iq', 'البنك المركزي العراقي يخفض الدينار: السعر الرسمي من 1,182 إلى 1,450 للدولار'],
    ['2023-02-07', 'iq', 'رفع قيمة الدينار: السعر الرسمي إلى 1,300 للدولار'],
    ['2026-10-07', 'iq', 'خفض جديد للدينار: السعر الرسمي 1,500 للمصارف و1,510 و1,520 للبيع']];
  const nearest = (ser, t, tol) => { let b = null; for (const q of ser) if (Math.abs(q[0] - t) <= tol && (!b || Math.abs(q[0] - t) < Math.abs(b[0] - t))) b = q; return b; }; // أقرب نقطة قبل اللحظة أو بعدها
  function after(ser, t, d) { const a = nearest(ser, t, 20 * DAY), b = nearest(ser, t + d * DAY, Math.max(16 * DAY, 0.3 * d * DAY)); if (!a || !b || b[0] <= a[0] || t + d * DAY > Date.now()) return null; return r1((b[1] / a[1] - 1) * 100); }
  function memory() { const F = N(), gs = goldSeries(), out = EVENTS.map(([d, k, t]) => ({ d, k, t })), ft = F ? F.fredS('FEDTARU') : [];
    for (let i = 1; i < ft.length; i++) if (ft[i][1] !== ft[i - 1][1]) out.push({ d: ft[i][0], k: 'fed', t: 'الفدرالي ' + (ft[i][1] > ft[i - 1][1] ? 'يرفع' : 'يخفض') + ' الفائدة إلى ' + ft[i][1] + '% (الحد الأعلى)' });
    return out.map(e => ({ ...e, g30: after(gs, tOf(e.d), 30), g90: after(gs, tOf(e.d), 90) })).sort((a, b) => a.d < b.d ? 1 : -1).filter((e, i, A) => e.k !== 'fed' || A.filter(x => x.k === 'fed').indexOf(e) < 5); } // أحداث العراق كلها وآخر 5 قرارات فائدة

  return { OZ, MITHQAL, KIND, UNITS, units, unit, gap, dollarSeries, goldSeries, decompose, sentence, WIN, gapSeries, exposure, impact, salaryPower, AK, alertsCheck, alertAdd, alertDel, memory, near, bagDay, _days: days };
})();
if (typeof module !== 'undefined') module.exports = FP;
