'use strict';
// فلوسي — المستشار (f1-v3). يقرأ بياناتك ونبض السوق ويُخرج استشارات مرتبة بالشدة، بصيغ متبدّلة ومدد إخفاء.
// لا يكتب في بياناتك: حالة العرض (ما رأيته ومتى وآخر صيغة) تُحفظ منفصلة في localStorage، ولا تدخل في النسخ ولا في الحسابات.
// الكتالوج المعتمد: ADVISOR-CATALOG v2 مع تعديلات المواصفة الموحّدة (المدخرات تُقاس بهدفك؛ نسبة المعادن لا تُقيَّم قبل أن تحددها).
const FA = (() => {
  const G = typeof FL !== 'undefined' ? { L: FL, E: FE, M: FM } : { L: require('./logic.js'), E: require('./engine.js'), M: require('./mind.js') };
  const { L, E, M } = G, fmt = n => L.fmt(Math.round(n)), r1 = x => Math.round(x * 10) / 10, DAY = 864e5;
  const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
  const cnt = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? n + ' ' + few : n + ' ' + many;
  const nDays = n => cnt(n, 'يوم واحد', 'يومان', 'أيام', 'يوماً'), nMon = n => cnt(n, 'شهر واحد', 'شهران', 'أشهر', 'شهراً'), nTimes = n => cnt(n, 'مرة واحدة', 'مرتين', 'مرات', 'مرة');
  const ORDER = { red: 0, warn: 1, ok: 2, info: 3 };
  // اختيار صيغة: ثابتة خلال اليوم، تتبدّل يومياً، ولا تعيد آخر صيغة رأيتها
  const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const VARS = {}; const variants = id => VARS[id] || 1;
  function pick(id, list, st, today) { VARS[id] = list.length; if (list.length === 1) return 0; let i = (hash(id) + Math.floor(Date.parse(today) / DAY)) % list.length; const last = (st.last || {})[id]; if (last === i) i = (i + 1) % list.length; return i; }

  function context(S, today) {
    const sn = E.snap(S), sal = M.salary(S, today), ms = M.months(S, 7, today), cur = ms[ms.length - 1], done = ms.slice(0, -1), prev = done[done.length - 1];
    const avg = (arr, f) => arr.length ? arr.reduce((a, x) => a + f(x), 0) / arr.length : null, last3 = done.slice(-3);
    const sv = M.savings(S), moves = sv ? S.goals.filter(g => g.name === sv.id && g.date) : [];
    const mkt = typeof FN !== 'undefined' && FN.get() ? FN : null;
    const lastTx = S.tx.filter(t => !t.voided && t.type !== 'opening').map(t => t.date).sort().pop();
    return { lastTx, S, today, sn, sal, ms, cur, prev, done, last3, avgExp: avg(last3, m => m.expense), avgInc: avg(last3, m => m.income), sv, moves, mkt, al: M.alloc(S), day: +today.slice(8) };
  }

  function rules(c) {
    const out = [], R = (id, lv, hide, sev, title, texts, go) => out.push({ id, lv, hide, sev, title, texts, go: go || ['insights', 'advisor'] });
    const { S, today, sn, sal, cur, prev, done, last3, sv, moves, mkt, al } = c;
    // ===== أ. المدخرات (= الطوارئ). تُقاس بهدفك أنت =====
    if (!sv) R('S0', 'info', 14, 0, 'حدّد هدف المدخرات', [
      'لم تحدد هدفاً للمدخرات بعد. من «أموالي» ← «+ إضافة» ← «هدف» أنشئ هدفاً (المبلغ والموعد)، ثم علّمه «مدخرات» في ⚙ الإعدادات، فيبدأ المستشار بقياس أمانك المالي عليه.',
      'المدخرات هي وسادة أمانك. حدّد مبلغها وموعدها بنفسك في «الأهداف»، واجعله «هدف المدخرات» من الإعدادات، وسأتابعه معك شهرياً.'], ['more', 'goals']);
    if (sv && sal) {
      const m = sv.amount / sal.amount, gap = Math.max(0, sv.target - sv.amount), mon = sv.monthly > 0 ? Math.ceil(gap / sv.monthly) : null;
      if (sv.amount >= sv.target) R('S4', 'ok', 30, 0, 'اكتمل هدف المدخرات — مرحلة التجميع', [
        `اكتمل هدف المدخرات: ${fmt(sv.amount)} (${r1(m)} راتب). من الآن كل إضافة ادخار صافٍ يبني ثروتك، والاستثمار له قسمه حين تقرر.`,
        `وضع مالي مريح: مدخراتك ${r1(m)} راتب، وبلغت هدفك. القرارات الكبيرة صارت أسهل وأأمن.`,
        `أحسنت، هذا إنجاز حقيقي. حافظ على المدخرات فوق هدفك (${fmt(sv.target)}) واستمر بالإضافة الشهرية.`], ['more', 'goals']);
      else if (m < 1) R('S1', 'red', 1, 1 - m, 'المدخرات أقل من راتب واحد', [
        `مدخراتك ${fmt(sv.amount)} لا تغطي راتباً واحداً. أي طارئ الآن يعني استدانة. اجعل الادخار أول بند بعد استلام الراتب، قبل أي مصروف.`,
        `وضعك هشّ مالياً: المدخرات أقل من راتب شهر. هدف قريب واقعي: راتب واحد خلال ${nMon(Math.max(1, Math.ceil((sal.amount - sv.amount) / Math.max(1, sv.monthly || sal.amount * 0.1))))}.`,
        `لا توجد وسادة أمان كافية بعد. ابدأ بمبلغ ثابت كل شهر (${fmt(Math.max(sv.monthly, sal.amount * 0.1))})؛ الاستمرار أهم من الحجم.`], ['more', 'goals']);
      else if (m < 3) R('S2', 'red', 1, 3 - m, `المدخرات ${r1(m)} راتب — تحت الحد الآمن`, [
        `مدخراتك تعادل ${r1(m)} راتب، والحد الأدنى الآمن 3. لو انقطع دخلك فلديك ${r1(m)} شهر فقط. أجّل المشتريات غير الضرورية حتى تتجاوز 3 رواتب.`,
        `أنت عند ${r1(m)} راتب فقط، والحد الآمن 3 رواتب. كل إضافة الآن قيمتها مضاعفة لأمانك.`,
        `ينقصك ${fmt(Math.max(0, 3 * sal.amount - sv.amount))} لتبلغ 3 رواتب. بقسطك الحالي تصل في ${sv.monthly > 0 ? nMon(Math.max(1, Math.ceil(Math.max(0, 3 * sal.amount - sv.amount) / sv.monthly))) : 'مدة غير محددة'}.`], ['more', 'goals']);
      else R('S3', 'warn', 7, gap / sv.target, `المدخرات ${sv.pct}% من هدفك`, [
        `مدخراتك ${r1(m)} راتب: منطقة مقبولة. بقي ${fmt(gap)} على هدفك${mon ? '، أي ' + nMon(mon) + ' بقسطك الحالي' : ''}.`,
        `وضع مستقر نسبياً. نصف الطريق أو أكثر خلفك؛ استمر بالإضافة المنتظمة لتكون في وضع مريح.`,
        `هدفك ${fmt(sv.target)} بحلول ${sv.date}. القسط المطلوب ${fmt(sv.monthly)} شهرياً.`], ['more', 'goals']);
      const recent = moves.filter(x => days(x.date, today) <= 7 && x.amount < 0);
      if (recent.length) { const amt = -recent.reduce((a, x) => a + x.amount, 0); R('S5', 'warn', 3, amt / sal.amount, 'سحب من المدخرات', [
        `سحبت ${fmt(amt)} من مدخراتك، فصارت ${r1(m)} راتب. إن كان طارئاً فهذا دورها؛ أعد بناءها خلال ${nMon(Math.max(1, Math.ceil(amt / Math.max(1, sv.monthly || sal.amount * 0.1))))}.`,
        `لاحظت سحباً من المدخرات (${fmt(amt)}). هل كان طارئاً أم مصروفاً يمكن تأجيله؟`,
        `المدخرات نزلت بعد سحب ${fmt(amt)}. خطة إعادة البناء: ${fmt(Math.max(sv.monthly, sal.amount * 0.1))} شهرياً.`], ['more', 'goals']); }
      const w60 = moves.filter(x => days(x.date, today) <= 60 && x.amount < 0);
      if (w60.length >= 2) R('S6', 'red', 7, w60.length, 'سحوبات متكررة من المدخرات', [
        `سحبت من المدخرات ${nTimes(w60.length)} خلال شهرين بمجموع ${fmt(-w60.reduce((a, x) => a + x.amount, 0))}. هذا يعني أن الراتب لا يكفي المصروف. راجع أكبر فئة في «تحليلاتي».`,
        `المدخرات صارت تموّل المصروف اليومي (${nTimes(w60.length)} خلال شهرين). هذه علامة تحتاج قراراً: خفض بند أو زيادة دخل.`]);
      const k = L.mkey(today), depMonth = moves.filter(x => L.mkey(x.date) === k && x.amount > 0).reduce((a, x) => a + x.amount, 0), pk = L.prevMonth(k), depPrev = moves.filter(x => L.mkey(x.date) === pk && x.amount > 0).length;
      if (sv.amount < sv.target && c.day >= 15 && !depMonth) R(depPrev ? 'S7' : 'S8', depPrev ? 'warn' : 'red', 3, 0, depPrev ? 'لم تُضف للمدخرات هذا الشهر' : 'شهران دون إضافة للمدخرات', depPrev ? [
        `مضى نصف الشهر ولم تُضف شيئاً للمدخرات. حتى ${fmt(sal.amount * 0.05)} تبقي العادة حيّة.`,
        'الادخار تأخر هذا الشهر. أضف الآن قبل أن يذوب المبلغ في المصروف.',
        'هل تريد تخطّي الادخار هذا الشهر؟ لا بأس مرة، لكن لا تجعلها شهرين متتاليين.'] : [
        'شهران دون إضافة للمدخرات. هدفك يتأخر؛ عُد ولو بنصف المبلغ المعتاد.',
        `التخطّي صار متكرراً. السبب الأبرز في مصروفك: ${topCat(c) || '—'}.`], ['more', 'goals']);
      const depAvg = (() => { const by = {}; moves.filter(x => x.amount > 0).forEach(x => { const mk = L.mkey(x.date); by[mk] = (by[mk] || 0) + x.amount; }); const v = Object.entries(by).filter(([mk]) => mk !== k).map(([, a]) => a); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; })();
      if (depMonth && depAvg && depMonth > depAvg * 1.3) R('S9', 'ok', 14, 0, 'إضافة ممتازة للمدخرات', [
        `أضفت ${fmt(depMonth)} هذا الشهر، أعلى من معدلك بـ ${Math.round((depMonth / depAvg - 1) * 100)}%. صرت عند ${r1(m)} راتب.`,
        `إضافة أعلى من المعتاد هذا الشهر (${fmt(depMonth)}). هذا يقرّبك من هدفك أسرع.`]);
      if (depAvg && sv.amount < sv.target) { const n = Math.ceil(gap / depAvg); R('S10', 'info', 30, 0, 'وتيرة الوصول لهدف المدخرات', [
        `بمعدل إضافتك (${fmt(depAvg)} شهرياً) تصل إلى هدف المدخرات بعد قرابة ${nMon(n)}.`,
        `لو رفعت إضافتك الشهرية إلى ${fmt(Math.max(depAvg * 1.2, sv.monthly))} فقط، فتصل قبل ذلك بأشهر.`]); }
    }
    // ===== ب. الدخل =====
    if (prev && c.avgInc && done.length >= 3) { const a3 = done.slice(-4, -1); const av = a3.length ? a3.reduce((x, m) => x + m.income, 0) / a3.length : null;
      if (av && prev.income < av * 0.85) R('I2', 'warn', 7, 1 - prev.income / av, 'دخل الشهر الماضي أقل من المعتاد', [
        `دخلك في ${prev.k} كان ${fmt(prev.income)}، أقل من متوسطك (${fmt(av)}) بـ ${Math.round((1 - prev.income / av) * 100)}%. خفّف المصروف المرن هذا الشهر.`,
        'شهر بدخل أقل. لا تستعمل المدخرات لتعويضه إلا عند الضرورة.']); }
    const otherInc = cur ? Object.entries(cur.cat || {}).length >= 0 && incomeOther(S, today) : 0;
    if (otherInc > 0) R('I3', 'ok', 14, 0, 'دخل إضافي هذا الشهر', [
      `دخل إضافي ${fmt(otherInc)}. اقتراح: نصفه للمدخرات قبل أن يختفي في المصروف.`,
      `أحسنت، دخل إضافي هذا الشهر (${fmt(otherInc)}). خصّصه لهدف محدد بدل الإنفاق العام.`,
      'الدخل الإضافي فرصة: لو ادخرت نصفه صار شهرك من أفضل أشهرك.']);
    if (done.length >= 3 && prev && prev.income > 0 && prev.income > Math.max(...done.slice(0, -1).map(m => m.income))) R('I8', 'ok', 60, 0, 'أعلى دخل شهري سجّلته', [`أعلى دخل شهري سجّلته: ${fmt(prev.income)} في ${prev.k}.`]);
    // ===== ج. المصروف =====
    if (cur && cur.income > 0 && cur.expense > cur.income) R('E1', 'red', 3, cur.expense / cur.income - 1, 'المصروف أكبر من الدخل هذا الشهر', [
      `صرفت ${fmt(cur.expense)} ودخلك ${fmt(cur.income)}. الفرق ${fmt(cur.expense - cur.income)} يُسحب من مدخراتك.`,
      `هذا الشهر بالسالب حتى الآن (${fmt(cur.expense - cur.income)}). أوقف المصروف غير الضروري حتى نهاية الشهر.`,
      `الشهر يأكل من مدخراتك. أكبر سبب: ${topCat(c) || '—'}.`], ['more', 'reports']);
    if (cur && c.avgExp && c.day >= 7) { const dim = +L.monthEnd(cur.k).slice(8), proj = cur.expense / c.day * dim;
      if (proj > c.avgExp * 1.3 && cur.expense > c.avgExp * 0.4) R('E2', 'warn', 3, proj / c.avgExp - 1, 'وتيرة المصروف أسرع من المعتاد', [
        `مضى ${Math.round(c.day / dim * 100)}% من الشهر وصرفت ${Math.round(cur.expense / c.avgExp * 100)}% من مصروفك المعتاد. بهذا الإيقاع ينتهي الشهر بـ ${fmt(proj)}.`,
        'إنفاقك أسرع من الشهر. خفّف في الأيام القادمة لتعود إلى المسار.'], ['more', 'reports']); }
    if (cur && last3.length >= 2) Object.entries(cur.cat || {}).forEach(([cat, amt]) => { const av = last3.reduce((a, m) => a + ((m.cat || {})[cat] || 0), 0) / last3.length;
      if (av > 0 && amt > av * 1.25 && amt - av > (c.sal ? c.sal.amount * 0.03 : 50000)) R('E3:' + cat, 'warn', 7, amt / av - 1, `«${cat}» أعلى من متوسطه`, [
        `«${cat}» هذا الشهر ${fmt(amt)}، أعلى بـ ${Math.round((amt / av - 1) * 100)}% من متوسطك (${fmt(av)}). استثنائي أم بداية نمط؟`,
        `قفزة في «${cat}» (+${Math.round((amt / av - 1) * 100)}%). هل كانت كل هذه المصاريف ضرورية؟`,
        `لو عاد «${cat}» إلى متوسطه لوفّرت ${fmt(amt - av)} هذا الشهر.`,
        `«${cat}» يتصاعد. ضع له حداً شهرياً من «التقارير والحدود» لينبّهك مبكراً.`], ['more', 'reports']); });
    if (done.length >= 3) { const t3 = done.slice(-3), cats = new Set(t3.flatMap(m => Object.keys(m.cat || {})));
      cats.forEach(cat => { const v = t3.map(m => (m.cat || {})[cat] || 0); if (v[0] > 0 && v[1] > v[0] * 1.05 && v[2] > v[1] * 1.05) R('E4:' + cat, 'warn', 14, v[2] / v[0] - 1, `«${cat}» يرتفع ثلاثة أشهر متتالية`, [
        `«${cat}» ارتفع ثلاثة أشهر متتالية: ${fmt(v[0])} ← ${fmt(v[1])} ← ${fmt(v[2])}. هذا اتجاه وليس صدفة.`,
        `تصاعد مستمر في «${cat}». راجعه قبل أن يصبح المعتاد الجديد.`], ['more', 'reports']); }); }
    const big = c.sal ? S.tx.filter(t => t.type === 'expense' && !t.voided && days(t.date, today) <= 3 && days(t.date, today) >= 0) : [];
    big.forEach(t => { const amt = Math.abs((S.post.find(p => p.tx === t.id && S.acc[p.a] && S.acc[p.a].kind === 'expense') || {}).iqd || 0); if (amt > c.sal.amount * 0.2) R('E7:' + t.id, 'info', 30, 0, 'مصروف كبير في عملية واحدة', [
      `مصروف واحد بـ ${fmt(amt)} (${Math.round(amt / c.sal.amount * 100)}% من راتبك). في المرة القادمة جرّب «قبل أن تصرف» (في «تحليلاتي») قبله.`,
      'مبلغ كبير في عملية واحدة. تأكد من فئته وملاحظته لتبقى تقاريرك واضحة.'], ['ops']); });
    if (prev && done.length >= 6 && prev.expense > 0 && prev.expense <= Math.min(...done.slice(-6).map(m => m.expense))) R('E9', 'ok', 30, 0, 'أقل شهر إنفاقاً منذ نصف سنة', [
      `أقل شهر إنفاقاً منذ ستة أشهر (${fmt(prev.expense)}). أحسنت الانضباط.`, `شهر مقتصد: ${fmt(prev.expense)}. لو نقلت الفرق إلى المدخرات صار أثره دائماً.`]);
    if (prev && prev.income > 0) { const ess = ['ثابتة', 'أكل', 'احتياجات'].reduce((a, g) => a + ((prev.grp || {})[g] || 0), 0), fun = (prev.grp || {})['ترفيه'] || 0;
      if (ess / prev.income > 0.6) R('E10', 'warn', 30, ess / prev.income, 'الأساسيات تأخذ معظم دخلك', [`الأساسيات أخذت ${Math.round(ess / prev.income * 100)}% من دخلك الشهر الماضي، فلا يبقى هامش كبير للادخار. الحل الأقوى رفع الدخل أكثر من التقشف.`]);
      if (fun / prev.income > 0.15) R('E11', 'warn', 14, fun / prev.income, 'الترفيه فوق 15% من الدخل', [
        `الترفيه والمناسبات ${Math.round(fun / prev.income * 100)}% من دخلك (${fmt(fun)}). المعتدل حتى 10%.`,
        `خفض بسيط في الترفيه (${fmt(fun - prev.income * 0.1)}) يرفع ادخارك دون أن تشعر بفرق كبير.`], ['more', 'reports']); }
    if (cur && c.day >= 10) { const recentTx = c.lastTx && days(c.lastTx, today) <= 2, spentDays = new Set(S.tx.filter(t => t.type === 'expense' && !t.voided && L.mkey(t.date) === cur.k).map(t => t.date)).size, free = c.day - spentDays;
      if (spentDays >= 3 && recentTx && free >= Math.max(5, c.day * 0.4)) R('E14', 'ok', 14, 0, 'أيام بلا مصروف', [`${nDays(free)} بلا أي مصروف هذا الشهر. عادة ممتازة.`]); }
    // ===== د. الالتزامات =====
    if (c.sal) { const rec = (S.x.recur || []).filter(r => r.active && r.kind === 'expense').reduce((a, r) => a + r.amount, 0), jam = (S.x.jams || []).map(j => L.jamState(S, j)).filter(j => !j.done).reduce((a, j) => a + j.s, 0), tot = rec + jam, p = tot / c.sal.amount;
      if (p > 0.3) R('D1', 'red', 7, p, 'الالتزامات الشهرية فوق 30% من الدخل', [
        `التزاماتك الثابتة ${fmt(tot)} شهرياً، أي ${Math.round(p * 100)}% من راتبك. فوق 30% يصبح أي طارئ مشكلة: لا التزامات جديدة الآن.`,
        `ثلث دخلك تقريباً يذهب للالتزامات (${Math.round(p * 100)}%). أعطِ المدخرات الأولوية قبل أي التزام جديد.`], ['accts']);
      else if (p > 0.2) R('D2', 'warn', 14, p, 'الالتزامات بين 20 و30% من الدخل', [`التزاماتك ${Math.round(p * 100)}% من راتبك. مقبول، لكن لا مجال لالتزام إضافي.`], ['accts']); }
    (S.x.jams || []).map(j => L.jamState(S, j)).forEach(j => { if (!j.done && j.received && j.remaining > 0 && j.remaining <= 2) R('D5:' + j.id, 'ok', 30, 0, `«${j.name}» تقترب من النهاية`, [
      `بقي ${j.remaining === 1 ? 'قسط واحد' : j.remaining === 2 ? 'قسطان' : j.remaining + ' أقساط'} على «${j.name}». بعدها يتحرر ${fmt(j.s)} شهرياً، فحدّد من الآن وجهته (المدخرات مثلاً).`], ['more', 'jams']); });
    // ===== هـ. الأهداف =====
    L.goalView(S, today).forEach(g => { if (sv && g.id === sv.id) return;
      if (g.pct >= 90 && g.pct < 100) R('G3:' + g.id, 'ok', 14, 0, `«${g.name}» يقترب من الاكتمال`, [`«${g.name}» اكتمل بنسبة ${g.pct}%. بقي القليل، وهو في متناولك هذا الشهر.`], ['more', 'goals']);
      const last = S.goals.filter(x => x.name === g.id && x.amount > 0 && x.date).map(x => x.date).sort().pop();
      if (g.pct < 100 && last && days(last, today) > 62 && days(g.created || last, today) > 62) R('G5:' + g.id, 'warn', 14, 0, `«${g.name}» متوقف`, [`«${g.name}» لم يتحرك منذ شهرين. هل ما زال مهماً لك؟ عدّله أو أجّله بدل أن يبقى معلّقاً.`], ['more', 'goals']); });
    if (c.sal) { const tot = L.goalView(S, c.today).filter(g => g.pct < 100).reduce((a, g) => a + (g.iqd ? g.iqd.monthly : g.monthly), 0); if (tot > c.sal.amount * 0.4) R('G6', 'warn', 30, tot / c.sal.amount, 'أقساط الأهداف تضغط الدخل', [`أهدافك تطلب ${fmt(tot)} شهرياً (${Math.round(tot / c.sal.amount * 100)}% من راتبك). رتّبها حسب الأولوية ومدّد الأقل أهمية.`], ['more', 'goals']); }
    // ===== و. الثروة والأصول =====
    if (prev && done.length >= 2) { const pp = done[done.length - 2]; if (pp.nw > 0 && prev.nw < pp.nw * 0.95) R('W1', 'warn', 14, 1 - prev.nw / pp.nw, 'صافي الثروة انخفض الشهر الماضي', [
      `صافي ثروتك نزل ${r1((1 - prev.nw / pp.nw) * 100)}% في ${prev.k}. إن كان من حركة الأسعار فهو دفتري، وإن كان من المصروف فيحتاج انتباهاً.`]); }
    if (done.length >= 3 && prev && prev.nw > Math.max(...done.slice(0, -1).map(m => m.nw))) R('W2', 'ok', 30, 0, 'قمة جديدة لصافي الثروة', [`أعلى صافي ثروة سجّلته: ${fmt(prev.nw)} (آخر ${prev.k}).`, `قمة جديدة لصافي ثروتك: ${fmt(prev.nw)}.`]);
    if (al.total > 0) { const big = al.parts.filter(p => p.n !== 'عقار وأصول أخرى' && p.p > 50)[0]; if (big) R('W4', 'warn', 30, big.p / 100, `تركّز في «${big.n}»`, [
      `${big.n} يمثل ${big.p}% من أصولك. لا داعي للبيع، لكن وجّه الإضافات الجديدة إلى غيره تدريجياً.`, `تركّز مرتفع في ${big.n} (${big.p}%). التنويع يقلل أثر أي هبوط.`], ['assets']);
      const liq = al.parts.filter(p => p.n === 'نقد وحسابات' || p.n === 'دولار').reduce((a, p) => a + p.p, 0); if (liq < 10) R('W5', 'warn', 30, 0, 'السيولة أقل من 10% من أصولك', [`معظم أصولك غير سائلة؛ النقد ${r1(liq)}% فقط. هذا يصعّب مواجهة الطوارئ دون بيع أصل.`], ['accts']); }
    L.valuations(S).filter(v => v.book !== 0 && !v.hidden).forEach(v => { const d = v.last ? v.last.d : S.x.openDate; if (d && days(d, today) > 183) R('W6:' + v.id, 'info', 30, 0, `تقييم «${v.name}» قديم`, [`آخر تقييم لـ «${v.name}» قبل ${nMon(Math.floor(days(d, today) / 30))}. حدّثه من «أموالي» (اضغط بطاقته) ليبقى صافي ثروتك واقعياً.`], ['assets']); });
    // ===== ز. ذهبك وفضتك =====
    const P = L.pieces(S).filter(p => p.held), mn = M.metalsNow(S);
    if (P.length && mn) { const cost = P.reduce((a, p) => a + p.cost, 0), val = mn.total, diff = val - cost, pp = cost ? diff / cost * 100 : 0;
      if (pp < 0) R('P2', 'info', 14, 0, 'معادنك تحت كلفة الشراء', [
        `معادنك اشتريتها بـ ${fmt(cost)} وقيمتها للبيع الآن ${fmt(val)} (${r1(pp)}%). المصنعية جزء من الفرق، وعلى أفق 3–5 سنوات هذا طبيعي في فترات الهبوط.`,
        `أنت تحت كلفة الشراء بـ ${fmt(-diff)} دفترياً. لا خسارة إلا عند البيع.`], ['assets']);
      else if (pp > 20) R('P3', 'ok', 30, 0, 'معادنك تربح دفترياً', [`معادنك ربحت ${r1(pp)}% دفترياً (${fmt(diff)}) بعد خصم المصنعية.`], ['assets']);
      const gs = mkt && FN.metalSeries ? FN.metalSeries('gold') : [], wk = gs.length && FN.pctChange ? FN.pctChange(gs, 7) : null;
      if (wk != null && Math.abs(wk) >= 5 && mn.gold > 0) R('P1', 'info', 7, Math.abs(wk) / 100, 'قيمة ذهبك تحرّكت بقوة هذا الأسبوع', [
        `ذهبك تغيّر قرابة ${r1(wk)}% هذا الأسبوع؛ قيمته للبيع الآن ${fmt(mn.gold)}.`, `حركة قوية في قيمة ذهبك (${r1(wk)}%). تغيّر دفتري، لا ربح ولا خسارة حتى تبيع.`], ['assets']);
      const mp = S.x.set && S.x.set.metalsPct; if (mp != null && al.total) { const cur2 = al.parts.filter(p => p.n === 'ذهب' || p.n === 'فضة').reduce((a, p) => a + p.p, 0);
        if (cur2 > mp + 3) R('P4', 'warn', 14, cur2 / mp, 'المعادن فوق نسبتك المستهدفة', [`المعادن ${r1(cur2)}% من أصولك، وهدفك ${mp}%. توقف عن الإضافة حتى يعود التوازن بنمو بقية أصولك.`], ['assets']);
        else if (cur2 < mp - 3) R('P5', 'info', 14, 0, 'المعادن تحت نسبتك المستهدفة', [`المعادن ${r1(cur2)}% من أصولك، وهدفك ${mp}%. راقب «نبض السوق» لاختيار التوقيت.`], ['nabd']); }
      const sil = al.parts.find(p => p.n === 'فضة'), gol = al.parts.find(p => p.n === 'ذهب'); if (sil && gol && sil.v > gol.v) R('P6', 'info', 30, 0, 'الفضة أكبر من الذهب في معادنك', [`الفضة أكبر من الذهب في معادنك. فرق البيع والشراء فيها كبير، فاحتفظ بها في سبائك 999.`], ['assets']);
    }
    // ===== ح. السوق =====
    if (mkt) {
      const A = FN.analyze(), g = FN.ind('xau_usd'), par = FN.ind('usd_iqd_parallel'), gs = FN.metalSeries('gold'), ch14 = FN.pctChange(gs, 14), gsr = A.gsr;
      if (A.verdict && c.prevVerdict && c.prevVerdict !== A.verdict) c.newChg = { from: c.prevVerdict, to: A.verdict, d: today };
      const chg = c.newChg || c.vchg; if (chg && chg.to === A.verdict && days(chg.d, today) <= 3) R('M1', 'info', 3, 0, 'تغيّرت قراءة السوق', [`قراءة نبض السوق تغيّرت من «${chg.from}» إلى «${chg.to}» (ثقة ${A.conf}). التفاصيل في «التحليل».`], ['nabd', null, { t: 'analysis' }]);
      const mp = S.x.set && S.x.set.metalsPct, metalsP = al.parts.filter(p => p.n === 'ذهب' || p.n === 'فضة').reduce((a, p) => a + p.p, 0);
      if (A.verdict === 'شراء تدريجي' && sv && sal && sv.amount >= 3 * sal.amount && mp != null && metalsP < mp) R('M2', 'ok', 7, 0, 'فرصة شراء تدريجي', [
        `الظروف متوافقة: السوق في منطقة تجميع، ومدخراتك ${r1(sv.amount / sal.amount)} راتب، ومعادنك (${r1(metalsP)}%) تحت هدفك (${mp}%). اقتراح: شراء بحدود ${fmt(sal.amount * 0.15)} هذا الشهر، لا أكثر.`,
        `نافذة مناسبة للشراء التدريجي، وأنت جاهز مالياً. قسّم المبلغ على شهرين أو ثلاثة بدل دفعة واحدة.`,
        `فرصة هادئة لا اندفاع: ${fmt(sal.amount * 0.15)} يقرّبك من هدف المعادن دون المساس بأمانك.`], ['nabd', null, { t: 'analysis' }]);
      if (g && g.live === 'current' && ch14 != null && ch14 >= 8) R('M3', 'warn', 7, ch14 / 100, 'صعود سريع في الذهب', [`الذهب صعد ${r1(ch14)}% في أسبوعين. الشراء بعد القفزات غالباً في أسوأ توقيت؛ انتظر تهدئة.`, `صعود حاد (${r1(ch14)}%). إن كنت ستشتري فقسّم ولا تطارد السعر.`], ['nabd', null, { t: 'analysis' }]);
      if (g && g.live === 'current' && ch14 != null && ch14 <= -8) R('M4', 'info', 7, -ch14 / 100, 'هبوط حاد في الذهب', [`الذهب هبط ${r1(-ch14)}% في أسبوعين. ليس سبباً للبيع إن كان أفقك 3–5 سنوات.`, `الهبوط الحاد قد يستمر. إن أردت الشراء فلا تضع المبلغ كله دفعة واحدة.`], ['nabd', null, { t: 'analysis' }]);
      if (gsr && gsr.v > 85) R('M6', 'info', 14, 0, `نسبة الذهب/الفضة ${gsr.v}`, [`النسبة ${gsr.v}: الفضة رخيصة نسبياً تاريخياً. للإضافات الجديدة ميل نحو الفضة (سبائك 999)، مع انتباه إلى فرق البيع والشراء في السوق العراقي.`], ['nabd', null, { t: 'analysis' }]);
      if (gsr && gsr.v < 55) R('M7', 'info', 14, 0, `نسبة الذهب/الفضة ${gsr.v}`, [`النسبة ${gsr.v}: الفضة غالية نسبياً. الذهب أفضل للإضافات الجديدة.`], ['nabd', null, { t: 'analysis' }]);
      const ps = ((FN.aux().history || {}).intraday || {}).usd_iqd_parallel || [], pser = ps.map(([t, v]) => [Date.parse(t), v]), pw = FN.pctChange(pser, 7);
      if (par && par.live === 'current' && pw != null && pw >= 3) R('M8', 'warn', 3, pw / 100, 'قفزة في الدولار المحلي', [`الدولار المحلي ارتفع ${r1(pw)}% خلال أسبوع. القفزات المحلية غالباً مؤقتة: لا تشترِ دولاراً تحت ضغط الذعر.`, 'ضغط على الدينار هذا الأسبوع. ذهبك بالدينار يرتفع معه، وهذا يحمي ما تملكه.'], ['nabd', null, { t: 'analysis' }]);
      if (par && par.live === 'current' && pw != null && pw <= -3) R('M9', 'info', 3, 0, 'الدولار المحلي ينخفض', [`الدولار المحلي نزل ${r1(-pw)}% خلال أسبوع. إن كنت تحتاج دولاراً فالسعر أفضل الآن.`], ['nabd', null, { t: 'analysis' }]);
      const gap = FN.der('official_parallel_gap'); if (gap && gap.live === 'current' && gap.value > 15) R('M10', 'warn', 7, gap.value / 100, 'اتساع فجوة الدولار', [`الفجوة بين الدولار الرسمي والمحلي ${gap.value}%. اتساعها ضغط اقتصادي محلي؛ توقّع ارتفاع أسعار السلع.`], ['nabd', null, { t: 'analysis' }]);
      // M11 و M14 (أسعار الصاغة المحلية) أُزيلتا في f1-v4.11: البوابة لا تعرض أسعار صاغة ولا مصنعية (قرار المستخدم)
      const ft = FN.fredS('FEDTARU'); for (let i = Math.max(1, ft.length - 3); i < ft.length; i++) if (ft[i][1] !== ft[i - 1][1] && days(ft[i][0], today) <= 5 && days(ft[i][0], today) >= 0) R('M12', 'info', 0, 0, 'قرار فائدة أمريكي جديد', [`الفدرالي ${ft[i][1] > ft[i - 1][1] ? 'رفع' : 'خفّض'} الفائدة إلى ${ft[i][1]}% (الحد الأعلى). الرفع يضغط على الذهب عادةً، والخفض يدعمه.`], ['nabd', null, { t: 'analysis' }]);
      c.verdictNow = A.verdict;
    }
    // ===== ي. العادات =====
    const lastTx = c.lastTx;
    if (lastTx && days(lastTx, today) >= 3) R('H1', 'info', 2, 0, 'لا عمليات مسجّلة منذ أيام', [`لم تسجّل شيئاً منذ ${nDays(days(lastTx, today))}. التسجيل اليومي يجعل كل التحليل أدق.`, 'هل فاتتك مصاريف لم تُسجَّل؟ دقيقتان الآن توفّر عليك ارتباك نهاية الشهر.'], ['ops']);
    if (mkt && S.x.rates.length) { const p = FN.ind('usd_iqd_parallel'), lastR = S.x.rates[S.x.rates.length - 1]; if (p && p.live === 'current' && (days(lastR.d, today) > 14 || Math.abs(p.value / 100 - S.rate / 10000) / (S.rate / 10000) > 0.03))
      R('H3', 'warn', 2, 0, 'سعر الصرف المسجّل يحتاج تحديثاً', [`سعر الدولار المسجّل عندك ${L.fmtRate(S.rate)} لكل 100$ (${lastR.d})، والسوق المحلي الآن ${fmt(p.value)}. حدّثه من «نبض السوق» ← «أسعارك المعتمدة» إن كان هذا ما تتعامل به.`], ['assets', null, { open: 'prices' }]); }
    if (c.day <= 2 && prev) R('H4', 'info', 3, 0, 'شهر جديد', [`شهر جديد. الشهر الماضي: دخل ${fmt(prev.income)}، ومصروف ${fmt(prev.expense)}، وادخار ${prev.rate != null ? prev.rate + '%' : '—'}.`], ['insights']);
    return out;
  }
  const topCat = c => { const cur = c.cur || {}; const e = Object.entries(cur.cat || {}).sort((a, b) => b[1] - a[1])[0]; return e ? `«${e[0]}» (${fmt(e[1])})` : null; };
  const incomeOther = (S, today) => { const k = L.mkey(today); return S.post.filter(p => S.acc[p.a] && S.acc[p.a].id === 'inc_other' && L.mkey(p.date) === k && !(S.tx.find(t => t.id === p.tx) || {}).voided).reduce((a, p) => a - p.iqd, 0); };

  // تشغيل: يطبّق الإخفاء ويختار الصيغ، ويجمع الأحمر المتكدّس في «أولويتك هذا الأسبوع»
  function run(S, state = {}, today = L.today()) {
    const st = { seen: { ...(state.seen || {}) }, last: { ...(state.last || {}) }, verdict: state.verdict || null, vchg: state.vchg || null };
    if (!S.x.openDate) return { items: [], state: st };
    const c = context(S, today); c.prevVerdict = st.verdict; c.vchg = st.vchg; let all;
    try { all = rules(c); } catch (e) { all = [{ id: 'X', lv: 'info', hide: 0, sev: 0, title: 'تعذّر تشغيل المستشار', texts: ['حدث خطأ في حساب الاستشارات: ' + (e.message || e) + '. بياناتك لم تتأثر.'], go: ['insights'] }]; }
    if (c.verdictNow) st.verdict = c.verdictNow; if (c.newChg) st.vchg = c.newChg;
    const vis = all.filter(r => { const s = st.seen[r.id]; if (!s) return true; const age = days(s.d, today); if (age >= r.hide) return true; return r.sev > (s.sev || 0) * 1.1 + 1e-9; }); // يعود فوراً إن ساء الرقم بأكثر من 10%
    const items = vis.map(r => { const i = pick(r.id, r.texts, st, today); return { id: r.id, lv: r.lv, title: r.title, text: r.texts[i], v: i, go: r.go, hide: r.hide, sev: r.sev }; })
      .sort((a, b) => ORDER[a.lv] - ORDER[b.lv]);
    const reds = items.filter(x => x.lv === 'red');
    if (reds.length > 2) items.unshift({ id: 'PRIO', lv: 'red', title: 'أولويتك هذا الأسبوع', text: 'عدة أمور تحتاج انتباهك معاً. ابدأ بالأهم: ' + reds.slice(0, 3).map((x, i) => (i + 1) + ') ' + x.title).join(' · ') + '. معالجة الأول غالباً تخفف الباقي.', go: reds[0].go, hide: 0, sev: 0 });
    return { items, state: st };
  }
  // تسجيل «رأيته»: يُخفى مدة القاعدة، وتُحفظ آخر صيغة حتى لا تتكرر
  function markSeen(state, id, today = L.today(), sev = 0, v) { const st = { seen: { ...(state.seen || {}) }, last: { ...(state.last || {}) }, verdict: state.verdict || null, vchg: state.vchg || null }; st.seen[id] = { d: today, sev }; if (v != null) st.last[id] = v; return st; }
  return { run, markSeen, variants };
})();
if (typeof module !== 'undefined') module.exports = FA;
