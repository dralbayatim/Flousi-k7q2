'use strict';
// ===== f1-v4.14: «تحليلاتي» — خط ثروتك، قبل أن تصرف، شهري، المستشار الموحّد، قراراتي =====
// كل ما هنا يُحسب من سجلك ولا يُخزَّن، عدا «قراراتي» (S.x.set.decs: سبب اختياري وتقييمك، لا يمس العمليات ولا القيود).
// ---- خط ثروتك: صافي الثروة نهاية كل شهر مقسّماً، بنفس طريقة المحرك (snapAt) حتى يطابق مجموعُه صافيَ الثروة المحفوظ ----
const WCOMP = [['cash', 'نقد وحسابات', 'var(--acc)'], ['usd', 'دولار', '#3b82c4'], ['metals', 'ذهب وفضة', '#c9a227'], ['stocks', 'أسهم', '#7b5ea7'], ['other', 'عقار وأصول أخرى', '#3a9d7a']];
const valsAtD = d => { const o = {}; (S.x.vals || []).forEach(v => { if (v.d <= d) o[v.a] = v.v; }); return o; }; // مثل valsAt في logic.js (غير مُصدَّرة)
function wealthAt(d) { const S2 = { acc: S.acc, tx: S.tx.filter(t => t.date <= d), post: S.post.filter(p => p.date <= d), pieces: S.pieces, goals: [], rate: L.rateAt(S, d) || S.rate, price: L.priceAt(S, d) || S.price, vals: valsAtD(d) };
  const ok = new Set(S2.tx.filter(t => !t.voided && !t.reverses).map(t => t.id)), A = S2.post.filter(p => ok.has(p.tx)), dv = E.derive(S2), cost = S.x.set.valuation === 'cost';
  const out = { cash: 0, usd: 0, metals: 0, stocks: 0, other: 0, liab: 0 };
  for (const id in S.acc) { const a = S.acc[id], ps = A.filter(p => p.a === id); if (!ps.length) continue; const nat = ps.reduce((s, p) => s + p.n, 0), iq = ps.reduce((s, p) => s + p.iqd, 0);
    if (a.kind === 'asset') {
      if (a.cur === 'USD') out.usd += cost ? Number(dv.usd[id] ? dv.usd[id].C : 0n) : E.usdToIqd(nat, S2.rate);
      else if (a.metal) { if (cost) out.metals += iq; }
      else { const m = !cost && S2.vals && S2.vals[id] != null && iq !== 0 ? S2.vals[id] : iq; out[a.liquid ? 'cash' : a.type === 'stock' ? 'stocks' : 'other'] += m; }
    } else if (a.kind === 'liab') out.liab += -iq; }
  if (!cost) for (const pid in S.pieces) { const p = S.pieces[pid]; if (E.pieceCost(S2, pid) !== 0) out.metals += E.metalIqd(p.mg, p.fine, S2.price[p.metal], S2.rate); }
  out.nw = out.cash + out.usd + out.metals + out.stocks + out.other - out.liab; return out; }
function wealthSeries(n) { const od = S.x.openDate; if (!od) return []; const out = [], last = L.mkey(L.today()); let k = L.mkey(od);
  for (let i = 0; i < 1200 && k <= last; i++, k = L.addMonths(k + '-01', 1).slice(0, 7)) { const d = k === last ? L.today() : L.monthEnd(k); out.push({ k, d, ...wealthAt(d) }); } return out.slice(-n); }
function wealthLine(per) { const ms = wealthSeries(per === 'all' ? 1200 : per === 'm' ? 2 : 12); if (!ms.length) return null;
  const sel = ms.find(m => m.k === view.p.wm) || ms[ms.length - 1], prev = ms[ms.indexOf(sel) - 1], W = 320, H = 130, top = Math.max(1, ...ms.map(m => WCOMP.reduce((s, [k]) => s + Math.max(0, m[k]), 0))), bw = Math.max(6, Math.min(34, (W - 10) / ms.length - 4));
  const svg = h('div', { class: 'wl noswipe' }); let g = '';
  ms.forEach((m, i) => { const x = 6 + i * ((W - 12) / ms.length) + ((W - 12) / ms.length - bw) / 2; let y = H - 16;
    WCOMP.forEach(([k, , c]) => { const v = Math.max(0, m[k]), hh = v / top * (H - 26); if (hh > 0.3) { y -= hh; g += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hh.toFixed(1) + '" fill="' + c + '" opacity="' + (m === sel ? 1 : .55) + '" rx="2"/>'; } });
    g += '<rect data-k="' + m.k + '" x="' + (x - 2).toFixed(1) + '" y="0" width="' + (bw + 4).toFixed(1) + '" height="' + H + '" fill="transparent"/>'; });
  g += '<text x="6" y="' + (H - 2) + '" font-size="10" fill="currentColor" opacity=".6">' + kLab(ms[0].k) + '</text><text x="' + (W - 6) + '" y="' + (H - 2) + '" font-size="10" text-anchor="end" fill="currentColor" opacity=".6">' + kLab(ms[ms.length - 1].k) + '</text>';
  svg.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="direction:ltr;display:block">' + g + '</svg>';
  svg.addEventListener('click', e => { const k = e.target.getAttribute && e.target.getAttribute('data-k'); if (k) { view.p.wm = k; render(); } });
  const ch = k => prev ? sel[k] - prev[k] : null, dRow = (n, k, inv) => { const d = ch(k); return row(n, money(sel[k]) + (d ? ' (' + (d > 0 ? '+' : '') + L.fmt(inv ? -d : d) + ')' : ''), d && (inv ? d > 0 : d < 0) ? 'bad' : ''); };
  return sect(ti('خط ثروتك', 'صافي الثروة'), h('div', { class: 'big' }, money(sel.nw)), h('p', { class: 'mut' }, (sel.k === L.mkey(L.today()) ? 'حتى اليوم' : 'نهاية ' + mName(sel.k)) + (prev ? ' · التغيّر عن الشهر السابق ' + sgn(sel.nw - prev.nw) : '') + ' · اضغط أي شهر'),
    svg, h('div', { class: 'lg' }, WCOMP.filter(([k]) => ms.some(m => m[k])).map(([k, n, c]) => h('span', {}, h('i', { style: 'background:' + c }), n))),
    h('details', { class: 'fold', open: !!view.p.wm }, h('summary', {}, 'تفصيل ' + mName(sel.k)), WCOMP.filter(([k]) => sel[k] || (prev && prev[k])).map(([k, n]) => dRow(n, k)), sel.liab || (prev && prev.liab) ? dRow('الالتزامات', 'liab', true) : null,
      h('p', { class: 'mut' }, S.x.set.valuation === 'cost' ? 'بالتكلفة (حسب إعداد طريقة التقييم).' : 'بالقيمة السوقية: الدولار بسعر الصرف المعتمد، والذهب والفضة بالأسعار المعتمدة، والعقار بآخر تقييم.'))); }
// ---- «قبل أن تصرف»: «هل أشتري؟» و«ماذا لو؟» في أداة واحدة ----
const stripHead = el => { const b = el.querySelector(':scope > .back'), t = el.querySelector(':scope > h1'); if (b) b.remove(); if (t) t.remove(); return el; };
function beforeSpend(mode) { const m = mode === 'whatif' ? 'whatif' : 'buy';
  return h('div', {}, backBtn(() => go('insights')), h('h1', {}, 'قبل أن تصرف'), h('p', { class: 'mut' }, 'اكتب المبلغ قبل أن تقرر، فترى أثره على شهرك وأهدافك.'),
    seg([['buy', 'شراء الآن'], ['whatif', 'التزام أو تغيّر في الدخل']], m, k => go('insights', k)), stripHead(m === 'buy' ? buyScreen() : whatIfScreen()),
    sect('', btn('قائمة الرغبات (انتظر يوماً)', () => go('more', 'wish'), 'alt mini'))); }
// ---- «شهري»: بطاقة الشهر + التفاصيل والسنوي والحدود + الخُردة + الإنجازات ----
function khurda(k) { let s = 0, u = 0; S.tx.forEach(t => { if (t.voided || t.reverses || t.type !== 'reconcile' || t.date.slice(0, 7) !== k) return; postsOf(t.id).forEach(p => { if (S.acc[p.a] && S.acc[p.a].kind === 'recon') { if (p.iqd > 0) s += p.iqd; else u -= p.iqd; } }); }); return { s, u }; }
function shahri() { const ms = monthsList(), p = view.p, tab = p.tab || 'card', k = p.k && ms.includes(p.k) ? p.k : ms[0] || L.mkey(L.today()), y = p.y || +L.today().slice(0, 4);
  if (!ms.length) return h('div', {}, backBtn(() => go('insights')), h('h1', {}, 'شهري'), emptyState('🎴', 'يبدأ بعد الرصيد الافتتاحي', 'سجّل ما تملكه اليوم لتظهر أشهرك.'));
  const nav = (o) => go('insights', 'wrap', { tab, k, y, ...o }), stale = L.snapStale(S), K = khurda(k), bs = badgeOn(), got = Object.values(bs.on).filter(Boolean).length;
  const body = tab === 'year' ? h('div', {}, seg([[y - 1, String(y - 1)], [y, String(y)]], y, v => nav({ y: +v })), yearView(y))
    : tab === 'limits' ? h('div', {}, h('p', { class: 'mut' }, 'نسب افتراضية من دخل الشهر، وهي قواعد بسيطة قابلة للتعديل وليست استشارة مالية. عدّلها بما يناسبك.'), L.budget(S).map(x => h('div', { class: 'tx' }, row(x.g, x.pct + '% = ' + money(x.limit)), limitBar(x),
        h('label', { class: 'f' }, h('span', {}, 'النسبة %'), h('input', { value: String(x.pct), inputmode: 'numeric', onchange: e => act(() => L.setLimit(S, x.g, Number(L.norm(e.target.value))), 'حُفظ الحد') })))))
    : tab === 'month' ? h('div', {}, h('label', { class: 'f' }, h('span', {}, 'الشهر'), h('select', { onchange: e => nav({ k: e.target.value }) }, ms.map(m => h('option', { value: m, selected: m === k }, mName(m))))),
        k === L.mkey(L.today()) ? monthCard() : null, sect('الخُردة والمطابقة', row(ti('الخُردة هذا الشهر', 'المطابقة'), money(K.s), K.s ? 'bad' : ''), K.u ? row('مبالغ غير مسجّلة وُجدت', money(K.u)) : null, h('p', { class: 'mut' }, 'من «طابق الرصيد». لا تدخل في المصروف، وتظهر في جسر صافي الثروة كفروقات مطابقة.')), monthView(k))
    : stripHead(wrapScreen(p.k));
  return h('div', {}, backBtn(() => go('insights')), h('h1', {}, 'شهري'), stale.length ? sect('أشهر تغيّرت بعد إغلاقها', stale.map(m => h('div', { class: 'r' }, h('span', {}, m + ' (' + sgn(S.x.snaps[m].stale.diff) + ')'), btn('اعتمد', () => act(() => L.acceptSnap(S, m), 'اعتُمد'), 'mini')))) : null,
    seg([['card', 'بطاقة الشهر'], ['month', 'التفاصيل'], ['year', 'سنوي'], ['limits', 'الحدود']], tab, t => go('insights', 'wrap', { tab: t, k: p.k, y })), body,
    sect('', h('button', { type: 'button', class: 'lnk srow', onclick: () => go('more', 'badges') }, h('span', {}, '🏅 إنجازاتي'), h('b', { class: 'sv' }, got + ' من ' + BADGES.length)))); }
// ---- المستشار الموحّد: المال والسوق (من advItems) + المسار المالي ----
function advisorAll() { const el = advisorScreen(); let A = []; try { A = pathAdv(60); } catch (e) {}
  if (A.length && !S.x.set.hideAdvice) el.append(sect('من المسار المالي (5 سنوات)', A.slice(0, 5).map(a => h('div', { class: 'adv a-' + (a.lv === 'info' ? 'info' : a.lv) }, h('b', {}, ADVT.dial[a.k] || ''), h('p', { class: 'advt' }, a.body), a.step ? h('p', { class: 'mut' }, 'الخطوة: ' + a.step) : null)),
    btn('افتح المسار المالي', () => go('insights', 'path'), 'alt mini')));
  return el; }
// ---- قراراتي ----
const DEC_DAYS = [90, 365];
function decLabel(t) { const d = L.listTx(S).find(x => x.id === t.id); return (d ? d.label : t.type) + (t.note ? ' · ' + t.note : ''); }
function decOutcome(t) { const ps = postsOf(t.id), days = Math.floor((Date.parse(L.today()) - Date.parse(t.date)) / 864e5);
  if (t.type === 'buy_metal' || t.type === 'sell_metal') { const p = S.pieces[t.meta && t.meta.piece]; if (!p) return null; const then = E.metalIqd(p.mg, p.fine, (L.priceAt(S, t.date) || S.price)[p.metal], L.rateAt(S, t.date) || S.rate), now = E.metalIqd(p.mg, p.fine, S.price[p.metal], S.rate);
    const ch = then ? (now / then - 1) * 100 : 0; return { days, txt: 'قيمة القطعة المعدنية: ' + money(then) + ' يومها ← ' + money(now) + ' اليوم (' + (ch >= 0 ? '+' : '') + ch.toFixed(1) + '%)', good: t.type === 'buy_metal' ? ch >= 0 : ch <= 0 }; }
  if (isConvert(t)) { const r0 = L.rateAt(S, t.date) || S.rate, r1 = S.rate, toUsd = ps.some(p => S.acc[p.a].cur === 'USD' && p.n > 0), ch = (r1 / r0 - 1) * 100;
    return { days, txt: 'سعر 100 دولار: ' + L.fmtRate(r0) + ' يومها ← ' + L.fmtRate(r1) + ' اليوم (' + (ch >= 0 ? '+' : '') + ch.toFixed(1) + '%)', good: toUsd ? ch >= 0 : ch <= 0 }; }
  return { days, txt: null, good: null }; }
function decDue() { const out = []; decs().forEach(d => { const t = S.tx.find(x => x.id === d.tx); if (!t || t.voided) return; const days = Math.floor((Date.parse(L.today()) - Date.parse(t.date)) / 864e5);
  DEC_DAYS.forEach(n => { if (days >= n && !(d.seen || []).includes(n)) out.push({ tx: d.tx, n, label: decLabel(t), when: n === 90 ? 'بعد 3 أشهر' : 'بعد سنة' }); }); }); return out; }
const decSave = (tx, patch) => act(() => { const L0 = (S.x.set.decs || []).slice(), i = L0.findIndex(d => d.tx === tx); if (i < 0) L0.push({ tx, why: '', at: L.today(), ...patch }); else L0[i] = { ...L0[i], ...patch }; S.x.set.decs = L0; }, 'حُفظ');
function decisionsScreen() { const focus = view.p.tx, since = daysAgo(120), D = decs(), due = decDue();
  const pend = S.tx.filter(t => t.date >= since && txBig(t.id) && !decOfTx(t.id)).slice().reverse();
  const whyForm = (t, cur) => { const ta = h('textarea', { rows: 2, placeholder: 'مثلاً: الذهب نازل وأتوقع أن يرجع', style: 'width:100%;font:inherit;font-size:16px;padding:10px;border-radius:var(--rb);border:1px solid var(--line);background:var(--soft);color:var(--ink)' }, cur || '');
    if (focus === t.id) setTimeout(() => { try { ta.focus(); } catch (e) {} }, 50);
    return h('div', { class: 'dwhy' }, ta, btn('احفظ السبب', () => { const v = ta.value.trim(); if (!v) return toast('اكتب سببك بكلمات قليلة', true); decSave(t.id, { why: v }); }, 'mini')); };
  const head = t => h('div', { class: 'r' }, h('span', {}, t.date + ' · ' + decLabel(t)), h('b', {}, money(txAmt(t.id))));
  return h('div', {}, backBtn(() => go('insights')), h('h1', {}, 'قراراتي'), h('p', { class: 'mut' }, 'سجّل لماذا قررت وقت القرار، قبل أن تعرف النتيجة. بعد 3 أشهر وبعد سنة يُريك التطبيق ما حدث، فتعرف أين تحكم جيداً وأين تتسرع. اختياري تماماً.'),
    due.length ? sect('حان موعد نتيجتها', due.map(x => { const t = S.tx.find(y => y.id === x.tx), o = decOutcome(t), d = decOfTx(x.tx);
      return h('div', { class: 'tx' }, head(t), h('p', {}, '«' + d.why + '»'), o && o.txt ? h('p', { class: o.good ? 'okc' : 'badc' }, x.when + ': ' + o.txt) : h('p', { class: 'mut' }, x.when + ': كيف تراه الآن؟'),
        h('div', { class: 'quick' }, !(o && o.txt) ? btn('👍 كان صائباً', () => decSave(x.tx, { rate: 'good', seen: [...(d.seen || []), x.n] }), 'mini') : null, !(o && o.txt) ? btn('👎 لم يكن', () => decSave(x.tx, { rate: 'bad', seen: [...(d.seen || []), x.n] }), 'mini alt') : null,
          o && o.txt ? btn('اطّلعت', () => decSave(x.tx, { seen: [...(d.seen || []), x.n] }), 'mini alt') : null)); })) : null,
    sect('بانتظار سببك', pend.length ? pend.map(t => h('div', { class: 'tx' + (focus === t.id ? ' dfocus' : '') }, head(t), whyForm(t))) : h('p', { class: 'mut' }, 'لا عمليات كبيرة بلا سبب. العمليات الكبيرة: شراء أو بيع ذهب أو أسهم، تحويل بين الدينار والدولار، أو مصروف أو تحويل من ' + money(BIG_IQD) + ' فأكثر.')),
    sect('قراراتي (' + D.length + ')', D.length ? D.slice().reverse().map(d => { const t = S.tx.find(y => y.id === d.tx); if (!t) return null; const o = decOutcome(t);
      return h('div', { class: 'tx' }, head(t), h('p', {}, '«' + (d.why || '—') + '»'), o && o.txt ? h('p', { class: 'mut' }, (o.days >= 90 ? 'حتى اليوم: ' : 'النتيجة بعد 3 أشهر. حتى الآن: ') + o.txt) : d.rate ? h('p', { class: 'mut' }, 'تقييمك: ' + (d.rate === 'good' ? '👍 كان صائباً' : '👎 لم يكن')) : h('p', { class: 'mut' }, 'يُسألك عنه بعد 3 أشهر.'),
        h('details', {}, h('summary', {}, 'عدّل السبب'), whyForm(t, d.why))); }) : h('p', { class: 'mut' }, 'لا قرارات مكتوبة بعد.')),
    D.filter(d => d.rate).length >= 3 ? sect('حصيلتك', row('قرارات رأيتها صائبة', D.filter(d => d.rate === 'good').length + ' من ' + D.filter(d => d.rate).length)) : null); }
// ---- الشاشة ----
SCREENS.insights = (sub) => {
  if (sub === 'buy' || sub === 'whatif') return beforeSpend(sub);
  if (sub === 'advisor') return advisorAll();
  if (sub === 'path') return pathScreen(view.p.h);
  if (sub === 'wrap') return shahri();
  if (sub === 'decisions') return decisionsScreen();
  if (!S.x.openDate) return h('div', {}, h('h1', {}, 'تحليلاتي'), sect('المسار المالي', emptyState('🌴', 'يظهر بعد تسجيل الرصيد الافتتاحي', 'المسار المالي (آلة الزمن، رحلتك المالية، نخلتك المالية) وكل تحليلاتك تُحسب من أرقامك الفعلية. سجّل ما تملكه اليوم لتبدأ.', ['سجّل الرصيد الافتتاحي', () => go('accts', 'open')])),
    sect('', h('div', { class: 'quick' }, btn('قبل أن تصرف', () => go('insights', 'buy'), 'alt'), btn('قائمة الرغبات', () => go('more', 'wish'), 'alt'))));
  if (!NB.tried) { NB.tried = true; Promise.all([FN.load(), FN.loadAux()]).then(() => { if (['home', 'nabd', 'insights'].includes(view.tab)) render(); }); }
  const M = insightsMain(), per = view.p.per || 'y', nDec = decDue().length;
  // insightsMain: [0] الفترة، [1] أزرار قديمة، [2] منحنى صافي الثروة القديم — يُستبدلان بالأزرار الجديدة و«خط ثروتك»
  return h('div', {}, h('h1', {}, 'تحليلاتي'), M[0], wealthLine(per), pathCard(),
    sect('', h('div', { class: 'igrid' }, [['🧾', 'قبل أن تصرف', () => go('insights', 'buy')], ['🎴', 'شهري', () => go('insights', 'wrap')], ['💡', 'المستشار', () => go('insights', 'advisor')], ['🧭', 'قراراتي' + (nDec ? ' (' + nDec + ')' : ''), () => go('insights', 'decisions')]]
      .map(([i, t, f]) => h('button', { type: 'button', class: 'itile', onclick: f }, h('i', {}, i), h('span', {}, t))))), ...M.slice(3)); };
