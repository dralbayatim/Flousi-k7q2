'use strict'; // جزء من الواجهة (f1-v4.13): مقسوم حرفياً من app.js بالترتيب نفسه
// ===== تحليلاتي (f1-v3، المرحلة 4): رسوم وضعك المالي، و«هل أشتري؟»، والتقارير — عرض فقط =====
const kLab = k => AR_M[+k.slice(5) - 1] + ' ' + k.slice(2, 4);
function barsChart(ms) { // دخل (أخضر) ومصروف (أحمر) لكل شهر
  if (!ms.length) return h('p', { class: 'mut' }, 'لا أشهر بعد.'); const W = 340, H = 120, mx = Math.max(1, ...ms.flatMap(m => [m.income, m.expense])), bw = (W - 10) / ms.length;
  return svgEl(`<svg viewBox="0 0 ${W} ${H + 16}" width="100%" style="direction:ltr" role="img" aria-label="الدخل والمصروف">` + ms.map((m, i) => { const x = 5 + i * bw, a = m.income / mx * H, b = m.expense / mx * H;
    return `<rect x="${(x + bw * .12).toFixed(1)}" y="${(H - a).toFixed(1)}" width="${(bw * .36).toFixed(1)}" height="${a.toFixed(1)}" rx="2" style="fill:var(--ok)"/><rect x="${(x + bw * .52).toFixed(1)}" y="${(H - b).toFixed(1)}" width="${(bw * .36).toFixed(1)}" height="${b.toFixed(1)}" rx="2" style="fill:var(--bad)"/>`
      + (ms.length <= 12 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${H + 13}" font-size="9" text-anchor="middle" style="fill:var(--mute)">${esc(kLab(m.k))}</text>` : ''); }).join('') + '</svg>'); }
function hbars(items) { const mx = Math.max(1, ...items.map(x => x[1])); return h('div', {}, items.map(([n, v]) => h('div', { class: 'hb' }, h('div', { class: 'r' }, h('span', {}, n), h('b', {}, money(v))), h('div', { class: 'hbt' }, h('div', { class: 'hbf', style: 'width:' + Math.max(2, v / mx * 100).toFixed(1) + '%' }))))); }
function donut(parts) { const R = 46, C = 60, T = parts.reduce((a, p) => a + p.v, 0); let a0 = -Math.PI / 2;
  const arcs = parts.map(p => { const a1 = a0 + 2 * Math.PI * p.v / T, lg = a1 - a0 > Math.PI ? 1 : 0, d = parts.length === 1 ? `M${C},${C - R} A${R},${R} 0 1 1 ${C - .01},${C - R}` : `M${(C + R * Math.cos(a0)).toFixed(2)},${(C + R * Math.sin(a0)).toFixed(2)} A${R},${R} 0 ${lg} 1 ${(C + R * Math.cos(a1)).toFixed(2)},${(C + R * Math.sin(a1)).toFixed(2)}`; a0 = a1; return `<path d="${d}" fill="none" style="stroke:${p.c}" stroke-width="18"/>`; }).join('');
  return svgEl(`<svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="توزيع الأصول">${arcs}</svg>`, 'donut'); }
function insightsMain() {
  const per = view.p.per || 'y', n = per === 'all' ? 1200 : 12, ms = FM.months(S, n), cur = ms[ms.length - 1], al = FM.alloc(S), G = L.goalView(S), sv = FM.savings(S), sal = FM.salary(S);
  const nwPts = ms.map(m => [Date.parse(m.k + '-15'), m.nw]), first = ms[0], nwCh = first && first.nw ? (cur.nw / first.nw - 1) * 100 : null;
  const catSrc = per === 'm' ? (cur ? cur.cat : {}) : ms.reduce((o, m) => { Object.entries(m.cat || {}).forEach(([k, v]) => { o[k] = (o[k] || 0) + v; }); return o; }, {});
  const cats = Object.entries(catSrc).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const inc = ms.reduce((a, m) => a + m.income, 0), exp = ms.reduce((a, m) => a + m.expense, 0), rate = inc > 0 ? Math.round((inc - exp) / inc * 100) : null;
  const mn = FM.metalsNow(S);
  return [seg([['m', 'هذا الشهر'], ['y', 'سنة'], ['all', 'الكل']], per, k => go('insights', null, { per: k })),
    sect('', h('div', { class: 'quick' }, btn('هل أشتري؟', () => go('insights', 'buy')), btn('ماذا لو؟', () => go('insights', 'whatif')), btn('قائمة الرغبات', () => goFrom('more', 'wish'), 'alt'), btn('بطاقة الشهر', () => go('insights', 'wrap'), 'alt'), btn('إنجازاتي', () => goFrom('more', 'badges'), 'alt'), btn('المستشار', () => go('insights', 'advisor'), 'alt'), btn('التقارير والحدود', () => go('more', 'reports'), 'alt'))),
    sect('صافي الثروة', h('div', { class: 'big' }, cur ? money(cur.nw) : '—'), nwCh != null && ms.length > 1 ? row('التغيّر خلال الفترة', (nwCh >= 0 ? '+' : '') + nwCh.toFixed(1) + '%', nwCh < 0 ? 'bad' : 'okc') : null,
      ms.length > 1 ? lineChart(nwPts, { color: 'var(--acc)', fmt: v => (v / 1e6).toFixed(1) + 'م', labels: [[nwPts[0][0], kLab(ms[0].k)], [nwPts[nwPts.length - 1][0], kLab(cur.k)]] }) : h('p', { class: 'mut' }, 'يظهر المنحنى بعد مرور شهرين من التسجيل.')),
    sect('الدخل والمصروف', barsChart(per === 'm' ? ms.slice(-1) : ms.slice(-12)), h('div', { class: 'lg' }, h('span', {}, h('i', { style: 'background:var(--ok)' }), 'الدخل'), h('span', {}, h('i', { style: 'background:var(--bad)' }), 'المصروف')),
      row('مجموع الدخل', money(per === 'm' ? (cur ? cur.income : 0) : inc)), row('مجموع المصروف', money(per === 'm' ? (cur ? cur.expense : 0) : exp)),
      (r => r != null ? row(ti('نسبة الادخار'), r + '%', r < 10 ? 'bad' : r >= 20 ? 'okc' : '') : null)(per === 'm' ? (cur ? cur.rate : null) : rate),
      ms.filter(m => m.rate != null).length > 2 && per !== 'm' ? h('div', {}, h('p', { class: 'mut' }, 'نسبة الادخار شهرياً'), spark(ms.filter(m => m.rate != null).map(m => [Date.parse(m.k + '-15'), m.rate]), 'var(--ok)')) : null),
    sect('المصروف حسب الفئة' + (per === 'm' ? ' — هذا الشهر' : ''), cats.length ? hbars(cats) : h('p', { class: 'mut' }, 'لا مصروفات في الفترة.')),
    sect(ti('توزيع الأصول'), al.parts.length ? h('div', { class: 'dn' }, donut(al.parts), h('div', { class: 'lg col' }, al.parts.map(p => h('span', {}, h('i', { style: 'background:' + p.c }), p.n + ' ' + p.p + '%')))) : h('p', { class: 'mut' }, 'لا أصول بعد.'),
      mn ? h('p', { class: 'mut' }, 'الذهب والفضة بقيمة البيع المحسوبة الآن من نبض السوق: ' + money(mn.total) + ' (عرض فقط؛ لا يغيّر أسعارك المسجّلة).') : h('p', { class: 'mut' }, 'الذهب والفضة بأسعارك المعتمدة («نبض السوق» ← «أسعارك المعتمدة»).')),
    sect('الأهداف', G.length ? G.map(g => h('div', { class: 'hb' }, h('div', { class: 'r' }, h('span', {}, g.name + (sv && sv.id === g.id ? ' (المدخرات)' : '')), h('b', {}, g.pct + '%')), h('div', { class: 'hbt' }, h('div', { class: 'hbf' + (g.behind > 0 && !g.firstMonth ? ' late' : ''), style: 'width:' + Math.min(100, g.pct) + '%' })))) : emptyState('🎯', 'لا أهداف بعد', 'الهدف يحوّل الادخار إلى خطة: مبلغ وموعد وقسط شهري.'),
      sv && sal ? row('المدخرات تعادل', sv.salaries + ' راتب') : null),
    (D => D.length ? sect('الديون والالتزامات', D.map(d => row((d.dir === 'lent' ? 'لي عند ' : 'عليّ لـ ') + d.person, money(d.remaining), d.overdue ? 'bad' : ''))) : null)(L.debts(S).filter(d => !d.settled))];
}
function buyScreen() {
  const r = NB.buy, I = NB.buyIn || {}; // تبقى مدخلاتك بعد الفحص لتعدّلها وتعيد الفحص
  const f = buildForm([{ k: 'amount', l: 'المبلغ (دينار)', t: 'num', req: true, v: I.amount ? String(I.amount) : '' }, { k: 'type', l: 'لماذا؟', t: 'select', opts: FM.TYPES, v: I.type || 'fun' },
    { k: 'grams', l: 'الوزن بالغرام', t: 'num', v: I.grams || '', show: v => v.type === 'gold' || v.type === 'silver' }, { k: 'karat', l: 'العيار', t: 'num', v: I.karat || '21', show: v => v.type === 'gold' },
    { k: 'from', l: 'يُدفع من', t: 'select', opts: [['avail', 'المتاح للصرف'], ['savings', 'المدخرات']], v: I.from || 'avail', show: () => !!FM.savings(S) }, { k: 'note', l: 'وصف (اختياري)', t: 'text', v: I.note || '' }],
    async v => { const amt = L.parseAmount(v.amount, 0); NB.buy = FM.buyCheck(S, { amount: amt, type: v.type, grams: v.grams ? Number(L.norm(v.grams)) : 0, karat: v.karat ? Number(L.norm(v.karat)) : 21, from: v.from || 'avail' }); NB.buyIn = { ...v, amount: amt }; render(); }, 'افحص القرار');
  const out = r ? sect('النتيجة', h('div', { class: 'adv a-' + r.lv }, h('b', {}, r.verdict), h('div', {}, r.head)), r.notes.map(t => h('p', {}, '• ' + t)),
    r.facts.map(([k, v]) => row(k, typeof v === 'number' ? money(v) : String(v), typeof v === 'number' && v < 0 ? 'bad' : '')), r.extra.length ? h('div', {}, h('h2', {}, 'رأي حسب النوع'), r.extra.map(t => h('p', {}, t))) : null,
    h('p', { class: 'mut' }, 'حساب فقط: لا يُسجَّل شيء. إن قرّرت الشراء فسجّله من «العمليات»، أو من «أموالي» ← «الصندوق الذهبي» للذهب والفضة.'),
    btn('⏳ انتظر يوماً (قائمة الرغبات)', () => addWish(I.note || (FM.TYPES.find(t => t[0] === I.type) || [0, 'شراء'])[1], I.amount, I.type).then(() => goFrom('more', 'wish')), 'alt')) : null;
  return h('div', {}, backBtn(() => { NB.buy = null; NB.buyIn = null; go('insights'); }), h('h1', {}, 'هل أشتري؟'), h('p', { class: 'mut' }, 'اكتب المبلغ واختر الغرض، فيقيّم المستشار أثره على سيولتك ومدخراتك وأهدافك. للذهب والفضة اكتب السعر الذي يعرضه البائع ووزنه.'), sect('', f), out);
}
SCREENS.insights = (sub) => {
  if (sub === 'buy') return buyScreen();
  if (sub === 'advisor') return advisorScreen();
  if (sub === 'whatif') return whatIfScreen();
  if (sub === 'path') return pathScreen(view.p.h);
  if (sub === 'wrap') return wrapScreen(view.p.k);
  if (!S.x.openDate) return h('div', {}, h('h1', {}, 'تحليلاتي'), sect('المسار المالي', emptyState('🌴', 'يظهر بعد تسجيل الرصيد الافتتاحي', 'المسار المالي (آلة الزمن، رحلتك المالية، نخلتك المالية) وكل تحليلاتك تُحسب من أرقامك الفعلية. سجّل ما تملكه اليوم لتبدأ.', ['سجّل الرصيد الافتتاحي', () => go('accts', 'open')])),
    sect('', h('div', { class: 'quick' }, btn('هل أشتري؟', () => go('insights', 'buy'), 'alt'), btn('قائمة الرغبات', () => goFrom('more', 'wish'), 'alt')))); // f1-v4.12: بطاقة واضحة بدل سطر، حتى لا يبدو المسار مفقوداً
  if (!NB.tried) { NB.tried = true; Promise.all([FN.load(), FN.loadAux()]).then(() => { if (['home', 'nabd', 'insights'].includes(view.tab)) render(); }); }
  return h('div', {}, h('h1', {}, 'تحليلاتي'), monthCard(), pathCard(), ...insightsMain());
};
// ===== المستشار (f1-v3، المرحلة 5): استشارات مرتبة، شريطان «لك» و«العالم»، وبطاقة أهم 3 =====
// حالة العرض (ما رأيته ومتى) في localStorage منفصلة عن بياناتك: لا تدخل في النسخ ولا في الحسابات، وضياعها يعيد ظهور الاستشارات فقط
const ADV_KEY = 'flousi-adv';
const advLoad = () => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}') || {}; } catch (e) { return {}; } };
const advSave = st => { try { localStorage.setItem(ADV_KEY, JSON.stringify(st)); } catch (e) { /* التخزين غير متاح: لا بأس */ } };
let ADV = null; // نتيجة آخر تشغيل خلال الرسم الحالي
function advItems(st) { // استشارات المستشار + تنبيهات التطبيق الأساسية (المستحقات، الحدود، الديون...) في قائمة واحدة مرتبة
  try { return advItems0(st); } catch (e) { return []; } } // المستشار لا يُسقط الشاشة الرئيسية أبداً
function advItems0(st) {
  if (typeof FA === 'undefined') return [];
  const state = advLoad(), r = FA.run(S, state, L.today()); if (S.x.set.hideAdvice) r.items = []; // خيار الخصوصية: الاستشارات مخفية (التنبيهات الأساسية تبقى)
  if (r.state.verdict !== (state.verdict || null) || r.state.vchg !== (state.vchg || null)) advSave({ ...state, verdict: r.state.verdict, vchg: r.state.vchg }); // حفظ حكم الذهب الأخير لاكتشاف تغيّره (كان ضمن تعليق سهواً فتعطّل)
  const sys = (st || L.status(S)).alerts.filter(a => a.go[1] !== 'backup').map((a, i) => ({ id: 'AL' + i, lv: a.lv === 'info' ? 'info' : a.lv, title: a.t, text: a.t, go: a.go, sys: true }));
  const O = { red: 0, warn: 1, ok: 2, info: 3 }, prio = r.items.filter(x => x.id === 'PRIO');
  ADV = prio.concat([...sys, ...r.items.filter(x => x.id !== 'PRIO')].sort((a, b) => O[a.lv] - O[b.lv])); return ADV; }
const advGo = it => !it.go ? null : it.go[0] === 'assets' && !it.go[1] && it.go[2] && it.go[2].open === 'prices' ? go('nabd') : go(it.go[0], it.go[1] || null, it.go[2] || {}); // f1-v4.15: الأسعار المعتمدة صارت في «نبض السوق»
function advSeen(it) { if (it.sys || it.id === 'PRIO') return; advSave(FA.markSeen(advLoad(), it.id, L.today(), it.sev || 0, it.v)); toast('أُخفيت مؤقتاً، وتعود إن تغيّر الوضع'); render(); }
function advCard(it, full) { return h('div', { class: 'adv a-' + it.lv }, h('b', {}, (it.lv === 'red' ? '⛔ ' : it.lv === 'warn' ? '⚠ ' : it.lv === 'ok' ? '✓ ' : 'ℹ ') + it.title),
  it.text !== it.title ? h('p', { class: 'advt' }, it.text) : null,
  h('div', { class: 'quick' }, it.go ? btn('افتح', () => advGo(it), 'mini') : null, !it.sys && it.id !== 'PRIO' ? btn('رأيته', () => advSeen(it), 'mini alt') : null)); }
let tickTimers = [];
function tickerLine(label, items, onTap) { // شريط متحرك بعنوان ثابت؛ كل 5 ثوانٍ عنصر
  let i = 0; const txt = h('span', {}), box = h('div', { class: 'ticker tk', role: 'button', onclick: () => onTap(items[i % items.length]) }, h('b', { class: 'tkl' }, label), txt);
  const set = () => { const it = items[i % items.length]; txt.textContent = it.t; box.className = 'ticker tk' + (it.lv === 'red' ? ' alert' : it.lv === 'warn' ? ' warn' : ''); };
  set(); if (items.length > 1) { const tm = setInterval(() => { if (!box.isConnected) return clearInterval(tm); i++; set(); }, 5000); tickTimers.push(tm); } return box; }
function tickers(items) {
  tickTimers.forEach(clearInterval); tickTimers = [];
  const pa = (() => { try { return FN.get() ? FP.alertsCheck(S).map(x => ({ t: x.t, lv: 'warn', it: { go: ['nabd', null, { t: 'mine' }] } })) : []; } catch (e) { return []; } })(); // تنبيهاتك على السوق (f1-v4.11)
  const mine = pa.concat(items.length ? items.map(x => ({ t: x.title, lv: x.lv, it: x })) : pa.length ? [] : L.TIPS.map(t => ({ t })));
  const N = FN.get() ? FN.news() : null, world = N && N.items.length ? N.items.slice(0, 8).map(x => ({ t: x.t, lv: x.lv === 'warn' ? 'warn' : '' })) : [{ t: FN.err() ? 'نبض السوق غير متاح الآن (لا اتصال). يعود تلقائياً.' : 'نبض السوق: جارٍ التحميل…' }];
  if (!NB.tried) { NB.tried = true; Promise.all([FN.load(), FN.loadAux()]).then(() => { if (['home', 'nabd', 'insights'].includes(view.tab)) render(); }); }
  return h('div', {}, tickerLine('لك', mine, x => x && x.it ? advGo(x.it) : go('insights', 'advisor')), fOn('world') ? pubEl(tickerLine('العالم', world, () => go('nabd', null, { t: 'why' }))) : null); }
function advisorHome(items) { const top = items.slice(0, 3);
  return sect('المستشار', top.length ? top.map(x => advCard(x)) : h('p', { class: 'mut' }, 'لا شيء يحتاج انتباهك الآن. وضعك مستقر.'), advHiddenNote(),
    items.length > 3 ? btn('كل الاستشارات (' + items.length + ')', () => go('insights', 'advisor'), 'alt mini') : btn('صفحة المستشار', () => go('insights', 'advisor'), 'alt mini')); }
function advisorScreen() { const items = advItems(), all = FA.run(S, { verdict: advLoad().verdict, vchg: advLoad().vchg }, L.today()).items.filter(x => x.id !== 'PRIO').length, own = items.filter(x => !x.sys && x.id !== 'PRIO').length, hidden = S.x.set.hideAdvice ? 0 : Math.max(0, all - own);
  const G = [['red', 'يحتاج انتباهاً'], ['warn', 'للمراجعة'], ['ok', 'إنجازات'], ['info', 'معلومات']];
  return h('div', {}, backBtn(() => go('insights')), h('h1', {}, 'المستشار'),
    h('p', { class: 'mut' }, 'يقرأ أرقامك ونبض السوق ويعلّق. «رأيته» يخفي الاستشارة مدة، وتعود فوراً إن ساء الرقم. ليست استشارة مالية ملزمة.'), advHiddenNote(),
    items.length ? G.map(([lv, t]) => { const xs = items.filter(x => x.lv === lv); return xs.length ? sect(t + ' (' + xs.length + ')', xs.map(x => advCard(x, true))) : null; }) : h('p', {}, 'لا استشارات الآن. وضعك مستقر.'),
    hidden ? sect('', h('p', { class: 'mut' }, hidden + ' استشارة مخفية مؤقتاً.'), btn('أظهر المخفية', () => { const st = advLoad(); advSave({ verdict: st.verdict, vchg: st.vchg }); render(); }, 'alt mini')) : null); }
function nabdAdvice() { const xs = advItems().filter(x => x.go && x.go[0] === 'nabd');
  return privEl(sect('استشارات السوق لك', xs.length ? xs.map(x => advCard(x)) : S.x.set.hideAdvice ? advHiddenNote() : h('p', { class: 'mut' }, 'لا استشارات سوق تخصك الآن.'), h('p', { class: 'mut' }, 'تربط حالة السوق بمدخراتك ونسبة معادنك التي حددتها.'))); }
// تعليق المستشار على نسبة المعادن التي يحددها المستخدم (قرار المستخدم؛ المستشار يعلّق فقط)
function metalsComment(p) { if (p == null) return 'لم تحدد نسبة. لن تظهر استشارات «فوق/تحت نسبتك» حتى تحددها.';
  return p <= 10 ? 'نسبة متحفظة: حماية جيدة من التضخم دون تقلب كبير.' : p <= 25 ? 'نسبة معتدلة وشائعة للادخار طويل الأمد (3–5 سنوات).' : p <= 40 ? 'نسبة مرتفعة: المعادن متقلبة، وفرق البيع والشراء محلياً يأكل جزءاً من القيمة عند البيع السريع.' : 'نسبة عالية جداً: معظم ثروتك سيتحرك مع سعر الذهب والفضة. تأكد أن مدخراتك (الطوارئ) مكتملة أولاً.'; }
function savingsSettings() { const st = S.x.set, G = L.goalView(S), cur = st.savingsGoal && G.find(g => g.id === st.savingsGoal), sv = FM.savings(S), al = FM.alloc(S);
  const mp = st.metalsPct == null ? null : st.metalsPct, now = al.total ? al.parts.filter(p => p.n === 'ذهب' || p.n === 'فضة').reduce((a, p) => a + p.p, 0) : null;
  const adv = cur ? FM.goalAdviceText(S, cur.iqd ? cur.iqd.target : cur.target, cur.targetDate) : null;
  return h('div', {}, sect('هدف المدخرات (الطوارئ)', h('p', { class: 'mut' }, 'أنت تحدد المبلغ والموعد من «الأهداف»، ثم تختار هنا أي هدف هو مدخراتك. المعادن لا تُحسب ضمنه.'),
      h('label', { class: 'f' }, h('span', {}, 'الهدف'), h('select', { onchange: e => act(() => { st.savingsGoal = e.target.value || null; }, 'حُفظ') }, h('option', { value: '' }, '— لم يُحدد —'), G.map(g => h('option', { value: g.id, selected: g.id === st.savingsGoal }, g.name)))),
      sv ? row('المدخرات الآن', money(sv.amount) + (sv.salaries != null ? ' (' + sv.salaries + ' راتب)' : '')) : null, sv ? row('الهدف', money(sv.target) + ' — ' + sv.pct + '%') : null,
      adv ? h('div', { class: 'adv a-' + adv.lv }, h('b', {}, 'تعليق المستشار'), h('p', { class: 'advt' }, adv.text)) : null,
      !G.length ? btn('أنشئ هدفاً', () => go('more', 'goals'), 'alt mini') : null),
    sect('نسبة المعادن المستهدفة من أصولك', h('p', { class: 'mut' }, 'أنت تحددها (اتركها فارغة إن لم تقرر بعد). الآن: ' + (now == null ? '—' : (Math.round(now * 10) / 10) + '%')),
      h('label', { class: 'f' }, h('span', {}, 'النسبة %'), h('input', { value: mp == null ? '' : String(mp), inputmode: 'numeric', placeholder: 'غير محددة', onchange: e => { const v = L.norm(e.target.value).trim();
        if (v === '') return act(() => { st.metalsPct = null; }, 'أُلغيت النسبة'); const n = Number(v); if (!Number.isInteger(n) || n < 0 || n > 100) return toast('أدخل رقماً صحيحاً من 0 إلى 100', true); act(() => { st.metalsPct = n; }, 'حُفظت النسبة'); } })),
      h('div', { class: 'adv a-info' }, h('b', {}, 'تعليق المستشار'), h('p', { class: 'advt' }, metalsComment(mp))))); }
SCREENS.nabd = () => {
  const M = FN.get(), tab = ({ prices: 'now', analysis: 'why', econ: 'why', news: 'why' })[view.p.t] || view.p.t || 'now'; // أسماء التبويبات القديمة تُحوَّل للجديدة
  if (!NB.tried) { NB.tried = true; Promise.all([FN.load(), FN.loadAux()]).then(() => { if (['home', 'nabd', 'insights'].includes(view.tab)) render(); }); }
  const head = h('div', {}, h('h1', {}, 'نبض السوق'), h('p', { class: 'mut' }, M ? 'آخر تحديث للبيانات: ' + nWhen(M.generated_at) + ' · يتحدّث تلقائياً' : (FN.err() ? 'تعذّر تحميل بيانات السوق' : 'جارٍ التحميل…'),
    ' ', h('button', { class: 'mini alt', onclick: async () => { const g0 = (FN.get() || {}).generated_at; await Promise.all([FN.load(true), FN.loadAux(true)]); render(); const g1 = (FN.get() || {}).generated_at; toast(FN.err() ? 'تعذّر التحديث: ' + FN.err() : g1 && g1 === g0 ? 'لا توجد بيانات أحدث الآن · آخر ملف ' + nWhen(g1) + ' · يتجدد الملف عند تشغيل الجالب على GitHub' : 'حُدّثت البيانات', !!FN.err()); } }, 'تحديث')));
  if (!M) return h('div', {}, head, sect('', h('p', {}, FN.err() ? 'لا تتوفر بيانات السوق الآن. تحقق من الاتصال ثم اضغط «تحديث». بياناتك المالية لم تتأثر.' : '…')));
  return h('div', { class: 'pub' }, head, seg([['now', 'الآن'], ['why', 'لماذا تحرّك'], ['mine', 'أموالي']], tab, k => go('nabd', null, { t: k })), ...(tab === 'archive' ? nabdArchive() : tab === 'why' ? nabdWhy() : tab === 'mine' ? nabdMine() : [...nabdNow(), S.x.openDate ? ratesBlock(view.p.open === 'prices') : null]), tab !== 'archive' ? sect('', btn('🗄 أرشيف السوق ومحرك الاكتشافات', () => go('nabd', null, { t: 'archive' }), 'alt')) : null);
};
// ===== الخصوصية (f1-v3.1): «إخفاء الثروة» يخفي كل الأرقام المالية بصرياً في كل الشاشات، مثل تطبيقات البنوك =====
// بصري فقط: يغيّر النص المعروض على الشاشة، ولا يلمس الحسابات ولا البيانات ولا التقارير ولا المستشار.
// أسعار السوق العامة (نبض السوق، سعر الصرف) ليست من ثروتك فتبقى ظاهرة (وسم pub)، أما ما يخصك داخلها فيُخفى (وسم priv).
const PRIV = { until: 0, iv: null }, MASK = '••••••', REVEAL_MS = 5000;
const privOn = () => !!(S && S.x && S.x.set && S.x.set.hideAll); // مفتاح جديد يبدأ متوقفاً (hideNw القديم كان مفعّلاً افتراضياً لبطاقة الثروة وحدها، ولم يعد مستعملاً)
const privHidden = () => privOn() && Date.now() >= PRIV.until;
// مبلغ = رقم بفواصل آلاف، أو رقم مع $، أو رقم يليه «د.ع/دينار»، أو اختصار الملايين في الرسوم (42.3م). النسب والأعداد والتواريخ تبقى
const MONEY_RE = /[-+−]?\$?\d{1,3}(?:,\d{3})+(?:\.\d+)?\$?|[-+−]?\$\d+(?:\.\d+)?|[-+−]?\d+(?:\.\d+)?\$|[-+−]?\d+(?:\.\d+)?(?=\s?(?:د\.ع|دينار))|\d+(?:\.\d+)?م(?![؀-ۿ])/g;
const maskText = s => s.replace(MONEY_RE, MASK);
let privObs = null;
function privApply() { const root = $('#app'); if (!root) return; if (privObs) privObs.disconnect(); const hide = privHidden();
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { if (n.__o == null || n.nodeValue !== n.__s) n.__o = n.nodeValue; if (!/\d/.test(n.__o)) continue;
    const z = n.parentElement && n.parentElement.closest('.pub,.priv'), pub = !!z && z.classList.contains('pub'), v = hide && !pub ? maskText(n.__o) : n.__o;
    n.__s = v; if (n.nodeValue !== v) n.nodeValue = v; }
  privBtn(); if (privObs) privObs.observe(root, { childList: true, subtree: true, characterData: true }); }
function privReveal() { if (!privOn()) return; PRIV.until = Date.now() + REVEAL_MS; privApply(); clearInterval(PRIV.iv);
  PRIV.iv = setInterval(() => { if (Date.now() >= PRIV.until) { clearInterval(PRIV.iv); PRIV.iv = null; } privApply(); }, 250); }
function privHide() { PRIV.until = 0; clearInterval(PRIV.iv); PRIV.iv = null; privApply(); }
function privBtn() { let b = $('#eye'); if (!privOn() || bootErr) { if (b) b.hidden = true; return; }
  if (!b) { b = h('button', { id: 'eye', type: 'button', onclick: () => privHidden() ? privReveal() : privHide() }); document.body.append(b); }
  const left = Math.max(0, Math.ceil((PRIV.until - Date.now()) / 1000)), hid = privHidden();
  b.hidden = false; b.textContent = hid ? '👁' : '👁 ' + left; b.className = hid ? '' : 'on'; b.setAttribute('aria-label', hid ? 'إظهار الأرقام 5 ثوانٍ' : 'إخفاء الأرقام الآن'); }
// مغادرة التطبيق أو انتقاله إلى الخلفية: تُخفى الأرقام فوراً
document.addEventListener('visibilitychange', () => { if (document.hidden && S) privHide(); });
addEventListener('pagehide', () => { if (S) privHide(); });
// ===== f1-v4: «تحويل العملات» — محوّل مستقل بين الدينار والدولار =====
// يحسب فقط حتى تطلب غير ذلك. السعر اليدوي مؤقت لهذه العملية ولا يغيّر السعر المعتمد إلا إذا ضغطت «اعتمد هذا السعر» وأكّدت.
function fxForm() { const hasRate = S.x.rates.length > 0, st = { dir: 'iqd2usd', mode: hasRate ? 'app' : 'manual' };
  const amt = h('input', { inputmode: 'decimal', placeholder: 'المبلغ', autocomplete: 'off' }), man = h('input', { inputmode: 'decimal', placeholder: 'مثال: 150000', autocomplete: 'off' });
  const out = h('div', { class: 'fxout' }), act2 = h('div', {}), segBox = h('div', {}), manL = h('label', { class: 'f' }, h('span', {}, 'سعرك لهذه العملية: كم دينار لكل 100 دولار'), man);
  const rateNow = () => { if (st.mode === 'app') return hasRate ? S.rate : null; try { const r = L.parseAmount(man.value, 2); return r > 0 ? r : null; } catch (e) { return null; } };
  const calc = () => { const r = rateNow(); let a = null; try { a = L.parseAmount(amt.value, st.dir === 'iqd2usd' ? 0 : 2); } catch (e) {} if (!r || !a || a <= 0) return null;
    return st.dir === 'iqd2usd' ? { r, iqd: a, usd: Number(E.rd(BigInt(a) * 1000000n, BigInt(r))) } : { r, usd: a, iqd: E.usdToIqd(a, r) }; };
  const draw = () => { manL.hidden = st.mode !== 'manual';
    segBox.replaceChildren(h('label', { class: 'f' }, h('span', {}, 'الاتجاه'), seg([['iqd2usd', 'دينار ← دولار'], ['usd2iqd', 'دولار ← دينار']], st.dir, k => { st.dir = k; draw(); })),
      h('label', { class: 'f' }, h('span', {}, 'سعر التحويل'), seg([['app', 'السعر المعتمد في التطبيق'], ['manual', 'سعر يدوي لهذه العملية']].filter(x => hasRate || x[0] === 'manual'), st.mode, k => { st.mode = k; draw(); })));
    amt.placeholder = st.dir === 'iqd2usd' ? 'المبلغ بالدينار' : 'المبلغ بالدولار'; upd(); };
  const upd = () => { const c = calc(), r = rateNow();
    out.replaceChildren(h('div', { class: 'r' }, h('span', {}, 'السعر المستخدم'), h('b', {}, r ? L.fmtRate(r) + ' لكل 100$' + (st.mode === 'app' ? ' (المعتمد ' + S.x.rates[S.x.rates.length - 1].d + ')' : ' (يدوي، مؤقت)') : '—')),
      h('div', { class: 'r big2' }, h('span', {}, 'النتيجة'), h('b', {}, c ? (st.dir === 'iqd2usd' ? L.fmtUsd(c.usd) : money(c.iqd)) : '—')));
    act2.replaceChildren(...(c ? recordBox(c) : []), st.mode === 'manual' && r ? btn('اعتمد هذا السعر سعراً للتطبيق', () => { if (!confirm('اعتماد ' + L.fmtRate(r) + ' دينار لكل 100$ سعراً للصرف بتاريخ اليوم (' + L.today() + ')؟\nيُستعمل في تقييم دولارك من الآن.')) return; act(() => L.setRate(S, L.today(), r), 'اعتُمد السعر الجديد'); }, 'alt') : null); };
  const recordBox = c => { const from = accOpts(a => a.cur === (st.dir === 'iqd2usd' ? 'IQD' : 'USD') && a.kind === 'asset'), to = accOpts(a => a.cur === (st.dir === 'iqd2usd' ? 'USD' : 'IQD') && a.kind === 'asset');
    if (!from.length || !to.length) return [h('p', { class: 'mut' }, 'للتسجيل كعملية تحتاج حساباً بالدينار وآخر بالدولار. الحساب وحده لا يُسجَّل شيئاً.')];
    const fs = h('select', {}, from.map(([v, t]) => h('option', { value: v }, t))), ts = h('select', {}, to.map(([v, t]) => h('option', { value: v }, t))), dt0 = h('input', { type: 'date', value: L.today(), max: L.today() });
    return [h('details', { class: 'fold' }, h('summary', {}, 'سجّلها عملية بين حساباتي (اختياري)'), h('label', { class: 'f' }, h('span', {}, 'من'), fs), h('label', { class: 'f' }, h('span', {}, 'إلى'), ts), h('label', { class: 'f' }, h('span', {}, 'التاريخ'), dt0),
      btn('سجّل التحويل', () => { const a = st.dir === 'iqd2usd' ? c.iqd : c.usd, b = st.dir === 'iqd2usd' ? c.usd : c.iqd;
        if (!confirm('تسجيل تحويل: ' + (st.dir === 'iqd2usd' ? money(c.iqd) + ' ← ' + L.fmtUsd(c.usd) : L.fmtUsd(c.usd) + ' ← ' + money(c.iqd)) + '\nبسعر ' + L.fmtRate(c.r) + ' لكل 100$؟\nلا يتغير سعر الصرف المعتمد.')) return;
        act(() => L.transfer(S, { date: dt0.value, from: fs.value, to: ts.value, amount: a, amount2: b, note: 'تحويل عملات' }), 'سُجّل التحويل'); }, 'prim'))]; };
  amt.oninput = upd; man.oninput = upd; draw();
  return h('div', {}, sect(ti('تحويل العملات'), h('p', { class: 'mut' }, 'احسب المبلغ بين الدينار والدولار. الحساب لا يحفظ شيئاً، والسعر اليدوي لا يغيّر سعرك المعتمد إلا إذا اعتمدته صراحة.'), segBox, h('label', { class: 'f' }, h('span', {}, 'المبلغ'), amt), manL, out, act2)); }
// ===== f1-v4: «سجل التغييرات» — للقراءة فقط، من سجلاتك المحفوظة أصلاً (لا يضيف شيئاً إلى بياناتك) =====
MORE.push(['log', 'سجل التغييرات', () => { const f = view.p.f || 'all', ev = [], LT = new Map(L.listTx(S).map(y => [y.id, y]));
  S.tx.forEach(t => { const x = LT.get(t.id); ev.push({ k: 'tx', o: t.id, d: t.date, t: (x ? x.label : t.type) + (t.voided ? ' (معكوسة)' : '') + (x && x.note ? ' — ' + x.note : ''), v: x ? money(x.amount) + (x.usd ? ' (' + L.fmtUsd(x.usd) + ')' : '') : '' }); });
  S.x.rates.forEach(r => ev.push({ k: 'price', o: 0, d: r.d, t: 'سعر الصرف', v: L.fmtRate(r.r) + ' لكل 100$' }));
  S.x.prices.forEach(r => ev.push({ k: 'price', o: 0, d: r.d, t: 'أسعار الأونصة', v: [r.G != null ? 'ذهب ' + L.fmtUsd(r.G) : null, r.S != null ? 'فضة ' + L.fmtUsd(r.S) : null].filter(Boolean).join(' · ') }));
  (S.x.vals || []).filter(v => (S.acc[v.a] || {}).type !== 'stock').forEach(v => ev.push({ k: 'price', o: 0, d: v.d, t: 'تقييم «' + ((S.acc[v.a] || {}).name || v.a) + '»', v: money(v.v) }));
  FSK.list(S).forEach(st => st.prices.forEach(x => ev.push({ k: 'price', o: 0, d: x.d, t: 'سعر سهم «' + ((S.acc[st.id] || {}).name || st.id) + '»', v: pTxt(x.p, st.cur) })));
  S.goals.filter(g => g.date).forEach(g => { const d = S.x.goalsDef.find(x => x.id === g.name); ev.push({ k: 'goal', o: 0, d: g.date, t: (g.amount >= 0 ? 'تخصيص لـ ' : 'تحرير من ') + '«' + (d ? d.name : g.name) + '»', v: money(Math.abs(g.amount)) }); });
  if (S.x.backup) ev.push({ k: 'backup', o: 0, d: L.iso(new Date(S.x.backup.t)), t: 'آخر نسخة احتياطية', v: S.x.backup.tx + ' عملية' });
  const xs = ev.filter(e => f === 'all' || e.k === f).sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : b.o - a.o).slice(0, 300);
  return h('div', {}, h('p', { class: 'mut' }, 'كل ما سُجّل في بياناتك بتاريخه، الأحدث أولاً. للقراءة فقط. العمليات المعكوسة تبقى ظاهرة للأمانة.'),
    seg([['all', 'الكل'], ['tx', 'العمليات'], ['price', 'الأسعار والتقييم'], ['goal', 'الأهداف']], f, k => go('more', 'log', { f: k })),
    sect('', xs.length ? xs.map(e => h('div', { class: 'tx' }, h('div', { class: 'r' }, h('span', {}, e.d + ' · ' + e.t), h('b', {}, e.v)))) : h('p', { class: 'mut' }, 'لا شيء بعد.'), ev.length > 300 ? h('p', { class: 'mut' }, 'يُعرض آخر 300 سجل.') : null)); }]);
