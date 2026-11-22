'use strict';
// ===== f1-v4.14: الشروح على الشاشات =====
// عند فتح شاشة تظهر فوقها فقاعات قصيرة على عناصرها المهمة (5 كحد أقصى). لمسة في أي مكان تغلقها هذه المرة فقط.
// «لا تُظهر شروح هذه الشاشة مجدداً» يوقفها لتلك الشاشة، و«أوقف كل الشروح» يوقفها كلها، و⚙ ← «الشروح على الشاشات» يعيدها.
// الحالة تفضيل عرض على هذا الجهاز (localStorage)، لا تدخل في بياناتك المالية. نصوصها جزء من التعليمات وتُحدَّث معها.
const COACH_KEY = 'flousi-coach';
const coachSt = () => { try { const v = JSON.parse(localStorage.getItem(COACH_KEY) || 'null'); return v && typeof v === 'object' ? { off: !!v.off, seen: v.seen || {} } : { off: false, seen: {} }; } catch (e) { return { off: false, seen: {} }; } };
const coachSave = v => { try { localStorage.setItem(COACH_KEY, JSON.stringify(v)); } catch (e) { /* لا بأس */ } };
// المحدِّد: محدِّد CSS، أو «text:وسم|نص» لعنصر يحوي النص
const COACH = {
  'home/': [['section.hero .big', 'مالك السائل بعد حجز مبالغ أهدافك. ما تصرفه اليوم تجده في «قرار اليوم» تحته. اضغطه لتفتح «شهري».'], ['.qhome', 'اختصارات: مصروف، دخل، تحويل، و«طابق» يقارن نقدك الفعلي بالمسجّل.'],
    ['button.mline', 'مثقال 21 والدولار الآن. اضغطه لتفتح نبض السوق.'], ['section.upns', '«يهمّك الآن»: كل ما يحتاج انتباهك مرتباً بالأهم. اضغط السطر لتفتح مكانه.'], ['button.gear', 'الإعدادات والتعليمات والنسخ الاحتياطي.']],
  'ops/': [['#app > div > .seg', 'اختر: مصروف، أو دخل، أو تحويل بين حساباتك.'], ['.qpad', 'اكتب المبلغ هنا ثم اضغط «تم».'], ['.qcats', 'الفئة أو الحساب: الأكثر استعمالاً أولاً.'], ['input[type=search]', 'سجلك: ابحث، وعدّل، أو تراجع عن أي عملية.']],
  'accts/': [['.wrow', 'بطاقة لكل حساب، الأكثر استعمالاً أولاً. اضغطها لتضيف أو تصرف أو تحوّل أو تطابق.'], ['[data-gold]', '«الصندوق الذهبي»: ذهبك وفضتك قطعةً قطعة بوزنها وعيارها وسعر شرائها.'],
    ['.wtiles', 'الديون والجمعيات والمتكررات والأهداف: تظهر حين يكون عندك ما يخصها.'], ['text:summary|+ إضافة', 'أضف حساباً أو قطعة ذهب أو سهماً أو ديناً أو جمعية أو هدفاً.']],
  'accts/acct': [['.wact', 'هذه الأزرار تفتح العمليات وهذا الحساب مختار مسبقاً.'], ['text:button|طابق الرصيد', 'اكتب ما يوجد فعلاً، ويقترح التطبيق ما تفعل بالفرق.']],
  'accts/gold': [['.ptiles', 'اضغط القطعة لترى تفاصيلها وسجلها وتبيعها.'], ['text:button|سجل الذهب', 'كل شراء وبيع بتاريخه ومبلغه.']],
  'nabd/': [['button.kb', 'شارة نوع الرقم: اضغطها لمعناها ووقت تحديثه.'], ['.gapm', 'الفجوة بين دولار السوق والسعر الرسمي.'], ['text:h2|أسعارك المعتمدة', 'الأسعار التي يحسب بها التطبيق ذهبك ودولارك. أنت من يعتمدها.']],
  'insights/': [['.wl', '«خط ثروتك»: صافي ثروتك شهراً بشهر. اضغط أي شهر لترى ما تغيّر.'], ['.igrid', 'أدوات القرار: قبل أن تصرف، شهري، المستشار، قراراتي.'], ['section.pcard', 'المسار المالي: أين تصل ثروتك بعد سنوات.']],
  'insights/decisions': [['text:h2|بانتظار سببك', 'عملياتك الكبيرة بلا سبب. اكتب لماذا قررت متى شئت.']],
  'snack-why': [['#snack .snb button.alt', '«لماذا قررت؟»: سبب اختياري بكلمات قليلة. بعد 3 أشهر يريك التطبيق النتيجة. تجاهله إن كنت مستعجلاً.']],
  'reconbar': [['section.reconbar', 'كلما سجّلت مصروفاً تتذكره يقل الباقي. «الباقي خُردة» يسجّل ما لم تتذكره.']] };
const ONCE = ['snack-why', 'reconbar']; // تظهر مرة واحدة عند أول ظهور للميزة
function coachFind(sel) { if (!sel.startsWith('text:')) return document.querySelector(sel); const [tag, t] = sel.slice(5).split('|'); return [...document.querySelectorAll(tag)].find(e => e.textContent.includes(t)) || null; }
let coachLast = null, coachTm = null;
function coachShow(key, force) { const st = coachSt(); if (!force && (st.off || st.seen[key])) return; const tips = (COACH[key] || []).map(([s, t]) => [coachFind(s), t]).filter(([e]) => e && (e.checkVisibility ? e.checkVisibility() : e.getClientRects().length)).slice(0, 5); if (!tips.length) return;
  if (ONCE.includes(key)) { st.seen[key] = true; coachSave(st); }
  const old = document.getElementById('coach'); if (old) old.remove();
  // f1-v4.15: شرح واحد في كل مرة («التالي») بدل كل الفقاعات معاً، ولمسة في أي مكان تغلقها
  const ov = h('div', { id: 'coach', role: 'dialog', 'aria-label': 'شرح الشاشة' }); let i = 0;
  const step = () => { ov.textContent = ''; const [el, t] = tips[i], vh = window.innerHeight, r = el.getBoundingClientRect();
    if (r.top > vh - 60 || r.bottom < 0) ov.append(h('div', { class: 'cbub', style: `top:${Math.round(vh * 0.3)}px` }, '↓ أسفل الصفحة: ' + t));
    else { ov.append(h('div', { class: 'cring', style: `top:${Math.max(0, r.top - 4)}px;left:${Math.max(0, r.left - 4)}px;width:${r.width + 8}px;height:${Math.min(r.height + 8, vh)}px` }));
      let top = r.bottom + 8; if (top > vh - 260) top = Math.max(8, r.top - 96); ov.append(h('div', { class: 'cbub', style: `top:${top}px` }, t)); }
    if (!ONCE.includes(key)) ov.append(h('div', { class: 'cfoot' }, h('small', {}, (tips.length > 1 ? (i + 1) + ' من ' + tips.length + ' · ' : '') + 'المس أي مكان للإغلاق'),
      i < tips.length - 1 ? h('button', { type: 'button', class: 'cnext', onclick: e => { e.stopPropagation(); i++; step(); } }, 'التالي') : null,
      h('button', { type: 'button', class: 'alt', onclick: e => { e.stopPropagation(); const s = coachSt(); s.seen[key] = true; coachSave(s); ov.remove(); } }, 'لا تُظهر شروح هذه الشاشة مجدداً'),
      h('button', { type: 'button', class: 'alt', onclick: e => { e.stopPropagation(); const s = coachSt(); s.off = true; coachSave(s); ov.remove(); toast('أُوقفت الشروح. تعيدها من ⚙ ← «الشروح على الشاشات»'); } }, 'أوقف كل الشروح'))); };
  step();
  ov.addEventListener('click', () => ov.remove()); document.body.append(ov); }
// تُستدعى بعد كل رسم: تظهر الشروح عند الدخول إلى شاشة (لا عند إعادة رسم الشاشة نفسها)
function coachMaybe() { const key = view.tab === 'more' ? null : view.tab + '/' + (view.sub || ''); if (key === coachLast) return; coachLast = key; clearTimeout(coachTm); const old = document.getElementById('coach'); if (old) old.remove();
  if (!key || !COACH[key] || $('#lock') && !$('#lock').hidden) return; coachTm = setTimeout(() => { if (coachLast === key) coachShow(key); }, 450); }
const coachStatus = () => { const s = coachSt(); return s.off ? 'متوقفة' : Object.keys(s.seen).filter(k => !ONCE.includes(k)).length ? 'مفعّلة (أُوقفت لبعض الشاشات)' : 'مفعّلة'; };
function coachPanel() { const s = coachSt(), hidden = Object.keys(s.seen).filter(k => !ONCE.includes(k)).length;
  return sect('الشروح على الشاشات', h('p', { class: 'mut' }, 'شرح قصير لكل عنصر في الشاشة، واحداً تلو الآخر بزر «التالي». تظهر عند فتح الشاشة حتى توقفها، ولمسة في أي مكان تغلقها.'), row('الحالة', coachStatus()),
    btn('أظهر الشروح من جديد', () => { coachSave({ off: false, seen: {} }); coachLast = null; toast('ستظهر الشروح من جديد'); render(); }, 'alt'),
    !s.off ? btn('أوقف كل الشروح', () => { coachSave({ ...s, off: true }); render(); }, 'alt') : null, hidden ? h('p', { class: 'mut' }, 'شاشات أوقفت شروحها: ' + hidden) : null); }
