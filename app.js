'use strict';
// فلوسي — الواجهة. كل شيء محلي: التخزين IndexedDB باسم flousi (قاعدة المرحلة 0 flousi-p0 لا تُمسّ).
const $ = s => document.querySelector(s);
const h = (t, a, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a || {})) { if (n === 'class') e.className = v; else if (n.startsWith('on')) e[n] = v; else if (v !== false && v != null) e.setAttribute(n, v === true ? '' : v); }
  k.flat(9).forEach(c => { if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(c)); }); return e; };
// إن نقص ملف أو تلف فلا يتوقف هذا الملف هنا؛ الإقلاع في الأسفل يكشف ذلك ويعرض شاشة خطأ بدل «…»
const L = (() => { try { return FL; } catch (e) { return null; } })(), E = (() => { try { return FE; } catch (e) { return null; } })(), VER = 'f1-v4.11'; // ارفع VER مع V في sw.js عند كل إصدار
let S, BE, view = { tab: 'home', sub: null, p: {} }, sessionDismiss = false, integ = [], persist = null; // persist: نتيجة طلب التخزين الدائم (8.1): true مثبّت، false مرفوض، 'na' غير مدعوم، null لم يُعرف بعد // integ: نتيجة فحوصات السلامة (4.4) عند الفتح
const money = n => L.fmt(n) + ' د.ع';
const toast = (m, bad) => { const t = $('#toast'); t.textContent = m; t.className = bad ? 'bad on' : 'on'; clearTimeout(toast.t); toast.t = setTimeout(() => { t.className = ''; }, bad ? 5000 : Math.max(2200, m.length * 70)); };
const go = (tab, sub, p) => { view = { tab, sub: sub || null, p: p || {} }; render(); window.scrollTo(0, 0); };
// البند 9.2: لا عملية بتاريخ في المستقبل. يوم واحد سماحاً لفروق التوقيت. يُفحص داخل المعاملة فيُلغى كل شيء إن فشل
const futureLim = () => L.iso(new Date(Date.now() + 864e5));
function noFuture(n, g) { const lim = futureLim(), bad = [...S.tx.slice(n).map(t => t.date), ...S.goals.slice(g).map(x => x.date).filter(Boolean), ...S.x.rates.map(r => r.d), ...S.x.prices.map(r => r.d), ...(S.x.vals || []).map(r => r.d)].find(d => d > lim);
  if (bad) throw new Error('التاريخ ' + bad + ' في المستقبل. اختر تاريخ اليوم أو قبله.'); }
// ذاكرة نتائج للأداء: نتائج الحسابات الثقيلة تُحفظ لحالة البيانات نفسها فقط. أي تعديل (act) يرفع DGEN فتُهمل كلها، وأثناء التعديل لا تُستعمل أبداً
let DGEN = 0, INACT = 0; const MEMO = new WeakMap();
const memo = (name, fn) => function (...a) { if (INACT || !S || a[0] !== S) return fn.apply(this, a); let m = MEMO.get(S); if (!m || m.g !== DGEN) { m = { g: DGEN, v: new Map() }; MEMO.set(S, m); }
  const k = name + '|' + L.today() + '|' + JSON.stringify(a.slice(1)); if (m.v.has(k)) return m.v.get(k); const r = fn.apply(this, a); m.v.set(k, r); return r; };
const act = async (fn, ok) => { INACT++; DGEN++; try { const r = await FStore.run(BE, S, () => { const n = S.tx.length, g = S.goals.length, out = fn(); noFuture(n, g); return out; }); DGEN++; INACT--; if (ok) toast(ok); render(); return r; } catch (e) { DGEN++; INACT--; toast(e.message || String(e), true); } };
const userAccts = f => Object.values(S.acc).filter(a => (a.type || /^u\d+$/.test(a.id)) && !a.metal && !a.hidden && a.type !== 'stock' && (!f || f(a))); // الأسهم لها نماذجها في «الأصول». المخفي لا يظهر في النماذج
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
  'السعر المرجعي': 'سعر تحويل الدولار المعتمد في نبض السوق: متوسط سعري البيع والشراء في صيرفات بغداد من النشرة نفسها. البيع والشراء يُحفظان منفصلين. إن لم يُنشرا يُستعمل سعر البورصة.',
  'الفجوة بين الرسمي والموازي': 'كم يزيد سعر الدولار في السوق عن السعر الرسمي للبنك المركزي. اتساعها يعني ضغطاً على الدينار.',
  'تفكيك الحركة': 'سعر المثقال بالدينار = الأونصة العالمية × سعر الدولار. لذلك تغيّره يساوي تغيّر الأونصة زائد تغيّر الدولار، فتعرف أيهما حرّكه.',
  'الذاكرة': 'أحداث مؤرخة (قرارات الدينار والفائدة الأمريكية) وما فعله سعر الذهب بعد 30 و90 يوماً منها، محسوباً من البيانات التاريخية.',
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
  const show = () => { const p = FN.ref(); // السعر المرجعي: متوسط البيع والشراء (f1-v4.11)
    if (!p || p.value == null) return box.replaceChildren(h('p', { class: 'bad' }, FN.err() ? 'سعر نبض السوق غير متاح الآن (لا اتصال). سعرك المحفوظ لم يتغير.' : 'سعر نبض السوق غير متاح الآن. سعرك المحفوظ لم يتغير.'), btn('إغلاق', () => box.replaceChildren(b0), 'alt mini'));
    box.replaceChildren(h('div', { class: 'card' }, h('b', {}, 'سعر الدولار المرجعي في نبض السوق'),
      row('100 دولار', nI(p.value) + ' دينار'), p.buy ? row('البيع / الشراء', nI(p.sell) + ' / ' + nI(p.buy)) : null, row('آخر تحديث', nWhen(nT(p)) || '—'), h('div', {}, nChip(p.live, nT(p), nF(p))),
      p.live !== 'current' ? h('p', { class: 'bad' }, 'تنبيه: هذا السعر قديم، تأكد منه قبل اعتماده.') : null,
      h('p', { class: 'mut' }, 'يُعتمد بتاريخ اليوم (' + L.today() + '). لن يتغير سعرك تلقائياً عند تحديث السوق لاحقاً.'),
      btn(okLabel || 'أكّد', () => { box.replaceChildren(b0); apply(p.value); }), btn('إلغاء', () => { box.replaceChildren(b0); toast('لم يتغير شيء'); }, 'alt'))); };
  const b0 = btn('اعتمد سعر نبض السوق', async () => { b0.disabled = true; try { await FN.load(); } finally { b0.disabled = false; } show(); }, 'alt mini');
  box.append(b0); return box; }
const saveNabdRate = v => act(() => L.setRate(S, L.today(), v * 100), 'حُفظ سعر الصرف: ' + nI(v) + ' لكل 100$');
const advHiddenNote = () => S.x.set.hideAdvice ? h('p', { class: 'mut' }, 'الاستشارات مخفية بطلبك. لإظهارها: ⚙ ← الخصوصية ← الاستشارات.') : null;

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
  const SK = fOn('stocks') ? FSK.view(S).filter(x => !x.hidden && x.qty > 0) : [];
  return grp.map(([t, f]) => { const xs = A.filter(a => f(a) && !S.acc[a.id].hidden && S.acc[a.id].type !== 'stock' && typeOn(S.acc[a.id].type)), sk = t === 'أصول أخرى' ? SK : [];
    return xs.length || sk.length ? sect(t, xs.map(a => row(a.name, a.cur === 'USD' ? L.fmtUsd(a.bal) + ' ≈ ' + money(a.iqd) : V[a.id] != null ? money(V[a.id]) + ' (مقدّر)' : money(a.bal))), sk.map(x => row(x.name + ' (أسهم)', money(x.mkt)))) : null; });
}
function opsForm(kind) {
  const D = { k: 'date', l: 'التاريخ', t: 'date', v: L.today(), req: true }, N = { k: 'note', l: 'ملاحظة (اختياري)', t: 'text' };
  const isUsd = id => id && S.acc[id] && S.acc[id].cur === 'USD', ok = m => () => toast(m);
  const parse = (id, s) => L.parseAmount(s, decOf(id)), rt = (id, v) => isUsd(id) ? L.parseAmount(v.rate, 2) : null;
  const A = accOpts(), first = A[0] ? A[0][0] : '';
  if (!A.length) return h('p', { class: 'mut' }, 'أنشئ حساباً أولاً من تبويب «الحسابات» (أو سجّل الرصيد الافتتاحي).');
  if (kind === 'income') return buildForm([D, { k: 'acct', l: 'يدخل إلى', t: 'select', opts: A }, { k: 'src', l: 'المصدر', t: 'select', opts: [['inc_salary', 'الراتب'], ['inc_other', 'دخل آخر']] },
    { k: 'amount', l: 'المبلغ', t: 'num', req: true }, rateDyn('date', v => isUsd(v.acct)), N],
    async v => { const amount = parse(v.acct, v.amount), id = await saveTx(() => L.income(S, { date: v.date, acct: v.acct, src: v.src, amount, r: rt(v.acct, v), note: v.note }), 'دخل ' + amtStr(amount, S.acc[v.acct].cur));
      if (id && v.src === 'inc_salary') pyfAfterSalary(amount, v.acct, v.date); }, 'سجّل الدخل');
  if (kind === 'expense') return quickExpense();
  if (kind === 'expense_full') return buildForm([D, { k: 'acct', l: 'يُصرف من', t: 'select', opts: A }, { k: 'amount', l: 'المبلغ', t: 'num', req: true },
    { k: 'cat', l: 'الفئة', t: 'select', opts: L.CATS.map(c => [c[0], c[1]]) }, rateDyn('date', v => isUsd(v.acct)), N],
    v => saveTx(() => L.expense(S, { date: v.date, acct: v.acct, cat: v.cat, amount: parse(v.acct, v.amount), r: rt(v.acct, v), note: v.note }), 'سُجّل المصروف'), 'تم');
  if (kind === 'transfer') { const diff = v => v.from && v.to && S.acc[v.from] && S.acc[v.to] && S.acc[v.from].cur !== S.acc[v.to].cur, bothUsd = v => isUsd(v.from) && isUsd(v.to);
    return buildForm([D, { k: 'from', l: 'من', t: 'select', opts: A }, { k: 'to', l: 'إلى', t: 'select', opts: A, v: A[1] ? A[1][0] : first },
      { k: 'amount', l: 'المبلغ المدفوع (بعملة حساب المصدر)', t: 'num', req: true }, { k: 'amount2', l: 'المبلغ المستلم فعلياً (بعملة حساب الوجهة)', t: 'num', req: true, show: diff },
      { ...rateDyn('date', bothUsd), l: 'سعر 100 دولار في ذلك اليوم' }, N],
      v => saveTx(() => L.transfer(S, { date: v.date, from: v.from, to: v.to, amount: parse(v.from, v.amount), amount2: diff(v) ? parse(v.to, v.amount2) : 0, r: bothUsd(v) ? L.parseAmount(v.rate, 2) : null, note: v.note }), 'سُجّل التحويل'), 'حوّل'); }
  const iq = A.filter(a => S.acc[a[0]].cur === 'IQD');
  return buildForm([D, { k: 'acct', l: 'الحساب (بالدينار)', t: 'select', opts: iq }, { k: 'counted', l: 'الرصيد الفعلي بعد العدّ', t: 'num', req: true }, N],
    v => saveTx(() => L.reconcile(S, { date: v.date, acct: v.acct, counted: L.parseAmount(v.counted, 0) }), 'سُجّلت المطابقة'), 'سوِّ الفرق');
}
function txList(n = 40) {
  const xs = L.listTx(S).slice(0, n);
  return sect('آخر العمليات', xs.length ? xs.map(t => h('div', { class: 'tx' + (t.voided || t.reversal ? ' void' : '') },
    h('div', { class: 'r' }, h('span', {}, h('span', { class: 'cat' }, catIco(t.label)), t.date + ' · ' + t.label), h('b', {}, money(t.amount) + (t.usd ? ' (' + L.fmtUsd(t.usd) + ')' : ''))),
    h('div', { class: 'mut' }, (t.from ? t.from + ' ← ' : '') + t.to + (t.note ? ' — ' + t.note : '') + (t.voided ? ' (معكوسة)' : '')),
    (!t.voided && !t.reversal && t.label !== 'رصيد افتتاحي' && t.label !== 'تصحيح افتتاحي') ? btn('تراجع', () => { if (confirm('عكس هذه العملية؟ تبقى ظاهرة في السجل.')) act(() => { const o = S.tx.find(x => x.id === t.id); L.undo(S, t.id, L.today() > o.date ? L.today() : o.date); }, 'عُكست العملية'); }, 'mini') : null))
    : h('p', { class: 'mut' }, 'لا عمليات بعد.'));
}
SCREENS.ops = (sub, p) => { if (sub === 'edit') return editScreen(view.p.id); const kind = view.p.kind || 'expense';
  return h('div', {}, h('h1', {}, 'عملية جديدة'), seg([['expense', 'مصروف'], ['income', 'دخل'], ['transfer', 'تحويل'], ['reconcile', 'مطابقة نقد'], ['fx', 'تحويل العملات']], kind, k => go('ops', null, { kind: k })), kind === 'fx' ? fxForm() : opsForm(kind), txList2()); };

function openingWizard() {
  const rows = h('div', {}), lab = (t, c) => h('label', { class: 'f' }, h('span', {}, t), c), mk = (pre = {}) => { const r = h('div', { class: 'orow card' }); const f = {};
    f.name = h('input', { placeholder: 'مثال: نقد في الجيب', value: pre.name || '' }); f.type = h('select', {}, typeOpts().map(([k, v]) => h('option', { value: k }, v))); if (pre.type && typeOpts().some(o => o[0] === pre.type)) f.type.value = pre.type;
    f.cur = h('select', {}, [['IQD', 'دينار عراقي'], ['USD', 'دولار']].map(([k, t]) => h('option', { value: k }, t))); if (pre.cur) f.cur.value = pre.cur; f.amount = h('input', { placeholder: 'اتركه فارغاً إن لم يوجد', inputmode: 'decimal' });
    f.rate = h('input', { placeholder: 'مثال: 150000', inputmode: 'decimal' }); const rl = lab('متوسط سعر شرائه: دينار لكل 100 دولار (اختياري)', f.rate);
    const sync = () => { rl.hidden = f.cur.value !== 'USD'; }; f.cur.onchange = sync; sync(); r._f = f;
    r.append(lab('اسم الحساب', f.name), lab('النوع', f.type), lab('العملة', f.cur), lab('كم فيه الآن؟', f.amount), rl, btn('حذف هذا السطر', () => { if (confirm('حذف هذا السطر من النموذج؟\nلم يُحفظ بعد، فلن يُحذف أي حساب أو بيانات محفوظة.')) r.remove(); }, 'mini alt')); rows.append(r); };
  if (fOn('t_asset_cash')) mk({ name: 'نقد', type: 'asset_cash' }); if (fOn('t_visa')) mk({ name: 'فيزا', type: 'visa' }); if (fOn('t_asset_cash')) mk({ name: 'دولار', type: 'asset_cash', cur: 'USD' }); if (!rows.children.length) mk();
  const date = h('input', { type: 'date', value: L.today(), max: L.today() }), rate = h('input', { placeholder: 'مثال: 150000', inputmode: 'decimal' });
  return h('div', {}, sect('الخطوة 1: ما تملكه اليوم', h('p', { class: 'mut' }, 'اكتب كم عندك الآن في كل حساب. لا يُحسب دخلاً. اترك الحساب الذي لا تملكه فارغاً. الذهب والفضة والراتب يأتيان بعد هذه الخطوة.'),
      lab('تاريخ البدء', date)), rows, btn('+ إضافة حساب آخر (عقار، التزام...)', () => mk(), 'alt'),
    sect('', lab('سعر الصرف اليوم: كم دينار يساوي 100 دولار (مطلوب إن أدخلت دولاراً)', rate), nabdRateBtn(v => { rate.value = String(v); toast('وُضع السعر في الخانة، ويُحفظ مع «سجّل وابدأ»'); }, 'ضعه في الخانة'),
    btn('سجّل وابدأ', () => { try {
      const data = [...rows.children].map(r => { const f = r._f, cur = f.cur.value, kind = L.TYPES[f.type.value][1]; if (!f.amount.value.trim()) return null;
        if (cur === 'USD' && kind === 'liab') throw new Error('الالتزام بالدولار غير مدعوم'); return { name: f.name.value, type: f.type.value, cur, amount: L.parseAmount(f.amount.value, cur === 'USD' ? 2 : 0), r: cur === 'USD' ? (f.rate.value.trim() || rate.value.trim() ? L.parseAmount(f.rate.value || rate.value, 2) : (() => { throw new Error('اكتب سعر الصرف اليوم (كم دينار يساوي 100 دولار): مطلوب لحساب «' + f.name.value + '»'); })()) : null }; }).filter(Boolean);
      if (!data.length) throw new Error('أدخل رصيد حساب واحد على الأقل'); const hasUsd = data.some(d => d.cur === 'USD');
      act(() => { if (hasUsd) L.setRate(S, date.value, L.parseAmount(rate.value, 2)); L.opening(S, date.value, data); }, 'سُجّل. الآن أضف الراتب والذهب من الصفحة الرئيسية').then(() => { if (S.x.openDate) go('home'); /* عند الفشل يبقى المعالج بمدخلاته */ }); } catch (e) { toast(e.message, true); } })));
}
SCREENS.accts = (sub) => {
  if (sub === 'open' || !S.x.openDate && sub !== 'list') return h('div', {}, h('h1', {}, 'الحسابات'), openingWizard());
  const f = buildForm([{ k: 'name', l: 'اسم الحساب', t: 'text', req: true }, { k: 'type', l: 'النوع', t: 'select', opts: typeOpts() }, { k: 'cur', l: 'العملة', t: 'select', opts: [['IQD', 'دينار'], ['USD', 'دولار']] }],
    v => act(() => L.addAccount(S, v), 'أُضيف الحساب'), 'أضف حساباً');
  return h('div', {}, h('h1', {}, 'أموالي'), sect('', moneyLinks().map(([k, t]) => h('button', { class: 'lnk', onclick: () => go('more', k) }, t))), h('h2', { class: 'sub' }, 'الحسابات'), acctList(), sect('حساب جديد', h('p', { class: 'mut' }, 'يبدأ الحساب بصفر. للمال الموجود سلفاً استعمل الرصيد الافتتاحي عند البدء، أو سجّل تحويلاً/دخلاً.'), f), openingFixBlock(), manageBlock());
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
  const ex = exclInfo(), shown = p.nw - ex.amt; // الاستبعاد (البند 11) عرض فقط: القيود والتقارير والجسر بالأرقام الكاملة
  return sect(ti('صافي الثروة'), h('div', { class: 'big', onclick: () => privHidden() ? privReveal() : null }, mask(money(shown))), privOn() ? h('p', { class: 'mut' }, 'الأرقام مخفية: اضغط 👁 أو الرقم لإظهارها 5 ثوانٍ') : null,
    ex.names.length ? h('p', { class: 'mut', 'data-excl': '1' }, 'مستبعد من هذا الرقم: ' + ex.names.join('، ') + ' (من ⚙ ← الأقسام والميزات)') : null, ex.names.length ? row('صافي الثروة الكامل', mask(money(p.nw))) : null,
    row('بالدولار', mask(nwUsd(shown))), row('الأصول', mask(money(p.cur.assets))), row('الالتزامات', mask(money(p.cur.liab))), row('التغير هذا الشهر', mask(d(p.dMonth))), row('التغير منذ بداية السنة', mask(d(p.dYear))),
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
          try { await FB.restore(BE, S, bytes, kv); S = await FStore.load(BE); DGEN++; integ = L.integrity(S); toast('تمت الاستعادة: ' + m.txCount + ' عملية'); go('home'); } catch (e) { toast('تعذّرت الاستعادة: ' + (e.message || e), true); } }, 'prim'),
        btn('إلغاء', () => { sum.replaceChildren(); toast('لم يتغير شيء'); }, 'alt'))); }
    catch (e) { sum.replaceChildren(); toast(e.message === 'auth' ? 'المفتاح خاطئ أو الملف تالف' : e.message === 'format' ? 'ملف غير صالح' : e.message, true); } };
  return sect('استعادة نسخة', h('p', { class: 'mut' }, 'اكتب مفتاح الاسترداد الخاص بالنسخة (القديم) ثم اختر الملف. بعد الاستعادة يصبح هذا المفتاح مفتاحك على هذا الجهاز.'), key, h('label', { class: 'btn', onclick: () => file.click() }, 'اختر ملف النسخة'), file,
    sum, btn('التراجع عن آخر استعادة', async () => { try { await FB.undoRestore(BE, S); S = await FStore.load(BE); DGEN++; integ = L.integrity(S); toast('تم الرجوع'); go('home'); } catch (e) { toast(e.message, true); } }, 'alt mini')); }
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
  const SKL = FSK.view(S); if (SKL.length) { out.push('— الأسهم'); SKL.forEach(x => out.push(x.name + ': ' + qTxt(x.qty) + ' سهم، تكلفتها ' + money(x.cost) + (x.price != null ? '، آخر سعر ' + pTxt(x.price, x.cur) + ' (' + x.priceDate + ')' : ''))); }
  const VL = (S.x.vals || []).filter(v => (S.acc[v.a] || {}).type !== 'stock'); if (VL.length) { out.push('— التقييم اليدوي'); VL.forEach(v => out.push(((S.acc[v.a] || {}).name || v.a) + ' ' + v.d + ': ' + money(v.v))); }
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
    S.x.rates.length ? h('div', { class: 'r' }, h('span', {}, 'عمر سعر الصرف'), rateAge()) : null, row('100 دولار', S.x.rates.length ? L.fmtRate(S.rate) + ' د.ع' + lastDate(S.x.rates) : (hasUsd ? '⚠ لم يُدخل بعد' : 'لم يُدخل')), row('أونصة الذهب', gp.length ? L.fmtUsd(S.price.G) + lastDate(gp) : 'لم تُدخل'), row('أونصة الفضة', sp.length ? L.fmtUsd(S.price.S) + lastDate(sp) : 'لم تُدخل'), nabdRateBtn(saveNabdRate, 'أكّد واحفظ'), fold('تحديث الأسعار وسعر الصرف', open, f));
}
function usdBlock() { const U = L.usdInfo(S); if (!U.length) return null; const s = E.snap(S);
  return sect('الدولار (متوسط التكلفة)', U.map(u => h('div', { class: 'tx' }, row(u.name, L.fmtUsd(u.bal)), row(ti('متوسط الشراء (لكل 100$)', 'متوسط التكلفة'), L.fmtRate(u.avg) + ' د.ع'), row('القيمة الحالية', money(u.mkt)), row(ti('غير محقق'), (u.unreal > 0 ? '+' : '') + L.fmt(u.unreal) + ' د.ع'))), row(ti('محقق من الصرف حتى الآن', 'محقق'), L.fmt(s.fx) + ' د.ع')); }
function metalsBlock() {
  const P = L.pieces(S), held = P.filter(p => p.held), sold = P.filter(p => !p.held && S.tx.some(t => t.type === 'sell_metal' && t.meta && t.meta.piece === p.id && !t.voided));
  const tot = held.reduce((a, p) => ({ c: a.c + p.cost, t: a.t + p.theo }), { c: 0, t: 0 });
  return sect('الذهب والفضة', btn('شراء قطعة', () => go('assets', 'buy')), btn('قطعة موجودة قبل البدء', () => go('assets', 'old'), 'alt'),
    held.length ? held.map(p => h('div', { class: 'tx' }, h('div', {}, pieceName(p) + (p.buy && p.buy.est ? ' (تكلفة تقديرية)' : '')), row('تكلفتها', money(p.cost)), row(ti('قيمتها المعدنية النظرية', 'القيمة المعدنية النظرية'), money(p.theo)), row('الفرق (غير محقق)', (p.unreal > 0 ? '+' : '') + L.fmt(p.unreal) + ' د.ع'), btn('بيع', () => go('assets', 'sell', { id: p.id }), 'mini')))
      : emptyState('🪙', 'لا قطع ذهب أو فضة', 'سجّل قطعة اشتريتها، أو قطعة كانت عندك قبل البدء.'), held.length ? row('المجموع: التكلفة / النظرية', money(tot.c) + ' / ' + money(tot.t)) : null,
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
  if (sub === 'stock') return stockScreen(p.mode, p.id);
  if (sub === 'buy') return h('div', {}, backBtn(() => go('assets')), h('h1', {}, 'شراء قطعة'), h('p', { class: 'mut' }, 'الدفع بالدينار. للشراء بالدولار حوّل الدولار إلى دينار أولاً.'), buyForm());
  if (sub === 'old') return h('div', {}, backBtn(() => go('assets')), h('h1', {}, 'قطعة موجودة قبل البدء'), h('p', { class: 'mut' }, 'تُسجَّل بتاريخ البدء ولا تُحسب دخلاً.'), oldForm());
  if (sub === 'sell') return h('div', {}, backBtn(() => go('assets')), h('h1', {}, 'بيع قطعة'), sellForm(p.id));
  if (sub === 'report') return h('div', {}, h('h1', {}, 'تقرير البيع'), reportView(p.id));
  return h('div', {}, h('h1', {}, 'الأصول'), fOn('goals') ? sect('', h('button', { class: 'lnk', onclick: () => go('more', 'goals') }, 'الأهداف')) : null, ratesBlock(p && p.open === 'prices'), usdBlock(), fOn('metals') ? metalsBlock() : null, fOn('stocks') ? stocksBlock() : null, valsBlock()); };
// التقييم اليدوي (عقار، أرض، سيارة): قيمتها التقديرية اليوم بالدينار. لا قيد ولا دخل: يغيّر التقييم فقط، والفرق عن التكلفة «غير محقق»
function valsBlock() { const V = L.valuations(S).filter(v => !v.hidden && (v.book !== 0 || v.hist.length)); if (!V.length) return null;
  const sg = n => (n > 0 ? '+' : '') + L.fmt(n) + ' د.ع', live = V.filter(v => v.book !== 0);
  return sect('التقييم اليدوي (عقار، أرض، سيارة)', h('p', { class: 'mut' }, 'اكتب قيمة الأصل التقديرية اليوم. لا يُسجَّل دخلاً ولا مصروفاً، بل يغيّر صافي الثروة السوقي فقط، والفرق عن تكلفته يظهر «غير محقق». التقييم الأحدث هو المعتمد.'),
    V.map(v => h('div', { class: 'tx' }, h('div', {}, v.name), row('التكلفة (الدفتر)', money(v.book)), row('آخر تقييم', v.last ? money(v.last.v) + ' (' + v.last.d + ')' : 'لم يُقيَّم'), v.last && v.book !== 0 ? row('الفرق (غير محقق)', sg(v.unreal)) : null,
      v.hist.length ? h('details', {}, h('summary', {}, 'سجل التقييمات (' + v.hist.length + ')'), v.hist.slice().reverse().map(x => h('div', { class: 'r' }, h('span', {}, x.d + ': ' + money(x.v)),
        btn('احذف', async () => { if (await act(() => { L.removeValuation(S, v.id, x.d); return true; })) snack('حُذف تقييم ' + x.d, () => L.setValuation(S, { acct: v.id, date: x.d, value: x.v })); }, 'mini alt')))) : null)),
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
    d.settled ? null : btn('سداد', () => go('more', 'debts', { id: d.id }), 'mini'))) : emptyState('🤝', 'لا ديون مسجّلة', 'سجّل ما أقرضته أو اقترضته من الأسفل، فيذكّرك التطبيق بالمتبقي وموعده.'));
  const repay = cur && !cur.settled ? sect('سداد: ' + cur.person, h('p', { class: 'mut' }, 'المتبقي ' + money(cur.remaining)), buildForm([dt(), { k: 'amount', l: 'المبلغ', t: 'num', v: String(cur.remaining), req: true }, { k: 'acct', l: cur.dir === 'lent' ? 'يدخل إلى' : 'يُدفع من', t: 'select', opts: iqOpts() },
      { k: 'fee', l: 'فائدة/رسوم إضافية (اختياري)', t: 'num', show: () => cur.dir === 'borrowed' }], v => act(() => L.debtRepay(S, { id: cur.id, date: v.date, amount: n0(v.amount), acct: v.acct, fee: v.fee && v.fee.trim() ? n0(v.fee) : 0 }), 'سُجّل السداد').then(() => go('more', 'debts')), 'سجّل السداد')) : null;
  const add = sect('دين جديد', h('p', { class: 'mut' }, 'الدين بالدينار. للدولار حوّله إلى دينار أولاً.'), buildForm([dt(), { k: 'dir', l: 'النوع', t: 'select', opts: [['lent', 'أقرضتُ شخصاً'], ['borrowed', 'اقترضتُ من شخص']] }, { k: 'person', l: 'الشخص', t: 'text', req: true }, { k: 'amount', l: 'المبلغ', t: 'num', req: true },
    { k: 'acct', l: 'الحساب', t: 'select', opts: iqOpts() }, { k: 'due', l: 'تاريخ الاستحقاق (اختياري)', t: 'date', future: true }, { k: 'note', l: 'ملاحظة', t: 'text' }], v => act(() => L.debtNew(S, { date: v.date, dir: v.dir, person: v.person, amount: n0(v.amount), acct: v.acct, due: v.due || null, note: v.note }), 'سُجّل الدين'), 'سجّل'));
  return h('div', {}, list, repay, add); }]);
// ---- الجمعيات ----
MORE.push(['jams', 'الجمعيات', () => { const p = view.p, J = S.x.jams.map(j => L.jamState(S, j)), cur = p.id && J.find(j => j.id === p.id);
  if (needAcct()) return needAcct();
  const list = sect(ti('الجمعيات', 'الجمعية'), J.length ? J.map(j => h('div', { class: 'tx' }, h('div', {}, j.name), row('القسط / الحصيلة', money(j.s) + ' / ' + money(j.pot)), row('الحالة', j.done ? 'اكتملت' : j.received ? `قبضتَ. بقي ${j.remaining} قسط (${money(j.remaining * j.s)} التزام)` : `دفعتَ ${j.paid} من ${j.turn} قبل القبض`),
    j.done ? null : h('div', {}, row('القسط القادم', j.next), btn('دفع قسط', () => go('more', 'jams', { id: j.id, mode: 'pay' }), 'mini'), j.received ? null : btn('قبض الحصيلة', () => go('more', 'jams', { id: j.id, mode: 'recv' }), 'mini')))) : emptyState('🔄', 'لا جمعيات', 'أنشئ جمعية من الأسفل لتتابع أقساطها ودورك في القبض.'));
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
    !g.done && g.behind > 0 && !g.firstMonth ? btn('تخطَّ شهراً ومدِّد الموعد', () => { if (confirm('تمديد موعد الهدف شهراً بدل بقاء المتأخر مستحقاً؟')) act(() => L.goalSkip(S, g.id), 'مُدِّد الموعد'); }, 'mini alt') : null)) : emptyState('🎯', 'لا أهداف بعد', 'الهدف يحوّل الادخار إلى خطة: مبلغ وموعد وقسط شهري.'),
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
      btn('سجّل', async () => { let a; try { a = n0(amt.value); } catch (e) { return toast(e.message, true); } const prev = cur.last, d = dateIn.value;
        const id = await saveTx(() => L.recurConfirm(S, { id: cur.id, date: d, amount: a }), (cur.salary ? 'الراتب ' : cur.name + ' ') + money(a), () => { cur.last = prev; });
        if (id && !(cur.salary && cur.kind === 'income' && pyfAfterSalary(a, cur.acct, d))) go('more', 'recurring'); }), btn('تخطَّ هذا الشهر', () => act(() => L.recurSkip(S, cur.id), 'تُخطّي').then(() => go('more', 'recurring')), 'alt'), btn('ليس الآن', () => go('more', 'recurring'), 'alt')); })() : null;
  const due = !cur && D.length ? dueBlock() : null;
  const all = sect('كل البنود', S.x.recur.length ? S.x.recur.map(r => h('div', { class: 'tx' + (r.active ? '' : ' void') }, row(r.name + (r.salary ? ' (راتب)' : ''), money(r.amount)), h('div', { class: 'mut' }, (r.kind === 'income' ? 'دخل' : 'مصروف') + ` · يوم ${r.day} · تذكير قبل ${r.remind} أيام · ` + (r.active ? 'فعّال' : 'موقوف')),
    btn(r.active ? 'أوقف' : 'فعّل', () => act(() => L.recurToggle(S, r.id)), 'mini alt'), btn('احذف', async () => { const i = S.x.recur.indexOf(r), copy = JSON.parse(JSON.stringify(r)); if (await act(() => { L.recurDelete(S, r.id); return true; })) snack('حُذف البند «' + r.name + '» (عملياته باقية)', () => { S.x.recur.splice(i, 0, copy); }); }, 'mini alt'))) : emptyState('🔁', 'لا بنود متكررة', 'أضف راتبك وفواتيرك الثابتة، فيذكّرك التطبيق بها داخله عند فتحه.'));
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
  return pubSect('سعر الصرف', row('100 دولار', has ? L.fmtRate(S.rate) + ' د.ع' : (usd ? '⚠ لم يُدخل بعد' : 'لم يُدخل'), has || !usd ? '' : 'bad'), has ? h('div', { class: 'r' }, h('span', {}, 'عمر السعر'), rateAge()) : null,
    has ? h('p', { class: 'mut' }, 'آخر تحديث: ' + S.x.rates[S.x.rates.length - 1].d) : null, btn('حدّث السعر', () => go('assets', null, { open: 'prices' }), 'alt mini'), nabdRateBtn(saveNabdRate, 'أكّد واحفظ')); }
const qk = (i, t, f, sec) => h('button', { class: 'qk' + (sec ? ' sec' : ''), onclick: f }, h('span', { class: 'qi' }, ico(i)), h('span', {}, t));
// خط اتجاه صافي الثروة عند نهايات الأشهر المحفوظة: شكل فقط بلا أي رقم، ويُخفى عند إخفاء الثروة
function nwTrend() { try { if (privHidden()) return null; const sn = S.x.snaps || {}, ks = Object.keys(sn).sort().slice(-12), ys = ks.map(k => sn[k].nw).filter(v => typeof v === 'number'); if (ys.length < 3) return null;
  const W = 300, H = 46, lo = Math.min(...ys), hi = Math.max(...ys), sx = i => 4 + i * (W - 8) / (ys.length - 1), sy = v => 5 + (hi - v) / ((hi - lo) || 1) * (H - 12), d = ys.map((v, i) => (i ? 'L' : 'M') + sx(i).toFixed(1) + ',' + sy(v).toFixed(1)).join(' ');
  const el = h('div', { class: 'trend', 'aria-hidden': 'true' }); el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="direction:ltr"><path d="' + d + ' L' + sx(ys.length - 1).toFixed(1) + ',' + H + ' L4,' + H + ' Z" fill="currentColor" opacity=".12"/><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>'; return el; } catch (e) { return null; } }
SCREENS.home = () => {
  if (!S.x.openDate && !S.x.set.featDone) return firstRunFeat();
  if (!S.x.openDate) return h('div', {}, h('div', { class: 'hdr' }, h('h1', {}, 'أهلاً بك في فلوسي'), h('button', { class: 'gear', 'aria-label': 'الإعدادات والأدوات', onclick: () => go('more') }, '⚙')), h('p', { class: 'mut' }, 'ثلاث خطوات فقط لتبدأ. لديك نسخة احتياطية؟ ⚙ ثم «النسخ الاحتياطي» لاستعادتها.'),
    h('div', { class: 'card' }, h('h2', {}, '1. ما تملكه اليوم'), h('p', { class: 'mut' }, 'نقد، فيزا، دولار. تبدأ منها.'), btn('ابدأ الخطوة 1', () => go('accts', 'open'))),
    h('div', { class: 'card dim' }, h('h2', {}, '2. الراتب'), h('p', { class: 'mut' }, 'يُفتح بعد الخطوة 1: «أموالي» ثم «المتكررات والراتب».')),
    h('div', { class: 'card dim' }, h('h2', {}, '3. الذهب والفضة'), h('p', { class: 'mut' }, 'يُفتح بعد الخطوة 1: تبويب «الأصول» ثم «قطعة موجودة قبل البدء».')));
  const st = L.status(S);
  return h('div', {}, h('div', { class: 'hdr' }, h('h1', {}, 'فلوسي'), h('button', { class: 'gear', 'aria-label': 'الإعدادات والأدوات', onclick: () => go('more') }, '⚙')), (ADV = advItems(st), tickers(ADV)), nudgeBanner(), reconBanner(), wishBanner(), wrapBanner(), decisionCard(),
    (lv => { const el = sect(ti('المتاح للصرف'), animNum(h('div', { class: 'big ' + lv[0], onclick: () => go('more', 'reports') }), st.avail, 'avail', money), h('p', { class: 'mut ' + lv[0] }, lv[1]), nwTrend(), row(ti('السائل'), money(st.liq)),
      row('دخل هذا الشهر', money(st.income)), row('مصروف هذا الشهر', money(st.expense)), row('المتبقي من دخل الشهر', sgn(st.left))); el.classList.add('hero'); return el; })(availLevel(st)),
    sect('اختصارات', h('div', { class: 'qgrid' }, qk('minus', '+ مصروف', () => go('ops', null, { kind: 'expense' })), qk('plus', '+ دخل', () => go('ops', null, { kind: 'income' })), fOn('recurring') ? qk('salary', 'الراتب', () => go('more', 'recurring'), 1) : null, fOn('metals') && fOn('assets') ? qk('assets', 'الذهب والفضة', () => go('assets'), 1) : null)),
    limitsHome(), seasonCard(), fOn('advisor') ? advisorHome(ADV) : null, wealthStrip(),
    sect('', fold('الأرصدة وسعر الصرف وتفاصيل الثروة', false, nwBlock(), rateBlock(), ...acctList().filter(Boolean))));
};
const monthsList = () => { const od = S.x.openDate; if (!od) return []; const out = []; let k = L.mkey(od); const last = L.mkey(L.today()); for (let i = 0; i < 1200 && k <= last; i++, k = L.addMonths(k + '-01', 1).slice(0, 7)) out.push(k); return out.reverse(); };
function monthView(k) { let r; try { r = L.monthReport(S, k); } catch (e) { return h('p', {}, e.message); }
  const catRows = Object.entries(r.cat).sort((a, b) => b[1] - a[1]).map(([n, v]) => row(n, money(v))), flowRows = Object.entries(r.flows).map(([t, v]) => row(L.FLOW[t] || t, sgn(v)));
  const prev = (() => { try { return L.monthReport(S, L.prevMonth(k)); } catch (e) { return null; } })();
  return h('div', {}, r.sinceStart ? h('p', { class: 'mut' }, 'هذا أول شهر: المقارنة من لحظة الرصيد الافتتاحي.') : null,
    sect('الدخل والمصروف', row('الدخل', money(r.income)), splitRows(k + '-01', L.monthEnd(k)), row('المصروف', money(r.expense)), row('الوفر', sgn(r.savings)), prev && prev.expense > 0 ? row('المصروف قبل شهر', money(prev.expense) + (r.expense > prev.expense ? ' ▲' : r.expense < prev.expense ? ' ▼' : '')) : null),
    sect('المصروف حسب الفئة', catRows.length ? catRows : h('p', { class: 'mut' }, 'لا مصروفات.')),
    sect(ti('جسر صافي الثروة'), row('أول الشهر', money(r.nw0)), row('+ الدخل − المصروف', sgn(r.income - r.expense)), row('+ المحقق (معادن وأسهم وصرف)', sgn(r.realized)), row(ti('+ فروقات المطابقة', 'المطابقة'), sgn(r.adj)), row('+ التغير غير المحقق (أسعار)', sgn(r.dU)), row('= آخر الشهر', money(r.nw1)), row('التغير', sgn(r.dNw)),
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
    : mode === 'limits' ? h('div', {}, h('p', { class: 'mut' }, 'نسب افتراضية من دخل الشهر، وهي قواعد بسيطة قابلة للتعديل وليست استشارة مالية. عدّلها بما يناسبك.'), bd.map(x => h('div', { class: 'tx' }, row(x.g, x.pct + '% = ' + money(x.limit)), limitBar(x),
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
MORE.push(['selftest', 'الاختبار الذاتي', () => { const box = h('div', {}), out = h('div', {});
  const show = (r1, r2, r3) => { const all = [...r1.results, ...r2.results, ...((r3 || {}).results || [])], ok = all.filter(x => x.ok).length; out.replaceChildren(h('div', { class: 'big ' + (ok === all.length ? 'okc' : 'badc') }, ok + ' من ' + all.length),
    ...all.map(x => h('div', { class: 'tx' + (x.ok ? '' : ' bad') }, (x.ok ? '✓ ' : '✗ ') + x.id + ' ' + x.name + (x.ok ? '' : ' — ' + x.msg))));
    out._txt = VER + '\n' + all.map(x => (x.ok ? '✓ ' : '✗ ') + x.id + ' ' + x.name + (x.ok ? '' : ' — ' + x.msg)).join('\n') + '\nالنتيجة: ' + ok + ' من ' + all.length; };
  box.append(sect('الاختبار الذاتي', h('p', { class: 'mut' }, 'يشغّل اختبارات المحرك والتخزين على قاعدة مؤقتة في الذاكرة، ولا يمس بياناتك.'),
    btn('شغّل الاختبارات', async () => { out.replaceChildren('…'); const r3 = typeof FSelfTest3 !== 'undefined' ? await FSelfTest3.run() : { results: [] }; show(FSelfTest.run(), await FSelfTest2.run(), r3); }),
    btn('انسخ النتيجة', async () => { if (out._txt) { try { await navigator.clipboard.writeText(out._txt); toast('نُسخت النتيجة'); } catch (e) { toast('تعذّر النسخ', true); } } }, 'alt'), out)); return box; }]);
SCREENS.more = (sub) => { if (sub === 'set') return setPanel(view.p.s); if (!sub || sub === 'settings') return settingsHome(); const m = MORE.find(x => x[0] === sub);
  if (m) { const par = parOf(sub); return h('div', {}, backBtn(() => par ? go(par) : go('more')), h('h1', {}, m[1]), m[2]()); }
  return settingsHome(); };
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
function nabdMine() {
  return [privEl(sect('أثر السوق على أموالك اليوم', impactEl())), privEl(sect('راتبك بالمثقال والدولار', salaryPowerEl())), sect('تنبيهاتك', alertsEl()), nabdAdvice()];
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
    sect('', h('div', { class: 'quick' }, btn('هل أشتري؟', () => go('insights', 'buy')), btn('ماذا لو؟', () => go('insights', 'whatif')), btn('قائمة الرغبات', () => go('more', 'wish'), 'alt'), btn('بطاقة الشهر', () => go('insights', 'wrap'), 'alt'), btn('إنجازاتي', () => go('more', 'badges'), 'alt'), btn('المستشار', () => go('insights', 'advisor'), 'alt'), btn('التقارير والحدود', () => go('more', 'reports'), 'alt'))),
    sect('صافي الثروة', h('div', { class: 'big' }, cur ? money(cur.nw) : '—'), nwCh != null && ms.length > 1 ? row('التغيّر خلال الفترة', (nwCh >= 0 ? '+' : '') + nwCh.toFixed(1) + '%', nwCh < 0 ? 'bad' : 'okc') : null,
      ms.length > 1 ? lineChart(nwPts, { color: 'var(--acc)', fmt: v => (v / 1e6).toFixed(1) + 'م', labels: [[nwPts[0][0], kLab(ms[0].k)], [nwPts[nwPts.length - 1][0], kLab(cur.k)]] }) : h('p', { class: 'mut' }, 'يظهر المنحنى بعد مرور شهرين من التسجيل.')),
    sect('الدخل والمصروف', barsChart(per === 'm' ? ms.slice(-1) : ms.slice(-12)), h('div', { class: 'lg' }, h('span', {}, h('i', { style: 'background:var(--ok)' }), 'الدخل'), h('span', {}, h('i', { style: 'background:var(--bad)' }), 'المصروف')),
      row('مجموع الدخل', money(per === 'm' ? (cur ? cur.income : 0) : inc)), row('مجموع المصروف', money(per === 'm' ? (cur ? cur.expense : 0) : exp)),
      (r => r != null ? row(ti('نسبة الادخار'), r + '%', r < 10 ? 'bad' : r >= 20 ? 'okc' : '') : null)(per === 'm' ? (cur ? cur.rate : null) : rate),
      ms.filter(m => m.rate != null).length > 2 && per !== 'm' ? h('div', {}, h('p', { class: 'mut' }, 'نسبة الادخار شهرياً'), spark(ms.filter(m => m.rate != null).map(m => [Date.parse(m.k + '-15'), m.rate]), 'var(--ok)')) : null),
    sect('المصروف حسب الفئة' + (per === 'm' ? ' — هذا الشهر' : ''), cats.length ? hbars(cats) : h('p', { class: 'mut' }, 'لا مصروفات في الفترة.')),
    sect(ti('توزيع الأصول'), al.parts.length ? h('div', { class: 'dn' }, donut(al.parts), h('div', { class: 'lg col' }, al.parts.map(p => h('span', {}, h('i', { style: 'background:' + p.c }), p.n + ' ' + p.p + '%')))) : h('p', { class: 'mut' }, 'لا أصول بعد.'),
      mn ? h('p', { class: 'mut' }, 'الذهب والفضة بقيمة البيع المحسوبة الآن من نبض السوق: ' + money(mn.total) + ' (عرض فقط؛ لا يغيّر أسعارك المسجّلة).') : h('p', { class: 'mut' }, 'الذهب والفضة بالأسعار المسجّلة في «الأصول».')),
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
    h('p', { class: 'mut' }, 'حساب فقط: لا يُسجَّل شيء. إن قرّرت الشراء فسجّله من «العمليات» أو «الأصول».'),
    btn('⏳ انتظر يوماً (قائمة الرغبات)', () => addWish(I.note || (FM.TYPES.find(t => t[0] === I.type) || [0, 'شراء'])[1], I.amount, I.type).then(() => go('more', 'wish')), 'alt')) : null;
  return h('div', {}, backBtn(() => { NB.buy = null; NB.buyIn = null; go('insights'); }), h('h1', {}, 'هل أشتري؟'), h('p', { class: 'mut' }, 'اكتب المبلغ واختر الغرض، فيقيّم المستشار أثره على سيولتك ومدخراتك وأهدافك. للذهب والفضة اكتب السعر الذي يعرضه البائع ووزنه.'), sect('', f), out);
}
SCREENS.insights = (sub) => {
  if (sub === 'buy') return buyScreen();
  if (sub === 'advisor') return advisorScreen();
  if (sub === 'whatif') return whatIfScreen();
  if (sub === 'path') return pathScreen(view.p.h);
  if (sub === 'wrap') return wrapScreen(view.p.k);
  if (!S.x.openDate) return h('div', {}, h('h1', {}, 'تحليلاتي'), h('p', {}, 'سجّل الرصيد الافتتاحي أولاً.'));
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
  return h('div', { class: 'pub' }, head, seg([['now', 'الآن'], ['why', 'لماذا تحرّك'], ['mine', 'أموالي']], tab, k => go('nabd', null, { t: k })), ...(tab === 'why' ? nabdWhy() : tab === 'mine' ? nabdMine() : nabdNow()));
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
// ===== f1-v3.2: صفحة «التعليمات» =====
// لتحديثها عند إضافة ميزة: عدّل HELP فقط (عنوان، ثم فقرات؛ السطر الذي يبدأ بـ «• » يُعرض كنقطة)
const HELP = [
  ['ما هو «فلوسي»؟', [
    'تطبيق شخصي لإدارة مالك: تسجّل فيه دخلك ومصروفك وما تملكه وما عليك، فيعطيك صورة واضحة عن وضعك المالي وكيف يتغيّر شهراً بعد شهر.',
    'كل بياناتك محفوظة على هاتفك فقط، ولا تُرسل إلى أي خادم. لهذا النسخة الاحتياطية مهمة جداً (انظر قسمها في الأسفل).',
    'التطبيق يحسب ويعرض وينبّه، لكنه لا يضمن أي نتيجة مالية، والقرار دائماً لك.']],
  ['كيف تبدأ (أول مرة)', [
    '• الخطوة 1: من الرئيسية «ابدأ الخطوة 1»، واكتب كم عندك اليوم في كل حساب (نقد، فيزا، دولار، عقار، التزام). هذا «الرصيد الافتتاحي» ولا يُحسب دخلاً.',
    '• إن كان عندك دولار فاكتب سعر الصرف اليوم، أو اضغط «اعتمد سعر نبض السوق» ثم «ضعه في الخانة».',
    '• الخطوة 2: من «أموالي» ← «المتكررات والراتب» أضف راتبك بنوع «دخل متكرر» واختر «هل هو الراتب؟ نعم». يذكّرك التطبيق بموعده.',
    '• الخطوة 3: من «الأصول» ← «قطعة موجودة قبل البدء» أضف ذهبك وفضتك بالوزن والعيار.',
    '• أخطأت في رقم البداية؟ «أموالي» ← «تصحيح الرصيد الافتتاحي».']],
  ['التسجيل اليومي الصحيح', [
    '• «العمليات» ← «مصروف»: اكتب المبلغ بلوحة الأرقام، واختر الفئة (الأكثر استعمالاً أولاً)، والحساب، واليوم (اليوم، أمس، أو تاريخ آخر)، ثم «تم».',
    '• «متكرر عندك»: مصروفات كررتها مرتين أو أكثر، حتى 12. الأكثر تكراراً وحداثة يظهر أكبر وأولاً، والذي تتركه يصغر ثم يختفي وحده. الضغط عليها يعبّئ النموذج فقط، فتعدّل المبلغ أو غيره إن شئت ثم تضغط «تم».',
    '• بعد كل حفظ يظهر شريط أسفل الشاشة فيه «تراجع» لمدة 7 ثوانٍ. التراجع يعكس العملية وتبقى ظاهرة في السجل.',
    '• بعد تسجيل الراتب يقترح «ادفع لنفسك أولاً» نقل نسبة (5، 10، 15، 20%) أو مبلغ ثابت إلى مدخراتك. «سجّل التحويل» يسجّله في التطبيق فقط. «لا تسأل ثانية» يوقفه، وتعيده من ⚙.',
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
    '• ⚙ في الرئيسية: الإعدادات مجمّعة في مجموعات (المظهر، الأقسام والميزات، المال، الخصوصية والأمان، البيانات، عام) مع خانة بحث، وبجانب كل إعداد قيمته الحالية.',
    '• التنقل بين البوابات بالسحب يشمل البوابات المفعّلة فقط.',
    '• التنقل بالسحب: اسحب الشاشة يميناً أو يساراً للانتقال بين أقسام التبويب ثم إلى التبويب التالي. لا يعمل السحب فوق الرسوم والجداول وخانات الإدخال.']],
  ['الأقسام والميزات', [
    '• ⚙ ← «الأقسام والميزات»: شغّل أو أوقف البوابات والميزات وأنواع الحسابات. «الرئيسية» و«العمليات» أساسيتان ولا تُوقفان.',
    '• الإيقاف يخفي فقط ولا يحذف أي حساب أو عملية. أعد التشغيل متى شئت فيعود كل شيء كما كان.',
    '• لأنواع الحسابات والذهب والفضة خياران عند الإيقاف: «إخفاء فقط» (الافتراضي)، أو «استبعاد من صافي الثروة» فيظهر صافي الثروة في الرئيسية دونها مع سطر يذكر المستبعد والرقم الكامل. التقارير والجسر تبقى بالأرقام الكاملة.',
    '• «كامل» يشغّل كل شيء، و«بسيط» يبقي الأساس فقط. «حساب مصرفي» لم يعد بين خيارات الإضافة، وأي حساب مصرفي موجود يبقى كما هو.']],
  ['أدوات القرار', [
    '• «قرار اليوم» أعلى الرئيسية: المصروف الآمن اليوم = (المتبقي − الالتزامات القادمة حتى آخر الشهر) ÷ الأيام المتبقية. المتبقي = دخلك منذ البدء − مصروفك − ما ادخرته، ولا يزيد على المتاح للصرف. اضغط «كيف حُسب؟» لترى الأرقام.',
    '• الالتزامات: المتكررة غير المسجّلة، وأقساط الجمعيات، والديون التي عليك. أقساط الأهداف تُحسب إن اخترت ذلك من ⚙ ← «المصروف الآمن».',
    '• شريط الثروة: صافي ثروتك وتغيّره هذا الشهر، مع ملاحظة إن تركّزت أصولك في نوع واحد أو قلّت سيولتك عن 3 أشهر من مصروفك.',
    '• تحليلاتي ← «ملخص الشهر حتى اليوم»: مقارنة بالفترة نفسها من الشهر الماضي، و«المتوقع آخر الشهر»، و«قرار مقترح».',
    '• شكل المسار المالي ثلاثة تختاره من ⚙ ← «شكل المسار المالي»: آلة الزمن (الافتراضي، قرص تديره بإصبعك)، ورحلتك المالية (طريق بمحطات)، ونخلتك المالية (نخلة تطول وتمرها أهدافك). الأرقام واحدة في الثلاثة.',
    '• تحليلاتي ← «المسار المالي المستقبلي»: أين تصل ثروتك بعد شهر، ونهاية السنة، و5 و10 و25 سنة، في ثلاثة سيناريوهات (الحالي، المحسّن بمصروف أقل 15%، والانخفاض بدخل أقل 20% ومصروف أكثر 10%)، بالدينار أو الدولار. اضغط أي سطر للتفاصيل. «الافتراضات»: نمو الأصول (افتراضياً 0%) و«بأسعار اليوم». تقدير لا وعد.',
    '• تحليلاتي ← «ماذا لو؟»: أثر قسط شهري جديد، أو هبوط دخلك، أو تغيّر الدولار 5%. حساب فقط، لا يُحفظ شيء.',
    '• الأرصدة وسعر الصرف وتفاصيل الثروة صارت في قسم قابل للفتح أسفل الرئيسية.']],
  ['قائمة الرغبات ويوم الراتب', [
    '• قائمة الرغبات (تحليلاتي أو «هل أشتري؟» ← «انتظر يوماً»): يُحفظ ما تريد شراءه، وبعد 24 ساعة يسألك «ما زلت تريده؟». «لا، تراجعت» يضيف المبلغ إلى «وفّرت بالتريث». «نعم» يفتح المصروف معبّأً.',
    '• يوم الراتب: بعد تسجيل الراتب: ادّخر أولاً، ثم أقساط أهدافك، ثم فواتيرك الثابتة، ثم «ورقة الراتب» التي تبيّن أين ذهب كل دينار والحرّ للصرف يومياً.',
    '• الفئة التلقائية: حين تكتب ملاحظة المصروف (صمون، بنزين، كارت...) يختار التطبيق الفئة من سجلّك أو من الكلمة، ويبقى اختيارك أنت إن غيّرتها.']],
  ['المواسم وبطاقة الشهر والإنجازات', [
    '• المواسم: قبل رمضان والعيدين وبداية الدراسة بـ45 يوماً تظهر بطاقة في الرئيسية: ما صرفته في الموسم الماضي (أو تقدير من مصروفك)، وكم تجنّب أسبوعياً، و«اجعله هدفاً». التواريخ تقريبية حسب رؤية الهلال.',
    '• بطاقة الشهر: في أول 7 أيام من كل شهر تظهر بطاقة شهرك الماضي (الادخار، الدخل والمصروف، أكبر فئة، أغلى يوم، أيام بلا صرف، المقارنة). «احفظها صورة» تفتح المشاركة. وهي في تحليلاتي ← «بطاقة الشهر».',
    '• إنجازاتي: شارات هادئة تظهر مرة واحدة عند تحقيقها (سلسلة التسجيل، أول 10 ملايين، درع الطوارئ، ادّخار 20%...). في تحليلاتي أو ⚙.']],
  ['أدوات يومية', [
    '• «العمليات»: ابحث بالملاحظة أو المبلغ أو الفئة أو الحساب (يقبل الأرقام العربية)، وصفِّ حسب النوع والفترة. يظهر عدد النتائج ومجموعها.',
    '• «تعديل» تحت أي مصروف أو دخل أو تحويل بالدينار: تُعكس القديمة وتبقى في السجل، وتُسجَّل الصحيحة مكانها.',
    '• «حدود هذا الشهر» في الرئيسية: تظهر الفئة حين تصرف نصف حدّها، والخط الرفيع يبيّن أين يجب أن تكون حسب أيام الشهر.',
    '• إن لم تسجّل شيئاً 3 أيام يذكّرك شريط في الرئيسية. «لاحقاً» يخفيه لليوم.',
    '• آخر الشهر (من يوم 25 إلى 3 من الشهر التالي) يظهر شريط «المطابقة الشهرية»: اكتب الموجود فعلاً حيث يختلف فقط.',
    '• شريط الثروة: درع الطوارئ بالأشهر من 6. تقارير الشهر وتحليلاتي: الراتب الأساسي مقابل الدخل الإضافي. سعر الصرف: شارة بعمره (أخضر حتى 3 أيام، أصفر حتى 14، أحمر بعدها).',
    '• ⚙ ← «شاشة البداية»: اختر الشاشة التي يفتح عليها التطبيق.']],
  ['قراءة الأرقام والتقارير', [
    '• المتاح للصرف: ما تستطيع صرفه بعد حجز مبالغ أهدافك. لونه أخضر ضمن حدودك، وأصفر إن اقتربت من حد، وأحمر إن تجاوزت.',
    '• صافي الثروة: ما تملكه ناقص ما عليك. اضغط ⓘ بجانب أي مصطلح لشرحه.',
    '• تحليلاتي: منحنى ثروتك، ودخلك ومصروفك لكل شهر، ونسبة ادخارك، وأين يذهب مصروفك، وتوزيع أصولك. غيّر الفترة من الأزرار في الأعلى.',
    '• التقارير والحدود: تقرير شهري وسنوي، و«جسر صافي الثروة» الذي يفسّر سبب تغيّرها، و«الحدود» وهي نسب من دخلك لكل نوع مصروف، فينبهك التطبيق قبل تجاوزها. عدّلها بما يناسبك.',
    '• استفد منها هكذا: إن كانت نسبة ادخارك أقل من 10% فابحث في «المصروف حسب الفئة» عن أكبر بند وابدأ به.']],
  ['الأهداف والمدخرات', [
    '• أنشئ هدفاً من «الأصول» ← «الأهداف»: الاسم والمبلغ والموعد، ويعرض لك القسط الشهري المطلوب.',
    '• «تخصيص»: تحجز مبلغاً للهدف دون نقله من حسابك. «تحرير»: تعيده متاحاً للصرف.',
    '• هدف المدخرات (الطوارئ): علّم هدفاً بأنه «هدف المدخرات» عند إنشائه، أو من ⚙ ← «هدف المدخرات». يقيس المستشار أمانك المالي عليه ويعلّق على مبلغه وموعده.']],
  ['الذهب والفضة والدولار', [
    '• كل قطعة تُسجَّل وحدها بوزنها وعيارها وما دفعته فيها. تعرض تكلفتها وقيمتها المعدنية الحالية.',
    '• عند البيع يعرض «تقرير البيع» كم ربحت أو خسرت، ومقدار ما ضاع من المصنعية وخصم الصائغ.',
    '• الدولار يُحسب بمتوسط سعر شرائك، فتعرف ربحك أو خسارتك عند الصرف.',
    '• نسبة المعادن المستهدفة: حدّدها في ⚙ ← «نسبة المعادن المستهدفة» إن أردت، فينبّهك المستشار إن صارت معادنك فوقها أو تحتها.']],
  ['الأسهم', [
    '• «الأصول» ← «الأسهم» ← «+ سهم جديد»: الاسم والعملة (دينار أو دولار) والعدد والسعر. اختر «اشتريته الآن من حساب» أو «كان عندي قبل البدء».',
    '• الشراء تحويل من حسابك إلى السهم، وليس مصروفاً. اكتب المدفوع فعلاً شاملاً العمولة.',
    '• «حدّث السعر»: سعر اليوم تكتبه أنت. القيمة الحالية = العدد × السعر (× سعر الصرف للسهم الدولاري)، والفرق عن التكلفة «غير محقق».',
    '• عند البيع تخرج التكلفة بمتوسط سعر الشراء، والفرق عن مبلغ البيع ربح أو خسارة «محققة».',
    '• سجّل عمليات السهم الواحد بالترتيب الزمني. التوزيعات غير مدعومة الآن.']],
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
    '• ⚙ ← «إخفاء الثروة» ← «مفعّل»: تظهر كل مبالغك هكذا ••••••، مفيد أمام الآخرين.',
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
const livePages = () => PAGES.filter(x => fOn(x.tab));
function pageIdx() { const v = view; if (v.sub) return -1; return livePages().findIndex(x => x.tab === v.tab); }
function swipeGo(dir) { const i = pageIdx(), P = livePages(); if (i < 0) return false; const j = i + dir; if (j < 0 || j >= P.length) return false;
  go(P[j].tab, null, {}); const a = $('#app'); a.classList.remove('sw-n', 'sw-p'); void a.offsetWidth; a.classList.add(dir > 0 ? 'sw-n' : 'sw-p'); return true; }
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
// ===== f1-v4.4 (المرحلة 1): الأقسام والميزات (10، 11، 14) والإعدادات الاحترافية (9) =====
// تُحفظ في S.x.set.feat (ما أُوقف فقط: false) و S.x.set.featX (ما يُستبعد من صافي الثروة: true). غياب المفتاح = مفعّل، فبيانات الإصدارات السابقة تبقى كما هي.
// الإيقاف إخفاء فقط: لا يحذف حساباً ولا عملية ولا يغيّر أي قيد. المسارات تبقى تعمل، وتختفي نقاط الدخول إليها فقط.
const FEAT = [
  ['البوابات', [['home', 'الرئيسية', 'core'], ['ops', 'العمليات', 'core'], ['accts', 'أموالي'], ['assets', 'الأصول'], ['nabd', 'نبض السوق'], ['insights', 'تحليلاتي']]],
  ['الميزات', [['metals', 'الذهب والفضة', 'excl'], ['stocks', 'الأسهم', 'excl'], ['goals', 'الأهداف'], ['recurring', 'المتكررات والراتب'], ['debts', 'الديون'], ['jams', 'الجمعيات'], ['advisor', 'بطاقة المستشار في الرئيسية'], ['world', 'شريط «العالم» في الرئيسية']]],
  ['أنواع الحسابات', [['t_asset_cash', 'نقد', 'excl'], ['t_visa', 'فيزا', 'excl'], ['t_wallet', 'محفظة إلكترونية', 'excl'], ['t_other', 'أصل آخر (عقار، سيارة...)', 'excl'], ['t_liab', 'التزام', 'excl']]]];
const FEAT_ALL = FEAT.flatMap(g => g[1]), FEAT_KEYS = FEAT_ALL.filter(x => x[2] !== 'core').map(x => x[0]);
const FEAT_SIMPLE = ['nabd', 'insights', 'debts', 'jams', 'advisor', 'world', 'goals', 'stocks', 't_wallet', 't_other', 't_liab']; // «بسيط»: ما يُوقف
const FEAT_HINT = { accts: 'الحسابات، والديون، والجمعيات، والمتكررات', assets: 'الأسعار، والدولار، والذهب والفضة، والتقييم، والأهداف', recurring: 'تذكير «هل استلمت الراتب؟» يبقى إن كان لديك بنود', t_liab: 'الاستبعاد يرفع صافي الثروة المعروض', stocks: 'في تبويب «الأصول». أسعارها يدوية' };
const fOn = k => { const f = S && S.x && S.x.set && S.x.set.feat; return !f || f[k] !== false || (FEAT_ALL.find(x => x[0] === k) || [])[2] === 'core'; };
const fExcl = k => !fOn(k) && !!((S.x.set.featX || {})[k]);
const typeOn = t => !t || t === 'bank' || fOn('t_' + t); // الحساب المصرفي الموجود يبقى ظاهراً دائماً
// خيارات نوع الحساب الجديد: بلا «حساب مصرفي» (البند 10) وبلا الأنواع الموقوفة. إن أُوقف كل شيء تُعرض الأنواع كلها كي لا يتعطل النموذج
const typeOpts = () => { const all = Object.entries(L.TYPES).filter(([k]) => k !== 'bank'), on = all.filter(([k]) => fOn('t_' + k)); return (on.length ? on : all).map(([k, v]) => [k, v[0]]); };
const moneyLinks = () => MONEY_LINKS.filter(([k]) => fOn(k)).concat(!fOn('assets') && fOn('goals') ? [['goals', 'الأهداف']] : []);
const featPreset = () => { const off = FEAT_KEYS.filter(k => !fOn(k)); return !off.length ? 'full' : off.length === FEAT_SIMPLE.length && off.every(k => FEAT_SIMPLE.includes(k)) ? 'simple' : 'custom'; };
const featSummary = () => { const p = featPreset(), on = FEAT_KEYS.filter(fOn).length; return p === 'full' ? 'كامل (كل شيء مفعّل)' : p === 'simple' ? 'بسيط' : 'مخصص · ' + on + ' من ' + FEAT_KEYS.length; };
function featSet(fn, ok) { return act(() => { const st = S.x.set, f = { ...(st.feat || {}) }, x = { ...(st.featX || {}) }; fn(f, x);
  Object.keys(f).forEach(k => { if (f[k] !== false || !FEAT_KEYS.includes(k)) delete f[k]; }); Object.keys(x).forEach(k => { if (!x[k] || f[k] !== false) delete x[k]; });
  st.feat = f; st.featX = x; }, ok); }
// مقدار ما يُستبعد من صافي الثروة المعروض، بالطريقة نفسها التي يحسب بها المحرك (سوقي أو بالتكلفة حسب «طريقة التقييم»). عرض فقط، لا يُخزَّن
function exclInfo() { const out = { amt: 0, names: [] }; if (!S || !S.x.set.featX) return out; const cost = S.x.set.valuation === 'cost';
  const U = Object.fromEntries(L.usdInfo(S).map(u => [u.id, u])), V = Object.fromEntries(L.valuations(S).map(v => [v.id, v.value]));
  FEAT_ALL.filter(x => x[0].startsWith('t_') && fExcl(x[0])).forEach(([k, n]) => { const t = k.slice(2); out.names.push(n);
    Object.values(S.acc).filter(a => a.type === t).forEach(a => { const b = E.bal(S, a.id);
      out.amt += a.kind === 'liab' ? b : a.cur === 'USD' ? (U[a.id] ? (cost ? U[a.id].cost : U[a.id].mkt) : 0) : (!cost && V[a.id] != null ? V[a.id] : b); }); }); // الالتزام رصيده سالب، فطرحه يرفع الرقم
  if (fExcl('stocks')) { const SK = FSK.view(S); if (SK.length) { out.names.push('الأسهم'); SK.forEach(x => { out.amt += cost ? x.cost : x.mkt; }); } }
  if (fExcl('metals')) { out.names.push('الذهب والفضة'); const s = E.snap(S); out.amt += cost ? E.bal(S, 'gold') + E.bal(S, 'silver') : s.gold + s.silver; }
  return out; }
const swBtn = (on, f, lab) => h('button', { class: 'swt' + (on ? ' on' : ''), type: 'button', role: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-label': lab, onclick: f }, h('i', {}));
function featPanel(first) { const st = S.x.set, p = featPreset();
  const head = sect('', h('p', { class: 'mut' }, 'شغّل ما تريد أن تراه. الإيقاف يخفي فقط ولا يحذف أي حساب أو عملية، وتعيد التشغيل متى شئت.'),
    seg([['full', 'كامل'], ['simple', 'بسيط'], ['custom', 'مخصص']], p, k => { if (k === 'custom') return toast('غيّر أي مفتاح بالأسفل فيصبح الاختيار مخصصاً');
      featSet((f, x) => { Object.keys(f).forEach(z => delete f[z]); Object.keys(x).forEach(z => delete x[z]); if (k === 'simple') FEAT_SIMPLE.forEach(z => { f[z] = false; }); }, k === 'simple' ? 'اختير «بسيط»' : 'اختير «كامل»'); }),
    !first && p !== 'full' ? btn('إعادة للافتراضي (كل شيء مفعّل)', () => { if (confirm('إعادة كل الأقسام والميزات إلى التشغيل؟ لا تتغير أي بيانات.')) featSet((f, x) => { Object.keys(f).forEach(z => delete f[z]); Object.keys(x).forEach(z => delete x[z]); }, 'أُعيد كل شيء للافتراضي'); }, 'alt mini') : null);
  const groups = FEAT.map(([g, xs]) => sect(g, xs.map(([k, n, kind]) => { const on = fOn(k), ex = fExcl(k);
    return h('div', { class: 'frow', 'data-f': k }, h('div', { class: 'r' }, h('span', {}, n, FEAT_HINT[k] ? h('small', { class: 'src' }, FEAT_HINT[k]) : null),
      kind === 'core' ? h('b', { class: 'mut' }, 'أساسي') : swBtn(on, () => featSet(f => { f[k] = on ? false : true; }, (on ? 'أُخفي: ' : 'فُعّل: ') + n), n)),
      kind === 'excl' && !on ? h('div', { class: 'fx' }, seg([['hide', 'إخفاء فقط'], ['excl', 'استبعاد من صافي الثروة']], ex ? 'excl' : 'hide', m => {
        if (m === 'excl' && !confirm('استبعاد «' + n + '» من صافي الثروة المعروض في الرئيسية؟\nيتغير العرض فقط: التقارير والجسر وكل القيود تبقى بالأرقام الكاملة، ويظهر الرقم الكامل تحته.')) return;
        featSet((f, x) => { x[k] = m === 'excl'; }, m === 'excl' ? 'استُبعد من صافي الثروة المعروض' : 'إخفاء فقط'); }),
        ex ? h('p', { class: 'warnc' }, k === 't_liab' ? '⚠ استبعاد الالتزامات يجعل صافي الثروة المعروض أكبر من الحقيقي.' : '⚠ صافي الثروة في الرئيسية يظهر دون هذا القسم، والرقم الكامل تحته.') : null) : null); })));
  const bank = Object.values(S.acc).some(a => a.type === 'bank') ? h('p', { class: 'mut' }, '«حساب مصرفي» لم يعد بين خيارات الإضافة. حساباتك المصرفية الموجودة باقية كما هي.') : h('p', { class: 'mut' }, '«حساب مصرفي» أُزيل من خيارات الإضافة.');
  return h('div', {}, head, ...groups, sect('', bank)); }
function firstRunFeat() { return h('div', {}, h('h1', {}, 'أهلاً بك في فلوسي'), h('h2', { class: 'sub' }, 'اختر ما تريد تتبعه'), h('p', { class: 'mut' }, 'يمكنك تغيير اختيارك لاحقاً من ⚙ ← «الأقسام والميزات».'),
  featPanel(true), btn('متابعة', () => act(() => { S.x.set.featDone = true; }, 'تم'), 'prim'),
  sect('', h('p', { class: 'mut' }, 'لديك نسخة احتياطية من هاتف سابق؟'), btn('استعادة نسخة احتياطية', () => go('more', 'backup'), 'alt'))); }
// ---- ⚙ الإعدادات: مجموعات، وبحث، وقيمة كل إعداد الحالية بجانبه ----
const MODE_N = { time: 'حسب الوقت', sync: 'متزامن مع الهاتف', light: 'فاتح', dark: 'داكن' }, EVERY_N = { day: 'يومياً', week: 'أسبوعياً', month: 'شهرياً' };
function setRows() { const st = S.x.set, c = FTheme.cfg(), G = L.goalView(S), sg = st.savingsGoal && G.find(g => g.id === st.savingsGoal), b = FB.status(S);
  return [
    ['المظهر', [['skin', 'الثيم', c.mode === 'rotate' ? 'تناوب ' + EVERY_N[c.every] + ' · ' + c.set.length + ' ثيمات' : FTheme.SKINS[c.skin].name, 'لون شكل زخرفة تناوب'], ['mode', 'فاتح / داكن', MODE_N[FTheme.get()], 'مظهر ليلي نهاري داكن فاتح وقت'], ['pathview', 'شكل المسار المالي', PSTYLES.find(x => x[0] === pStyle())[1], 'آلة الزمن رحلة نخلة مستقبل']]],
    ['الأقسام', [['feat', 'الأقسام والميزات', featSummary(), 'بوابات تبويبات إخفاء إيقاف تشغيل أسهم حسابات أنواع بسيط كامل استبعاد']]],
    ['المال', [['savings', 'هدف المدخرات', sg ? sg.name : 'لم يُحدد', 'طوارئ ادخار'], ['savings', 'نسبة المعادن المستهدفة', st.metalsPct == null ? 'غير محددة' : st.metalsPct + '%', 'ذهب فضة'], ['valuation', 'طريقة التقييم', st.valuation === 'cost' ? 'بالتكلفة' : 'محافظ', 'تقييم سوقي تكلفة'], ['pyf', 'ادفع لنفسك أولاً', pyfSummary(), 'راتب ادخار نسبة'], ['dec', 'المصروف الآمن', st.decGoals ? 'مع أقساط الأهداف' : 'بدون أقساط الأهداف', 'قرار يومي التزامات']]],
    ['الخصوصية والأمان', [['privacy', 'إخفاء الثروة', st.hideAll ? 'مفعّل' : 'متوقف', 'خصوصية أرقام'], ['privacy', 'الاستشارات', st.hideAdvice ? 'مخفية' : 'ظاهرة', 'مستشار خصوصية'], ['@lock', 'القفل', lockOn() ? 'مفعّل · ' + (st.lockMin ? st.lockMin + ' د' : 'فوراً') : 'غير مفعّل', 'رمز بصمة وجه أمان']]],
    ['البيانات', [['@backup', 'النسخ الاحتياطي والتصدير', S.x.backup ? 'قبل ' + b.days + ' يوماً' : 'لا توجد نسخة', 'استعادة تصدير CSV مفتاح'], ['@print', 'بصمة البيانات', 'للمطابقة', 'رمز'], ['@integrity', 'فحص السلامة', integ.length ? integ.length + ' مشكلة' : 'سليم ✓', 'أخطاء'], ['@monthrecon', 'المطابقة الشهرية', (k => k ? 'آخرها ' + k : 'لم تتم بعد')(Object.keys(S.x.reconDone || {}).sort().pop()), 'عدّ نقد أرصدة'], ['@log', 'سجل التغييرات', S.tx.length + ' عملية', 'تاريخ سجل']]],
    ['عام', [['start', 'شاشة البداية', (TABS.find(t => t[0] === (S.x.set.start || 'home')) || TABS[0])[1], 'فتح أول شاشة'], ['@badges', 'إنجازاتي', (() => { try { let st = {}; try { st = JSON.parse(LS.get(BKEY) || '{}') || {}; } catch (e) {} return Object.keys(st).filter(k => BADGES.some(b => b[0] === k)).length + ' من ' + BADGES.length; } catch (e) { return ''; } })(), 'شارات'], ['@help', 'التعليمات', '', 'شرح مساعدة'], ['@selftest', 'الاختبار الذاتي', '', 'اختبار'], ['version', 'الإصدار', VER, 'فحوصات نسخة']]]]; }
function settingsHome() { const q = h('input', { type: 'search', placeholder: '🔍 ابحث في الإعدادات', autocomplete: 'off', 'aria-label': 'بحث في الإعدادات' }), none = h('p', { class: 'mut', hidden: true }, 'لا نتائج.');
  const blocks = setRows().map(([g, rs]) => { const items = rs.map(([k, n, v, kw]) => { const b = h('button', { class: 'lnk srow', onclick: () => k[0] === '@' ? go('more', k.slice(1)) : go('more', 'set', { s: k }) }, h('span', {}, n), h('b', { class: 'sv' }, v));
      b._t = (n + ' ' + v + ' ' + kw + ' ' + g).toLowerCase(); return b; }); return { el: sect(g, items), items }; });
  q.oninput = () => { const t = L.norm(q.value).trim().toLowerCase(); let any = false;
    blocks.forEach(({ el, items }) => { let n = 0; items.forEach(b => { const ok = !t || t.split(/\s+/).every(w => b._t.includes(w)); b.hidden = !ok; if (ok) n++; }); el.hidden = !n; if (n) any = true; }); none.hidden = any; };
  return h('div', {}, backBtn(() => go('home')), h('h1', {}, '⚙ الإعدادات'), h('div', { class: 'sq' }, q), none, ...blocks.map(x => x.el)); }
function setPanel(k) { const st = S.x.set, T = { start: 'شاشة البداية', pathview: 'شكل المسار المالي', skin: 'الثيم', mode: 'فاتح / داكن', feat: 'الأقسام والميزات', savings: 'المدخرات والمعادن', pyf: 'ادفع لنفسك أولاً', dec: 'المصروف الآمن', valuation: 'طريقة التقييم', privacy: 'الخصوصية', version: 'الإصدار' };
  const body = k === 'start' ? startPanel() : k === 'pathview' ? pathViewPanel() : k === 'skin' ? skinSect() : k === 'mode' ? themeSect() : k === 'feat' ? featPanel() : k === 'savings' ? savingsSettings() : k === 'pyf' ? pyfPanel() : k === 'dec' ? decPanel()
    : k === 'valuation' ? sect('طريقة التقييم', h('p', { class: 'mut' }, 'محافظ: المعادن بقيمتها النظرية والدولار بسعر التقييم. بالتكلفة: لا أرباح غير محققة.'), seg([['conservative', 'محافظ'], ['cost', 'بالتكلفة']], st.valuation, v => act(() => { st.valuation = v; }, 'تم')))
    : k === 'privacy' ? h('div', {}, sect('إخفاء الثروة', h('p', { class: 'mut' }, 'عند التفعيل تُخفى كل أرقامك المالية في كل الشاشات (••••••). زر 👁 يُظهرها 5 ثوانٍ ثم تُخفى تلقائياً، وتُخفى فوراً عند مغادرة التطبيق. أسعار السوق العامة تبقى ظاهرة. الإخفاء بصري فقط ولا يغيّر أي حساب.'),
        seg([['1', 'مفعّل'], ['0', 'متوقف']], st.hideAll ? '1' : '0', v => act(() => { st.hideAll = v === '1'; PRIV.until = 0; }, v === '1' ? 'أُخفيت الأرقام' : 'ظهرت الأرقام'))),
      sect(ti('الاستشارات المرتبطة بثروتك', 'خصوصية الاستشارات'), h('p', { class: 'mut' }, 'إخفاء استشارات المستشار (على الرئيسية وفي صفحته وفي نبض السوق). التنبيهات الأساسية مثل «هل استلمت الراتب؟» وتجاوز الحدود تبقى. لا يغيّر أي حساب.'),
        seg([['0', 'ظاهرة'], ['1', 'مخفية']], st.hideAdvice ? '1' : '0', v => act(() => { st.hideAdvice = v === '1'; }, v === '1' ? 'أُخفيت الاستشارات' : 'ظهرت الاستشارات'))))
    : k === 'version' ? sect('الإصدار', row('التطبيق', VER), h('p', { class: 'mut' }, 'قاعدة البيانات: flousi (محلية على هذا الهاتف). فحوصات المرحلة 0 في الصفحة المنفصلة:'), h('a', { href: 'diagnostics.html', class: 'btn' }, 'فتح صفحة الفحوصات'), h('p', { class: 'mut', dir: 'ltr', style: 'font-size:.78rem' }, 'This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.'))
    : h('p', {}, 'غير موجود.');
  return h('div', {}, backBtn(() => go('more')), h('h1', {}, T[k] || 'الإعدادات'), body); }
// ===== f1-v4.5 (المرحلة 2): الأسهم في «الأصول» (12، 13) — الحساب في stocks.js =====
const qTxt = q => (q / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 }), pTxt = (p, cur) => cur === 'USD' ? L.fmtUsd(p) : money(p), pAmt = (s, cur) => L.parseAmount(s, cur === 'USD' ? 2 : 0);
function stocksBlock() { const X = FSK.view(S).filter(x => !x.hidden), live = X.filter(x => x.qty > 0), tm = live.reduce((a, x) => a + x.mkt, 0), tu = live.reduce((a, x) => a + x.unreal, 0), rz = FSK.realized(S);
  return sect('الأسهم', h('p', { class: 'mut' }, 'الأسعار يدوية تحدّثها أنت. الشراء تحويل من حسابك وليس مصروفاً.'), btn('+ سهم جديد', () => go('assets', 'stock', { mode: 'new' })),
    X.length ? X.map(x => h('div', { class: 'tx', 'data-stock': x.id }, h('div', {}, h('b', {}, x.name), ' · ' + (x.cur === 'USD' ? 'بالدولار' : 'بالدينار')),
      row('العدد', qTxt(x.qty)), x.qty > 0 ? row('متوسط الشراء للسهم', money(x.avg)) : null, x.price != null ? row('آخر سعر · ' + nWhen(x.priceDate), pTxt(x.price, x.cur)) : null,
      x.qty > 0 ? row('القيمة الحالية', money(x.mkt) + (x.cur === 'USD' ? ' (' + L.fmtUsd(x.mktNative) + ')' : '')) : null, x.qty > 0 ? row('التكلفة', money(x.cost)) : null,
      x.qty > 0 ? row(ti('غير محقق'), sgn(x.unreal), x.unreal < 0 ? 'bad' : '') : null, x.realized ? row(ti('محقق من البيع', 'محقق'), sgn(x.realized), x.realized < 0 ? 'bad' : '') : null,
      h('div', { class: 'quick' }, btn('شراء', () => go('assets', 'stock', { mode: 'buy', id: x.id }), 'mini'), x.qty > 0 ? btn('بيع', () => go('assets', 'stock', { mode: 'sell', id: x.id }), 'mini') : null,
        x.qty > 0 ? btn('حدّث السعر', () => go('assets', 'stock', { mode: 'price', id: x.id }), 'mini alt') : null,
        x.qty === 0 && !S.tx.some(t => t.meta && t.meta.stock === x.id && !t.voided && !t.reverses) ? btn('إخفاء', () => act(() => { S.acc[x.id].hidden = true; }, 'أُخفي السهم'), 'mini alt') : null)))
      : emptyState('📈', 'لا أسهم بعد', 'أضف سهماً بزر «+ سهم جديد» لتتابع قيمته وربحك.'),
    live.length ? h('div', {}, row('مجموع القيمة الحالية', money(tm)), row(ti('مجموع غير المحقق', 'غير محقق'), sgn(tu), tu < 0 ? 'bad' : '')) : null, rz ? row(ti('محقق من الأسهم حتى الآن', 'محقق'), sgn(rz), rz < 0 ? 'bad' : '') : null); }
function stockScreen(mode, id) { const st = id ? FSK.list(S).find(x => x.id === id) : null, nm = st ? S.acc[id].name : '', back = backBtn(() => go('assets'));
  const pay = accOpts(a => a.kind === 'asset' && a.liquid), isUsd = k => k && S.acc[k] && S.acc[k].cur === 'USD', done = r => { if (r) go('assets'); };
  if (!pay.length) return h('div', {}, back, h('p', { class: 'mut' }, 'أنشئ حساباً سائلاً أولاً (نقد أو فيزا أو دولار).'));
  // المدفوع/المستلم: إن كانت عملة الحساب مثل عملة السهم يُحسب تلقائياً (العدد × السعر) ويمكن تعديله للعمولة؛ وإلا فهو مطلوب
  const amtF = (k, l, acctK, curOf) => ({ k, l, t: 'num', dyn: (c, v) => { const same = S.acc[v[acctK]] && (S.acc[v[acctK]].cur === curOf(v)); c.placeholder = same ? 'فارغ = العدد × السعر' : 'مطلوب: بعملة الحساب (' + (isUsd(v[acctK]) ? 'دولار' : 'دينار') + ')'; } });
  const amtOf = (v, k, acctK, cur) => { if (String(v[k] || '').trim()) return L.parseAmount(v[k], isUsd(v[acctK]) ? 2 : 0); if ((isUsd(v[acctK]) ? 'USD' : 'IQD') !== cur) throw new Error('اكتب المبلغ بعملة الحساب'); return FSK.native(L.parseAmount(v.qty, 3), pAmt(v.price, cur)); };
  const rt = (v, k) => isUsd(v[k]) ? L.parseAmount(v.rate, 2) : null;
  if (mode === 'new') return h('div', {}, back, h('h1', {}, 'سهم جديد'), buildForm([{ k: 'name', l: 'اسم السهم أو الشركة', t: 'text', req: true }, { k: 'cur', l: 'عملة السعر', t: 'select', opts: [['IQD', 'دينار'], ['USD', 'دولار']] },
      { k: 'how', l: 'كيف صار عندك؟', t: 'select', opts: [['buy', 'اشتريته الآن من حساب'], ['old', 'كان عندي قبل البدء (' + S.x.openDate + ')']] }, { k: 'qty', l: 'عدد الأسهم (حتى 3 منازل)', t: 'num', req: true },
      { k: 'price', l: 'سعر السهم عند الشراء (بعملة السعر)', t: 'num', req: true, dyn: (c, v) => { c.parentNode.firstChild.textContent = v.how === 'old' ? 'متوسط سعر شراء السهم (بعملة السعر)' : 'سعر السهم عند الشراء (بعملة السعر)'; } },
      { k: 'date', l: 'تاريخ الشراء', t: 'date', v: L.today(), req: true, show: v => v.how === 'buy' }, { k: 'from', l: 'دُفع من', t: 'select', opts: pay, show: v => v.how === 'buy' },
      { ...amtF('paid', 'المدفوع فعلاً شاملاً العمولة', 'from', v => v.cur), show: v => v.how === 'buy' }, { ...rateDyn('date', v => v.how === 'buy' && isUsd(v.from)) },
      { k: 'today', l: 'سعر السهم اليوم (اختياري)', t: 'num' }],
    v => act(() => { const nid = FSK.add(S, { name: v.name, cur: v.cur }), q = L.parseAmount(v.qty, 3), p = pAmt(v.price, v.cur);
      if (v.how === 'old') FSK.addOld(S, { id: nid, qty: q, avg: p }); else FSK.buy(S, { id: nid, date: v.date, qty: q, price: p, from: v.from, paid: amtOf(v, 'paid', 'from', v.cur), r: rt(v, 'from') });
      if (String(v.today || '').trim()) FSK.setPrice(S, nid, L.today(), pAmt(v.today, v.cur)); return nid; }, 'أُضيف السهم').then(done), 'أضف السهم'));
  if (!st) return h('div', {}, back, h('p', {}, 'السهم غير موجود.'));
  const cur = st.cur, held = FSK.qtyAt(S, id), head = h('p', { class: 'mut' }, 'تملك ' + qTxt(held) + ' سهماً · العملة: ' + (cur === 'USD' ? 'دولار' : 'دينار'));
  if (mode === 'price') return h('div', {}, back, h('h1', {}, 'سعر «' + nm + '»'), head, buildForm([dt(), { k: 'price', l: 'سعر السهم (بعملة السعر)', t: 'num', req: true }],
    v => act(() => FSK.setPrice(S, id, v.date, pAmt(v.price, cur)), 'حُدّث السعر').then(() => go('assets')), 'حدّث'));
  if (mode === 'sell') return h('div', {}, back, h('h1', {}, 'بيع «' + nm + '»'), head, buildForm([dt('date', 'تاريخ البيع'), { k: 'qty', l: 'عدد الأسهم المبيعة', t: 'num', req: true, v: qTxt(held).replace(/,/g, '') }, { k: 'price', l: 'سعر البيع للسهم (بعملة السعر)', t: 'num', req: true },
      { k: 'to', l: 'تذهب النقود إلى', t: 'select', opts: pay }, amtF('proceeds', 'صافي ما استلمته بعد العمولة', 'to', () => cur), rateDyn('date', v => isUsd(v.to)), { k: 'note', l: 'ملاحظة', t: 'text' }],
    v => { const q = L.parseAmount(v.qty, 3), o = { id, date: v.date, qty: q, price: pAmt(v.price, cur), to: v.to, proceeds: amtOf(v, 'proceeds', 'to', cur), r: rt(v, 'to'), note: v.note };
      if (!confirm('تأكيد بيع ' + qTxt(q) + ' من «' + nm + '»؟')) return; let rz = 0;
      return act(() => { const tid = FSK.sell(S, o); rz = S.tx.find(t => t.id === tid).meta.realized; }, 'سُجّل البيع').then(() => { toast('سُجّل البيع · المحقق ' + sgn(rz), rz < 0); go('assets'); }); }, 'أكّد البيع'));
  return h('div', {}, back, h('h1', {}, 'شراء «' + nm + '»'), head, buildForm([dt('date', 'تاريخ الشراء'), { k: 'qty', l: 'عدد الأسهم', t: 'num', req: true }, { k: 'price', l: 'سعر السهم (بعملة السعر)', t: 'num', req: true },
      { k: 'from', l: 'دُفع من', t: 'select', opts: pay }, amtF('paid', 'المدفوع فعلاً شاملاً العمولة', 'from', () => cur), rateDyn('date', v => isUsd(v.from)), { k: 'note', l: 'ملاحظة', t: 'text' }],
    v => act(() => FSK.buy(S, { id, date: v.date, qty: L.parseAmount(v.qty, 3), price: pAmt(v.price, cur), from: v.from, paid: amtOf(v, 'paid', 'from', cur), r: rt(v, 'from'), note: v.note }), 'سُجّل الشراء').then(done), 'سجّل الشراء')); }
// ===== f1-v4.6 (المرحلة 3): التسجيل السريع (2)، شريط التراجع بعد الحفظ (3، 8)، الشرائح المتكررة (21)، ادفع لنفسك أولاً (24) =====
// ---- شريط التراجع: يظهر بعد الحفظ 7 ثوانٍ. «تراجع» يعكس العملية عكساً ظاهراً (تبقى في السجل للأمانة)، كما يفعل زر «تراجع» في القائمة ----
function snack(msg, undo) { let b = $('#snack'); if (!b) { b = h('div', { id: 'snack', role: 'status' }); document.body.append(b); }
  clearTimeout(snack.t); const u = undo ? btn('تراجع', () => { b.className = ''; clearTimeout(snack.t); act(undo, 'أُلغي'); }, 'mini') : null;
  b.replaceChildren(h('span', {}, h('i', { class: 'ck' }, '✓'), ' ' + msg), u); b.className = 'on'; snack.t = setTimeout(() => { b.className = ''; }, 7000); }
const undoTx = id => () => { const t = S.tx.find(x => x.id === id); if (!t || t.voided) throw new Error('العملية عُكست من قبل'); L.undo(S, id, L.today() > t.date ? L.today() : t.date); };
// يحفظ عملية (fn تعيد رقمها) ثم يعرض الشريط. extra: ما يُعاد مع التراجع (مثل موعد الراتب)
async function saveTx(fn, msg, extra) { const n = S.tx.length, r = await act(fn); if (S.tx.length === n) return null; const id = typeof r === 'number' ? r : S.tx[S.tx.length - 1].id;
  snack(msg, () => { undoTx(id)(); if (extra) extra(); }); return id; }
// ---- التسجيل السريع للمصروف: المبلغ أولاً بلوحة أرقام، ثم الفئة (الأكثر استعمالاً أولاً)، ثم «تم» ----
const QX = { amt: '', cat: null, picked: false, acct: null, day: 'today', date: '', note: '', rate: '' };
const daysAgo = n => L.iso(new Date(Date.now() - n * 864e5));
const PIXA = new WeakMap(), postsOf = id => { let c = PIXA.get(S); if (!c || c.n !== S.post.length || c.arr !== S.post) { const m = new Map(); S.post.forEach(p => { const a = m.get(p.tx); a ? a.push(p) : m.set(p.tx, [p]); }); c = { n: S.post.length, arr: S.post, m }; PIXA.set(S, c); } return c.m.get(id) || []; }; // فهرس القيود (أداء فقط)
const expTx = (days) => { const lim = daysAgo(days); return S.tx.filter(t => t.type === 'expense' && !t.voided && !t.reverses && t.date >= lim).map(t => { const ps = postsOf(t.id), c = ps.find(p => S.acc[p.a].kind === 'expense'), a = ps.find(p => S.acc[p.a].kind === 'asset');
  return c && a ? { id: t.id, date: t.date, cat: c.a, acct: a.a, amt: Math.abs(a.n), usd: S.acc[a.a].cur === 'USD', note: t.note || '' } : null; }).filter(Boolean); };
function catOrder() { const n = {}; expTx(90).forEach(x => { n[x.cat] = (n[x.cat] || 0) + 1; }); return L.CATS.map((c, i) => [c[0], c[1], n[c[0]] || 0, i]).sort((a, b) => b[2] - a[2] || a[3] - b[3]); }
// الشرائح المتكررة (21): مصروف تكرر مرتين فأكثر بالمبلغ والفئة والحساب والملاحظة نفسها خلال 120 يوماً. الشريحة تعبّئ النموذج فقط
// الذكاء هنا بسيط وشفاف: الوزن = مجموع (½ ^ (عمر المرة بالأيام ÷ 30))، فالمتكرر كثيراً وحديثاً يتقدّم ويكبر، والقديم يصغر ثم يختفي وحده.
// الحجم بالنسبة لأعلى وزن: كبير (≥ ⅔)، متوسط (≥ ⅓)، صغير. حتى 12 شريحة
function freqChips() { const g = {}, now = Date.parse(L.today()); expTx(120).forEach(x => { const k = [x.cat, x.amt, x.acct, x.note].join('|'), w = Math.pow(0.5, (now - Date.parse(x.date)) / 864e5 / 30);
    (g[k] = g[k] || { ...x, n: 0, w: 0, last: '' }).n++; g[k].w += w; if (x.date > g[k].last) g[k].last = x.date; });
  const xs = Object.values(g).filter(x => x.n >= 2 && S.acc[x.acct] && !S.acc[x.acct].hidden).sort((a, b) => b.w - a.w || (a.last < b.last ? 1 : -1)).slice(0, 12), top = xs.length ? xs[0].w : 1;
  return xs.map(x => ({ ...x, sz: x.w >= top * 2 / 3 ? 'lg' : x.w >= top / 3 ? 'md' : 'sm' })); }
function quickExpense() { const A = accOpts(); if (!A.length) return h('p', { class: 'mut' }, 'أنشئ حساباً أولاً من «أموالي».');
  const last = (t => t ? expTx(3650).find(x => x.id === t.id) : null)(S.tx.slice().reverse().find(t => t.type === 'expense' && !t.voided && !t.reverses)), C = catOrder();
  if (!QX.acct || !A.some(a => a[0] === QX.acct)) QX.acct = last && A.some(a => a[0] === last.acct) ? last.acct : A[0][0];
  if (!QX.picked || !QX.cat) QX.cat = C[0][0]; // الفئة الأكثر استعمالاً ما لم تختر غيرها
  const usd = () => S.acc[QX.acct].cur === 'USD', disp = h('div', { class: 'qamt', 'aria-live': 'polite' }), rateIn = h('input', { inputmode: 'decimal', placeholder: 'سعر 100 دولار بالدينار', value: QX.rate }), rateL = h('label', { class: 'f' }, h('span', {}, 'سعر 100 دولار بالدينار في ذلك اليوم'), rateIn);
  const show = () => { const s = QX.amt; disp.replaceChildren(h('b', {}, s ? (s.includes('.') ? s.split('.')[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + s.split('.')[1] : s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')) : '0'), h('span', {}, usd() ? ' $' : ' د.ع'));
    rateL.hidden = !usd(); if (usd() && !rateIn.value && S.x.rates.length) rateIn.value = String(L.rateAt(S, dateOf()) / 100); };
  const key = k => () => { let s = QX.amt; if (k === '⌫') s = s.slice(0, -1); else if (k === '.') { if (!usd() || s.includes('.')) return; s = (s || '0') + '.'; }
    else { if (s.includes('.') && s.split('.')[1].length >= 2) return; if (s === '0') s = ''; s = (s + k).slice(0, 15); } QX.amt = s; show(); };
  const pad = h('div', { class: 'qpad noswipe' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', usd() ? '.' : '000', '0', '⌫'].map(k => h('button', { type: 'button', class: 'qk2', onclick: key(k), 'aria-label': k === '⌫' ? 'مسح' : k }, k)));
  const cats = h('div', { class: 'qcats' }, C.map(([id, n]) => h('button', { type: 'button', class: 'chipb' + (id === QX.cat ? ' on' : ''), 'data-cat': id, onclick: e => { QX.cat = id; QX.picked = true; cats.querySelectorAll('.chipb').forEach(b => b.classList.toggle('on', b.dataset.cat === id)); } }, catIco(n), n)));
  const accS = h('select', { onchange: e => { QX.acct = e.target.value; QX.amt = ''; render(); } }, A.map(([v, t]) => h('option', { value: v, selected: v === QX.acct }, t)));
  const dateOf = () => QX.day === 'today' ? L.today() : QX.day === 'yest' ? daysAgo(1) : (QX.date || L.today());
  const dIn = h('input', { type: 'date', max: L.today(), value: QX.date || L.today(), onchange: e => { QX.date = e.target.value; } });
  const autoL = h('small', { class: 'autoc' }), noteIn = h('input', { placeholder: 'ملاحظة (اختياري): أين صُرف؟', value: QX.note, oninput: e => { QX.note = e.target.value; if (QX.picked) return; const g = guessCat(QX.note);
    if (g && g.cat !== QX.cat) { QX.cat = g.cat; cats.querySelectorAll('.chipb').forEach(b => b.classList.toggle('on', b.dataset.cat === g.cat)); } autoL.textContent = g ? '✨ الفئة «' + S.acc[g.cat].name + '» ' + (g.from === 'h' ? 'من سجلّك' : 'من الملاحظة') + '. غيّرها إن شئت.' : ''; } });
  const F = freqChips(), fill = x => { QX.amt = x.usd ? (x.amt / 100).toFixed(2) : String(x.amt); QX.cat = x.cat; QX.picked = true; QX.acct = x.acct; QX.note = x.note; QX.rate = ''; render(); toast('عُبّئ النموذج، راجعه ثم اضغط «تم»'); };
  const freq = F.length ? h('div', { class: 'qfreq' }, h('h2', {}, 'متكرر عندك'), h('div', { class: 'qchips' }, F.map(x => h('button', { type: 'button', class: 'fchip ' + x.sz, onclick: () => fill(x) },
    h('b', {}, x.note || (S.acc[x.cat] || {}).name || ''), h('span', { class: 'fa' }, x.usd ? L.fmtUsd(x.amt) : L.fmt(x.amt)), x.sz === 'lg' ? h('small', {}, 'آخر مرة ' + nWhen(x.last) + ' · ' + x.n + ' مرات') : x.sz === 'md' ? h('small', {}, x.n + ' مرات') : null)))) : null;
  const done = async () => { try { if (!QX.amt || /^0*\.?0*$/.test(QX.amt)) throw new Error('اكتب المبلغ'); const amount = L.parseAmount(QX.amt, usd() ? 2 : 0), d = dateOf(), cn = (S.acc[QX.cat] || {}).name;
      const r = usd() ? L.parseAmount(rateIn.value, 2) : null, a = QX.acct, note = QX.note.trim();
      const id = await saveTx(() => L.expense(S, { date: d, acct: a, cat: QX.cat, amount, r, note }), 'مصروف ' + (usd() ? L.fmtUsd(amount) : money(amount)) + ' · ' + cn);
      if (id) { QX.amt = ''; QX.note = ''; QX.rate = ''; QX.cat = null; QX.picked = false; QX.day = 'today'; render(); } } catch (e) { toast(e.message || String(e), true); } };
  show();
  return h('div', { class: 'qx' }, freq, sect('', disp, pad), sect('الفئة', cats),
    sect('', h('label', { class: 'f' }, h('span', {}, 'يُصرف من'), accS), rateL, h('label', { class: 'f' }, h('span', {}, 'التاريخ'), seg([['today', 'اليوم'], ['yest', 'أمس'], ['other', 'تاريخ آخر']], QX.day, k => { QX.day = k; render(); })),
      QX.day === 'other' ? dIn : null, noteIn, autoL, btn('تم', done, 'prim'))); }
// ---- ادفع لنفسك أولاً (24): بعد تسجيل الراتب فقط. «سجّل التحويل» يسجّله في التطبيق فقط ولا يحرك مالاً حقيقياً ----
const pyfCfg = () => S.x.set.pyf || {};
function pyfAfterSalary(amount, acct, date) { const c = pyfCfg(); if (!S.acc[acct]) return false; // يوم الراتب: ادفع لنفسك أولاً (إن لم يُوقف وكان الحساب بالدينار) ثم الأهداف ثم الفواتير ثم الخلاصة
  if (c.never || S.acc[acct].cur !== 'IQD') go('more', 'payday', { salary: amount, acct, date, step: 2 }); else go('more', 'pyf', { salary: amount, acct, date, flow: 1 }); return true; }
function pyfDests(acct) { const st = S.x.set, G = L.goalView(S), sg = st.savingsGoal && G.find(g => g.id === st.savingsGoal && g.cur !== 'USD');
  return (sg ? [['goal:' + sg.id, 'تخصيص لهدف «' + sg.name + '»']] : []).concat(accOpts(a => a.cur === 'IQD' && a.kind === 'asset' && a.id !== acct)); }
MORE.push(['pyf', 'ادفع لنفسك أولاً', () => { const p = view.p, c = pyfCfg(), sal = p.salary;
  if (!sal) return h('div', {}, h('p', { class: 'mut' }, 'يظهر هذا بعد تسجيل الراتب. إعداداته في ⚙ ← «ادفع لنفسك أولاً».'), btn('الرئيسية', () => go('home'), 'alt'));
  const D = pyfDests(p.acct); if (!D.length) return h('div', {}, h('p', {}, 'لا يوجد حساب ادخار أو هدف مدخرات. أنشئ حساباً بالدينار أو حدّد هدف المدخرات أولاً.'), btn('ليس الآن', () => pyfDone(), 'alt'));
  let pct = c.mode === 'amt' && c.amt ? null : (c.pct || 10), amt = c.mode === 'amt' && c.amt ? c.amt : Math.round(sal * pct / 100);
  const pIn = h('input', { inputmode: 'decimal', value: pct == null ? String(Math.round(amt / sal * 1000) / 10) : String(pct) }), aIn = h('input', { inputmode: 'numeric', value: String(amt) }), chips = h('div', {});
  const drawChips = () => chips.replaceChildren(seg([5, 10, 15, 20].map(x => [String(x), x + '%']), pIn.value, k => { pIn.value = k; aIn.value = String(Math.round(sal * +k / 100)); drawChips(); }));
  pIn.oninput = () => { const v = Number(L.norm(pIn.value)); if (v >= 0 && v <= 100) aIn.value = String(Math.round(sal * v / 100)); drawChips(); };
  aIn.oninput = () => { try { const v = L.parseAmount(aIn.value, 0); pIn.value = String(Math.round(v / sal * 1000) / 10); } catch (e) {} drawChips(); };
  const to = h('select', {}, D.map(([v, t]) => h('option', { value: v, selected: v === c.to }, t))); let mode = c.mode || 'pct'; const modeBox = h('div', {});
  const drawMode = () => modeBox.replaceChildren(seg([['pct', 'احفظ كنسبة'], ['amt', 'احفظ كمبلغ ثابت']], mode, k => { mode = k; drawMode(); })); drawChips(); drawMode();
  const rec = async () => { let a; try { a = L.parseAmount(aIn.value, 0); if (a <= 0) throw new Error('اكتب مبلغاً موجباً'); } catch (e) { return toast(e.message, true); } const pv = Number(L.norm(pIn.value)), dest = to.value, d = p.date || L.today();
    const save = () => { S.x.set.pyf = { ...pyfCfg(), mode, pct: mode === 'pct' ? pv : null, amt: mode === 'amt' ? a : null, to: dest, never: false }; };
    if (dest.startsWith('goal:')) { const gid = dest.slice(5), ok = await act(() => { save(); L.goalMove(S, { id: gid, amount: a, date: d }); S.goals[S.goals.length - 1].pyf = true; return true; });
      if (ok) { snack('خُصّص ' + money(a) + ' للمدخرات', () => { L.goalMove(S, { id: gid, amount: a, date: d, release: true }); S.goals[S.goals.length - 1].pyf = true; }); pyfDone(); } }
    else { const id = await saveTx(() => { save(); const tid = L.transfer(S, { date: d, from: p.acct, to: dest, amount: a, note: 'ادفع لنفسك أولاً' }); S.tx.find(t => t.id === tid).meta = { pyf: 1 }; return tid; }, 'سُجّل تحويل ' + money(a) + ' للادخار'); if (id) pyfDone(); } };
  return h('div', {}, sect('', h('p', {}, 'قبل أن تصرف من راتبك، انقل جزءاً إلى مدخراتك.'), row('الراتب المسجّل', money(sal)), h('label', { class: 'f' }, h('span', {}, 'النسبة'), chips),
      h('div', { class: 'two' }, h('label', { class: 'f' }, h('span', {}, 'النسبة %'), pIn), h('label', { class: 'f' }, h('span', {}, 'المبلغ (د.ع)'), aIn)),
      h('label', { class: 'f' }, h('span', {}, 'إلى'), to), modeBox, h('p', { class: 'mut' }, '«سجّل التحويل» يسجّله في التطبيق فقط؛ انقل المال الحقيقي بنفسك.'),
      btn('سجّل التحويل', rec, 'prim'), btn('ليس الآن', () => pyfDone(), 'alt'), btn('لا تسأل ثانية', () => act(() => { S.x.set.pyf = { ...pyfCfg(), never: true }; }, 'لن يُسأل بعد الآن. أعده من ⚙ ← «ادفع لنفسك أولاً»').then(() => pyfDone()), 'alt'))); }]);
function pyfPanel() { const c = pyfCfg(), on = !c.never;
  return sect('ادفع لنفسك أولاً', h('p', { class: 'mut' }, 'بعد تسجيل الراتب يقترح التطبيق نقل نسبة أو مبلغ ثابت إلى مدخراتك. التسجيل لا يتم إلا بضغطك «سجّل التحويل».'),
    seg([['1', 'يُسأل بعد الراتب'], ['0', 'متوقف']], on ? '1' : '0', k => act(() => { S.x.set.pyf = { ...c, never: k === '0' }; }, k === '1' ? 'فُعّل' : 'أُوقف')),
    row('المحفوظ', c.mode === 'amt' && c.amt ? money(c.amt) + ' (مبلغ ثابت)' : (c.pct || 10) + '%' + (c.pct ? '' : ' (افتراضي)'))); }
const pyfSummary = () => { const c = pyfCfg(); return c.never ? 'متوقف' : c.mode === 'amt' && c.amt ? money(c.amt) : (c.pct || 10) + '%'; };
// ===== f1-v4.7 (المرحلة 4): أدوات القرار (31–36) والرئيسية الأخف (1). الحساب في decide.js، عرض فقط =====
const LVC = { red: 'badc', warn: 'warnc', ok: 'okc', info: '' };
function decisionCard() { let sf; try { sf = FD.safe(S); } catch (e) { return null; } if (!sf) return null;
  const today = L.today(), soon = sf.commit.find(c => c.d <= L.iso(new Date(Date.parse(today) + 3 * 864e5))), after = sf.days > 1 ? Math.max(0, Math.floor((sf.base - sf.commitTotal) / (sf.days - 1))) : 0;
  const d = sf.noIncome ? { lv: 'info', t: 'لم يُسجَّل دخل بعد، فالمصروف الآمن صفر.', a: 'سجّل راتبك عند استلامه ليحسب التطبيق ما تستطيع صرفه يومياً.' }
    : sf.short > 0 ? { lv: 'red', t: 'التزاماتك القادمة أكبر من المتبقي لديك بـ ' + money(sf.short) + '.', a: 'أجّل أي مصروف غير ضروري حتى الراتب القادم.' }
    : sf.leftToday < 0 ? { lv: 'red', t: 'تجاوزت المصروف الآمن اليوم بـ ' + money(-sf.leftToday) + '.', a: 'ليبقى شهرك متوازناً: لا تتجاوز ' + money(after) + ' يومياً من الغد.' }
    : soon ? { lv: 'warn', t: '«' + soon.t + '» بمبلغ ' + money(soon.amt) + ' · ' + nWhen(soon.d) + '.', a: 'أبقِ هذا المبلغ متاحاً، وهو محسوب في المصروف الآمن.' }
    : { lv: 'ok', t: 'تستطيع صرف ' + money(sf.leftToday) + ' أخرى اليوم وتبقى ضمن خطتك حتى آخر الشهر.', a: '' };
  const how = fold('كيف حُسب؟', false, row('المتبقي من دخلك منذ البدء', money(sf.pool)), row('المتاح للصرف', money(sf.avail)), row('المعتمد (الأقل منهما، صباح اليوم)', money(sf.base0)),
    row('− الالتزامات القادمة حتى آخر الشهر', money(sf.commitTotal)), sf.commit.map(c => row('   ' + c.t + ' · ' + nWhen(c.d), money(c.amt), 'mut')), row('÷ الأيام المتبقية مع اليوم', String(sf.days)), row('= المصروف الآمن اليوم', money(sf.safe)),
    h('p', { class: 'mut' }, 'المتبقي = دخلك منذ البدء − مصروفك − ما ادخرته بـ«ادفع لنفسك أولاً». أقساط الأهداف ' + (S.x.set.decGoals ? 'محسوبة' : 'غير محسوبة') + ' (⚙ ← «المصروف الآمن»).'));
  const el = sect('قرار اليوم', h('div', { class: 'r dsafe' }, h('span', {}, 'المصروف الآمن اليوم'), animNum(h('b', {}), sf.safe, 'safe', money)), row('صرفت اليوم', money(sf.spentToday)), row('يتبقى لليوم', money(sf.leftToday), sf.leftToday < 0 ? 'bad' : ''),
    h('div', { class: 'dnote ' + d.lv }, h('b', { class: LVC[d.lv] }, d.t), d.a ? h('p', {}, d.a) : null), how);
  el.classList.add('dcard'); el.dataset.lv = d.lv; return el; }
function wealthStrip() { const p = L.panel(S), ex = exclInfo(), shown = p.nw - ex.amt, N = FD.wealthNotes(S), dm = p.dMonth;
  const el = sect(ti('صافي الثروة'), h('div', { class: 'r wbig' }, animNum(h('b', {}), shown, 'nw', money), dm == null ? null : h('span', { class: dm < 0 ? 'badc' : 'okc' }, (dm > 0 ? '▲ +' : dm < 0 ? '▼ ' : '') + L.fmt(dm) + ' هذا الشهر')),
    ex.names.length ? h('p', { class: 'mut' }, 'دون: ' + ex.names.join('، ')) : null, monthsShield(), N.filter(n => FM.savings(S) || !n.t.startsWith('سيولتك تكفي')).map(n => h('p', { class: 'wn ' + (LVC[n.lv] || '') }, (n.lv === 'warn' ? '⚠ ' : n.lv === 'ok' ? '✓ ' : 'ℹ ') + n.t)));
  el.classList.add('wstrip'); return el; }
function monthCard() { let m; try { m = FD.monthSummary(S); } catch (e) { return null; } if (!m) return null; const f = m.forecast, dec = m.decision;
  return sect('ملخص الشهر حتى اليوم', row('مصروفك حتى اليوم', money(m.now) + (m.prev != null ? (m.now > m.prev ? ' ▲' : m.now < m.prev ? ' ▼' : '') : '')), m.prev != null ? row('الفترة نفسها الشهر الماضي', money(m.prev)) : null,
    m.diffs.filter(x => x.d).map(x => row('   ' + x.n, (x.d > 0 ? '+' : '') + L.fmt(x.d) + (x.p != null ? ' (' + (x.p > 0 ? '+' : '') + x.p + '%)' : ''), x.d > 0 ? 'bad' : 'okc')),
    (x => x ? h('div', { class: 'fc' }, h('h2', {}, 'دخل هذا الشهر'), x) : null)(splitRows(L.mkey(L.today()) + '-01', L.today())),
    f ? h('div', { class: 'fc' }, h('h2', {}, 'المتوقع آخر الشهر' + (f.early ? ' (تقدير أولي)' : '')), row('الدخل', money(f.income) + (f.pendInc ? ' (منه ' + L.fmt(f.pendInc) + ' منتظر)' : '')),
      row('المصروف', money(f.expense)), row('الوفر' + (f.rate != null ? ' (' + f.rate + '%)' : ''), sgn(f.savings), f.savings < 0 ? 'bad' : ''),
      h('p', { class: 'mut' }, 'المصروف = ما صرفته (' + L.fmt(f.sofar) + ') + وتيرتك اليومية (' + L.fmt(f.pace) + ') × ' + f.rest + ' يوماً + الالتزامات القادمة (' + L.fmt(f.commit) + ').')) : null,
    h('div', { class: 'dnote ' + dec.lv }, h('b', { class: LVC[dec.lv] }, 'قرار مقترح: ' + dec.t), h('p', {}, dec.a))); }
function whatIfScreen() { const b = FD.baseline(S), back = backBtn(() => go('insights'));
  if (!b) return h('div', {}, back, h('h1', {}, 'ماذا لو؟'), h('p', { class: 'mut' }, 'سجّل الرصيد الافتتاحي وبعض الدخل والمصروف أولاً.'));
  const V = { ok: ['okc', 'يتحمّله وضعك'], warn: ['warnc', 'ممكن بحذر: ادخارك ينزل تحت 10%'], red: ['badc', 'لا يتحمّله وضعك الآن'] };
  const out1 = h('div', {}), inIn = h('input', { inputmode: 'numeric', placeholder: 'مثال: 250,000' });
  const upd1 = () => { let a = 0; try { a = inIn.value.trim() ? L.parseAmount(inIn.value, 0) : 0; } catch (e) { return out1.replaceChildren(h('p', { class: 'bad' }, e.message)); } if (!a) return out1.replaceChildren();
    const r = FD.whatIfInstallment(S, a); out1.replaceChildren(row('وفرك الشهري الآن', sgn(r.sav0)), row('وفرك بعد القسط', sgn(r.sav), r.sav < 0 ? 'bad' : ''), row('نسبة الادخار بعده', r.rate == null ? '—' : r.rate + '%'), row('القسط من دخلك', r.share == null ? '—' : r.share + '%', r.share > 30 ? 'bad' : ''),
      h('p', { class: V[r.lv][0] }, '◀ ' + (r.share != null && r.share > 30 ? 'القسط أكثر من 30% من دخلك: عبء كبير' : V[r.lv][1]))); };
  inIn.oninput = upd1;
  const out2 = h('div', {}), seg2 = h('div', {}); let pct = 20;
  const upd2 = () => { const r = FD.whatIfIncomeDrop(S, pct); seg2.replaceChildren(seg([[10, '10%'], [20, '20%'], [30, '30%'], [50, '50%']].map(([k, t]) => [String(k), t]), String(pct), k => { pct = +k; upd2(); }));
    out2.replaceChildren(row('دخلك يصبح', money(r.newInc)), row('وفرك يصبح', sgn(r.sav), r.sav < 0 ? 'bad' : ''), r.months != null ? row('سيولتك تغطي العجز', r.months + ' شهر', 'bad') : row('نسبة الادخار', r.rate == null ? '—' : r.rate + '%'), h('p', { class: V[r.lv][0] }, '◀ ' + V[r.lv][1])); };
  upd2();
  const u = FD.whatIfUsd(S, 5), u2 = FD.whatIfUsd(S, -5);
  return h('div', {}, back, h('h1', {}, 'ماذا لو؟'), h('p', { class: 'mut' }, 'الأساس: متوسط دخلك ' + money(b.inc) + ' ومصروفك ' + money(b.exp) + (b.n ? ' لآخر ' + b.n + ' أشهر كاملة' : ' (تقدير هذا الشهر)') + (b.est ? '. البيانات قليلة، فالنتيجة تقريبية.' : '.') + ' حساب فقط، لا يُحفظ شيء.'),
    sect('قسط شهري جديد', h('label', { class: 'f' }, h('span', {}, 'القسط الشهري (د.ع)'), inIn), out1),
    sect('هبوط الدخل', seg2, out2),
    sect('سعر الدولار ±5%', h('p', { class: 'mut' }, 'يتأثر ما قيمته بالدولار: الدولار، والأسهم الدولارية، والذهب والفضة. الدينار لا يتغير.'), row('دولار', money(u.usd)), u.stocks ? row('أسهم دولارية', money(u.stocks)) : null, row('ذهب وفضة', money(u.metals)), row('المجموع المتأثر', money(u.total) + (u.share != null ? ' (' + u.share + '% من ثروتك)' : '')),
      row('إن ارتفع 5%', sgn(u.delta), 'okc'), row('إن انخفض 5%', sgn(u2.delta), u2.delta < 0 ? 'bad' : ''))); }
function decPanel() { const st = S.x.set; return sect('المصروف الآمن اليوم', h('p', { class: 'mut' }, 'الالتزامات القادمة: المتكررة غير المسجّلة هذا الشهر، وأقساط الجمعيات، والديون التي عليك المستحقة قبل آخر الشهر. وأقساط الأهداف إن اخترت.'),
  seg([['0', 'بدون أقساط الأهداف'], ['1', 'مع أقساط الأهداف']], st.decGoals ? '1' : '0', k => act(() => { st.decGoals = k === '1'; }, 'حُفظ'))); }
// ===== f1-v4.8 (المرحلة 5): المسار المالي المستقبلي داخل «تحليلاتي» (38–41). الحساب في decide.js، عرض فقط =====
const PV = { cur: 'IQD' };
const pMoney = (n, P) => PV.cur === 'USD' && P.rate ? L.fmtUsd(Number(E.rd(BigInt(n) * 1000000n, BigInt(P.rate)))) : money(n);
const pShort = (n, P) => { if (PV.cur === 'USD' && P.rate) { const d = n * 10000 / P.rate; return (Math.abs(d) >= 1e6 ? (d / 1e6).toFixed(1) + 'م' : Math.abs(d) >= 1e3 ? Math.round(d / 1e3) + 'ألف' : Math.round(d)) + ' $'; } const t = x => String(+x); return Math.abs(n) >= 1e9 ? t((n / 1e9).toFixed(2)) + ' مليار' : Math.abs(n) >= 1e6 ? t((n / 1e6).toFixed(1)) + ' مليون' : Math.round(n / 1e3) + ' ألف'; };
const pathNote = P => h('p', { class: 'mut' }, 'تقدير لا وعد: صافي ثروتك الآن + ادخارك الشهري × الأشهر' + (P.cfg.growth ? '، مع نمو أصول ' + P.cfg.growth + '% سنوياً' : '، بلا نمو للأصول') + (P.cfg.real && P.cfg.infl ? '، بأسعار اليوم (تضخم ' + P.cfg.infl + '%)' : '') + '. محلي على هاتفك، ويتحدّث مع كل شهر مكتمل.');
// ---- f1-v4.8b: تصميم جديد للمسار — بطاقة رئيسية، اختيار الأفق، رسم مروحي للسيناريوهات الثلاثة، بطاقات السيناريو مع التفكيك، ومحطات «متى تصل؟» ----
const SC_COL = { cur: 'var(--acc)', up: 'var(--ok)', down: 'var(--bad)' }, SC_DESC = { cur: 'كما أنت الآن', up: 'مصروف أقل 15%', down: 'دخل أقل 20% ومصروف أكثر 10%' };
if (!PV.h) PV.h = 'y5'; if (!PV.s) PV.s = 'cur';
const yrsTxt = m => { const y = Math.floor(m / 12), mo = Math.round(m % 12); return (y ? (y === 1 ? 'سنة' : y === 2 ? 'سنتان' : y + (y <= 10 ? ' سنوات' : ' سنة')) : '') + (y && mo ? ' و' : '') + (mo ? (mo === 1 ? 'شهر' : mo === 2 ? 'شهران' : mo + (mo <= 10 ? ' أشهر' : ' شهراً')) : '') || 'الآن'; };
// قيمة سيناريو بعد m شهراً كما تُعرض (مع النمو والتضخم إن اختيرا)
const pathAt = (P, s, m) => { const r = FD.fv(P.nw, s, m, P.cfg.growth), d = P.cfg.real && P.cfg.infl ? Math.pow(1 + P.cfg.infl / 100, m / 12) : 1; return Math.round(r.end / d); };
// ---- f1-v4.8c: ثلاثة أشكال للمسار المالي يختارها المستخدم من الإعدادات كالثيمات: آلة الزمن (الافتراضي)، رحلتك المالية، نخلتك المالية ----
// الحساب واحد للثلاثة (FD.path و pathAt)؛ الشكل وحده يتغير. الاختيار محفوظ على هذا الجهاز (localStorage) ولا يدخل البيانات المالية.
const PSTYLES = [['dial', 'آلة الزمن', 'قرص تديره فتختار السنة، مع قصة الرقم'], ['road', 'رحلتك المالية', 'طريق بمحطات وأعلام للأهداف'], ['palm', 'نخلتك المالية', 'نخلة تطول مع ثروتك، وتمرها أهدافك']];
const PS_KEY = 'flousi-pathview', pStyle = () => { try { const v = localStorage.getItem(PS_KEY); return PSTYLES.some(x => x[0] === v) ? v : 'dial'; } catch (e) { return 'dial'; } };
const setPStyle = v => { try { localStorage.setItem(PS_KEY, v); } catch (e) {} };
if (PV.m == null) PV.m = 60;
const SC_ICO = { cur: '☀', up: '🌱', down: '🌧' };
function milestones(P, s, upTo = 300) { const nw = P.nw, base = Math.max(nw, 1), step = [1e7, 2.5e7, 5e7, 1e8, 2.5e8, 5e8, 1e9, 2.5e9, 5e9, 1e10].filter(v => v > base * 1.05).slice(0, 4), out = [];
  step.forEach(t => { let m = null; for (let i = 1; i <= upTo; i++) if (pathAt(P, s.s, i) >= t) { m = i; break; } out.push({ t, m }); }); return out; }
const yearAt = m => { const t = L.today(); return +t.slice(0, 4) + Math.floor((+t.slice(5, 7) - 1 + Math.round(m)) / 12); };
const scOf = P => P.scen.find(x => x.id === PV.s) || P.scen[0];
// عدّاد يتحرك من القيمة السابقة إلى الجديدة (300 ملّي ثانية)
function countTo(el, v, fmt) { const from = +(el.dataset.v || v), t0 = performance.now(); el.dataset.v = v; cancelAnimationFrame(el._raf);
  const step = t => { const k = Math.min(1, (t - t0) / 300), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(from + (v - from) * e)); if (k < 1) el._raf = requestAnimationFrame(step); }; el._raf = requestAnimationFrame(step); }
const scenChips = P => h('div', { class: 'chips2 noswipe' }, P.scen.map(x => h('button', { type: 'button', class: x.id === PV.s ? 'on' : '', style: '--sc:' + SC_COL[x.id], onclick: () => { PV.s = x.id; render(); } }, SC_ICO[x.id] + ' ' + x.n)));
const hzChips = (P, on) => h('div', { class: 'hz noswipe' }, P.rows.map(x => h('button', { type: 'button', class: Math.abs(x.m - PV.m) < 0.05 ? 'on' : '', onclick: () => { PV.m = x.m; on ? on() : render(); } }, x.id === 'm1' ? 'شهر' : x.id === 'eoy' ? 'آخر السنة' : x.id === 'y5' ? '5 سنوات' : x.id === 'y10' ? '10 سنوات' : '25 سنة')));
function pathBreak(P, m) { const s = scOf(P), r = FD.fv(P.nw, s.s, m, P.cfg.growth), d = P.cfg.real && P.cfg.infl ? Math.pow(1 + P.cfg.infl / 100, m / 12) : 1;
  return fold('كيف وصل الرقم؟', false, row('ثروتك الآن', pMoney(P.nw, P)), row('+ ادخارك ' + yrsTxt(m) + ' × ' + money(s.s), pMoney(r.saved, P), r.saved < 0 ? 'bad' : ''), r.growth ? row('+ نمو الأصول ' + P.cfg.growth + '%', pMoney(r.growth, P)) : null,
    d > 1 ? row('÷ التضخم (بأسعار اليوم)', '÷ ' + d.toFixed(2)) : null, row('= المتوقع', pMoney(Math.round(r.end / d), P)), s.s < 0 ? h('p', { class: 'badc' }, 'في هذا السيناريو تصرف أكثر من دخلك، فتنقص ثروتك كل شهر.') : null); }
function storyText(P, m) { const s = scOf(P), v = pathAt(P, s.s, m), sav = Math.round(s.s * m), y = yearAt(m), up = P.scen.find(x => x.id === 'up'), gain = pathAt(P, up.s, m) - pathAt(P, P.scen[0].s, m), cut = up.s - P.scen[0].s;
  if (m < 0.5) return [['اليوم ثروتك '], [pShort(P.nw, P), 1], ['. حرّك الزمن لترى أين تصل.']];
  if (s.s < 0) return [['في '], [String(y), 1], [' ستكون ثروتك نحو '], [pShort(v, P), 1], ['، أقل من اليوم بـ '], [pShort(P.nw - v, P), 1], [' لأن مصروفك في هذا السيناريو أكبر من دخلك بـ '], [pShort(-s.s, P), 1], [' شهرياً.']];
  const share = v > 0 ? Math.round(sav / v * 100) : 0;
  return [['في '], [String(y), 1], [' ستكون ثروتك نحو '], [pShort(v, P), 1], ['. '], ...(sav > 0 ? [[share + '%', 1], [' منها من ادخارك الشهري '], [pShort(s.s, P), 1], ['. ']] : []),
    ...(PV.s === 'cur' && gain > 0 ? [['لو صرفت أقل بـ '], [pShort(cut, P), 1], [' شهرياً تكسب '], [pShort(gain, P), 1], [' إضافية.']] : [])]; }
const storyEl = (P, m) => h('div', { class: 'story' }, storyText(P, m).map(([t, b]) => b ? h('b', {}, t) : t));
// ===== 1) آلة الزمن (الافتراضي): القرص دورة كاملة = 25 سنة =====
function pathDial(P) { const box = h('div', {}), R = 128, C = 165, L2 = 2 * Math.PI * R;
  const draw = () => { const m = PV.m, s = scOf(P), v = pathAt(P, s.s, m), a = m / 300 * 2 * Math.PI, kx = C + R * Math.sin(a), ky = C - R * Math.cos(a), mult = P.nw > 0 ? v / P.nw : null, ms = milestones(P, s).find(x => x.m && x.m > m);
    const svg = svgEl(`<svg viewBox="-14 0 358 330" width="100%" style="direction:ltr;touch-action:none" role="slider" aria-label="اختر السنة"><circle cx="${C}" cy="${C}" r="150" style="fill:var(--bar);stroke:var(--line)"/>`
      + `<circle cx="${C}" cy="${C}" r="${R}" fill="none" style="stroke:var(--soft)" stroke-width="18"/>`
      + `<circle cx="${C}" cy="${C}" r="${R}" fill="none" style="stroke:${SC_COL[s.id]}" stroke-width="18" stroke-linecap="round" stroke-dasharray="${(L2 * m / 300).toFixed(1)} ${L2.toFixed(1)}" transform="rotate(-90 ${C} ${C})"/>`
      + [0, 5, 10, 15, 20].map(y => { const b = y / 25 * 2 * Math.PI; return `<text x="${(C + 152 * Math.sin(b)).toFixed(0)}" y="${(C - 152 * Math.cos(b) + 4).toFixed(0)}" font-size="11" font-weight="700" text-anchor="middle" style="fill:var(--mute);paint-order:stroke;stroke:var(--bar);stroke-width:4px">${y ? y + ' س' : 'الآن'}</text>`; }).join('')
      + `<circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="16" style="fill:var(--btn);stroke:var(--btnt)" stroke-width="4"/></svg>`, 'dialsvg');
    const num = h('b', { class: 'dv' }); num.dataset.v = box._last != null ? box._last : v; box._last = v;
    box.replaceChildren(h('div', { class: 'dial noswipe' }, svg, h('div', { class: 'dc' }, h('span', { class: 'dy' }, String(yearAt(m))), h('small', {}, (m < 0.5 ? 'اليوم' : 'بعد ' + yrsTxt(m)) + ' · ' + s.n), num,
        mult != null && m >= 0.5 ? h('i', { class: v < P.nw ? 'badc' : 'okc' }, '× ' + mult.toFixed(1) + ' ثروتك اليوم') : null)),
      hzChips(P, draw),
      h('div', { class: 'facts' }, P.scen.filter(x => x.id !== s.id).map(x => h('div', {}, h('small', {}, SC_ICO[x.id] + ' ' + (x.id === 'up' ? 'لو خفّضت مصروفك 15%' : x.id === 'down' ? 'لو قلّ دخلك 20%' : 'كما أنت الآن')), h('b', {}, pShort(pathAt(P, x.s, m), P)))),
        h('div', {}, h('small', {}, 'ادخارك حتى ذلك الوقت'), h('b', { class: s.s < 0 ? 'badc' : '' }, pShort(Math.round(s.s * m), P))), h('div', {}, h('small', {}, 'المحطة القادمة'), h('b', {}, ms ? pShort(ms.t, P) + ' · ' + yearAt(ms.m) : '—'))),
      storyEl(P, m), pathBreak(P, m), lettersEl(m));
    countTo(num, v, x => pShort(x, P));
    const el = svg.querySelector('svg'), pick = e => { const r = el.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2; let ang = Math.atan2(x, -y); if (ang < 0) ang += 2 * Math.PI;
      let nm = Math.round(ang / (2 * Math.PI) * 300); if (PV.m > 240 && nm < 60) nm = 300; if (PV.m < 60 && nm > 240) nm = 0; nm = Math.max(0, Math.min(300, nm)); if (nm !== PV.m) { PV.m = nm; draw(); } };
    el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); el._drag = true; pick(e); }); el.addEventListener('pointermove', e => { if (el._drag) pick(e); }); el.addEventListener('pointerup', () => { el._drag = false; }); };
  draw(); return box; }
// ===== 2) رحلتك المالية: طريق متعرج ومحطات وأعلام الأهداف =====
function pathRoad(P) { const s = scOf(P), rows = P.rows, ms = milestones(P, s), W = 362, step = 210, H = 70 + rows.length * step;
  const pts = rows.map((r, i) => [i % 2 ? 70 : 292, 90 + i * step]), start = [292, 30];
  let d = 'M' + start.join(' '); [start, ...pts].forEach((p, i, a) => { if (!i) return; const q = a[i - 1]; d += ` C ${q[0]} ${q[1] + step * 0.55}, ${p[0]} ${p[1] - step * 0.55}, ${p[0]} ${p[1]}`; });
  const svg = svgEl(`<svg width="100%" viewBox="0 0 ${W} ${H}" style="direction:ltr" aria-hidden="true"><path d="${d}" fill="none" style="stroke:var(--soft)" stroke-width="34" stroke-linecap="round"/><path class="rd" d="${d}" fill="none" style="stroke:${SC_COL[s.id]}" stroke-width="6" stroke-dasharray="14 10" stroke-linecap="round"/>`
    + `<circle cx="${start[0]}" cy="${start[1]}" r="13" style="fill:var(--btn)"/>` + pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 15 : 11}" style="fill:${i === pts.length - 1 ? 'var(--btn)' : 'var(--wait)'}"/>`).join('') + '</svg>', 'roadsvg');
  const cards = rows.map((r, i) => { const v = pathAt(P, s.s, r.m), prev = i ? rows[i - 1].m : 0, fl = ms.filter(x => x.m && x.m > prev && x.m <= r.m), last = i === rows.length - 1;
    return h('div', { class: 'st' + (last ? ' fin' : ''), style: 'top:' + (pts[i][1] - 44) + 'px;' + (i % 2 ? 'right:8px' : 'left:8px') + ';animation-delay:' + (i * 90) + 'ms' },
      h('span', { class: 't' }, r.n + (r.m >= 12 ? ' · ' + yearAt(r.m) : '')), h('b', {}, pShort(v, P)), h('small', { class: v < P.nw ? 'badc' : '' }, (v >= P.nw ? '+' : '−') + pShort(Math.abs(v - P.nw), P) + ' عن اليوم'),
      r.m >= 60 ? h('div', { class: 'tri' }, P.scen.filter(x => x.id !== s.id).map(x => h('i', { style: '--sc:' + SC_COL[x.id] }, SC_ICO[x.id] + ' ' + pShort(pathAt(P, x.s, r.m), P)))) : null,
      fl.map(x => h('small', { class: 'flag' }, (last ? '🏆 ' : '🏁 ') + 'تتجاوز ' + pShort(x.t, P) + ' في ' + yearAt(x.m)))); });
  const A = pathAdv(60), signs = A.slice(0, Math.min(4, rows.length - 1)).map((a, i) => { const p2 = pts[i + 1], x = p2[0] + (i % 2 ? 6 : -6), y = p2[1] - 62; // على الطريق قرب المحطة التالية، بعيداً عن بطاقتها
    return h('span', { class: 'rsg sgi ' + SIGN[a.lv][0], style: 'left:' + (x / W * 100).toFixed(1) + '%;top:' + (y - 17) + 'px', title: ADVT.road[a.k] }, h('b', {}, String(i + 1))); });
  return h('div', {}, h('div', { class: 'road', style: 'height:' + H + 'px' }, svg, ...signs, h('div', { class: 'you', style: 'right:20px;top:0' }, '📍 أنت هنا · ' + pShort(P.nw, P)), ...cards), storyEl(P, 60), signsEl(A), pathBreak(P, 60)); }
// ===== 3) نخلتك المالية: النخلة تطول مع الثروة، والتمر أهداف مستديرة تصلها =====
function pathPalm(P) { const box = h('div', {}), top = Math.max(P.nw, ...P.scen.map(x => pathAt(P, x.s, 300))) || 1, bot = Math.min(0, ...P.scen.map(x => pathAt(P, x.s, 300)));
  const Y = v => 318 - Math.max(0, (v - bot) / (top - bot)) * 250; // ارتفاع رأس النخلة
  const draw = () => { const m = PV.m, s = scOf(P), v = pathAt(P, s.s, m), hy = Y(v), ms = milestones(P, s).filter(x => x.m && x.m <= m), lv = P.scen.map(x => ({ x, y: Y(pathAt(P, x.s, m)) }));
    const rings = []; for (let y = 312; y > hy + 14; y -= 18) rings.push(`<line x1="103" y1="${y}" x2="118" y2="${y - 2}" stroke="#6E4523" stroke-width="2"/>`);
    const dates = ms.slice(0, 6).map((x, i) => `<circle cx="${98 + (i % 3) * 13}" cy="${hy + 12 + Math.floor(i / 3) * 12}" r="7" fill="${i % 2 ? '#E0B860' : '#C7A24B'}"/>`).join('');
    const svg = svgEl(`<svg viewBox="0 0 362 380" width="100%" style="direction:ltr" aria-hidden="true"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B4A3B"/><stop offset="1" stop-color="#13785F"/></linearGradient></defs>`
      + `<rect width="362" height="322" fill="url(#sky)"/><rect y="322" width="362" height="58" fill="#E3CF97"/><circle cx="300" cy="${(200 - m / 3).toFixed(0)}" r="22" fill="#F5E6B0" opacity=".85"/>`
      + `<path d="M110 322 C 106 240, 116 150, 112 ${Y(top).toFixed(0)}" stroke="#FFFBEA" stroke-opacity=".18" stroke-width="14" fill="none" stroke-dasharray="4 6"/>`
      + `<ellipse cx="110" cy="324" rx="110" ry="8" fill="#B8954A" opacity=".5"/><path d="M110 324 C 106 ${(324 + hy) / 2 + 10}, 114 ${(324 + hy) / 2 - 10}, 111 ${hy.toFixed(1)}" stroke="#8B5E34" stroke-width="15" fill="none" stroke-linecap="round"/>` + rings.join('')
      + `<g fill="none" stroke-linecap="round" stroke-width="7" transform="translate(0 ${(hy - 196).toFixed(1)})"><path d="M111 196 C 76 178, 50 186, 30 210" stroke="#2E9B6E"/><path d="M111 196 C 148 176, 174 184, 196 206" stroke="#2E9B6E"/><path d="M111 196 C 84 160, 60 152, 40 158" stroke="#3DB07F"/><path d="M111 196 C 140 158, 166 150, 186 156" stroke="#3DB07F"/><path d="M111 196 C 106 162, 114 142, 124 128" stroke="#48C38D"/></g>` + dates
      + lv.filter(o => o.x.id !== s.id).map(o => `<line x1="140" y1="${o.y.toFixed(1)}" x2="262" y2="${o.y.toFixed(1)}" stroke="${o.x.id === 'up' ? '#B6F5D6' : '#FFD3C7'}" stroke-dasharray="3 4"/><text x="266" y="${(o.y + 4).toFixed(1)}" font-size="11" font-weight="700" fill="${o.x.id === 'up' ? '#B6F5D6' : '#FFD3C7'}">${SC_ICO[o.x.id]} ${esc(pShort(pathAt(P, o.x.s, m), P))}</text>`).join('')
      + `<text x="181" y="356" text-anchor="middle" fill="#10312A" font-size="12.5" font-weight="700">🌱 جذورها اليوم: ${esc(pShort(P.nw, P))} · ${ms.length ? 'قطفت ' + ms.length + ' تمرة' : 'كل تمرة هدف تصله'}</text></svg>`, 'palmsvg');
    const num = h('b', {}); num.dataset.v = box._last != null ? box._last : v; box._last = v;
    const rng = h('input', { type: 'range', min: '0', max: '300', step: '1', value: String(Math.round(m)), class: 'prange', 'aria-label': 'الزمن' }); rng.oninput = () => { PV.m = +rng.value; draw(); const r2 = box.querySelector('.prange'); r2 && r2.focus(); };
    box.replaceChildren(h('div', { class: 'scene' }, svg, h('div', { class: 'big' }, h('small', {}, (m < 0.5 ? 'اليوم' : 'بعد ' + yrsTxt(m) + ' · ' + yearAt(m)) + ' · ' + s.n), num, m >= 0.5 ? h('i', { class: v < P.nw ? 'down' : '' }, (v >= P.nw ? '▲ نمت ' : '▼ نقصت ') + pShort(Math.abs(v - P.nw), P)) : null)),
      h('div', { class: 'slider noswipe' }, rng), h('div', { class: 'ticks' }, ['الآن', '5 س', '10 س', '15 س', '20 س', '25 س'].map(t => h('span', {}, t))),
      ms.length ? h('div', { class: 'dates' }, ms.map(x => h('span', {}, '🌴 ' + pShort(x.t, P) + ' · ' + yearAt(x.m)))) : null, storyEl(P, m), pathBreak(P, m), careEl(m));
    countTo(num, v, x => pShort(x, P)); };
  draw(); return box; }
// ---- استشارات المسار بثلاثة تصاميم: رسائل من المستقبل (آلة الزمن)، إشارات الطريق (الرحلة)، دليل العناية (النخلة) ----
const ADVT = {
  dial: { leak: 'أوقف النزيف', rate: 'ادّخر أولاً', shield: 'ابنِ درعك قبل أي شيء', idle: 'نقدك نائم', debt: 'تحرّر من الدين', fragile: 'لا تعتمد على راتب واحد', cut: '15% تصنع فرقاً', mile: 'محطتك القادمة', compound: 'دع الزمن يعمل لك', diversify: 'لا تضع البيض في سلة واحدة', fx: 'احمِ قيمة ثروتك', goal: 'هدفك ينتظرك', pyf: 'ادفع لنفسك أولاً', real: 'القيمة الحقيقية' },
  road: { leak: 'منحدر خطر', rate: 'زِد السرعة', shield: 'محطة وقود قبل الطريق الطويل', idle: 'سيارة متوقفة', debt: 'حاجز على الطريق', fragile: 'طريق بمسار واحد', cut: 'طريق مختصر', mile: 'المحطة القادمة', compound: 'طريق سريع', diversify: 'لا تسلك طريقاً واحداً', fx: 'منعطف العملة', goal: 'محطة فاتتك', pyf: 'املأ الخزان أولاً', real: 'المسافة الحقيقية' },
  palm: { leak: ['🐛', 'آفة في الجذع'], rate: ['💧', 'السقاية'], shield: ['🛡', 'سياج النخلة'], idle: ['🧺', 'تمر مكدّس بلا قطاف'], debt: ['🪓', 'جذع مُثقل'], fragile: ['🌬', 'ريح قوية قادمة'], cut: ['✂', 'التقليم'], mile: ['🌴', 'التمرة القادمة'], compound: ['🌱', 'فسائل الزمن'], diversify: ['🌳', 'بستان لا نخلة واحدة'], fx: ['🏜', 'تربة واحدة'], goal: ['🍂', 'سعفة ذابلة'], pyf: ['🚿', 'اسقِ أولاً'], real: ['⚖', 'وزن التمر الحقيقي'] } };
const advDisc = () => h('p', { class: 'mut advd' }, 'استشارات مبنية على أرقامك وتتغير بتغيّرها، وهي قواعد عامة وليست استشارة مالية ملزمة.');
const ADVM = {}; // ذاكرة قصيرة أثناء السحب: الحساب يتكرر فقط عند تغيّر السيناريو أو كل 6 أشهر أو تغيّر البيانات
const pathAdv = m => { const k = PV.s + ':' + Math.round(m / 6) + ':' + S.tx.length + ':' + JSON.stringify(S.x.set.path || {}); if (ADVM.k === k) return ADVM.v; let v; try { v = FD.pathAdvice(S, L.today(), m, PV.s); } catch (e) { v = []; } ADVM.k = k; ADVM.v = v; return v; };
function lettersEl(m) { const A = pathAdv(m), yr = yearAt(Math.max(m, 1)); if (!A.length) return null;
  const card = a => h('div', { class: 'letter lv-' + a.lv }, h('div', { class: 'lh' }, h('span', {}, '✉ من نفسك في ' + yr), h('i', { class: 'stamp' }, a.lv === 'red' ? '!' : a.lv === 'warn' ? '⚠' : a.lv === 'ok' ? '✓' : '★')),
    h('h3', {}, ADVT.dial[a.k] || ''), h('p', {}, a.body), h('p', { class: 'step' }, h('b', {}, 'الخطوة: '), a.step));
  return h('div', { class: 'advp' }, h('h2', { class: 'sub' }, 'رسائل من المستقبل'), ...A.slice(0, 3).map(card), A.length > 3 ? fold('رسائل أخرى (' + (A.length - 3) + ')', false, ...A.slice(3).map(card)) : null, advDisc()); }
const SIGN = { red: ['sg-red', '⛔'], warn: ['sg-warn', '!'], ok: ['sg-ok', '✓'], info: ['sg-info', 'i'] };
function signsEl(A) { if (!A.length) return null;
  const card = (a, i) => h('div', { class: 'sign' }, h('span', { class: 'sgi ' + SIGN[a.lv][0] }, h('b', {}, String(i + 1))), h('div', {}, h('h3', {}, ADVT.road[a.k] || ''), h('p', {}, a.body), h('p', { class: 'step' }, h('b', {}, '➜ '), a.step)));
  return h('div', { class: 'advp' }, h('h2', { class: 'sub' }, 'إشارات على طريقك'), ...A.slice(0, 4).map(card), A.length > 4 ? fold('إشارات أخرى (' + (A.length - 4) + ')', false, ...A.slice(4).map((a, i) => card(a, i + 4))) : null, advDisc()); }
function careEl(m) { const A = pathAdv(m); if (!A.length) return null;
  const card = a => { const [ic, t] = ADVT.palm[a.k] || ['🌴', '']; return h('div', { class: 'care lv-' + a.lv }, h('span', { class: 'cic' }, ic), h('div', {}, h('h3', {}, t), h('p', {}, a.body), h('p', { class: 'step' }, h('b', {}, '🌿 '), a.step))); };
  return h('div', { class: 'advp' }, h('h2', { class: 'sub' }, 'دليل العناية بنخلتك'), ...A.slice(0, 3).map(card), A.length > 3 ? fold('نصائح أخرى (' + (A.length - 3) + ')', false, ...A.slice(3).map(card)) : null, advDisc()); }
function pathCard() { let P; try { P = FD.path(S); } catch (e) { return null; } if (!P) return null; const st = PSTYLES.find(x => x[0] === pStyle()), v = P.rows.find(r => r.id === 'y5').v, cur = v[0], mult = P.nw > 0 ? cur.show / P.nw : null;
  const el = sect('', h('div', { class: 'pc-h' }, h('span', {}, (st[0] === 'palm' ? '🌴 ' : st[0] === 'road' ? '🛣 ' : '⏳ ') + st[1] + ' · بعد 5 سنوات · ' + yearAt(60)), h('b', {}, pShort(cur.show, P)), mult != null ? h('small', { class: cur.show < P.nw ? 'badc' : 'okc' }, '× ' + mult.toFixed(1) + ' ثروتك اليوم') : null),
    h('div', { class: 'pc-l' }, v.map(x => h('span', {}, SC_ICO[x.id] + ' ' + x.n + ' ' + pShort(x.show, P)))), btn('افتح المسار المالي', () => go('insights', 'path'), 'alt'));
  el.classList.add('pcard', 'hero'); return el; }
function pathScreen(sub) { let P; try { P = FD.path(S); } catch (e) { P = null; } const fromSet = view.p.from === 'set', back = backBtn(() => sub === 'assume' ? go('insights', 'path') : fromSet ? go('more', 'set', { s: 'pathview' }) : go('insights'));
  if (!P) return h('div', {}, back, h('h1', {}, 'المسار المالي المستقبلي'), h('p', { class: 'mut' }, 'سجّل الرصيد الافتتاحي وبعض الدخل والمصروف أولاً.'));
  if (sub === 'assume') return pathAssume(P, back);
  const hz = sub && P.rows.find(r => r.id === sub); if (hz) PV.m = hz.m;
  const st = PSTYLES.find(x => x[0] === pStyle()), body = st[0] === 'road' ? pathRoad(P) : st[0] === 'palm' ? pathPalm(P) : pathDial(P);
  return h('div', { class: 'pathv ps-' + st[0] }, back, h('div', { class: 'hdr' }, h('h1', {}, st[1]), seg([['IQD', 'د.ع'], ['USD', '$']], PV.cur, k => { PV.cur = k; render(); })),
    h('p', { class: 'mut' }, st[0] === 'dial' ? 'أدِر القرص لتختار السنة، فتظهر ثروتك وقصتها.' : st[0] === 'road' ? 'كل محطة على الطريق = ثروتك المتوقعة. انزل لتسافر في الزمن.' : 'حرّك المؤشر وشاهد نخلتك تكبر. كل تمرة هدف تصله.'),
    scenChips(P), body, sect('', pathNote(P), h('div', { class: 'quick' }, btn('الافتراضات', () => go('insights', 'path', { h: 'assume' }), 'alt'), btn('غيّر الشكل', () => go('more', 'set', { s: 'pathview' }), 'alt')))); }
function pathViewPanel() { const cur = pStyle(), box = h('div', { class: 'skins' });
  PSTYLES.forEach(([id, n, d]) => box.append(h('button', { class: 'sk' + (id === cur ? ' on' : ''), 'aria-pressed': id === cur ? 'true' : 'false', 'data-pv': id, onclick: () => { setPStyle(id); toast('شكل المسار: ' + n); go('insights', 'path', { from: 'set' }); } },
    id === cur ? h('span', { class: 'ck' }, '✓') : null, h('div', { class: 'pvp' }, id === 'dial' ? '⏳' : id === 'road' ? '🛣' : '🌴'), h('span', { class: 'sn' }, n + (id === 'dial' ? ' (الافتراضي)' : '')), h('span', { class: 'sd' }, d))));
  return sect('شكل المسار المالي', h('p', { class: 'mut' }, 'الأرقام والحساب واحد في الأشكال الثلاثة، ويتغير العرض فقط. يُحفظ على هذا الجهاز.'), box, btn('افتح المسار المالي', () => go('insights', 'path'), 'alt')); }
function pathAssume(P, back) { const c = P.cfg, gIn = h('input', { inputmode: 'decimal', value: String(c.growth) }), iIn = h('input', { inputmode: 'decimal', value: String(c.infl) });
    const save = (patch, ok) => act(() => { S.x.set.path = { ...FD.pathCfg(S), ...patch }; }, ok);
    const num = (el, k, lo, hi) => () => { const v = Number(L.norm(el.value)); if (!Number.isFinite(v) || v < lo || v > hi) return toast('أدخل رقماً من ' + lo + ' إلى ' + hi, true); save({ [k]: v }, 'حُفظ'); };
    return h('div', {}, back, h('h1', {}, 'الافتراضات'),
      sect('من أين الأرقام', row('صافي الثروة الآن', money(P.nw)), row('متوسط الدخل الشهري', money(P.base.inc)), row('متوسط المصروف الشهري', money(P.base.exp)),
        h('p', { class: 'mut' }, P.base.n ? 'متوسط آخر ' + P.base.n + ' أشهر كاملة' + (P.base.est ? ' (أقل من 3: تقدير أولي)' : '') + '. يتحدّث تلقائياً مع كل شهر جديد.' : 'لا يوجد شهر كامل بعد: الأرقام من توقع هذا الشهر.')),
      sect('السيناريوهات', P.scen.map(x => row(x.n + (x.id === 'up' ? ' (المصروف −15%)' : x.id === 'down' ? ' (الدخل −20%، المصروف +10%)' : ' (كما هو)'), money(x.s) + ' شهرياً', x.s < 0 ? 'bad' : ''))),
      sect('نمو الأصول سنوياً %', h('p', { class: 'mut' }, 'افتراضياً 0%: لا نفترض أرباحاً. إن رفعته يُطبّق على ثروتك وادخارك معاً.'), h('label', { class: 'f' }, h('span', {}, 'النسبة السنوية (−10 إلى 15)'), gIn), btn('احفظ', num(gIn, 'growth', -10, 15), 'alt mini')),
      sect('بأسعار اليوم', h('p', { class: 'mut' }, 'يعرض المبالغ المستقبلية بقيمتها الشرائية اليوم، بخصم التضخم المفترض. مع تضخم 0% لا يتغير شيء.'), h('label', { class: 'f' }, h('span', {}, 'التضخم السنوي المفترض % (0 إلى 30)'), iIn), btn('احفظ', num(iIn, 'infl', 0, 30), 'alt mini'),
        seg([['0', 'بالأرقام الاسمية'], ['1', 'بأسعار اليوم']], c.real ? '1' : '0', k => save({ real: k === '1' }, k === '1' ? 'بأسعار اليوم' : 'بالأرقام الاسمية'))),
      btn('إعادة الافتراضات الافتراضية', () => act(() => { delete S.x.set.path; }, 'أُعيدت'), 'alt')); }
// ===== f1-v4.9 (المرحلة 6): 4 شريط الحدود، 6 الحالات الفارغة، 15 تعديل عملية، 17 بحث وتصفية، 19 شاشة البداية، 23 تذكير التسجيل، 26 الادخار بالأشهر، 27 الراتب والدخل الإضافي، 28 عمر سعر الصرف، 29 المطابقة الشهرية =====
// ---- 6: حالة فارغة واضحة بأيقونة وجملة وزر ----
const emptyState = (ic, t, d, b) => h('div', { class: 'empty' }, h('span', { class: 'eic' }, ic), h('b', {}, t), d ? h('p', {}, d) : null, b ? btn(b[0], b[1], 'alt mini') : null);
// ---- 4: شريط تقدّم حدود المصروف ----
function limitBar(x) { const p = x.limit > 0 ? x.spent / x.limit : 0, cls = x.over ? 'over' : x.near || x.pace ? 'near' : 'okb';
  return h('div', { class: 'lbar ' + cls }, h('div', { class: 'r' }, h('span', {}, x.g), h('b', {}, money(x.spent) + ' / ' + money(x.limit))), h('div', { class: 'lt' }, h('i', { style: 'width:' + Math.min(100, p * 100).toFixed(1) + '%' }), h('u', { style: 'right:' + Math.min(100, (+L.today().slice(8)) / (+L.monthEnd(L.mkey(L.today())).slice(8)) * 100).toFixed(1) + '%' })),
    h('small', { class: x.over ? 'badc' : cls === 'near' ? 'warnc' : 'mut' }, x.over ? 'تجاوزت الحد بـ ' + money(x.spent - x.limit) : x.limit > x.spent ? 'بقي ' + money(x.limit - x.spent) + ' · ' + Math.round(p * 100) + '%' : '')); }
function limitsHome() { let B; try { B = L.budget(S).filter(x => x.limit > 0 && x.spent >= x.limit * 0.5); } catch (e) { return null; } if (!B.length) return null;
  return sect('حدود هذا الشهر', B.map(limitBar), h('p', { class: 'mut' }, 'الخط الرفيع = أين يجب أن تكون حسب أيام الشهر.'), btn('كل الحدود', () => go('more', 'reports', { mode: 'limits' }), 'alt mini')); }
// ---- 28: عمر سعر الصرف ----
function rateAge() { if (!S.x.rates.length) return null; const d = S.x.rates[S.x.rates.length - 1].d, n = Math.max(0, Math.round((Date.parse(L.today()) - Date.parse(d)) / 864e5));
  return h('span', { class: 'chip ' + (n <= 3 ? 'c-cur' : n <= 14 ? 'c-old' : 'c-na rate-bad') }, n === 0 ? 'اليوم' : n === 1 ? 'أمس' : 'منذ ' + n + ' يوماً'); }
// ---- 27: الراتب مقابل الدخل الإضافي ----
function incSplit(from, to) { const o = { salary: 0, other: 0 }; S.tx.filter(t => !t.voided && !t.reverses && t.type === 'income' && t.date >= from && t.date <= to).forEach(t => postsOf(t.id).filter(p => S.acc[p.a].kind === 'income').forEach(p => { if (p.a === 'inc_salary') o.salary -= p.iqd; else o.other -= p.iqd; })); return o; }
const splitRows = (from, to) => { const s = incSplit(from, to), t = s.salary + s.other; if (!t) return null; const pc = v => Math.round(v / t * 100);
  return h('div', { class: 'isplit' }, h('div', { class: 'ib2' }, h('i', { style: 'width:' + pc(s.salary) + '%' })), row('الراتب الأساسي', money(s.salary) + ' · ' + pc(s.salary) + '%'), row('دخل إضافي', money(s.other) + ' · ' + pc(s.other) + '%'),
    s.other === 0 ? h('p', { class: 'mut' }, 'دخلك كله من الراتب: أي توقف فيه يوقف كل شيء.') : null); };
// ---- 26: الادخار بالأشهر نحو هدف الستة أشهر ----
function monthsShield() { const ms = typeof FM !== 'undefined' ? FM.months(S, 4).slice(0, -1).filter(m => m.expense > 0) : [], avg = ms.length ? ms.reduce((a, m) => a + m.expense, 0) / ms.length : 0; if (!avg) return null;
  const sv = FM.savings(S), amt = sv ? sv.amount : E.snap(S).liq, mo = Math.round(amt / avg * 10) / 10;
  return h('div', { class: 'shield' }, h('div', { class: 'r' }, h('span', {}, (sv ? 'مدخراتك «' + sv.name + '»' : 'سيولتك') + ' تكفي'), h('b', {}, mo + ' من 6 أشهر')), h('div', { class: 'lt' }, h('i', { style: 'width:' + Math.min(100, mo / 6 * 100).toFixed(1) + '%' })),
    h('small', { class: 'mut' }, mo >= 6 ? '✓ درع الطوارئ مكتمل: ما يزيد يذهب لأهدافك.' : 'ينقصك ' + money(Math.round((6 - mo) * avg)) + ' لتكتمل 6 أشهر (متوسط مصروفك ' + money(Math.round(avg)) + ').')); }
// ---- 23: تذكير داخل التطبيق إن لم تسجّل منذ 3 أيام ----
const NUDGE = 'flousi-nudge';
function nudgeBanner() { if (!S.x.openDate) return null; const ds = S.tx.filter(t => !['opening', 'opening_fix', 'reversal'].includes(t.type) && !t.voided).map(t => t.date).sort(), last = ds.length ? ds[ds.length - 1] : S.x.openDate;
  const n = Math.round((Date.parse(L.today()) - Date.parse(last)) / 864e5); let off = null; try { off = localStorage.getItem(NUDGE); } catch (e) {} if (n < 3 || off === L.today()) return null;
  return h('div', { class: 'ticker warn nudge' }, h('span', {}, '✍ لم تسجّل شيئاً منذ ' + n + ' أيام. ما صرفته وتنساه يضيع من الحساب.'), h('div', { class: 'quick' }, btn('سجّل الآن', () => go('ops', null, { kind: 'expense' }), 'mini'), btn('لاحقاً', () => { try { localStorage.setItem(NUDGE, L.today()); } catch (e) {} render(); }, 'mini alt'))); }
// ---- 29: المطابقة الشهرية ----
const reconKey = () => { const t = L.today(), d = +t.slice(8); return d >= 25 ? L.mkey(t) : d <= 3 ? L.prevMonth(L.mkey(t)) : null; };
function reconBanner() { if (!S.x.openDate) return null; const k = reconKey(); if (!k || (S.x.reconDone || {})[k]) return null;
  return h('div', { class: 'ticker nudge', onclick: () => go('more', 'monthrecon') }, '🧮 مطابقة آخر الشهر: عدّ نقدك وتأكد أن أرصدتك في التطبيق مطابقة. دقيقة واحدة ›'); }
MORE.push(['monthrecon', 'المطابقة الشهرية', () => { const A = userAccts(a => a.kind === 'asset' && a.liquid), k = reconKey() || L.mkey(L.today()), done = (S.x.reconDone || {})[k], ins = {};
  if (!A.length) return emptyState('🧮', 'لا حسابات سائلة', 'أنشئ حساباً من «أموالي» أولاً.');
  const rows = A.map(a => { const b = E.bal(S, a.id); if (a.cur === 'USD') return h('div', { class: 'tx' }, row(a.name, L.fmtUsd(b)), h('small', { class: 'mut' }, 'حساب الدولار: صحّحه بتحويل أو مصروف إن اختلف.'));
    ins[a.id] = h('input', { inputmode: 'numeric', placeholder: 'المسجّل: ' + L.fmt(b) }); return h('div', { class: 'tx' }, row(a.name, money(b)), h('label', { class: 'f' }, h('span', {}, 'الموجود فعلاً (اتركه فارغاً إن كان مطابقاً)'), ins[a.id])); });
  const mark = () => { S.x.reconDone = { ...(S.x.reconDone || {}), [k]: L.today() }; };
  return h('div', {}, h('p', { class: 'mut' }, 'شهر ' + k + (done ? ' · طوبق في ' + done + ' ✓' : '') + '. اكتب الموجود فعلاً فقط حيث يختلف؛ يُسجَّل الفرق «مطابقة» لا دخلاً ولا مصروفاً.'), sect('', ...rows),
    btn('طابق وسجّل الفروق', () => { let n = 0; act(() => { Object.entries(ins).forEach(([id, el]) => { if (!el.value.trim()) return; const c = L.parseAmount(el.value, 0); if (c !== E.bal(S, id)) { L.reconcile(S, { date: L.today(), acct: id, counted: c }); n++; } }); mark(); }, 'تمت المطابقة').then(() => { toast(n ? 'سُجّل ' + n + ' فرق' : 'كل الأرصدة مطابقة ✓'); go('home'); }); }, 'prim'),
    btn('كلها مطابقة ✓', () => act(mark, 'كل الأرصدة مطابقة ✓').then(() => go('home')), 'alt')); }]);
// ---- 17: بحث وتصفية العمليات + 15: زر التعديل ----
const TXF = { q: '', t: 'all', per: 'm' };
const ndig = s => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬,]/g, '').toLowerCase();
const editable = r => r && !r.voided && !r.reverses && ['expense', 'income', 'transfer'].includes(r.type) && !(r.meta && r.meta.stock);
function txRow(t, r) { return h('div', { class: 'tx' + (t.voided || t.reversal ? ' void' : '') },
  h('div', { class: 'r' }, h('span', {}, h('span', { class: 'cat' }, catIco(t.label)), t.date + ' · ' + t.label), h('b', {}, money(t.amount) + (t.usd ? ' (' + L.fmtUsd(t.usd) + ')' : ''))),
  h('div', { class: 'mut' }, (t.from ? t.from + ' ← ' : '') + t.to + (t.note ? ' — ' + t.note : '') + (t.voided ? ' (معكوسة)' : '')),
  (!t.voided && !t.reversal && t.label !== 'رصيد افتتاحي' && t.label !== 'تصحيح افتتاحي') ? h('div', { class: 'quick' }, editable(r) ? btn('تعديل', () => go('ops', 'edit', { id: t.id }), 'mini alt') : null,
    btn('تراجع', () => { if (confirm('عكس هذه العملية؟ تبقى ظاهرة في السجل.')) act(() => { const o = S.tx.find(x => x.id === t.id); L.undo(S, t.id, L.today() > o.date ? L.today() : o.date); }, 'عُكست العملية'); }, 'mini')) : null); }
function txList2() { const all = L.listTx(S), raw = new Map(S.tx.map(t => [t.id, t])), list = h('div', {}), sum = h('p', { class: 'mut' });
  if (!all.filter(t => t.label !== 'رصيد افتتاحي').length) return sect('العمليات', emptyState('🧾', 'لا عمليات بعد', 'سجّل أول مصروف من الأعلى، وستظهر عملياتك هنا مع البحث والتصفية.'));
  const q = h('input', { type: 'search', placeholder: '🔍 ابحث: ملاحظة، مبلغ، فئة، حساب', value: TXF.q, autocomplete: 'off', 'aria-label': 'بحث في العمليات' });
  const draw = () => { const m = L.mkey(L.today()), pm = L.prevMonth(m), w = ndig(TXF.q).trim().split(/\s+/).filter(Boolean);
    const xs = all.filter(t => { const r = raw.get(t.id), ty = r.type; if (TXF.t !== 'all' && !(TXF.t === 'transfer' ? ['transfer', 'convert'].includes(ty) : TXF.t === 'other' ? !['expense', 'income', 'transfer', 'convert'].includes(ty) : ty === TXF.t)) return false;
      if (TXF.per === 'm' && t.date.slice(0, 7) !== m) return false; if (TXF.per === 'pm' && t.date.slice(0, 7) !== pm) return false;
      if (w.length) { const hay = ndig([t.label, t.note, t.from, t.to, t.date, t.amount, L.fmt(t.amount)].join(' ')); return w.every(x => hay.includes(x)); } return true; });
    const live = xs.filter(t => !t.voided && !t.reversal), tot = live.reduce((a, t) => a + t.amount, 0);
    sum.textContent = xs.length + ' عملية' + (TXF.t !== 'all' && live.length ? ' · المجموع ' + money(tot) : '') + (xs.length > 200 ? ' · يُعرض أحدث 200' : '');
    list.replaceChildren(...(xs.length ? xs.slice(0, 200).map(t => txRow(t, raw.get(t.id))) : [emptyState('🔎', 'لا نتائج', 'غيّر كلمة البحث أو الفترة.')])); };
  q.oninput = () => { TXF.q = q.value; draw(); }; draw();
  return sect('العمليات', h('div', { class: 'sq' }, q), seg([['all', 'الكل'], ['expense', 'مصروف'], ['income', 'دخل'], ['transfer', 'تحويل'], ['other', 'أخرى']], TXF.t, k => { TXF.t = k; render(); }),
    seg([['m', 'هذا الشهر'], ['pm', 'الشهر الماضي'], ['all', 'كل الفترات']], TXF.per, k => { TXF.per = k; render(); }), sum, list); }
// ---- 15: تعديل عملية = عكس الأصل (يبقى ظاهراً في السجل) + قيد جديد صحيح، في خطوة واحدة ----
function editScreen(id) { const r = S.tx.find(x => x.id === id), back = backBtn(() => go('ops'));
  if (!editable(r)) return h('div', {}, back, h('h1', {}, 'تعديل عملية'), h('p', { class: 'mut' }, 'لا يمكن تعديل هذه العملية. استعمل «تراجع» ثم سجّلها من جديد.'));
  const ps = S.post.filter(p => p.tx === id), A = accOpts(), isUsd = a => a && S.acc[a] && S.acc[a].cur === 'USD', nat = (a, n) => isUsd(a) ? (Math.abs(n) / 100).toFixed(2) : String(Math.abs(n));
  const D = { k: 'date', l: 'التاريخ', t: 'date', v: r.date, req: true }, N = { k: 'note', l: 'ملاحظة', t: 'text', v: r.note || '' };
  const save = (fn, extra) => { if (!confirm('حفظ التعديل؟ تُعكس العملية القديمة (تبقى ظاهرة في السجل) وتُسجَّل الجديدة.')) return;
    return act(() => { const o = S.tx.find(x => x.id === id); L.undo(S, id, L.today() > o.date ? L.today() : o.date); const nid = fn(); if (r.meta && r.meta.pyf) S.tx.find(x => x.id === nid).meta = { pyf: 1 }; return nid; }, 'عُدّلت العملية').then(x => { if (x) go('ops'); }); };
  const rt = (a, v) => isUsd(a) ? L.parseAmount(v.rate, 2) : null, amt = (a, v) => L.parseAmount(v.amount, isUsd(a) ? 2 : 0);
  let form;
  if (r.type === 'expense') { const c = ps.find(p => S.acc[p.a].kind === 'expense'), a = ps.find(p => S.acc[p.a].kind === 'asset');
    form = buildForm([D, { k: 'acct', l: 'يُصرف من', t: 'select', opts: A, v: a.a }, { k: 'amount', l: 'المبلغ', t: 'num', req: true, v: nat(a.a, a.n) }, { k: 'cat', l: 'الفئة', t: 'select', opts: L.CATS.map(x => [x[0], x[1]]), v: c.a },
      { ...rateDyn('date', v => isUsd(v.acct)), v: a.rate ? String(a.rate / 100) : undefined }, N], v => save(() => L.expense(S, { date: v.date, acct: v.acct, cat: v.cat, amount: amt(v.acct, v), r: rt(v.acct, v), note: v.note })), 'احفظ التعديل'); }
  else if (r.type === 'income') { const c = ps.find(p => S.acc[p.a].kind === 'income'), a = ps.find(p => S.acc[p.a].kind === 'asset');
    form = buildForm([D, { k: 'acct', l: 'يدخل إلى', t: 'select', opts: A, v: a.a }, { k: 'src', l: 'المصدر', t: 'select', opts: [['inc_salary', 'الراتب'], ['inc_other', 'دخل آخر']], v: c.a }, { k: 'amount', l: 'المبلغ', t: 'num', req: true, v: nat(a.a, a.n) },
      { ...rateDyn('date', v => isUsd(v.acct)), v: a.rate ? String(a.rate / 100) : undefined }, N], v => save(() => L.income(S, { date: v.date, acct: v.acct, src: v.src, amount: amt(v.acct, v), r: rt(v.acct, v), note: v.note })), 'احفظ التعديل'); }
  else { const f = ps.find(p => p.n < 0), t = ps.find(p => p.n > 0); if (!f || !t || S.acc[f.a].cur !== 'IQD' || S.acc[t.a].cur !== 'IQD') return h('div', {}, back, h('h1', {}, 'تعديل عملية'), h('p', { class: 'mut' }, 'تعديل التحويل متاح بين حسابين بالدينار فقط. استعمل «تراجع» ثم سجّله من جديد.'));
    const IQ = accOpts(a => a.cur === 'IQD'); form = buildForm([D, { k: 'from', l: 'من', t: 'select', opts: IQ, v: f.a }, { k: 'to', l: 'إلى', t: 'select', opts: IQ, v: t.a }, { k: 'amount', l: 'المبلغ', t: 'num', req: true, v: String(t.n) }, N],
      v => save(() => L.transfer(S, { date: v.date, from: v.from, to: v.to, amount: L.parseAmount(v.amount, 0), note: v.note })), 'احفظ التعديل'); }
  const d = L.listTx(S).find(x => x.id === id);
  return h('div', {}, back, h('h1', {}, 'تعديل عملية'), sect('الأصل', row(d.date + ' · ' + d.label, money(d.amount)), h('p', { class: 'mut' }, (d.from ? d.from + ' ← ' : '') + d.to + (d.note ? ' — ' + d.note : ''))),
    h('p', { class: 'mut' }, 'التعديل لا يمحو شيئاً: تُعكس العملية القديمة وتبقى في السجل للأمانة، وتُسجَّل الصحيحة مكانها.'), sect('', form)); }
// ---- 19: شاشة البداية ----
function startPanel() { const cur = S.x.set.start || 'home';
  return sect('شاشة البداية', h('p', { class: 'mut' }, 'الشاشة التي يفتح عليها التطبيق.'), seg(TABS.filter(([k]) => fOn(k)).map(([k, t]) => [k, t]), cur, k => act(() => { S.x.set.start = k === 'home' ? undefined : k; if (!S.x.set.start) delete S.x.set.start; }, 'حُفظت شاشة البداية'))); }
// ===== f1-v4.10 (ب): قائمة الرغبات وقاعدة 24 ساعة، يوم الراتب، الفئة التلقائية من الملاحظة =====
// ---- قائمة الرغبات: تؤجّل الشراء يوماً، ثم تسأل «ما زلت تريده؟». ما تتراجع عنه يُجمع في «وفّرت بالتريث» ----
const WAIT_MS = 24 * 3600e3, wishes = () => (S.x.wish || []);
const wishReady = () => wishes().filter(w => !w.done && Date.now() - w.t >= WAIT_MS);
const wishSaved = () => wishes().filter(w => w.done === 'skip').reduce((a, w) => a + w.amount, 0);
const addWish = (name, amount, type) => act(() => { if (!String(name || '').trim()) throw new Error('اكتب اسم الشيء'); if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('اكتب مبلغاً موجباً');
  S.x.wish = wishes().concat([{ id: 'w' + Date.now().toString(36), name: String(name).trim(), amount, type: type || null, t: Date.now(), done: null, at: null }]); }, 'أُضيف إلى قائمة الرغبات. سأسألك بعد 24 ساعة');
const wishSet = (id, v) => act(() => { S.x.wish = wishes().map(w => w.id === id ? { ...w, done: v, at: L.today() } : w); }, v === 'skip' ? 'أحسنت: وفّرت بالتريث' : v === 'buy' ? 'سجّل المصروف الآن' : 'حُذف');
const leftTxt = ms => { const h2 = Math.ceil(ms / 3600e3); return h2 >= 1 ? 'يُسأل بعد ' + h2 + ' ساعة' : 'يُسأل بعد دقائق'; };
function wishBanner() { const r = wishReady(); if (!r.length) return null;
  return h('div', { class: 'ticker nudge', onclick: () => go('more', 'wish') }, '🛍 مرّ يوم على «' + r[0].name + '» (' + money(r[0].amount) + '). ما زلت تريده؟' + (r.length > 1 ? ' و' + (r.length - 1) + ' غيره' : '') + ' ›'); }
MORE.push(['wish', 'قائمة الرغبات', () => { const W = wishes(), pend = W.filter(w => !w.done), ready = pend.filter(w => Date.now() - w.t >= WAIT_MS), wait = pend.filter(w => Date.now() - w.t < WAIT_MS), past = W.filter(w => w.done).slice(-10).reverse(), sv = wishSaved();
  const buy = w => { QX.amt = String(w.amount); QX.note = w.name; QX.picked = false; wishSet(w.id, 'buy').then(() => go('ops', null, { kind: 'expense' })); };
  const f = buildForm([{ k: 'name', l: 'ماذا تريد أن تشتري؟', t: 'text', req: true }, { k: 'amount', l: 'سعره (د.ع)', t: 'num', req: true }], v => addWish(v.name, L.parseAmount(v.amount, 0)), 'انتظر يوماً');
  return h('div', {}, sect('', h('div', { class: 'wsave' }, h('span', {}, '🧘 وفّرت بالتريث'), h('b', {}, money(sv))), h('p', { class: 'mut' }, 'قاعدة الـ24 ساعة: أغلب الرغبات تبرد خلال يوم. اكتب ما تريده، وسأسألك غداً إن كنت ما زلت تريده.')),
    ready.length ? sect('حان وقت القرار', ready.map(w => h('div', { class: 'wish rdy' }, row(w.name, money(w.amount)), h('p', { class: 'mut' }, 'ما زلت تريده بعد يوم كامل؟'),
      h('div', { class: 'quick' }, btn('نعم، سأشتريه', () => buy(w), 'mini'), btn('لا، تراجعت', () => wishSet(w.id, 'skip'), 'mini alt'))))) : null,
    wait.length ? sect('في الانتظار', wait.map(w => h('div', { class: 'wish' }, row(w.name, money(w.amount)), h('div', { class: 'r' }, h('small', { class: 'mut' }, '⏳ ' + leftTxt(WAIT_MS - (Date.now() - w.t))), btn('احذف', () => wishSet(w.id, 'del'), 'mini alt'))))) : null,
    !pend.length ? emptyState('🛍', 'لا رغبات منتظرة', 'قبل أي شراء غير ضروري أضفه هنا، أو اضغط «انتظر يوماً» في «هل أشتري؟».') : null,
    sect('رغبة جديدة', f), past.length ? sect('القرارات السابقة', past.filter(w => w.done !== 'del').map(w => row(w.name + ' · ' + (w.done === 'skip' ? 'تراجعت ✓' : 'اشتريت'), money(w.amount), w.done === 'skip' ? 'okc' : ''))) : null); }]);
// ---- يوم الراتب: ادفع لنفسك أولاً ← أقساط الأهداف ← الفواتير الثابتة ← ورقة الراتب ----
function pyfDone() { const p = view.p; if (p.flow) go('more', 'payday', { salary: p.salary, acct: p.acct, date: p.date, step: 2 }); else go('home'); }
const pdSteps = n => h('div', { class: 'pdsteps' }, ['ادّخر', 'الأهداف', 'الفواتير', 'الخلاصة'].map((t, i) => h('span', { class: i + 1 < n ? 'done' : i + 1 === n ? 'on' : '' }, (i + 1 < n ? '✓ ' : (i + 1) + ' ') + t)));
function paydaySheet(sal, d) { const m = L.mkey(d), from = m + '-01', to = L.monthEnd(m), live = S.tx.filter(t => !t.voided && !t.reverses && t.date >= from && t.date <= to);
  const saved = live.filter(t => t.meta && t.meta.pyf).reduce((a, t) => a + postsOf(t.id).filter(p => p.iqd > 0).reduce((x, p) => x + p.iqd, 0), 0) + S.goals.filter(g => g.pyf && g.date >= from && g.date <= to).reduce((a, g) => a + g.amount, 0);
  const goals = S.goals.filter(g => !g.pyf && g.date && g.date >= from && g.date <= to).reduce((a, g) => a + g.amount, 0);
  const names = new Set(S.x.recur.filter(r => r.kind === 'expense').map(r => r.name)), bills = live.filter(t => t.type === 'expense' && names.has(t.note)).reduce((a, t) => a + postsOf(t.id).filter(p => S.acc[p.a].kind === 'expense').reduce((x, p) => x + p.iqd, 0), 0);
  const free = sal - saved - goals - bills, days = FD.daysLeft(L.today()); return { saved, goals, bills, free, days, perDay: free > 0 ? Math.floor(free / days) : 0 }; }
MORE.push(['payday', 'يوم الراتب', () => { const p = view.p, sal = p.salary, d = p.date || L.today(), step = p.step || 2, nx = n => go('more', 'payday', { ...p, step: n });
  if (!sal) return emptyState('💰', 'يوم الراتب', 'يبدأ تلقائياً بعد تسجيل راتبك.');
  if (step === 2) { const G = L.goalView(S).filter(g => !g.done && g.cur !== 'USD' && g.monthly > g.paidMonth), sel = {};
    return h('div', {}, pdSteps(2), sect('أقساط أهدافك هذا الشهر', G.length ? G.map(g => { const a = Math.max(0, g.monthly - g.paidMonth), cb = h('input', { type: 'checkbox', checked: true, class: 'pdc' }); sel[g.id] = [cb, a];
        return h('label', { class: 'pdrow' }, cb, h('span', {}, g.name + (g.id === S.x.set.savingsGoal ? ' (المدخرات)' : '')), h('b', {}, money(a))); }) : emptyState('🎯', 'لا أقساط مستحقة', 'أهدافك مغطاة هذا الشهر، أو لا توجد أهداف بالدينار.'),
      G.length ? btn('خصّص المحدد', () => { let n = 0; act(() => { Object.entries(sel).forEach(([id, [cb, a]]) => { if (cb.checked && a > 0) { L.goalMove(S, { id, amount: a, date: d }); n++; } }); return true; }, 'خُصّص لـ ' + Object.values(sel).filter(([cb]) => cb.checked).length + ' هدف').then(r => { if (r) nx(3); }); }, 'prim') : null,
      btn(G.length ? 'تخطَّ' : 'التالي', () => nx(3), 'alt'))); }
  if (step === 3) { const m = L.mkey(d), R = S.x.recur.filter(r => r.active && r.kind === 'expense' && r.last !== m), sel = {};
    return h('div', {}, pdSteps(3), sect('فواتيرك الثابتة هذا الشهر', R.length ? R.map(r => { const cb = h('input', { type: 'checkbox', checked: true, class: 'pdc' }); sel[r.id] = cb;
        return h('label', { class: 'pdrow' }, cb, h('span', {}, r.name + ' · يوم ' + r.day), h('b', {}, money(r.amount))); }) : emptyState('🧾', 'لا فواتير منتظرة', 'كل بنودك المتكررة مسجّلة لهذا الشهر.'),
      R.length ? h('p', { class: 'mut' }, 'سجّل ما دفعته فعلاً اليوم فقط؛ الباقي يبقى تذكيراً في موعده.') : null,
      R.length ? btn('سجّل المحدد كمدفوع', () => act(() => { R.forEach(r => { if (sel[r.id].checked) L.recurConfirm(S, { id: r.id, date: L.today() < d ? d : L.today(), amount: r.amount }); }); return true; }, 'سُجّلت الفواتير').then(r => { if (r) nx(4); }), 'prim') : null,
      btn(R.length ? 'تخطَّ' : 'التالي', () => nx(4), 'alt'))); }
  const x = paydaySheet(sal, d), parts = [['ادّخرت', x.saved, 'var(--ok)'], ['أهداف', x.goals, 'var(--acc)'], ['فواتير', x.bills, 'var(--wait)'], ['حرّ للصرف', Math.max(0, x.free), 'var(--mute)']];
  return h('div', {}, pdSteps(5), sect('', h('div', { class: 'pdsheet' }, h('small', {}, 'ورقة الراتب · ' + nWhen(d)), h('b', {}, money(sal)),
      h('div', { class: 'pdbar' }, parts.map(([, v, c]) => h('i', { style: 'width:' + (sal > 0 ? Math.max(0, v) / sal * 100 : 0).toFixed(1) + '%;background:' + c }))),
      parts.map(([t, v, c]) => row(h('span', {}, h('i', { class: 'dotc', style: 'background:' + c }), t), money(v) + (sal > 0 ? ' · ' + Math.round(v / sal * 100) + '%' : ''))),
      x.free < 0 ? h('p', { class: 'badc' }, 'ما خصّصته أكبر من الراتب بـ ' + money(-x.free) + ': الفرق خرج من رصيدك السابق.') : h('p', { class: 'okc' }, 'الحرّ للصرف ' + money(x.free) + ' ≈ ' + money(x.perDay) + ' يومياً حتى آخر الشهر.'))),
    h('p', { class: 'mut' }, 'كل دينار من راتبك صار له مكان. التحويلات والتخصيصات مسجّلة في التطبيق فقط؛ انقل المال الحقيقي بنفسك.'), btn('إلى الرئيسية', () => go('home'), 'prim')); }]);
// ---- الفئة التلقائية من الملاحظة: من سجلّك أولاً (الأكثر تكراراً لهذه الكلمة)، ثم قاموس كلمات عراقية شائعة ----
const CAT_WORDS = { c_food: ['صمون', 'خبز', 'مطعم', 'غداء', 'عشاء', 'فطور', 'سوق', 'خضرة', 'فواكه', 'لحم', 'دجاج', 'مسواك', 'كص', 'فلافل', 'بيتزا', 'برغر', 'أكل', 'اكل'], c_trans: ['تكسي', 'تاكسي', 'بنزين', 'وقود', 'كروة', 'باص', 'كيا', 'تصليح', 'غسيل سيارة', 'كراج', 'اوبر', 'كريم'],
  c_comm: ['كارت', 'رصيد', 'انترنت', 'إنترنت', 'اشتراك', 'زين', 'آسيا', 'اسيا', 'كورك'], c_bills: ['كهرباء', 'مولدة', 'ماء', 'غاز', 'قنينة', 'نفط', 'ايجار', 'إيجار'], c_health: ['دواء', 'صيدلية', 'طبيب', 'دكتور', 'تحليل', 'مستشفى', 'عيادة', 'أشعة', 'اسنان'],
  c_cloth: ['ملابس', 'حذاء', 'قميص', 'بنطرون', 'جاكيت', 'دشداشة'], c_gift: ['هدية', 'عرس', 'عيدية', 'تعزية', 'مناسبة', 'نقوط'], c_edu: ['كتاب', 'دورة', 'كورس', 'قرطاسية', 'مدرسة', 'جامعة'], c_ent: ['قهوة', 'كافيه', 'سينما', 'نزهة', 'ألعاب', 'العاب', 'شيشة', 'نركيلة'], c_home: ['أثاث', 'اثاث', 'منظفات', 'أدوات', 'تصليح بيت'] };
const ntext = s => String(s || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
function guessCat(note) { const n = ntext(note); if (n.length < 2) return null; const c = {}; expTx(365).forEach(x => { const xn = ntext(x.note); if (xn && (xn === n || (n.length >= 3 && xn.startsWith(n)))) c[x.cat] = (c[x.cat] || 0) + 1; });
  const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; if (best) return { cat: best[0], from: 'h' };
  for (const [cat, ws] of Object.entries(CAT_WORDS)) if (S.acc[cat] && ws.some(w => n.includes(ntext(w)))) return { cat, from: 'w' }; return null; }
// ===== f1-v4.10 (ج): مواسم العراق، بطاقة الشهر، الإنجازات، الحركة الموحّدة =====
const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const REDUCED = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
// ---- 4: الموسم القادم ----
function seasonCard() { let X; try { X = FD.seasons(S); } catch (e) { return null; } const x = X.find(e => LS.get('flousi-season-' + e.id) !== 'off'); if (!x) return null;
  const has = S.x.goalsDef.some(g => g.name === x.n + ' ' + x.d.slice(0, 4));
  const el = sect('', h('div', { class: 'seah' }, h('span', { class: 'seai' }, x.ic), h('div', {}, h('b', {}, x.n + ' بعد ' + x.days + ' يوماً'), h('small', {}, nWhen(x.d) + (x.k === 's' ? ' تقريباً' : ' (تقريباً، حسب رؤية الهلال)')))),
    x.last ? row('في ' + x.n + ' الماضي صرفت', money(x.last.v) + (x.last.extra ? ' (+' + L.fmt(x.last.extra) + ' فوق عادتك)' : '')) : row('تقدير مصروفه الإضافي', money(x.est)),
    h('p', { class: 'okc' }, 'جنّب ' + money(x.weekly) + ' أسبوعياً من الآن، فيأتي ' + x.n + ' ومصروفه جاهز ولا يمسّ شهرك.'),
    h('div', { class: 'quick' }, has ? btn('هدفه موجود', () => go('more', 'goals'), 'mini alt') : btn('اجعله هدفاً', () => act(() => { const id = L.goalNew(S, { name: x.n + ' ' + x.d.slice(0, 4), cur: 'IQD', target: Math.ceil(x.est / 1000) * 1000, targetDate: x.d, priority: 2, kind: 'short' }); return id; }, 'أُضيف هدف «' + x.n + '»').then(r => { if (r) go('more', 'goals'); }), 'mini'),
      btn('إخفاء', () => { LS.set('flousi-season-' + x.id, 'off'); render(); }, 'mini alt')));
  el.classList.add('season'); return el; }
// ---- 5: بطاقة الشهر ----
const MNAMES = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'], mName = k => MNAMES[+k.slice(5) - 1] + ' ' + k.slice(0, 4);
function wrapBanner() { if (!S.x.openDate || +L.today().slice(8) > 7) return null; const k = L.prevMonth(L.mkey(L.today())); if (L.monthEnd(k) < S.x.openDate || LS.get('flousi-wrap-' + k)) return null;
  return h('div', { class: 'ticker nudge wrapb', onclick: () => go('insights', 'wrap', { k }) }, '🎴 بطاقة شهرك (' + mName(k) + ') جاهزة ›'); }
function wrapScreen(k0) { const ks = monthsList().filter(k => k < L.mkey(L.today()) && L.monthEnd(k) >= S.x.openDate), k = k0 && ks.includes(k0) ? k0 : ks[0], back = backBtn(() => go('insights'));
  if (!k) return h('div', {}, back, h('h1', {}, 'بطاقة الشهر'), emptyState('🎴', 'لا شهر مكتمل بعد', 'تظهر بطاقة شهرك في أول الشهر القادم.'));
  LS.set('flousi-wrap-' + k, '1'); const c = FD.monthCard(S, k), rate = c.rate;
  const card = h('div', { class: 'wrapc' }, h('small', {}, 'شهرك في فلوسي'), h('h2', {}, mName(k)),
    h('div', { class: 'wrbig' }, rate == null ? '—' : (rate >= 0 ? 'ادّخرت ' : 'عجز ') + Math.abs(rate) + '%'), h('p', {}, rate == null ? 'لا دخل مسجّل في هذا الشهر.' : rate >= 20 ? 'شهر من شهور بناة الثروة 💎' : rate >= 10 ? 'شهر متوازن 👍' : rate >= 0 ? 'شهر ضيّق: الشهر القادم أفضل' : 'صرفت أكثر من دخلك'),
    h('div', { class: 'wgrid' }, h('div', {}, h('small', {}, 'الدخل'), h('b', {}, pShortI(c.income))), h('div', {}, h('small', {}, 'المصروف'), h('b', {}, pShortI(c.expense))), h('div', {}, h('small', {}, 'الوفر'), h('b', {}, pShortI(c.savings))),
      c.top ? h('div', {}, h('small', {}, 'أكبر فئة'), h('b', {}, c.top.n + ' ' + c.top.p + '%')) : null, c.bigDay ? h('div', {}, h('small', {}, 'أغلى يوم'), h('b', {}, nWhen(c.bigDay.d))) : null, h('div', {}, h('small', {}, 'أيام بلا صرف'), h('b', {}, c.calm + ' من ' + c.days))),
    c.diff != null ? h('p', { class: 'wcmp' }, 'مصروفك ' + (c.diff > 0 ? 'أعلى' : c.diff < 0 ? 'أقل' : 'مثل') + ' الشهر الماضي' + (c.diff ? ' بـ ' + Math.abs(c.diff) + '%' : '') + (c.diff < 0 ? ' 👏' : '')) : null, h('small', { class: 'wft' }, 'فلوسي · سجّلت في ' + c.logged + ' يوماً'));
  return h('div', {}, back, h('h1', {}, 'بطاقة الشهر'), ks.length > 1 ? h('label', { class: 'f' }, h('span', {}, 'الشهر'), h('select', { onchange: e => go('insights', 'wrap', { k: e.target.value }) }, ks.map(m => h('option', { value: m, selected: m === k }, mName(m))))) : null,
    card, btn('📷 احفظها صورة', () => wrapImage(c), 'prim'), h('p', { class: 'mut' }, 'تُحفظ في هاتفك أو تشاركها من ورقة المشاركة. لا تُرسل إلى أي مكان.')); }
const pShortI = n => { const a = Math.abs(n), t = x => String(+x); return (n < 0 ? '−' : '') + (a >= 1e6 ? t((a / 1e6).toFixed(1)) + ' مليون' : Math.round(a / 1e3) + ' ألف'); };
async function wrapImage(c) { try { const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), sk = FTheme.SKINS[FTheme.pick(FTheme.cfg())], dark = FTheme.resolve(FTheme.get()) === 'dark', P = sk[dark ? 'D' : 'L'];
    const m = P[1].match(/#[0-9a-fA-F]{6}/g), cols = m && m.length >= 2 ? m : ['#10202A', '#1D4A40'], gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1] || cols[0]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const ink = '#FFF8E6', acc = '#F0D78C', T = (t, y, sz, col, w) => { g.font = (w || 700) + ' ' + sz + 'px "Geeza Pro","SF Arabic",system-ui,sans-serif'; g.fillStyle = col || ink; g.textAlign = 'center'; g.direction = 'rtl'; g.fillText(t, W / 2, y); };
    g.globalAlpha = .12; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(W * .85, H * .12, 120 + i * 60, 0, 7); g.strokeStyle = acc; g.lineWidth = 3; g.stroke(); } g.globalAlpha = 1;
    T('شهرك في فلوسي', 150, 44, acc); T(mName(c.k), 240, 72); T(c.rate == null ? '—' : (c.rate >= 0 ? 'ادّخرت ' : 'عجز ') + Math.abs(c.rate) + '%', 440, 150, acc, 800);
    T(c.rate == null ? '' : c.rate >= 20 ? 'شهر من شهور بناة الثروة' : c.rate >= 10 ? 'شهر متوازن' : c.rate >= 0 ? 'شهر ضيّق' : 'صرفت أكثر من دخلك', 530, 44, ink, 600);
    const cells = [['الدخل', pShortI(c.income)], ['المصروف', pShortI(c.expense)], ['الوفر', pShortI(c.savings)], ['أكبر فئة', c.top ? c.top.n + ' ' + c.top.p + '%' : '—'], ['أغلى يوم', c.bigDay ? nWhen(c.bigDay.d) : '—'], ['أيام بلا صرف', c.calm + ' من ' + c.days]];
    cells.forEach(([a, b], i) => { const x = i % 2 ? W * .27 : W * .73, y = 680 + Math.floor(i / 2) * 170; g.globalAlpha = .14; g.fillStyle = '#fff'; g.beginPath(); g.roundRect ? g.roundRect(x - 230, y - 80, 460, 140, 30) : g.rect(x - 230, y - 80, 460, 140); g.fill(); g.globalAlpha = 1;
      g.textAlign = 'center'; g.direction = 'rtl'; g.font = '600 34px "Geeza Pro",system-ui'; g.fillStyle = acc; g.fillText(a, x, y - 20); g.font = '800 46px "Geeza Pro",system-ui'; g.fillStyle = ink; g.fillText(b, x, y + 38); });
    if (c.diff != null) T('مصروفك ' + (c.diff > 0 ? 'أعلى' : c.diff < 0 ? 'أقل' : 'مثل') + ' الشهر الماضي' + (c.diff ? ' بـ ' + Math.abs(c.diff) + '%' : ''), 1210, 40, ink, 600); T('فلوسي', 1300, 34, acc);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png')); await shareFile(new File([blob], 'flousi-' + c.k + '.png', { type: 'image/png' })); } catch (e) { toast('تعذّر إنشاء الصورة: ' + (e.message || e), true); } }
// ---- 6: الإنجازات (تُحسب من بياناتك؛ تاريخ أول ظهور يُحفظ على هذا الجهاز) ----
const BKEY = 'flousi-badges';
const streak = () => { const ds = new Set(S.tx.filter(t => !t.voided && !t.reverses && !['opening', 'opening_fix'].includes(t.type)).map(t => t.date)); let d = L.today(); if (!ds.has(d)) d = L.iso(new Date(Date.parse(d) - 864e5)); let n = 0; while (ds.has(d)) { n++; d = L.iso(new Date(Date.parse(d) - 864e5)); } return n; };
const BADGES = [['first', '✍', 'البداية', 'سجّلت أول مصروف', () => S.tx.some(t => t.type === 'expense' && !t.voided)], ['streak7', '🔥', '7 أيام متتالية', 'سجّلت شيئاً كل يوم أسبوعاً كاملاً', () => streak() >= 7], ['streak30', '🔥', 'شهر بلا انقطاع', 'سجّلت كل يوم 30 يوماً', () => streak() >= 30],
  ['nw10', '🎯', 'أول 10 ملايين', 'صافي ثروتك تجاوز 10 ملايين', () => L.panel(S).nw >= 1e7], ['nw50', '🌴', '50 مليوناً', 'صافي ثروتك تجاوز 50 مليوناً', () => L.panel(S).nw >= 5e7], ['nw100', '🏆', '100 مليون', 'صافي ثروتك تجاوز 100 مليون', () => L.panel(S).nw >= 1e8],
  ['shield', '🛡', 'درع الطوارئ', 'مدخراتك تكفي 6 أشهر من مصروفك', () => { const ms = FM.months(S, 4).slice(0, -1).filter(m => m.expense > 0), avg = ms.length ? ms.reduce((a, m) => a + m.expense, 0) / ms.length : 0, sv = FM.savings(S); return avg > 0 && (sv ? sv.amount : E.snap(S).liq) >= avg * 6; }],
  ['saver20', '💎', 'بانٍ للثروة', 'ادّخرت 20% فأكثر في شهر كامل', () => FM.months(S, 13).slice(0, -1).some(m => m.rate != null && m.rate >= 20)],
  ['pyf3', '🚿', 'ادفع لنفسك 3 أشهر', 'ادّخرت أولاً يوم الراتب 3 أشهر متتالية', () => { const ms = new Set(S.tx.filter(t => t.meta && t.meta.pyf && !t.voided).map(t => t.date.slice(0, 7)).concat(S.goals.filter(g => g.pyf && g.date).map(g => g.date.slice(0, 7)))); let k = L.mkey(L.today()), n = 0, best = 0; for (let i = 0; i < 24; i++, k = L.prevMonth(k)) { if (ms.has(k)) { n++; best = Math.max(best, n); } else n = 0; } return best >= 3; }],
  ['budget', '✅', 'شهر داخل الحدود', 'شهر كامل لم تتجاوز فيه أي حد', () => { let k = L.prevMonth(L.mkey(L.today())); for (let i = 0; i < 6 && L.monthEnd(k) >= S.x.openDate; i++, k = L.prevMonth(k)) { const b = L.budget(S, L.monthEnd(k)); if (b.some(x => x.limit > 0) && !b.some(x => x.over)) return true; } return false; }],
  ['debtfree', '🕊', 'بلا ديون', 'سددت كل ما عليك', () => { const D = L.debts(S).filter(d => d.dir === 'borrowed'); return D.length > 0 && D.every(d => d.settled); }], ['wish', '🧘', 'قاومت رغبة', 'تراجعت عن شراء بعد يوم من التفكير', () => wishSaved() > 0],
  ['recon', '🧮', 'حساباتي مضبوطة', 'أجريت المطابقة الشهرية', () => Object.keys(S.x.reconDone || {}).length > 0]];
const badgeState = memo('badges', S0 => { const r = {}; BADGES.forEach(([id, , , , f]) => { try { r[id] = !!f(); } catch (e) { r[id] = false; } }); return r; });
let BCHK = -1; // يُفحص فقط ما لم يُحقَّق بعد، وبعد الرسم (لا يؤخّر الشاشة)، ومرة لكل تعديل
function badgeCheck() { if (!S || !S.x.openDate || BCHK === DGEN) return; BCHK = DGEN; const g = DGEN;
  setTimeout(() => { if (g !== DGEN || !S) return; let st = {}; try { st = JSON.parse(LS.get(BKEY) || '{}') || {}; } catch (e) {}
    const fresh = BADGES.filter(([id, , , , f]) => { if (st[id]) return false; try { return !!f(); } catch (e) { return false; } }); if (!fresh.length) return;
    fresh.forEach(b => { st[b[0]] = L.today(); }); LS.set(BKEY, JSON.stringify(st)); const b = fresh[fresh.length - 1]; toast('🏅 إنجاز جديد: ' + b[1] + ' ' + b[2]); }, 700); }
const badgeOn = () => { let st = {}; try { st = JSON.parse(LS.get(BKEY) || '{}') || {}; } catch (e) {} const now = badgeState(S), r = {}; BADGES.forEach(([id]) => { r[id] = !!(st[id] || now[id]); }); return { on: r, st }; };
MORE.push(['badges', 'إنجازاتي', () => { const { on: now, st } = badgeOn(); const n = BADGES.filter(b => now[b[0]]).length;
  return h('div', {}, h('p', { class: 'mut' }, n + ' من ' + BADGES.length + ' · تُحسب من بياناتك، وتظهر مرة واحدة عند تحقيقها.' + (streak() ? ' سلسلة التسجيل الحالية: ' + streak() + ' يوماً 🔥' : '')),
    h('div', { class: 'bgrid' }, BADGES.map(([id, ic, t, d]) => h('div', { class: 'badge' + (now[id] ? ' on' : '') }, h('span', { class: 'bic' }, now[id] ? ic : '🔒'), h('b', {}, t), h('small', {}, now[id] ? (st[id] ? 'منذ ' + nWhen(st[id]) : 'تحقق') : d))))); }]);
// ---- 8: حركة موحّدة: الأرقام الكبيرة تعدّ صعوداً من آخر قيمة رأيتها، وتتوقف مع «تقليل الحركة» أو إخفاء الثروة ----
const LASTN = new Map();
function animNum(el, v, key, fmt) { const from = LASTN.has(key) ? LASTN.get(key) : v; LASTN.set(key, v); if (from === v || REDUCED() || privOn()) { el.textContent = fmt(v); return el; } el.textContent = fmt(from); el.dataset.v = from; requestAnimationFrame(() => countTo(el, v, fmt)); return el; }
// ===== الإطار: التنقل والإقلاع =====
const TABS = [['home', 'الرئيسية'], ['ops', 'العمليات'], ['accts', 'أموالي'], ['assets', 'الأصول'], ['nabd', 'نبض السوق'], ['insights', 'تحليلاتي']];
// المرحلة 2: لا «المزيد». صفحاته الفرعية تبقى بمساراتها نفسها (go('more', x)) لكنها تتبع زراً واضحاً في الشريط، ورجوعها إليه.
// الإعدادات والأدوات تُفتح من زر ⚙ أعلى الرئيسية.
const PARENT = { badges: 'insights', wish: 'insights', debts: 'accts', jams: 'accts', recurring: 'accts', goals: 'assets', reports: 'insights' }; // ما لم يُذكر يتبع الرئيسية (⚙)
const parOf = sub => sub === 'goals' && !fOn('assets') ? 'accts' : PARENT[sub]; // الأهداف تتبع «أموالي» إن أُوقفت «الأصول»
const navTab = () => view.tab === 'more' ? (parOf(view.sub) || 'home') : view.tab;
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
let LASTTAB = null;
function renderView() {
  const app = $('#app'); app.replaceChildren(); const scr = SCREENS[view.tab] || SCREENS.home, bb = S.x.openDate && view.sub !== 'backup' ? backupBanner() : null; app.append(...[integBanner(), bb, scr(view.sub, view.p)].filter(Boolean)); // append(null) في المتصفح يكتب النص null
  if (S.x.openDate && !sessionDismiss && FB.status(S).level === 'block') { sessionDismiss = true; if (confirm('مضى أكثر من 14 يوماً على آخر نسخة احتياطية. فتح صفحة النسخ الآن؟')) { view = { tab: 'more', sub: 'backup', p: {} }; return render(); } }
  if (view.tab === 'home' && !view.sub) badgeCheck(); if (LASTTAB !== view.tab && !REDUCED()) { app.classList.remove('tabin'); void app.offsetWidth; app.classList.add('tabin'); } LASTTAB = view.tab;
  $('#nav').replaceChildren(...TABS.filter(([k]) => fOn(k) || k === navTab()).map(([k, t]) => h('button', { class: k === navTab() ? 'on' : '', onclick: () => go(k) }, ico(k), h('span', {}, t))));
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
  try { if (L && !L.__memo) { L.__memo = 1; ['monthReport', 'listTx', 'budget', 'status'].forEach(k => { L[k] = memo('L.' + k, L[k]); }); }
    if (typeof FD !== 'undefined') ['safe', 'forecast', 'monthSummary', 'wealthNotes', 'baseline', 'path', 'pathAdvice'].forEach(k => { FD[k] = memo('FD.' + k, FD[k]); });
    if (typeof FM !== 'undefined') ['months', 'alloc', 'savings'].forEach(k => { FM[k] = memo('FM.' + k, FM[k]); }); } catch (e) {}
  const has = f => { try { return f() != null; } catch (e) { return false; } }; // ملف فشل أثناء تحميله يرمي حتى مع typeof، فنلتقطه
  const miss = [[() => FLS, 'core.js'], [() => FE, 'engine.js'], [() => FL, 'logic.js'], [() => FStore, 'store.js'], [() => FB, 'backup.js']].filter(x => !has(x[0])).map(x => x[1]);
  if (miss.length) return bootFail('ملفات التطبيق ناقصة أو تالفة: ' + miss.join('، '));
  try { BE = FStore.idb(); S = await FStore.load(BE); } catch (e) { return bootFail('تعذّر فتح التخزين', e); }
  try {
    if (navigator.storage && navigator.storage.persist) { (navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false)).then(p => p || navigator.storage.persist())
      .then(r => { persist = !!r; if (!persist && !bootErr && view.tab === 'home' && !view.sub) render(); }).catch(() => { persist = 'na'; }); } else persist = 'na';
    if (lockOn()) showLock(); else unlocked = true;
    if (S.x.openDate) { INACT++; try { await FStore.run(BE, S, () => L.snapMonths(S)); } catch (e) {} INACT--; DGEN++; }
    try { integ = L.integrity(S); } catch (e) { integ = ['تعذّر تشغيل فحص السلامة: ' + (e.message || e)]; }
    privObs = new MutationObserver(() => privApply()); if (S.x.openDate && S.x.set.start && fOn(S.x.set.start) && TABS.some(t => t[0] === S.x.set.start)) view = { tab: S.x.set.start, sub: null, p: {} }; // البند 19: شاشة البداية
    setTimeout(() => prebuild(), 2500); renderView(); // الإقلاع يبقى كما اعتُمد: خطأ الشاشة الأولى يذهب إلى bootFail
    addEventListener('error', ev => globalErr(ev.error || ev.message)); addEventListener('unhandledrejection', ev => globalErr(ev.reason));
  } catch (e) { bootFail('خطأ أثناء عرض الشاشة', e); }
})();
