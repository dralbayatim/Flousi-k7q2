'use strict';
// فلوسي — أدوات القرار (f1-v4.7، البنود 31–36). حساب وعرض فقط: لا يكتب شيئاً في البيانات، ولا يغيّر أي معادلة محاسبية.
const FD = (() => {
  const L = FL, E = FE, DAY = 864e5;
  const r1 = x => Math.round(x * 10) / 10;
  const dEnd = d => L.monthEnd(L.mkey(d)), daysLeft = d => Math.round((Date.parse(dEnd(d)) - Date.parse(d)) / DAY) + 1, dayNo = d => +d.slice(8, 10);
  const live = S => S.tx.filter(t => !t.voided && !t.reverses);
  // فهرس القيود حسب العملية (أداء فقط): يُبنى مرة لكل حالة بيانات، فالقيود لا تُعدَّل بعد كتابتها بل تُضاف
  const PIX = new WeakMap(), pt = (S, id) => { let c = PIX.get(S); if (!c || c.n !== S.post.length || c.arr !== S.post) { const m = new Map(); S.post.forEach(p => { const a = m.get(p.tx); a ? a.push(p) : m.set(p.tx, [p]); }); c = { n: S.post.length, arr: S.post, m }; PIX.set(S, c); } return c.m.get(id) || []; };
  // مصروفات فترة [من، إلى] من القيود نفسها: { مجموع، حسب الفئة }
  function spend(S, from, to) { const o = { total: 0, cat: {} }; live(S).filter(t => t.type === 'expense' && t.date >= from && t.date <= to).forEach(t => pt(S, t.id).filter(p => S.acc[p.a].kind === 'expense').forEach(p => { o.total += p.iqd; o.cat[p.a] = (o.cat[p.a] || 0) + p.iqd; })); return o; }
  // ما ادخرته من الدخل عبر «ادفع لنفسك أولاً» (تحويلات وتخصيصات موسومة pyf)
  const pyfSaved = (S, to) => live(S).filter(t => t.meta && t.meta.pyf && t.date <= to).reduce((s, t) => s + pt(S, t.id).filter(p => p.iqd > 0).reduce((a, p) => a + p.iqd, 0), 0)
    + S.goals.filter(g => g.pyf && (!g.date || g.date <= to)).reduce((s, g) => s + g.amount, 0);
  // ---- الالتزامات القادمة حتى آخر الشهر (البند 31 كما عُدّل): المتكررة غير المسجّلة، أقساط الجمعيات، الديون التي عليك، وأقساط الأهداف بخيار ----
  function commitments(S, today = L.today(), withGoals = !!(S.x.set && S.x.set.decGoals)) { const m = L.mkey(today), end = dEnd(today), out = [];
    (S.x.recur || []).filter(r => r.active && r.kind === 'expense' && r.last !== m).forEach(r => out.push({ k: 'recur', t: r.name, d: m + '-' + String(r.day).padStart(2, '0'), amt: r.amount }));
    (S.x.jams || []).map(j => L.jamState(S, j)).filter(j => !j.done && j.paid < j.N && j.next <= end).forEach(j => out.push({ k: 'jam', t: 'قسط جمعية «' + j.name + '»', d: j.next, amt: j.s }));
    L.debts(S, today).filter(d => d.dir === 'borrowed' && !d.settled && d.due && d.due <= end).forEach(d => out.push({ k: 'debt', t: 'دين لـ ' + d.person, d: d.due, amt: d.remaining }));
    if (withGoals) L.goalView(S, today).filter(g => !g.done && g.behind > 0).forEach(g => out.push({ k: 'goal', t: 'قسط هدف «' + g.name + '»', d: end, amt: g.cur === 'USD' ? E.usdToIqd(g.behind, S.rate) : g.behind }));
    return out.sort((a, b) => a.d < b.d ? -1 : 1); }
  // ---- المصروف الآمن اليوم (31) ----
  // المتبقي = ما بقي من دخلك منذ البدء (الدخل − المصروف − ما ادخرته بـ«ادفع لنفسك أولاً»)، ولا يزيد على «المتاح للصرف». يُحسب كما كان صباح اليوم، ثم يُطرح مصروف اليوم
  function safe(S, today = L.today()) { if (!S.x.openDate) return null; const s = E.snap(S), od = S.x.openDate;
    const inc = live(S).filter(t => t.type === 'income' && t.date <= today).reduce((a, t) => a + pt(S, t.id).filter(p => S.acc[p.a].kind === 'income').reduce((x, p) => x - p.iqd, 0), 0);
    const exp = spend(S, od, today).total, saved = pyfSaved(S, today), spentToday = spend(S, today, today).total, pool = inc - exp - saved, base = Math.min(pool, s.avail);
    const C = commitments(S, today), ct = C.reduce((a, c) => a + c.amt, 0), days = daysLeft(today), base0 = base + spentToday;
    const per = Math.max(0, Math.floor((base0 - ct) / days));
    return { inc, exp, saved, pool, avail: s.avail, base, base0, commit: C, commitTotal: ct, days, safe: per, spentToday, leftToday: per - spentToday, short: base0 - ct < 0 ? ct - base0 : 0, noIncome: inc <= 0 }; }
  // ---- المتوقع آخر الشهر (35): الدخل المسجّل + الدخل المتكرر المنتظر، والمصروف المسجّل + المتغيّر بوتيرة هذا الشهر + الالتزامات القادمة ----
  function forecast(S, today = L.today()) { if (!S.x.openDate) return null; const m = L.mkey(today), start = m + '-01' < S.x.openDate ? S.x.openDate : m + '-01', r = L.monthReport(S, m);
    const pendInc = (S.x.recur || []).filter(x => x.active && x.kind === 'income' && x.last !== m).reduce((a, x) => a + x.amount, 0);
    const recNames = new Set((S.x.recur || []).filter(x => x.kind === 'expense').map(x => x.name)), sofar = spend(S, start, today).total;
    const fixedDone = live(S).filter(t => t.type === 'expense' && t.date >= start && t.date <= today && recNames.has(t.note)).reduce((a, t) => a + pt(S, t.id).filter(p => S.acc[p.a].kind === 'expense').reduce((x, p) => x + p.iqd, 0), 0);
    const elapsed = Math.round((Date.parse(today) - Date.parse(start)) / DAY) + 1, rest = daysLeft(today) - 1, pace = Math.max(0, sofar - fixedDone) / elapsed;
    const commit = commitments(S, today).reduce((a, c) => a + c.amt, 0), income = r.income + pendInc, expense = Math.round(sofar + pace * rest + commit);
    return { income, incSoFar: r.income, pendInc, expense, sofar, pace: Math.round(pace), rest, commit, savings: income - expense, rate: income > 0 ? r1((income - expense) / income * 100) : null, early: elapsed < 7 }; }
  // ---- ملخص الشهر وقرار مقترح (33): مقارنة بالفترة نفسها من الشهر الماضي ----
  function monthSummary(S, today = L.today()) { if (!S.x.openDate) return null; const m = L.mkey(today), pm = L.prevMonth(m), dn = dayNo(today), od = S.x.openDate;
    const a = spend(S, m + '-01', today), pe = L.monthEnd(pm), pTo = pm + '-' + String(Math.min(dn, dayNo(pe))).padStart(2, '0'), b = pTo >= od ? spend(S, pm + '-01' < od ? od : pm + '-01', pTo) : null; // الفترة نفسها من الشهر الماضي
    const f = forecast(S, today), name = id => (S.acc[id] || {}).name || id;
    const diffs = b ? Object.keys({ ...a.cat, ...b.cat }).map(k => ({ id: k, n: name(k), now: a.cat[k] || 0, prev: b.cat[k] || 0 })).map(x => ({ ...x, d: x.now - x.prev, p: x.prev > 0 ? Math.round((x.now - x.prev) / x.prev * 100) : null })).sort((x, y) => y.d - x.d) : [];
    const up = diffs.find(x => x.d >= 50000 && (x.p == null || x.p >= 30)), rest = daysLeft(today) - 1;
    let dec;
    if (f && f.savings < 0) { const top = diffs[0] || Object.entries(a.cat).sort((x, y) => y[1] - x[1]).map(([k, v]) => ({ n: name(k), now: v }))[0];
      dec = { lv: 'red', t: 'المتوقع أن يزيد مصروفك على دخلك هذا الشهر بـ ' + L.fmt(-f.savings) + ' د.ع.', a: top && rest > 0 ? 'خفّف «' + top.n + '» بنحو ' + L.fmt(Math.ceil(-f.savings / rest / 1000) * 1000) + ' د.ع يومياً حتى آخر الشهر.' : 'أجّل أي مصروف غير ضروري حتى الشهر القادم.' }; }
    else if (up) { const full = spend(S, pm + '-01' < od ? od : pm + '-01', pe).cat[up.id] || 0, room = full - up.now, cap = rest > 0 ? Math.floor(room / rest / 1000) * 1000 : 0; // مستوى الشهر الماضي كاملاً
      dec = { lv: 'warn', t: '«' + up.n + '» أعلى من الفترة نفسها في الشهر الماضي بـ ' + L.fmt(up.d) + ' د.ع' + (up.p != null ? ' (' + up.p + '%)' : '') + '.',
        a: rest <= 0 ? 'راجعه في بداية الشهر القادم.' : room <= 0 ? 'تجاوزت ما صرفته على «' + up.n + '» في الشهر الماضي كله (' + L.fmt(full) + ' د.ع). قلّل منه ما بقي من الشهر.' : cap > 0 ? 'لتبقى بمستوى الشهر الماضي كله (' + L.fmt(full) + ' د.ع): لا تتجاوز ' + L.fmt(cap) + ' د.ع يومياً على «' + up.n + '».' : 'بقي لك ' + L.fmt(room) + ' د.ع فقط على «' + up.n + '» لتبقى بمستوى الشهر الماضي.' }; }
    else if (f && f.rate != null && f.rate < 10) dec = { lv: 'warn', t: 'نسبة ادخارك المتوقعة هذا الشهر ' + f.rate + '%.', a: 'لتصل إلى 10% انقل ' + L.fmt(Math.max(0, Math.ceil((f.income * 0.1 - f.savings) / 1000) * 1000)) + ' د.ع إلى مدخراتك عند استلام الراتب.' };
    else if (f && f.income > 0) dec = { lv: 'ok', t: 'شهرك ضمن المتوقع: ادخار نحو ' + L.fmt(f.savings) + ' د.ع' + (f.rate != null ? ' (' + f.rate + '%)' : '') + '.', a: 'انقل الفائض إلى مدخراتك أو هدفك بدل أن يبقى في النقد.' };
    else dec = { lv: 'info', t: 'لم يُسجَّل دخل هذا الشهر بعد.', a: 'سجّل الراتب عند استلامه ليصبح الملخص دقيقاً.' };
    return { now: a.total, prev: b ? b.total : null, diffs: diffs.slice(0, 3), forecast: f, decision: dec }; }
  // ---- شريط الثروة (34): ملاحظة التركّز والسيولة ----
  function wealthNotes(S, today = L.today()) { const out = [], al = typeof FM !== 'undefined' ? FM.alloc(S) : { parts: [], total: 0 }, s = E.snap(S);
    const big = al.parts.slice().sort((a, b) => b.p - a.p)[0]; if (big && al.total > 0 && big.p >= 60) out.push({ lv: 'warn', t: big.p + '% من أصولك في «' + big.n + '»: تركّز عالٍ، وأي هبوط فيه يمس معظم ثروتك.' });
    const ms = typeof FM !== 'undefined' ? FM.months(S, 4, today).slice(0, -1).filter(m => m.expense > 0) : [], avg = ms.length ? ms.reduce((a, m) => a + m.expense, 0) / ms.length : 0;
    if (avg > 0) { const mo = r1(s.liq / avg); out.push(mo < 3 ? { lv: 'warn', t: 'سيولتك تكفي ' + mo + ' شهر من مصروفك فقط. الأمان من 3 إلى 6 أشهر.' } : mo > 12 ? { lv: 'info', t: 'سيولتك تكفي ' + mo + ' شهراً من مصروفك: أكثر من حاجة الطوارئ، فكّر في توجيه جزء منها لهدف.' } : { lv: 'ok', t: 'سيولتك تكفي ' + mo + ' أشهر من مصروفك.' }); }
    return out; }
  // ---- ماذا لو؟ (36): أساس المقارنة متوسط آخر 3 أشهر كاملة ----
  function baseline(S, today = L.today()) { const ms = typeof FM !== 'undefined' ? FM.months(S, 4, today).slice(0, -1).filter(m => m.income > 0 || m.expense > 0) : [];
    if (!ms.length) { const f = forecast(S, today); return f ? { inc: f.income, exp: f.expense, n: 0, est: true } : null; }
    return { inc: Math.round(ms.reduce((a, m) => a + m.income, 0) / ms.length), exp: Math.round(ms.reduce((a, m) => a + m.expense, 0) / ms.length), n: ms.length, est: ms.length < 3 }; }
  const verdict = (sav, inc) => sav < 0 ? 'red' : inc > 0 && sav / inc < 0.1 ? 'warn' : 'ok';
  function whatIfInstallment(S, amt, today) { const b = baseline(S, today); if (!b) return null; const sav0 = b.inc - b.exp, sav = sav0 - amt, share = b.inc > 0 ? Math.round(amt / b.inc * 100) : null;
    return { ...b, amt, sav0, sav, share, rate: b.inc > 0 ? r1(sav / b.inc * 100) : null, lv: share != null && share > 30 ? 'red' : verdict(sav, b.inc) }; }
  function whatIfIncomeDrop(S, pct, today) { const b = baseline(S, today); if (!b) return null; const inc = Math.round(b.inc * (1 - pct / 100)), sav = inc - b.exp, liq = E.snap(S).liq;
    return { ...b, pct, newInc: inc, sav0: b.inc - b.exp, sav, rate: inc > 0 ? r1(sav / inc * 100) : null, months: sav < 0 ? r1(liq / -sav) : null, lv: verdict(sav, inc) }; }
  // أثر تغيّر سعر الدولار على ثروتك: الدولار، والأسهم الدولارية، والذهب والفضة (أسعارها بالدولار). الدينار لا يتغير
  function usdExposure(S) { const s = E.snap(S), usd = L.usdInfo(S).reduce((a, u) => a + u.mkt, 0), st = typeof FSK !== 'undefined' ? FSK.view(S).filter(x => x.cur === 'USD' && x.qty > 0).reduce((a, x) => a + x.mkt, 0) : 0, met = s.gold + s.silver;
    return { usd, stocks: st, metals: met, total: usd + st + met }; }
  function whatIfUsd(S, pct) { const x = usdExposure(S), d = Math.round(x.total * pct / 100), nw = L.panel(S).nw; return { ...x, pct, delta: d, nw, nw2: nw + d, share: nw ? r1(x.total / nw * 100) : null }; }
  // ---- المسار المالي المستقبلي (38–41): صافي الثروة الآن + الادخار الشهري × الأشهر، مع نمو سنوي اختياري للأصول (افتراضياً 0%) ----
  // الادخار من متوسط آخر 3 أشهر كاملة. السيناريوهات: الحالي، المحسّن (المصروف −15%)، الانخفاض (الدخل −20% والمصروف +10%). «بأسعار اليوم» يقسم على التضخم المفترض
  const PATH_DEF = { growth: 0, infl: 0, real: false };
  const pathCfg = S => ({ ...PATH_DEF, ...((S.x.set && S.x.set.path) || {}) });
  function horizons(today = L.today()) { const y = +today.slice(0, 4), eoy = Math.max(0, (Date.parse(y + '-12-31') - Date.parse(today)) / DAY / (365.25 / 12));
    return [['m1', 'بعد شهر', 1], ['eoy', 'نهاية ' + y, Math.round(eoy * 10) / 10], ['y5', 'بعد 5 سنوات', 60], ['y10', 'بعد 10 سنوات', 120], ['y25', 'بعد 25 سنة', 300]]; }
  const SCEN = [['cur', 'الحالي', (i, e) => i - e], ['up', 'المحسّن', (i, e) => i - Math.round(e * 0.85)], ['down', 'الانخفاض', (i, e) => Math.round(i * 0.8) - Math.round(e * 1.1)]];
  function fv(nw, s, n, g) { const r = Math.pow(1 + g / 100, 1 / 12) - 1, k = Math.pow(1 + r, n); const grow = Math.round(nw * k), sav = Math.round(r ? s * (k - 1) / r : s * n); const end = grow + sav, saved = Math.round(s * n); return { end, fromNw: nw, saved, growth: end - nw - saved }; }
  function path(S, today = L.today()) { const b = baseline(S, today); if (!b) return null; const c = pathCfg(S), nw = L.panel(S, today).nw, H = horizons(today);
    const sc = SCEN.map(([id, n, f]) => ({ id, n, s: f(b.inc, b.exp) }));
    const rows = H.map(([id, n, m]) => { const defl = c.real && c.infl ? Math.pow(1 + c.infl / 100, m / 12) : 1;
      return { id, n, m, v: sc.map(x => { const r = fv(nw, x.s, m, c.growth); return { ...x, ...r, show: Math.round(r.end / defl), defl }; }) }; });
    return { base: b, cfg: c, nw, scen: sc, rows, rate: S.rate }; }
  // ---- استشارات المسار (مخصصة ومتنوعة): قواعد استراتيجية تقرأ وضعك والأفق والسيناريو المختارين ----
  // كل استشارة: k نوعها، lv مستواها، body نص مخصص بأرقامك، step خطوة واحدة واضحة. الصياغة تتبدّل يومياً من بدائل ثابتة (بلا عشوائية حقيقية) فلا تتكرر بالنص نفسه.
  const fm = n => { const a = Math.abs(n), t = x => String(+x); return (n < 0 ? '−' : '') + (a >= 1e9 ? t((a / 1e9).toFixed(2)) + ' مليار' : a >= 1e6 ? t((a / 1e6).toFixed(1)) + ' مليون' : Math.round(a / 1e3) + ' ألف') + ' د.ع'; };
  const yrs = m => { const y = Math.floor(m / 12), mo = Math.round(m % 12); return (y ? (y === 1 ? 'سنة' : y === 2 ? 'سنتين' : y + (y <= 10 ? ' سنوات' : ' سنة')) : '') + (y && mo ? ' و' : '') + (mo ? (mo === 1 ? 'شهر' : mo === 2 ? 'شهرين' : mo + (mo <= 10 ? ' أشهر' : ' شهراً')) : '') || 'الآن'; };
  function pathAdvice(S, today = L.today(), m = 60, sid = 'cur') { const P = path(S, today); if (!P) return []; const b = P.base, sc = P.scen.find(x => x.id === sid) || P.scen[0], cur = P.scen[0], up = P.scen[1], dn = P.scen[2];
    const snap = E.snap(S), liq = snap.liq, exp = Math.max(1, b.exp), inc = b.inc, rate = inc > 0 ? cur.s / inc : null, cov = liq / exp, g = P.cfg.growth, out = [];
    const at = (s, mm, gg = g) => fv(P.nw, s, mm, gg).end, day = Math.floor(Date.parse(today) / DAY), V = (k, arr) => arr[(day + k.length) % arr.length];
    const add = (k, lv, pr, body, step) => out.push({ k, lv, pr, body, step });
    const top = (() => { const ms = typeof FM !== 'undefined' ? FM.months(S, 4, today).slice(0, -1) : [], c = {}; ms.forEach(x => Object.entries(x.cat || {}).forEach(([n, v]) => { c[n] = (c[n] || 0) + v; }));
      const e = Object.entries(c).sort((x, y) => y[1] - x[1])[0]; return e ? { n: e[0], v: Math.round(e[1] / Math.max(1, ms.length)) } : null; })();
    // 1) ادخار سالب
    if (cur.s < 0) { const runOut = cur.s < 0 ? Math.floor(liq / -cur.s) : null;
      add('leak', 'red', 0, V('leak', ['مصروفك يزيد على دخلك بـ ' + fm(-cur.s) + ' شهرياً، فثروتك تنقص بدل أن تكبر.', 'كل شهر تخسر ' + fm(-cur.s) + ' من ثروتك لأن المصروف أكبر من الدخل.']) + (runOut != null ? ' بهذا المعدل تنفد سيولتك بعد ' + yrs(runOut) + '.' : ''),
        top ? 'ابدأ بـ«' + top.n + '» (' + fm(top.v) + ' شهرياً): خفّضه ' + fm(Math.min(top.v, -cur.s)) + ' لتوقف النزيف.' : 'أوقف كل مصروف غير ضروري حتى يتوازن الشهر.'); }
    // 2) نسبة الادخار
    if (rate != null && cur.s >= 0) { const need = Math.max(0, Math.round(inc * 0.2 - cur.s)), gain = at(cur.s + need, m) - at(cur.s, m);
      if (rate < 0.1) add('rate', 'warn', 1, V('rate', ['تدّخر ' + Math.round(rate * 100) + '% فقط من دخلك. القاعدة الذهبية عند الأثرياء: 20% على الأقل قبل أي صرف.', 'نسبة ادخارك ' + Math.round(rate * 100) + '%. الثروة تُبنى بالفرق بين الدخل والمصروف، والفرق عندك صغير.']) + ' لو وصلت 20% (+' + fm(need) + ' شهرياً) تزيد ثروتك ' + fm(gain) + ' خلال ' + yrs(m) + '.',
        'ارفع الادخار تدريجياً: ' + fm(Math.round(need / 2)) + ' هذا الشهر، والباقي الشهر القادم.');
      else if (rate < 0.2) add('rate', 'info', 4, V('rate', ['ادخارك ' + Math.round(rate * 100) + '% من دخلك: جيد، والقفزة إلى 20% تحتاج ' + fm(need) + ' شهرياً فقط.', 'أنت في المنطقة الآمنة (' + Math.round(rate * 100) + '%). كل 1% إضافية = ' + fm(Math.round(inc / 100)) + ' شهرياً.']) + ' أثرها بعد ' + yrs(m) + ': +' + fm(gain) + '.', 'اجعل الزيادة القادمة في دخلك نصفها للادخار قبل أن تتعوّد على صرفها.');
      else add('rate', 'ok', 6, V('rate', ['تدّخر ' + Math.round(rate * 100) + '% من دخلك: هذا مستوى من يبنون الثروة فعلاً.', 'نسبة ادخارك ' + Math.round(rate * 100) + '% ممتازة. السؤال الآن ليس كم تدّخر بل أين تضع ما تدّخره.']), 'وجّه الفائض لهدف محدد بموعد، حتى لا يبقى نقداً بلا خطة.'); }
    // 3) صندوق الطوارئ
    if (cov < 3) { const gap = Math.round(exp * 6 - liq), mo = cur.s > 0 ? Math.ceil(gap / cur.s) : null;
      add('shield', cov < 1 ? 'red' : 'warn', 1, V('shield', ['سيولتك تكفي ' + (Math.round(cov * 10) / 10) + ' شهر من مصروفك. أي طارئ (مرض، توقف راتب) سيجبرك على الدين أو بيع أصل بخسارة.', 'قبل أي استثمار: درع الطوارئ. لديك ' + (Math.round(cov * 10) / 10) + ' شهر والمطلوب 6 أشهر (' + fm(exp * 6) + ').']),
        mo ? 'بادخارك الحالي تبني الدرع كاملاً خلال ' + yrs(mo) + '. اجعله أول هدف.' : 'ابدأ بمبلغ ثابت ولو صغير كل شهر للطوارئ.'); }
    else if (cov > 12) { const extra = Math.round(liq - exp * 6), loss = Math.round(extra * ((P.cfg.infl || 5) / 100));
      add('idle', 'info', 3, V('idle', ['لديك سيولة تكفي ' + Math.round(cov) + ' شهراً، أي ' + fm(extra) + ' فوق حاجة الطوارئ.', 'النقد الزائد (' + fm(extra) + ') آمن لكنه لا يعمل لك.']) + ' بتضخم ' + (P.cfg.infl || 5) + '%' + (P.cfg.infl ? '' : ' (مثال)') + ' يفقد نحو ' + fm(loss) + ' من قيمته الشرائية كل سنة.',
        'حدّد له وظيفة: هدف بموعد، أو حصة أصول تختارها أنت (ذهب، أسهم، عقار) حسب نسبتك المستهدفة.'); }
    // 4) الديون
    const D = L.debts(S, today).filter(d => d.dir === 'borrowed' && !d.settled), dt = D.reduce((a, d) => a + d.remaining, 0);
    if (dt > 0) add('debt', D.some(d => d.overdue) ? 'red' : 'warn', 1, V('debt', ['عليك ديون ' + fm(dt) + '. الدين يأكل من كل خطة: سدّه أولاً ثم ابنِ.', 'سداد الدين ربح مضمون: كل دينار تسدّه يعود لك كاملاً.']) + (cur.s > 0 ? ' بادخارك الحالي تسدّه خلال ' + yrs(Math.ceil(dt / cur.s)) + '.' : ''),
      'ابدأ بالأقرب موعداً' + (D[0] ? ' («' + D.sort((x, y) => (x.due || '9') < (y.due || '9') ? -1 : 1)[0].person + '»)' : '') + '، ولا تأخذ ديناً جديداً قبل الانتهاء.');
    // 5) هشاشة الدخل (سيناريو الانخفاض)
    if (dn.s < 0) add('fragile', 'warn', 2, V('fragile', ['لو قلّ دخلك 20% وزاد مصروفك 10% ستصرف أكثر مما تكسب بـ ' + fm(-dn.s) + ' شهرياً. دخلك الواحد هو نقطة ضعفك.', 'سيناريو الانخفاض يكشف هشاشة: عجز ' + fm(-dn.s) + ' شهرياً.']) + ' بعد ' + yrs(m) + ' يكون الفرق بين أفضل وأسوأ حالة ' + fm(at(up.s, m) - at(dn.s, m)) + '.',
      'ابنِ مصدر دخل ثانياً ولو صغيراً (عمل إضافي، تدريس، مشروع صغير)، وثبّت مصروفك الثابت تحت 50% من الراتب.');
    // 6) أثر خفض المصروف (المحسّن)
    if (up.s > cur.s) { const gain = at(up.s, m) - at(cur.s, m), cut = up.s - cur.s;
      add('cut', 'ok', 3, V('cut', ['خفض مصروفك 15% (' + fm(cut) + ' شهرياً) يضيف ' + fm(gain) + ' إلى ثروتك خلال ' + yrs(m) + '.', 'الفرق بين «الحالي» و«المحسّن» بعد ' + yrs(m) + ': ' + fm(gain) + '. كله من ' + fm(cut) + ' شهرياً فقط.']),
        top ? 'أسهل مكان للبدء: «' + top.n + '» (متوسطه ' + fm(top.v) + ' شهرياً).' : 'راجع أكبر 3 فئات مصروف واقطع من كل واحدة قليلاً.'); }
    // 7) تسريع الهدف المستدير القادم
    const steps = [1e7, 2.5e7, 5e7, 1e8, 2.5e8, 5e8, 1e9].filter(v => v > P.nw * 1.05); if (steps.length && sc.s > 0) { const t = steps[0]; let mm = null; for (let i = 1; i <= 300; i++) if (fv(P.nw, sc.s, i, g).end >= t) { mm = i; break; }
      if (mm && mm > 13) { const need = Math.ceil((t - P.nw) / (mm - 12)) - sc.s; add('mile', 'info', 4, V('mile', ['تصل إلى ' + fm(t) + ' بعد ' + yrs(mm) + '.', 'محطتك القادمة ' + fm(t) + ' على بعد ' + yrs(mm) + '.']) + ' لتصلها قبل ذلك بسنة كاملة تحتاج ' + fm(Math.max(0, need)) + ' إضافية شهرياً.', 'سمِّ هذه المحطة هدفاً في «الأهداف» ليتابعها التطبيق معك.'); } }
    // 8) قوة الزمن والنمو (توضيح لا وعد)
    if (m >= 60 && sc.s > 0) { const g3 = at(sc.s, m, Math.max(3, g + 3)) - at(sc.s, m, g);
      add('compound', 'info', 5, V('compound', ['الافتراض الحالي ' + g + '% نمو. لو نمت أصولك ' + Math.max(3, g + 3) + '% سنوياً فقط لأضاف الزمن ' + fm(g3) + ' خلال ' + yrs(m) + ' (توضيح، لا وعد).', 'الزمن أقوى من المبلغ: ' + Math.max(3, g + 3) + '% نمو سنوي يصنع ' + fm(g3) + ' إضافية بعد ' + yrs(m) + ' (مثال حسابي).']),
        'المال المدّخر لسنوات طويلة يستحق أصلاً يحفظ قيمته، لا نقداً يتآكل. اختر أنت الأصل حسب نسبتك.'); }
    // 9) التركّز
    const al = typeof FM !== 'undefined' ? FM.alloc(S) : { parts: [], total: 0 }, bigA = al.parts.slice().sort((x, y) => y.p - x.p)[0];
    if (bigA && al.total > 0 && bigA.p >= 60) add('diversify', 'warn', 3, V('diversify', [bigA.p + '% من أصولك في «' + bigA.n + '». مستقبلك المالي معلّق بسعر واحد.', 'كل البيض في سلة واحدة: «' + bigA.n + '» ' + bigA.p + '% من أصولك.']), 'وزّع أي ادخار جديد على نوع آخر حتى ينزل التركّز تحت 60%.');
    // 10) الدينار والدولار
    const ux = usdExposure(S), nwp = P.nw > 0 ? ux.total / P.nw : 0; if (P.nw > 5e6 && nwp < 0.1) add('fx', 'info', 5, V('fx', ['أكثر من 90% من ثروتك بالدينار. أي هبوط في قيمته يمسّها كلها.', 'ثروتك شبه كاملة بالدينار (' + Math.round((1 - nwp) * 100) + '%).']), 'حصة صغيرة محمية من العملة (دولار أو ذهب) توازن المخاطر. القرار ونسبته لك.');
    // 11) أهداف متأخرة
    L.goalView(S, today).filter(x => !x.done && x.behind > 0 && !x.firstMonth).slice(0, 1).forEach(x => add('goal', 'warn', 2, 'هدف «' + x.name + '» متأخر ' + (x.cur === 'USD' ? FL.fmtUsd(x.behind) : fm(x.behind)) + ' عن خطته.', 'خصّص له هذا الشهر، أو مدّد موعده بقرار واعٍ بدل أن يتأخر بصمت.'));
    // 12) ادفع لنفسك أولاً
    const pc = S.x.set.pyf || {}; if ((pc.never || (!pc.pct && !pc.amt)) && cur.s > 0) add('pyf', 'info', 5, V('pyf', ['ادخارك الآن هو ما يتبقى آخر الشهر. الأثرياء يعكسون الترتيب: يدّخرون أولاً ثم يصرفون الباقي.', 'ما يتبقى آخر الشهر يُصرف غالباً. اقتطع الادخار يوم الراتب.']), 'فعّل «ادفع لنفسك أولاً» بنسبة ' + Math.max(10, Math.min(20, Math.round((rate || 0.1) * 100))) + '% (⚙ ← المال).');
    // 13) الأرقام اسمية
    if (m >= 120 && !(P.cfg.real && P.cfg.infl)) add('real', 'info', 7, 'أرقام ' + yrs(m) + ' اسمية: ' + fm(at(sc.s, m)) + ' بعد ' + yrs(m) + ' لن تشتري ما تشتريه اليوم. بتضخم 5% تعادل نحو ' + fm(Math.round(at(sc.s, m) / Math.pow(1.05, m / 12))) + ' بأسعار اليوم.', 'فعّل «بأسعار اليوم» من الافتراضات لترى القيمة الحقيقية.');
    const O = { red: 0, warn: 1, ok: 2, info: 3 }; return out.sort((x, y) => O[x.lv] - O[y.lv] || x.pr - y.pr); }
  // ---- مواسم العراق (f1-v4.10): رمضان والعيدان (تقويم أم القرى، قد يختلف يوماً في العراق) وبداية الدراسة (تقريباً 1 تشرين الأول) ----
  const HIJRI = { r: ['2026-02-18', '2027-02-08', '2028-01-28', '2029-01-16', '2030-01-05', '2030-12-26', '2031-12-16', '2032-12-04', '2033-11-23', '2034-11-12', '2035-11-01', '2036-10-21'],
    f: ['2026-03-20', '2027-03-09', '2028-02-26', '2029-02-14', '2030-02-04', '2031-01-24', '2032-01-14', '2033-01-03', '2033-12-23', '2034-12-12', '2035-12-01', '2036-11-19'],
    a: ['2026-05-27', '2027-05-16', '2028-05-05', '2029-04-24', '2030-04-13', '2031-04-02', '2032-03-22', '2033-03-12', '2034-03-01', '2035-02-19', '2036-02-08'] };
  const SEAS = { r: ['🌙', 'رمضان', 0, 29, 0.15], f: ['🎉', 'عيد الفطر', -10, 3, 0.35], a: ['🐑', 'عيد الأضحى', -10, 3, 0.35], s: ['🎒', 'بداية الدراسة', -14, 7, 0.25] }; // [أيقونة، اسم، بداية النافذة، نهايتها، نسبة التقدير من مصروف شهر]
  const addD = (d, n) => new Date(Date.parse(d) + n * DAY).toISOString().slice(0, 10);
  function seasons(S, today = L.today(), within = 45) { if (!S.x.openDate) return []; const y = +today.slice(0, 4), list = [];
    Object.entries(HIJRI).forEach(([k, ds]) => ds.forEach((d, i) => list.push({ k, d, prev: ds[i - 1] || null })));
    [y, y + 1].forEach(yy => list.push({ k: 's', d: yy + '-10-01', prev: (yy - 1) + '-10-01' }));
    const ms = typeof FM !== 'undefined' ? FM.months(S, 4, today).slice(0, -1).filter(m => m.expense > 0) : [], avg = ms.length ? ms.reduce((a, m) => a + m.expense, 0) / ms.length : 0;
    return list.filter(e => e.d >= today && Math.round((Date.parse(e.d) - Date.parse(today)) / DAY) <= within).sort((a, b) => a.d < b.d ? -1 : 1).map(e => { const [ic, n, w0, w1, pct] = SEAS[e.k], days = Math.round((Date.parse(e.d) - Date.parse(today)) / DAY);
      let last = null; if (e.prev && addD(e.prev, w0) >= S.x.openDate && addD(e.prev, w1) < today) { const base = avg * (w1 - w0 + 1) / 30; last = { v: spend(S, addD(e.prev, w0), addD(e.prev, w1)).total }; last.extra = Math.max(0, Math.round(last.v - base)); }
      const est = last ? Math.max(last.extra, Math.round(avg * pct)) : Math.round(avg * pct), weeks = Math.max(1, Math.ceil(days / 7));
      return { k: e.k, id: e.k + e.d, ic, n, d: e.d, days, last, est, weekly: Math.ceil(est / weeks / 1000) * 1000, approx: true }; }).filter(x => x.est > 0); }
  // ---- بطاقة الشهر (f1-v4.10): أرقام شهر مكتمل للعرض والحفظ صورةً ----
  function monthCard(S, k) { if (!S.x.openDate) return null; const from = (k + '-01' < S.x.openDate ? S.x.openDate : k + '-01'), to = L.monthEnd(k), r = L.monthReport(S, k), a = spend(S, from, to), name = id => (S.acc[id] || {}).name || id;
    const days = {}; live(S).filter(t => t.type === 'expense' && t.date >= from && t.date <= to).forEach(t => { days[t.date] = (days[t.date] || 0) + pt(S, t.id).filter(p => S.acc[p.a].kind === 'expense').reduce((x, p) => x + p.iqd, 0); });
    const nd = Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1, big = Object.entries(days).sort((x, y) => y[1] - x[1])[0], top = Object.entries(a.cat).sort((x, y) => y[1] - x[1])[0];
    const pm = L.prevMonth(k); let prev = null; try { if (L.monthEnd(pm) >= S.x.openDate) prev = L.monthReport(S, pm).expense; } catch (e) {}
    const logged = new Set(live(S).filter(t => t.date >= from && t.date <= to && !['opening', 'opening_fix'].includes(t.type)).map(t => t.date)).size;
    return { k, income: r.income, expense: r.expense, savings: r.income - r.expense, rate: r.income > 0 ? Math.round((r.income - r.expense) / r.income * 100) : null, top: top ? { n: name(top[0]), v: top[1], p: a.total ? Math.round(top[1] / a.total * 100) : 0 } : null,
      bigDay: big ? { d: big[0], v: big[1] } : null, calm: nd - Object.keys(days).length, days: nd, prev, diff: prev ? Math.round((r.expense - prev) / prev * 100) : null, logged }; }
  return { seasons, monthCard, pathAdvice, PATH_DEF, pathCfg, path, horizons, fv, commitments, safe, forecast, monthSummary, wealthNotes, baseline, whatIfInstallment, whatIfIncomeDrop, whatIfUsd, usdExposure, spend, daysLeft };
})();
