'use strict';
// نبض السوق — طبقة البيانات (عرض فقط).
// يقرأ data/market.json من موقع التطبيق نفسه، فلا اتصال خارجي ولا تعديل على CSP.
// لا يكتب في IndexedDB، ولا يغيّر التخزين ولا حساب الثروة.
// القاعدة: الحالة تُعاد حسابها على الجهاز وقت العرض. فإن تأخّر الملف أو كان من نسخة محفوظة دون إنترنت،
// لا يظهر رقم قديم على أنه حالي.
const FN = (() => {
  const SRC = './data/market.json', TTL = 5 * 60e3, MAX_FILE_AGE = 6 * 3600e3;
  let M = null, err = null, at = 0, pending = null, fetchImpl = (typeof fetch !== 'undefined' ? (...a) => fetch(...a) : null), nowImpl = () => Date.now();
  const iso = t => { const x = Date.parse(t); return Number.isFinite(x) ? x : null; };
  function validate(j) {
    if (!j || j.schema !== 'nabd-market/1' || !Array.isArray(j.indicators) || !Array.isArray(j.derived) || !iso(j.generated_at)) throw new Error('ملف بيانات السوق غير صالح');
    return j;
  }
  async function load(force) {
    if (pending) return pending;
    if (!force && M && nowImpl() - at < TTL) return M;
    pending = (async () => {
      try { const r = await fetchImpl(force ? SRC + '?t=' + nowImpl() : SRC, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); M = validate(await r.json()); at = nowImpl(); err = null; }
      catch (e) { err = (e && e.message) || String(e); }
      finally { pending = null; }
      return M;
    })();
    return pending;
  }
  const raw = id => M && M.indicators.find(x => x.id === id);
  const t0 = x => iso(x.data_time) ?? iso(x.fetched_ok_at);
  // سوق المعادن مغلق في العطلة (من مساء الجمعة إلى مساء الأحد بتوقيت غرينتش): يُسمح بعمر أطول
  const closed = d => { const w = d.getUTCDay(), h = d.getUTCHours(); return w === 6 || (w === 0 && h < 22) || (w === 5 && h >= 22); };
  function live(x) { // الحالة الفعلية الآن على الجهاز
    if (!x || x.value == null) return 'unavailable';
    if (x.status === 'review') return 'review';
    if (x.status !== 'current' || x.update === 'failed' || x.update === 'rejected') return 'stale';
    const t = t0(x), now = nowImpl(); if (t == null) return 'stale';
    let maxMin = x.max_age_min || 0; if (/^x(au|ag)_usd$/.test(x.id) && closed(new Date(now))) maxMin = Math.max(maxMin, 3 * 1440);
    if ((now - t) / 60000 > maxMin) return 'stale';
    if (x.id === 'xau_usd' || x.id === 'xag_usd') { if (now - iso(M.generated_at) > MAX_FILE_AGE) return 'stale'; }
    return 'current';
  }
  const ind = id => { const x = raw(id); return x ? { ...x, live: live(x) } : null; };
  function der(id) {
    const d = M && M.derived.find(x => x.id === id); if (!d) return null;
    const ins = Object.keys(d.inputs || {}).map(ind);
    const st = d.value == null || ins.some(x => !x || x.live === 'unavailable') ? 'unavailable' : ins.every(x => x.live === 'current') ? 'current' : 'stale';
    return { ...d, live: st, inputsLive: ins };
  }
  const fileAgeMin = () => M ? Math.round((nowImpl() - iso(M.generated_at)) / 60000) : null;
  // سعر التحويل المرجعي (قرار المستخدم، f1-v4.11): متوسط سعري البيع والشراء في صيرفات بغداد من النشرة نفسها، وإلا سعر البورصة.
  // value = دينار لكل 100 دولار. kind: calc (متوسط محسوب) أو obs (مرصود كما نُشر). البيع والشراء يبقيان منفصلين للعرض والأرشيف
  function ref() {
    const p = ind('usd_iqd_parallel'), sh = ind('usd_iqd_shops_baghdad');
    const okSh = sh && sh.value && sh.value.buy > 0 && sh.value.sell >= sh.value.buy && sh.live !== 'unavailable' && (!p || !p.data_time || sh.data_time === p.data_time || sh.live === 'current');
    if (okSh) { const mid = Math.round((sh.value.buy + sh.value.sell) / 2), live = p && p.live === 'current' && sh.live !== 'current' ? 'stale' : sh.live;
      return { value: mid, buy: sh.value.buy, sell: sh.value.sell, live, data_time: sh.data_time, fetched_ok_at: sh.fetched_ok_at, kind: 'calc', basis: 'mid' }; }
    if (p && p.value != null) return { value: p.value, buy: null, sell: null, live: p.live, data_time: p.data_time, fetched_ok_at: p.fetched_ok_at, kind: 'obs', basis: 'bourse' };
    return null;
  }

  // ---- ملفات مساعدة للتحليل والأخبار: السلاسل، والسجل اليومي، ومراجع المستخدم التاريخية ----
  const AUX = { series: null, history: null, ref: null, err: null, at: 0 }; let auxPending = null;
  async function loadAux(force) {
    if (auxPending) return auxPending; if (!force && AUX.at && nowImpl() - AUX.at < TTL) return AUX;
    auxPending = (async () => { const get = async (u, schema) => { try { const r = await fetchImpl(force ? u + '?t=' + nowImpl() : u, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); if (!j || j.schema !== schema) throw new Error('صيغة'); return j; } catch (e) { AUX.err = u + ': ' + e.message; return null; } };
      const [sr, hi, rf] = await Promise.all([get('./data/series.json', 'nabd-series/1'), get('./data/history.json', 'nabd-history/1'), AUX.ref ? AUX.ref : get('./data/ref-metals.json', 'nabd-ref/1')]);
      if (sr) AUX.series = sr; if (hi) AUX.history = hi; if (rf) AUX.ref = rf; AUX.at = nowImpl(); auxPending = null; return AUX; })();
    return auxPending;
  }
  const DAY = 864e5, tOf = d => iso(d.length === 10 ? d + 'T12:00:00Z' : d);
  // سلسلة سعر معدن موحّدة [وقت، قيمة]: مراجعك التاريخية + سجل الجالب اليومي + لقطات اليوم + السعر الحالي إن كان «حالياً»
  function metalSeries(metal) {
    const id = metal === 'gold' ? 'xau_usd' : 'xag_usd', out = new Map();
    ((AUX.ref || {})[metal] || []).forEach(([d, v]) => out.set(tOf(d), v));
    const today = new Date(nowImpl() + 3 * 3600e3).toISOString().slice(0, 10); // لقطة اليوم الجاري لا تُضاف: اللقطات الآنية والسعر الحالي يغطيانه
    Object.entries((AUX.history || {}).days || {}).forEach(([d, x]) => { if (d < today && x[id] != null) out.set(Date.parse(d + 'T20:00:00Z'), x[id]); });
    (((AUX.history || {}).intraday || {})[id] || []).forEach(([t, v]) => out.set(iso(t), v));
    const cur = ind(id); if (cur && cur.live === 'current') out.set(iso(cur.data_time) || nowImpl(), cur.value);
    return [...out.entries()].filter(([t, v]) => t != null && Number.isFinite(v)).sort((a, b) => a[0] - b[0]);
  }
  const fredS = id => (((AUX.series || {}).fred || {})[id] || {}).obs || [];
  const seriesFresh = () => !!AUX.series && nowImpl() - iso(AUX.series.generated_at) < 4 * DAY;
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const valueAt = (ser, t) => { let v = null; for (const [x, y] of ser) { if (x <= t) v = y; else break; } return v; };
  // التغيّر خلال فترة: يُشترط وجود نقطة قريبة فعلاً من بداية الفترة، وإلا فلا رقم (لا نقارن يوماً بأسبوع)
const pctChange = (ser, days) => { if (ser.length < 2) return null; const last = ser[ser.length - 1], target = last[0] - days * DAY, tol = Math.max(1.2 * DAY, 0.35 * days * DAY);
    let prev = null; for (const p of ser) { if (p[0] <= target) prev = p; else break; } return prev && target - prev[0] <= tol && prev[1] ? (last[1] / prev[1] - 1) * 100 : null; };
  const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;

  // ---- محرّك تحليل الذهب (أفق 3–5 سنوات) — القواعد المعتمدة في المواصفة. لا حكم على بيانات قديمة ----
  function analyze() {
    const F = [], add = (id, label, w, sig, value, reason) => F.push({ id, label, w, sig, value, reason });
    const gs = metalSeries('gold'), gNow = ind('xau_usd');
    // 1) الاتجاه: السعر مقابل متوسط ~200 يوم تداول (≈ 290 يوماً تقويمياً)
    if (gNow && gNow.live === 'current' && gs.length > 8) {
      const win = gs.filter(([t]) => t >= gs[gs.length - 1][0] - 290 * DAY).map(p => p[1]), ma = avg(win), dev = (gNow.value / ma - 1) * 100, m30 = pctChange(gs, 30);
      const sig = m30 != null && m30 > 15 ? -1 : dev > 15 ? -1 : dev < -20 ? 0 : dev <= -5 ? 1 : 0;
      add('trend', 'الاتجاه: السعر مقابل متوسط 200 يوم', 20, sig, r1(dev) + '%', sig > 0 ? `السعر تحت متوسطه الطويل بـ ${r1(-dev)}%: منطقة قيمة للتجميع التدريجي` : sig < 0 ? (m30 > 15 ? `صعود عمودي ${r1(m30)}% في شهر: الشراء بعد القفزات خطِر` : `السعر فوق متوسطه بـ ${r1(dev)}%: مرتفع نسبياً`) : dev < -20 ? `هبوط حاد ${r1(-dev)}% تحت المتوسط: انتظر استقراراً قبل التجميع` : `قريب من متوسطه (${r1(dev)}%)`);
    } else add('trend', 'الاتجاه: السعر مقابل متوسط 200 يوم', 20, null, null, 'سعر الذهب الحالي غير متاح أو قديم');
    // 2) العائد الحقيقي 10 سنوات
    const ry = fredS('DFII10');
    if (seriesFresh() && ry.length > 40) { const v = ry[ry.length - 1][1], ch = v - ry[Math.max(0, ry.length - 43)][1];
      const sig = v < 1.5 || ch < -0.25 ? 1 : v > 2.5 && ch >= 0 ? -1 : 0;
      add('real', 'العائد الحقيقي 10 سنوات', 20, sig, v + '%', sig > 0 ? `العائد الحقيقي ${v}% ${ch < -0.25 ? 'وينخفض' : 'منخفض'}: داعم للذهب` : sig < 0 ? `العائد الحقيقي ${v}% مرتفع ويرتفع (${ch >= 0 ? '+' : ''}${r2(ch)} في شهرين): ضاغط على الذهب` : `العائد الحقيقي ${v}%: محايد`);
    } else add('real', 'العائد الحقيقي 10 سنوات', 20, null, null, 'بيانات العوائد غير متاحة أو قديمة');
    // 3) قوة الدولار (المؤشر الموسّع للفدرالي: يومي ومتاح بتاريخ طويل)
    const dx = fredS('DTWEXBGS');
    if (seriesFresh() && dx.length > 60) { const v = dx[dx.length - 1][1], ma50 = avg(dx.slice(-50).map(p => p[1])), hi = Math.max(...dx.slice(-252).map(p => p[1]));
      const sig = v >= hi * 0.985 ? -1 : v < ma50 ? 1 : 0;
      add('usd', 'قوة الدولار', 15, sig, r2(v), sig < 0 ? 'الدولار قرب أعلى مستوى في سنة: ضاغط على الذهب' : sig > 0 ? 'الدولار تحت متوسط 50 يوماً: يضعف، داعم للذهب' : 'الدولار مستقر');
    } else add('usd', 'قوة الدولار', 15, null, null, 'بيانات الدولار غير متاحة أو قديمة');
    // 4) سياسة الفائدة الأمريكية: آخر تغيير في الحد الأعلى للنطاق
    const ft = fredS('FEDTARU');
    if (seriesFresh() && ft.length > 1) { let last = null; for (let i = 1; i < ft.length; i++) if (ft[i][1] !== ft[i - 1][1]) last = { d: ft[i][0], dir: Math.sign(ft[i][1] - ft[i - 1][1]), v: ft[i][1] };
      const age = last ? (nowImpl() - tOf(last.d)) / DAY : Infinity, sig = !last ? 0 : last.dir < 0 && age < 365 ? 1 : last.dir > 0 && age < 180 ? -1 : last.dir > 0 ? 1 : 0;
      add('fed', 'سياسة الفائدة الأمريكية', 10, sig, ft[ft.length - 1][1] + '%', !last ? 'لا تغيير في الفائدة خلال الفترة' : last.dir < 0 ? `آخر قرار خفض (${last.d}): داعم` : age < 180 ? `آخر قرار رفع (${last.d}): ضاغط` : `تثبيت منذ آخر رفع (${last.d}): يميل إلى الدعم`);
    } else add('fed', 'سياسة الفائدة الأمريكية', 10, null, null, 'بيانات الفائدة غير متاحة أو قديمة');
    // 5) مراكز المضاربين COT: موقع صافي المراكز من مداها في 3 سنوات
    const cot = ((AUX.series || {}).cot || {}).gold || [];
    if (seriesFresh() && cot.length > 50) { const v = cot[cot.length - 1][1], sorted = cot.map(p => p[1]).sort((a, b) => a - b), pr = sorted.filter(x => x <= v).length / sorted.length * 100;
      const sig = pr < 25 ? 1 : pr > 80 ? -1 : 0;
      add('cot', 'مراكز المضاربين (COT)', 10, sig, Math.round(pr) + '٪ من مدى 3 سنوات', sig > 0 ? 'المضاربون في أدنى مراكزهم تاريخياً: علامة استسلام' : sig < 0 ? 'المضاربون مزدحمون في الشراء: خطر تصحيح' : 'مراكز المضاربين في المنتصف');
    } else add('cot', 'مراكز المضاربين (COT)', 10, null, null, 'بيانات COT غير متاحة أو قديمة');
    // 6) السوق العراقي: استقرار الدولار المحلي وفرق الذهب المحلي عن المحسوب
    const par = ind('usd_iqd_parallel'), lc = null; // لا أسعار صاغة محلية (قرار f1-v4.11)
    if (par && par.live === 'current') { const ps = (((AUX.history || {}).intraday || {}).usd_iqd_parallel || []).map(([t, v]) => [iso(t), v]), wk = pctChange(ps, 7) ?? pctChange(Object.entries((AUX.history || {}).days || {}).filter(([, x]) => x.usd_iqd_parallel).map(([d, x]) => [tOf(d), x.usd_iqd_parallel]), 7);
      const prem = lc && lc.live === 'current' && lc.value ? lc.value.diff_pct : null;
      const sig = (wk != null && wk > 3) || (prem != null && prem > 6) ? -1 : (wk == null || Math.abs(wk) < 1) && (prem == null || prem <= 3) ? 1 : 0;
      add('iraq', 'السوق العراقي (الدولار المحلي)', 10, sig, [wk != null ? 'الدولار المحلي أسبوعياً ' + (wk >= 0 ? '+' : '') + r1(wk) + '%' : null, prem != null ? 'فرق الذهب المحلي ' + prem + '%' : null].filter(Boolean).join(' · ') || '—', sig < 0 ? 'ضغط محلي: قفزة في الدولار المحلي' : sig > 0 ? 'الدولار المحلي مستقر' : 'السوق المحلي متحرك قليلاً');
    } else add('iraq', 'السوق العراقي', 10, null, null, 'سعر الدولار المحلي غير متاح أو قديم');
    // 7) التضخم الأمريكي
    const cpi = fredS('CPI_YOY');
    if (seriesFresh() && cpi.length > 4) { const v = cpi[cpi.length - 1][1], up = v - cpi[cpi.length - 4][1], ryv = ry.length ? ry[ry.length - 1][1] : null, fedSig = (F.find(f => f.id === 'fed') || {}).sig;
      const sig = up > 0.2 && fedSig !== -1 ? 1 : up < -0.2 && ryv != null && ryv > 2.5 ? -1 : 0;
      add('cpi', 'التضخم الأمريكي', 5, sig, v + '%', sig > 0 ? `التضخم يرتفع (${v}%) والفائدة لا ترتفع: داعم` : sig < 0 ? 'التضخم ينخفض مع فائدة حقيقية مرتفعة: ضاغط' : `التضخم ${v}%: محايد`);
    } else add('cpi', 'التضخم الأمريكي', 5, null, null, 'بيانات التضخم غير متاحة أو قديمة');
    const av = F.filter(f => f.sig != null), W = av.reduce((a, f) => a + f.w, 0), score = W ? av.reduce((a, f) => a + f.w * f.sig, 0) / W : null;
    let verdict = null, conf = null;
    if (score != null && av.length >= 4) {
      verdict = score >= 0.25 ? 'شراء تدريجي' : score <= -0.25 ? 'انتظار' : 'شراء منتظم محايد';
      const agree = av.filter(f => Math.sign(f.sig) === Math.sign(score) && f.sig !== 0).length;
      conf = Math.abs(score) >= 0.45 && agree >= 4 ? 'عالية' : Math.abs(score) >= 0.2 || av.length >= 6 ? 'متوسطة' : 'منخفضة';
      if (av.length < F.length && conf === 'عالية') conf = 'متوسطة';
    }
    // نسبة الذهب/الفضة: للتوزيع بين المعدنين، لا تدخل في حكم الذهب
    const g = der('gsr'); let gsr = null;
    if (g && g.live === 'current' && g.value) gsr = { v: g.value, tip: g.value > 85 ? 'الفضة رخيصة نسبياً تاريخياً: للإضافات الجديدة ميل نحو الفضة (سبائك 999)' : g.value < 55 ? 'الفضة غالية نسبياً: الذهب أفضل للإضافات الجديدة' : 'توزيع متوازن بين المعدنين' };
    return { factors: F, score: score == null ? null : r2(score), verdict, conf, used: av.length, total: F.length, gsr };
  }

  // ---- الأخبار: تُكتب آلياً من الأرقام (لا نسخ لنصوص وكالات) ----
  function news() {
    const out = [], push = (t, when, src, lv) => out.push({ t, when, src, lv: lv || 'info' }), fx = (x, d = 2) => Number(x).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
    const gs = metalSeries('gold'), ss = metalSeries('silver'), g = ind('xau_usd'), s = ind('xag_usd');
    if (g && g.live === 'current') { const d1 = pctChange(gs, 1), lo = Math.min(...gs.filter(([t]) => t >= gs[gs.length - 1][0] - 395 * DAY).map(p => p[1])), hi = Math.max(...gs.filter(([t]) => t >= gs[gs.length - 1][0] - 365 * DAY).map(p => p[1]));
      if (d1 != null && Math.abs(d1) >= 1) push(`${d1 > 0 ? '🔺 الذهب يرتفع' : '🔻 الذهب يهبط'} ${r1(Math.abs(d1))}% خلال يوم إلى ${fx(g.value)}$`, g.data_time, 'Gold-API', Math.abs(d1) >= 2 ? 'warn' : 'info');
      if (g.value <= lo * 1.003) push(`الذهب عند أدنى مستوى في 13 شهراً (${fx(g.value)}$)`, g.data_time, 'Gold-API', 'warn');
      else if (g.value >= hi * 0.997) push(`الذهب عند أعلى مستوى في سنة (${fx(g.value)}$)`, g.data_time, 'Gold-API', 'warn'); }
    if (s && s.live === 'current') { const d1 = pctChange(ss, 1); if (d1 != null && Math.abs(d1) >= 1.5) push(`${d1 > 0 ? '🔺 الفضة ترتفع' : '🔻 الفضة تهبط'} ${r1(Math.abs(d1))}% إلى ${fx(s.value)}$`, s.data_time, 'Gold-API'); }
    const p = ind('usd_iqd_parallel'); if (p && p.value) { const ps = (((AUX.history || {}).intraday || {}).usd_iqd_parallel || []).map(([t, v]) => [iso(t), v]), d = ps.length > 1 ? ps[ps.length - 1][1] - ps[ps.length - 2][1] : null;
      push(`💵 الدولار المحلي ${p.value.toLocaleString('en-US')} لكل 100$` + (d ? ` (${d > 0 ? '+' : ''}${d.toLocaleString('en-US')} عن القراءة السابقة)` : ''), p.data_time, 'مسح السوق المحلي', p.live === 'current' ? 'info' : 'old'); }
    // لا خبر لأسعار الصاغة المحلية (قرار f1-v4.11)
    const of = ind('usd_iqd_official'); if (of && of.value) push(`🏦 الدولار الرسمي ${of.value.toLocaleString('en-US')} دينار`, of.fetched_ok_at, 'البنك المركزي العراقي', 'info');
    const ft = fredS('FEDTARU'); for (let i = Math.max(1, ft.length - 3); i < ft.length; i++) if (ft[i][1] !== ft[i - 1][1] && nowImpl() - tOf(ft[i][0]) < 21 * DAY) push(`🇺🇸 الفدرالي ${ft[i][1] > ft[i - 1][1] ? 'يرفع' : 'يخفض'} الفائدة إلى ${ft[i][1]}% (الحد الأعلى)`, ft[i][0], 'FRED', 'warn');
    const cpi = fredS('CPI_YOY'); if (cpi.length > 1) push(`📊 التضخم الأمريكي ${cpi[cpi.length - 1][1]}% (${cpi[cpi.length - 1][0].slice(0, 7)}) — السابق ${cpi[cpi.length - 2][1]}%`, cpi[cpi.length - 1][0], 'FRED');
    const un = fredS('UNRATE'); if (un.length > 1) push(`👷 البطالة الأمريكية ${un[un.length - 1][1]}% (${un[un.length - 1][0].slice(0, 7)})`, un[un.length - 1][0], 'FRED');
    const dxy = ind('dxy'); if (dxy && dxy.value) push(`📈 مؤشر الدولار DXY ${fx(dxy.value)}`, dxy.data_time, 'البنك المركزي الأوروبي (محسوب)', dxy.live === 'current' ? 'info' : 'old');
    const c = ((AUX.series || {}).cot || {}).gold || []; if (c.length > 1) { const a = c[c.length - 1], b = c[c.length - 2]; push(`📋 تقرير COT: صافي مضاربي الذهب ${a[1].toLocaleString('en-US')} عقداً (${a[1] - b[1] >= 0 ? '+' : ''}${(a[1] - b[1]).toLocaleString('en-US')} أسبوعياً)`, a[0], 'CFTC'); }
    out.sort((a, b) => (tOf(b.when || '1970-01-01') || 0) - (tOf(a.when || '1970-01-01') || 0));
    // ملخص الأسبوع
    const wk = [], gw = pctChange(gs, 7), sw = pctChange(ss, 7);
    if (g && g.live === 'current' && gw != null) wk.push(`الذهب ${gw >= 0 ? 'ارتفع' : 'هبط'} ${r1(Math.abs(gw))}% خلال أسبوع إلى ${fx(g.value)}$`);
    if (s && s.live === 'current' && sw != null) wk.push(`والفضة ${sw >= 0 ? 'ارتفعت' : 'هبطت'} ${r1(Math.abs(sw))}%`);
    const gsr = der('gsr'); if (gsr && gsr.value) wk.push(`ونسبة الذهب/الفضة ${gsr.value}`);
    const ry = fredS('DFII10'); if (ry.length) wk.push(`العائد الحقيقي ${ry[ry.length - 1][1]}%`);
    if (p && p.value) wk.push(`الدولار المحلي ${p.value.toLocaleString('en-US')} لكل 100$`);
    const rel = (AUX.series || {}).releases || {}, upcoming = [];
    if ((rel.cpi || [])[0]) upcoming.push(['صدور التضخم الأمريكي (CPI)', rel.cpi[0]]); if ((rel.jobs || [])[0]) upcoming.push(['تقرير الوظائف والبطالة الأمريكي', rel.jobs[0]]);
    return { items: out, week: wk.length ? wk.join('، ') + '.' : null, upcoming };
  }
  // للاختبار في Node فقط
  const _test = { setFetch: f => { fetchImpl = f; }, setNow: f => { nowImpl = f; }, reset: () => { M = null; err = null; at = 0; pending = null; } };
  return { load, get: () => M, err: () => err, ind, der, ref, fileAgeMin, loadAux, aux: () => AUX, metalSeries, fredS, analyze, news, pctChange, _test: { ..._test, setAux: o => Object.assign(AUX, o, { at: nowImpl() }) } };
})();
if (typeof module !== 'undefined') module.exports = FN;
