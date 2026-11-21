// f1-v4.14: مكيّف من p9test.mjs (اختبار f1-v4.12 (أرشيف السوق ومحرك الاكتشافات وبطاقة المسار) + اختبار f1-v4.11 (نبض السوق الجديد) فوق اختبار p7 كاملاً: الترقية من f1-v4.10، ثم البوابة الجديدة. بيانات تجريبية فقط.
globalThis.__extra = async ({ ev, page, W, txt, ok, eq, ids }) => {
  await ev(async () => { await Promise.all([FN.load(true), FN.loadAux(true)]); });
  const rf = await ev(() => FN.ref()); ok(rf && rf.kind === 'calc' && rf.value === Math.round((rf.buy + rf.sell) / 2), 'ref = mid of buy/sell', rf);
  const u = await ev(() => { const g = FN.ind('xau_usd').value, r = FN.ref().value; return { m: FP.unit('m21').iqd, x: Math.round(g * 4.375 / 31.1034768 * r / 100) }; }); eq(u.m, u.x, 'mithqal 21 = ounce × 4.375/31.1035 × ref');
  const BAN = ['Gold-API', 'FRED', 'Shafaq', 'شفق', 'CFTC', 'مسح السوق', 'المصدر:', 'Swissquote', 'Frankfurter', 'البنك المركزي الأوروبي', 'شارع النهر', 'المصنعية', 'الصائغ'];
  for (const t of ['now', 'why', 'mine']) { await ev(t => go('nabd', null, { t }), t); await W(); const x = await txt();
    ok(!BAN.some(b => x.includes(b)), 'no sources / local gold in ' + t, BAN.filter(b => x.includes(b)));
    ok(!x.includes('تعذّر'), 'tab renders ' + t); }
  await ev(() => go('nabd', null, { t: 'now' })); await W(); const now = await txt();
  ok(now.includes('مثقال ذهب 21') && now.includes('مثقال ذهب 24') && now.includes('غرام ذهب 21') && now.includes('غرام ذهب 24') && now.includes('كيلو فضة 999') && now.includes('أونصة ذهب'), 'all units shown');
  ok(now.includes('السعر المرجعي') && now.includes('البيع / الشراء') && now.includes('السعر الرسمي'), 'dollar rows');
  ok(await ev(() => document.querySelectorAll('#app button.kb').length) >= 8, 'kind badges present');
  ok(await ev(() => [...document.querySelectorAll('#app button.kb')].every(b => ['مرصود', 'محسوب', 'مقدّر', 'نموذجنا'].includes(b.textContent))), 'badge labels');
  await page.click('#app button.kb.k-obs'); await W(); const tip = await ev(() => { const t = document.querySelector('#tipbox'); return t && !t.hidden ? t.textContent : ''; });
  ok(tip.includes('مرصود') && tip.includes('الحالة') && tip.includes('آخر تحديث') && !tip.includes('Gold'), 'badge tap → kind + time, no source', tip); await ev(() => { const t = document.querySelector('#tipbox'); if (t) t.hidden = true; });
  ok(!!(await ev(() => document.querySelector('.gapm .gmt i'))), 'gap meter');
  // أسماء التبويبات القديمة
  for (const [o, n] of [['analysis', 'تفكيك حركة المثقال'], ['news', 'تفكيك حركة المثقال'], ['prices', 'الذهب والفضة بالدينار']]) { await ev(o => go('nabd', null, { t: o }), o); await W(); ok((await txt()).includes(n), 'old tab ' + o + ' maps'); }
  // لماذا تحرّك
  await ev(() => go('nabd', null, { t: 'why' })); await W(); const why = await txt();
  ok(why.includes('القوى المؤثرة') && why.includes('الاقتصاد الأمريكي') && why.includes('الذاكرة') && why.includes('ليست توقعاً'), 'why sections');
  const dd = await ev(() => FP.decompose('d')); if (dd.ok) { ok(Math.abs((Math.exp((dd.fromOunce + dd.fromDollar) / 100) - 1) * 100 - dd.total) < 0.011, 'decomposition adds up', dd); ok(why.includes('من الأونصة') && why.includes('من الدولار'), 'decomposition shown'); }
  else ok(why.includes('لا تكفي البيانات') || why.includes('قديم'), 'decomposition honest when unavailable', dd.why);
  await page.click('.seg button:has-text("شهر")'); await W(); ok((await txt()).includes('شهر'), 'window switch');
  // أموالي: الأثر (بلا تعرّض ثم مع ذهب ودولار)
  await ev(() => go('nabd', null, { t: 'mine' })); await W(); ok((await txt()).includes('لا ذهب ولا فضة ولا دولار'), 'impact: no exposure');
  await ev(async () => { const c = Object.values(S.acc).find(a => a.name === 'نقد').id; await act(() => { L.setPrices(S, '2026-09-01', { G: 400000, S: 5000 }); L.buyPiece(S, { date: L.today(), metal: 'G', karat: 21, mg: 10000, from: c, paid: 1700000 }); }); });
  await ev(() => go('nabd', null, { t: 'mine' })); await W(); const im = await ev(() => FP.impact(S)), mt = await txt();
  ok(im.d ? mt.includes('ثروتك تغيّرت بسبب السوق') && (im.d.gold ? mt.includes('من ذهبك') : !mt.includes('من ذهبك')) : (im.noBase ? mt.includes('لا يوجد إغلاق سابق') : mt.includes('بيانات قديمة')), 'impact shown honestly', im);
  ok(mt.includes('راتبك بالمثقال والدولار') && mt.includes('مثقال ذهب 21'), 'salary in mithqal shown');
  const sp = await ev(() => FP.salaryPower(S)); ok(sp.last && sp.last.mithqal === Math.round(sp.last.salary / sp.last.m21 * 100) / 100 || Math.abs(sp.last.mithqal - sp.last.salary / sp.last.m21) < 0.01, 'salary mithqal math', sp.last);
  // التنبيهات من الواجهة
  await page.locator('label.f', { hasText: 'الحد' }).locator('input').fill('100,000'); await page.click('button:has-text("أضف التنبيه")'); await W();
  ok(await ev(() => (S.x.set.palerts || []).length === 1 && S.x.set.palerts[0].k === 'usd' && S.x.set.palerts[0].v === 100000), 'alert saved in settings');
  ok((await txt()).includes('🔔'), 'alert hit marked');
  await page.click('button:has-text("أضف التنبيه")'); await W(); ok(await ev(() => S.x.set.palerts.length === 1), 'empty limit rejected');
  await ev(() => go('home')); await W(); const tk = await ev(() => [...document.querySelectorAll('.upn')].map(t => t.textContent).join(' | '));
  const live = await ev(() => FN.ref() && FN.ref().live === 'current');
  ok(live ? tk.includes('🔔') && tk.includes('الدولار') : !tk.includes('🔔'), 'alert in «يهمّك الآن» (only with current price)', tk);
  if (live) { const i = await ev(() => [...document.querySelectorAll('.upn')].findIndex(x => x.textContent.includes('🔔'))); if (i >= 3) await page.click('summary:has-text("المزيد")'); await page.click('.upn:has-text("🔔") button.upnb'); await W(); ok(await ev(() => view.tab === 'nabd' && view.p.t === 'mine'), 'line tap → mine'); } else { await ev(() => go('nabd', null, { t: 'mine' })); await W(); ok(true, 'line tap n/a (stale)'); }
  await page.click('#app button:has-text("حذف")'); await W(); ok(await ev(() => (S.x.set.palerts || []).length === 0), 'alert deleted');
  await ev(() => go('home')); await W(); ok(!(await ev(() => [...document.querySelectorAll('.upn')].map(t => t.textContent).join(''))).includes('🔔'), 'no alert after delete');
  // سعر الصرف من نبض السوق: المرجعي وبلا مصدر
  await ev(() => go('nabd', null, { t: 'now', open: 'prices' })); await W(); const rb = page.locator('button:has-text("اعتمد سعر نبض السوق")').first();
  if (await rb.count()) { await rb.click(); await page.waitForTimeout(400); const c = await txt(); ok(c.includes('سعر الدولار المرجعي') && !c.includes('المصدر'), 'rate button: reference, no source');
    await page.click('button:has-text("إلغاء")'); await W(); } else ok(true, 'rate button n/a');
  // إشعار FRED في صفحة الإصدار فقط
  await ev(() => go('more', 'settings', { k: 'version' })); await W(); const vt = await txt(); ok(vt.includes(process.env.NEWVER), 'version page');
  eq((await ev(() => L.integrity(S))).length, 0, 'integrity after nabd tests');
  // ===== f1-v4.12: أرشيف السوق ومحرك الاكتشافات =====
  await ev(() => { localStorage.removeItem('flousi-disc'); go('nabd', null, { t: 'why' }); }); await W();
  await page.click('button:has-text("أرشيف السوق ومحرك الاكتشافات")'); await W(); let at = await txt();
  ok(at.includes('أرشيف السوق') && at.includes('محرك الاكتشافات (تجريبي)') && at.includes('الأيام المتجمّعة من 90') && at.includes('لا ينفع قبل'), 'archive page', at.slice(0, 200));
  ok(await ev(() => !S.x.set.discOn), 'engine off by default');
  await page.click('#app button.swt'); await W(); ok(await ev(() => S.x.set.discOn === true), 'engine switched on (saved in settings)');
  ok((await txt()).includes('المحرك مفعّل وسيبدأ وحده'), 'on but waiting message'); ok(await ev(() => localStorage.getItem('flousi-disc') === null), 'no run before 90 days');
  // بيانات مصطنعة 200 يوم لاختبار العرض فقط (لا تُحفظ)
  const ran = await ev(() => { const aux = FN.aux(), orig = aux.history; let g = 3000, s = 35, r = 150000, dx = 100, seed = 5; const rnd = () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }, ga = () => { let u = 0; for (let i = 0; i < 12; i++) u += rnd(); return u - 6; };
    const days = {}; for (let i = 0; i < 200; i++) { const d = new Date(Date.parse('2026-01-01') + i * 864e5).toISOString().slice(0, 10), gr = 0.01 * ga(); g *= Math.exp(gr); s *= Math.exp(1.6 * gr + 0.004 * ga()); dx *= Math.exp(-0.5 * gr + 0.003 * ga()); r *= Math.exp(0.002 * ga()); days[d] = { xau_usd: g, xag_usd: s, usd_iqd_ref: Math.round(r), usd_iqd_official: 1510, dxy: dx }; }
    window.__orig = orig; aux.history = { ...orig, days }; go('nabd', null, { t: 'archive' }); return true; }); await W();
  at = await txt(); const lg = await ev(() => JSON.parse(localStorage.getItem('flousi-disc') || 'null'));
  ok(lg && lg.lastScan && lg.lastScan.tested > 0 && Object.keys(lg.items).length >= 1 && Object.keys(lg.items).length <= 3, 'engine ran with ≥90 days, ≤3 cards', lg && lg.lastScan);
  ok(at.includes('اجتاز الضوابط') && at.includes('الفضة مقابل الذهب') && at.includes('ليس توقعاً') && at.includes('بعد 30 يوماً: لم يحن'), 'discovery cards shown', at.slice(-400));
  await page.click('#app button.swt'); await W(); ok(await ev(() => S.x.set.discOn === false), 'engine switched off');
  await ev(() => { FN.aux().history = window.__orig; localStorage.removeItem('flousi-disc'); });
  eq((await ev(() => L.integrity(S))).length, 0, 'integrity after archive tests');
};
await import('./p7v14.mjs');
