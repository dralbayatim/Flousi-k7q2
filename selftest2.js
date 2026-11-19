'use strict';
// فلوسي — اختبارات المراحل 2 إلى 6 (منطق التطبيق والتخزين). تعمل في Node وداخل التطبيق.
const FSelfTest2 = (() => {
  const G = typeof FE !== 'undefined' ? { E: FE, L: FL, St: FStore, C: typeof FLS !== 'undefined' ? FLS : null, B: typeof FB !== 'undefined' ? FB : null }
    : { E: require('./engine.js'), L: require('./logic.js'), St: require('./store.js'), C: require('./core.js'), B: (() => { try { return require('./backup.js'); } catch (e) { return null; } })() };
  const { E, L, St } = G;
  const tests = [];
  const T = (phase, name, fn) => tests.push({ phase, name, fn });
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'قيمة') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); };
  const bad = async (fn, part) => { try { await fn(); } catch (e) { if (!part || e.message.includes(part)) return; throw new Error('رسالة غير متوقعة: ' + e.message); } throw new Error('لم يُرفض'); };
  const fresh = async () => { const be = St.mem(), S = await St.load(be); return { be, S }; };
  // سيناريو مرجعي: افتتاح 5,000,000 نقد + 1,000,000 فيزا + 1000$ بمتوسط 1480
  const seed = async (be, S) => { await St.run(be, S, () => { L.setRate(S, '2026-01-01', 15000000);
    L.opening(S, '2026-01-01', [{ name: 'نقد', type: 'asset_cash', amount: 5000000 }, { name: 'فيزا', type: 'visa', amount: 1000000 }, { name: 'دولار', type: 'asset_cash', cur: 'USD', amount: 100000, r: 14800000 }]); }); };
  const ids = S => ({ cash: 'u1', visa: 'u2', usd: 'u3' });

  // ===== المرحلة 2 =====
  T(2, 'قراءة المبالغ: أرقام عربية وفواصل ومنزلتان للدولار ورفض الكسر للدينار', () => {
    eq(L.parseAmount('١٬٥٠٠', 0), 1500); eq(L.parseAmount('33.33', 2), 3333); eq(L.parseAmount('5', 2), 500);
    ['1.5', 'abc', '', '1.234'].forEach((s, i) => { try { L.parseAmount(s, i === 3 ? 2 : 0); throw new Error('قُبل ' + s); } catch (e) { if (e.message.startsWith('قُبل')) throw e; } }); });
  T(2, 'التهيئة تُنشئ الفئات والحسابات النظامية مرة واحدة', async () => { const { S } = await fresh(); const n = Object.keys(S.acc).length; L.init(S); eq(Object.keys(S.acc).length, n); eq(S.acc.c_food.name, 'أكل'); eq(L.CATS.length, 13); });
  T(2, 'الرصيد الافتتاحي: عملية واحدة، الفرق في حقوق الملكية لا في الدخل، ولا يتكرر', async () => { const { be, S } = await fresh(); await seed(be, S); const s = E.snap(S);
    eq([s.eq, s.inc, s.nw, s.nwc, s.U], [7480000, 0, 7500000, 7480000, 20000]); await bad(() => St.run(be, S, () => L.opening(S, '2026-01-02', [])), 'من قبل'); eq(S.tx.length, 1); });
  T(2, 'دخل ومصروف وتحويل (مطابقة خطوات 2 إلى 4 المعتمدة)', async () => { const { be, S } = await fresh(); await seed(be, S); const A = ids(S);
    await St.run(be, S, () => L.income(S, { date: '2026-01-05', acct: A.visa, src: 'inc_salary', amount: 1500000 })); eq(E.snap(S).nw, 9000000);
    await St.run(be, S, () => L.expense(S, { date: '2026-01-06', acct: A.cash, cat: 'c_food', amount: 200000 })); eq(E.snap(S).nw, 8800000);
    await St.run(be, S, () => L.transfer(S, { date: '2026-01-07', from: A.visa, to: A.cash, amount: 500000 })); const s = E.snap(S);
    eq([s.nw, s.inc, s.exp, E.bal(S, A.cash), E.bal(S, A.visa)], [8800000, 1500000, 200000, 5300000, 2000000]); eq(E.identity(s), true); });
  T(2, 'دولار: مصروف 50$ بسعر 1520، وتحويل 300$ إلى 453,000 دينار (يطابق اختباري 13 و14)', async () => { const { be, S } = await fresh(); await seed(be, S); const A = ids(S);
    await St.run(be, S, () => L.expense(S, { date: '2026-01-20', acct: A.usd, cat: 'c_food', amount: 5000, r: 15200000 }));
    await St.run(be, S, () => L.transfer(S, { date: '2026-01-21', from: A.usd, to: A.cash, amount: 30000, amount2: 453000 })); S.rate = 15200000; const s = E.snap(S);
    eq([E.bal(S, A.usd), s.usdCost, s.real, s.exp], [65000, 962000, 11000, 76000]); eq(E.identity(s), true);
    await St.run(be, S, () => L.transfer(S, { date: '2026-01-22', from: A.cash, to: A.usd, amount: 151000, amount2: 10000 })); // شراء 100$ بـ 151,000
    eq([E.bal(S, A.usd), E.snap(S).usdCost], [75000, 962000 + 151000]); });
  T(2, 'تحويل دولار بين حسابين لك لا يُسجَّل ربحاً ولا يمس التكلفة', async () => { const { be, S } = await fresh(); await seed(be, S);
    await St.run(be, S, () => { const b = L.addAccount(S, { name: 'دولار 2', type: 'bank', cur: 'USD' }); L.transfer(S, { date: '2026-02-01', from: 'u3', to: b, amount: 30000, r: 15200000 }); });
    const s = E.snap(S); eq([s.real, s.usdCost], [0, 1480000]); });
  T(2, 'الحفظ والتحميل: حالة مطابقة بعد إعادة البناء، وتبقى العمليات المعكوسة والسعر', async () => { const { be, S } = await fresh(); await seed(be, S); const A = ids(S);
    const id = await St.run(be, S, () => L.expense(S, { date: '2026-01-06', acct: A.cash, cat: 'c_food', amount: 200000 }));
    await St.run(be, S, () => L.undo(S, id, '2026-01-07')); await St.run(be, S, () => L.setRate(S, '2026-02-01', 15200000));
    const S2 = await St.load(be); eq(E.snap(S2), E.snap(S)); eq([S2.tx.length, S2.tx[1].voided, S2.rate, S2.x.openDate], [3, true, 15200000, '2026-01-01']); });
  T(2, 'الفشل لا يترك أثراً: لا في الذاكرة ولا في التخزين', async () => { const { be, S } = await fresh(); await seed(be, S); const A = ids(S), before = JSON.stringify(St.dump(S)), stored = JSON.stringify(await be.readAll());
    await bad(() => St.run(be, S, () => { L.expense(S, { date: '2026-01-06', acct: A.cash, cat: 'c_food', amount: 1000 }); L.expense(S, { date: '2026-01-06', acct: A.cash, cat: 'c_food', amount: -5 }); }), 'موجباً');
    eq(JSON.stringify(St.dump(S)), before); eq(JSON.stringify(await be.readAll()), stored); });
  T(2, 'لوحة صافي الثروة: الأصول والالتزامات والتغير الشهري والسنوي', async () => { const { be, S } = await fresh(); await seed(be, S); const A = ids(S);
    await St.run(be, S, () => L.addAccount(S, { name: 'دين', type: 'liab' })); await St.run(be, S, () => L.expense(S, { date: '2026-03-02', acct: A.cash, cat: 'c_food', amount: 100000 }));
    const p = L.panel(S, '2026-03-10'); eq([p.cur.assets, p.cur.liab, p.nw, p.dMonth, p.dYear], [7400000, 0, 7400000, -100000, -100000]);
    eq(L.panel(S, '2026-01-20').dMonth, -100000); /* قبل مرور شهر كامل: المقارنة مع لحظة الافتتاح */ });
  T(2, 'قائمة العمليات والوصف', async () => { const { be, S } = await fresh(); await seed(be, S); const l = L.listTx(S); eq([l.length, l[0].label, l[0].amount], [1, 'رصيد افتتاحي', 7480000]); });

  // ===== المرحلة 3 =====
  const FBm = G.B || (typeof FB !== 'undefined' ? FB : null), C = G.C;
  const rich = async () => { const { be, S } = await fresh(); await seed(be, S); const A = ids(S);
    await St.run(be, S, () => { L.expense(S, { date: '2026-01-20', acct: A.usd, cat: 'c_food', amount: 5000, r: 15200000 }); L.income(S, { date: '2026-01-21', acct: A.visa, src: 'inc_salary', amount: 1500000, note: 'راتب، "تشرين"' }); E.goalAlloc(S, 'g1', 100000, '2026-01-22'); });
    const id = await St.run(be, S, () => L.expense(S, { date: '2026-01-23', acct: A.cash, cat: 'c_ent', amount: 50000 })); await St.run(be, S, () => L.undo(S, id, '2026-01-24')); return { be, S }; };
  const KEY = 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ';
  T(3, 'الرمز: تجزئة صحيحة، يرفض الخطأ، والملح مختلف في كل مرة، ويرفض غير 6 أرقام', async () => { const a = await FBm.hashPin('123456'), b = await FBm.hashPin('123456');
    eq([await FBm.verifyPin('123456', a), await FBm.verifyPin('654321', a), await FBm.verifyPin('١٢٣٤٥٦', a), a.h !== b.h], [true, false, true, true]);
    for (const p of ['12345', 'abcdef', '1234567']) { try { FBm.checkPinFormat(p); throw new Error('قُبل ' + p); } catch (e) { if (e.message.startsWith('قُبل')) throw e; } } });
  T(3, 'نسخة احتياطية: بناء ثم فتح يعيد الحالة نفسها تماماً', async () => { const { S } = await rich(); const bytes = await FBm.build(S, KEY), { S: S2, payload } = await FBm.open(bytes, KEY.toLowerCase());
    eq(E.snap(S2), E.snap(S)); eq([S2.tx.length, payload.manifest.txCount, S2.goals.length, S2.x.openDate], [S.tx.length, S.tx.length, 1, '2026-01-01']); eq(JSON.stringify(St.dump(S2)), JSON.stringify(St.dump(S))); });
  T(3, 'النسخة ترفض: مفتاحاً خاطئاً، ملفاً معدَّلاً، نسخة المرحلة 0، وبيانات عُدّلت وأُعيد تشفيرها', async () => { const { S } = await rich(), bytes = await FBm.build(S, KEY);
    await bad(() => FBm.open(bytes, 'AAAA-AAAA-AAAA-AAAA-AAAA-AAAA'), 'auth'); const t = bytes.slice(); t[t.length - 30] ^= 1; await bad(() => FBm.open(t, KEY), 'auth');
    await bad(async () => FBm.open(await C.encrypt({ v: 1, fp: 'x', records: [] }, KEY), KEY), 'المرحلة 0');
    const p = await C.decrypt(bytes, KEY); p.dump.state.rate = 16000000; await bad(async () => FBm.open(await C.encrypt(p, KEY), KEY), 'لا تطابق');
    const q = await C.decrypt(bytes, KEY); q.dump.tx[1].posts[0].iqd += 1; await bad(async () => FBm.open(await C.encrypt(q, KEY), KEY), 'تالفة'); });
  T(3, 'الاستعادة: تستبدل كل شيء ذرياً، وتحفظ لقطة ما قبلها، ويمكن التراجع عنها', async () => { const { S } = await rich(), bytes = await FBm.build(S, KEY);
    const { be: be2, S: S2 } = await fresh(); await seed(be2, S2); await St.run(be2, S2, () => L.expense(S2, { date: '2026-02-01', acct: 'u1', cat: 'c_food', amount: 777 })); const before = E.snap(S2); S2.sec = { pin: { x: 1 } };
    await FBm.restore(be2, S2, bytes, KEY); const S3 = await St.load(be2); eq(E.snap(S3), E.snap(S)); eq(S3.sec.key, KEY.replace(/-/g, '')); eq(S3.sec.pin, { x: 1 });
    await FBm.undoRestore(be2, S3); eq(E.snap(await St.load(be2)), before); });
  T(3, 'التصدير: ملف مضغوط سليم فيه 8 ملفات CSV وJSON، وCSV يهرّب الفواصل والاقتباس', async () => { const { S } = await rich(), z = FBm.exportZip(S), list = FBm.unzipList(z);
    eq(list.map(x => x.name).sort(), ['accounts.csv', 'fx_rates.csv', 'flousi-export-v1.json', 'goals.csv', 'metal_prices.csv', 'metal_pieces.csv', 'monthly_summary.csv', 'postings.csv', 'transactions.csv'].sort());
    eq(list.every(x => x.ok), true); const tx = new TextDecoder().decode(list.find(x => x.name === 'transactions.csv').data); eq([[...list.find(x => x.name === 'transactions.csv').data.slice(0, 3)], tx.trim().split('\r\n').length], [[0xEF, 0xBB, 0xBF], S.tx.length + 1]);
    eq(tx.includes('"راتب، ""تشرين"""'), true); eq(JSON.parse(new TextDecoder().decode(list.find(x => x.name === 'flousi-export-v1.json').data)).tx.length, S.tx.length); });
  T(3, 'تذكير النسخ: أخضر، ثم أحمر بعد 10 عمليات أو 7 أيام، ويسبق الفتح بعد 14 يوماً', async () => { const { be, S } = await fresh(); eq(FBm.status(S).level, 'ok'); await seed(be, S); eq(FBm.status(S).level, 'red');
    const now = Date.now(); S.x.backup = { t: now, tx: S.tx.length }; eq(FBm.status(S, now).level, 'ok'); eq(FBm.status(S, now + 8 * 864e5).level, 'red'); eq(FBm.status(S, now + 15 * 864e5).level, 'block');
    S.x.backup = { t: now, tx: S.tx.length - 10 }; eq(FBm.status(S, now).level, 'red'); });

  // ===== المرحلة 4 =====
  const seed4 = async (be, S) => { await seed(be, S); await St.run(be, S, () => L.setPrices(S, '2026-01-01', { G: 400000, S: 5000 })); };
  const gold = { date: '2026-01-08', metal: 'G', mg: 10000, karat: 21, paid: 1800000, from: 'u1', form: 'jewelry', label: 'خاتم' };
  const silver = { date: '2026-01-09', metal: 'S', mg: 100000, mille: 925, paid: 250000, from: 'u1', form: 'bullion', label: 'سبيكة' };
  const scen4 = async () => { const { be, S } = await fresh(); await seed4(be, S); const A = ids(S), nw = () => E.snap(S).nw, out = {};
    await St.run(be, S, () => L.income(S, { date: '2026-01-05', acct: A.visa, src: 'inc_salary', amount: 1500000 })); await St.run(be, S, () => L.expense(S, { date: '2026-01-06', acct: A.cash, cat: 'c_food', amount: 200000 }));
    await St.run(be, S, () => L.transfer(S, { date: '2026-01-07', from: A.visa, to: A.cash, amount: 500000 }));
    out.g = await St.run(be, S, () => L.buyPiece(S, gold)); out.nw5 = nw(); out.s = await St.run(be, S, () => L.buyPiece(S, silver)); out.nw6 = nw();
    await St.run(be, S, () => { L.setRate(S, '2026-01-10', 15200000); L.setPrices(S, '2026-01-10', { G: 410000, S: 5200 }); }); out.nw7 = nw();
    out.gs = await St.run(be, S, () => L.sellPiece(S, { date: '2026-01-12', id: out.g, proceeds: 1700000, to: 'u1', note: 'سيارة' })); out.nw8 = nw();
    out.ss = await St.run(be, S, () => L.sellPiece(S, { date: '2026-01-13', id: out.s, proceeds: 230000, to: 'u1' })); out.nw9 = nw(); return { be, S, out }; };
  T(4, 'القراءة: العيار والنقاوة (24→10000، 22→9167، 21→8750، 18→7500، 925→9250) ويرفض الخطأ', () => { eq([24, 22, 21, 18].map(L.fineKarat), [10000, 9167, 8750, 7500]); eq(L.fineMille(925), 9250);
    [() => L.fineKarat(25), () => L.fineKarat(0), () => L.fineKarat(21.5), () => L.fineMille(1001)].forEach(f => { try { f(); throw new Error('قُبل'); } catch (e) { if (e.message === 'قُبل') throw e; } }); });
  T(4, 'الأسعار: تاريخ لكل معدن، والأحدث يحدد سعر التقييم، ويرفض الفارغ والسالب', async () => { const { be, S } = await fresh(); await seed4(be, S);
    await St.run(be, S, () => L.setPrices(S, '2026-03-01', { G: 420000 })); eq([L.priceAt(S, '2026-02-01'), L.priceAt(S, '2026-03-05'), S.price], [{ G: 400000, S: 5000 }, { G: 420000, S: 5000 }, { G: 420000, S: 5000 }]);
    await St.run(be, S, () => L.setPrices(S, '2026-02-01', { S: 5100 })); eq([L.priceAt(S, '2026-02-10').S, S.price.S], [5100, 5100]);
    await bad(() => St.run(be, S, () => L.setPrices(S, '2026-03-02', {})), 'أدخل'); await bad(() => St.run(be, S, () => L.setPrices(S, '2026-03-02', { G: -1 })), 'غير صالح'); });
  T(4, 'شراء الذهب والفضة بالواجهة المنطقية يطابق اختباري 5 و6 المعتمدين', async () => { const { S, out } = await scen4(); eq([out.nw5, out.nw6], [8687920, 8660970]);
    const P = L.pieces(S); eq([P.length, S.pieces[out.g].fine, S.pieces[out.s].fine, S.pieces[out.g].buy.price, S.pieces[out.g].buy.rate], [2, 8750, 9250, 400000, 15000000]); });
  T(4, 'تغيير الأسعار وحده لا يمس العمليات ويطابق اختبار 7، ثم البيع يطابق 8 و9', async () => { const { S, out } = await scen4(); eq([out.nw7, out.nw8, out.nw9], [8758251, 8705068, 8700000]); const s = E.snap(S); eq([s.real, s.U, E.identity(s)], [-120000, 40000, true]); });
  T(4, 'تقرير بيع الذهب: السعر والصرف +65,263، أجور ضائعة 112,080، خصم التاجر 53,183، المجموع −100,000', async () => { const { S, out } = await scen4(), r = L.saleReport(S, out.g);
    eq([r.cost, r.proceeds, r.total, r.vBuy, r.vSale, r.market, r.making, r.dealer, r.dealerBp, r.est, r.note, r.to], [1800000, 1700000, -100000, 1687920, 1753183, 65263, 112080, 53183, 303, false, 'سيارة', S.acc.u1.name]);
    eq(r.market - r.making - r.dealer, r.total); });
  T(4, 'تقرير بيع الفضة: +12,018 و26,950 ضائعة وخصم 5,068 والمجموع −20,000', async () => { const { S, out } = await scen4(), r = L.saleReport(S, out.s); eq([r.market, r.making, r.dealer, r.total, r.market - r.making - r.dealer], [12018, 26950, 5068, -20000, -20000]); });
  T(4, 'التراجع عن البيع يعيد القطعة محتفَظاً بها وصافي الثروة كما كان', async () => { const { be, S, out } = await scen4(); const sale = S.tx.find(t => t.type === 'sell_metal' && t.meta.piece === out.g);
    await St.run(be, S, () => L.undo(S, sale.id, '2026-01-14')); eq([L.pieces(S).find(p => p.id === out.g).held, E.snap(S).real], [true, -20000]); await bad(async () => L.saleReport(S, out.g), 'لا توجد'); });
  T(4, 'قطعة موجودة قبل البدء: ليست دخلاً، وبلا تكلفة تُقدَّر بقيمتها النظرية وتُعلَّم تقديرية', async () => { const { be, S } = await fresh(); await seed4(be, S); const a = E.snap(S);
    const id = await St.run(be, S, () => L.addPiece(S, { metal: 'G', mg: 10000, karat: 21, form: 'jewelry', label: 'قديم' })), b = E.snap(S);
    eq([b.eq - a.eq, b.inc, b.nwc - a.nwc, S.pieces[id].buy.est], [1687920, 0, 1687920, true]);
    const id2 = await St.run(be, S, () => L.addPiece(S, { metal: 'S', mg: 50000, mille: 925, cost: 100000, price: 5000, form: 'bullion' })); eq([S.pieces[id2].buy.est, E.pieceCost(S, id2)], [false, 100000]);
    await St.run(be, S, () => L.sellPiece(S, { date: '2026-02-01', id, proceeds: 1600000, to: 'u1' })); eq(L.saleReport(S, id).making, 0); await bad(() => St.run(be, S, () => L.addPiece(S, { metal: 'G', mg: 1, karat: 30 })), 'العيار'); });
  T(4, 'الشراء يرفض: الدفع بالدولار، عياراً خاطئاً، ومعدناً بلا سعر؛ ولا يترك أثراً', async () => { const { be, S } = await fresh(); await seed(be, S); const before = JSON.stringify(St.dump(S));
    await bad(() => St.run(be, S, () => L.buyPiece(S, { ...gold, from: 'u3' })), 'بالدينار'); await bad(() => St.run(be, S, () => L.buyPiece(S, { ...gold, karat: 25 })), 'العيار'); await bad(() => St.run(be, S, () => L.buyPiece(S, gold)), 'أدخل سعر');
    eq(JSON.stringify(St.dump(S)), before); });
  T(4, 'الدولار: متوسط التكلفة والقيمة السوقية وغير المحقق لكل حساب', async () => { const { be, S } = await fresh(); await seed(be, S); const u = L.usdInfo(S)[0]; eq([u.bal, u.cost, u.avg, u.mkt, u.unreal], [100000, 1480000, 14800000, 1500000, 20000]);
    await St.run(be, S, () => L.expense(S, { date: '2026-02-01', acct: 'u3', cat: 'c_food', amount: 5000, r: 15200000 })); const v = L.usdInfo(S)[0]; eq([v.bal, v.cost, v.avg], [95000, 1406000, 14800000]); });
  T(4, 'الأسعار والقطع تبقى بعد الحفظ، وفي النسخة الاحتياطية، وبالأرقام نفسها', async () => { const { be, S } = await scen4(); const S2 = await St.load(be); eq(E.snap(S2), E.snap(S)); eq([Object.keys(S2.pieces).length, S2.x.prices.length, S2.x.rates.length], [2, 2, 2]);
    const key = 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ', { S: S3 } = await G.B.open(await G.B.build(S, key), key); eq(E.snap(S3), E.snap(S)); eq(L.saleReport(S3, Object.keys(S3.pieces)[0]).total, -100000); });

  // ===== المرحلة 5 =====
  const J0 = { name: 'جمعية العائلة', N: 5, s: 200000, turn: 3, start: '2026-01-01' };
  T(5, 'الديون: إقراض واقتراض وسداد ورسوم تطابق اختباري 10 و11 (صافي الثروة ثابت إلا الرسوم)', async () => { const { be, S } = await fresh(); await seed(be, S); const nw0 = E.snap(S).nw;
    const ali = await St.run(be, S, () => L.debtNew(S, { dir: 'lent', person: 'علي', amount: 300000, acct: 'u1', date: '2026-01-14' })), bob = await St.run(be, S, () => L.debtNew(S, { dir: 'borrowed', person: 'بكر', amount: 1000000, acct: 'u1', date: '2026-01-14' }));
    let s = E.snap(S); eq([s.nw, s.inc, s.exp, E.bal(S, 'u1')], [nw0, 0, 0, 5700000]);
    await St.run(be, S, () => L.debtRepay(S, { id: ali, amount: 100000, acct: 'u1', date: '2026-01-15' })); await St.run(be, S, () => L.debtRepay(S, { id: bob, amount: 400000, fee: 20000, acct: 'u1', date: '2026-01-15' }));
    s = E.snap(S); const d = L.debts(S); eq([s.nw, s.exp, E.bal(S, 'u1'), d[0].remaining, d[0].paid, d[1].remaining], [nw0 - 20000, 20000, 5380000, 200000, 100000, 600000]); eq(E.identity(s), true); });
  T(5, 'الديون: يرفض الزيادة عن المتبقي، ورسوم الدين الذي لك، وحساب الدولار؛ ويعكس السداد؛ ويكشف المتأخر', async () => { const { be, S } = await fresh(); await seed(be, S);
    const id = await St.run(be, S, () => L.debtNew(S, { dir: 'lent', person: 'سالم', amount: 100000, acct: 'u1', date: '2026-01-10', due: '2026-01-31' }));
    await bad(() => St.run(be, S, () => L.debtRepay(S, { id, amount: 100001, acct: 'u1', date: '2026-01-11' })), 'أكبر'); await bad(() => St.run(be, S, () => L.debtRepay(S, { id, amount: 1, fee: 5, acct: 'u1', date: '2026-01-11' })), 'ما اقترضته');
    await bad(() => St.run(be, S, () => L.debtNew(S, { dir: 'lent', person: 'س', amount: 5, acct: 'u3', date: '2026-01-10' })), 'بالدينار'); await bad(() => St.run(be, S, () => L.debtNew(S, { dir: 'lent', person: ' ', amount: 5, acct: 'u1', date: '2026-01-10' })), 'اسم');
    eq(L.debts(S, '2026-02-01')[0].overdue, true); await St.run(be, S, () => L.debtRepay(S, { id, amount: 100000, acct: 'u1', date: '2026-01-20' })); const t = S.tx[S.tx.length - 1];
    eq([L.debts(S, '2026-02-01')[0].settled, L.debts(S, '2026-02-01')[0].overdue], [true, false]); await St.run(be, S, () => L.undo(S, t.id, '2026-01-21')); eq(L.debts(S)[0].remaining, 100000); });
  T(5, 'الجمعية تطابق اختبار 15: القبض ليس دخلاً، والمتبقي التزام، وصافي الثروة ثابت طوال الدورة', async () => { const { be, S } = await fresh(); await seed(be, S); const nw0 = E.snap(S).nw, c0 = E.bal(S, 'u1');
    const id = await St.run(be, S, () => L.jamNew(S, J0)), pay = d => St.run(be, S, () => L.jamPay(S, { id, from: 'u1', date: d })), st = () => L.jamState(S, S.x.jams[0]);
    for (const d of ['2026-01-05', '2026-02-05', '2026-03-05']) await pay(d); eq([st().paid, st().received, st().next, E.bal(S, 'u1')], [3, false, '2026-04-01', c0 - 600000]);
    await bad(() => pay('2026-04-05'), 'القبض'); await St.run(be, S, () => L.jamReceive(S, { id, to: 'u1', date: '2026-03-20' }));
    const s = E.snap(S); eq([E.bal(S, 'u1'), E.bal(S, S.x.jams[0].asset), -E.bal(S, S.x.jams[0].liab), s.nw, s.inc, s.exp, st().received, st().paid, st().remaining], [c0 + 400000, 0, 400000, nw0, 0, 0, true, 3, 2]);
    await pay('2026-04-05'); await pay('2026-05-05'); eq([st().done, E.snap(S).nw, E.bal(S, 'u1')], [true, nw0, c0]); await bad(() => pay('2026-06-05'), 'سُدّدت'); });
  T(5, 'الجمعية: لا قبض قبل دفع الأقساط حتى دورك، ولا قبض مرتين، ويمكن عكس القبض', async () => { const { be, S } = await fresh(); await seed(be, S); const id = await St.run(be, S, () => L.jamNew(S, J0));
    await St.run(be, S, () => L.jamPay(S, { id, from: 'u1', date: '2026-01-05' })); await bad(() => St.run(be, S, () => L.jamReceive(S, { id, to: 'u1', date: '2026-01-06' })), 'مدفوع 1 من 3');
    for (const d of ['2026-02-05', '2026-03-05']) await St.run(be, S, () => L.jamPay(S, { id, from: 'u1', date: d })); const rid = await St.run(be, S, () => L.jamReceive(S, { id, to: 'u1', date: '2026-03-20' }));
    await bad(() => St.run(be, S, () => L.jamReceive(S, { id, to: 'u1', date: '2026-03-21' })), 'من قبل'); await St.run(be, S, () => L.undo(S, rid, '2026-03-22')); eq([L.jamState(S, S.x.jams[0]).received, L.jamState(S, S.x.jams[0]).paid], [false, 3]);
    for (const [o, m] of [[{ ...J0, N: 1 }, 'الأعضاء'], [{ ...J0, turn: 6 }, 'دورك'], [{ ...J0, s: 0 }, 'القسط'], [{ ...J0, name: '' }, 'اسم']]) await bad(() => St.run(be, S, () => L.jamNew(S, o)), m); });
  const mkGoal = async (be, S) => { const id = await St.run(be, S, () => L.goalNew(S, { name: 'سيارة', target: 6000000, targetDate: '2099-12-31', priority: 1, kind: 'long' })); await St.run(be, S, () => { Object.assign(S.x.goalsDef[0], { created: '2026-01-01', targetDate: '2026-07-01' }); }); return id; };
  T(5, 'الأهداف: التخصيص ظرف افتراضي (المتاح ينقص وصافي الثروة ثابت) ويرفض الزيادة عن المتاح والسالب', async () => { const { be, S } = await fresh(); await seed(be, S); const id = await mkGoal(be, S), a = E.snap(S);
    await St.run(be, S, () => L.goalMove(S, { id, amount: 1000000, date: '2026-03-01' })); const b = E.snap(S); eq([b.nw - a.nw, a.avail - b.avail, b.liq - a.liq, S.tx.length], [0, 1000000, 0, 1]);
    await bad(() => St.run(be, S, () => L.goalMove(S, { id, amount: 100000000, date: '2026-03-02' })), 'المتاح'); await bad(() => St.run(be, S, () => L.goalMove(S, { id, amount: -5, date: '2026-03-02' })), 'غير سالب');
    await St.run(be, S, () => L.goalMove(S, { id, amount: 400000, release: true, date: '2026-03-03' })); eq(E.snap(S).avail, a.avail - 600000); await bad(() => St.run(be, S, () => L.goalMove(S, { id, amount: 9000000, release: true, date: '2026-03-04' })), 'المخصص'); });
  T(5, 'الأهداف: القسط الشهري المطلوب والمتأخر ونسبة الإنجاز، والتخطّي يمدّد الموعد', async () => { const { be, S } = await fresh(); await seed(be, S); const id = await mkGoal(be, S);
    await St.run(be, S, () => L.goalMove(S, { id, amount: 1000000, date: '2026-03-01' })); let v = L.goalView(S, '2026-03-15')[0]; eq([v.allocated, v.remaining, v.pct, v.monthly, v.behind, v.paidMonth, v.done], [1000000, 5000000, 16, 1250000, 2000000, 1000000, false]);
    await St.run(be, S, () => L.goalSkip(S, id)); v = L.goalView(S, '2026-03-15')[0]; eq([v.targetDate, v.skipped, v.monthly], ['2026-08-01', 1, 1000000]);
    eq(L.goalAdvice(S, id, 500000, '2026-03-15').length >= 1, true); eq(L.goalAdvice(S, id, 1000000, '2026-03-15').length, 0); await St.run(be, S, () => L.goalNew(S, { name: 'قصير', target: 100000, targetDate: '2099-01-01', priority: 2, kind: 'short' })); eq(L.goalView(S).map(x => x.name), ['سيارة', 'قصير']);
    for (const [o, m] of [[{ name: 'x', target: 0, targetDate: '2099-01-01', priority: 1, kind: 'short' }, 'موجباً'], [{ name: 'x', target: 5, targetDate: '2000-01-01', priority: 1, kind: 'short' }, 'الماضي'], [{ name: 'x', target: 5, targetDate: '2099-01-01', priority: 4, kind: 'short' }, 'الأولوية']]) await bad(() => St.run(be, S, () => L.goalNew(S, o)), m); });
  T(5, 'المتكررات: التذكير قبل الاستحقاق، التأكيد يسجّل العملية مرة واحدة في الشهر، والتخطّي والإيقاف', async () => { const { be, S } = await fresh(); await seed(be, S);
    const id = await St.run(be, S, () => L.recurNew(S, { kind: 'expense', name: 'إيجار', amount: 500000, acct: 'u1', cat: 'c_fixed', day: 25, remind: 3 }));
    eq([L.recurDue(S, '2026-03-21').length, L.recurDue(S, '2026-03-22').length, L.recurDue(S, '2026-03-22')[0].overdue, L.recurDue(S, '2026-03-26')[0].overdue], [0, 1, false, true]);
    await St.run(be, S, () => L.recurConfirm(S, { id, date: '2026-03-25' })); const s = E.snap(S); eq([s.exp, E.bal(S, 'u1'), L.recurDue(S, '2026-03-26').length, L.recurDue(S, '2026-04-23').length, S.tx[S.tx.length - 1].note], [500000, 4500000, 0, 1, 'إيجار']);
    await St.run(be, S, () => L.recurSkip(S, id, '2026-04-23')); eq(L.recurDue(S, '2026-04-26').length, 0); eq(L.recurDue(S, '2026-05-23').length, 1); await St.run(be, S, () => L.recurToggle(S, id)); eq(L.recurDue(S, '2026-05-23').length, 0);
    await St.run(be, S, () => L.recurDelete(S, id)); eq(S.x.recur.length, 0); });
  T(5, 'الراتب المتوقع: السؤال عند الموعد، والمبلغ المسبق قابل للتعديل صعوداً أو نزولاً', async () => { const { be, S } = await fresh(); await seed(be, S);
    const id = await St.run(be, S, () => L.recurNew(S, { kind: 'income', name: 'راتب', amount: 1500000, acct: 'u2', src: 'inc_salary', day: 5, remind: 0, salary: true }));
    eq([L.recurDue(S, '2026-03-04').length, L.recurDue(S, '2026-03-05')[0].r.salary, L.recurDue(S, '2026-03-06')[0].overdue], [0, true, true]); await St.run(be, S, () => L.recurConfirm(S, { id, date: '2026-03-06', amount: 1450000 }));
    const s = E.snap(S); eq([s.inc, E.bal(S, 'u2'), L.recurDue(S, '2026-03-20').length], [1450000, 2450000, 0]);
    for (const [o, m] of [[{ kind: 'expense', name: 'x', amount: 5, acct: 'u1', cat: 'c_food', day: 29, remind: 0 }, 'اليوم'], [{ kind: 'expense', name: 'x', amount: 5, acct: 'u1', cat: 'c_food', day: 5, remind: 8 }, 'التذكير'], [{ kind: 'expense', name: 'x', amount: 5, acct: 'u3', cat: 'c_food', day: 5, remind: 0 }, 'بالدينار'], [{ kind: 'expense', name: 'x', amount: 5, acct: 'u1', cat: 'inc_salary', day: 5, remind: 0 }, 'فئة']]) await bad(() => St.run(be, S, () => L.recurNew(S, o)), m); });
  T(5, 'كل بيانات المرحلة 5 تبقى بعد الحفظ والنسخة الاحتياطية، وتعطي الحالة نفسها', async () => { const { be, S } = await fresh(); await seed(be, S); const jid = await St.run(be, S, () => L.jamNew(S, J0)); const gid = await mkGoal(be, S);
    await St.run(be, S, () => { L.debtNew(S, { dir: 'borrowed', person: 'بكر', amount: 1000000, acct: 'u1', date: '2026-01-14' }); L.goalMove(S, { id: gid, amount: 500000, date: '2026-01-15' }); L.recurNew(S, { kind: 'expense', name: 'إيجار', amount: 1, acct: 'u1', cat: 'c_fixed', day: 25, remind: 3 }); });
    await St.run(be, S, () => L.jamPay(S, { id: jid, from: 'u1', date: '2026-01-05' })); const S2 = await St.load(be); eq(E.snap(S2), E.snap(S)); eq(JSON.stringify([S2.x.debts, S2.x.jams, S2.x.goalsDef, S2.x.recur, S2.goals]), JSON.stringify([S.x.debts, S.x.jams, S.x.goalsDef, S.x.recur, S.goals]));
    const key = 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ', { S: S3 } = await G.B.open(await G.B.build(S, key), key); eq([L.jamState(S3, S3.x.jams[0]).paid, L.debts(S3)[0].remaining, L.goalView(S3, '2026-03-15')[0].allocated], [1, 1000000, 500000]); });

  // ===== المرحلة 6 =====
  T(6, 'التقرير الشهري يطابق السيناريو المعتمد: الدخل والمصروف والمحقق وجسر صافي الثروة وحركة السيولة', async () => { const { S } = await scen4(); const r = L.monthReport(S, '2026-01');
    eq([r.income, r.expense, r.realized, r.adj, r.dU, r.nw0, r.nw1, r.dNw, r.bridgeOk, r.sinceStart], [1500000, 200000, -120000, 0, 20000, 7500000, 8700000, 1200000, true, true]);
    eq([r.cat, r.grp['أكل'], r.flows.buy_metal, r.flows.sell_metal, r.flows.income, r.flows.expense, r.flows.transfer, r.liqNet], [{ 'أكل': 200000 }, 200000, -2050000, 1930000, 1500000, -200000, undefined, 1180000]); eq(r.income - r.expense + r.realized + r.adj + r.dU, r.dNw); });
  T(6, 'التقارير الشهرية متسلسلة: الجسر صحيح كل شهر ومجموع التغيرات يساوي تغير الثروة الكلي (دولار ومطابقة وسعر صرف)', async () => { const { be, S } = await fresh(); await seed(be, S); const A = ids(S);
    await St.run(be, S, () => { L.income(S, { date: '2026-01-10', acct: A.visa, src: 'inc_salary', amount: 1500000 }); L.expense(S, { date: '2026-01-12', acct: A.usd, cat: 'c_food', amount: 5000, r: 15000000 }); });
    await St.run(be, S, () => L.setRate(S, '2026-01-31', 15200000)); await St.run(be, S, () => { L.transfer(S, { date: '2026-02-03', from: A.usd, to: A.cash, amount: 30000, amount2: 453000 }); L.reconcile(S, { date: '2026-02-10', acct: A.cash, counted: 5400000 }); });
    await St.run(be, S, () => L.setRate(S, '2026-02-28', 14900000)); await St.run(be, S, () => L.expense(S, { date: '2026-03-05', acct: A.cash, cat: 'c_ent', amount: 100000 }));
    const rs = ['2026-01', '2026-02', '2026-03'].map(k => L.monthReport(S, k)); eq(rs.map(r => r.bridgeOk), [true, true, true]); eq(rs[0].nw1, rs[1].nw0); eq(rs[1].nw1, rs[2].nw0);
    eq(rs.reduce((s, r) => s + r.dNw, 0), rs[2].nw1 - L.at(S, '2026-01-01').nw); eq([rs[1].adj, rs[1].realized], [-53000, 9000]); await bad(async () => L.monthReport(S, '2025-12'), 'قبل بدء'); });
  T(6, 'التقرير السنوي: المجاميع والبدء والنهاية وشراء/بيع المعادن', async () => { const { S } = await scen4(), y = L.yearReport(S, 2026), m1 = L.monthReport(S, '2026-01');
    eq([y.months.length >= 1, y.months[0].month, y.tot.income, y.tot.expense, y.tot.savings, y.tot.realized, y.tot.buys, y.tot.sales, y.tot.nwStart, y.months[0].income], [true, '2026-01', 1500000, 200000, 1300000, -120000, 2050000, 1930000, 7500000, 1500000]);
    eq(L.yearReport(S, 2025).months.length, 0); eq(L.yearReport(S, 2099).months.length, 0); eq(y.months[0].nw1, m1.nw1); });
  T(6, 'حدود التنبيه: افتراضية، تقترب ثم تُتجاوز، وتُعدَّل فتتغير النتيجة، وترفض الخطأ', async () => { const { be, S } = await fresh(); await seed(be, S); const A = ids(S);
    await St.run(be, S, () => { L.income(S, { date: '2026-03-02', acct: A.visa, src: 'inc_salary', amount: 1500000 }); L.expense(S, { date: '2026-03-03', acct: A.cash, cat: 'c_food', amount: 200000 }); });
    let b = L.budget(S, '2026-03-20').find(x => x.g === 'أكل'); eq([b.pct, b.limit, b.spent, b.near, b.over], [15, 225000, 200000, true, false]);
    await St.run(be, S, () => L.expense(S, { date: '2026-03-04', acct: A.cash, cat: 'c_food', amount: 100000 })); b = L.budget(S, '2026-03-20').find(x => x.g === 'أكل'); eq([b.over, b.near], [true, false]);
    await St.run(be, S, () => L.setLimit(S, 'أكل', 25)); b = L.budget(S, '2026-03-20').find(x => x.g === 'أكل'); eq([b.limit, b.over], [375000, false]); eq(L.budget(S, '2026-03-20').length, 5);
    await bad(() => St.run(be, S, () => L.setLimit(S, 'أكل', 101)), 'النسبة'); await bad(() => St.run(be, S, () => L.setLimit(S, 'x', 5)), 'مجموعة'); eq((await St.load(be)).x.limits['أكل'], 25); });
  T(6, 'التنبيهات: مرتبة (أحمر ثم أصفر)، وتشمل النسخ وسعر الصرف والمتكرر المتأخر والدين والهدف والإنفاق', async () => { const { be, S } = await fresh(); await St.run(be, S, () => { L.opening(S, '2026-01-01', [{ name: 'نقد', type: 'asset_cash', amount: 5000000 }, { name: 'دولار', type: 'asset_cash', cur: 'USD', amount: 100000, r: 14800000 }]); });
    let al = L.alerts(S, '2026-03-10'); eq(al.map(a => a.lv)[0], 'red'); eq(al.some(a => a.t.includes('سعر صرف')) && al.some(a => a.t.includes('نسخة')), true);
    await St.run(be, S, () => { L.setRate(S, '2026-01-01', 15000000); S.x.backup = { t: Date.now(), tx: S.tx.length }; }); eq(L.alerts(S, '2026-03-10').length, 0);
    await St.run(be, S, () => { L.recurNew(S, { kind: 'expense', name: 'إيجار', amount: 1, acct: 'u1', cat: 'c_fixed', day: 5, remind: 0 }); L.debtNew(S, { dir: 'lent', person: 'س', amount: 100, acct: 'u1', date: '2026-01-02', due: '2026-02-01' }); });
    await mkGoal(be, S); al = L.alerts(S, '2026-03-10'); eq(al.some(a => a.lv === 'red' && a.t.includes('إيجار')), true); eq(al.some(a => a.lv === 'red' && a.t.includes('دين متأخر')), true); eq(al.some(a => a.lv === 'warn' && a.t.includes('الهدف')), true);
    const lv = al.map(a => a.lv); eq(lv, [...lv].sort((a, b) => ({ red: 0, warn: 1, info: 2 })[a] - ({ red: 0, warn: 1, info: 2 })[b])); eq(L.alerts(fresh && (await fresh()).S)[0].go, ['accts', 'open']); });
  T(6, 'شاشة الحالة: المتاح والسائل وصافي الثروة وشهر الدخل والمصروف، واللون، والشريط المتحرك', async () => { const { be, S } = await fresh(); await seed(be, S); const A = ids(S);
    await St.run(be, S, () => { L.income(S, { date: '2026-03-02', acct: A.visa, src: 'inc_salary', amount: 1500000 }); L.expense(S, { date: '2026-03-03', acct: A.cash, cat: 'c_food', amount: 100000 }); S.x.backup = { t: Date.now(), tx: S.tx.length }; E.goalAlloc(S, 'g', 1000000, '2026-03-04'); });
    let st = L.status(S, '2026-03-20'); eq([st.avail, st.liq, st.nw, st.income, st.expense, st.left, st.level], [8900000 - 1000000, 8900000, 8900000, 1500000, 100000, 1400000, 'ok']); eq(st.ticker.length, L.TIPS.length);
    await St.run(be, S, () => { S.x.backup = null; }); st = L.status(S, '2026-03-20'); eq([st.level, st.ticker[0].includes('نسخة')], ['red', true]); });
  T(6, 'اللقطات الشهرية: تُحفظ للأشهر المنتهية، ويُعلَّم الشهر القديم إن تغيّر بعد إغلاقه، ويُقبل التحديث بتأكيد', async () => { const { be, S } = await fresh(); await seed(be, S); const A = ids(S);
    await St.run(be, S, () => { L.income(S, { date: '2026-01-10', acct: A.visa, src: 'inc_salary', amount: 1500000 }); L.income(S, { date: '2026-02-10', acct: A.visa, src: 'inc_salary', amount: 1500000 }); });
    await St.run(be, S, () => L.snapMonths(S, '2026-03-10')); eq([Object.keys(S.x.snaps), S.x.snaps['2026-01'].nw, S.x.snaps['2026-02'].nw], [['2026-01', '2026-02'], 9000000, 10500000]); eq(await St.run(be, S, () => L.snapMonths(S, '2026-03-10')), []);
    await St.run(be, S, () => L.expense(S, { date: '2026-01-15', acct: A.cash, cat: 'c_food', amount: 10000 })); const ch = await St.run(be, S, () => L.snapMonths(S, '2026-03-10')); eq([ch, S.x.snaps['2026-01'].stale.diff, L.snapStale(S)], [['2026-01', '2026-02'], -10000, ['2026-01', '2026-02']]);
    eq(L.alerts(S, '2026-03-10').filter(a => a.t.includes('تغيّرت أرقام')).length, 2); await St.run(be, S, () => L.acceptSnap(S, '2026-01')); eq([S.x.snaps['2026-01'].nw, S.x.snaps['2026-01'].stale, L.snapStale(S)], [8990000, undefined, ['2026-02']]);
    eq((await St.load(be)).x.snaps['2026-01'].nw, 8990000); });

  async function run(only) {
    const out = []; for (const t of tests) { if (only && t.phase > only) continue; let ok = true, msg = 'تم'; try { await t.fn(); } catch (e) { ok = false; msg = 'خطأ: ' + e.message; } out.push({ id: 'م' + t.phase, name: t.name, ok, msg }); }
    return { results: out, passed: out.filter(r => r.ok).length, total: out.length }; }
  return { run, T, eq, bad, fresh, seed, ids, tests, G };
})();
if (typeof module !== 'undefined') module.exports = FSelfTest2;
