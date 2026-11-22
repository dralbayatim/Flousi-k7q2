'use strict'; // جزء من الواجهة (f1-v4.13): مقسوم حرفياً من app.js بالترتيب نفسه
// ===== المرحلة 6: شاشة الحالة (الرئيسية)، الشريط المتحرك، التقارير، حدود التنبيه =====
let tickTimer = null; // يُفرَّغ فقط (الشريطان الحاليان في tickTimers)
const sgn = n => n == null ? '—' : (n > 0 ? '+' : '') + L.fmt(n) + ' د.ع';
// لون المتاح للصرف (الوثيقة 7.1) حسب حدودك فقط: أحمر إن كان سالباً أو تجاوزتَ حداً، أصفر إن اقتربت، وإلا أخضر. تنبيهات النسخ وغيرها لا تلوّنه
function availLevel(st) { if (st.avail < 0) return ['badc', 'المخصص للأهداف أكبر من السيولة'];
  const b = L.budget(S); return b.some(x => x.over) ? ['badc', 'تجاوزتَ حداً من حدود هذا الشهر'] : b.some(x => x.near || x.pace) ? ['warnc', 'اقتربتَ من حد من حدود هذا الشهر'] : ['okc', 'ضمن حدودك هذا الشهر']; }
// آخر سعر صرف وتاريخه على الشاشة الرئيسية (الوثيقة 7.1)، والتحديث بنقرة في تبويب «الأصول»
function rateBlock() { const has = S.x.rates.length > 0, usd = userAccts(a => a.cur === 'USD').length > 0;
  return pubSect('سعر الصرف', row('100 دولار', has ? L.fmtRate(S.rate) + ' د.ع' : (usd ? '⚠ لم يُدخل بعد' : 'لم يُدخل'), has || !usd ? '' : 'bad'), has ? h('div', { class: 'r' }, h('span', {}, 'عمر السعر'), rateAge()) : null,
    has ? h('p', { class: 'mut' }, 'آخر تحديث: ' + S.x.rates[S.x.rates.length - 1].d) : null, btn('حدّث السعر', () => go('nabd', null, { t: 'now', open: 'prices' }), 'alt mini'), nabdRateBtn(saveNabdRate, 'أكّد واحفظ')); }
const qk = (i, t, f, sec) => h('button', { class: 'qk' + (sec ? ' sec' : ''), onclick: f }, h('span', { class: 'qi' }, ico(i)), h('span', {}, t));
// خط اتجاه صافي الثروة عند نهايات الأشهر المحفوظة: شكل فقط بلا أي رقم، ويُخفى عند إخفاء الثروة
function nwTrend() { try { if (privHidden()) return null; const sn = S.x.snaps || {}, ks = Object.keys(sn).sort().slice(-12), ys = ks.map(k => sn[k].nw).filter(v => typeof v === 'number'); if (ys.length < 3) return null;
  const W = 300, H = 46, lo = Math.min(...ys), hi = Math.max(...ys), sx = i => 4 + i * (W - 8) / (ys.length - 1), sy = v => 5 + (hi - v) / ((hi - lo) || 1) * (H - 12), d = ys.map((v, i) => (i ? 'L' : 'M') + sx(i).toFixed(1) + ',' + sy(v).toFixed(1)).join(' ');
  const el = h('div', { class: 'trend', 'aria-hidden': 'true' }); el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="direction:ltr"><path d="' + d + ' L' + sx(ys.length - 1).toFixed(1) + ',' + H + ' L4,' + H + ' Z" fill="currentColor" opacity=".12"/><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>'; return el; } catch (e) { return null; } }
SCREENS.home = () => {
  if (!S.x.openDate && !S.x.set.featDone) return firstRunFeat();
  if (!S.x.openDate) return h('div', {}, h('div', { class: 'hdr' }, h('h1', {}, 'أهلاً بك في فلوسي'), h('button', { class: 'gear', 'aria-label': 'الإعدادات والأدوات', onclick: () => go('more') }, '⚙')), h('p', { class: 'mut' }, 'ثلاث خطوات فقط لتبدأ. لديك نسخة احتياطية؟ ⚙ ثم «النسخ الاحتياطي والتصدير» لاستعادتها.'),
    h('div', { class: 'card' }, h('h2', {}, '1. ما تملكه اليوم'), h('p', { class: 'mut' }, 'نقد، فيزا، دولار. تبدأ منها.'), btn('ابدأ الخطوة 1', () => go('accts', 'open'))),
    h('div', { class: 'card dim' }, h('h2', {}, '2. الراتب'), h('p', { class: 'mut' }, 'يُفتح بعد الخطوة 1: «أموالي» ثم «المتكررات والراتب».')),
    h('div', { class: 'card dim' }, h('h2', {}, '3. الذهب والفضة'), h('p', { class: 'mut' }, 'يُفتح بعد الخطوة 1: «أموالي» ← «الصندوق الذهبي» ← «كانت عندي قبل البدء».')));
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
  if (m) { const par = parOf(sub), fr = view.p && view.p.from; return h('div', {}, backBtn(() => fr ? go(fr[0], fr[1], fr[2]) : par ? go(par) : go('more')), h('h1', {}, m[1]), m[2]()); }
  return settingsHome(); };
