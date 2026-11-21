'use strict'; // جزء من الواجهة (f1-v4.13): مقسوم حرفياً من app.js بالترتيب نفسه
// ===== نبض السوق (f1-v3، المرحلة 1): الأسعار والاقتصاد — عرض فقط، لا يكتب شيئاً في بياناتك =====
const NB = { tried: false };
const nI = n => Math.round(n).toLocaleString('en-US'), nD = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function nWhen(t) { if (!t) return ''; if (/^\d{4}-\d{2}-\d{2}$/.test(t)) { const [y, m, d] = t.split('-').map(Number); return d + ' ' + ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'][m - 1] + (y !== new Date().getFullYear() ? ' ' + y : ''); }
  const d = new Date(t); if (isNaN(d)) return ''; const hm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), day = L.iso(d), today = L.today(), y = L.iso(new Date(Date.now() - 864e5));
  return day === today ? 'اليوم ' + hm : day === y ? 'أمس ' + hm : nWhen(day) + ' ' + hm; }
const nChip = (live, t, fetched) => h('span', { class: 'chip ' + ({ current: 'c-cur', stale: 'c-old', unavailable: 'c-na', review: 'c-na' })[live] }, ({ current: 'حالي', stale: 'قديم', unavailable: 'غير متاح', review: 'تجريبي' })[live] + (t ? ' · ' + (fetched ? 'جُلب ' : '') + nWhen(t) : ''));
const nT = x => x && (x.data_time || x.fetched_ok_at);
const nF = x => x && !x.data_time && !!x.fetched_ok_at; // المصدر لا يذكر تاريخاً: نعرض وقت الجلب صراحةً
// سطر مؤشر: القيمة القديمة تظهر باهتة مع «قديم» ولا تُعرض كسعر حالي
const nRow = (label, x, fmt, sub) => { if (!x) return null; const v = x.value == null ? '—' : fmt(x.value);
  return h('div', { class: 'r nrow' + (x.live === 'current' ? '' : ' nold') }, h('span', {}, label, sub ? h('small', { class: 'mut' }, ' ' + sub) : null, srcLine(x)), h('span', { class: 'nv' }, h('b', {}, v), ' ', nChip(x.live, nT(x), nF(x)))); };
// مصدر السعر تحت اسمه (المسح المحلي يُذكر بوصفه دون اسم الجهة)
const srcLine = () => null; // f1-v4.11: لا تُعرض أسماء المصادر في الواجهة (تبقى في الأرشيف)
// ===== نبض السوق الجديد (f1-v4.11): الآن · لماذا تحرّك · أموالي. كل رقم بشارة نوعه، ولا أسماء مصادر في الواجهة =====
const KCLS = { obs: 'k-obs', calc: 'k-calc', est: 'k-est', model: 'k-mod' }, LIVE_AR = { current: 'حالي', stale: 'قديم', unavailable: 'غير متاح', review: 'تجريبي' };
function kTip(kind, x) { let t = $('#tipbox'); if (!t) { t = h('div', { id: 'tipbox', role: 'dialog' }); t.onclick = () => { t.hidden = true; }; document.body.append(t); }
  const K = FP.KIND[kind], tm = x && (x.t || x.data_time || x.fetched_ok_at);
  t.replaceChildren(h('b', {}, K[0]), h('p', {}, K[1]), x && x.live ? h('p', {}, 'الحالة: ' + (LIVE_AR[x.live] || '—') + (tm ? ' · آخر تحديث: ' + nWhen(tm) : '')) : null, h('small', {}, 'اضغط للإغلاق')); t.hidden = false; }
// شارة النوع: تُضغط لترى معناها ووقت التحديث (بديل صفحة «الثقة»)
const kb = (kind, x) => h('button', { class: 'kb ' + KCLS[kind], type: 'button', 'aria-label': 'نوع الرقم: ' + FP.KIND[kind][0], onclick: e => { e.stopPropagation(); kTip(kind, x); } }, FP.KIND[kind][0]);
const oldChip = x => x && x.live && x.live !== 'current' ? h('span', { class: 'chip ' + (x.live === 'stale' ? 'c-old' : 'c-na') }, LIVE_AR[x.live]) : null;
// سطر رقم: القيمة القديمة باهتة مع «قديم»، ولا تُعرض كأنها حالية
const kRow = (label, val, kind, x, sub) => h('div', { class: 'r nrow' + (x && x.live && x.live !== 'current' ? ' nold' : '') }, h('span', {}, label, sub ? h('small', { class: 'src' }, sub) : null), h('span', { class: 'nv' }, h('b', {}, val), ' ', kb(kind, x), oldChip(x)));
function gapMeter(g) { const v = Math.max(0, Math.min(30, g.v)), pct = v / 30 * 100, ser = FP.gapSeries();
  return h('div', { class: 'gapm' }, h('div', { class: 'r' }, h('span', {}, ti('الفجوة بين الرسمي والموازي')), h('span', { class: 'nv' }, h('b', {}, (Math.round(g.v * 10) / 10) + '%'), ' ', kb('calc', g), oldChip(g))),
    h('div', { class: 'gmt' }, h('i', { style: 'width:' + pct.toFixed(1) + '%' }), [5, 10, 20].map(m => h('u', { style: 'right:' + (m / 30 * 100) + '%' }))), h('div', { class: 'gml' }, h('span', {}, '0%'), h('span', {}, '10%'), h('span', {}, '20%'), h('span', {}, '30%')),
    ser.length > 2 ? h('div', {}, h('p', { class: 'mut' }, 'الفجوة يوماً بيوم منذ بدء السجل'), spark(ser, '#b4412f')) : h('p', { class: 'mut' }, 'منحنى الفجوة يظهر بعد تجمّع 3 أيام في السجل.')); }
function nabdNow() {
  const I = FN.ind, rf = FN.ref(), U = FP.units(), m21 = U.find(u => u.id === 'm21'), g = I('xau_usd'), sv = I('xag_usd'), of = I('usd_iqd_official'), gp = FP.gap(), d1 = FP.decompose('d'), gsr = FN.der('gsr'), dx = I('dxy');
  return [
    m21 && m21.iqd != null ? h('section', { class: 'card phero2' + (m21.live === 'current' ? '' : ' nold') }, h('div', { class: 'r' }, h('span', {}, 'مثقال ذهب 21 (5 غرام)'), h('span', {}, kb('calc', m21), oldChip(m21))),
      h('div', { class: 'big' }, nI(m21.iqd), h('small', {}, ' د.ع')), h('p', { class: 'mut' }, nD(m21.usd) + ' $ · من الأونصة العالمية بسعر الدولار المرجعي'), d1.ok ? h('p', { class: 'dline' }, FP.sentence(d1)) : null) : null,
    sect('الدولار في بغداد', rf ? kRow(ti('السعر المرجعي (لكل 100$)', 'السعر المرجعي'), nI(rf.value), rf.kind, rf, rf.basis === 'mid' ? 'متوسط البيع والشراء' : 'سعر البورصة (لا بيع وشراء منشوران)') : h('p', { class: 'mut' }, 'سعر الدولار الموازي غير متاح الآن.'),
      rf && rf.buy ? kRow('البيع / الشراء', nI(rf.sell) + ' / ' + nI(rf.buy), 'obs', rf) : null,
      of && of.value != null ? kRow('السعر الرسمي (للدولار)', nI(of.value), 'obs', of) : null, gp ? gapMeter(gp) : null),
    sect('الذهب والفضة بالدينار والدولار', h('p', { class: 'mut' }, 'تحويل حسابي من السعر العالمي بسعر الدولار المرجعي · بلا مصنعية ولا علاوة تاجر · ', kb('calc', m21)),
      U.length ? h('table', {}, h('tr', {}, h('th', {}, 'الوحدة'), h('th', {}, 'دولار'), h('th', {}, 'دينار')), U.map(u => h('tr', { class: u.live === 'current' ? '' : 'nold' }, h('td', {}, u.label), h('td', { class: 'n' }, nD(u.usd)), h('td', { class: 'n' }, u.iqd == null ? '—' : nI(u.iqd))))) : h('p', { class: 'mut' }, 'غير متاح الآن.')),
    sect('السعر العالمي', g ? kRow('الذهب (أونصة)', g.value == null ? '—' : nD(g.value) + ' $', 'obs', g) : null, sv ? kRow('الفضة (أونصة)', sv.value == null ? '—' : nD(sv.value) + ' $', 'obs', sv) : null,
      gsr && gsr.value != null ? kRow(ti('نسبة الذهب إلى الفضة'), String(gsr.value), 'calc', gsr) : null, dx && dx.value != null ? kRow(ti('مؤشر الدولار (بمعادلة DXY)', 'DXY'), nD(dx.value), 'calc', dx) : null),
    h('p', { class: 'mut' }, 'اضغط أي شارة لترى نوع الرقم ووقت تحديثه.')];
}
const pc = x => (x >= 0 ? '+' : '−') + Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '%';
function decBars(d) { const mx = Math.max(0.01, Math.abs(d.fromOunce), Math.abs(d.fromDollar)), bar = (l, v, c) => h('div', { class: 'dbar' }, h('span', {}, l), h('div', { class: 'dbt' }, h('i', { class: v >= 0 ? 'up' : 'dn', style: 'width:' + (Math.abs(v) / mx * 50).toFixed(1) + '%;background:' + c })), h('b', {}, pc(v)));
  return h('div', { class: 'decb' }, bar('من الأونصة', d.fromOunce, '#c9a227'), bar('من الدولار', d.fromDollar, '#2e86c1'), h('div', { class: 'r' }, h('span', {}, 'المثقال: ' + nI(d.m0) + ' ← ' + nI(d.m1)), h('b', {}, pc(d.total)))); }
function nabdWhy() {
  const w = view.p.w || 'd', d = FP.decompose(w), r = view.p.r || '3m', m = view.p.m || 'gold', A = FN.analyze(), I = FN.ind, pct = v => nD(v) + '%', cot = v => (v.net_noncommercial > 0 ? '+' : '') + nI(v.net_noncommercial) + ' (' + (v.change_week > 0 ? '+' : '') + nI(v.change_week || 0) + ' أسبوعياً)';
  const pick = (k, v) => go('nabd', null, { ...view.p, t: 'why', [k]: v }), N = FN.news(), fr = FN.der('fed_target_range'), MM = FP.memory();
  return [
    sect(ti('تفكيك حركة المثقال', 'تفكيك الحركة'), seg(FP.WIN.map(x => [x[0], x[1]]), w, k => pick('w', k)),
      d.ok ? h('div', {}, h('p', {}, FP.sentence(d), ' ', kb('calc', { live: 'current', t: (I('xau_usd') || {}).data_time })), decBars(d)) : h('p', { class: 'mut' }, d.why + '.'),
      h('p', { class: 'mut' }, 'المعادلة: تغيّر المثقال ≈ تغيّر الأونصة + تغيّر الدولار (باللوغاريتم، فالجمع دقيق).')),
    sect(ti('القوى المؤثرة في الذهب (أفق 3–5 سنوات)', 'العوامل المؤثرة'), h('p', { class: 'mut' }, 'قراءة كل عامل الآن واتجاهه ', kb('model')),
      A.factors.map(f => h('div', { class: 'sig' }, h('span', { class: 'dot', style: 'background:' + SIGC[f.sig] }), h('div', {}, h('b', {}, f.label), f.value != null ? h('span', {}, ' — ', h('bdi', { dir: 'ltr' }, String(f.value))) : null, h('div', { class: 'mut' }, f.reason + ' · الوزن ' + f.w + '%')))),
      A.verdict ? h('div', { class: 'verdict' }, h('b', {}, A.verdict), ' ', kb('model'), h('div', { class: 'mut' }, 'الثقة: ' + A.conf + ' · ' + A.used + ' من ' + A.total + ' عوامل متاحة')) : h('p', { class: 'mut' }, 'لا خلاصة الآن: العوامل المتاحة أقل من 4 أو بياناتها قديمة.'),
      h('p', { class: 'mut' }, 'قاعدة ثابتة تنظّم القرار وتمنع الاندفاع. ليست توقعاً لسعر، ولم تُختبر تاريخياً بعد، فلا نسبة دقة لها.')),
    sect((m === 'gold' ? 'الذهب' : 'الفضة') + ' — المنحنى (أونصة بالدولار)', seg([['gold', 'الذهب'], ['silver', 'الفضة']], m, k => pick('m', k)), seg(RANGES.map(x => [x[0], x[1]]), r, k => pick('r', k)), metalChart(m, r)),
    A.gsr ? sect('نسبة الذهب إلى الفضة: ' + A.gsr.v, gsrGauge(A.gsr.v), h('p', {}, A.gsr.tip)) : null,
    sect('الاقتصاد الأمريكي', fr && fr.value ? kRow(ti('الفائدة الأمريكية (النطاق الرسمي)', 'الفائدة الأمريكية'), fr.value + '%', 'obs', { ...fr, t: nT(I('fed_target_upper')) }) : null,
      [['real10y', ti('العائد الحقيقي 10 سنوات', 'العائد الحقيقي')], ['ust10y', ti('عائد سندات 10 سنوات', 'عائد السندات')], ['breakeven10y', ti('توقعات التضخم 10 سنوات', 'توقعات التضخم')], ['cpi_yoy', ti('التضخم السنوي CPI', 'التضخم CPI')], ['unrate', ti('البطالة')], ['usd_broad', ti('الدولار الموسّع للفدرالي', 'الدولار الموسّع')]]
        .map(([id, l]) => { const x = I(id); return x && x.value != null ? kRow(l, id === 'usd_broad' ? nD(x.value) : pct(x.value), 'obs', { ...x, t: nT(x) }) : null; }),
      [['cot_gold', 'مضاربو الذهب (COT)'], ['cot_silver', 'مضاربو الفضة (COT)']].map(([id, l]) => { const x = I(id); return x && x.value ? kRow(ti(l, 'COT'), cot(x.value), 'obs', { ...x, t: nT(x) }) : null; })),
    N.items.length || N.week ? sect('ماذا تغيّر', N.week ? h('p', {}, N.week) : null, N.items.slice(0, 10).map(i => h('div', { class: 'news' + (i.lv === 'old' ? ' nold' : '') }, h('div', { class: 't' }, i.t), h('div', { class: 'mut' }, (i.when ? nWhen(i.when) : '') + (i.lv === 'old' ? ' · قديم' : '')))),
      h('p', { class: 'mut' }, 'يُكتب آلياً من الأرقام نفسها.')) : null,
    sect(ti('الذاكرة: أحداث وما فعله الذهب بعدها', 'الذاكرة'), MM.map(e => h('div', { class: 'mem' }, h('div', { class: 'r' }, h('span', {}, h('b', {}, nWhen(e.d)), ' ', h('small', { class: 'mut' }, e.k === 'iq' ? 'العراق' : 'الفائدة الأمريكية')), e.g30 != null || e.g90 != null ? kb('calc') : null),
      h('p', {}, e.t), h('p', { class: 'mut' }, e.g30 == null && e.g90 == null ? 'لم يمرّ وقت كافٍ أو لا تكفي البيانات لقياس ما بعده.' : 'الذهب بعد 30 يوماً: ' + (e.g30 == null ? '—' : pc(e.g30)) + ' · بعد 90 يوماً: ' + (e.g90 == null ? '—' : pc(e.g90))))),
      h('p', { class: 'mut' }, 'ما حدث بعد حدث ما لا يعني أنه سيتكرر؛ هذه ذاكرة للمقارنة لا توقع.'))];
}
function salaryPowerEl() { const P = FP.salaryPower(S);
  if (!P.hasSalary && !P.rows.length) return h('p', { class: 'mut' }, 'سجّل راتبك (بنداً متكرراً مُعلَّماً «راتب» أو دخلاً من مصدر «الراتب») ليظهر هنا كم مثقالاً وكم دولاراً يساوي.');
  if (!P.last) return h('p', { class: 'mut' }, 'لا تتوفر أسعار في السجل بعد لحساب قيمة راتبك.');
  const L1 = P.last, mx = Math.max(...P.rows.map(x => x.mithqal));
  return h('div', {}, h('div', { class: 'spw' }, h('div', {}, h('small', {}, 'راتب ' + kLab(L1.k)), h('b', {}, String(L1.mithqal)), h('span', {}, 'مثقال ذهب 21')), h('div', {}, h('small', {}, ' '), h('b', {}, nI(L1.usd)), h('span', {}, 'دولار بالسعر المرجعي'))),
    h('p', { class: 'mut' }, money(L1.salary) + (L1.est ? ' (الراتب المتوقع؛ لم يُسجَّل راتب هذا الشهر)' : '') + ' · متوسط مثقال الشهر ' + nI(L1.m21) + ' د.ع · ', kb(L1.est ? 'est' : 'calc')),
    P.change ? h('p', {}, 'منذ ' + kLab(P.first.k) + ': بالمثقال ', h('b', { class: P.change.mithqal < 0 ? 'bad' : 'okc' }, pc(P.change.mithqal)), ' · بالدولار ', h('b', { class: P.change.usd < 0 ? 'bad' : 'okc' }, pc(P.change.usd))) : h('p', { class: 'mut' }, 'المقارنة بين الأشهر تبدأ بعد أن يكتمل في السجل شهر ثانٍ.'),
    P.rows.length > 1 ? h('div', { class: 'spbars' }, P.rows.slice(-12).map(x => h('div', {}, h('i', { style: 'height:' + Math.max(6, x.mithqal / mx * 100).toFixed(0) + '%' }), h('small', {}, kLab(x.k))))) : null,
    h('p', { class: 'mut' }, 'يكشف إن كان راتبك يخسر قيمته بصمت حين يرتفع الدولار أو الذهب، حتى لو بقي رقمه ثابتاً بالدينار.')); }
function impactEl() { const r = FP.impact(S);
  if (r.none) return h('p', { class: 'mut' }, 'لا ذهب ولا فضة ولا دولار في أصولك، فحركة السوق لا تغيّر ثروتك مباشرة.');
  if (r.stale) return h('p', { class: 'mut' }, 'بيانات قديمة: لا يُحسب الأثر حتى تتحدث الأسعار.');
  if (r.noBase) return h('p', { class: 'mut' }, 'لا يوجد إغلاق سابق في السجل بعد للمقارنة. يظهر الأثر من الغد.');
  const it = (l, v) => v ? row(l, (v > 0 ? '+' : '') + money(v), v < 0 ? 'bad' : 'okc') : null;
  return h('div', {}, h('div', { class: 'r wbig' }, h('span', {}, 'ثروتك تغيّرت بسبب السوق'), h('b', { class: r.d.total < 0 ? 'bad' : 'okc' }, (r.d.total > 0 ? '+' : '') + money(r.d.total))), it('من ذهبك', r.d.gold), it('من فضتك', r.d.silver), it('من دولارك', r.d.usd),
    h('p', { class: 'mut' }, 'مقارنة بإغلاق ' + nWhen(r.since) + ' بأسعار السوق والسعر المرجعي · ', kb('calc'), ' · لا يغيّر أسعارك المسجّلة ولا حساباتك.')); }
function alertsEl() { const A = (S.x.set.palerts || []), hits = FP.alertsCheck(S).map(x => x.a.id), st = view.p.pa = view.p.pa || { k: 'usd', op: '>', v: '' };
  const kSel = h('select', { onchange: e => { st.k = e.target.value; } }, Object.entries(FP.AK).map(([k, [l]]) => h('option', { value: k, selected: k === st.k }, l)));
  const oSel = h('select', { onchange: e => { st.op = e.target.value; } }, [['>', 'إذا تجاوز'], ['<', 'إذا نزل تحت']].map(([k, l]) => h('option', { value: k, selected: k === st.op }, l)));
  const vIn = h('input', { inputmode: 'decimal', placeholder: 'الحد', value: st.v, oninput: e => { st.v = e.target.value; } });
  return h('div', {}, A.length ? A.map(a => h('div', { class: 'r' }, h('span', {}, (hits.includes(a.id) ? '🔔 ' : '') + FP.AK[a.k][0] + (a.op === '>' ? ' ≥ ' : ' ≤ ') + (a.k === 'xau' ? nD(a.v) + '$' : nI(a.v))),
      h('button', { class: 'mini alt', onclick: () => act(() => FP.alertDel(S, a.id), 'حُذف التنبيه') }, 'حذف'))) : h('p', { class: 'mut' }, 'لا تنبيهات. أضف حداً يهمك، فيظهر في شريط الرئيسية حين يتحقق عند فتح التطبيق.'),
    h('div', { class: 'two' }, h('label', { class: 'f' }, h('span', {}, 'المؤشر'), kSel), h('label', { class: 'f' }, h('span', {}, 'الشرط'), oSel)), h('label', { class: 'f' }, h('span', {}, 'الحد'), vIn),
    btn('أضف التنبيه', async () => { const v = Number(L.norm(String(st.v || '')) || NaN); const ok = await act(() => { FP.alertAdd(S, { k: st.k, op: st.op, v }); return true; }, 'أُضيف التنبيه'); if (ok) { st.v = ''; render(); } }, 'alt mini'),
    h('p', { class: 'mut' }, 'يُفحص فقط عندما تكون الأسعار حالية؛ السعر القديم لا يطلق تنبيهاً. التنبيه داخل التطبيق فقط.')); }
// ===== أرشيف السوق ومحرك الاكتشافات (f1-v4.12): المحرك اختياري ومتوقف افتراضياً، ولا يعمل فعلياً قبل 90 يوماً من السجل =====
const DISC_KEY = 'flousi-disc', discLoad = () => { try { return JSON.parse(localStorage.getItem(DISC_KEY) || 'null'); } catch (e) { return null; } }, discSave = l => { try { localStorage.setItem(DISC_KEY, JSON.stringify(l)); } catch (e) { /* لا بأس */ } };
const DST = { held: ['صمد', 'okc'], fail: ['لم يصمد', 'bad'], wait: ['ينتظر بيانات', ''], na: ['—', ''] };
function nabdArchive() {
  const D = FP._days(), ks = Object.keys(D).sort(), cnt = k => ks.filter(d => D[d][k] != null).length, on = !!S.x.set.discOn, n = ks.length, need = FX.MIN_DAYS;
  let log = discLoad();
  if (on && n >= need && (!log || log.lastRun !== L.today())) { try { log = FX.update(log, D, L.today()); discSave(log); } catch (e) { /* لا يُسقط الصفحة */ } }
  const items = log ? Object.values(log.items).sort((a, b) => a.first < b.first ? 1 : -1) : [];
  return [h('p', {}, btn('رجوع إلى نبض السوق', () => go('nabd', null, { t: 'why' }), 'alt mini')),
    sect('أرشيف السوق', n ? h('div', {}, row('أيام مسجّلة', String(n)), row('من', nWhen(ks[0])), row('إلى', nWhen(ks[n - 1])),
      row('أيام الذهب والفضة', String(cnt('xau_usd'))), row('أيام الدولار في بغداد', String(ks.filter(d => D[d].usd_iqd_ref != null || D[d].usd_iqd_parallel != null).length)), row('أيام السعر الرسمي', String(cnt('usd_iqd_official'))))
      : h('p', { class: 'mut' }, 'لم يُحمَّل السجل بعد.'),
      h('p', { class: 'mut' }, 'هذا ملخصه اليومي. الأرشيف الكامل (كل قيمة بوقتها، يُضاف إليه ولا يُحذف منه شيء، مع نسخة احتياطية يومية) محفوظ على GitHub ويكبر تلقائياً.')),
    sect('محرك الاكتشافات (تجريبي)', h('div', { class: 'r' }, h('span', {}, 'تشغيل المحرك'), swBtn(on, () => act(() => { S.x.set.discOn = !on; }, on ? 'أُوقف المحرك' : 'شُغّل المحرك'), 'تشغيل محرك الاكتشافات')),
      h('p', { class: 'mut' }, 'يبحث في السجل عن علاقات متكررة: الذهب والدولار، الدولار في بغداد، من يسبق من، أيام الأسبوع، فجوة الدولار، ما بعد الأيام الحادة، الفضة مقابل الذهب. كل علاقة تمر بتصحيح للاختبارات المتعددة، وحد أدنى لحجم الأثر و8 حالات، و3 اكتشافات في الأسبوع كحد أقصى، ثم يُعاد اختبارها بعد 30 و90 يوماً على بيانات جديدة.'),
      h('div', { class: 'lbar' }, h('div', { class: 'r' }, h('span', {}, 'الأيام المتجمّعة من ' + need), h('b', {}, String(Math.min(n, need)))), h('div', { class: 'lt' }, h('i', { style: 'width:' + Math.min(100, n / need * 100).toFixed(1) + '%' }))),
      n < need ? h('p', { class: 'warnc' }, 'لا ينفع قبل ' + need + ' يوماً من السجل: بقي ' + (need - n) + ' يوماً تقريباً. ' + (on ? 'المحرك مفعّل وسيبدأ وحده عند اكتمالها.' : 'يمكنك تفعيله الآن ليبدأ وحده عند اكتمالها.')) : null,
      on && n >= need && log && log.lastScan ? h('p', { class: 'mut' }, 'آخر فحص ' + nWhen(log.lastRun) + ': اختُبرت ' + log.lastScan.tested + ' علاقة، واجتاز الضوابط ' + log.lastScan.found + '.') : null,
      on && n >= need && !items.length ? h('p', { class: 'mut' }, 'لا اكتشاف اجتاز الضوابط بعد. هذا طبيعي ومقصود: المحرك لا يعرض إلا ما يصمد إحصائياً.') : null,
      items.map(it => h('div', { class: 'mem' }, h('div', { class: 'r' }, h('span', {}, h('b', {}, FX.FAM_AR[it.fam] || it.fam), ' ', h('small', { class: 'mut' }, nWhen(it.first))), kb('model')),
        h('p', {}, it.text), h('p', { class: 'mut' }, it.n + ' حالة · احتمال الصدفة ' + (it.p < 0.001 ? 'أقل من 0.1%' : (Math.round(it.p * 1000) / 10) + '%')),
        h('p', { class: 'mut' }, [30, 90].map(k => 'بعد ' + k + ' يوماً: ' + (it.ev[k] ? DST[it.ev[k].st][0] : 'لم يحن')).join(' · ')))),
      h('p', { class: 'mut' }, 'الاكتشاف وصف لما حدث في الماضي، وليس توقعاً ولا نصيحة شراء أو بيع.'))];
}
function nabdMine() {
  return [privEl(sect('أثر السوق على أموالك اليوم', impactEl())), privEl(sect('راتبك بالمثقال والدولار', salaryPowerEl())), sect('تنبيهاتك', alertsEl()), sect('', h('p', { class: 'mut' }, 'استشارات السوق التي تخصك صارت في صفحة المستشار الموحّدة، وأهمها في «يهمّك الآن».'), btn('صفحة المستشار', () => go('insights', 'advisor'), 'alt mini'))];
}
// ---- رسوم SVG داخل التطبيق (بلا مكتبات ولا اتصال خارجي؛ CSP كما هي) ----
// ملاحظة أمان: كل نص يدخل هذا الـ SVG يمر عبر esc()، وكل الأرقام محسوبة محلياً؛ لا يدخل إليه نص من مصدر خارجي إلا بعد الهروب
const svgEl = (html, cls) => { const d = h('div', { class: 'chart ' + (cls || '') }); d.innerHTML = html; return d; };
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// pts: [[ms، قيمة]] مرتبة. يعيد div فيه SVG: مساحة متدرجة، ومحور قيم (أعلى/أدنى)، وتسميات زمنية، ونقطة أخيرة
function lineChart(pts, o = {}) {
  const W = 340, H = o.h || 140, P = 8, col = o.color || 'var(--acc)', fmt = o.fmt || (v => Math.round(v).toLocaleString('en-US'));
  if (!pts || pts.length < 2) return h('p', { class: 'mut' }, o.empty || 'لا تتوفر نقاط كافية لهذه الفترة بعد.');
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), lo = Math.min(...ys), hi = Math.max(...ys), sx = t => P + (t - x0) / ((x1 - x0) || 1) * (W - 2 * P - 34), sy = v => P + (hi - v) / ((hi - lo) || 1) * (H - 2 * P);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1)).join(' '), last = pts[pts.length - 1], id = 'g' + Math.random().toString(36).slice(2, 8);
  const lab = (o.labels || []).map(([t, s], i, a) => `<text x="${sx(t).toFixed(0)}" y="${H + 14}" font-size="10" text-anchor="${i === 0 ? 'start' : i === a.length - 1 ? 'end' : 'middle'}" style="fill:var(--mute)">${esc(s)}</text>`).join('');
  return svgEl(`<svg viewBox="0 0 ${W} ${H + 18}" width="100%" style="direction:ltr" role="img" aria-label="${esc(o.aria || 'رسم بياني')}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${col}" stop-opacity=".28"/><stop offset="1" style="stop-color:${col}" stop-opacity="0"/></linearGradient></defs>`
    + [0, 1, 2].map(k => `<line x1="${P}" x2="${W - 34}" y1="${(P + k * (H - 2 * P) / 2).toFixed(0)}" y2="${(P + k * (H - 2 * P) / 2).toFixed(0)}" style="stroke:var(--line)" stroke-width="1"/>`).join('')
    + (o.base != null && o.base >= lo && o.base <= hi ? `<line x1="${P}" x2="${W - 34}" y1="${sy(o.base).toFixed(1)}" y2="${sy(o.base).toFixed(1)}" style="stroke:var(--mute)" stroke-dasharray="4 4"/>` : '')
    + `<path d="${d} L${sx(last[0]).toFixed(1)},${H} L${sx(pts[0][0]).toFixed(1)},${H} Z" fill="url(#${id})"/><path d="${d}" fill="none" style="stroke:${col}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="${sx(last[0]).toFixed(1)}" cy="${sy(last[1]).toFixed(1)}" r="3.5" style="fill:${col}"/>`
    + `<text x="${W - 2}" y="${P + 4}" font-size="10" text-anchor="end" style="fill:var(--mute)">${esc(fmt(hi))}</text><text x="${W - 2}" y="${H - P + 2}" font-size="10" text-anchor="end" style="fill:var(--mute)">${esc(fmt(lo))}</text>${lab}</svg>`);
}
const spark = (pts, col) => pts && pts.length > 2 ? lineChart(pts, { h: 44, color: col, fmt: v => String(Math.round(v * 100) / 100) }) : null;
const AR_M = ['ك2', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'ت1', 'ت2', 'ك1'];
function rangeLabels(pts, r) { if (pts.length < 2) return []; const a = pts[0][0], b = pts[pts.length - 1][0], f = t => { const d = new Date(t); return r === 'd' ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : r === '5y' || r === 'y' ? AR_M[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) : d.getDate() + ' ' + AR_M[d.getMonth()]; };
  return [[a, f(a)], [(a + b) / 2, f((a + b) / 2)], [b, f(b)]]; }
const RANGES = [['d', 'يوم', 1], ['w', 'أسبوع', 7], ['3m', '3 أشهر', 92], ['y', 'سنة', 365], ['5y', '5 سنوات', 1826]];
function metalChart(metal, r) {
  const all = FN.metalSeries(metal), days = RANGES.find(x => x[0] === r)[2], end = all.length ? all[all.length - 1][0] : Date.now(), pts = all.filter(p => p[0] >= end - days * 864e5);
  const ch = pts.length > 1 ? (pts[pts.length - 1][1] / pts[0][1] - 1) * 100 : null;
  return h('div', {}, lineChart(pts, { color: metal === 'gold' ? '#c9a227' : '#8fa3ad', fmt: v => v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2), labels: rangeLabels(pts, r), aria: 'منحنى ' + (metal === 'gold' ? 'الذهب' : 'الفضة'), empty: r === 'd' || r === 'w' ? 'اللقطات خلال اليوم تتجمّع كل 30 دقيقة منذ تشغيل الجالب؛ تظهر هنا تدريجياً.' : undefined }),
    ch != null ? row('التغيّر خلال الفترة', (ch >= 0 ? '+' : '') + ch.toFixed(1) + '%', ch < 0 ? 'bad' : 'okc') : null);
}
function gsrGauge(v) { const lo = 40, hi = 110, W = 300, x = 10 + (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * (W - 20), z = [[40, 55, 'var(--acc)', 'الذهب أرخص نسبياً'], [55, 85, 'var(--mute)', 'متوازن'], [85, 110, '#c9a227', 'الفضة أرخص نسبياً']];
  return svgEl(`<svg viewBox="0 0 ${W} 52" width="100%" style="direction:ltr" role="img" aria-label="مقياس نسبة الذهب إلى الفضة">` + z.map(([a, b, c, t]) => { const x1 = 10 + (a - lo) / (hi - lo) * (W - 20), x2 = 10 + (b - lo) / (hi - lo) * (W - 20); return `<rect x="${x1.toFixed(0)}" y="16" width="${(x2 - x1).toFixed(0)}" height="10" style="fill:${c}" opacity=".5"/><text x="${((x1 + x2) / 2).toFixed(0)}" y="44" font-size="10" text-anchor="middle" style="fill:var(--mute)">${t}</text>`; }).join('')
    + `<polygon points="${(x - 6).toFixed(0)},4 ${(x + 6).toFixed(0)},4 ${x.toFixed(0)},15" style="fill:var(--ink)"/></svg>`); }
const SIGC = { 1: 'var(--ok)', 0: 'var(--wait)', '-1': 'var(--bad)', null: 'var(--line)' };
