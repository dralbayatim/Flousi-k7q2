'use strict';
// محرك الاكتشافات (f1-v4.12) — تجريبي، يعمل فقط إن فعّله المستخدم، وعلى سجل يومي لا يقل عن 90 يوماً. عرض فقط: لا يكتب في بياناتك المالية.
// سبع عائلات اختبار على السجل اليومي (data/history.json). ضوابط إحصائية:
//  • تصحيح Benjamini–Hochberg للاختبارات المتعددة (q = 0.10)
//  • حد أدنى لحجم الأثر، وحد أدنى 8 حالات لكل اكتشاف
//  • 3 بطاقات جديدة في الأسبوع كحد أقصى
//  • كل اكتشاف يُعاد اختباره بعد 30 و90 يوماً على بيانات ما بعده فقط (خارج العينة): «صمد» أو «لم يصمد»
// الاكتشاف وصف إحصائي لما حدث في الماضي، وليس توقعاً.
const FX = (() => {
  const MIN_DAYS = 90, Q = 0.10, MIN_N = 8, PER_WEEK = 3, DAY = 864e5;
  // ---- إحصاء: توزيع t (عبر بيتا الناقصة)، وثنائي الحد الدقيق ----
  function lgamma(x) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const k of c) s += k / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
  function betacf(a, b, x) { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d;
    for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break; } return h; }
  function ibeta(a, b, x) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
  const pT = (t, df) => df > 0 && Number.isFinite(t) ? ibeta(df / 2, 0.5, df / (df + t * t)) : 1; // ذو طرفين
  function pBinom(k, n) { // اختبار الإشارة ذو الطرفين، p = 0.5
    const lc = i => lgamma(n + 1) - lgamma(i + 1) - lgamma(n - i + 1) - n * Math.LN2, lo = Math.min(k, n - k); let s = 0; for (let i = 0; i <= lo; i++) s += Math.exp(lc(i)); return Math.min(1, 2 * s); }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  function corr(x, y) { const n = x.length; if (n < 4) return null; const mx = mean(x), my = mean(y); let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; a += dx * dy; b += dx * dx; c += dy * dy; }
    if (!b || !c) return null; const r = a / Math.sqrt(b * c), t = r * Math.sqrt((n - 2) / Math.max(1e-12, 1 - r * r)); return { r, n, p: pT(t, n - 2) }; }
  function tMean(a) { const n = a.length; if (n < 3) return null; const m = mean(a), sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1)); if (!sd) return null; return { m, n, p: pT(m / (sd / Math.sqrt(n)), n - 1) }; }
  function slope(x, y) { const n = x.length; if (n < 10) return null; const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } if (!sxx) return null;
    const b = sxy / sxx, a = my - b * mx, rss = x.reduce((s, xi, i) => s + (y[i] - a - b * xi) ** 2, 0), se = Math.sqrt(rss / (n - 2) / sxx); return { b, se, n, p1: pT((b - 1) / se, n - 2) }; } // p لاختبار «الميل ≠ 1»
  // Benjamini–Hochberg: يعيد المقبول عند q
  function bh(items, q = Q) { const s = items.filter(x => Number.isFinite(x.p)).sort((a, b) => a.p - b.p), m = s.length; let k = 0; s.forEach((x, i) => { if (x.p <= (i + 1) / m * q) k = i + 1; }); return new Set(s.slice(0, k)); }

  // ---- السلاسل اليومية من السجل ----
  const dayRef = x => x.usd_iqd_ref != null ? x.usd_iqd_ref : x.usd_iqd_parallel != null ? x.usd_iqd_parallel : null;
  function table(days, from = null, to = null) { return Object.keys(days || {}).sort().filter(d => (!from || d > from) && (!to || d <= to)).map(d => { const x = days[d] || {};
    return { d, xau: x.xau_usd, xag: x.xag_usd, ref: dayRef(x), off: x.usd_iqd_official, dxy: x.dxy, ry: x.real10y, gap: dayRef(x) != null && x.usd_iqd_official ? (dayRef(x) / 100 / x.usd_iqd_official - 1) * 100 : null }; }); }
  const lr = (a, b) => a > 0 && b > 0 ? Math.log(b / a) * 100 : null; // تغيّر لوغاريتمي بالنسبة المئوية
  // أزواج تغيّرات يومية متتالية (تتجاوز الأيام الناقصة: التغيّر من آخر قيمة متاحة)
  function changes(T, k, kind = 'log') { const out = []; let prev = null; T.forEach(r => { const v = r[k]; if (v == null) return; if (prev) out.push({ d: r.d, v: kind === 'log' ? lr(prev.v, v) : v - prev.v, i: T.indexOf(r) }); prev = { v }; }); return out; }
  const byDay = a => new Map(a.map(x => [x.d, x.v]));
  const m21 = r => r.xau != null && r.ref != null ? r.xau * r.ref : null;

  // ---- العائلات السبع: كل واحدة تعيد اكتشافات مرشّحة { id, fam, n, eff, p, dir, text } ----
  const FAM = {
    // 1) الذهب والدولار العالمي معاً
    link(T) { const g = byDay(changes(T, 'xau')), x = changes(T, 'dxy').filter(c => g.has(c.d)), c = corr(x.map(z => z.v), x.map(z => g.get(z.d))); if (!c) return [];
      return [{ id: 'link-dxy', fam: 'link', big: Math.abs(c.r) >= 0.3, n: c.n, eff: c.r, p: c.p, dir: Math.sign(c.r), text: `في الأيام الماضية تحرّك الذهب ${c.r < 0 ? 'عكس' : 'مع'} مؤشر الدولار بارتباط ${c.r.toFixed(2)} (${c.n} يوماً).` }]; },
    // 2) الدولار المحلي والذهب العالمي
    local(T) { const g = byDay(changes(T, 'xau')), x = changes(T, 'ref').filter(c => g.has(c.d) && c.v !== 0), c = corr(x.map(z => z.v), x.map(z => g.get(z.d))); if (!c) return [];
      return [{ id: 'local-gold', fam: 'local', big: Math.abs(c.r) >= 0.3, n: c.n, eff: c.r, p: c.p, dir: Math.sign(c.r), text: `حين يتحرك الدولار في بغداد يميل الذهب العالمي إلى التحرك ${c.r > 0 ? 'معه' : 'عكسه'} في اليوم نفسه (ارتباط ${c.r.toFixed(2)}، ${c.n} يوماً).` }]; },
    // 3) تأخّر: تغيّر اليوم في عامل وتغيّر المثقال غداً
    lead(T) { const mm = changes(T.map(r => ({ ...r, m: m21(r) })), 'm'), out = [];
      for (const [k, l, kind] of [['dxy', 'مؤشر الدولار', 'log'], ['ry', 'العائد الحقيقي', 'diff'], ['ref', 'الدولار في بغداد', 'log']]) { const x = byDay(changes(T, k, kind)), pr = [];
        for (let i = 1; i < mm.length; i++) if (x.has(mm[i - 1].d) && x.get(mm[i - 1].d) !== 0) pr.push([x.get(mm[i - 1].d), mm[i].v]);
        const c = corr(pr.map(p => p[0]), pr.map(p => p[1])); if (c) out.push({ id: 'lead-' + k, fam: 'lead', big: Math.abs(c.r) >= 0.2, n: c.n, eff: c.r, p: c.p, dir: Math.sign(c.r), text: `تغيّر ${l} في يوم ارتبط بتغيّر مثقال 21 في اليوم التالي ${c.r > 0 ? 'بالاتجاه نفسه' : 'بالاتجاه المعاكس'} (ارتباط ${c.r.toFixed(2)}، ${c.n} حالة).` }); }
      return out; },
    // 4) أيام الأسبوع: هل يتحرك الدولار في بغداد في يوم معيّن باتجاه ثابت؟
    weekday(T) { const ch = changes(T, 'ref').filter(c => c.v !== 0), names = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], out = [];
      for (let w = 0; w < 7; w++) { const a = ch.filter(c => new Date(c.d + 'T12:00:00Z').getUTCDay() === w).map(c => c.v), t = a.length >= MIN_N ? tMean(a) : null;
        if (t) out.push({ id: 'wd-' + w, fam: 'weekday', big: Math.abs(t.m) >= 0.1, n: t.n, eff: t.m, p: t.p, dir: Math.sign(t.m), text: `يوم ${names[w]} مال الدولار في بغداد إلى ${t.m > 0 ? 'الارتفاع' : 'الانخفاض'} بمتوسط ${Math.abs(t.m).toFixed(2)}% (${t.n} أسبوعاً).` }); }
      return out; },
    // 5) الفجوة: بعد اتساعها بنصف نقطة أو أكثر، هل تضيق خلال 7 أيام؟
    gap(T) { const ev = []; for (let i = 1; i < T.length; i++) { const a = T[i - 1].gap, b = T[i].gap; if (a == null || b == null || b - a < 0.5) continue; const j = T.findIndex((r, k) => k > i && Date.parse(r.d) - Date.parse(T[i].d) >= 7 * DAY && r.gap != null); if (j > 0) ev.push(T[j].gap - b); }
      const n = ev.filter(v => v !== 0).length, k = ev.filter(v => v < 0).length; if (n < MIN_N) return []; const share = k / n;
      return [{ id: 'gap-revert', fam: 'gap', big: Math.abs(share - 0.5) >= 0.2, n, eff: share - 0.5, p: pBinom(k, n), dir: Math.sign(0.5 - share), text: `بعد كل اتساع مفاجئ لفجوة الدولار ${share > 0.5 ? 'ضاقت' : 'استمرت في الاتساع'} خلال أسبوع في ${Math.round((share > 0.5 ? share : 1 - share) * 100)}% من الحالات (${n} حالة).` }]; },
    // 6) بعد يوم حاد للذهب (±2%): ماذا حدث في الأيام الخمسة التالية؟
    shock(T) { const g = changes(T, 'xau'), ev = []; g.forEach((c, i) => { if (Math.abs(c.v) < 2) return; const j = g.findIndex((x, k) => k > i && Date.parse(x.d) - Date.parse(c.d) >= 5 * DAY); if (j < 0) return; const after = g.slice(i + 1, j + 1).reduce((s, x) => s + x.v, 0); if (after) ev.push(Math.sign(after) === Math.sign(c.v)); });
      const n = ev.length, k = ev.filter(Boolean).length; if (n < MIN_N) return []; const share = k / n;
      return [{ id: 'gold-shock', fam: 'shock', big: Math.abs(share - 0.5) >= 0.2, n, eff: share - 0.5, p: pBinom(k, n), dir: Math.sign(share - 0.5), text: `بعد الأيام التي تحرّك فيها الذهب 2% أو أكثر ${share > 0.5 ? 'استمر في الاتجاه نفسه' : 'ارتدّ عكسه'} خلال 5 أيام في ${Math.round((share > 0.5 ? share : 1 - share) * 100)}% من الحالات (${n} حالة).` }]; },
    // 7) الفضة مقابل الذهب: كم ضعفاً تتحرك الفضة؟
    beta(T) { const g = byDay(changes(T, 'xau')), s = changes(T, 'xag').filter(c => g.has(c.d)), b = slope(s.map(c => g.get(c.d)), s.map(c => c.v)); if (!b) return [];
      return [{ id: 'silver-beta', fam: 'beta', big: Math.abs(b.b - 1) >= 0.25, n: b.n, eff: b.b - 1, p: b.p1, dir: Math.sign(b.b - 1), text: `الفضة تحركت قرابة ${b.b.toFixed(1)} ضعف حركة الذهب يومياً (${b.n} يوماً): ${b.b > 1 ? 'أكثر تقلباً منه، فربحها وخسارتها أكبر' : 'أهدأ منه'}.` }]; },
  };
  const FAMS = Object.keys(FAM), FAM_AR = { link: 'الذهب والدولار العالمي', local: 'الدولار في بغداد والذهب', lead: 'من يسبق من', weekday: 'أيام الأسبوع', gap: 'فجوة الدولار', shock: 'بعد الأيام الحادة', beta: 'الفضة مقابل الذهب' };
  // تشغيل كل العائلات ثم التصحيح الجماعي
  function scan(days, from = null, to = null) { const T = table(days, from, to), all = []; FAMS.forEach(f => { try { all.push(...FAM[f](T)); } catch (e) { /* عائلة فاشلة لا توقف غيرها */ } });
    const ok = bh(all); /* التصحيح على كل الاختبارات المُجراة، لا على ما تجاوز حد الأثر فقط، حتى لا ينحاز الاختيار */ return { days: T.length, tested: all.length, found: all.filter(x => ok.has(x) && x.big && x.n >= MIN_N).sort((a, b) => a.p - b.p) }; }
  // إعادة اختبار اكتشاف على بيانات ما بعد ظهوره فقط
  function recheck(days, item) { const T = table(days, item.first), f = FAM[item.fam]; if (!f) return { st: 'na' }; let c = null; try { c = f(T).find(x => x.id === item.id && x.big); } catch (e) {}
    if (!c) { const n = T.length; return n < 20 ? { st: 'wait', n } : { st: 'fail', n }; } return c.n < MIN_N ? { st: 'wait', n: c.n } : { st: c.dir === item.dir && c.p < Q ? 'held' : 'fail', n: c.n, eff: c.eff, p: c.p }; }
  // السجل (على هذا الجهاز): ما ظهر ومتى، وحد 3 في الأسبوع، ونتائج إعادة الاختبار
  const wk = d => { const t = new Date(d + 'T12:00:00Z'), day = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - day); return t.toISOString().slice(0, 10); };
  function update(log, days, today) { log = { items: {}, ...(log || {}) }; const r = scan(days), thisWk = wk(today); let fresh = Object.values(log.items).filter(x => wk(x.first) === thisWk).length;
    for (const x of r.found) { if (log.items[x.id] || fresh >= PER_WEEK) continue; log.items[x.id] = { id: x.id, fam: x.fam, first: today, n: x.n, eff: x.eff, p: x.p, dir: x.dir, text: x.text, ev: {} }; fresh++; }
    for (const it of Object.values(log.items)) for (const k of [30, 90]) { const due = (Date.parse(today) - Date.parse(it.first)) / DAY >= k; if (due && (!it.ev[k] || it.ev[k].st === 'wait')) it.ev[k] = { ...recheck(days, it), at: today }; }
    log.lastRun = today; log.lastScan = { days: r.days, tested: r.tested, found: r.found.length }; return log; }
  return { MIN_DAYS, Q, MIN_N, PER_WEEK, FAM_AR, scan, recheck, update, table, _stat: { pT, pBinom, corr, tMean, slope, bh } };
})();
if (typeof module !== 'undefined') module.exports = FX;
