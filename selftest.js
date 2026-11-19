'use strict';
// فلوسي — المرحلة 1: الاختبارات الـ17 (القسم 9 من الوثيقة 3.0) + اختبارات إضافية. القيم المتوقعة هي المعتمدة في الوثيقة.
const FSelfTest = (() => {
  const E = typeof FE !== 'undefined' ? FE : require('./engine.js');
  const mk = () => { const S = E.create();
    [['cash', 'asset', 'IQD', true], ['visa', 'asset', 'IQD', true], ['usd', 'asset', 'USD', true], ['gold', 'asset', 'IQD', false, 'G'], ['silver', 'asset', 'IQD', false, 'S'],
     ['recv', 'asset'], ['jam_a', 'asset'], ['pay', 'liab'], ['jam_l', 'liab'], ['eq', 'equity'], ['salary', 'income'], ['food', 'expense'], ['fee', 'expense'],
     ['pnlm', 'pnlm'], ['recon', 'recon']].forEach(a => E.addAcc(S, ...a));
    return S; };
  const R = (S, k) => ({ cash: E.bal(S, 'cash'), visa: E.bal(S, 'visa'), usd: E.bal(S, 'usd'), recv: E.bal(S, 'recv'), pay: -E.bal(S, 'pay'), jam_a: E.bal(S, 'jam_a'), jam_l: -E.bal(S, 'jam_l') })[k];
  const R14 = 15100000, R15 = 15200000; // 1510 و1520

  // كل خطوة: العملية + القيم المتوقعة بعدها
  const steps = [
    ['رصيد افتتاحي', S => E.opening(S, '2026-01-01', [{ a: 'cash', n: 5000000 }, { a: 'visa', n: 1000000 }, { a: 'usd', n: 100000, r: 14800000 }], 'eq'),
      { cash: 5000000, visa: 1000000, usd: 100000, usdCost: 1480000, eq: 7480000, nw: 7500000, nwc: 7480000, U: 20000, inc: 0, exp: 0, real: 0 }, true],
    ['دخل: راتب 1,500,000 إلى الفيزا', S => E.post(S, '2026-01-05', 'income', [{ a: 'visa', n: 1500000 }, { a: 'salary', n: -1500000 }]), { visa: 2500000, inc: 1500000, nw: 9000000 }],
    ['مصروف: أكل 200,000 من النقد', S => E.post(S, '2026-01-06', 'expense', [{ a: 'food', n: 200000 }, { a: 'cash', n: -200000 }]), { cash: 4800000, exp: 200000, nw: 8800000 }],
    ['تحويل داخلي: 500,000 فيزا إلى نقد', S => E.post(S, '2026-01-07', 'transfer', [{ a: 'cash', n: 500000 }, { a: 'visa', n: -500000 }]), { cash: 5300000, visa: 2000000, inc: 1500000, exp: 200000, nw: 8800000 }],
    ['شراء ذهب: 10 غ عيار 21 بـ 1,800,000', S => E.buyMetal(S, '2026-01-08', { id: 'G1', metal: 'G', mg: 10000, fine: 8750, from: 'cash', to: 'gold', paid: 1800000 }), { cash: 3500000, gold: 1687920, nw: 8687920 }],
    ['شراء فضة: 100 غ نقاوة 925 بـ 250,000', S => E.buyMetal(S, '2026-01-09', { id: 'S1', metal: 'S', mg: 100000, fine: 9250, from: 'cash', to: 'silver', paid: 250000 }), { cash: 3250000, silver: 223050, nw: 8660970 }],
    ['تغيير الأسعار: صرف 1520، ذهب 4100، فضة 52 (لا عملية)', S => { S.rate = R15; S.price = { G: 410000, S: 5200 }; },
      { gold: 1753183, silver: 235068, nw: 8758251, U: -21749, inc: 1500000, exp: 200000, real: 0 }],
    ['بيع الذهب بـ 1,700,000', S => E.sellMetal(S, '2026-01-12', { id: 'G1', to: 'cash', proceeds: 1700000, pnl: 'pnlm' }), { cash: 4950000, gold: 0, real: -100000, nw: 8705068, U: 25068 }],
    ['بيع الفضة بـ 230,000', S => E.sellMetal(S, '2026-01-13', { id: 'S1', to: 'cash', proceeds: 230000, pnl: 'pnlm' }), { cash: 5180000, silver: 0, real: -120000, nw: 8700000, U: 40000 }],
    ['إقراض علي 300,000 واقتراض من بكر 1,000,000', S => { E.post(S, '2026-01-14', 'lend', [{ a: 'recv', n: 300000 }, { a: 'cash', n: -300000 }]); E.post(S, '2026-01-14', 'borrow', [{ a: 'cash', n: 1000000 }, { a: 'pay', n: -1000000 }]); },
      { cash: 5880000, recv: 300000, pay: 1000000, nw: 8700000, inc: 1500000, exp: 200000 }],
    ['سداد: علي 100,000، وسداد بكر 400,000 + رسوم 20,000', S => { E.post(S, '2026-01-15', 'repay_in', [{ a: 'cash', n: 100000 }, { a: 'recv', n: -100000 }]);
      E.post(S, '2026-01-15', 'repay_out', [{ a: 'pay', n: 400000 }, { a: 'cash', n: -400000 }]); E.post(S, '2026-01-15', 'expense', [{ a: 'fee', n: 20000 }, { a: 'cash', n: -20000 }]); },
      { cash: 5560000, recv: 200000, pay: 600000, exp: 220000, nw: 8680000 }],
    ['تخصيص 1,000,000 لهدف', S => E.goalAlloc(S, 'هدف', 1000000), { liq: 9080000, avail: 8080000, nw: 8680000, cash: 5560000 }],
    ['مصروف 50 دولاراً بسعر 1520', S => E.post(S, '2026-01-20', 'expense', [{ a: 'food', n: 76000 }, { a: 'usd', n: -5000, r: R15 }]), { usd: 95000, usdCost: 1406000, exp: 296000, real: -118000, nw: 8604000 }],
    ['تحويل 300 دولار إلى 453,000 دينار (سعر فعلي 1510)', S => E.post(S, '2026-01-21', 'convert', [{ a: 'cash', n: 453000 }, { a: 'usd', n: -30000, r: R14 }]),
      { usd: 65000, usdCost: 962000, cash: 6013000, real: -109000, nw: 8601000 }],
    ['جمعية: 5 أعضاء، القسط 200,000، دوري الشهر الثالث', S => { E.post(S, '2026-01-25', 'jam_pay', [{ a: 'jam_a', n: 600000 }, { a: 'cash', n: -600000 }]);
      E.jamReceive(S, '2026-01-26', { cash: 'cash', asset: 'jam_a', liab: 'jam_l', N: 5, s: 200000, k: 3 }); }, { cash: 6413000, jam_a: 0, jam_l: 400000, nw: 8601000, inc: 1500000, exp: 296000 }],
    ['مطابقة النقد: العدّ الفعلي 6,403,000', S => E.reconcile(S, '2026-01-28', 'cash', 6403000, 'recon'), { cash: 6403000, adj: -10000, nw: 8591000 }],
    ['انخفاض الصرف وحده إلى 1490', S => { S.rate = 14900000; }, { nw: 8571500, U: 6500, nwc: 8565000, liq: 9371500, avail: 8371500, cash: 6403000, usdCost: 962000, real: -109000, adj: -10000 }],
  ];

  function run() {
    const out = [], S = mk(); let prev = null;
    steps.forEach(([name, fn, exp, first], i) => {
      const id = i + 1; let ok = true, msg = '';
      try {
        fn(S); const s = E.snap(S), bad = [];
        for (const k in exp) { const got = ['cash', 'visa', 'usd', 'recv', 'pay', 'jam_a', 'jam_l'].includes(k) ? R(S, k) : s[k]; if (got !== exp[k]) bad.push(`${k}: ${got} ≠ ${exp[k]}`); }
        if (!E.identity(s)) bad.push('الهوية الدفترية مختلة');
        if (prev && !E.bridge(prev, s)) bad.push('معادلة التسوية مختلة');
        if (S.tx.some(t => !t.reverses && S.post.filter(p => p.tx === t.id).reduce((a, p) => a + p.iqd, 0) !== 0)) bad.push('عملية غير متوازنة');
        if (bad.length) { ok = false; msg = bad.join(' · '); } else msg = `صافي الثروة ${s.nw.toLocaleString('en')}`;
        prev = s;
      } catch (e) { ok = false; msg = 'خطأ: ' + e.message; }
      out.push({ id, name, ok, msg });
    });
    // اختبارات إضافية (9.2)
    const X = (name, fn) => { let ok = true, msg = 'تم'; try { const r = fn(); if (r !== true) { ok = false; msg = String(r); } } catch (e) { ok = false; msg = 'خطأ: ' + e.message; } out.push({ id: 'إضافي', name, ok, msg }); };
    const rej = (fn, part) => { try { fn(); return 'لم يُرفض'; } catch (e) { return e.message.includes(part) ? true : 'رسالة غير متوقعة: ' + e.message; } };
    X('رفض عملية غير متوازنة', () => { const T = mk(); return rej(() => E.post(T, '2026-02-01', 'x', [{ a: 'cash', n: 100 }, { a: 'visa', n: -99 }]), 'غير متوازنة'); });
    X('رفض سحب دولار يفوق الرصيد (ولا يترك أثراً)', () => { const T = mk(); E.opening(T, '2026-01-01', [{ a: 'usd', n: 10000, r: R15 }], 'eq'); const n = T.post.length;
      const r = rej(() => E.post(T, '2026-02-01', 'x', [{ a: 'food', n: E.usdToIqd(10001, R15) }, { a: 'usd', n: -10001, r: R15 }]), 'لا يكفي'); return r === true && T.post.length === n ? true : 'بقي أثر أو لم يُرفض'; });
    X('التقريب: 33.33 دولاراً × 1,517.25 = 50,570 (والسالب متماثل)', () => E.usdToIqd(3333, 15172500) === 50570 && E.usdToIqd(-3333, 15172500) === -50570 ? true : 'خطأ تقريب');
    X('عكس عملية يعيد صافي الثروة والتكلفة كما كانا', () => { const T = mk(); E.opening(T, '2026-01-01', [{ a: 'cash', n: 1000000 }, { a: 'usd', n: 100000, r: 14800000 }], 'eq'); T.rate = R15;
      const a = E.snap(T), id = E.post(T, '2026-02-01', 'expense', [{ a: 'food', n: 76000 }, { a: 'usd', n: -5000, r: R15 }]); E.reverse(T, id, '2026-02-02'); const b = E.snap(T);
      return JSON.stringify(a) === JSON.stringify(b) && E.bal(T, 'usd') === 100000 ? true : 'لم تعد الأرقام'; });
    X('إعادة الاحتساب: إدخال شراء دولار بتاريخ سابق يغيّر المحقق دون تغيير المدخلات', () => { const T = mk(); E.opening(T, '2026-01-01', [{ a: 'cash', n: 5000000 }, { a: 'usd', n: 100000, r: 14800000 }], 'eq');
      E.post(T, '2026-02-01', 'expense', [{ a: 'food', n: 76000 }, { a: 'usd', n: -5000, r: R15 }]); const f1 = E.snap(T).fx, p0 = JSON.stringify(T.post.filter(p => p.tx === 2));
      E.post(T, '2026-01-15', 'buy_usd', [{ a: 'usd', n: 100000, r: 15000000 }, { a: 'cash', n: -1500000 }]); const f2 = E.snap(T).fx;
      return f1 === 2000 && f2 === 1500 && p0 === JSON.stringify(T.post.filter(p => p.tx === 2)) ? true : `قبل ${f1} بعد ${f2}`; });
    X('buyMetal: يرفض المعرّف المكرر والبيانات الخاطئة ولا يترك قطعة يتيمة', () => { const T = mk(); E.opening(T, '2026-01-01', [{ a: 'cash', n: 5000000 }, { a: 'usd', n: 100000, r: 14800000 }], 'eq');
      const ok = { id: 'G1', metal: 'G', mg: 10000, fine: 8750, from: 'cash', to: 'gold', paid: 1800000 }; E.buyMetal(T, '2026-01-02', ok); const n = T.post.length;
      for (const [o, part] of [[{ ...ok }, 'مكرر'], [{ ...ok, id: 'G2', fine: 10001 }, 'النقاوة'], [{ ...ok, id: 'G3', mg: 0 }, 'الوزن'], [{ ...ok, id: 'G4', metal: 'X' }, 'المعدن'],
        [{ ...ok, id: 'G5', paid: 1.5 }, 'سعر'], [{ ...ok, id: 'G6', to: 'silver' }, 'حساب المعدن'], [{ ...ok, id: 'G7', from: 'usd' }, 'سعر الصرف'], [{ ...ok, id: '' }, 'معرّف']]) {
        const r = rej(() => E.buyMetal(T, '2026-01-03', o), part); if (r !== true) return part + ': ' + r; }
      return Object.keys(T.pieces).join() === 'G1' && T.post.length === n ? true : 'بقي أثر يتيم'; });
    X('تخصيص الهدف: يقبل الصفر ويرفض السالب والكسر', () => { const T = mk();
      return rej(() => E.goalAlloc(T, 'g', -1), 'غير سالب') === true && rej(() => E.goalAlloc(T, 'g', 1.5), 'غير سالب') === true && (E.goalAlloc(T, 'g', 0), T.goals.length === 1) ? true : 'سلوك غير متوقع'; });
    X('عكس العملية: يرفض تاريخاً غير صالح أو قبل العملية ولا يغيّر شيئاً', () => { const T = mk(); E.opening(T, '2026-01-01', [{ a: 'cash', n: 1000 }], 'eq'); const id = E.post(T, '2026-02-10', 'expense', [{ a: 'food', n: 100 }, { a: 'cash', n: -100 }]);
      for (const d of ['2026-02-30', 'abc', '2026-02-09']) { const r = rej(() => E.reverse(T, id, d), 'العكس'); if (r !== true) return d + ': ' + r; }
      return !T.tx.find(t => t.id === id).voided && T.tx.length === 2 ? true : 'تغيّر شيء'; });
    X('تحويل دولار بين حسابين لك: لا محقق وتبقى التكلفة التاريخية', () => { const T = mk(); E.addAcc(T, 'usd2', 'asset', 'USD', true); E.opening(T, '2026-01-01', [{ a: 'usd', n: 100000, r: 14800000 }], 'eq'); T.rate = R15;
      const a = E.snap(T), bad = rej(() => E.post(T, '2026-02-01', 'transfer', [{ a: 'usd2', n: 30000, r: R15 }, { a: 'usd', n: -30000, r: R14 }]), 'نفسه');
      if (bad !== true) return bad;
      E.post(T, '2026-02-01', 'transfer', [{ a: 'usd2', n: 30000, r: R15 }, { a: 'usd', n: -30000, r: R15 }]); const b = E.snap(T);
      if (b.real !== 0 || b.fx !== 0 || b.usdCost !== 1480000 || b.nwc !== a.nwc || !E.identity(b)) return 'ظهر محقق أو تغيّرت التكلفة: ' + JSON.stringify(b);
      E.post(T, '2026-02-05', 'expense', [{ a: 'food', n: 152000 }, { a: 'usd2', n: -10000, r: R15 }]); const c = E.snap(T); // التكلفة المستهلكة 148,000 (1480) لا 152,000
      return c.real === 4000 && c.usdCost === 1332000 && E.identity(c) && E.bridge(b, c) ? true : 'المحقق ' + c.real + ' التكلفة ' + c.usdCost; });
    return { results: out, passed: out.filter(r => r.ok).length, total: out.length };
  }
  const report = r => r.results.map(x => `${x.ok ? '✓' : '✗'} ${x.id} ${x.name} — ${x.msg}`).join('\n') + `\nالنتيجة: ${r.passed} من ${r.total}`;
  return { run, report };
})();
if (typeof module !== 'undefined') module.exports = FSelfTest;
