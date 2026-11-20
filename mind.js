'use strict';
// فلوسي — «تحليلاتي» و«هل أشتري؟» والمستشار (f1-v3). حسابات للعرض فقط: لا يكتب هذا الملف أي شيء في بياناتك.
// يعتمد على FL و FE (المنطق والمحرك) وعلى FN (نبض السوق) إن وُجد. يعمل في Node للاختبار.
const FM = (() => {
  const G = typeof FL !== 'undefined' ? { L: FL, E: FE } : { L: require('./logic.js'), E: require('./engine.js') };
  const { L, E } = G;
  const OZ = 31.1035, MAKING = 5000; // مصنعية الذهب الثابتة للغرام (قرار المستخدم)
  const r1 = x => Math.round(x * 10) / 10, pct = (a, b) => b ? a / b * 100 : null;

  // ---- الراتب: بند متكرر مُعلَّم «راتب» وفعّال، وإلا متوسط دخل آخر 3 أشهر مكتملة ----
  function salary(S, today = L.today()) {
    const r = (S.x.recur || []).filter(x => x.salary && x.active && x.kind === 'income');
    if (r.length) return { amount: r.reduce((a, x) => a + x.amount, 0), from: 'recurring' };
    const ms = months(S, 4, today).slice(0, -1).filter(m => m.income > 0); if (!ms.length) return null;
    return { amount: Math.round(ms.reduce((a, m) => a + m.income, 0) / ms.length), from: 'average' };
  }
  // ---- الأشهر: آخر n شهراً (الأقدم أولاً) بالدخل والمصروف والادخار وصافي الثروة آخر الشهر ----
  function months(S, n = 12, today = L.today()) {
    const od = S.x.openDate; if (!od) return []; const out = []; let k = L.mkey(today);
    for (let i = 0; i < n && k >= L.mkey(od); i++, k = L.prevMonth(k)) { try { const r = L.monthReport(S, k); out.push({ k, income: r.income, expense: r.expense, savings: r.income - r.expense, rate: r.income > 0 ? r1((r.income - r.expense) / r.income * 100) : null, nw: r.nw1, cat: r.cat, grp: r.grp }); } catch (e) { break; } }
    return out.reverse();
  }
  // ---- قيمة المعادن من نبض السوق (قيمة البيع: المحسوب بلا مصنعية). null إن لم يكن السعر «حالياً» ----
  function metalsNow(S) {
    if (typeof FN === 'undefined' || !FN.get()) return null; const g = FN.ind('xau_usd'), s = FN.ind('xag_usd'), p = FN.ind('usd_iqd_parallel');
    if (!g || !s || !p || g.live !== 'current' || s.live !== 'current' || p.live !== 'current') return null;
    const rate = p.value / 100, out = { gold: 0, silver: 0, goldGrams: 0, silverGrams: 0 };
    L.pieces(S).filter(x => x.held).forEach(x => { const pure = x.mg / 1000 * x.fine / 10000, v = pure * (x.metal === 'G' ? g.value : s.value) / OZ * rate; if (x.metal === 'G') { out.gold += v; out.goldGrams += x.mg / 1000; } else { out.silver += v; out.silverGrams += x.mg / 1000; } });
    out.gold = Math.round(out.gold); out.silver = Math.round(out.silver); out.total = out.gold + out.silver; out.at = g.data_time; return out;
  }
  // ---- توزيع الأصول (بالدينار) ----
  function alloc(S) {
    const A = L.accountsView(S).filter(a => a.kind === 'asset' && !S.acc[a.id].hidden), V = {}; L.valuations(S).forEach(v => { if (v.last && v.book !== 0) V[v.id] = v.value; });
    const sum = f => A.filter(f).reduce((t, a) => t + (a.cur === 'USD' ? a.iqd : V[a.id] != null ? V[a.id] : a.bal), 0);
    const P = L.pieces(S).filter(p => p.held), mn = metalsNow(S);
    const parts = [['نقد وحسابات', sum(a => a.liquid && a.cur === 'IQD'), '#5fc4bb'], ['دولار', sum(a => a.cur === 'USD'), '#7cc4f0'],
      ['ذهب', mn ? mn.gold : P.filter(p => p.metal === 'G').reduce((t, p) => t + p.theo, 0), '#c9a227'], ['فضة', mn ? mn.silver : P.filter(p => p.metal === 'S').reduce((t, p) => t + p.theo, 0), '#9aa7ad'],
      ['عقار وأصول أخرى', sum(a => !a.liquid && a.cur === 'IQD'), '#a78bda']].filter(p => p[1] > 0);
    const total = parts.reduce((t, p) => t + p[1], 0);
    return { parts: parts.map(([n, v, c]) => ({ n, v, c, p: total ? r1(v / total * 100) : 0 })), total, metalsLive: !!mn };
  }
  // ---- هدف المدخرات (يحدده المستخدم: هدف من أهدافه يُعلَّم «مدخرات») ----
  function savings(S) {
    const id = S.x.set && S.x.set.savingsGoal; if (!id) return null; const g = L.goalView(S).find(x => x.id === id); if (!g) return null;
    const amt = g.iqd ? g.iqd.allocated : g.allocated, target = g.iqd ? g.iqd.target : g.target, sal = salary(S);
    return { id, name: g.name, amount: amt, target, pct: g.pct, date: g.targetDate, monthly: g.iqd ? g.iqd.monthly : g.monthly, done: g.done, behind: g.behind, salaries: sal ? r1(amt / sal.amount) : null, goal: g };
  }
  // تحليل هدف المدخرات عند إدخاله (قرار المستخدم: هو يحدد المبلغ والموعد، والمستشار يعلّق)
  function goalAdviceText(S, target, date, today = L.today()) {
    const sal = salary(S), mths = Math.max(1, L.monthsDiff ? L.monthsDiff(today, date) : Math.round((Date.parse(date) - Date.parse(today)) / 2.63e9)), inst = Math.ceil(target / mths), out = [];
    if (!sal) return { lv: 'info', text: `القسط الشهري المطلوب ${L.fmt(inst)} لمدة ${mths} شهراً. سجّل راتبك في «المتكررات» ليقارنه المستشار بدخلك.` };
    const p = inst / sal.amount * 100, mult = r1(target / sal.amount);
    if (mths < 3 && target > sal.amount) return { lv: 'red', text: `غير واقعي: ${L.fmt(target)} خلال ${mths} شهر يعني ${L.fmt(inst)} شهرياً (${Math.round(p)}% من راتبك). مدّد الموعد أو قلّل المبلغ.` };
    if (p > 25) out.push({ lv: 'warn', text: `هدف كبير قد يضغطك: القسط ${L.fmt(inst)} شهرياً، أي ${Math.round(p)}% من راتبك. الأريح أن يبقى بين 10 و20%: مدّد الموعد إلى نحو ${Math.ceil(target / (sal.amount * 0.2))} شهراً أو قلّل المبلغ.` });
    else if (p < 3) out.push({ lv: 'info', text: `هدف صغير: القسط ${L.fmt(inst)} فقط (${r1(p)}% من راتبك). ارفع المبلغ أو قصّر المدة لتصنع فرقاً حقيقياً.` });
    else out.push({ lv: 'ok', text: `هدف متوازن: القسط ${L.fmt(inst)} شهرياً (${Math.round(p)}% من راتبك) لمدة ${mths} شهراً.` });
    out.push({ lv: 'info', text: `الهدف يعادل ${mult} راتب. ${mult < 3 ? 'أقل من 3 رواتب لا يكفي للطوارئ وحده.' : mult >= 6 ? 'يكفي لوضع مالي مريح عند اكتماله.' : 'بين 3 و6 رواتب: أمان جيد، و6 أفضل.'}` });
    return { lv: out[0].lv, text: out.map(x => x.text).join(' ') };
  }
  // ---- «هل أشتري؟» ----
  const TYPES = [['fun', 'ترفيه'], ['travel', 'سفر'], ['personal', 'مصروف شخصي'], ['estate', 'أصل: عقار'], ['gold', 'أصل: ذهب'], ['silver', 'أصل: فضة'], ['asset', 'أصل آخر']];
  function buyCheck(S, inp, today = L.today()) {
    const amt = Math.round(inp.amount), sn = E.snap(S), sal = salary(S), sv = savings(S), ms = months(S, 4, today).slice(0, -1), avgExp = ms.length ? ms.reduce((a, m) => a + m.expense, 0) / ms.length : null;
    const from = inp.from === 'savings' && sv ? 'savings' : 'avail', notes = [], facts = [];
    if (!(amt > 0)) throw new Error('اكتب المبلغ');
    const availAfter = sn.avail - (from === 'avail' ? amt : 0), savAfter = sv ? sv.amount - (from === 'savings' ? amt : 0) : null, liqAfter = sn.liq - amt;
    facts.push(['المتاح للصرف بعد القرار', availAfter]); if (sv) facts.push(['المدخرات بعد القرار', savAfter]);
    if (sal) facts.push(['نسبة المبلغ من راتبك', Math.round(amt / sal.amount * 100) + '%']);
    let lv = 'ok';
    const bump = l => { const o = { ok: 0, warn: 1, red: 2 }; if (o[l] > o[lv]) lv = l; };
    if (liqAfter < 0) { bump('red'); notes.push('المبلغ أكبر من كل سيولتك الحالية. هذا الشراء غير ممكن دون استدانة أو بيع أصل.'); }
    else if (from === 'avail' && availAfter < 0) { bump('red'); notes.push(`المتاح للصرف لا يكفي: سيُمسّ ما خصصته لأهدافك بـ ${L.fmt(-availAfter)}.`); }
    if (sv && from === 'savings' && sal) { const m = savAfter / sal.amount; facts.push(['المدخرات بالرواتب بعد القرار', r1(m)]);
      if (m < 3) { bump('red'); notes.push(`تنزل مدخراتك إلى ${r1(m)} راتب، تحت الحد الآمن (3). الأفضل أن تدّخر ${Math.ceil((3 * sal.amount - savAfter) / Math.max(1, sv.monthly || sal.amount * 0.1))} أشهر ثم تشتري.`); }
      else if (sv.target && savAfter < sv.target) { bump('warn'); notes.push(`يتأخر هدف المدخرات: تصبح ${L.fmt(savAfter)} من ${L.fmt(sv.target)}.`); } }
    if (sal && amt > sal.amount) { bump('warn'); notes.push(`المبلغ يعادل ${r1(amt / sal.amount)} راتب. القرارات بهذا الحجم تستحق انتظار 48 ساعة قبل التنفيذ.`); }
    if (sal && from === 'avail' && availAfter >= 0 && availAfter < sal.amount * 0.3 && amt > sal.amount * 0.1) { bump('warn'); notes.push('يبقى لك بعده أقل من 30% من راتب في المتاح للصرف حتى آخر الشهر.'); }
    const t = inp.type, mkt = typeof FN !== 'undefined' && FN.get() ? FN : null, extra = [];
    if ((t === 'fun' || t === 'travel' || t === 'personal') && ms.length) {
      const g = t === 'personal' ? null : 'ترفيه', avgG = g ? ms.reduce((a, m) => a + ((m.grp || {})[g] || 0), 0) / ms.length : avgExp;
      if (avgG > 0) extra.push(t === 'personal' ? `المبلغ يعادل ${r1(amt / avgG * 100)}% من مصروفك الشهري المعتاد (${L.fmt(Math.round(avgG))}).` : `متوسط إنفاقك على الترفيه ${L.fmt(Math.round(avgG))} شهرياً؛ هذا المبلغ يعادل ${r1(amt / avgG)} شهر منه.`);
      if (t === 'travel') extra.push('السفر من المصاريف التي تستحق التخطيط: خصّص لها هدفاً بموعد لتدفعها من المخصص لا من المتاح.');
    }
    if (t === 'gold' || t === 'silver') {
      const grams = Number(inp.grams) || 0, karat = t === 'gold' ? Number(inp.karat) || 21 : null;
      const m = mkt ? FN.ind(t === 'gold' ? 'xau_usd' : 'xag_usd') : null, p = mkt ? FN.ind('usd_iqd_parallel') : null;
      if (grams > 0 && m && p && m.live === 'current' && p.live !== 'unavailable') {
        const pure = t === 'gold' ? grams * karat / 24 : grams * 0.999, sale = Math.round(pure * m.value / OZ * p.value / 100), expected = t === 'gold' ? sale + MAKING * grams : sale;
        facts.push([t === 'gold' ? 'المتوقع مع المصنعية (5,000 للغرام)' : 'قيمتها بالأونصة المحوّلة', expected], ['قيمة البيع الفوري (بلا مصنعية)', sale]);
        const diff = (amt / expected - 1) * 100; facts.push(['سعرك مقابل المتوقع', (diff >= 0 ? '+' : '') + r1(diff) + '%']);
        extra.push(diff < 1 ? 'سعر عادل مقارنة بالمتوقع.' : diff <= 3 ? 'مقبول، وتستطيع المفاوضة.' : 'السعر مرتفع عن المتوقع: قارن بصائغ أو بائع آخر.');
        if (diff > 3) bump('warn');
        extra.push(`لو بعت فوراً بعد الشراء لاسترددت قرابة ${L.fmt(sale)}، أي ${L.fmt(amt - sale)} (${r1((amt - sale) / amt * 100)}%) تذهب مصنعيةً وفرقاً. ${t === 'gold' ? 'الذهب للسنوات، لا للأشهر.' : 'فرق البيع والشراء في الفضة كبير: سبائك 999 فقط.'}`);
        if (p.live !== 'current') extra.push('تنبيه: سعر الدولار المحلي المستعمل قديم، فالمقارنة تقريبية.');
      } else extra.push(grams > 0 ? 'سعر السوق غير متاح الآن أو قديم، فلا مقارنة بالسعر المتوقع.' : 'اكتب الوزن بالغرام لأقارن سعرك بالسعر المتوقع.');
      if (mkt && FN.analyze) { const A = FN.analyze(); if (t === 'gold' && A.verdict) extra.push(`رأي نبض السوق للذهب الآن: «${A.verdict}» (ثقة ${A.conf}).`); if (t === 'silver' && A.gsr) extra.push(`نسبة الذهب/الفضة ${A.gsr.v}: ${A.gsr.tip}.`); }
      const mp = S.x.set && S.x.set.metalsPct, al = alloc(S); if (mp != null && al.total) { const cur = al.parts.filter(x => x.n === 'ذهب' || x.n === 'فضة').reduce((a, x) => a + x.v, 0), after = (cur + amt) / (al.total) * 100;
        extra.push(`معادنك تصبح ${r1(after)}% من أصولك، وهدفك ${mp}%.`); if (after > mp + 5) { bump('warn'); extra.push('تتجاوز نسبتك المستهدفة للمعادن.'); } }
    }
    if (t === 'estate' || t === 'asset') { const al = alloc(S); if (al.total) { const share = (amt / al.total) * 100; extra.push(`المبلغ يعادل ${r1(share)}% من أصولك الحالية.`); if (share > 50) { bump('warn'); extra.push('تركّز كبير في أصل واحد: تأكد أن السيولة الباقية تكفي للطوارئ.'); } }
      extra.push('الأصل غير السائل لا يُباع بسرعة عند الطوارئ: لا تشترِه من مدخرات الطوارئ.'); }
    const verdict = { ok: 'مناسب', warn: 'ممكن بحذر', red: 'غير مناسب الآن' }[lv];
    const head = lv === 'ok' ? (sal ? `القرار آمن ماليّاً: المبلغ ${Math.round(amt / sal.amount * 100)}% من راتبك ولا يمسّ أهدافك.` : 'لا مانع مالي ظاهر.') : notes.shift();
    return { lv, verdict, head, notes, extra, facts, from };
  }
  return { salary, months, metalsNow, alloc, savings, goalAdviceText, buyCheck, TYPES, MAKING };
})();
if (typeof module !== 'undefined') module.exports = FM;
