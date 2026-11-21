'use strict';
// فلوسي — الواجهة. كل شيء محلي: التخزين IndexedDB باسم flousi (قاعدة المرحلة 0 flousi-p0 لا تُمسّ).
const $ = s => document.querySelector(s);
const h = (t, a, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a || {})) { if (n === 'class') e.className = v; else if (n.startsWith('on')) e[n] = v; else if (v !== false && v != null) e.setAttribute(n, v === true ? '' : v); }
  k.flat(9).forEach(c => { if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(c)); }); return e; };
// إن نقص ملف أو تلف فلا يتوقف هذا الملف هنا؛ الإقلاع في الأسفل يكشف ذلك ويعرض شاشة خطأ بدل «…»
const L = (() => { try { return FL; } catch (e) { return null; } })(), E = (() => { try { return FE; } catch (e) { return null; } })(), VER = 'f1-v4.3'; // ارفع VER مع V في sw.js عند كل إصدار
let S, BE, view = { tab: 'home', sub: null, p: {} }, sessionDismiss = false, integ = [], persist = null; // persist: نتيجة طلب التخزين الدائم (8.1): true مثبّت، false مرفوض، 'na' غير مدعوم، null لم يُعرف بعد // integ: نتيجة فحوصات السلامة (4.4) عند الفتح
const money = n => L.fmt(n) + ' د.ع';
const toast = (m, bad) => { const t = $('#toast'); t.textContent = m; t.className = bad ? 'bad on' : 'on'; clearTimeout(toast.t); toast.t = setTimeout(() => { t.className = ''; }, bad ? 5000 : Math.max(2200, m.length * 70)); };
const go = (tab, sub, p) => { view = { tab, sub: sub || null, p: p || {} }; render(); window.scrollTo(0, 0); };
// البند 9.2: لا عملية بتاريخ في المستقبل. يوم واحد سماحاً لفروق التوقيت. يُفحص داخل المعاملة فيُلغى كل شيء إن فشل
const futureLim = () => L.iso(new Date(Date.now() + 864e5));
function noFuture(n, g) { const lim = futureLim(), bad = [...S.tx.slice(n).map(t => t.date), ...S.goals.slice(g).map(x => x.date).filter(Boolean), ...S.x.rates.map(r => r.d), ...S.x.prices.map(r => r.d), ...(S.x.vals || []).map(r => r.d)].find(d => d > lim);
  if (bad) throw new Error('التاريخ ' + bad + ' في المستقبل. اختر تاريخ اليوم أو قبله.'); }
const act = async (fn, ok) => { try { const r = await FStore.run(BE, S, () => { const n = S.tx.length, g = S.goals.length, out = fn(); noFuture(n, g); return out; }); if (ok) toast(ok); render(); return r; } catch (e) { toast(e.message || String(e), true); } };
const userAccts = f => Object.values(S.acc).filter(a => (a.type || /^u\d+$/.test(a.id)) && !a.metal && !a.hidden && (!f || f(a))); // المخفي لا يظهر في النماذج
const accOpts = f => userAccts(f).map(a => [a.id, a.name + (a.cur === 'USD' ? ' ($)' : '')]);
const decOf = id => S.acc[id].cur === 'USD' ? 2 : 0;
const amtStr = (n, cur) => cur === 'USD' ? L.fmtUsd(n) : money(n);
const sect = (title, ...k) => h('section', {}, title ? h('h2', {}, title) : null, ...k);
// قسم قابل للطيّ للنماذج النادرة (مطويّ افتراضياً؛ يُفتح فقط إن طُلب)
const pubEl = e => { e.classList.add('pub'); return e; }, privEl = e => { e.classList.add('priv'); return e; }, pubSect = (...a) => pubEl(sect(...a)); // pub: أسعار سوق عامة لا تُخفى
const fold = (title, open, ...k) => h('details', { class: 'fold', open: open ? true : null }, h('summary', {}, title), ...k);
// أيقونات SVG ثابتة (نصوص مكتوبة هنا فقط، لا يدخلها أي إدخال من المستخدم)
const ICO = { home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>', ops: '<path d="M7 4v14M3 14l4 4 4-4M17 20V6M13 10l4-4 4 4"/>', accts: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/>', assets: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20"/>', nabd: '<path d="M3 12h4l3-8 4 16 3-8h4"/>', insights: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', salary: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>', tag: '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.2"/>', food: '<path d="M6 3v8a2 2 0 0 0 2 2v8M10 3v6M16 3c-2 2-2 6 0 8v10"/>', car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18M7 19v-3M17 19v-3"/>', bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', down: '<path d="M12 4v14M6 12l6 6 6-6"/>' };
const ico = n => { const s = h('span', { class: 'ic', 'aria-hidden': 'true' }); s.innerHTML = '<svg viewBox="0 0 24 24">' + (ICO[n] || ICO.tag) + '</svg>'; return s; };
const catIco = l => ico(/راتب|دخل/.test(l) ? 'down' : /تحويل|مطابقة/.test(l) ? 'ops' : /طعام|مطعم|مواد|غذاء/.test(l) ? 'food' : /سيارة|وقود|نقل|مواصلات/.test(l) ? 'car' : /فواتير|اتصالات|كهرباء|إنترنت/.test(l) ? 'bolt' : 'tag');
const backBtn = f => { const b = h('button', { class: 'back', type: 'button', 'aria-label': 'رجوع', onclick: f }); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'; b.append(h('span', {}, 'رجوع')); return b; };
const btn = (t, f, cls) => h('button', { class: cls || '', onclick: f }, t);
// ===== f1-v3.2: شرح المصطلحات (ⓘ)، النسخ بضغطة، واعتماد سعر نبض السوق =====
// GLOSS: شرح مختصر لكل مصطلح. لإضافة مصطلح جديد: أضفه هنا ثم استعمل ti('العنوان', 'المفتاح')
const GLOSS = {
  'المتاح للصرف': 'المال السائل عندك (نقد وبنك وفيزا) بعد طرح ما خصّصته للأهداف. هذا ما تستطيع صرفه دون أن تمس أهدافك.',
  'السائل': 'مجموع ما يمكنك استعماله فوراً: النقد والحسابات المصرفية والفيزا والدولار بقيمته بالدينار. لا يشمل الذهب والعقار.',
  'صافي الثروة': 'كل ما تملكه (نقد، دولار، ذهب، فضة، عقار...) ناقص ما عليك من التزامات وديون. يرتفع بالادخار وبارتفاع قيمة أصولك.',
  'غير محقق': 'ربح أو خسارة على الورق بسبب تغيّر الأسعار، ولا يصبح حقيقياً إلا عند البيع.',
  'محقق': 'ربح أو خسارة صار فعلياً لأنك بعت أو صرفت فعلاً بسعر مختلف عن سعر الشراء.',
  'متوسط التكلفة': 'متوسط السعر الذي اشتريت به دولارك عبر كل مرات الشراء. يُقارن بسعر اليوم لمعرفة ربحك أو خسارتك.',
  'القيمة المعدنية النظرية': 'قيمة المعدن الخالص في القطعة حسب سعر الأونصة وسعر الصرف، بلا مصنعية. ما يدفعه لك الصائغ عند البيع يكون عادة أقل منها قليلاً.',
  'جسر صافي الثروة': 'يفسّر لماذا تغيّرت ثروتك خلال الشهر: ما ادخرته، وما ربحته أو خسرته فعلياً، وفروقات العدّ، وتغيّر الأسعار.',
  'المطابقة': 'حين تعدّ نقدك فتجده مختلفاً عن المسجّل، تسجّل «مطابقة» فيُصحَّح الرصيد ويظهر الفرق هنا.',
  'التخصيص': 'حجز مبلغ لهدف دون تحريكه من حسابك. يقلّ «المتاح للصرف» ولا تقلّ ثروتك.',
  'الجمعية': 'الجمعية المعروفة: تدفع قسطاً شهرياً وتقبض المبلغ كاملاً في دورك. قبل دورك هي مال لك عند الجمعية، وبعد القبض تصبح الأقساط الباقية التزاماً عليك.',
  'العوامل المؤثرة': 'سبعة عوامل معروفة تؤثر في الذهب على المدى المتوسط. لكل عامل إشارة (داعم، محايد، ضاغط) ووزن، ومنها تُبنى الخلاصة. لا تتنبأ بالسعر.',
  'نسبة الادخار': 'كم بقي من دخلك بعد المصروف، كنسبة مئوية. 20% فما فوق جيدة، وأقل من 10% تحتاج مراجعة.',
  'توزيع الأصول': 'كيف تتوزع ثروتك بين النقد والدولار والذهب والفضة والعقار. التركّز الكبير في نوع واحد يزيد أثر أي هبوط فيه.',
  'نسبة الذهب إلى الفضة': 'كم أونصة فضة تساوي أونصة ذهب واحدة. فوق 80 تكون الفضة رخيصة نسبياً، وتحت 60 تكون غالية نسبياً.',
  'التحويل الحسابي': 'سعر الذهب والفضة محوّلاً بالحساب من السعر العالمي بسعر الدولار المحلي، دون مصنعية ولا ربح للصائغ.',
  'المتوقع مع المصنعية': 'السعر المحسوب مضافاً إليه مصنعية ثابتة للغرام، ليقارب ما ستدفعه عند الشراء من الصائغ.',
  'الفجوة بين الرسمي والمحلي': 'الفرق بين سعر الدولار في البنك المركزي وسعره في السوق. اتساعها علامة ضغط على الدينار.',
  'DXY': 'مؤشر يقيس قوة الدولار الأمريكي أمام العملات الكبرى. ارتفاعه يضغط عادة على سعر الذهب.',
  'الفائدة الأمريكية': 'الفائدة التي يحددها الفدرالي الأمريكي. رفعها يضغط عادة على الذهب، وخفضها يدعمه.',
  'التضخم CPI': 'نسبة ارتفاع الأسعار في أمريكا خلال سنة. التضخم المرتفع يدعم الذهب عادة كمخزن للقيمة.',
  'البطالة': 'نسبة العاطلين عن العمل في أمريكا. ارتفاعها قد يدفع الفدرالي لخفض الفائدة.',
  'الفائدة الفعلية': 'متوسط الفائدة التي تتعامل بها البنوك الأمريكية فعلاً خلال الشهر، وتكون قريبة من النطاق الرسمي.',
  'الدولار الموسّع': 'مؤشر للفدرالي يقيس الدولار أمام عدد أكبر من العملات من DXY.',
  'عائد السندات': 'الفائدة السنوية على سندات الحكومة الأمريكية. ارتفاعها يجعل الذهب (الذي لا يعطي فائدة) أقل جاذبية.',
  'العائد الحقيقي': 'عائد السندات بعد طرح التضخم المتوقع. من أقوى العوامل المؤثرة في الذهب: ارتفاعه يضغط عليه.',
  'توقعات التضخم': 'التضخم الذي تتوقعه الأسواق لعشر سنوات قادمة.',
  'COT': 'تقرير أسبوعي أمريكي يبيّن صافي مراكز المضاربين في عقود الذهب والفضة. الارتفاع يعني شهية أكبر للشراء.',
  'تحويل العملات': 'حاسبة بين الدينار والدولار. اختر السعر المعتمد في التطبيق أو اكتب سعراً لهذه العملية فقط. لا يُحفظ شيء إلا إذا سجّلتها عملية أو اعتمدت السعر بنفسك.',
  'خصوصية الاستشارات': 'خيار مستقل عن إخفاء الثروة: يخفي بطاقات المستشار كلها أو يظهرها.'
};
const ti = (label, key) => { const k = key || label; return GLOSS[k] ? h('span', { class: 'ti' }, label, h('button', { class: 'ib', type: 'button', 'aria-label': 'شرح: ' + k, onclick: e => { e.stopPropagation(); showTip(k); } }, 'ⓘ')) : label; };
function showTip(k) { let t = $('#tipbox'); if (!t) { t = h('div', { id: 'tipbox', role: 'dialog' }); t.onclick = () => { t.hidden = true; }; document.body.append(t); }
  t.replaceChildren(h('b', {}, k), h('p', {}, GLOSS[k]), h('small', {}, 'اضغط للإغلاق')); t.hidden = false; }
async function copyText(t, ok) { try { await navigator.clipboard.writeText(t); toast(ok || 'نُسخ'); return true; } catch (e) { toast('تعذّر النسخ التلقائي: اضغط على النص مطولاً وانسخه', true); return false; } }
// اعتماد سعر نبض السوق: يعرض السعر ووقته ومصدره أولاً، ولا يُحفظ شيء إلا بعد تأكيدك. لا يتغير السعر المحفوظ تلقائياً أبداً
function nabdRateBtn(apply, okLabel) { const box = h('div', { class: 'nrate pub' });
  const show = () => { const p = FN.ind('usd_iqd_parallel');
    if (!p || p.value == null) return box.replaceChildren(h('p', { class: 'bad' }, FN.err() ? 'سعر نبض السوق غير متاح الآن (لا اتصال). سعرك المحفوظ لم يتغير.' : 'سعر نبض السوق غير متاح الآن. سعرك المحفوظ لم يتغير.'), btn('إغلاق', () => box.replaceChildren(b0), 'alt mini'));
    box.replaceChildren(h('div', { class: 'card' }, h('b', {}, 'سعر الدولار المحلي (السوق السوداء) في نبض السوق'),
      row('100 دولار', nI(p.value) + ' دينار'), row('آخر تحديث', nWhen(nT(p)) || '—'), row('المصدر', srcName(p) || '—'), h('div', {}, nChip(p.live, nT(p), nF(p))),
      p.live !== 'current' ? h('p', { class: 'bad' }, 'تنبيه: هذا السعر قديم، تأكد منه قبل اعتماده.') : null,
      h('p', { class: 'mut' }, 'يُعتمد بتاريخ اليوم (' + L.today() + '). لن يتغير سعرك تلقائياً عند تحديث السوق لاحقاً.'),
      btn(okLabel || 'أكّد', () => { box.replaceChildren(b0); apply(p.value); }), btn('إلغاء', () => { box.replaceChildren(b0); toast('لم يتغير شيء'); }, 'alt'))); };
  const b0 = btn('اعتمد سعر نبض السوق', async () => { b0.disabled = true; try { await FN.load(); } finally { b0.disabled = false; } show(); }, 'alt mini');
  box.append(b0); return box; }
const saveNabdRate = v => act(() => L.setRate(S, L.today(), v * 100), 'حُفظ سعر الصرف: ' + nI(v) + ' لكل 100$');
const advHiddenNote = () => S.x.set.hideAdvice ? h('p', { class: 'mut' }, 'الاستشارات مخفية بطلبك. لإظهارها: ⚙ ← الإعدادات ← الخصوصية.') : null;

const row = (a, b, cls) => h('div', { class: 'r ' + (cls || '') }, h('span', {}, a), h('b', {}, b));
// نموذج عام: fields = [{k,l,t:'text|num|date|select',opts,v,ph,req,show(vals),dyn(ctl,vals)}]
function buildForm(fields, submit, label) {
  const root = h('div', { class: 'form' }), ctl = {}, wrap = {};
  const vals = () => Object.fromEntries(Object.keys(ctl).map(k => [k, ctl[k].value]));
  const refresh = () => { const v = vals(); fields.forEach(f => { wrap[f.k].hidden = f.show ? !f.show(v) : false; if (f.dyn) f.dyn(ctl[f.k], v); }); };
  fields.forEach(f => { const c = f.t === 'select' ? h('select', {}, f.opts.map(([v, t]) => h('option', { value: v }, t))) : h('input', { type: f.t === 'date' ? 'date' : 'text', inputmode: f.t === 'num' ? 'decimal' : null, placeholder: f.ph || '', autocomplete: 'off' });
    if (f.t === 'date' && !f.future) c.max = L.today(); // منتقي التاريخ لا يتجاوز اليوم للعمليات
    if (f.v !== undefined) c.value = f.v; c.onchange = () => refresh(); c.oninput = () => { c.dataset.touched = '1'; refresh(); }; ctl[f.k] = c; wrap[f.k] = h('label', { class: 'f' }, h('span', {}, f.l), c); root.append(wrap[f.k]); });
  root.append(btn(label || 'حفظ', async () => { const v = vals(), miss = fields.find(f => !wrap[f.k].hidden && f.req && !String(v[f.k]).trim()); if (miss) return toast('أكمل: ' + miss.l, true);
    try { await submit(v); } catch (e) { toast(e.message || String(e), true); } }, 'prim'));
  refresh(); return root;
}
const rateDyn = (dateK, show) => ({ k: 'rate', l: 'سعر 100 دولار بالدينار في ذلك اليوم', t: 'num', req: true, show, dyn: (c, v) => { if (!c.dataset.touched && E.okDate(v[dateK]) && S.x.rates.length) c.value = String(L.rateAt(S, v[dateK]) / 100); } });
const seg = (items, cur, f) => h('div', { class: 'seg' }, items.map(([k, t]) => h('button', { class: k === cur ? 'on' : '', onclick: () => f(k) }, t)));
const SCREENS = {}, MORE = []; // MORE: الصفحات الفرعية [مفتاح، عنوان، دالة]؛ لكلٍّ منها زر أب في الشريط (PARENT) أو ⚙
// ===== المرحلة 2: الشاشة الرئيسية، العمليات، الحسابات، الرصيد الافتتاحي =====
function acctList() {
  const A = L.accountsView(S), grp = [['السائل', a => a.kind === 'asset' && a.liquid], ['أصول أخرى', a => a.kind === 'asset' && !a.liquid], ['الالتزامات', a => a.kind === 'liab']];
  const V = {}; L.valuations(S).forEach(v => { if (v.last && v.book !== 0) V[v.id] = v.value; });
  return grp.map(([t, f]) => { const xs = A.filter(a => f(a) && !S.acc[a.id].hidden); return xs.length ? sect(t, xs.map(a => row(a.name, a.cur === 'USD' ? L.fmtUsd(a.bal) + ' ≈ ' + money(a.iqd) : V[a.id] != null ? money(V[a.id]) + ' (مقدّر)' : money(a.bal)))) : null; });
}
function opsForm(kind) {
  const D = { k: 'date', l: 'التاريخ', t: 'date', v: L.today(), req: true }, N = { k: 'note', l: 'ملاحظة (اختياري)', t: 'text' };
  const isUsd = id => id && S.acc[id] && S.acc[id].cur === 'USD', ok = m => () => toast(m);
  const parse = (id, s) => L.parseAmount(s, decOf(id)), rt = (id, v) => isUsd(id) ? L.parseAmount(v.rate, 2) : null;
  const A = accOpts(), first = A[0] ? A[0][0] : '';
  if (!A.length) return h('p', { class: 'mut' }, 'أنشئ حساباً أولاً من تبويب «الحسابات» (أو سجّل الرصيد الافتتاحي).');
  if (kind === 'income') return buildForm([D, { k: 'acct', l: 'يدخل إلى', t: 'select', opts: A }, { k: 'src', l: 'المصدر', t: 'select', opts: [['inc_salary', 'الراتب'], ['inc_other', 'دخل آخر']] },
    { k: 'amount', l: 'المبلغ', t: 'num', req: true }, rateDyn('date', v => isUsd(v.acct)), N],
    v => act(() => L.income(S, { date: v.date, acct: v.acct, src: v.src, amount: parse(v.acct, v.amount), r: rt(v.acct, v), note: v.note }), 'سُجّل الدخل'), 'سجّل الدخل');
  if (kind === 'expense') return buildForm([D, { k: 'acct', l: 'يُصرف من', t: 'select', opts: A }, { k: 'amount', l: 'المبلغ', t: 'num', req: true },
    { k: 'cat', l: 'الفئة', t: 'select', opts: L.CATS.map(c => [c[0], c[1]]) }, rateDyn('date', v => isUsd(v.acct)), N],
    v => act(() => L.expense(S, { date: v.date, acct: v.acct, cat: v.cat, amount: parse(v.acct, v.amount), r: rt(v.acct, v), note: v.note }), 'سُجّل المصروف'), 'تم');
  if (kind === 'transfer') { const diff = v => v.from && v.to && S.acc[v.from] && S.acc[v.to] && S.acc[v.from].cur !== S.acc[v.to].cur, bothUsd = v => isUsd(v.from) && isUsd(v.to);
    return buildForm([D, { k: 'from', l: 'من', t: 'select', opts: A }, { k: 'to', l: 'إلى', t: 'select', opts: A, v: A[1] ? A[1][0] : first },
      { k: 'amount', l: 'المبلغ المدفوع (بعملة حساب المصدر)', t: 'num', req: true }, { k: 'amount2', l: 'المبلغ المستلم فعلياً (بعملة حساب الوجهة)', t: 'num', req: true, show: diff },
      { ...rateDyn('date', bothUsd), l: 'سعر 100 دولار في ذلك اليوم' }, N],
      v => act(() => L.transfer(S, { date: v.date, from: v.from, to: v.to, amount: parse(v.from, v.amount), amount2: diff(v) ? parse(v.to, v.amount2) : 0, r: bothUsd(v) ? L.parseAmount(v.rate, 2) : null, note: v.note }), 'سُجّل التحويل'), 'حوّل'); }
  const iq = A.filter(a => S.acc[a[0]].cur === 'IQD');
  return buildForm([D, { k: 'acct', l: 'الحساب (بالدينار)', t: 'select', opts: iq }, { k: 'counted', l: 'الرصيد الفعلي بعد العدّ', t: 'num', req: true }, N],
    v => act(() => L.reconcile(S, { date: v.date, acct: v.acct, counted: L.parseAmount(v.counted, 0) }), 'سُجّلت المطابقة'), 'سوِّ الفرق');
}
function txList(n = 40) {
  const xs = L.listTx(S).slice(0, n);
  return sect('آخر العمليات', xs.length ? xs.map(t => h('div', { class: 'tx' + (t.voided || t.reversal ? ' void' : '') },
    h('div', { class: 'r' }, h('span', {}, h('span', { class: 'cat' }, catIco(t.label)), t.date + ' · ' + t.label), h('b', {}, money(t.amount) + (t.usd ? ' (' + L.fmtUsd(t.usd) + ')' : ''))),
    h('div', { class: 'mut' }, (t.from ? t.from + ' ← ' : '') + t.to + (t.note ? ' — ' + t.note : '') + (t.voided ? ' (معكوسة)' : '')),
    (!t.voided && !t.reversal && t.label !== 'رصيد افتتاحي' && t.label !== 'تصحيح افتتاحي') ? btn('تراجع', () => { if (confirm('عكس هذه العملية؟ تبقى ظاهرة في السجل.')) act(() => { const o = S.tx.find(x => x.id === t.id); L.undo(S, t.id, L.today() > o.date ? L.today() : o.date); }, 'عُكست العملية'); }, 'mini') : null))
    : h('p', { class: 'mut' }, 'لا عمليات بعد.'));
}
SCREENS.ops = (sub, p) => { const kind = view.p.kind || 'expense';
  return h('div', {}, h('h1', {}, 'عملية جديدة'), seg([['expense', 'مصروف'], ['income', 'دخل'], ['transfer', 'تحويل'], ['reconcile', 'مطابقة نقد'], ['fx', 'تحويل العملات']], kind, k => go('ops', null, { kind: k })), kind === 'fx' ? fxForm() : opsForm(kind), txList()); };

function openingWizard() {
  const rows = h('div', {}), lab = (t, c) => h('label', { class: 'f' }, h('span', {}, t), c), mk = (pre = {}) => { const r = h('div', { class: 'orow card' }); const f = {};
    f.name = h('input', { placeholder: 'مثال: نقد في الجيب', value: pre.name || '' }); f.type = h('select', {}, Object.entries(L.TYPES).map(([k, v]) => h('option', { value: k }, v[0]))); if (pre.type) f.type.value = pre.type;
    f.cur = h('select', {}, [['IQD', 'دينار عراقي'], ['USD', 'دولار']].map(([k, t]) => h('option', { value: k }, t))); if (pre.cur) f.cur.value = pre.cur; f.amount = h('input', { placeholder: 'اتركه فارغاً إن لم يوجد', inputmode: 'decimal' });
    f.rate = h('input', { placeholder: 'مثال: 150000', inputmode: 'decimal' }); const rl = lab('متوسط سعر شرائه: دينار لكل 100 دولار (اختياري)', f.rate);
    const sync = () => { rl.hidden = f.cur.value !== 'USD'; }; f.cur.onchange = sync; sync(); r._f = f;
    r.append(lab('اسم الحساب', f.name), lab('النوع', f.type), lab('العملة', f.cur), lab('كم فيه الآن؟', f.amount), rl, btn('حذف هذا السطر', () => { if (confirm('حذف هذا السطر من النموذج؟\nلم يُحفظ بعد، فلن يُحذف أي حساب أو بيانات محفوظة.')) r.remove(); }, 'mini alt')); rows.append(r); };
  mk({ name: 'نقد', type: 'asset_cash' }); mk({ name: 'فيزا', type: 'visa' }); mk({ name: 'دولار', type: 'asset_cash', cur: 'USD' });
  const date = h('input', { type: 'date', value: L.today(), max: L.today() }), rate = h('input', { placeholder: 'مثال: 150000', inputmode: 'decimal' });
  return h('div', {}, sect('الخطوة 1: ما تملكه اليوم', h('p', { class: 'mut' }, 'اكتب كم عندك الآن في كل حساب. لا يُحسب دخلاً. اترك الحساب الذي لا تملكه فارغاً. الذهب والفضة والراتب يأتيان بعد هذه الخطوة.'),
      lab('تاريخ البدء', date)), rows, btn('+ إضافة حساب آخر (بنك، عقار، التزام...)', () => mk(), 'alt'),
    sect('', lab('سعر الصرف اليوم: كم دينار يساوي 100 دولار (مطلوب إن أدخلت دولاراً)', rate), nabdRateBtn(v => { rate.value = String(v); toast('وُضع السعر في الخانة، ويُحفظ مع «سجّل وابدأ»'); }, 'ضعه في الخانة'),
    btn('سجّل وابدأ', () => { try {
      const data = [...rows.children].map(r => { const f = r._f, cur = f.cur.value, kind = L.TYPES[f.type.value][1]; if (!f.amount.value.trim()) return null;
        if (cur === 'USD' && kind === 'liab') throw new Error('الالتزام بالدولار غير مدعوم'); return { name: f.name.value, type: f.type.value, cur, amount: L.parseAmount(f.amount.value, cur === 'USD' ? 2 : 0), r: cur === 'USD' ? (f.rate.value.trim() || rate.value.trim() ? L.parseAmount(f.rate.value || rate.value, 2) : (() => { throw new Error('اكتب سعر الصرف اليوم (كم دينار يساوي 100 دولار): مطلوب لحساب «' + f.name.value + '»'); })()) : null }; }).filter(Boolean);
      if (!data.length) throw new Error('أدخل رصيد حساب واحد على الأقل'); const hasUsd = data.some(d => d.cur === 'USD');
      act(() => { if (hasUsd) L.setRate(S, date.value, L.parseAmount(rate.value, 2)); L.opening(S, date.value, data); }, 'سُجّل. الآن أضف الراتب والذهب من الصفحة الرئيسية').then(() => { if (S.x.openDate) go('home'); /* عند الفشل يبقى المعالج بمدخلاته */ }); } catch (e) { toast(e.message, true); } })));
}
SCREENS.accts = (sub) => {
  if (sub === 'open' || !S.x.openDate && sub !== 'list') return h('div', {}, h('h1', {}, 'الحسابات'), openingWizard());
  const f = buildForm([{ k: 'name', l: 'اسم الحساب', t: 'text', req: true }, { k: 'type', l: 'النوع', t: 'select', opts: Object.entries(L.TYPES).map(([k, v]) => [k, v[0]]) }, { k: 'cur', l: 'العملة', t: 'select', opts: [['IQD', 'دينار'], ['USD', 'دولار']] }],
    v => act(() => L.addAccount(S, v), 'أُضيف الحساب'), 'أضف حساباً');
  return h('div', {}, h('h1', {}, 'أموالي'), sect('', MONEY_LINKS.map(([k, t]) => h('button', { class: 'lnk', onclick: () => go('more', k) }, t))), h('h2', { class: 'sub' }, 'الحسابات'), acctList(), sect('حساب جديد', h('p', { class: 'mut' }, 'يبدأ الحساب بصفر. للمال الموجود سلفاً استعمل الرصيد الافتتاحي عند البدء، أو سجّل تحويلاً/دخلاً.'), f), openingFixBlock(), manageBlock());
};
// تعديل اسم حساب وإخفاء حساب غير مستعمل (رصيده صفر). الإخفاء ليس حذفاً: القيود باقية، ويمكن الإظهار متى شئت
function manageBlock() { const A = accOpts(), zero = accOpts(a => E.bal(S, a.id) === 0), H = Object.values(S.acc).filter(a => a.type && a.hidden);
  if (!A.length && !H.length) return null;
  return sect('', fold('إدارة الحسابات (تعديل الاسم وإخفاء حساب)', false,
    A.length ? buildForm([{ k: 'acct', l: 'الحساب', t: 'select', opts: A }, { k: 'name', l: 'الاسم الجديد', t: 'text', req: true, dyn: (c, v) => { c.placeholder = 'الاسم الحالي: ' + ((S.acc[v.acct] || {}).name || ''); } }],
      v => act(() => L.renameAccount(S, v.acct, v.name), 'غُيّر الاسم'), 'غيّر الاسم') : null,
    h('p', { class: 'mut' }, 'الإخفاء لحساب لم تعد تستعمله ورصيده صفر: يختفي من القوائم والنماذج، وتبقى عملياته كلها في السجل والتقارير.'),
    zero.length ? buildForm([{ k: 'acct', l: 'حساب رصيده صفر', t: 'select', opts: zero }], v => act(() => L.hideAccount(S, v.acct, true), 'أُخفي الحساب'), 'أخفِ الحساب') : h('p', { class: 'mut' }, 'لا يوجد حساب رصيده صفر.'),
    H.length ? h('div', {}, h('h2', {}, 'حسابات مخفية'), H.map(a => h('div', { class: 'r' }, h('span', {}, a.name), btn('أظهر', () => act(() => L.hideAccount(S, a.id, false), 'أُظهر الحساب'), 'mini alt')))) : null)); }
// تصحيح الرصيد الافتتاحي: الرصيد الصحيح يوم البدء، والفرق يُسجَّل بتاريخ البدء مقابل «الرصيد الافتتاحي» (لا دخل ولا مصروف). لا «تراجع» له، يُصحَّح بتصحيح آخر
function openingFixBlock() { if (!S.x.openDate) return null; const A = accOpts(); if (!A.length) return null;
  const cur = id => { const a = S.acc[id]; return a ? amtStr(Math.abs(L.openingAmt(S, id)), a.cur) : ''; };
  return sect('', fold('تصحيح الرصيد الافتتاحي (عند خطأ في البداية)', false, h('p', { class: 'mut' }, 'إن أخطأت في رصيد حساب يوم البدء (' + S.x.openDate + ')، أو نسيت حساباً كان عندك قبل البدء: اختره واكتب رصيده الصحيح يومها. يُسجَّل الفرق بتاريخ البدء، فلا يُحسب دخلاً ولا مصروفاً. إن كانت أشهر قد أُغلقت فستظهر «تغيّرت بعد إغلاقها» في التقارير لتعتمدها.'),
    buildForm([{ k: 'acct', l: 'الحساب', t: 'select', opts: A }, { k: 'amount', l: 'رصيده الصحيح يوم البدء (بعملة الحساب)', t: 'num', req: true, dyn: (c, v) => { c.placeholder = 'المسجّل الآن: ' + cur(v.acct); } },
      { k: 'rate', l: 'متوسط سعر شراء الدولار الإضافي: دينار لكل 100 دولار', t: 'num', show: v => !!S.acc[v.acct] && S.acc[v.acct].cur === 'USD', dyn: (c, v) => { if (!c.dataset.touched) { const r = S.acc[v.acct] && L.openingRate(S, v.acct); c.value = r ? String(r / 100) : ''; } } }],
      v => { const a = S.acc[v.acct], amt = L.parseAmount(v.amount, decOf(v.acct)); if (!confirm(`تصحيح الرصيد الافتتاحي لـ «${a.name}» من ${cur(v.acct)} إلى ${amtStr(amt, a.cur)}؟`)) return;
        return act(() => L.openingFix(S, { acct: v.acct, amount: amt, r: a.cur === 'USD' && v.rate.trim() ? L.parseAmount(v.rate, 2) : null }), 'صُحّح الرصيد الافتتاحي'); }, 'صحّح')));
};
// صافي الثروة بالدولار بآخر سعر صرف مسجّل (عرض فقط، لا يُخزَّن). دينار × 1,000,000 ÷ السعر = سنت
const nwUsd = n => S.x.rates.length ? L.fmtUsd(Number(E.rd(BigInt(n) * 1000000n, BigInt(S.rate)))) : '— (أدخل سعر الصرف)';
function nwBlock() {
  const p = L.panel(S), mask = v => v, d = v => v == null ? '—' : (v > 0 ? '+' : '') + L.fmt(v) + ' د.ع';
  return sect(ti('صافي الثروة'), h('div', { class: 'big', onclick: () => privHidden() ? privReveal() : null }, mask(money(p.nw))), privOn() ? h('p', { class: 'mut' }, 'الأرقام مخفية: اضغط 👁 أو الرقم لإظهارها 5 ثوانٍ') : null,
    row('بالدولار', mask(nwUsd(p.nw))), row('الأصول', mask(money(p.cur.assets))), row('الالتزامات', mask(money(p.cur.liab))), row('التغير هذا الشهر', mask(d(p.dMonth))), row('التغير منذ بداية السنة', mask(d(p.dYear))),
    S.x.set.valuation === 'cost' ? null : row(ti('أرباح/خسائر غير محققة', 'غير محقق'), mask(d(p.U))));
}
// ===== المرحلة 3: القفل، النسخ الاحتياطي والاستعادة، التصدير، شريط التذكير =====
const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u))), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
let hiddenAt = 0, unlocked = false;
async function shareFile(file, ok) { // مشاركة عبر ورقة iOS، وإن لم تتوفر فتنزيل. يعيد true عند الحفظ/المشاركة، false عند الإلغاء
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return 'share'; } throw 0; }
  catch (e) { if (e && e.name === 'AbortError') return false; const a = h('a', { href: URL.createObjectURL(file), download: file.name }); a.click(); return 'download'; } }
// ---- القفل ----
function lockCover(on) { const l = $('#lock'); l.hidden = !on; if (on) l.replaceChildren(h('h1', {}, 'فلوسي')); }
function showLock() {
  const l = $('#lock'), pin = h('input', { type: 'password', inputmode: 'numeric', maxlength: 6, placeholder: '••••••', autocomplete: 'off' }), msg = h('p', { class: 'bad' }, '');
  const done = () => { unlocked = true; l.hidden = true; render(); };
  const tryPin = async () => { try { if (await FB.verifyPin(pin.value, S.sec.pin)) return done(); msg.textContent = 'رمز خاطئ'; pin.value = ''; } catch (e) { msg.textContent = 'رمز غير صالح'; } };
  pin.oninput = () => { if (pin.value.length === 6) tryPin(); };
  l.hidden = false; l.replaceChildren(h('h1', {}, 'فلوسي'), h('p', { class: 'mut' }, 'أدخل الرمز'), pin, msg, btn('فتح', tryPin),
    S.sec.passkey ? btn('بصمة الوجه', async () => { try { await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rpId: location.hostname, allowCredentials: [{ type: 'public-key', id: unb64(S.sec.passkey) }], userVerification: 'required', timeout: 60000 } }); done(); } catch (e) { msg.textContent = 'تعذّرت البصمة، استخدم الرمز'; } }, 'alt') : null);
  setTimeout(() => pin.focus && pin.focus(), 50);
}
const lockOn = () => !!(S.sec.pin && S.x.set.lockOn);
document.addEventListener('visibilitychange', () => { if (!S || bootErr) return;
  if (document.hidden) { hiddenAt = Date.now(); if (lockOn()) lockCover(true); }
  else if (lockOn()) { if (Date.now() - hiddenAt >= S.x.set.lockMin * 60000) { unlocked = false; showLock(); } else lockCover(false); } });
// ---- شريط التذكير ----
const strictDue = b => persist === false && b.level === 'ok' && b.days != null && (b.days > 3 || b.since >= 5); // التخزين غير مثبّت: تذكير بعد 3 أيام أو 5 عمليات بدل 7 و10
function backupBanner() { const b = FB.status(S); if (b.level === 'ok' && !strictDue(b)) return null;
  const t = (b.days == null ? 'لا توجد نسخة احتياطية خارجية بعد' : `آخر نسخة قبل ${b.days} يوماً و${b.since} عملية جديدة`) + (persist === false ? ' (تخزين الهاتف غير مثبّت)' : '');
  return h('div', { class: 'ticker alert', onclick: () => go('more', 'backup') }, '⚠ ' + t + ' — اضغط لأخذ نسخة'); }
// ---- الصفحات الفرعية (تُفتح من أزرار الشريط أو من ⚙) ----
// إلغاء القفل بحقل رمز مخفي بدل prompt() الذي يُظهر الأرقام أثناء كتابتها. التحقق والحفظ كما كانا حرفياً
function offForm(st) {
  const pin = h('input', { type: 'password', inputmode: 'numeric', maxlength: 6, placeholder: '••••••', autocomplete: 'off', 'aria-label': 'الرمز الحالي' });
  let busy = false; // يمنع الإرسال المزدوج بضغطتين سريعتين
  const ok = async () => { if (busy) return; busy = true; try { const p = pin.value;
    if (p && await FB.verifyPin(p, S.sec.pin)) { S.sec.pin = null; S.sec.passkey = null; st.lockOn = false; await FStore.saveSec(BE, S); await act(() => {}, 'أُلغي القفل'); go('more', 'lock'); }
    else { toast('رمز خاطئ', true); pin.value = ''; pin.focus(); } } finally { busy = false; } };
  pin.onkeydown = e => { if (e.key === 'Enter') ok(); };
  setTimeout(() => pin.focus && pin.focus(), 50);
  return h('div', {}, h('label', { class: 'f' }, h('span', {}, 'أدخل الرمز الحالي لإلغاء القفل'), pin), btn('أكّد إلغاء القفل', ok), btn('تراجع', () => go('more', 'lock'), 'alt'));
}
MORE.push(['lock', 'القفل', () => { const st = S.x.set, set = S.sec.pin;
  const pf = buildForm([{ k: 'a', l: 'رمز جديد (6 أرقام)', t: 'num', req: true }, { k: 'b', l: 'أعد كتابته', t: 'num', req: true }], async v => { const a = FB.checkPinFormat(v.a); if (a !== FB.checkPinFormat(v.b)) throw new Error('الرمزان مختلفان');
    S.sec.pin = await FB.hashPin(a); st.lockOn = true; await FStore.saveSec(BE, S); await act(() => {}, 'فُعّل القفل'); go('more', 'lock'); }, set ? 'غيّر الرمز' : 'فعّل القفل');
  return h('div', {}, sect('رمز التطبيق', h('p', { class: 'mut' }, set ? 'القفل مفعّل. يُقفل التطبيق عند مغادرته بعد المهلة، وتُحجب الشاشة فوراً.' : 'لا يوجد قفل. هذا قفل للواجهة، والحاجز الفعلي هو رمز هاتفك فاجعله قوياً.'), pf),
    set ? sect('المهلة', seg([['0', 'فوراً'], ['1', 'دقيقة'], ['5', '5 دقائق']], String(st.lockMin), k => act(() => { st.lockMin = +k; }, 'تم')),
      view.p.off ? offForm(st) : btn('إلغاء القفل', () => go('more', 'lock', { off: 1 }), 'alt')) : null,
    set ? sect('بصمة الوجه (تجريبية)', h('p', { class: 'mut' }, 'اختيارية. الرمز يعمل دائماً بديلاً. جرّبها بإغلاق التطبيق وفتحه قبل الاعتماد عليها.'),
      btn(S.sec.passkey ? 'ألغِ البصمة' : 'فعّل البصمة', async () => { try { if (S.sec.passkey) { S.sec.passkey = null; } else { const r = n => crypto.getRandomValues(new Uint8Array(n)), c = await navigator.credentials.create({ publicKey: { challenge: r(32), rp: { name: 'Flousi', id: location.hostname }, user: { id: r(16), name: 'flousi', displayName: 'Flousi' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000 } }); S.sec.passkey = b64(c.rawId); }
        await FStore.saveSec(BE, S); toast('تم'); go('more', 'lock'); } catch (e) { toast('تعذّر: ' + e.name, true); } }, 'alt')) : null); }]);
let pending = null, pendSig = null, building = null;
// نسخة بضغطة واحدة (f1-v3): تُجهَّز مشفّرة في الخلفية باسم ثابت، فيفتح زر الحفظ ورقة المشاركة فوراً (iOS يرفض المشاركة إن سبقها انتظار طويل)
const BAK_NAME = 'flousi-backup.flousibak';
const bakSig = () => { const x = { ...S.x }; delete x.backup; const j = JSON.stringify([S.tx.length, S.goals.length, S.post.length, x]); let h2 = 7; for (let i = 0; i < j.length; i++) h2 = (h2 * 31 + j.charCodeAt(i)) >>> 0; return h2 + ':' + j.length; };
function prebuild(rerender) { if (!S || !S.sec.key || !S.x.openDate) return; const sig = bakSig(); if (pending && pendSig === sig) return; if (building) return;
  building = FB.build(S, S.sec.key).then(bytes => { pending = new File([bytes], BAK_NAME, { type: 'application/octet-stream' }); pendSig = sig; }).catch(() => { pending = null; }).finally(() => { building = null; if (rerender && view.tab === 'more' && view.sub === 'backup') render(); }); }
async function oneTapBackup() { if (!pending || pendSig !== bakSig()) { toast('النسخة تُجهَّز… اضغط مرة أخرى بعد ثانية', true); prebuild(true); return; }
  const how = await shareFile(pending); if (how) await act(() => { S.x.backup = { t: Date.now(), tx: S.tx.length, how }; }, 'سُجّلت النسخة: ' + BAK_NAME); }
// قسم الاستعادة ظاهر دائماً (f1-v3.1)، حتى على جهاز جديد فارغ لم يُنشأ عليه مفتاح بعد: اختر الملف واكتب مفتاحك القديم
function restoreSect() {
  const key = h('input', { placeholder: 'مفتاح الاسترداد', autocomplete: 'off' }), file = h('input', { type: 'file', accept: '*/*', hidden: true }), sum = h('div', {});
  // f1-v4: فحص كامل للنسخة (التشفير والبصمة والأرصدة) ثم ملخص محتوياتها، ولا تبدأ الاستعادة إلا بعد ضغطك «استعد»؛ والنسخة الأقدم من بياناتك تحتاج تأكيداً إضافياً
  file.onchange = async () => { const f = file.files[0]; file.value = ''; if (!f) return; sum.replaceChildren(h('p', { class: 'mut' }, 'جارٍ فحص النسخة…'));
    try { const bytes = new Uint8Array(await f.arrayBuffer()), kv = key.value, { payload } = await FB.open(bytes, kv), m = payload.manifest, d = payload.dump || {};
      const lastB = (d.tx || []).filter(t => t.type !== 'opening').map(t => t.date).sort().pop() || '—', lastC = S.tx.filter(t => t.type !== 'opening').map(t => t.date).sort().pop() || null;
      const older = S.tx.length > 0 && (m.txCount < S.tx.length || (lastC && lastB !== '—' && lastB < lastC));
      const n = k => Array.isArray(d[k]) ? d[k].length : d[k] && typeof d[k] === 'object' ? Object.keys(d[k]).length : 0, x = d.x || {};
      sum.replaceChildren(h('div', { class: 'card' + (older ? ' warnb' : '') }, h('b', {}, '✓ النسخة سليمة — ملخص محتوياتها'),
        row('تاريخ إنشاء النسخة', payload.created ? new Date(payload.created).toLocaleString('en-GB') : '—'), row('عدد العمليات', String(m.txCount)), row('آخر عملية فيها', lastB), row('الحسابات', String(m.accounts)),
        row('الأهداف', String((x.goalsDef || []).length)), row('قطع الذهب والفضة', String(n('pieces'))), row('صافي الثروة فيها', money(m.nw)),
        h('div', { class: 'r' }, h('span', {}, 'بياناتك الحالية'), h('b', {}, S.tx.length ? S.tx.length + ' عملية' + (lastC ? '، آخرها ' + lastC : '') : 'فارغة')),
        older ? h('p', { class: 'bad' }, '⚠ هذه النسخة أقدم من بياناتك الحالية: ستفقد ما سجّلته بعدها. تأكد أنها النسخة الصحيحة.') : null,
        h('p', { class: 'mut' }, 'الاستعادة تستبدل بياناتك الحالية، وتُحفظ لقطة منها 30 يوماً يمكن التراجع إليها.'),
        btn('استعد هذه النسخة', async () => { if (older && !confirm('النسخة أقدم من بياناتك الحالية (' + m.txCount + ' عملية مقابل ' + S.tx.length + '). هل أنت متأكد من استبدال بياناتك بها؟')) return;
          try { await FB.restore(BE, S, bytes, kv); S = await FStore.load(BE); integ = L.integrity(S); toast('تمت الاستعادة: ' + m.txCount + ' عملية'); go('home'); } catch (e) { toast('تعذّرت الاستعادة: ' + (e.message || e), true); } }, 'prim'),
        btn('إلغاء', () => { sum.replaceChildren(); toast('لم يتغير شيء'); }, 'alt'))); }
    catch (e) { sum.replaceChildren(); toast(e.message === 'auth' ? 'المفتاح خاطئ أو الملف تالف' : e.message === 'format' ? 'ملف غير صالح' : e.message, true); } };
  return sect('استعادة نسخة', h('p', { class: 'mut' }, 'اكتب مفتاح الاسترداد الخاص بالنسخة (القديم) ثم اختر الملف. بعد الاستعادة يصبح هذا المفتاح مفتاحك على هذا الجهاز.'), key, h('label', { class: 'btn', onclick: () => file.click() }, 'اختر ملف النسخة'), file,
    sum, btn('التراجع عن آخر استعادة', async () => { try { await FB.undoRestore(BE, S); S = await FStore.load(BE); integ = L.integrity(S); toast('تم الرجوع'); go('home'); } catch (e) { toast(e.message, true); } }, 'alt mini')); }
MORE.push(['backup', 'النسخ الاحتياطي والتصدير', () => { const b = FB.status(S), box = h('div', {});
  const stat = sect('الحالة', row('آخر نسخة', S.x.backup ? new Date(S.x.backup.t).toLocaleDateString('en-GB') + ' (' + b.days + ' يوماً)' : 'لا توجد'), row('عمليات بعد آخر نسخة', String(b.since)), row('مفتاح الاسترداد', S.sec.key ? 'مُعدّ' : 'غير مُعدّ'), row('التخزين الدائم', persist === true ? 'مثبّت ✓' : persist === false ? '⚠ غير مثبّت' : persist === 'na' ? 'غير مدعوم في هذا المتصفح' : '…', persist === false ? 'bad' : ''),
    persist === false ? h('p', { class: 'bad' }, 'رفض النظام تثبيت التخزين: قد يحذف بيانات التطبيق إن امتلأت ذاكرة الهاتف. افتح التطبيق من أيقونة الشاشة الرئيسية، وأبقِ مساحة فارغة، وخذ نسخة احتياطية بعد كل جلسة إدخال. التذكير صار بعد 3 أيام أو 5 عمليات.') : null,
    h('p', { class: 'mut' }, 'احفظ النسخة في iCloud Drive (ملفات ثم iCloud Drive) لا على الهاتف وحده. لا نسخ تلقائي خارج الهاتف في تطبيق الويب.'));
  if (!S.sec.key) { const key = FLS.fmtKey(FLS.newKey()); box.append(stat, sect('مفتاح الاسترداد', h('p', {}, 'اكتب هذا المفتاح على ورقة واحفظها في مكانين. بدونه لا تُفتح أي نسخة، ولن يظهر مرة ثانية.'), h('div', { class: 'big', style: 'direction:ltr;font-size:1.15rem;letter-spacing:.04em' }, key), btn('📋 نسخ المفتاح', () => copyText(key, 'نُسخ المفتاح ✓ اكتبه أيضاً على ورقة'), 'alt mini'),
      buildForm([{ k: 'k', l: 'أعد كتابة المفتاح للتأكيد', t: 'text', req: true }], async v => { if (FLS.normKey(v.k) !== FLS.normKey(key)) throw new Error('المفتاح غير مطابق'); S.sec.key = FLS.normKey(key); await FStore.saveSec(BE, S); toast('حُفظ المفتاح'); go('more', 'backup'); }, 'أكّدتُ وكتبتُه')));
    if (S.x.openDate) box.append(restoreSect()); else box.insertBefore(restoreSect(), box.children[1]); return box; }
  prebuild(true); const ready = pending && pendSig === bakSig();
  const prep = btn(ready ? '💾 احفظ نسخة الآن' : '… جارٍ تجهيز النسخة', oneTapBackup, ready ? 'prim' : 'alt');
  const save = h('p', { class: 'mut' }, 'ضغطة واحدة: تفتح ورقة المشاركة بملف «' + BAK_NAME + '». اختر «حفظ في الملفات» ثم iCloud Drive، واستبدل الملف القديم إن سُئلت. (النسخ إلى تليجرام يُضاف لاحقاً.)');
  const expo = btn('تصدير CSV (ملف مضغوط)', async () => { const z = new File([FB.exportZip(S)], 'flousi-export-' + L.today() + '.zip', { type: 'application/zip' }); await shareFile(z); }, 'alt');
  box.append(stat, sect('نسخة احتياطية', prep, save, expo), restoreSect());
  return box; }]);
// ---- شاشة «البصمة» (الوثيقة 3.0، القسم 8.6): للقراءة فقط. تُعرض قبل النسخ وبعد الاستعادة، والشرط مطابقة حرفية ----
function fpLines() { // نص حتمي لا يعتمد على تاريخ اليوم ولا على الإعدادات: يتطابق ما دامت البيانات نفسها
  const sn = E.snap(S), out = ['عدد العمليات: ' + S.tx.length, 'صافي الثروة (السوقي): ' + money(sn.nw), 'صافي الثروة (بالتكلفة): ' + money(sn.nwc), 'المخصص للأهداف: ' + money(sn.liq - sn.avail), '— الحسابات'];
  L.accountsView(S).sort((a, b) => a.id < b.id ? -1 : 1).forEach(a => out.push(a.name + ': ' + amtStr(a.bal, a.cur)));
  const D = L.debts(S); if (D.length) { out.push('— الديون'); D.forEach(d => out.push((d.dir === 'lent' ? 'لي عند ' : 'عليّ لـ ') + d.person + ': ' + money(d.remaining))); }
  const J = S.x.jams; if (J.length) { out.push('— الجمعيات'); J.map(j => L.jamState(S, j)).forEach(j => out.push(j.name + ': مدفوع ' + j.paid + ' من ' + j.N + (j.received ? '، مقبوضة' : ''))); }
  const P = L.pieces(S); if (P.length) { out.push('— الذهب والفضة'); P.sort((a, b) => a.id < b.id ? -1 : 1).forEach(p => out.push(pieceName(p) + ': ' + (p.held ? 'محتفَظ بها، تكلفتها ' + money(p.cost) : 'مبيعة'))); }
  const G = S.x.goalsDef; if (G.length) { out.push('— الأهداف'); const GV = L.goalView(S); G.map(d => GV.find(x => x.id === d.id)).forEach(g => out.push(g.name + ': ' + gm(g, g.allocated) + ' من ' + gm(g, g.target) + (g.iqd ? '، محجوز ' + money(g.iqd.reserved) : ''))); }
  const RC = S.x.recur; if (RC.length) { out.push('— المتكررات'); RC.forEach(r => out.push(r.name + (r.salary ? ' (راتب)' : '') + ': ' + (r.kind === 'income' ? 'دخل ' : 'مصروف ') + money(r.amount) + '، يوم ' + r.day + '، تذكير قبل ' + r.remind
    + '، ' + ((S.acc[r.acct] || {}).name || r.acct) + (r.cat ? '، ' + ((S.acc[r.cat] || {}).name || r.cat) : '') + '، ' + (r.active ? 'فعّال' : 'موقوف') + (r.last ? '، آخر تسجيل ' + r.last : ''))); }
  const VL = (S.x.vals || []); if (VL.length) { out.push('— التقييم اليدوي'); VL.forEach(v => out.push(((S.acc[v.a] || {}).name || v.a) + ' ' + v.d + ': ' + money(v.v))); }
  out.push('— حدود التنبيه'); Object.keys(L.GROUPS).forEach(g => out.push(g + ': ' + S.x.limits[g] + '%'));
  return out; }
const fpCode = async t => { const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))); return [...b.slice(0, 6)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase().match(/.{4}/g).join('-'); };
MORE.push(['print', 'بصمة البيانات', () => { const lines = fpLines(), txt = lines.join('\n'), code = h('div', { class: 'big', 'data-fp': '1' }, '…');
  fpCode(txt).then(c => { code.textContent = c; }).catch(() => { code.textContent = '—'; });
  return h('div', {}, sect('رمز البصمة', h('p', { class: 'mut' }, 'خذ لقطة لهذه الشاشة قبل النسخ الاحتياطي، ثم قارنها بعد الاستعادة: يجب أن يتطابق الرمز وكل رقم. للقراءة فقط، لا تغيّر شيئاً.'), code,
      btn('انسخ البصمة كاملة', async () => { try { await navigator.clipboard.writeText(txt + '\nالرمز: ' + code.textContent); toast('نُسخت البصمة'); } catch (e) { toast('تعذّر النسخ', true); } }, 'alt')),
    sect('التفاصيل', lines.map(l => l.startsWith('— ') ? h('h2', {}, l.slice(2)) : h('div', { class: 'tx' }, l)))); }]);
// ---- فحص السلامة (4.4): يُشغَّل عند كل فتح وبعد كل استعادة، ويمكن تشغيله يدوياً. للقراءة فقط، لا يُصلح شيئاً بصمت ----
function integBanner() { return integ.length && view.sub !== 'integrity' ? h('div', { class: 'ticker alert', onclick: () => go('more', 'integrity') }, '⚠ فحص السلامة وجد ' + integ.length + ' مشكلة في البيانات — اضغط للتفاصيل') : null; }
MORE.push(['integrity', 'فحص السلامة', () => h('div', {},
  sect('النتيجة', integ.length ? h('p', { class: 'badc' }, '✗ وُجدت ' + integ.length + ' مشكلة. لا تُدخل عمليات جديدة، وخذ نسخة احتياطية، وأرسل التفاصيل.') : h('p', { class: 'okc' }, '✓ كل الفحوصات سليمة'),
    h('p', { class: 'mut' }, 'يتحقق من: توازن كل عملية، وأن كل قيد يشير إلى عملية وحساب موجودين، والهوية الدفترية، ومعادلة صافي الثروة لكل شهر. يُشغَّل تلقائياً عند كل فتح.'),
    btn('أعد الفحص الآن', () => { integ = L.integrity(S); toast(integ.length ? 'وُجدت مشاكل' : 'كل الفحوصات سليمة', !!integ.length); render(); }, 'alt'),
    integ.length ? btn('انسخ التفاصيل', async () => { try { await navigator.clipboard.writeText(VER + '\n' + integ.join('\n')); toast('نُسخت'); } catch (e) { toast('تعذّر النسخ', true); } }, 'alt') : null),
  integ.length ? sect('التفاصيل', integ.map(m => h('div', { class: 'tx bad' }, m))) : null)]);
// ===== المرحلة 4: تبويب الأصول (الأسعار، الدولار، الذهب والفضة) =====
const gramsTxt = mg => Math.trunc(mg / 1000) + '.' + String(mg % 1000).padStart(3, '0') + ' غ';
const fineTxt = p => p.metal === 'G' ? 'عيار ' + Math.round(p.fine * 24 / 100) / 100 : 'نقاوة ' + p.fine / 10;
const pieceName = p => (p.label || 'قطعة') + ' · ' + (p.metal === 'G' ? 'ذهب' : 'فضة') + ' ' + fineTxt(p) + ' · ' + gramsTxt(p.mg) + (p.form === 'jewelry' ? ' · مصوغات' : p.form === 'bullion' ? ' · سبيكة/عملة' : '');
const priceDyn = (metalOf, dateK = 'date') => ({ k: 'price', l: 'سعر أونصة المعدن بالدولار في ذلك اليوم', t: 'num', req: true, dyn: (c, v) => { const m = metalOf(v);
  if (!c.dataset.touched && E.okDate(v[dateK]) && S.x.prices.some(x => x[m] != null)) c.value = String(L.priceAt(S, v[dateK])[m] / 100); } });
const lastDate = a => a.length ? ' (' + a[a.length - 1].d + ')' : '';
function ratesBlock(open) {
  const hasUsd = userAccts(a => a.cur === 'USD').length > 0, f = buildForm([{ k: 'date', l: 'التاريخ', t: 'date', v: L.today(), req: true }, { k: 'rate', l: 'سعر 100 دولار بالدينار (اختياري)', t: 'num' }, { k: 'g', l: 'سعر أونصة الذهب بالدولار (اختياري)', t: 'num' }, { k: 's', l: 'سعر أونصة الفضة بالدولار (اختياري)', t: 'num' }],
    v => act(() => { if (!v.rate.trim() && !v.g.trim() && !v.s.trim()) throw new Error('أدخل سعراً واحداً على الأقل'); if (v.rate.trim()) L.setRate(S, v.date, L.parseAmount(v.rate, 2));
      if (v.g.trim() || v.s.trim()) L.setPrices(S, v.date, { G: v.g.trim() ? L.parseAmount(v.g, 2) : undefined, S: v.s.trim() ? L.parseAmount(v.s, 2) : undefined }); }, 'حُدّثت الأسعار'), 'حدّث');
  const gp = S.x.prices.filter(x => x.G != null), sp = S.x.prices.filter(x => x.S != null);
  return pubSect('الأسعار وسعر الصرف', h('p', { class: 'mut' }, 'تحديث الأسعار لا يغيّر أي عملية سابقة، بل يغيّر التقييم فقط. سعر كل عملية محفوظ فيها.'),
    row('100 دولار', S.x.rates.length ? L.fmtRate(S.rate) + ' د.ع' + lastDate(S.x.rates) : (hasUsd ? '⚠ لم يُدخل بعد' : 'لم يُدخل')), row('أونصة الذهب', gp.length ? L.fmtUsd(S.price.G) + lastDate(gp) : 'لم تُدخل'), row('أونصة الفضة', sp.length ? L.fmtUsd(S.price.S) + lastDate(sp) : 'لم تُدخل'), nabdRateBtn(saveNabdRate, 'أكّد واحفظ'), fold('تحديث الأسعار وسعر الصرف', open, f));
}
function usdBlock() { const U = L.usdInfo(S); if (!U.length) return null; const s = E.snap(S);
  return sect('الدولار (متوسط التكلفة)', U.map(u => h('div', { class: 'tx' }, row(u.name, L.fmtUsd(u.bal)), row(ti('متوسط الشراء (لكل 100$)', 'متوسط التكلفة'), L.fmtRate(u.avg) + ' د.ع'), row('القيمة الحالية', money(u.mkt)), row(ti('غير محقق'), (u.unreal > 0 ? '+' : '') + L.fmt(u.unreal) + ' د.ع'))), row(ti('محقق من الصرف حتى الآن', 'محقق'), L.fmt(s.fx) + ' د.ع')); }
function metalsBlock() {
  const P = L.pieces(S), held = P.filter(p => p.held), sold = P.filter(p => !p.held && S.tx.some(t => t.type === 'sell_metal' && t.meta && t.meta.piece === p.id && !t.voided));
  const tot = held.reduce((a, p) => ({ c: a.c + p.cost, t: a.t + p.theo }), { c: 0, t: 0 });
  return sect('الذهب والفضة', btn('شراء قطعة', () => go('assets', 'buy')), btn('قطعة موجودة قبل البدء', () => go('assets', 'old'), 'alt'),
    held.length ? held.map(p => h('div', { class: 'tx' }, h('div', {}, pieceName(p) + (p.buy && p.buy.est ? ' (تكلفة تقديرية)' : '')), row('تكلفتها', money(p.cost)), row(ti('قيمتها المعدنية النظرية', 'القيمة المعدنية النظرية'), money(p.theo)), row('الفرق (غير محقق)', (p.unreal > 0 ? '+' : '') + L.fmt(p.unreal) + ' د.ع'), btn('بيع', () => go('assets', 'sell', { id: p.id }), 'mini')))
      : h('p', { class: 'mut' }, 'لا قطع محتفَظ بها.'), held.length ? row('المجموع: التكلفة / النظرية', money(tot.c) + ' / ' + money(tot.t)) : null,
    sold.length ? h('div', {}, h('h2', {}, 'مبيعة'), sold.map(p => { const r = L.saleReport(S, p.id); return h('div', { class: 'tx' }, h('div', {}, pieceName(p)), row('النتيجة المحققة', (r.total > 0 ? '+' : '') + L.fmt(r.total) + ' د.ع'), btn('التقرير', () => go('assets', 'report', { id: p.id }), 'mini')); })) : null);
}
const metalFields = (old) => [{ k: 'metal', l: 'المعدن', t: 'select', opts: [['G', 'ذهب'], ['S', 'فضة']] }, { k: 'grams', l: 'الوزن بالغرام (حتى 3 منازل)', t: 'num', req: true },
  { k: 'karat', l: 'العيار (1 إلى 24)', t: 'num', v: '21', req: true, show: v => v.metal === 'G' }, { k: 'mille', l: 'النقاوة من 1000 (مثل 925)', t: 'num', v: '925', req: true, show: v => v.metal === 'S' },
  { k: 'form', l: 'النوع', t: 'select', opts: [['jewelry', 'مصوغات'], ['bullion', 'سبيكة أو عملة']] }, { k: 'label', l: 'وصف القطعة (اختياري)', t: 'text' }];
const metalArgs = v => ({ metal: v.metal, mg: L.parseAmount(v.grams, 3), karat: v.metal === 'G' ? Number(L.norm(v.karat)) : null, mille: v.metal === 'S' ? Number(L.norm(v.mille)) : null, form: v.form, label: v.label.trim() });
function buyForm() { const iq = accOpts(a => a.cur === 'IQD' && a.kind === 'asset');
  return buildForm([{ k: 'date', l: 'التاريخ', t: 'date', v: L.today(), req: true }, ...metalFields(), { k: 'paid', l: 'ما دفعته فعلاً (دينار، شامل الصياغة)', t: 'num', req: true }, { k: 'from', l: 'ادفع من', t: 'select', opts: iq }, priceDyn(v => v.metal), rateDyn('date', () => true)],
    v => act(() => L.buyPiece(S, { ...metalArgs(v), date: v.date, paid: L.parseAmount(v.paid, 0), from: v.from, price: L.parseAmount(v.price, 2), rate: L.parseAmount(v.rate, 2) }), 'سُجّل الشراء').then(r => { if (r) go('assets'); }), 'سجّل الشراء'); }
function oldForm() { return buildForm([{ k: 'od', l: 'تاريخ البدء', t: 'date', v: S.x.openDate, show: () => false }, ...metalFields(), { k: 'cost', l: 'تكلفتها بالدينار إن عرفتها (وإلا تُقدَّر)', t: 'num' }, { ...priceDyn(v => v.metal, 'od'), l: 'سعر الأونصة بالدولار يوم البدء' }, { ...rateDyn('od', () => true), l: 'سعر 100 دولار يوم البدء' }],
  v => act(() => L.addPiece(S, { ...metalArgs(v), cost: v.cost.trim() ? L.parseAmount(v.cost, 0) : 0, price: L.parseAmount(v.price, 2), rate: L.parseAmount(v.rate, 2) }), 'أُضيفت القطعة').then(r => { if (r) go('assets'); }), 'أضف القطعة'); }
function sellForm(id) { const p = L.pieces(S).find(x => x.id === id); if (!p || !p.held) return h('p', {}, 'القطعة غير متاحة للبيع.'); const iq = accOpts(a => a.cur === 'IQD' && a.kind === 'asset');
  return h('div', {}, h('p', {}, pieceName(p)), row('تكلفتها', money(p.cost)), row('قيمتها النظرية الآن', money(p.theo)),
    buildForm([{ k: 'date', l: 'تاريخ البيع', t: 'date', v: L.today(), req: true }, { k: 'proceeds', l: 'مبلغ البيع الفعلي بالدينار', t: 'num', req: true }, { k: 'to', l: 'تذهب النقود إلى', t: 'select', opts: iq }, { k: 'note', l: 'الغرض من البيع / ملاحظة', t: 'text' },
      { ...priceDyn(() => p.metal), l: 'سعر الأونصة بالدولار يوم البيع' }, rateDyn('date', () => true)],
    v => { const pr = L.parseAmount(v.proceeds, 0); if (!confirm(`تأكيد بيع «${p.label || 'القطعة'}» بمبلغ ${L.fmt(pr)} د.ع وسعر أونصة ${v.price}$؟`)) return;
      return act(() => L.sellPiece(S, { date: v.date, id, proceeds: pr, to: v.to, note: v.note, price: L.parseAmount(v.price, 2), rate: L.parseAmount(v.rate, 2) }), 'سُجّل البيع').then(r => { if (r) go('assets', 'report', { id }); }); }, 'أكّد البيع')); }
function reportView(id) { const p = S.pieces[id]; let r; try { r = L.saleReport(S, id); } catch (e) { return h('p', {}, e.message); } const sg = n => n == null ? '—' : (n > 0 ? '+' : '') + L.fmt(n) + ' د.ع';
  return h('div', {}, h('h2', {}, pieceName(p)), row('تاريخ البيع', r.date), row('سعر الشراء الفعلي (التكلفة)', money(r.cost)), row('سعر البيع الفعلي', money(r.proceeds)), row('الربح/الخسارة المحققة', sg(r.total), r.total < 0 ? 'bad' : ''),
    sect('التفكيك', r.market == null ? h('p', { class: 'mut' }, 'لا يتوفر سعر أونصة وقت الشراء، فلا يمكن تفكيك النتيجة.') : null, row('أثر حركة السعر والصرف', sg(r.market)), row('أجور الصياغة الضائعة', sg(r.making == null ? null : -r.making)), row('خصم التاجر عن القيمة المعدنية', sg(r.dealer == null ? null : -r.dealer)),
      r.dealerBp != null ? row('نسبة خصم التاجر الفعلية', (r.dealerBp / 100).toFixed(2) + '%') : null, r.est ? h('p', { class: 'mut' }, 'تكلفة هذه القطعة تقديرية (قيمتها يوم البدء)، فالأجور الضائعة صفر بالتعريف.') : null),
    row('ذهبت النقود إلى', r.to || '—'), r.note ? row('الغرض', r.note) : null, backBtn(() => go('assets'))); }
SCREENS.assets = (sub, p) => { if (!S.x.openDate) return h('div', {}, h('h1', {}, 'الأصول'), h('p', {}, 'سجّل الرصيد الافتتاحي أولاً.'));
  if (sub === 'buy') return h('div', {}, backBtn(() => go('assets')), h('h1', {}, 'شراء قطعة'), h('p', { class: 'mut' }, 'الدفع بالدينار. للشراء بالدولار حوّل الدولار إلى دينار أولاً.'), buyForm());
  if (sub === 'old') return h('div', {}, backBtn(() => go('assets')), h('h1', {}, 'قطعة موجودة قبل البدء'), h('p', { class: 'mut' }, 'تُسجَّل بتاريخ البدء ولا تُحسب دخلاً.'), oldForm());
  if (sub === 'sell') return h('div', {}, backBtn(() => go('assets')), h('h1', {}, 'بيع قطعة'), sellForm(p.id));
  if (sub === 'report') return h('div', {}, h('h1', {}, 'تقرير البيع'), reportView(p.id));
  return h('div', {}, h('h1', {}, 'الأصول'), sect('', h('button', { class: 'lnk', onclick: () => go('more', 'goals') }, 'الأهداف')), ratesBlock(p && p.open === 'prices'), usdBlock(), metalsBlock(), valsBlock()); };
// التقييم اليدوي (عقار، أرض، سيارة): قيمتها التقديرية اليوم بالدينار. لا قيد ولا دخل: يغيّر التقييم فقط، والفرق عن التكلفة «غير محقق»
function valsBlock() { const V = L.valuations(S).filter(v => !v.hidden && (v.book !== 0 || v.hist.length)); if (!V.length) return null;
  const sg = n => (n > 0 ? '+' : '') + L.fmt(n) + ' د.ع', live = V.filter(v => v.book !== 0);
  return sect('التقييم اليدوي (عقار، أرض، سيارة)', h('p', { class: 'mut' }, 'اكتب قيمة الأصل التقديرية اليوم. لا يُسجَّل دخلاً ولا مصروفاً، بل يغيّر صافي الثروة السوقي فقط، والفرق عن تكلفته يظهر «غير محقق». التقييم الأحدث هو المعتمد.'),
    V.map(v => h('div', { class: 'tx' }, h('div', {}, v.name), row('التكلفة (الدفتر)', money(v.book)), row('آخر تقييم', v.last ? money(v.last.v) + ' (' + v.last.d + ')' : 'لم يُقيَّم'), v.last && v.book !== 0 ? row('الفرق (غير محقق)', sg(v.unreal)) : null,
      v.hist.length ? h('details', {}, h('summary', {}, 'سجل التقييمات (' + v.hist.length + ')'), v.hist.slice().reverse().map(x => h('div', { class: 'r' }, h('span', {}, x.d + ': ' + money(x.v)),
        btn('احذف', () => { if (confirm('حذف تقييم ' + x.d + ' لـ «' + v.name + '»؟')) act(() => L.removeValuation(S, v.id, x.d), 'حُذف التقييم'); }, 'mini alt')))) : null)),
    live.length ? buildForm([{ k: 'acct', l: 'الأصل', t: 'select', opts: live.map(v => [v.id, v.name]) }, { k: 'date', l: 'تاريخ التقييم', t: 'date', v: L.today(), req: true }, { k: 'value', l: 'القيمة التقديرية بالدينار', t: 'num', req: true }],
      v => act(() => L.setValuation(S, { acct: v.acct, date: v.date, value: L.parseAmount(v.value, 0) }), 'سُجّل التقييم'), 'سجّل التقييم') : null); }
// ===== المرحلة 5: الديون، الجمعيات، الأهداف، المتكررات =====
const iqOpts = () => accOpts(a => a.cur === 'IQD' && a.kind === 'asset');
const n0 = s => L.parseAmount(s, 0), dt = (k = 'date', l = 'التاريخ') => ({ k, l, t: 'date', v: L.today(), req: true });
const needAcct = () => iqOpts().length ? null : h('p', { class: 'mut' }, 'أنشئ حساباً بالدينار أولاً.');
function dueBlock() { const D = L.recurDue(S); if (!D.length) return null;
  return sect('مستحق الآن', D.map(x => h('div', { class: 'tx' }, h('div', { class: 'r' }, h('span', {}, (x.r.salary ? 'هل استلمت الراتب؟ ' : '') + x.r.name), h('b', {}, money(x.r.amount))), h('div', { class: 'mut' }, 'الموعد ' + x.due + (x.overdue ? ' (فات الموعد)' : '')),
    btn(x.r.salary ? 'نعم، استلمت' : 'سجّل', () => go('more', 'recurring', { confirm: x.r.id }), 'mini')))); }
// ---- الديون ----
MORE.push(['debts', 'الديون', () => { const p = view.p, D = L.debts(S), cur = p.id && D.find(d => d.id === p.id);
  if (needAcct()) return needAcct();
  const list = sect('الديون', D.length ? D.map(d => h('div', { class: 'tx' }, row((d.dir === 'lent' ? 'لي عند ' : 'عليّ لـ ') + d.person, d.settled ? 'مسدّد' : money(d.remaining), d.overdue ? 'bad' : ''), h('div', { class: 'mut' }, `الأصل ${L.fmt(d.amount)} · المسدّد ${L.fmt(d.paid)}` + (d.due ? ' · الاستحقاق ' + d.due : '') + (d.overdue ? ' (متأخر)' : '')),
    d.settled ? null : btn('سداد', () => go('more', 'debts', { id: d.id }), 'mini'))) : h('p', { class: 'mut' }, 'لا ديون مسجّلة.'));
  const repay = cur && !cur.settled ? sect('سداد: ' + cur.person, h('p', { class: 'mut' }, 'المتبقي ' + money(cur.remaining)), buildForm([dt(), { k: 'amount', l: 'المبلغ', t: 'num', v: String(cur.remaining), req: true }, { k: 'acct', l: cur.dir === 'lent' ? 'يدخل إلى' : 'يُدفع من', t: 'select', opts: iqOpts() },
      { k: 'fee', l: 'فائدة/رسوم إضافية (اختياري)', t: 'num', show: () => cur.dir === 'borrowed' }], v => act(() => L.debtRepay(S, { id: cur.id, date: v.date, amount: n0(v.amount), acct: v.acct, fee: v.fee && v.fee.trim() ? n0(v.fee) : 0 }), 'سُجّل السداد').then(() => go('more', 'debts')), 'سجّل السداد')) : null;
  const add = sect('دين جديد', h('p', { class: 'mut' }, 'الدين بالدينار. للدولار حوّله إلى دينار أولاً.'), buildForm([dt(), { k: 'dir', l: 'النوع', t: 'select', opts: [['lent', 'أقرضتُ شخصاً'], ['borrowed', 'اقترضتُ من شخص']] }, { k: 'person', l: 'الشخص', t: 'text', req: true }, { k: 'amount', l: 'المبلغ', t: 'num', req: true },
    { k: 'acct', l: 'الحساب', t: 'select', opts: iqOpts() }, { k: 'due', l: 'تاريخ الاستحقاق (اختياري)', t: 'date', future: true }, { k: 'note', l: 'ملاحظة', t: 'text' }], v => act(() => L.debtNew(S, { date: v.date, dir: v.dir, person: v.person, amount: n0(v.amount), acct: v.acct, due: v.due || null, note: v.note }), 'سُجّل الدين'), 'سجّل'));
  return h('div', {}, list, repay, add); }]);
// ---- الجمعيات ----
MORE.push(['jams', 'الجمعيات', () => { const p = view.p, J = S.x.jams.map(j => L.jamState(S, j)), cur = p.id && J.find(j => j.id === p.id);
  if (needAcct()) return needAcct();
  const list = sect(ti('الجمعيات', 'الجمعية'), J.length ? J.map(j => h('div', { class: 'tx' }, h('div', {}, j.name), row('القسط / الحصيلة', money(j.s) + ' / ' + money(j.pot)), row('الحالة', j.done ? 'اكتملت' : j.received ? `قبضتَ. بقي ${j.remaining} قسط (${money(j.remaining * j.s)} التزام)` : `دفعتَ ${j.paid} من ${j.turn} قبل القبض`),
    j.done ? null : h('div', {}, row('القسط القادم', j.next), btn('دفع قسط', () => go('more', 'jams', { id: j.id, mode: 'pay' }), 'mini'), j.received ? null : btn('قبض الحصيلة', () => go('more', 'jams', { id: j.id, mode: 'recv' }), 'mini')))) : h('p', { class: 'mut' }, 'لا جمعيات.'));
  const act1 = cur ? sect(cur.name + ' — ' + (p.mode === 'pay' ? 'دفع قسط' : 'قبض'), buildForm([dt(), { k: 'acct', l: p.mode === 'pay' ? 'يُدفع من' : 'تدخل إلى', t: 'select', opts: iqOpts() }],
    v => act(() => p.mode === 'pay' ? L.jamPay(S, { id: cur.id, from: v.acct, date: v.date }) : L.jamReceive(S, { id: cur.id, to: v.acct, date: v.date }), p.mode === 'pay' ? 'سُجّل القسط' : 'سُجّل القبض').then(() => go('more', 'jams')), 'سجّل')) : null;
  const add = sect('جمعية جديدة', buildForm([{ k: 'name', l: 'الاسم', t: 'text', req: true }, { k: 'N', l: 'عدد الأعضاء', t: 'num', req: true }, { k: 's', l: 'القسط الشهري', t: 'num', req: true }, { k: 'turn', l: 'رقم دورك (شهر القبض)', t: 'num', req: true }, { ...dt('start', 'تاريخ أول قسط'), future: true }],
    v => act(() => L.jamNew(S, { name: v.name, N: Number(L.norm(v.N)), s: n0(v.s), turn: Number(L.norm(v.turn)), start: v.start }), 'أُنشئت الجمعية'), 'أنشئ'));
  return h('div', {}, list, act1, add); }]);
// ---- الأهداف ----
// هدف الدولار يُعرض بالدولار ومعه ما يعادله بالدينار بآخر سعر صرف. هدف الدينار بالدينار فقط
const gm = (g, n) => g.cur === 'USD' ? L.fmtUsd(n) : money(n);
MORE.push(['goals', 'الأهداف', () => { const p = view.p, G = L.goalView(S), cur = p.id && G.find(g => g.id === p.id);
  const list = sect('الأهداف', G.length ? G.map(g => h('div', { class: 'tx' }, h('div', { class: 'r' }, h('span', {}, g.name + (g.kind === 'long' ? ' (طويل الأمد)' : ' (قصير الأمد)')), h('b', {}, g.pct + '%')),
    row(ti('المخصص / المستهدف', 'التخصيص'), gm(g, g.allocated) + ' / ' + gm(g, g.target)), g.iqd ? row('بالدينار بآخر سعر صرف', '≈ ' + L.fmt(g.iqd.allocated) + ' / ' + money(g.iqd.target)) : null,
    row('الموعد', g.targetDate + (g.skipped ? ` (مُدِّد ${g.skipped})` : '')), g.done ? h('p', { class: 'okc' }, 'اكتمل الهدف') : h('div', {}, row('القسط الشهري المطلوب', gm(g, g.monthly) + (g.iqd ? ' ≈ ' + money(g.iqd.monthly) : '')), g.iqd ? row('المتبقي بالدينار بآخر سعر', '≈ ' + money(g.iqd.remaining)) : null, row('المخصص هذا الشهر', gm(g, g.paidMonth)), g.behind > 0 ? (g.firstMonth ? row('القسط المطلوب هذا الشهر', gm(g, g.behind)) : row('متأخر عن الخطة', gm(g, g.behind), 'bad')) : null),
    btn('تخصيص', () => go('more', 'goals', { id: g.id, mode: 'alloc' }), 'mini'), btn('تحرير', () => go('more', 'goals', { id: g.id, mode: 'release' }), 'mini'),
    !g.done && g.behind > 0 && !g.firstMonth ? btn('تخطَّ شهراً ومدِّد الموعد', () => { if (confirm('تمديد موعد الهدف شهراً بدل بقاء المتأخر مستحقاً؟')) act(() => L.goalSkip(S, g.id), 'مُدِّد الموعد'); }, 'mini alt') : null)) : h('p', { class: 'mut' }, 'لا أهداف.'),
    h('p', { class: 'mut' }, 'التخصيص ظرف افتراضي: لا يحرك أي حساب ولا ينقص صافي الثروة، لكنه ينقص «المتاح للصرف».'), G.some(g => g.iqd) ? h('p', { class: 'mut' }, 'هدف الدولار: يُحجز من «المتاح للصرف» ما يعادل المبلغ بسعر يوم التخصيص، ويُعرض ما يعادله بالدينار بآخر سعر صرف أدخلته (' + (S.x.rates.length ? L.fmtRate(S.rate) + ' د.ع لكل 100$' : '—') + ').') : null);
  const mv = cur ? sect((p.mode === 'alloc' ? 'تخصيص لـ ' : 'تحرير من ') + cur.name, buildForm([dt(), { k: 'amount', l: cur.cur === 'USD' ? 'المبلغ (دولار)' : 'المبلغ', t: 'num', req: true }],
    async v => { const amt = cur.cur === 'USD' ? L.parseAmount(v.amount, 2) : n0(v.amount); if (p.mode === 'alloc') { const w = L.goalAdvice(S, cur.id, amt); if (w.length && !confirm(w.join('\n') + '\nمتابعة؟')) return; }
      await act(() => L.goalMove(S, { id: cur.id, amount: amt, date: v.date, release: p.mode === 'release' }), 'تم'); go('more', 'goals'); }, 'نفّذ')) : null;
  const add = sect('هدف جديد', buildForm([{ k: 'name', l: 'الاسم', t: 'text', req: true }, { k: 'cur', l: 'عملة الهدف', t: 'select', opts: [['IQD', 'دينار'], ['USD', 'دولار (ومعه ما يعادله بالدينار)']] },
    { k: 'target', l: 'المبلغ المستهدف (دينار)', t: 'num', req: true, show: v => v.cur !== 'USD' }, { k: 'targetUsd', l: 'المبلغ المستهدف (دولار)', t: 'num', req: true, show: v => v.cur === 'USD' }, { k: 'targetDate', l: 'الموعد', t: 'date', req: true, future: true }, { k: 'sav', l: 'هل هو هدف المدخرات (الطوارئ)؟', t: 'select', opts: [['0', 'لا'], ['1', 'نعم']] }, { k: 'priority', l: 'الأولوية', t: 'select', opts: [['1', 'عالية'], ['2', 'متوسطة'], ['3', 'منخفضة']] }, { k: 'kind', l: 'النوع', t: 'select', opts: [['short', 'قصير الأمد'], ['long', 'طويل الأمد']] }],
    async v => { const id = await act(() => { const id = L.goalNew(S, { name: v.name, cur: v.cur, target: v.cur === 'USD' ? L.parseAmount(v.targetUsd, 2) : n0(v.target), targetDate: v.targetDate, priority: Number(v.priority), kind: v.kind }); if (v.sav === '1') S.x.set.savingsGoal = id; return id; }, 'أُضيف الهدف');
      if (id) { const g = L.goalView(S).find(x => x.id === id); go('more', 'goals', { adv: { ...FM.goalAdviceText(S, g.iqd ? g.iqd.target : g.target, g.targetDate), name: g.name, sav: v.sav === '1' } }); } }, 'أضف'));
  const adv = p.adv ? sect('', h('div', { class: 'adv a-' + p.adv.lv }, h('b', {}, 'تعليق المستشار على «' + p.adv.name + '»' + (p.adv.sav ? ' (هدف المدخرات)' : '')), h('p', { class: 'advt' }, p.adv.text))) : null;
  return h('div', {}, adv, list, mv, add); }]);
// ---- المتكررات والراتب ----
MORE.push(['recurring', 'المتكررات والراتب', () => { const p = view.p, D = L.recurDue(S), cur = p.confirm && S.x.recur.find(r => r.id === p.confirm);
  if (needAcct()) return needAcct();
  const conf = cur ? (() => { const amt = h('input', { value: String(cur.amount), inputmode: 'decimal' }), dateIn = h('input', { type: 'date', value: L.today(), max: L.today() }), step = d => () => { try { amt.value = String(Math.max(1, n0(amt.value) + d)); } catch (e) { toast(e.message, true); } };
    return sect(cur.salary ? 'هل استلمت الراتب؟' : 'تأكيد: ' + cur.name, h('label', { class: 'f' }, h('span', {}, 'التاريخ'), dateIn), h('label', { class: 'f' }, h('span', {}, 'المبلغ (عدّله إن اختلف)'), amt),
      cur.salary ? h('div', {}, btn('+ 50,000', step(50000), 'alt mini'), btn('− 50,000', step(-50000), 'alt mini')) : null,
      btn('سجّل', () => act(() => L.recurConfirm(S, { id: cur.id, date: dateIn.value, amount: n0(amt.value) }), 'سُجّل').then(() => go('more', 'recurring'))), btn('تخطَّ هذا الشهر', () => act(() => L.recurSkip(S, cur.id), 'تُخطّي').then(() => go('more', 'recurring')), 'alt'), btn('ليس الآن', () => go('more', 'recurring'), 'alt')); })() : null;
  const due = !cur && D.length ? dueBlock() : null;
  const all = sect('كل البنود', S.x.recur.length ? S.x.recur.map(r => h('div', { class: 'tx' + (r.active ? '' : ' void') }, row(r.name + (r.salary ? ' (راتب)' : ''), money(r.amount)), h('div', { class: 'mut' }, (r.kind === 'income' ? 'دخل' : 'مصروف') + ` · يوم ${r.day} · تذكير قبل ${r.remind} أيام · ` + (r.active ? 'فعّال' : 'موقوف')),
    btn(r.active ? 'أوقف' : 'فعّل', () => act(() => L.recurToggle(S, r.id)), 'mini alt'), btn('احذف', () => { if (confirm('حذف هذا البند؟ لا تُحذف عملياته المسجّلة.')) act(() => L.recurDelete(S, r.id)); }, 'mini alt'))) : h('p', { class: 'mut' }, 'لا بنود. يظهر التذكير داخل التطبيق فقط عند فتحه.'));
  const add = sect('بند جديد', buildForm([{ k: 'kind', l: 'النوع', t: 'select', opts: [['expense', 'مصروف متكرر'], ['income', 'دخل متكرر (راتب)']] }, { k: 'name', l: 'الاسم', t: 'text', req: true }, { k: 'amount', l: 'المبلغ المتوقع', t: 'num', req: true },
    { k: 'acct', l: 'الحساب', t: 'select', opts: iqOpts() }, { k: 'cat', l: 'الفئة', t: 'select', opts: L.CATS.map(c => [c[0], c[1]]), show: v => v.kind === 'expense' }, { k: 'src', l: 'المصدر', t: 'select', opts: [['inc_salary', 'الراتب'], ['inc_other', 'دخل آخر']], show: v => v.kind === 'income' },
    { k: 'day', l: 'يوم الشهر (1 إلى 28)', t: 'num', req: true }, { k: 'remind', l: 'التذكير قبل كم يوماً (0 إلى 7)', t: 'num', v: '2', req: true }, { k: 'salary', l: 'هل هو الراتب؟', t: 'select', opts: [['0', 'لا'], ['1', 'نعم']], show: v => v.kind === 'income' }],
    v => act(() => L.recurNew(S, { kind: v.kind, name: v.name, amount: n0(v.amount), acct: v.acct, cat: v.kind === 'expense' ? v.cat : null, src: v.kind === 'income' ? v.src : null, day: Number(L.norm(v.day)), remind: Number(L.norm(v.remind)), salary: v.kind === 'income' && v.salary === '1' }), 'أُضيف البند'), 'أضف'));
  return h('div', {}, conf, due, all, add); }]);
// ===== المرحلة 6: شاشة الحالة (الرئيسية)، الشريط المتحرك، التقارير، حدود التنبيه =====
let tickTimer = null; // يُفرَّغ فقط (الشريطان الحاليان في tickTimers)
const sgn = n => n == null ? '—' : (n > 0 ? '+' : '') + L.fmt(n) + ' د.ع';
// لون المتاح للصرف (الوثيقة 7.1) حسب حدودك فقط: أحمر إن كان سالباً أو تجاوزتَ حداً، أصفر إن اقتربت، وإلا أخضر. تنبيهات النسخ وغيرها لا تلوّنه
function availLevel(st) { if (st.avail < 0) return ['badc', 'المخصص للأهداف أكبر من السيولة'];
  const b = L.budget(S); return b.some(x => x.over) ? ['badc', 'تجاوزتَ حداً من حدود هذا الشهر'] : b.some(x => x.near || x.pace) ? ['warnc', 'اقتربتَ من حد من حدود هذا الشهر'] : ['okc', 'ضمن حدودك هذا الشهر']; }
// آخر سعر صرف وتاريخه على الشاشة الرئيسية (الوثيقة 7.1)، والتحديث بنقرة في تبويب «الأصول»
function rateBlock() { const has = S.x.rates.length > 0, usd = userAccts(a => a.cur === 'USD').length > 0;
  return pubSect('سعر الصرف', row('100 دولار', has ? L.fmtRate(S.rate) + ' د.ع' : (usd ? '⚠ لم يُدخل بعد' : 'لم يُدخل'), has || !usd ? '' : 'bad'),
    has ? h('p', { class: 'mut' }, 'آخر تحديث: ' + S.x.rates[S.x.rates.length - 1].d) : null, btn('حدّث السعر', () => go('assets', null, { open: 'prices' }), 'alt mini'), nabdRateBtn(saveNabdRate, 'أكّد واحفظ')); }
const qk = (i, t, f, sec) => h('button', { class: 'qk' + (sec ? ' sec' : ''), onclick: f }, h('span', { class: 'qi' }, ico(i)), h('span', {}, t));
// خط اتجاه صافي الثروة عند نهايات الأشهر المحفوظة: شكل فقط بلا أي رقم، ويُخفى عند إخفاء الثروة
function nwTrend() { try { if (privHidden()) return null; const sn = S.x.snaps || {}, ks = Object.keys(sn).sort().slice(-12), ys = ks.map(k => sn[k].nw).filter(v => typeof v === 'number'); if (ys.length < 3) return null;
  const W = 300, H = 46, lo = Math.min(...ys), hi = Math.max(...ys), sx = i => 4 + i * (W - 8) / (ys.length - 1), sy = v => 5 + (hi - v) / ((hi - lo) || 1) * (H - 12), d = ys.map((v, i) => (i ? 'L' : 'M') + sx(i).toFixed(1) + ',' + sy(v).toFixed(1)).join(' ');
  const el = h('div', { class: 'trend', 'aria-hidden': 'true' }); el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="direction:ltr"><path d="' + d + ' L' + sx(ys.length - 1).toFixed(1) + ',' + H + ' L4,' + H + ' Z" fill="currentColor" opacity=".12"/><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>'; return el; } catch (e) { return null; } }
SCREENS.home = () => {
  if (!S.x.openDate) return h('div', {}, h('div', { class: 'hdr' }, h('h1', {}, 'أهلاً بك في فلوسي'), h('button', { class: 'gear', 'aria-label': 'الإعدادات والأدوات', onclick: () => go('more') }, '⚙')), h('p', { class: 'mut' }, 'ثلاث خطوات فقط لتبدأ. لديك نسخة احتياطية؟ ⚙ ثم «النسخ الاحتياطي» لاستعادتها.'),
    h('div', { class: 'card' }, h('h2', {}, '1. ما تملكه اليوم'), h('p', { class: 'mut' }, 'نقد، فيزا، دولار، بنك. تبدأ منها.'), btn('ابدأ الخطوة 1', () => go('accts', 'open'))),
    h('div', { class: 'card dim' }, h('h2', {}, '2. الراتب'), h('p', { class: 'mut' }, 'يُفتح بعد الخطوة 1: «أموالي» ثم «المتكررات والراتب».')),
    h('div', { class: 'card dim' }, h('h2', {}, '3. الذهب والفضة'), h('p', { class: 'mut' }, 'يُفتح بعد الخطوة 1: تبويب «الأصول» ثم «قطعة موجودة قبل البدء».')));
  const st = L.status(S);
  return h('div', {}, h('div', { class: 'hdr' }, h('h1', {}, 'فلوسي'), h('button', { class: 'gear', 'aria-label': 'الإعدادات والأدوات', onclick: () => go('more') }, '⚙')), (ADV = advItems(st), tickers(ADV)),
    (lv => { const el = sect(ti('المتاح للصرف'), h('div', { class: 'big ' + lv[0], onclick: () => go('more', 'reports') }, money(st.avail)), h('p', { class: 'mut ' + lv[0] }, lv[1]), nwTrend(), row(ti('السائل'), money(st.liq)),
      row('دخل هذا الشهر', money(st.income)), row('مصروف هذا الشهر', money(st.expense)), row('المتبقي من دخل الشهر', sgn(st.left))); el.classList.add('hero'); return el; })(availLevel(st)),
    advisorHome(ADV),
    rateBlock(),
    sect('اختصارات', h('div', { class: 'qgrid' }, qk('minus', '+ مصروف', () => go('ops', null, { kind: 'expense' })), qk('plus', '+ دخل', () => go('ops', null, { kind: 'income' })), qk('salary', 'الراتب', () => go('more', 'recurring'), 1), qk('assets', 'الذهب والفضة', () => go('assets'), 1))),
    nwBlock(), acctList());
};
const monthsList = () => { const od = S.x.openDate; if (!od) return []; const out = []; let k = L.mkey(od); const last = L.mkey(L.today()); for (let i = 0; i < 1200 && k <= last; i++, k = L.addMonths(k + '-01', 1).slice(0, 7)) out.push(k); return out.reverse(); };
function monthView(k) { let r; try { r = L.monthReport(S, k); } catch (e) { return h('p', {}, e.message); }
  const catRows = Object.entries(r.cat).sort((a, b) => b[1] - a[1]).map(([n, v]) => row(n, money(v))), flowRows = Object.entries(r.flows).map(([t, v]) => row(L.FLOW[t] || t, sgn(v)));
  const prev = (() => { try { return L.monthReport(S, L.prevMonth(k)); } catch (e) { return null; } })();
  return h('div', {}, r.sinceStart ? h('p', { class: 'mut' }, 'هذا أول شهر: المقارنة من لحظة الرصيد الافتتاحي.') : null,
    sect('الدخل والمصروف', row('الدخل', money(r.income)), row('المصروف', money(r.expense)), row('الوفر', sgn(r.savings)), prev && prev.expense > 0 ? row('المصروف قبل شهر', money(prev.expense) + (r.expense > prev.expense ? ' ▲' : r.expense < prev.expense ? ' ▼' : '')) : null),
    sect('المصروف حسب الفئة', catRows.length ? catRows : h('p', { class: 'mut' }, 'لا مصروفات.')),
    sect(ti('جسر صافي الثروة'), row('أول الشهر', money(r.nw0)), row('+ الدخل − المصروف', sgn(r.income - r.expense)), row('+ المحقق (معادن وصرف)', sgn(r.realized)), row(ti('+ فروقات المطابقة', 'المطابقة'), sgn(r.adj)), row('+ التغير غير المحقق (أسعار)', sgn(r.dU)), row('= آخر الشهر', money(r.nw1)), row('التغير', sgn(r.dNw)),
      h('p', { class: r.bridgeOk ? 'okc' : 'badc' }, r.bridgeOk ? '✓ المعادلة متطابقة' : '✗ المعادلة مختلة')),
    sect('حركة السيولة', flowRows.length ? flowRows : h('p', { class: 'mut' }, 'لا حركة.'), row('صافي حركة السيولة', sgn(r.liqNet))));
}
function yearView(y) { const r = L.yearReport(S, y); if (!r.months.length) return h('p', { class: 'mut' }, 'لا بيانات لهذه السنة.'); const t = r.tot;
  return h('div', {}, sect('ملخص ' + y, row('الدخل', money(t.income)), row('المصروف', money(t.expense)), row('الوفر', sgn(t.savings)), row('شراء معادن', money(t.buys)), row('بيع معادن', money(t.sales)), row('محقق', sgn(t.realized)), row('مطابقة', sgn(t.adj)), row('غير محقق', sgn(t.dU)), row('صافي الثروة أول الفترة', money(t.nwStart)), row('صافي الثروة آخر الفترة', money(t.nwEnd))),
    sect('الأشهر', h('table', {}, h('tr', {}, h('th', {}, 'الشهر'), h('th', {}, 'الدخل'), h('th', {}, 'المصروف'), h('th', {}, 'الثروة')), r.months.map(m => h('tr', {}, h('td', {}, m.month), h('td', {}, L.fmt(m.income)), h('td', {}, L.fmt(m.expense)), h('td', {}, L.fmt(m.nw1)))))));
}
MORE.push(['reports', 'التقارير والحدود', () => { const ms = monthsList(); if (!ms.length) return h('p', {}, 'سجّل الرصيد الافتتاحي أولاً.'); const p = view.p, mode = p.mode || 'month', k = p.k || ms[0], y = p.y || +L.today().slice(0, 4);
  const stale = L.snapStale(S), bd = L.budget(S);
  const tabs = seg([['month', 'شهري'], ['year', 'سنوي'], ['limits', 'الحدود']], mode, m => go('more', 'reports', { mode: m, k, y }));
  const body = mode === 'year' ? h('div', {}, seg([[y - 1, String(y - 1)], [y, String(y)]], y, v => go('more', 'reports', { mode, k, y: +v })), yearView(y))
    : mode === 'limits' ? h('div', {}, h('p', { class: 'mut' }, 'نسب افتراضية من دخل الشهر، وهي قواعد بسيطة قابلة للتعديل وليست استشارة مالية. عدّلها بما يناسبك.'), bd.map(x => h('div', { class: 'tx' }, row(x.g, x.pct + '% = ' + money(x.limit)), row('المصروف هذا الشهر', money(x.spent), x.over ? 'bad' : ''),
        h('label', { class: 'f' }, h('span', {}, 'النسبة %'), h('input', { value: String(x.pct), inputmode: 'numeric', onchange: e => act(() => L.setLimit(S, x.g, Number(L.norm(e.target.value))), 'حُفظ الحد') })))))
    : h('div', {}, h('label', { class: 'f' }, h('span', {}, 'الشهر'), h('select', { onchange: e => go('more', 'reports', { mode: 'month', k: e.target.value }) }, ms.map(m => h('option', { value: m, selected: m === k }, m)))), monthView(k));
  return h('div', {}, stale.length ? sect('أشهر تغيّرت بعد إغلاقها', stale.map(m => h('div', { class: 'r' }, h('span', {}, m + ' (' + sgn(S.x.snaps[m].stale.diff) + ')'), btn('اعتمد', () => act(() => L.acceptSnap(S, m), 'اعتُمد'), 'mini')))) : null, tabs, body); }]);
// ===== ⚙ الإعدادات والأدوات: الإعدادات والاختبار الذاتي =====
// المظهر والثيم: يغيّران الألوان والزخارف فقط (يُحفظان على هذا الجهاز ولا يدخلان بياناتك المالية)
function themeSect() { const cur = FTheme.get(), box = h('div', { class: 'themes' });
  const M = [['time', 'حسب الوقت', 'فاتح نهاراً وداكن ليلاً', 'LD'], ['sync', 'متزامن مع الهاتف', 'يتبع إعداد الآيفون', 'LD'], ['light', 'فاتح', 'دائماً', 'L'], ['dark', 'داكن', 'دائماً', 'D']];
  M.forEach(([k, n, d, pv]) => { const p = h('div', { class: 'tpv' }); pv.split('').forEach(c => p.append(h('i', { class: c }))); box.append(h('button', { class: 'tcard' + (k === cur ? ' on' : ''), 'aria-pressed': k === cur ? 'true' : 'false', onclick: () => { FTheme.set(k); render(); toast('تم تغيير المظهر: ' + n); } }, p, h('span', { class: 'tn' }, n), h('span', { class: 'td' }, d))); });
  return sect('المظهر (فاتح / داكن)', box); }
function skinSect() { const c = FTheme.cfg(), rot = c.mode === 'rotate', now = FTheme.resolve(FTheme.get()) === 'dark' ? 'D' : 'L', box = h('div', { class: 'skins' });
  const dateAr = d => nWhen(L.iso(d));
  FTheme.IDS.forEach(id => { const k = FTheme.SKINS[id], on = rot ? c.set.includes(id) : c.skin === id, half = m => { const v = k[m]; return h('i', { style: 'background:' + v[0] }, h('b', { style: 'background:' + v[1] }), h('u', { style: 'background:' + v[2] })); };
    box.append(h('button', { class: 'sk' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', 'data-skin': id, onclick: () => {
      if (!rot) { FTheme.setCfg({ skin: id }); render(); return toast('الثيم: ' + k.name); }
      const has = c.set.includes(id); if (has && c.set.length <= 2) return toast('اختر ثيمين على الأقل للتناوب', true);
      FTheme.setCfg({ set: has ? c.set.filter(x => x !== id) : c.set.concat(id) }); render(); } },
      on ? h('span', { class: 'ck' }, '✓') : null, h('div', { class: 'sp' }, half('L'), half('D')), h('span', { class: 'sn' }, k.name), h('span', { class: 'sd' }, k.desc))); });
  return sect('الثيم', seg([['fixed', 'ثيم ثابت'], ['rotate', 'تناوب تلقائي']], c.mode, k => { FTheme.setCfg({ mode: k }); render(); toast(k === 'rotate' ? 'التناوب: اختر ثيمين أو أكثر' : 'ثيم ثابت'); }),
    h('p', { class: 'mut' }, rot ? 'اختر الثيمات التي تريدها في التناوب (اثنان على الأقل)، ويتبدّل الثيم تلقائياً حسب المدة.' : 'اختر الثيم الذي يظهر به التطبيق.'),
    rot ? seg([['day', 'كل يوم'], ['week', 'كل أسبوع'], ['month', 'كل شهر']], c.every, k => { FTheme.setCfg({ every: k }); render(); }) : null, box,
    rot ? h('p', { class: 'mut' }, 'ثيم اليوم: ' + FTheme.SKINS[FTheme.pick(c)].name + ' · التغيير القادم: ' + dateAr(FTheme.nextChange(c)) + '. الترتيب كما في القائمة.') : null); }
MORE.push(['settings', 'الإعدادات', () => { const st = S.x.set;
  return h('div', {}, skinSect(), themeSect(), savingsSettings(), sect('طريقة التقييم', h('p', { class: 'mut' }, 'محافظ: المعادن بقيمتها النظرية والدولار بسعر التقييم. بالتكلفة: لا أرباح غير محققة.'),
    seg([['conservative', 'محافظ'], ['cost', 'بالتكلفة']], st.valuation, k => act(() => { st.valuation = k; }, 'تم'))),
    sect('الخصوصية: إخفاء الثروة', h('p', { class: 'mut' }, 'عند التفعيل تُخفى كل أرقامك المالية في كل الشاشات (••••••). زر 👁 يُظهرها 5 ثوانٍ ثم تُخفى تلقائياً، وتُخفى فوراً عند مغادرة التطبيق. أسعار السوق العامة تبقى ظاهرة. الإخفاء بصري فقط ولا يغيّر أي حساب.'),
      seg([['1', 'مفعّل'], ['0', 'متوقف']], st.hideAll ? '1' : '0', k => act(() => { st.hideAll = k === '1'; PRIV.until = 0; }, k === '1' ? 'أُخفيت الأرقام' : 'ظهرت الأرقام'))),
    sect(ti('الخصوصية: الاستشارات المرتبطة بثروتك', 'خصوصية الاستشارات'), h('p', { class: 'mut' }, 'إخفاء استشارات المستشار (على الرئيسية وفي صفحته وفي نبض السوق). التنبيهات الأساسية مثل «هل استلمت الراتب؟» وتجاوز الحدود تبقى. لا يغيّر أي حساب.'),
      seg([['0', 'ظاهرة'], ['1', 'مخفية']], st.hideAdvice ? '1' : '0', k => act(() => { st.hideAdvice = k === '1'; }, k === '1' ? 'أُخفيت الاستشارات' : 'ظهرت الاستشارات'))),
    sect('الإصدار', row('التطبيق', VER), h('p', { class: 'mut' }, 'قاعدة البيانات: flousi (محلية على هذا الهاتف). فحوصات المرحلة 0 في الصفحة المنفصلة:'), h('a', { href: 'diagnostics.html', class: 'btn' }, 'فتح صفحة الفحوصات'))); }]);
MORE.push(['selftest', 'الاختبار الذاتي', () => { const box = h('div', {}), out = h('div', {});
  const show = (r1, r2, r3) => { const all = [...r1.results, ...r2.results, ...((r3 || {}).results || [])], ok = all.filter(x => x.ok).length; out.replaceChildren(h('div', { class: 'big ' + (ok === all.length ? 'okc' : 'badc') }, ok + ' من ' + all.length),
    ...all.map(x => h('div', { class: 'tx' + (x.ok ? '' : ' bad') }, (x.ok ? '✓ ' : '✗ ') + x.id + ' ' + x.name + (x.ok ? '' : ' — ' + x.msg))));
    out._txt = VER + '\n' + all.map(x => (x.ok ? '✓ ' : '✗ ') + x.id + ' ' + x.name + (x.ok ? '' : ' — ' + x.msg)).join('\n') + '\nالنتيجة: ' + ok + ' من ' + all.length; };
  box.append(sect('الاختبار الذاتي', h('p', { class: 'mut' }, 'يشغّل اختبارات المحرك والتخزين على قاعدة مؤقتة في الذاكرة، ولا يمس بياناتك.'),
    btn('شغّل الاختبارات', async () => { out.replaceChildren('…'); const r3 = typeof FSelfTest3 !== 'undefined' ? await FSelfTest3.run() : { results: [] }; show(FSelfTest.run(), await FSelfTest2.run(), r3); }),
    btn('انسخ النتيجة', async () => { if (out._txt) { try { await navigator.clipboard.writeText(out._txt); toast('نُسخت النتيجة'); } catch (e) { toast('تعذّر النسخ', true); } } }, 'alt'), out)); return box; }]);
SCREENS.more = (sub) => { const m = MORE.find(x => x[0] === sub);
  if (m) { const par = PARENT[sub]; return h('div', {}, backBtn(() => par ? go(par) : go('more')), h('h1', {}, m[1]), m[2]()); }
  return h('div', {}, backBtn(() => go('home')), h('h1', {}, '⚙ الإعدادات والأدوات'), sect('', MORE.filter(x => !PARENT[x[0]]).map(x => h('button', { class: 'lnk', onclick: () => go('more', x[0]) }, x[1])))); };
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
const srcName = x => { const n = x && x.source && x.source.name; return !n ? null : /shafaq|شفق/i.test(n) ? 'مسح السوق المحلي' : n.replace(/ — Federal Reserve Bank of St\. Louis/, '').replace(/ \(أسعار مرجعية عبر Frankfurter\)/, ''); };
const srcLine = x => { const n = srcName(x); return n ? h('small', { class: 'src' }, 'المصدر: ' + n) : null; };
function nabdPrices() {
  const I = FN.ind, D = FN.der, par = I('usd_iqd_parallel'), g = I('xau_usd'), sv = I('xag_usd'), gsr = D('gsr');
  const conv = [['مثقال ذهب 21', 'gold21_mithqal'], ['غرام ذهب 21', 'gold21_gram'], ['غرام ذهب 24', 'gold24_gram'], ['أونصة ذهب', 'gold_ounce_iqd'], ['كيلو فضة 999', 'silver999_kg']].map(([l, id]) => [l, D(id)]);
  const cLive = conv[0][1] ? conv[0][1].live : 'unavailable', mk = D('gold_expected_with_making'), nahr = I('gold21_mithqal_nahr'), iq = I('gold21_mithqal_iraqi'), lc = D('local_vs_calc_gold21');
  const sb = v => nI(v.sell) + ' / ' + nI(v.buy);
  return [
    sect('١ · السعر العالمي (أونصة)', nRow('الذهب', g, v => nD(v) + ' $'), nRow('الفضة', sv, v => nD(v) + ' $'), gsr ? row(ti('نسبة الذهب إلى الفضة'), gsr.value == null ? '—' : String(gsr.value)) : null),
    sect(ti('٢ · التحويل الحسابي', 'التحويل الحسابي'), h('p', { class: 'mut' }, 'من السعر العالمي (Gold-API) بسعر الدولار المحلي', par && par.value ? ' (' + nI(par.value / 100) + ' للدولار)' : '', ' · بلا مصنعية · ', nChip(cLive)),
      h('table', {}, h('tr', {}, h('th', {}, 'الوحدة'), h('th', {}, 'دولار'), h('th', {}, 'دينار')),
        conv.filter(([, d]) => d && d.value).map(([l, d]) => h('tr', { class: d.live === 'current' ? '' : 'nold' }, h('td', {}, l), h('td', { class: 'n' }, nD(d.value.usd)), h('td', { class: 'n' }, nI(d.value.iqd)))))),
    mk && mk.value ? sect(ti('المتوقع مع المصنعية (' + nI(mk.value.making_per_gram) + ' للغرام)', 'المتوقع مع المصنعية'), h('p', { class: 'mut' }, 'ما تتوقع دفعه عند الصائغ تقريباً · ', nChip(mk.live)),
      row('مثقال 21', nI(mk.value.mithqal21)), row('غرام 21', nI(mk.value.gram21)), row('غرام 24', nI(mk.value.gram24))) : null,
    sect('٣ · السعر المحلي الفعلي', h('p', { class: 'mut' }, 'مسح السوق المحلي · بيع / شراء'),
      nahr ? h('div', { class: 'r nrow' + (nahr.live === 'current' ? '' : ' nold') }, h('span', {}, 'مثقال 21 خليجي — شارع النهر', srcLine(nahr), mk && mk.value ? h('small', { class: 'mut', style: 'display:block' }, '(المتوقع ' + nI(mk.value.mithqal21) + ')') : null), h('span', { class: 'nv' }, h('b', {}, nahr.value ? sb(nahr.value) : '—'), ' ', nChip(nahr.live, nT(nahr)))) : null,
      iq ? nRow('مثقال 21 عراقي', iq, sb) : null,
      lc && lc.value ? row('فرق الفعلي عن المحسوب', (lc.value.diff_gram > 0 ? '+' : '') + nI(lc.value.diff_gram) + ' للغرام (' + lc.value.diff_pct + '%)') : null,
      lc && lc.time_gap_hours > 6 ? h('p', { class: 'mut' }, 'تنبيه: بين السعرين ' + Math.round(lc.time_gap_hours) + ' ساعة، فالفرق تقريبي.') : null),
    sect('الدولار', nRow('الرسمي (البنك المركزي)', I('usd_iqd_official'), v => nI(v)),
      nRow('المحلي (السوق السوداء)', par, v => nI(v), 'لكل 100$'),
      (x => x ? nRow('صيرفات بغداد', x, v => nI(v.sell) + ' / ' + nI(v.buy), 'بيع/شراء') : null)(I('usd_iqd_shops_baghdad')),
      (d => d && d.value != null ? row(ti('الفجوة بين الرسمي والمحلي'), d.value + '%') : null)(D('official_parallel_gap')),
      nRow(ti('مؤشر الدولار الأمريكي DXY', 'DXY'), I('dxy'), v => nD(v)))];
}
function nabdEconomy() {
  const I = FN.ind, D = FN.der, pct = v => nD(v) + '%', fr = D('fed_target_range'), cot = v => (v.net_noncommercial > 0 ? '+' : '') + nI(v.net_noncommercial) + ' (' + (v.change_week > 0 ? '+' : '') + nI(v.change_week) + ' أسبوعياً)';
  return [sect('الاقتصاد الأمريكي', fr && fr.value ? h('div', { class: 'r nrow' + (fr.live === 'current' ? '' : ' nold') }, h('span', {}, ti('الفائدة الأمريكية (النطاق الرسمي)', 'الفائدة الأمريكية'), srcLine(I('fed_target_upper'))), h('span', { class: 'nv' }, h('b', {}, fr.value + '%'), ' ', nChip(fr.live, nT(I('fed_target_upper'))))) : null,
      nRow(ti('التضخم السنوي CPI', 'التضخم CPI'), I('cpi_yoy'), pct), nRow(ti('البطالة'), I('unrate'), pct), nRow(ti('الفائدة الفعلية (متوسط الشهر)', 'الفائدة الفعلية'), I('fed_funds'), pct),
      nRow(ti('مؤشر الدولار DXY', 'DXY'), I('dxy'), nD), nRow(ti('الدولار الموسّع للفدرالي', 'الدولار الموسّع'), I('usd_broad'), nD)),
    (s => s.length ? sect('الاتجاه (آخر 3 سنوات)', h('p', { class: 'mut' }, 'التضخم السنوي'), spark(FN.fredS('CPI_YOY').map(([d, v]) => [Date.parse(d), v]), '#c0392b'), h('p', { class: 'mut' }, 'العائد الحقيقي 10 سنوات'), spark(FN.fredS('DFII10').map(([d, v]) => [Date.parse(d), v]), '#2e86c1'),
      h('p', { class: 'mut' }, 'الدولار الموسّع'), spark(FN.fredS('DTWEXBGS').map(([d, v]) => [Date.parse(d), v]), '#7d3c98'), h('p', { class: 'mut' }, 'البطالة'), spark(FN.fredS('UNRATE').map(([d, v]) => [Date.parse(d), v]), '#1e8449')) : null)(FN.fredS('DFII10')),
    sect('العوائد', nRow(ti('عائد سندات 10 سنوات', 'عائد السندات'), I('ust10y'), pct), nRow('عائد سنتين', I('ust2y'), pct), nRow(ti('العائد الحقيقي 10 سنوات', 'العائد الحقيقي'), I('real10y'), pct), nRow(ti('توقعات التضخم 10 سنوات', 'توقعات التضخم'), I('breakeven10y'), pct)),
    sect(ti('مراكز المضاربين (COT)', 'COT'), h('p', { class: 'mut' }, 'صافي مراكز غير التجاريين في العقود الآجلة · أسبوعي'), nRow('الذهب', I('cot_gold'), cot), nRow('الفضة', I('cot_silver'), cot)),
    h('p', { class: 'mut' }, (FN.get().attribution || []).filter(t => !/shafaq|شفق/i.test(t)).join(' · '))];
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
function nabdAnalysis() {
  const r = view.p.r || '3m', m = view.p.m || 'gold', A = FN.analyze(), aux = FN.aux();
  const pick = (k, v) => go('nabd', null, { ...view.p, t: 'analysis', [k]: v });
  return [sect((m === 'gold' ? 'الذهب' : 'الفضة') + ' — منحنى السعر (أونصة بالدولار)', seg([['gold', 'الذهب'], ['silver', 'الفضة']], m, k => pick('m', k)), seg(RANGES.map(x => [x[0], x[1]]), r, k => pick('r', k)), metalChart(m, r),
      h('p', { class: 'mut' }, 'التاريخ حتى 16 تشرين الثاني 2026 من مراجعك المرفوعة؛ وما بعده من الجالب. ' + (aux.ref ? '' : '(المراجع لم تُحمَّل)'))),
    A.gsr ? sect('نسبة الذهب إلى الفضة: ' + A.gsr.v, gsrGauge(A.gsr.v), h('p', {}, A.gsr.tip), h('p', { class: 'mut' }, 'متوسط 10 سنوات قرابة 80. النسبة للتوزيع بين المعدنين، ولا تدخل في حكم الذهب.')) : null,
    sect(ti('العوامل المؤثرة في الذهب (أفق 3–5 سنوات)', 'العوامل المؤثرة'), A.factors.map(f => h('div', { class: 'sig' }, h('span', { class: 'dot', style: 'background:' + SIGC[f.sig] }),
      h('div', {}, h('b', {}, f.label), f.value != null ? h('span', {}, ' — ', h('bdi', { dir: 'ltr' }, String(f.value))) : null, h('div', { class: 'mut' }, f.reason + ' · الوزن ' + f.w + '%'))))),
    sect('الخلاصة', A.verdict ? h('div', { class: 'verdict' }, h('b', {}, A.verdict), h('div', { class: 'mut' }, 'الثقة: ' + A.conf + ' · ' + A.used + ' من ' + A.total + ' عوامل متاحة · المؤشر ', h('bdi', { dir: 'ltr' }, String(A.score))))
      : h('p', { class: 'mut' }, 'لا حكم الآن: العوامل المتاحة أقل من 4 أو البيانات قديمة. لا نبني حكماً على بيانات ناقصة.'),
      h('p', { class: 'mut' }, 'قواعد ثابتة تنظّم القرار وتمنع الاندفاع، ولا تتنبأ بالسوق. ليست استشارة ملزمة.')),
    nabdAdvice()];
}
function nabdNews() {
  const N = FN.news(), groups = {};
  N.items.forEach(i => { const k = i.when ? (i.when.length === 10 ? i.when : L.iso(new Date(i.when))) : '—'; (groups[k] = groups[k] || []).push(i); });
  const dayName = k => k === L.today() ? 'اليوم' : k === L.iso(new Date(Date.now() - 864e5)) ? 'أمس' : nWhen(k);
  return [N.week ? sect('ملخص الأسبوع', h('p', {}, N.week), h('p', { class: 'mut' }, 'يُكتب آلياً من الأرقام')) : null,
    ...Object.keys(groups).sort().reverse().map(k => sect(dayName(k), groups[k].map(i => h('div', { class: 'news' + (i.lv === 'old' ? ' nold' : '') }, h('div', { class: 't' }, i.t), h('div', { class: 'mut' }, (i.when && i.when.length > 10 ? nWhen(i.when) + ' · ' : '') + i.src + (i.lv === 'old' ? ' · قديم' : '')))))),
    N.upcoming.length ? sect('المواعيد القادمة', N.upcoming.map(([t, d]) => row(t, nWhen(d)))) : null,
    h('p', { class: 'mut' }, 'الأخبار مكتوبة من الأرقام نفسها مع ذكر المصدر، ولا تُنسخ نصوص الوكالات.')];
}
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
    sect('', h('div', { class: 'quick' }, btn('هل أشتري؟', () => go('insights', 'buy')), btn('المستشار', () => go('insights', 'advisor'), 'alt'), btn('التقارير والحدود', () => go('more', 'reports'), 'alt'))),
    sect('صافي الثروة', h('div', { class: 'big' }, cur ? money(cur.nw) : '—'), nwCh != null && ms.length > 1 ? row('التغيّر خلال الفترة', (nwCh >= 0 ? '+' : '') + nwCh.toFixed(1) + '%', nwCh < 0 ? 'bad' : 'okc') : null,
      ms.length > 1 ? lineChart(nwPts, { color: 'var(--acc)', fmt: v => (v / 1e6).toFixed(1) + 'م', labels: [[nwPts[0][0], kLab(ms[0].k)], [nwPts[nwPts.length - 1][0], kLab(cur.k)]] }) : h('p', { class: 'mut' }, 'يظهر المنحنى بعد مرور شهرين من التسجيل.')),
    sect('الدخل والمصروف', barsChart(per === 'm' ? ms.slice(-1) : ms.slice(-12)), h('div', { class: 'lg' }, h('span', {}, h('i', { style: 'background:var(--ok)' }), 'الدخل'), h('span', {}, h('i', { style: 'background:var(--bad)' }), 'المصروف')),
      row('مجموع الدخل', money(per === 'm' ? (cur ? cur.income : 0) : inc)), row('مجموع المصروف', money(per === 'm' ? (cur ? cur.expense : 0) : exp)),
      (r => r != null ? row(ti('نسبة الادخار'), r + '%', r < 10 ? 'bad' : r >= 20 ? 'okc' : '') : null)(per === 'm' ? (cur ? cur.rate : null) : rate),
      ms.filter(m => m.rate != null).length > 2 && per !== 'm' ? h('div', {}, h('p', { class: 'mut' }, 'نسبة الادخار شهرياً'), spark(ms.filter(m => m.rate != null).map(m => [Date.parse(m.k + '-15'), m.rate]), 'var(--ok)')) : null),
    sect('المصروف حسب الفئة' + (per === 'm' ? ' — هذا الشهر' : ''), cats.length ? hbars(cats) : h('p', { class: 'mut' }, 'لا مصروفات في الفترة.')),
    sect(ti('توزيع الأصول'), al.parts.length ? h('div', { class: 'dn' }, donut(al.parts), h('div', { class: 'lg col' }, al.parts.map(p => h('span', {}, h('i', { style: 'background:' + p.c }), p.n + ' ' + p.p + '%')))) : h('p', { class: 'mut' }, 'لا أصول بعد.'),
      mn ? h('p', { class: 'mut' }, 'الذهب والفضة بقيمة البيع المحسوبة الآن من نبض السوق: ' + money(mn.total) + ' (عرض فقط؛ لا يغيّر أسعارك المسجّلة).') : h('p', { class: 'mut' }, 'الذهب والفضة بالأسعار المسجّلة في «الأصول».')),
    sect('الأهداف', G.length ? G.map(g => h('div', { class: 'hb' }, h('div', { class: 'r' }, h('span', {}, g.name + (sv && sv.id === g.id ? ' (المدخرات)' : '')), h('b', {}, g.pct + '%')), h('div', { class: 'hbt' }, h('div', { class: 'hbf' + (g.behind > 0 && !g.firstMonth ? ' late' : ''), style: 'width:' + Math.min(100, g.pct) + '%' })))) : h('p', { class: 'mut' }, 'لا أهداف.'),
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
    h('p', { class: 'mut' }, 'حساب فقط: لا يُسجَّل شيء. إن قرّرت الشراء فسجّله من «العمليات» أو «الأصول».')) : null;
  return h('div', {}, backBtn(() => { NB.buy = null; NB.buyIn = null; go('insights'); }), h('h1', {}, 'هل أشتري؟'), h('p', { class: 'mut' }, 'اكتب المبلغ واختر الغرض، فيقيّم المستشار أثره على سيولتك ومدخراتك وأهدافك. للذهب والفضة اكتب السعر الذي يعرضه البائع ووزنه.'), sect('', f), out);
}
SCREENS.insights = (sub) => {
  if (sub === 'buy') return buyScreen();
  if (sub === 'advisor') return advisorScreen();
  if (!S.x.openDate) return h('div', {}, h('h1', {}, 'تحليلاتي'), h('p', {}, 'سجّل الرصيد الافتتاحي أولاً.'));
  if (!NB.tried) { NB.tried = true; Promise.all([FN.load(), FN.loadAux()]).then(() => { if (['home', 'nabd', 'insights'].includes(view.tab)) render(); }); }
  return h('div', {}, h('h1', {}, 'تحليلاتي'), ...insightsMain());
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
const advGo = it => it.go ? go(it.go[0], it.go[1] || null, it.go[2] || {}) : null;
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
  const mine = items.length ? items.map(x => ({ t: x.title, lv: x.lv, it: x })) : L.TIPS.map(t => ({ t }));
  const N = FN.get() ? FN.news() : null, world = N && N.items.length ? N.items.slice(0, 8).map(x => ({ t: x.t, lv: x.lv === 'warn' ? 'warn' : '' })) : [{ t: FN.err() ? 'نبض السوق غير متاح الآن (لا اتصال). يعود تلقائياً.' : 'نبض السوق: جارٍ التحميل…' }];
  if (!NB.tried) { NB.tried = true; Promise.all([FN.load(), FN.loadAux()]).then(() => { if (['home', 'nabd', 'insights'].includes(view.tab)) render(); }); }
  return h('div', {}, tickerLine('لك', mine, x => x && x.it ? advGo(x.it) : go('insights', 'advisor')), pubEl(tickerLine('العالم', world, () => go('nabd', null, { t: 'news' })))); }
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
  const M = FN.get(), tab = view.p.t || 'prices';
  if (!NB.tried) { NB.tried = true; Promise.all([FN.load(), FN.loadAux()]).then(() => { if (['home', 'nabd', 'insights'].includes(view.tab)) render(); }); }
  const head = h('div', {}, h('h1', {}, 'نبض السوق'), h('p', { class: 'mut' }, M ? 'آخر تحديث للبيانات: ' + nWhen(M.generated_at) + ' · يتحدّث تلقائياً' : (FN.err() ? 'تعذّر تحميل بيانات السوق' : 'جارٍ التحميل…'),
    ' ', h('button', { class: 'mini alt', onclick: async () => { const g0 = (FN.get() || {}).generated_at; await Promise.all([FN.load(true), FN.loadAux(true)]); render(); const g1 = (FN.get() || {}).generated_at; toast(FN.err() ? 'تعذّر التحديث: ' + FN.err() : g1 && g1 === g0 ? 'لا توجد بيانات أحدث الآن · آخر ملف ' + nWhen(g1) + ' · يتجدد الملف عند تشغيل الجالب على GitHub' : 'حُدّثت البيانات', !!FN.err()); } }, 'تحديث')));
  if (!M) return h('div', {}, head, sect('', h('p', {}, FN.err() ? 'لا تتوفر بيانات السوق الآن. تحقق من الاتصال ثم اضغط «تحديث». بياناتك المالية لم تتأثر.' : '…')));
  return h('div', { class: 'pub' }, head, seg([['prices', 'الأسعار'], ['analysis', 'التحليل'], ['econ', 'الاقتصاد'], ['news', 'الأخبار']], tab, k => go('nabd', null, { t: k })), ...(tab === 'econ' ? nabdEconomy() : tab === 'analysis' ? nabdAnalysis() : tab === 'news' ? nabdNews() : nabdPrices()));
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
  (S.x.vals || []).forEach(v => ev.push({ k: 'price', o: 0, d: v.d, t: 'تقييم «' + ((S.acc[v.a] || {}).name || v.a) + '»', v: money(v.v) }));
  S.goals.filter(g => g.date).forEach(g => { const d = S.x.goalsDef.find(x => x.id === g.name); ev.push({ k: 'goal', o: 0, d: g.date, t: (g.amount >= 0 ? 'تخصيص لـ ' : 'تحرير من ') + '«' + (d ? d.name : g.name) + '»', v: money(Math.abs(g.amount)) }); });
  if (S.x.backup) ev.push({ k: 'backup', o: 0, d: L.iso(new Date(S.x.backup.t)), t: 'آخر نسخة احتياطية', v: S.x.backup.tx + ' عملية' });
  const xs = ev.filter(e => f === 'all' || e.k === f).sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : b.o - a.o).slice(0, 300);
  return h('div', {}, h('p', { class: 'mut' }, 'كل ما سُجّل في بياناتك بتاريخه، الأحدث أولاً. للقراءة فقط. العمليات المعكوسة تبقى ظاهرة للأمانة.'),
    seg([['all', 'الكل'], ['tx', 'العمليات'], ['price', 'الأسعار والتقييم'], ['goal', 'الأهداف']], f, k => go('more', 'log', { f: k })),
    sect('', xs.length ? xs.map(e => h('div', { class: 'tx' }, h('div', { class: 'r' }, h('span', {}, e.d + ' · ' + e.t), h('b', {}, e.v)))) : h('p', { class: 'mut' }, 'لا شيء بعد.'), ev.length > 300 ? h('p', { class: 'mut' }, 'يُعرض آخر 300 سجل.') : null)); }]);
// ===== f1-v3.2: صفحة «التعليمات» =====
// لتحديثها عند إضافة ميزة: عدّل HELP فقط (عنوان، ثم فقرات؛ السطر الذي يبدأ بـ «• » يُعرض كنقطة)
const HELP = [
  ['ما هو «فلوسي»؟', [
    'تطبيق شخصي لإدارة مالك: تسجّل فيه دخلك ومصروفك وما تملكه وما عليك، فيعطيك صورة واضحة عن وضعك المالي وكيف يتغيّر شهراً بعد شهر.',
    'كل بياناتك محفوظة على هاتفك فقط، ولا تُرسل إلى أي خادم. لهذا النسخة الاحتياطية مهمة جداً (انظر قسمها في الأسفل).',
    'التطبيق يحسب ويعرض وينبّه، لكنه لا يضمن أي نتيجة مالية، والقرار دائماً لك.']],
  ['كيف تبدأ (أول مرة)', [
    '• الخطوة 1: من الرئيسية «ابدأ الخطوة 1»، واكتب كم عندك اليوم في كل حساب (نقد، فيزا، بنك، دولار، عقار، التزام). هذا «الرصيد الافتتاحي» ولا يُحسب دخلاً.',
    '• إن كان عندك دولار فاكتب سعر الصرف اليوم، أو اضغط «اعتمد سعر نبض السوق» ثم «ضعه في الخانة».',
    '• الخطوة 2: من «أموالي» ← «المتكررات والراتب» أضف راتبك بنوع «دخل متكرر» واختر «هل هو الراتب؟ نعم». يذكّرك التطبيق بموعده.',
    '• الخطوة 3: من «الأصول» ← «قطعة موجودة قبل البدء» أضف ذهبك وفضتك بالوزن والعيار.',
    '• أخطأت في رقم البداية؟ «أموالي» ← «تصحيح الرصيد الافتتاحي».']],
  ['التسجيل اليومي الصحيح', [
    '• «العمليات» ← «مصروف»: المبلغ، والحساب الذي صرفت منه، والفئة (أكل، مواصلات...)، ثم «تم». سجّل كل مصروف في يومه.',
    '• «دخل»: أي مال يدخل (راتب أو دخل إضافي).',
    '• «تحويل»: نقل مال بين حساباتك (من الفيزا إلى النقد، أو صرف دولار إلى دينار). لا يُحسب دخلاً ولا مصروفاً.',
    '• «مطابقة نقد»: إن عددت نقدك ووجدته مختلفاً عن المسجّل، اكتب الرقم الفعلي فيُصحَّح الفرق.',
    '• «تحويل العملات»: حاسبة بين الدينار والدولار بالسعر المعتمد أو بسعر يدوي لهذه العملية. يعرض السعر المستخدم والنتيجة، ويمكنك تسجيلها تحويلاً بين حساباتك، أو اعتماد السعر اليدوي سعراً للتطبيق بعد تأكيدك. السعر المعتمد لا يتغير وحده.',
    '• أخطأت في عملية؟ اضغط «تراجع» تحتها في القائمة ثم أدخلها صحيحة. تبقى المعكوسة ظاهرة في السجل للأمانة.']],
  ['التبويبات الستة', [
    '• الرئيسية: شريط «لك» (تنبيهاتك واستشاراتك) وشريط «العالم» (أهم أخبار السوق)، والمتاح للصرف، وأهم 3 استشارات، وسعر الصرف، وصافي الثروة، وأرصدتك.',
    '• العمليات: تسجيل المصروف والدخل والتحويل والمطابقة، و«تحويل العملات»، وآخر العمليات.',
    '• أموالي: حساباتك، والديون (لك أو عليك)، والجمعيات، والمتكررات والراتب.',
    '• الأصول: سعر الصرف وأسعار الأونصة، ودولارك بمتوسط التكلفة، وقطع الذهب والفضة (شراء وبيع)، وتقييم العقار والسيارة، والأهداف.',
    '• نبض السوق: أسعار الذهب والفضة والدولار، والتحليل، والاقتصاد الأمريكي، والأخبار.',
    '• تحليلاتي: رسوم وضعك المالي، و«هل أشتري؟»، والمستشار، والتقارير والحدود.',
    '• ⚙ في الرئيسية: الإعدادات، والقفل، والنسخ الاحتياطي، و«سجل التغييرات» (كل ما سجّلته بتاريخه)، وبصمة البيانات، وفحص السلامة، والاختبار الذاتي، وهذه التعليمات.',
    '• التنقل بالسحب: اسحب الشاشة يميناً أو يساراً للانتقال بين أقسام التبويب ثم إلى التبويب التالي. لا يعمل السحب فوق الرسوم والجداول وخانات الإدخال.']],
  ['قراءة الأرقام والتقارير', [
    '• المتاح للصرف: ما تستطيع صرفه بعد حجز مبالغ أهدافك. لونه أخضر ضمن حدودك، وأصفر إن اقتربت من حد، وأحمر إن تجاوزت.',
    '• صافي الثروة: ما تملكه ناقص ما عليك. اضغط ⓘ بجانب أي مصطلح لشرحه.',
    '• تحليلاتي: منحنى ثروتك، ودخلك ومصروفك لكل شهر، ونسبة ادخارك، وأين يذهب مصروفك، وتوزيع أصولك. غيّر الفترة من الأزرار في الأعلى.',
    '• التقارير والحدود: تقرير شهري وسنوي، و«جسر صافي الثروة» الذي يفسّر سبب تغيّرها، و«الحدود» وهي نسب من دخلك لكل نوع مصروف، فينبهك التطبيق قبل تجاوزها. عدّلها بما يناسبك.',
    '• استفد منها هكذا: إن كانت نسبة ادخارك أقل من 10% فابحث في «المصروف حسب الفئة» عن أكبر بند وابدأ به.']],
  ['الأهداف والمدخرات', [
    '• أنشئ هدفاً من «الأصول» ← «الأهداف»: الاسم والمبلغ والموعد، ويعرض لك القسط الشهري المطلوب.',
    '• «تخصيص»: تحجز مبلغاً للهدف دون نقله من حسابك. «تحرير»: تعيده متاحاً للصرف.',
    '• هدف المدخرات (الطوارئ): علّم هدفاً بأنه «هدف المدخرات» عند إنشائه، أو من ⚙ ← الإعدادات. يقيس المستشار أمانك المالي عليه ويعلّق على مبلغه وموعده.']],
  ['الذهب والفضة والدولار', [
    '• كل قطعة تُسجَّل وحدها بوزنها وعيارها وما دفعته فيها. تعرض تكلفتها وقيمتها المعدنية الحالية.',
    '• عند البيع يعرض «تقرير البيع» كم ربحت أو خسرت، ومقدار ما ضاع من المصنعية وخصم الصائغ.',
    '• الدولار يُحسب بمتوسط سعر شرائك، فتعرف ربحك أو خسارتك عند الصرف.',
    '• نسبة المعادن المستهدفة: حدّدها في ⚙ ← الإعدادات إن أردت، فينبّهك المستشار إن صارت معادنك فوقها أو تحتها.']],
  ['نبض السوق', [
    '• الأسعار: الأونصة العالمية للذهب والفضة، ثم تحويلها بالحساب إلى مثقال وغرام بسعر الدولار المحلي، ثم «المتوقع مع المصنعية»، ثم السعر المحلي الفعلي في السوق.',
    '• الدولار: الرسمي (البنك المركزي)، والمحلي (السوق السوداء)، والفجوة بينهما، ومؤشر DXY.',
    '• تحت كل سعر مصدره ووقت آخر تحديث. «حالي» يعني حديثاً، و«قديم» يعني أنه تأخر فلا تعتمد عليه لقرار اليوم.',
    '• التحليل: منحنى الذهب والفضة، ونسبة الذهب إلى الفضة، وسبعة عوامل مؤثرة وخلاصة (شراء تدريجي، أو انتظار، أو محايد)، واستشارات السوق المرتبطة بوضعك. هي قواعد تنظّم القرار ولا تتنبأ بالسعر.',
    '• الاقتصاد: الفائدة والتضخم والبطالة والعوائد الأمريكية ومراكز المضاربين. الأخبار: مكتوبة آلياً من الأرقام نفسها.',
    '• سعر الصرف في التطبيق أنت من يحدده. يمكنك اعتماد سعر نبض السوق بزر «اعتمد سعر نبض السوق» في الرئيسية أو «الأصول»: يظهر السعر ووقته ومصدره، ولا يُحفظ إلا بعد تأكيدك.']],
  ['المستشار و«هل أشتري؟»', [
    '• المستشار يقرأ أرقامك ونبض السوق ويعطيك ملاحظات مرتبة: الأحمر يحتاج انتباهاً، والأصفر للمراجعة، والأخضر إنجازات، والأزرق معلومات.',
    '• «افتح» ينقلك إلى المكان المناسب. «رأيته» يخفي الملاحظة مدة، وتعود فوراً إن ساء الرقم.',
    '• إن تراكمت ملاحظات حمراء ظهرت «أولويتك هذا الأسبوع» لتبدأ بالأهم.',
    '• «هل أشتري؟» في تحليلاتي: اكتب المبلغ ونوع الشراء (ترفيه، سفر، شخصي، عقار، ذهب، فضة، أصل آخر)، فيقارنه بسيولتك ومدخراتك وراتبك ويعطيك رأياً. للذهب يقارن سعر البائع بالمتوقع ويبيّن خسارتك لو بعت فوراً.',
    '• ملاحظات المستشار قواعد عامة مساعدة، وليست استشارة مالية ملزمة.']],
  ['إخفاء الثروة والخصوصية', [
    '• ⚙ ← الإعدادات ← «الخصوصية: إخفاء الثروة» ← «مفعّل»: تظهر كل مبالغك هكذا ••••••، مفيد أمام الآخرين.',
    '• زر 👁 في أسفل الشاشة يُظهر الأرقام 5 ثوانٍ ثم يخفيها تلقائياً. تُخفى فوراً عند مغادرة التطبيق.',
    '• أسعار السوق العامة والنسب والتواريخ تبقى ظاهرة. الإخفاء بصري فقط ولا يغيّر أي رقم.',
    '• «الخصوصية: الاستشارات المرتبطة بثروتك»: خيار مستقل يخفي بطاقات المستشار أو يظهرها.',
    '• القفل: ⚙ ← «القفل» لتفعيل رمز من 6 أرقام يحمي التطبيق عند فتحه.']],
  ['النسخ الاحتياطي والاستعادة', [
    '• أول مرة تفتح ⚙ ← «النسخ الاحتياطي» يظهر لك «مفتاح الاسترداد». انسخه بزر «نسخ المفتاح» واكتبه أيضاً على ورقة واحفظه في مكانين. بدونه لا تُفتح أي نسخة، ولا يمكن استرجاعه.',
    '• «💾 احفظ نسخة الآن»: ضغطة واحدة تفتح المشاركة بملف flousi-backup.flousibak. اختر «حفظ في الملفات» ثم iCloud Drive، واستبدل الملف القديم إن سُئلت.',
    '• خذ نسخة بعد كل جلسة إدخال كبيرة. التطبيق يذكّرك إن تأخرت.',
    '• الاستعادة على هاتف جديد: افتح الرابط وأضف التطبيق إلى الشاشة الرئيسية، ثم ⚙ ← «النسخ الاحتياطي» ← «استعادة نسخة»: اكتب مفتاحك القديم ثم اختر الملف. يفحص التطبيق النسخة ويعرض ملخصها (تاريخها، وعدد عملياتها، وآخر عملية، وصافي الثروة)، ولا يستعيدها إلا بعد ضغطك «استعد هذه النسخة». إن كانت أقدم من بياناتك الحالية ينبّهك ويطلب تأكيداً إضافياً. تُحفظ لقطة من بياناتك الحالية 30 يوماً يمكن التراجع إليها.',
    '• بعد الاستعادة افتح ⚙ ← «بصمة البيانات» وقارنها بلقطة أخذتها قبل النسخ للتأكد.']]
];
MORE.unshift(['help', 'التعليمات', () => h('div', { class: 'help' }, h('p', { class: 'mut' }, 'شرح مختصر لاستعمال التطبيق في الإصدار ' + VER + '. اضغط أي عنوان لفتحه.'),
  HELP.map(([t, ps], i) => sect('', fold(t, i === 0, ps.map(x => x.startsWith('• ') ? h('p', { class: 'hb-i' }, x.slice(2)) : h('p', {}, x)))))) ]);
// ===== التنقل بالسحب (f1-v4.3) =====
// السحب الأفقي يبدّل بين البوابات الست فقط (الرئيسية، العمليات، أموالي، الأصول، نبض السوق، تحليلاتي) وهو على صفحتها الأولى.
// داخل أي بوابة أو صفحة فرعية لا يوجد سحب بين الأقسام. السحب لليمين = البوابة التالية (اتجاه القراءة العربية)، ولليسار = السابقة.
// الرجوع من أي صفحة فرعية: زر «رجوع» الكبير بسهم، أو السحب من حافة الشاشة نحو الداخل (كما في الآيفون).
// لا يعمل فوق خانات الإدخال والرسوم والجداول، ولا إن كانت الحركة عمودية.
const PAGES = ['home', 'ops', 'accts', 'assets', 'nabd', 'insights'].map(tab => ({ tab }));
function pageIdx() { const v = view; if (v.sub) return -1; return PAGES.findIndex(x => x.tab === v.tab); }
function swipeGo(dir) { const i = pageIdx(); if (i < 0) return false; const j = i + dir; if (j < 0 || j >= PAGES.length) return false;
  go(PAGES[j].tab, null, {}); const a = $('#app'); a.classList.remove('sw-n', 'sw-p'); void a.offsetWidth; a.classList.add(dir > 0 ? 'sw-n' : 'sw-p'); return true; }
function swipeBack() { const b = $('#app .back'); if (!b) return false; b.click(); return true; }
(() => { let x0 = 0, y0 = 0, t0 = 0, on = false, edge = 0; const EDGE = 28;
  const NO = 'input,select,textarea,svg,.chart,table,#eye,#tipbox,.noswipe';
  document.addEventListener('touchstart', e => { on = false; edge = 0; if (e.touches.length !== 1 || !S || bootErr || !unlocked) return; const lk = $('#lock'); if (lk && !lk.hidden) return;
    const p = e.touches[0], atL = p.clientX < EDGE, atR = p.clientX > innerWidth - EDGE;
    if (atL || atR) { if ($('#app .back')) { edge = atL ? 1 : -1; x0 = p.clientX; y0 = p.clientY; t0 = Date.now(); on = true; } return; } // الحافة: رجوع فقط
    const t = e.target; if (t && t.closest && t.closest(NO)) return; const ae = document.activeElement; if (ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) return;
    x0 = p.clientX; y0 = p.clientY; t0 = Date.now(); on = true; }, { passive: true });
  document.addEventListener('touchmove', e => { if (on && e.touches.length !== 1) on = false; }, { passive: true });
  document.addEventListener('touchcancel', () => { on = false; }, { passive: true });
  document.addEventListener('touchend', e => { if (!on) return; on = false; const p = e.changedTouches[0], dx = p.clientX - x0, dy = p.clientY - y0;
    if (edge) { if (Date.now() - t0 < 900 && dx * edge >= 64 && Math.abs(dx) > 1.5 * Math.abs(dy)) swipeBack(); return; }
    if (Date.now() - t0 > 800 || Math.abs(dx) < 70 || Math.abs(dx) < 2 * Math.abs(dy)) return; swipeGo(dx > 0 ? 1 : -1); }, { passive: true });
  // iOS: يمنع تكبير الصفحة بالقرص أو بالنقر المزدوج
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(n => document.addEventListener(n, e => e.preventDefault(), { passive: false }));
  document.addEventListener('dblclick', e => { if (!(e.target.closest && e.target.closest('input,textarea'))) e.preventDefault(); });
})();
// ===== الإطار: التنقل والإقلاع =====
const TABS = [['home', 'الرئيسية'], ['ops', 'العمليات'], ['accts', 'أموالي'], ['assets', 'الأصول'], ['nabd', 'نبض السوق'], ['insights', 'تحليلاتي']];
// المرحلة 2: لا «المزيد». صفحاته الفرعية تبقى بمساراتها نفسها (go('more', x)) لكنها تتبع زراً واضحاً في الشريط، ورجوعها إليه.
// الإعدادات والأدوات تُفتح من زر ⚙ أعلى الرئيسية.
const PARENT = { debts: 'accts', jams: 'accts', recurring: 'accts', goals: 'assets', reports: 'insights' }; // ما لم يُذكر يتبع الرئيسية (⚙)
const navTab = () => view.tab === 'more' ? (PARENT[view.sub] || 'home') : view.tab;
const MONEY_LINKS = [['debts', 'الديون'], ['jams', 'الجمعيات'], ['recurring', 'المتكررات والراتب']];
// ===== معالج الأخطاء العام بعد الإقلاع =====
// render لا يرمي أبداً: إن تعطّلت شاشة يظهر بدلها تنبيه مع التبويبات، فلا تبقى الشاشة فارغة. لا يكتب في التخزين.
function render() { try { renderView(); } catch (e) { screenFail(e); } }
const errInfo = e => VER + ' — ' + view.tab + (view.sub ? '/' + view.sub : '') + ': ' + ((e && (e.message || String(e))) || '');
const copyInfo = t => async () => { try { await navigator.clipboard.writeText(t); toast('نُسخت التفاصيل'); } catch (x) { toast('تعذّر النسخ', true); } };
function screenFail(e) {
  tickTimers.forEach(clearInterval); tickTimers = []; const msg = (e && (e.message || String(e))) || '', home = view.tab === 'home' && !view.sub;
  $('#app').replaceChildren(h('h1', {}, 'تعذّر عرض هذه الشاشة'),
    sect('', h('p', {}, 'بياناتك المحفوظة لم تتأثر. انتقل إلى تبويب آخر أو أعد المحاولة.'), msg ? h('p', { class: 'mut', style: 'direction:ltr;text-align:left;word-break:break-word' }, msg) : null,
      home ? btn('أعد التشغيل', () => location.reload()) : btn('العودة إلى الرئيسية', () => go('home')), btn('انسخ تفاصيل الخطأ', copyInfo(errInfo(e)), 'alt')));
  try { $('#nav').replaceChildren(...TABS.map(([k, t]) => h('button', { class: k === navTab() ? 'on' : '', onclick: () => go(k) }, ico(k), h('span', {}, t)))); } catch (x) {}
}
// أخطاء لم يلتقطها أي جزء (زر أو مهمة غير متزامنة): رسالة قصيرة، والشاشة كما هي. تُفعَّل بعد نجاح الإقلاع فقط
let lastErr = { m: '', t: 0 };
function globalErr(e) { if (bootErr) return; const m = (e && (e.message || String(e))) || 'خطأ غير معروف';
  if (m === lastErr.m && Date.now() - lastErr.t < 3000) return; lastErr = { m, t: Date.now() }; toast('حدث خطأ غير متوقع: ' + m, true); }
function renderView() {
  const app = $('#app'); app.replaceChildren(); const scr = SCREENS[view.tab] || SCREENS.home, bb = S.x.openDate && view.sub !== 'backup' ? backupBanner() : null; app.append(...[integBanner(), bb, scr(view.sub, view.p)].filter(Boolean)); // append(null) في المتصفح يكتب النص null
  if (S.x.openDate && !sessionDismiss && FB.status(S).level === 'block') { sessionDismiss = true; if (confirm('مضى أكثر من 14 يوماً على آخر نسخة احتياطية. فتح صفحة النسخ الآن؟')) { view = { tab: 'more', sub: 'backup', p: {} }; return render(); } }
  $('#nav').replaceChildren(...TABS.map(([k, t]) => h('button', { class: k === navTab() ? 'on' : '', onclick: () => go(k) }, ico(k), h('span', {}, t))));
  privApply();
}
// شاشة خطأ الإقلاع: تحل محل «…» عند أي فشل. للقراءة فقط: لا تكتب في التخزين ولا تحذف شيئاً، إلا إذا اخترتَ الاستعادة بنفسك
let bootErr = false;
// استعادة من شاشة الخطأ: الطريقة نفسها في صفحة النسخ (فتح وتحقق كامل ثم تأكيد ثم استبدال ذري مع لقطة 30 يوماً قابلة للتراجع). تظهر فقط إن كانت ملفات النسخ والتخزين محمّلة
function bootRestore() {
  const ready = (() => { try { return !!(FB && FStore && FLS && BE); } catch (e) { return false; } })(); if (!ready) return null;
  const key = h('input', { placeholder: 'مفتاح الاسترداد', autocomplete: 'off' }), file = h('input', { type: 'file', accept: '*/*', hidden: true });
  file.onchange = async () => { const f = file.files[0]; file.value = ''; if (!f) return;
    try { const bytes = new Uint8Array(await f.arrayBuffer()), { payload } = await FB.open(bytes, key.value), m = payload.manifest;
      if (!confirm(`استعادة ${m.txCount} عملية، صافي الثروة ${FL.fmt(m.nw)} د.ع؟ ستستبدل البيانات الحالية (وتُحفظ لقطة منها 30 يوماً يمكن التراجع إليها).`)) return;
      const cur = S || Object.assign(FE.create(), { x: {}, sec: {} }); await FB.restore(BE, cur, bytes, key.value); toast('تمت الاستعادة: ' + m.txCount + ' عملية. يُعاد التشغيل…'); setTimeout(() => location.reload(), 800); }
    catch (e) { toast(e.message === 'auth' ? 'المفتاح خاطئ أو الملف تالف' : e.message === 'format' ? 'ملف غير صالح' : 'تعذّرت الاستعادة: ' + (e.message || e), true); } };
  return sect('استعادة من نسخة احتياطية', h('p', { class: 'mut' }, 'إن تكرّر الخطأ بعد إعادة المحاولة: اكتب مفتاح الاسترداد ثم اختر آخر نسخة. تُحفظ البيانات الحالية لقطةً 30 يوماً، ويمكن التراجع من صفحة النسخ بعد أن يعمل التطبيق.'),
    key, h('label', { class: 'btn', onclick: () => file.click() }, 'اختر ملف النسخة'), file); }
function bootFail(why, e) {
  bootErr = true; tickTimers.forEach(clearInterval); tickTimers = [];
  const msg = e ? (e.message || String(e)) : '', info = VER + ' — ' + why + (msg ? ': ' + msg : '');
  const lock = $('#lock'); if (lock) lock.hidden = true; // لا بيانات معروضة هنا، فلا حاجة للقفل فوقها
  $('#app').replaceChildren(h('h1', {}, 'تعذّر تشغيل فلوسي'),
    sect('', h('p', {}, why), h('p', {}, 'بياناتك محفوظة على هذا الهاتف ولم يُحذف منها شيء.'), h('p', { class: 'mut' }, 'أغلق التطبيق وافتحه مع اتصال بالإنترنت. إن تكرّر الخطأ فانسخ التفاصيل وأرسلها.'),
      msg ? h('p', { class: 'mut', style: 'direction:ltr;text-align:left;word-break:break-word' }, msg) : null,
      btn('أعد المحاولة', () => location.reload()),
      btn('انسخ تفاصيل الخطأ', async () => { try { await navigator.clipboard.writeText(info + (integ.length ? '\n' + integ.join('\n') : '')); toast('نُسخت التفاصيل'); } catch (x) { toast('تعذّر النسخ', true); } }, 'alt')),
    integ.length ? sect('فحص السلامة وجد ' + integ.length + ' مشكلة', h('p', { class: 'mut' }, 'هذا سبب الخطأ على الأرجح. لا تحذف التطبيق، واحتفظ بآخر نسخة احتياطية خارجية، وأرسل التفاصيل.'), integ.map(m => h('div', { class: 'tx bad' }, m))) : null,
    bootRestore());
  $('#nav').replaceChildren();
}
(async () => {
  const has = f => { try { return f() != null; } catch (e) { return false; } }; // ملف فشل أثناء تحميله يرمي حتى مع typeof، فنلتقطه
  const miss = [[() => FLS, 'core.js'], [() => FE, 'engine.js'], [() => FL, 'logic.js'], [() => FStore, 'store.js'], [() => FB, 'backup.js']].filter(x => !has(x[0])).map(x => x[1]);
  if (miss.length) return bootFail('ملفات التطبيق ناقصة أو تالفة: ' + miss.join('، '));
  try { BE = FStore.idb(); S = await FStore.load(BE); } catch (e) { return bootFail('تعذّر فتح التخزين', e); }
  try {
    if (navigator.storage && navigator.storage.persist) { (navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false)).then(p => p || navigator.storage.persist())
      .then(r => { persist = !!r; if (!persist && !bootErr && view.tab === 'home' && !view.sub) render(); }).catch(() => { persist = 'na'; }); } else persist = 'na';
    if (lockOn()) showLock(); else unlocked = true;
    if (S.x.openDate) { try { await FStore.run(BE, S, () => L.snapMonths(S)); } catch (e) {} }
    try { integ = L.integrity(S); } catch (e) { integ = ['تعذّر تشغيل فحص السلامة: ' + (e.message || e)]; }
    privObs = new MutationObserver(() => privApply()); setTimeout(() => prebuild(), 2500); renderView(); // الإقلاع يبقى كما اعتُمد: خطأ الشاشة الأولى يذهب إلى bootFail
    addEventListener('error', ev => globalErr(ev.error || ev.message)); addEventListener('unhandledrejection', ev => globalErr(ev.reason));
  } catch (e) { bootFail('خطأ أثناء عرض الشاشة', e); }
})();
