'use strict';
// فلوسي — الواجهة. كل شيء محلي: التخزين IndexedDB باسم flousi (قاعدة المرحلة 0 flousi-p0 لا تُمسّ).
const $ = s => document.querySelector(s);
const h = (t, a, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a || {})) { if (n === 'class') e.className = v; else if (n.startsWith('on')) e[n] = v; else if (v !== false && v != null) e.setAttribute(n, v === true ? '' : v); }
  k.flat(9).forEach(c => { if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(c)); }); return e; };
// إن نقص ملف أو تلف فلا يتوقف هذا الملف هنا؛ الإقلاع في الأسفل يكشف ذلك ويعرض شاشة خطأ بدل «…»
const L = (() => { try { return FL; } catch (e) { return null; } })(), E = (() => { try { return FE; } catch (e) { return null; } })(), VER = 'f1-v4.14'; // ارفع VER مع V في sw.js عند كل إصدار
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
