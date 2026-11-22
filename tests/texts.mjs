// اختبار النصوص (f1-v4.14): التعليمات والشروح والإعدادات تطابق التطبيق الفعلي
// 1) لا تذكر ما أُلغي  2) كل اسم بين «» في التعليمات والشروح موجود نصاً في واجهة التطبيق (خارج التعليمات نفسها)  3) كل «⚙ ← «X»» إعداد موجود
import fs from 'node:fs';
const D = process.argv[2]; let pass = 0, fail = 0; const errs = []; const ok = (c, n, i) => { if (c) pass++; else { fail++; errs.push(n + (i !== undefined ? ' → ' + JSON.stringify(i) : '')); } };
const files = fs.readdirSync(D).filter(f => /\.js$/.test(f) && !/^(sw|register|selftest\d?)\.js$/.test(f)), src = Object.fromEntries(files.map(f => [f, fs.readFileSync(D + '/' + f, 'utf8')]));
const hs = src['ui-help-settings.js'], hi = hs.indexOf('const HELP = ['), hj = hs.indexOf("MORE.unshift(['help'"), HELP = hs.slice(hi, hj);
const cs = src['ui-coach.js'], ci = cs.indexOf('const COACH = {'), cj = cs.indexOf('const ONCE'), COACH = cs.slice(ci, cj);
const UI = Object.entries(src).map(([f, s]) => f === 'ui-help-settings.js' ? s.slice(0, hi) + s.slice(hj) : f === 'ui-coach.js' ? s.slice(0, ci) + s.slice(cj) : s).join('\n') + fs.readFileSync(D + '/index.html', 'utf8');
// 1) المحذوف لا يُذكر
const GONE = [/التبويبات الستة/, /البوابات الست/, /تبويب «الأصول»/, /«الأصول» ←/, /شريط «لك»/, /شريط «العالم»/, /«تحويل العملات»/, /«مطابقة نقد»/, /بطاقة المستشار في الرئيسية/, /«هل أشتري؟» في تحليلاتي/, /تحليلاتي ← «ماذا لو؟»/, /المتوقع مع المصنعية/, /تحت كل سعر مصدره/, /في تحليلاتي أو ⚙/, /أهم 3 استشارات/];
for (const [name, txt] of [['HELP', HELP], ['COACH', COACH]]) for (const g of GONE) ok(!g.test(txt), name + ' does not mention removed: ' + g.source);
for (const g of [/تبويب «الأصول»/, /شريط «العالم» في الرئيسية/]) ok(!g.test(src['ui-help-settings.js'].slice(hj)), 'settings do not mention: ' + g.source);
// 2) كل «اسم» موجود في الواجهة
const CONCEPT = new Set(['فلوسي', 'الرصيد الافتتاحي', 'هل هو الراتب؟ نعم', 'دخل متكرر', 'حفظ في الملفات', 'حالي', 'قديم', 'كامل', 'بسيط', 'مرصود', 'محسوب', 'مقدّر', 'نموذجنا', 'غير محقق', 'محققة', 'المصروف الآمن', 'الخُردة',
  'فروقات المطابقة', 'باقي غير مسجّل', 'سجّلها «مبلغ غير مسجّل»', 'مبلغ غير مسجّل', 'وفّرت بالتريث', 'ما زلت تريده؟', 'لا، تراجعت', 'الخُردة هذا الشهر', 'هدف المدخرات', 'ورقة الراتب', 'يوم الراتب', 'ادفع لنفسك أولاً', 'متكرر عندك', 'استبعاد من صافي الثروة', 'ما تملكه']);
const names = s => [...s.matchAll(/«([^«»]{2,60})»/g)].map(m => m[1]);
for (const [name, txt] of [['HELP', HELP], ['COACH', COACH]]) for (const n of new Set(names(txt))) { if (CONCEPT.has(n)) { ok(true); continue; } ok(UI.includes(n), name + ' label exists in UI: «' + n + '»'); }
// 3) «⚙ ← «X»» = صف في الإعدادات أو صفحة في ⚙
const SET = hs.slice(hs.indexOf('function setRows()'), hs.indexOf('function setPanel'));
for (const m of HELP.matchAll(/⚙ ← «([^»]+)»/g)) ok(SET.includes("'" + m[1] + "'") || UI.includes("MORE.push(['" ) && new RegExp("\\['[a-z]+', '" + m[1] + "'").test(UI), 'settings entry exists: ' + m[1]);
// 4) لا يُذكر «الأصول» كتبويب في التبويبات
ok(!/\['assets', 'الأصول'\]/.test(src['ui-boot.js']), 'TABS has no assets');
// 5) f1-v4.15: كل نصوص التطبيق (رسائل الخطأ، المستشار، الأزرار...) في كل ملفات JS: لا تذكر ما أُلغي. يُفحص ما بين علامات الاقتباس فقط، لا التعليقات
const strip = t => t.split('\n').map(l => { let q = null; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '\\') i++; else if (ch === q) q = null; } else if (ch === "'" || ch === '"' || ch === '`') q = ch; else if (ch === '/' && l[i + 1] === '/') return l.slice(0, i); } return l; }).join('\n');
const lits = t => [...strip(t).matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].map(m => m[0]);
const OLD = [/تبويب الأصول/, /تبويب «الأصول»/, /من «الأصول»/, /في «الأصول»/, /أو «الأصول»/, /«الأصول» ←/, /«هل أشتري؟»/, /من الصفحة الرئيسية/, /شريط «لك»/, /شريط «العالم»/];
let nl = 0; for (const [f, t] of Object.entries(src)) for (const l of lits(t)) { nl++; for (const g of OLD) ok(!g.test(l), 'string in ' + f + ' does not mention removed ' + g.source, l.slice(0, 90)); }
ok(nl > 3000, 'scanned all string literals (' + nl + ')');
console.log(`PASS ${pass}  FAIL ${fail}`); errs.forEach(e => console.log('  ✗ ' + e)); process.exit(fail ? 1 : 0);
