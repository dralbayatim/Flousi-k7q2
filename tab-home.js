'use strict';
// ===== f1-v4.14: «الرئيسية» — بطاقة واحدة، أربعة اختصارات، سطر السوق، و«يهمّك الآن» =====
// «يهمّك الآن» يجمع ما كان بطاقات وأشرطة منفصلة (المستشار، التنبيهات، المستحقات، المطابقة، الرغبات، بطاقة الشهر، المواسم، الحدود، نتائج القرارات).
// لا يُحذف شيء: كل سطر يفتح مكانه الكامل. عرض فقط.
let UPN_OPEN = null; // سطر مفتوح للتفصيل داخل الرئيسية (مثل الموسم)
function marketLine() { let m = null, r = null; try { if (FN.get()) { m = FP.unit('m21'); r = FN.ref(); } } catch (e) {}
  if (!NB.tried) { NB.tried = true; Promise.all([FN.load(), FN.loadAux()]).then(() => { if (['home', 'nabd', 'insights'].includes(view.tab)) render(); }); }
  let d = null; try { d = FP.decompose('d'); } catch (e) {}
  const body = m && m.iqd != null && r ? [h('span', {}, 'مثقال 21: ', h('b', {}, nI(m.iqd)), d && d.ok ? h('small', { class: d.total < 0 ? 'badc' : 'okc' }, ' ' + (d.total > 0 ? '▲' : d.total < 0 ? '▼' : '') + Math.abs(Math.round(d.total * 10) / 10) + '%') : null),
    h('span', {}, 'الدولار: ', h('b', {}, nI(r.value)), m.live !== 'current' || r.live !== 'current' ? h('small', { class: 'mut' }, ' (قديم)') : null)]
    : [h('span', { class: 'mut' }, FN.err() ? 'نبض السوق غير متاح الآن (لا اتصال)' : 'نبض السوق: جارٍ التحميل…')];
  return pubEl(h('button', { type: 'button', class: 'mline', onclick: () => go('nabd') }, body)); }
// عناصر «يهمّك الآن»: { t, lv, ic, go(), x? (إخفاء اليوم), open? (تفصيل داخل الرئيسية) }
function upnItems(st) { const out = [], add = (t, lv, ic, fn, extra) => out.push({ t, lv, ic, go: fn, ...(extra || {}) });
  try { if (FN.get()) FP.alertsCheck(S).forEach(x => add(x.t.replace(/^🔔\s*/, ''), 'warn', '🔔', () => go('nabd', null, { t: 'mine' }))); } catch (e) {}
  const rl = lsGet(RLATER, null); if (rl && S.acc[rl.acct]) add('مطابقة معلّقة: ' + S.acc[rl.acct].name + ' (نقص ' + money(Math.max(0, E.bal(S, rl.acct) - rl.counted)) + ')', 'warn', '⚖', () => go('accts', 'recon', { id: rl.acct, c: rl.counted }), { x: () => lsSet(RLATER, null) });
  (ADV = advItems(st)).filter(it => it.sys || fOn('advisor')).forEach(it => add(it.title, it.lv, it.sys ? '📌' : '💡', () => advGo(it)));
  try { const ds = S.tx.filter(t => !['opening', 'opening_fix', 'reversal'].includes(t.type) && !t.voided).map(t => t.date).sort(), last = ds.length ? ds[ds.length - 1] : S.x.openDate, n = Math.round((Date.parse(L.today()) - Date.parse(last)) / 864e5);
    if (n >= 3 && LS.get(NUDGE) !== L.today()) add('لم تسجّل شيئاً منذ ' + n + ' أيام. ما صرفته وتنساه يضيع من الحساب.', 'warn', '✍', () => go('ops', null, { kind: 'expense' }), { x: () => LS.set(NUDGE, L.today()) }); } catch (e) {}
  const rk = reconKey(); if (rk && !(S.x.reconDone || {})[rk]) add('مطابقة آخر الشهر: عدّ نقدك وتأكد أن أرصدتك مطابقة', 'info', '🧮', () => go('more', 'monthrecon'));
  try { const r = wishReady(); if (r.length) add('مرّ يوم على «' + r[0].name + '» (' + money(r[0].amount) + '). ما زلت تريده؟' + (r.length > 1 ? ' و' + (r.length - 1) + ' غيره' : ''), 'info', '🛍', () => go('more', 'wish')); } catch (e) {}
  try { if (+L.today().slice(8) <= 7) { const k = L.prevMonth(L.mkey(L.today())); if (L.monthEnd(k) >= S.x.openDate && !LS.get('flousi-wrap-' + k)) add('شهرك (' + mName(k) + ') جاهز في «شهري»', 'ok', '🎴', () => go('insights', 'wrap', { k })); } } catch (e) {}
  try { const X = FD.seasons(S), x = X.find(e => LS.get('flousi-season-' + e.id) !== 'off'); if (x) add(x.n + ' بعد ' + x.days + ' يوماً: جنّب ' + money(x.weekly) + ' أسبوعياً', 'info', x.ic, null, { open: 'season' }); } catch (e) {}
  try { L.budget(S).filter(x => x.limit > 0 && (x.over || x.near || x.pace)).forEach(x => add((x.over ? 'تجاوزت حد «' : 'اقتربت من حد «') + x.g + '»: ' + money(x.spent) + ' من ' + money(x.limit), x.over ? 'red' : 'warn', '📏', () => go('insights', 'wrap', { tab: 'limits' }))); } catch (e) {}
  try { decDue().forEach(d => add('حان موعد نتيجة قرارك: ' + d.label + ' (' + d.when + ')', 'info', '🧭', () => go('insights', 'decisions'))); } catch (e) {}
  try { if (S.x.rates.length && userAccts(a => a.cur === 'USD').length) { const n = Math.round((Date.parse(L.today()) - Date.parse(S.x.rates[S.x.rates.length - 1].d)) / 864e5); if (n > 14) add('سعر الصرف المعتمد عمره ' + n + ' يوماً. حدّثه من نبض السوق', 'warn', '💱', () => go('nabd', null, { t: 'now', open: 'prices' })); } } catch (e) {}
  try { FD.wealthNotes(S).filter(n => FM.savings(S) || !n.t.startsWith('سيولتك تكفي')).forEach(n => add(n.t, n.lv === 'warn' ? 'warn' : n.lv === 'ok' ? 'ok' : 'info', n.lv === 'ok' ? '✓' : 'ℹ', () => go('accts'))); } catch (e) {}
  const O = { red: 0, warn: 1, ok: 2, info: 3 }; return out.map((x, i) => ({ ...x, i })).sort((a, b) => (O[a.lv] ?? 3) - (O[b.lv] ?? 3) || a.i - b.i); }
function upnLine(x) { const tap = () => { if (x.open) { UPN_OPEN = UPN_OPEN === x.open ? null : x.open; render(); } else if (x.go) x.go(); };
  return h('div', { class: 'upn lv-' + x.lv }, h('button', { type: 'button', class: 'upnb', onclick: tap }, h('i', {}, x.ic || '•'), h('span', {}, x.t)),
    x.x ? h('button', { type: 'button', class: 'upnx', 'aria-label': 'إخفاء اليوم', onclick: () => { x.x(); render(); } }, '×') : null); }
function upnSect(st) { const I = upnItems(st), top = I.slice(0, 3), rest = I.slice(3);
  return h('section', { class: 'upns' }, h('h2', {}, 'يهمّك الآن'), I.length ? top.map(upnLine) : h('p', { class: 'mut' }, '✓ لا شيء يحتاج انتباهك الآن. ' + (L.TIPS && L.TIPS.length ? L.TIPS[new Date().getDate() % L.TIPS.length] : '')),
    rest.length ? fold('المزيد (' + rest.length + ')', false, rest.map(upnLine)) : null, advHiddenNote(),
    UPN_OPEN === 'season' ? seasonCard() : null,
    h('div', { class: 'quick' }, btn('صفحة المستشار', () => go('insights', 'advisor'), 'alt mini'))); }
SCREENS.home = () => {
  if (!S.x.openDate && !S.x.set.featDone) return firstRunFeat();
  if (!S.x.openDate) return h('div', {}, h('div', { class: 'hdr' }, h('h1', {}, 'أهلاً بك في فلوسي'), h('button', { class: 'gear', 'aria-label': 'الإعدادات والأدوات', onclick: () => go('more') }, '⚙')), h('p', { class: 'mut' }, 'ثلاث خطوات فقط لتبدأ. لديك نسخة احتياطية؟ ⚙ ثم «النسخ الاحتياطي والتصدير» لاستعادتها.'),
    h('div', { class: 'card' }, h('h2', {}, '1. ما تملكه اليوم'), h('p', { class: 'mut' }, 'نقد، فيزا، دولار. تبدأ منها.'), btn('ابدأ الخطوة 1', () => go('accts', 'open'))),
    h('div', { class: 'card dim' }, h('h2', {}, '2. الراتب'), h('p', { class: 'mut' }, 'يُفتح بعد الخطوة 1: «أموالي» ← «+ إضافة» ← «بند متكرر أو الراتب».')),
    h('div', { class: 'card dim' }, h('h2', {}, '3. الذهب والفضة'), h('p', { class: 'mut' }, 'يُفتح بعد الخطوة 1: «أموالي» ← «الصندوق الذهبي» ← «كانت عندي قبل البدء».')));
  tickTimers.forEach(clearInterval); tickTimers = [];
  const st = L.status(S), p = L.panel(S), ex = exclInfo(), dm = p.dMonth, lv = availLevel(st);
  const hero = sect(ti('تستطيع أن تصرف اليوم', 'المتاح للصرف'), animNum(h('div', { class: 'big ' + lv[0], onclick: () => go('insights', 'wrap') }), st.avail, 'avail', money), h('p', { class: 'mut ' + lv[0] }, lv[1]), nwTrend(),
    row(ti('السائل'), money(st.liq)), row('دخل هذا الشهر', money(st.income)), row('مصروف هذا الشهر', money(st.expense)), row('المتبقي من دخل الشهر', sgn(st.left)),
    h('div', { class: 'r wbig' }, h('span', {}, ti('صافي الثروة')), h('span', {}, animNum(h('b', {}), p.nw - ex.amt, 'nw', money), dm == null ? null : h('small', { class: dm < 0 ? 'badc' : 'okc' }, ' ' + (dm > 0 ? '▲ +' : dm < 0 ? '▼ ' : '') + L.fmt(dm)))),
    ex.names.length ? h('p', { class: 'mut' }, 'دون: ' + ex.names.join('، ')) : null, monthsShield()); hero.classList.add('hero');
  const liqIq = userAccts(a => a.kind === 'asset' && a.liquid && a.cur === 'IQD'), recon = () => liqIq.length === 1 ? go('accts', 'recon', { id: liqIq[0].id }) : go('accts', 'recon', {});
  return h('div', {}, h('div', { class: 'hdr' }, h('h1', {}, 'فلوسي'), h('button', { class: 'gear', 'aria-label': 'الإعدادات والأدوات', onclick: () => go('more') }, '⚙')),
    hero, decisionCard(),
    h('div', { class: 'qgrid qhome' }, qk('minus', 'مصروف', () => go('ops', null, { kind: 'expense' })), qk('plus', 'دخل', () => go('ops', null, { kind: 'income' })), qk('ops', 'تحويل', () => go('ops', null, { kind: 'transfer' }), 1), qk('tag', 'طابق', recon, 1)),
    fOn('nabd') ? marketLine() : null, upnSect(st)); };
