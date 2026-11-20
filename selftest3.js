'use strict';
// فلوسي — اختبارات f1-v3: تحليلاتي، «هل أشتري؟»، تحليل هدف المدخرات، والمستشار. تعمل في Node وداخل التطبيق، ولا تمس بياناتك (قاعدة مؤقتة في الذاكرة).
const FSelfTest3 = (() => {
  const inApp = typeof FE !== 'undefined';
  const G = inApp ? { L: FL, St: FStore, M: FM, A: typeof FA !== 'undefined' ? FA : null } : { L: require('./logic.js'), St: require('./store.js'), M: require('./mind.js'), A: (() => { try { return require('./advisor.js'); } catch (e) { return null; } })() };
  const { L, St, M } = G, tests = [], T = (name, fn) => tests.push({ name, fn });
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'قيمة') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); };
  const ok = (c, m) => { if (!c) throw new Error(m || 'شرط غير متحقق'); };
  const today = '2026-11-20';
  const seed = async (opt = {}) => { const be = St.mem(), S = await St.load(be);
    await St.run(be, S, () => { L.setRate(S, '2026-06-01', 15000000); L.opening(S, '2026-06-01', [{ name: 'نقد', type: 'asset_cash', amount: opt.cash ?? 5000000 }, { name: 'بيت', type: 'other', amount: 20000000 }]); });
    const cash = Object.values(S.acc).find(a => a.name === 'نقد').id;
    for (const m of ['2026-07', '2026-08', '2026-09', '2026-10']) await St.run(be, S, () => { L.income(S, { date: m + '-05', acct: cash, src: 'inc_salary', amount: 2000000 }); L.expense(S, { date: m + '-10', acct: cash, cat: 'c_food', amount: 600000 }); L.expense(S, { date: m + '-12', acct: cash, cat: 'c_ent', amount: 200000 }); });
    if (opt.recur) await St.run(be, S, () => L.recurNew(S, { kind: 'income', name: 'الراتب', amount: 2500000, acct: cash, src: 'inc_salary', day: 5, remind: 2, salary: true }));
    return { be, S, cash }; };
  T('الراتب: من المتكرر المعلَّم «راتب»', async () => { const { S } = await seed({ recur: true }); eq(M.salary(S, today), { amount: 2500000, from: 'recurring' }); });
  T('الراتب: متوسط آخر 3 أشهر مكتملة عند غياب المتكرر', async () => { const { S } = await seed(); eq(M.salary(S, today), { amount: 2000000, from: 'average' }); });
  T('الأشهر: الدخل والمصروف ونسبة الادخار', async () => { const { S } = await seed(); const ms = M.months(S, 12, today), oct = ms.find(m => m.k === '2026-10');
    eq([oct.income, oct.expense, oct.savings, oct.rate], [2000000, 800000, 1200000, 60]); eq(ms[ms.length - 1].k, '2026-11'); ok(ms[0].k === '2026-06', 'يبدأ من شهر الافتتاح'); });
  T('صافي الثروة الشهري يطابق التقرير الرسمي', async () => { const { S } = await seed(); const ms = M.months(S, 12, today); ms.forEach(m => eq(m.nw, L.monthReport(S, m.k).nw1, m.k)); });
  T('توزيع الأصول: المجموع = مجموع الأصول، والنسب 100%', async () => { const { S } = await seed(); const a = M.alloc(S); eq(a.total, 5000000 + 4 * 1200000 + 20000000);
    const s = a.parts.reduce((t, p) => t + p.p, 0); ok(Math.abs(s - 100) < 0.5, 'مجموع النسب ' + s); });
  T('تحليل هدف المدخرات: كبير / صغير / متوازن / غير واقعي', async () => { const { S } = await seed({ recur: true });
    eq(M.goalAdviceText(S, 12000000, '2027-05-20', today).lv, 'warn'); eq(M.goalAdviceText(S, 300000, '2027-11-20', today).lv, 'info');
    eq(M.goalAdviceText(S, 6000000, '2027-11-20', today).lv, 'ok'); eq(M.goalAdviceText(S, 9000000, '2027-01-10', today).lv, 'red'); });
  T('هل أشتري: مبلغ صغير = مناسب', async () => { const { S } = await seed({ recur: true }); const r = M.buyCheck(S, { amount: 100000, type: 'fun' }, today); eq(r.lv, 'ok'); ok(r.extra.some(t => t.includes('الترفيه')), 'مقارنة بالترفيه'); });
  T('هل أشتري: أكبر من السيولة = غير مناسب', async () => { const { S } = await seed({ recur: true }); const r = M.buyCheck(S, { amount: 99000000, type: 'personal' }, today); eq(r.lv, 'red'); });
  T('هل أشتري: أكبر من راتب = بحذر', async () => { const { S } = await seed({ recur: true }); const r = M.buyCheck(S, { amount: 3000000, type: 'travel' }, today); eq(r.lv, 'warn'); ok((r.head + r.notes.join()).includes('48 ساعة'), 'نصيحة الانتظار'); });
  T('هل أشتري: من المدخرات تحت 3 رواتب = غير مناسب', async () => { const { be, S } = await seed({ recur: true });
    const id = await St.run(be, S, () => L.goalNew(S, { name: 'مدخرات', target: 15000000, targetDate: '2027-12-31', priority: 1, kind: 'long' })); await St.run(be, S, () => { L.goalMove(S, { id, amount: 8000000, date: today }); S.x.set.savingsGoal = id; });
    const r = M.buyCheck(S, { amount: 2000000, type: 'personal', from: 'savings' }, today); eq(r.lv, 'red'); ok(r.from === 'savings'); });
  T('هل أشتري: مبلغ صفر مرفوض', async () => { const { S } = await seed(); let e = null; try { M.buyCheck(S, { amount: 0, type: 'fun' }, today); } catch (x) { e = x; } ok(e, 'لم يُرفض'); });
  T('الحسابات لا تكتب في البيانات', async () => { const { S } = await seed({ recur: true }); const before = JSON.stringify({ tx: S.tx.length, x: S.x }); M.alloc(S); M.months(S); M.buyCheck(S, { amount: 500000, type: 'gold', grams: 5 }, today); M.goalAdviceText(S, 1e6, '2027-01-01', today); eq(JSON.stringify({ tx: S.tx.length, x: S.x }), before); });
  if (G.A) {
    const A = G.A;
    T('المستشار: يعمل على بيانات تجريبية ويُرجع استشارات مرتبة بالشدة', async () => { const { S } = await seed({ recur: true }); const r = A.run(S, {}, today); ok(r.items.length > 0, 'لا استشارات'); const o = { red: 0, warn: 1, ok: 2, info: 3 }; for (let i = 1; i < r.items.length; i++) ok(o[r.items[i - 1].lv] <= o[r.items[i].lv], 'الترتيب'); });
    T('المستشار: لا أرقام فارغة ولا «undefined» في النصوص', async () => { const { S } = await seed({ recur: true }); A.run(S, {}, today).items.forEach(x => ok(!/undefined|NaN|\{[a-z]+\}/.test(x.text + x.title), x.id + ': ' + x.text)); });
    T('المستشار: الصيغة تتبدّل ولا تتكرر مرتين متتاليتين', async () => { const { S } = await seed({ recur: true }); let st = {}; const a = A.run(S, st, today); st = a.state; const id = a.items[0].id, t1 = a.items[0].text;
      const b = A.run(S, { ...st, seen: {} }, '2026-11-21'); const x = b.items.find(i => i.id === id); ok(!x || x.text !== t1 || A.variants(id) < 2, 'تكررت الصيغة'); });
    T('المستشار: الإخفاء بعد الرؤية ثم العودة بعد المدة', async () => { const { S } = await seed({ recur: true }); const a = A.run(S, {}, today), it = a.items.find(i => i.id === 'S0'); ok(it, 'لا توجد S0');
      const st = A.markSeen(a.state, it.id, today, it.sev); ok(!A.run(S, st, today).items.some(i => i.id === it.id), 'لم يُخفَ'); const later = L.iso(new Date(Date.parse(today) + (it.hide + 1) * 864e5)); ok(A.run(S, st, later).items.some(i => i.id === it.id), 'لم يعد'); });
    T('المستشار: الطوارئ تُقاس بهدف المستخدم لا برقم ثابت', async () => { const { be, S } = await seed({ recur: true }); const id = await St.run(be, S, () => L.goalNew(S, { name: 'مدخرات', target: 5000000, targetDate: '2027-12-31', priority: 1, kind: 'long' }));
      await St.run(be, S, () => { L.goalMove(S, { id, amount: 5000000, date: today }); S.x.set.savingsGoal = id; }); const r = A.run(S, {}, today); ok(r.items.some(x => x.id === 'S4'), 'اكتمال الهدف = تجميع'); });
    T('المستشار: نسبة المعادن لا تُقيَّم إن لم يحددها المستخدم', async () => { const { S } = await seed({ recur: true }); ok(!A.run(S, {}, today).items.some(x => x.id === 'P4' || x.id === 'P5'), 'ظهرت دون تحديد'); });
  }
  async function run() { const results = []; for (const t of tests) { try { await t.fn(); results.push({ id: 'v3', name: t.name, ok: true }); } catch (e) { results.push({ id: 'v3', name: t.name, ok: false, msg: e.message || String(e) }); } }
    return { results, passed: results.filter(r => r.ok).length, total: results.length }; }
  return { run };
})();
if (typeof module !== 'undefined') module.exports = FSelfTest3;
