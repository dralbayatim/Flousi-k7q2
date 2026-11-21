#!/usr/bin/env node
// جالب «نبض السوق» — يعمل على GitHub Actions في مستودع فلوسي (Flousi-k7q2).
// يكتب data/market.json و history.json و series.json داخل مستودع فلوسي (نفس الأصل، فلا يحتاج التطبيق أي تصريح إضافي). لا يلمس ملفات التطبيق ولا بياناتك (بياناتك على هاتفك فقط).
// القواعد:
//  - لكل مؤشر دورية خاصة (every_min). المؤشر لا يُجلب إلا إذا حان موعده (أو FORCE=1).
//  - لكل مؤشر: القيمة، المصدر، وقت بيانات المصدر، وقت الجلب، حالة التحديث.
//  - عند الفشل تبقى آخر قيمة ناجحة، وتُعلَّم «قديمة» (stale) ولا تُعرض كسعر حالي.
//  - القيمة التي تقفز قفزة غير منطقية تُرفض (suspect) وتبقى القيمة السابقة.
//  - المفاتيح من متغيرات البيئة فقط، وتُحذف من أي نص قبل كتابته. وقبل الحفظ يُفحص الملف للتأكد من خلوه منها.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUT = process.env.MARKET_FILE || 'data/market.json';
const FORCE = process.env.FORCE === '1';
const FRED_KEY = process.env.FRED_API_KEY || '';
const MOCK = (process.env.MOCK_BASE || '').replace(/\/$/, '');
const NOW = process.env.FAKE_NOW ? new Date(process.env.FAKE_NOW) : new Date();
const TIMEOUT = 20000;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) nabd-market-fetcher/1.0 (personal, non-commercial)';
const SECRETS = [FRED_KEY].filter((s) => s && s.length >= 6);
const redact = (s) => SECRETS.reduce((t, k) => t.split(k).join('***'), String(s ?? ''));
const clip = (s, n = 200) => { const t = redact(s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };
const U = (url) => (MOCK ? `${MOCK}/${url.replace(/^https?:\/\//, '')}` : url);
const iso = (d) => new Date(d).toISOString();
const ageMin = (t) => { const x = Date.parse(t); return Number.isFinite(x) ? Math.round((NOW - x) / 60000) : null; };
const r2 = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;
const AD = '٠١٢٣٤٥٦٧٨٩';
const normDigits = (s) => String(s).replace(/[٠-٩]/g, (d) => AD.indexOf(d)).replace(/٬/g, ',').replace(/٫/g, '.');
const toNum = (s) => Number(String(normDigits(s)).replace(/[,\s]/g, ''));

async function http(url, headers = {}) {
  const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), /treasury\.gov/.test(url) ? 45000 : TIMEOUT);
  try {
    const res = await fetch(U(url), { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': UA, accept: '*/*', ...headers } });
    const buf = Buffer.from(await res.arrayBuffer());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { buf, text: () => buf.toString('utf8'), json: () => JSON.parse(buf.toString('utf8')) };
  } catch (e) { throw new Error(e?.name === 'AbortError' ? 'انتهت المهلة' : `${e.message}${e?.cause?.code ? ' ' + e.cause.code : ''}`); }
  finally { clearTimeout(tm); }
}

// ------------------------------------------------------------------
// تعريف المؤشرات: الدورية (every_min) والحد الأقصى لعمر البيانات قبل اعتبارها قديمة (max_age_min)
// ------------------------------------------------------------------
const H = 60, D = 1440;
const SRC = {
  goldapi: { name: 'Gold-API', url: 'https://gold-api.com', reliability: 'عالية (تطابق مع مصدرين للمقارنة)' },
  fred: { name: 'FRED — Federal Reserve Bank of St. Louis', url: 'https://fred.stlouisfed.org', reliability: 'رسمية', attribution: 'This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.' },
  tsy: { name: 'U.S. Department of the Treasury', url: 'https://home.treasury.gov', reliability: 'رسمية' },
  cftc: { name: 'CFTC Commitments of Traders', url: 'https://www.cftc.gov', reliability: 'رسمية' },
  cbi: { name: 'البنك المركزي العراقي', url: 'https://cbi.iq', reliability: 'رسمية' },
  shafaq: { name: 'Shafaq News (مسح السوق)', url: 'https://shafaq.com/en/Economy', reliability: 'متوسطة: مسح صحفي يومي' },
  ecb: { name: 'البنك المركزي الأوروبي (أسعار مرجعية عبر Frankfurter)', url: 'https://www.ecb.europa.eu', reliability: 'رسمية؛ DXY هنا تقريب بمعادلة ICE (الفرق عادةً أقل من 0.3%)' },
  calc: { name: 'محسوب داخل الجالب', url: '', reliability: 'تابعة لمدخلاتها' },
};
// group: يُجلب معاً بطلب واحد. every_min: دورية الجلب. max_age_min: بعده تُعتبر البيانات قديمة حتى لو نجح الجلب.
const GROUPS = {
  metals: { every_min: 30, label: 'الذهب والفضة العالمي' },
  dxy: { every_min: 1 * H, label: 'مؤشر الدولار الأمريكي DXY' },
  shafaq_usd: { every_min: 30, label: 'الدولار في السوق العراقي (الموازي)' },
  cbi: { every_min: 6 * H, label: 'الدولار الرسمي العراقي' },
  treasury: { every_min: 1 * D, label: 'عوائد الخزانة (خلفية للتحليل)' },
  fred_daily: { every_min: 6 * H, label: 'FRED اليومية (الفائدة الرسمية، توقعات التضخم، الدولار الموسّع)' },
  fred_monthly: { every_min: 1 * D, label: 'FRED الشهرية والفصلية' },
  cot: { every_min: 1 * D, label: 'COT الأسبوعي' },
  series: { every_min: 12 * H, label: 'السلاسل التاريخية للتحليل (series.json)' },
};
const IND = [
  { id: 'xau_usd', group: 'metals', label: 'الذهب — أونصة', unit: 'USD/oz', src: 'goldapi', max_age_min: 3 * H, market: true, jump_pct: 8, range: [500, 20000] },
  { id: 'xag_usd', group: 'metals', label: 'الفضة — أونصة', unit: 'USD/oz', src: 'goldapi', max_age_min: 3 * H, market: true, jump_pct: 12, range: [5, 500] },
  { id: 'usd_iqd_parallel', group: 'shafaq_usd', label: 'الدولار المحلي (السوق الموازي/السوداء) — بورصة الكفاح والحارثية', unit: 'IQD/100 USD', src: 'shafaq', max_age_min: 36 * H, jump_pct: 10, range: [100000, 400000] },
  { id: 'usd_iqd_shops_baghdad', group: 'shafaq_usd', label: 'الدولار — صيرفات بغداد (بيع/شراء)', unit: 'IQD/100 USD', src: 'shafaq', max_age_min: 36 * H },
  { id: 'usd_iqd_official', group: 'cbi', label: 'الدولار الرسمي (البنك المركزي العراقي)', unit: 'IQD/USD', src: 'cbi', max_age_min: 8 * D, jump_pct: 25, range: [1000, 3000] },
  { id: 'ust10y', group: 'treasury', label: 'عائد سندات 10 سنوات', unit: '%', src: 'tsy', max_age_min: 5 * D },
  { id: 'ust2y', group: 'treasury', label: 'عائد سندات سنتين', unit: '%', src: 'tsy', max_age_min: 5 * D },
  { id: 'real10y', group: 'treasury', label: 'العائد الحقيقي 10 سنوات (TIPS)', unit: '%', src: 'tsy', max_age_min: 5 * D },
  { id: 'fed_target_upper', group: 'fred_daily', fred: 'DFEDTARU', label: 'الفائدة الأمريكية — الحد الأعلى للنطاق الرسمي', unit: '%', src: 'fred', max_age_min: 6 * D },
  { id: 'fed_target_lower', group: 'fred_daily', fred: 'DFEDTARL', label: 'الفائدة الأمريكية — الحد الأدنى للنطاق الرسمي', unit: '%', src: 'fred', max_age_min: 6 * D },
  { id: 'dxy', group: 'dxy', label: 'مؤشر الدولار الأمريكي DXY (محسوب بمعادلته الرسمية من أسعار البنك المركزي الأوروبي اليومية)', unit: 'index', src: 'ecb', max_age_min: 4 * D, jump_pct: 5, range: [60, 160] },
  { id: 'breakeven10y', group: 'fred_daily', fred: 'T10YIE', label: 'توقعات التضخم 10 سنوات', unit: '%', src: 'fred', max_age_min: 6 * D },
  { id: 'usd_broad', group: 'fred_daily', fred: 'DTWEXBGS', label: 'مؤشر الدولار الموسّع للفدرالي (أسبوعي التأخر)', unit: 'index', src: 'fred', max_age_min: 12 * D },
  { id: 'cpi_yoy', group: 'fred_monthly', fred: 'CPIAUCSL', label: 'التضخم الأمريكي السنوي CPI', unit: '%', src: 'fred', max_age_min: 100 * D },
  { id: 'fed_funds', group: 'fred_monthly', fred: 'FEDFUNDS', label: 'سعر الفائدة الفعلي', unit: '%', src: 'fred', max_age_min: 100 * D },
  { id: 'unrate', group: 'fred_monthly', fred: 'UNRATE', label: 'البطالة الأمريكية', unit: '%', src: 'fred', max_age_min: 100 * D },
  { id: 'gdp', group: 'fred_monthly', fred: 'GDP', label: 'الناتج المحلي الأمريكي', unit: 'مليار USD (سنوي)', src: 'fred', max_age_min: 200 * D },
  { id: 'cot_gold', group: 'cot', cftc: '088691', label: 'COT الذهب — صافي المضاربين وتغيّره الأسبوعي', unit: 'عقود', src: 'cftc', max_age_min: 14 * D },
  { id: 'cot_silver', group: 'cot', cftc: '084691', label: 'COT الفضة — صافي المضاربين وتغيّره الأسبوعي', unit: 'عقود', src: 'cftc', max_age_min: 14 * D },
];

// ------------------------------------------------------------------
// الجوالب: كل دالة تعيد { [indicator_id]: { value, data_time, extra? } }
// ------------------------------------------------------------------
const F = {};
F.metals = async () => {
  const out = {};
  for (const [id, sym] of [['xau_usd', 'XAU'], ['xag_usd', 'XAG']]) {
    const j = (await http(`https://api.gold-api.com/price/${sym}`)).json();
    if (!Number.isFinite(j.price)) throw new Error('لا حقل price لـ ' + sym);
    out[id] = { value: r2(j.price), data_time: j.updatedAt ? iso(j.updatedAt) : null };
  }
  // تحقق متبادل (لا يُعرض): Swissquote
  try {
    const q = (await http('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD')).json();
    const p = q?.[0]?.spreadProfilePrices?.[0]; if (p) { const mid = (p.bid + p.ask) / 2; out.xau_usd.check = { source: 'Swissquote (مقارنة داخلية)', mid: r2(mid), diff_pct: r2((out.xau_usd.value / mid - 1) * 100) }; }
  } catch (e) { out.xau_usd.check = { source: 'Swissquote', error: clip(e.message, 80) }; }
  if (out.xau_usd.check?.diff_pct != null && Math.abs(out.xau_usd.check.diff_pct) > 1) throw new Error(`Gold-API يختلف ${out.xau_usd.check.diff_pct}% عن مصدر المقارنة: يُرفض حتى يتفقا`);
  return out;
};

const unesc = (h) => h.replace(/\\u([0-9a-fA-F]{4})/g, (_, x) => String.fromCharCode(parseInt(x, 16))).replace(/\\n/g, ' ').replace(/\\"/g, '"');
const fullText = (html) => normDigits(unesc(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;/g, "'").replace(/\s+/g, ' '));
const N = '(\\d{1,3}(?:,\\d{3})+|\\d{4,7})';
let shafaqFeed = null;
async function shafaqItems() {
  if (shafaqFeed) return shafaqFeed;
  const feed = (await http('https://shafaq.com/en/Economy?rss=1')).text();
  shafaqFeed = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({ title: ((m[1].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '').trim(), link: ((m[1].match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '').trim(), pub: ((m[1].match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '').trim() }));
  if (!shafaqFeed.length) throw new Error('RSS شفق فارغ');
  return shafaqFeed;
}
async function shafaqArticle(it) {
  const html = (await http(it.link)).text();
  const published = (html.match(/"datePublished"\s*:\s*"([^"]+)"/) || [])[1] || (it.pub ? iso(it.pub) : null);
  return { published: published ? iso(published) : null, text: fullText(html), link: it.link };
}
async function newestParsed(filter, parse, limit = 5) {
  const items = (await shafaqItems()).filter((i) => filter(i.title)).slice(0, limit);
  if (!items.length) throw new Error('لا خبر مناسب في RSS شفق');
  const got = [];
  for (const it of items) { try { const a = await shafaqArticle(it); const v = parse(a.text); if (v && a.published) { got.push({ ...v, published: a.published, link: a.link }); if (got.length >= 2) break; } } catch { /* نجرّب الخبر التالي */ } } // RSS مرتّب من الأحدث؛ خبران يكفيان للتأكد من الأحدث
  if (!got.length) throw new Error(`فُتحت ${items.length} أخبار ولم يُستخرج رقم صالح`);
  return got.sort((x, y) => y.published.localeCompare(x.published))[0];
}
F.shafaq_usd = async () => {
  const a = await newestParsed((t) => /dollar|USD/i.test(t), (t) => {
    const b = t.match(new RegExp(`(?:Al-Kifah|Kifah)[^.]{0,160}?${N}\\s*(?:dinars|IQD)`, 'i')); if (!b) return null;
    const shop = t.match(new RegExp(`exchange (?:shops|stores)[^.]{0,120}?(?:selling|sold|sell)[^.\\d]{0,40}${N}[^.]{0,80}?(?:buying|bought|buy)[^.\\d]{0,40}${N}`, 'i'));
    const v = toNum(b[1]); if (!(v > 100000 && v < 400000)) return null;
    return { bourse: v, shop: shop ? { sell: toNum(shop[1]), buy: toNum(shop[2]) } : null };
  });
  const out = { usd_iqd_parallel: { value: a.bourse, data_time: a.published, link: a.link } };
  if (a.shop && a.shop.sell >= a.shop.buy) out.usd_iqd_shops_baghdad = { value: a.shop, data_time: a.published, link: a.link };
  return out;
};
// f1-v4.11: لا جلب لأسعار الصاغة المحلية (قرار المستخدم: الذهب بالدينار محسوب من العالمي فقط)
F.cbi = async () => {
  const t = normDigits(fullText((await http('https://cbi.iq/')).text()));
  const m = t.match(/USD[^\d]{0,40}(\d[\d,]*\.?\d*)/); if (!m) throw new Error('لم أجد سعر USD في الصفحة');
  const v = toNum(m[1]); if (!(v > 1000 && v < 3000)) throw new Error('رقم خارج النطاق: ' + v);
  return { usd_iqd_official: { value: v, data_time: null, note: 'الصفحة لا تذكر تاريخ النشرة؛ وقت البيانات = وقت الجلب' } };
};
F.treasury = async () => {
  try { return await treasuryOfficial(); }
  catch (e) { // احتياط: السلاسل نفسها من FRED (مصدرها الفدرالي H.15)، مع ذكر ذلك صراحة
    const out = {};
    for (const [id, sid] of [['ust10y', 'DGS10'], ['ust2y', 'DGS2'], ['real10y', 'DFII10']]) {
      const ob = (await fredObs(sid, 10, 30))[0]; if (ob) out[id] = { value: Number(ob.value), data_time: ob.date, note: `وزارة الخزانة لم تستجب (${clip(e.message, 40)})؛ القيمة من FRED ${sid}`, via: 'FRED' };
    }
    if (!out.ust10y) throw e; return out;
  }
};
async function treasuryOfficial() {
  const y = NOW.getUTCFullYear(), out = {};
  const csv = async (type) => { const t = (await http(`https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${y}/all?type=${type}&field_tdr_date_value=${y}&page&_format=csv`)).text();
    const L = t.trim().split(/\r?\n/), head = L[0].split(',').map((x) => x.replace(/"/g, '').trim().toLowerCase()), row = (L[1] || '').split(',').map((x) => x.replace(/"/g, '').trim());
    const [mm, dd, yy] = row[0].split('/'); return { date: `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`, get: (n) => { const i = head.indexOf(n); const v = i >= 0 ? Number(row[i]) : NaN; return Number.isFinite(v) ? v : null; } }; };
  const n = await csv('daily_treasury_yield_curve'); const r = await csv('daily_treasury_real_yield_curve');
  if (n.get('10 yr') == null) throw new Error('عمود 10 Yr غير موجود');
  out.ust10y = { value: n.get('10 yr'), data_time: n.date }; if (n.get('2 yr') != null) out.ust2y = { value: n.get('2 yr'), data_time: n.date };
  if (r.get('10 yr') != null) out.real10y = { value: r.get('10 yr'), data_time: r.date };
  return out;
}
// ملاحظات FRED: بالمفتاح عبر الواجهة الرسمية، وبدونه عبر ملف CSV العام (احتياط). الناتج: الأحدث أولاً، بلا قيم فارغة
async function fredObs(id, limit, sinceDays) {
  if (FRED_KEY) {
    const o = (await http(`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=${limit}`)).json();
    return (o.observations || []).filter((x) => x.value !== '.' && x.value !== '').map(({ date, value }) => ({ date, value }));
  }
  const from = new Date(NOW.getTime() - (sinceDays || 3 * 365) * 864e5).toISOString().slice(0, 10);
  const t = (await http(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${from}`)).text();
  return t.trim().split(/\r?\n/).slice(1).map((l) => l.split(',')).filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c[0]) && c[1] && c[1] !== '.').map(([date, value]) => ({ date, value })).reverse().slice(0, limit);
}
async function fredGroup(group) {
  const out = {};
  for (const ind of IND.filter((i) => i.group === group)) {
    try {
      const obs = await fredObs(ind.fred, 26, ind.fred === 'GDP' ? 900 : 800); if (!obs.length) throw new Error('لا ملاحظات');
      let v = Number(obs[0].value), dt = obs[0].date, note = null;
      if (ind.fred === 'CPIAUCSL') { // أحدث شهر له قيمة قبل سنة تماماً (بعض الأشهر غير منشورة، مثل أكتوبر 2025)
        const hit = obs.map((o) => [o, obs.find((x) => x.date === String(+o.date.slice(0, 4) - 1) + o.date.slice(4))]).find(([, p]) => p);
        if (!hit) throw new Error('لا يوجد شهر له قيمة قبل سنة لحساب التضخم السنوي');
        v = r2((Number(hit[0].value) / Number(hit[1].value) - 1) * 100); dt = hit[0].date; if (dt !== obs[0].date) note = `أحدث شهر منشور ${obs[0].date} بلا قيمة مقابلة قبل سنة؛ استُعمل ${dt}`;
      }
      out[ind.id] = { value: v, data_time: dt, note };
    } catch (e) { out[ind.id] = { error: clip(e.message, 120) }; }
  }
  return out;
}
F.fred_daily = () => fredGroup('fred_daily');
F.fred_monthly = () => fredGroup('fred_monthly');
F.cot = async () => {
  const out = {};
  for (const ind of IND.filter((i) => i.group === 'cot')) {
    try {
      const rows = (await http(`https://publicreporting.cftc.gov/resource/6dca-aqww.json?cftc_contract_market_code=${ind.cftc}&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=2`)).json();
      if (!rows.length) throw new Error('لا صفوف');
      const net = (x) => +x.noncomm_positions_long_all - +x.noncomm_positions_short_all; const a = net(rows[0]);
      if (!Number.isFinite(a)) throw new Error('حقول غير رقمية');
      out[ind.id] = { value: { net_noncommercial: a, change_week: rows[1] ? a - net(rows[1]) : null, open_interest: +rows[0].open_interest_all }, data_time: rows[0].report_date_as_yyyy_mm_dd.slice(0, 10), note: 'Futures Only (Legacy). تاريخ التقرير الثلاثاء، يُنشر الجمعة' };
    } catch (e) { out[ind.id] = { error: clip(e.message, 120) }; }
  }
  return out;
};
F.dxy = async () => {
  const j = (await http('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,JPY,GBP,CAD,SEK,CHF')).json(); const x = j.rates || {};
  // معادلة ICE الرسمية لـ DXY مكتوبة بصيغة «عملة لكل دولار»
  const v = 50.14348112 * x.EUR ** 0.576 * x.JPY ** 0.136 * x.GBP ** 0.119 * x.CAD ** 0.091 * x.SEK ** 0.042 * x.CHF ** 0.036;
  if (!Number.isFinite(v)) throw new Error('أسعار ناقصة لحساب DXY');
  return { dxy: { value: r2(v), data_time: j.date, note: 'يُحدَّث مرة يومياً بعد نشر أسعار البنك المركزي الأوروبي (~16:00 بتوقيت أوروبا)' } };
};

// السلاسل التاريخية للتحليل والأخبار: تُكتب في data/series.json (لا مؤشرات في market.json)
let SERIES = null;
F.series = async () => {
  const sr = { schema: 'nabd-series/1', generated_at: iso(NOW), fred: {}, cot: {}, releases: {}, errors: [] };
  const daily = [['DFII10', 'العائد الحقيقي 10 سنوات'], ['DTWEXBGS', 'الدولار الموسّع'], ['DGS10', 'عائد 10 سنوات'], ['T10YIE', 'توقعات التضخم']];
  for (const [id, label] of daily) { try { sr.fred[id] = { label, obs: (await fredObs(id, 400, 600)).reverse().map((o) => [o.date, Number(o.value)]) }; } catch (e) { sr.errors.push(id + ': ' + clip(e.message, 60)); } }
  for (const [id, label] of [['FEDFUNDS', 'الفائدة الفعلية'], ['UNRATE', 'البطالة']]) { try { sr.fred[id] = { label, obs: (await fredObs(id, 36, 1200)).reverse().map((o) => [o.date, Number(o.value)]) }; } catch (e) { sr.errors.push(id + ': ' + clip(e.message, 60)); } }
  try { const c = (await fredObs('CPIAUCSL', 60, 2000)), m = new Map(c.map((o) => [o.date, Number(o.value)]));
    sr.fred.CPI_YOY = { label: 'التضخم السنوي', obs: c.map((o) => { const p = m.get(String(+o.date.slice(0, 4) - 1) + o.date.slice(4)); return p ? [o.date, r2((Number(o.value) / p - 1) * 100)] : null; }).filter(Boolean).reverse().slice(-36) }; } catch (e) { sr.errors.push('CPI: ' + clip(e.message, 60)); }
  try { const u = (await fredObs('DFEDTARU', 1200, 1500)).reverse(); const ch = []; for (const [i, o] of u.entries()) if (!i || o.value !== u[i - 1].value) ch.push([o.date, Number(o.value)]); if (u.length) ch.push([u[u.length - 1].date, Number(u[u.length - 1].value)]); sr.fred.FEDTARU = { label: 'الحد الأعلى للفائدة (تغييرات)', obs: ch }; } catch (e) { sr.errors.push('DFEDTARU: ' + clip(e.message, 60)); }
  for (const [k, code] of [['gold', '088691'], ['silver', '084691']]) {
    try { const rows = (await http(`https://publicreporting.cftc.gov/resource/6dca-aqww.json?cftc_contract_market_code=${code}&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=156`)).json();
      sr.cot[k] = rows.map((x) => [x.report_date_as_yyyy_mm_dd.slice(0, 10), +x.noncomm_positions_long_all - +x.noncomm_positions_short_all]).reverse(); } catch (e) { sr.errors.push('COT ' + k + ': ' + clip(e.message, 60)); }
  }
  if (FRED_KEY) for (const [k, rid] of [['cpi', 10], ['jobs', 50]]) {
    try { const j = (await http(`https://api.stlouisfed.org/fred/release/dates?release_id=${rid}&api_key=${FRED_KEY}&file_type=json&include_release_dates_with_no_data=true&realtime_start=${iso(NOW).slice(0, 10)}&sort_order=asc&limit=3`)).json();
      sr.releases[k] = (j.release_dates || []).map((x) => x.date).filter((d) => d >= iso(NOW).slice(0, 10)).slice(0, 2); } catch (e) { sr.errors.push('release ' + k + ': ' + clip(e.message, 60)); }
  }
  if (!Object.keys(sr.fred).length && !Object.keys(sr.cot).length) throw new Error('لم تُجلب أي سلسلة: ' + sr.errors.join(' | '));
  SERIES = sr; return {};
};

// ------------------------------------------------------------------
// المنطق: الدمج مع الملف السابق، الصلاحية، القديم، المحسوب
// ------------------------------------------------------------------
const prev = (() => { try { return JSON.parse(readFileSync(OUT, 'utf8')); } catch { return null; } })();
const prevInd = Object.fromEntries((prev?.indicators || []).map((x) => [x.id, x]));
const prevGroups = prev?.groups || {};
const groupsState = {};
const runLog = [];

const numOf = (v) => (typeof v === 'number' ? v : v && typeof v === 'object' ? (v.sell ?? v.net_noncommercial ?? null) : null);
function isFresh(rec, ind) {
  const t = rec.data_time || rec.fetched_ok_at; const a = ageMin(t);
  if (a == null) return false;
  if (ind.market) { const d = NOW.getUTCDay(), h = NOW.getUTCHours(); const closed = d === 6 || (d === 0 && h < 22) || (d === 5 && h >= 22); if (closed) return a <= 3 * D; }
  return a <= ind.max_age_min;
}

for (const [g, cfg] of Object.entries(GROUPS)) {
  const last = prevGroups[g]?.last_attempt_at; const failedBefore = Boolean(prevGroups[g]?.last_error); // المجموعة الفاشلة يُعاد جلبها في التشغيل التالي (بعد ساعة) لا بعد دوريتها الكاملة
  const due = FORCE || !last || ageMin(last) >= (failedBefore ? Math.min(55, cfg.every_min - 5) : cfg.every_min - 5);
  groupsState[g] = { label: cfg.label, every_min: cfg.every_min, last_attempt_at: prevGroups[g]?.last_attempt_at || null, last_ok_at: prevGroups[g]?.last_ok_at || null, last_error: prevGroups[g]?.last_error || null, ran: false };
  if (!due) { runLog.push(`${g}: لم يحن موعده`); continue; }
  groupsState[g].ran = true; groupsState[g].last_attempt_at = iso(NOW);
  let res = {}, gErr = null;
  try { res = await F[g](); } catch (e1) { await new Promise((ok) => setTimeout(ok, MOCK ? 50 : 4000)); shafaqFeed = null; try { res = await F[g](); runLog.push(`${g}: نجح في المحاولة الثانية بعد: ${clip(e1.message, 60)}`); } catch (e) { gErr = clip(e.message, 200); } }
  groupsState[g].last_error = gErr; if (!gErr) groupsState[g].last_ok_at = iso(NOW);
  runLog.push(`${g}: ${gErr ? 'فشل — ' + gErr : 'نجح'}`);
  for (const ind of IND.filter((i) => i.group === g)) {
    const old = prevInd[ind.id]; const got = res[ind.id]; const err = gErr || got?.error || (!got ? 'لم يُستخرج من الرد' : null);
    const rec = { id: ind.id, label: ind.label, unit: ind.unit, group: g, source: SRC[ind.src], value: old?.value ?? null, data_time: old?.data_time ?? null,
      fetched_at: iso(NOW), fetched_ok_at: old?.fetched_ok_at ?? null, update: 'failed', error: null, note: old?.note ?? null, link: old?.link ?? null, check: old?.check ?? null };
    if (err) { rec.error = clip(err, 200); }
    else {
      const nv = numOf(got.value), ov = numOf(old?.value);
      const outOfRange = ind.range && nv != null && (nv < ind.range[0] || nv > ind.range[1]);
      const jump = ind.jump_pct && nv != null && ov != null && Math.abs(nv / ov - 1) * 100 > ind.jump_pct && ageMin(old?.fetched_ok_at) != null && ageMin(old.fetched_ok_at) < 2 * D;
      if (outOfRange || jump) { rec.update = 'rejected'; rec.error = outOfRange ? `قيمة خارج النطاق المنطقي: ${nv}` : `قفزة ${r2((nv / ov - 1) * 100)}% عن القيمة السابقة: رُفضت حتى تتأكد في جلب لاحق`; rec.rejected_value = got.value;
        if (jump && old?.rejected_value != null && Math.abs(numOf(old.rejected_value) / nv - 1) < 0.02) { rec.update = 'ok'; rec.error = null; delete rec.rejected_value; } }
      if (rec.update !== 'rejected') { Object.assign(rec, { value: got.value, data_time: got.data_time || null, fetched_ok_at: iso(NOW), update: 'ok', note: got.note ?? null, link: got.link ?? null, check: got.check ?? null, source: got.via === 'FRED' ? SRC.fred : SRC[ind.src] }); if (!got.data_time) rec.data_time = null; }
    }
    rec.every_min = GROUPS[g].every_min; rec.max_age_min = ind.max_age_min;
    prevInd[ind.id] = rec;
  }
}
// المؤشرات التي لم يحن موعدها تبقى كما هي، مع إعادة حساب «حالية/قديمة»
const indicators = IND.map((ind) => {
  const r = prevInd[ind.id] || { id: ind.id, label: ind.label, unit: ind.unit, group: ind.group, source: SRC[ind.src], value: null, data_time: null, fetched_at: null, fetched_ok_at: null, update: 'pending', error: null };
  if (r.value == null) r.status = 'unavailable';
  else r.status = isFresh(r, ind) && r.update !== 'failed' && r.update !== 'rejected' ? 'current' : 'stale';
  if (r.update !== 'ok' && r.update !== 'pending' && r.value != null && !groupsState[ind.group].ran) r.status = 'stale';
  if (ind.review && r.value != null) { r.status = 'review'; r.review = ind.review; }
  r.status_ar = { current: 'حالية', stale: 'قديمة — لا تُعرض كسعر حالي', unavailable: 'غير متاحة', review: 'تجريبية — تحتاج مراجعة، لا تُعرض' }[r.status];
  r.age_min = ageMin(r.data_time || r.fetched_ok_at);
  return r;
});
// ملاحظة: المؤشر الذي لم يحن موعده يحتفظ بحالة آخر جلب (update) ويُعاد حساب عمره فقط.

// المحسوبات: لا تُحسب إلا من مدخلات «حالية»؛ وإلا تُعلَّم قديمة أو غير متاحة.
const I = Object.fromEntries(indicators.map((x) => [x.id, x]));
const derived = [];
const mk = (id, label, unit, inputs, fn, note) => {
  const ins = inputs.map((k) => I[k]); const missing = ins.some((x) => x.value == null);
  const d = { id, label, unit, source: SRC.calc, inputs: Object.fromEntries(ins.map((x) => [x.id, { value: x.value, data_time: x.data_time, status: x.status }])), note };
  if (missing) return derived.push({ ...d, value: null, status: 'unavailable', status_ar: 'غير متاحة' });
  d.value = fn(...ins.map((x) => x.value)); d.status = ins.every((x) => x.status === 'current') ? 'current' : 'stale'; d.status_ar = d.status === 'current' ? 'حالية' : 'قديمة: أحد المدخلات قديم';
  const ts = ins.map((x) => Date.parse(x.data_time || x.fetched_ok_at)).filter(Number.isFinite); d.time_gap_hours = ts.length > 1 ? r2((Math.max(...ts) - Math.min(...ts)) / 3600000, 1) : 0;
  derived.push(d);
};
const OZ = 31.1034768;
// السعر المرجعي (قرار المستخدم): متوسط بيع وشراء صيرفات بغداد من النشرة نفسها، وإلا سعر البورصة. البيع والشراء يبقيان منفصلين
(() => { const p = I.usd_iqd_parallel, sh = I.usd_iqd_shops_baghdad, same = sh && sh.value && p && sh.data_time && sh.data_time === p.data_time && sh.value.buy > 0 && sh.value.sell >= sh.value.buy;
  const v = same ? Math.round((sh.value.buy + sh.value.sell) / 2) : p?.value ?? null, base = same ? sh : p;
  I.usd_iqd_ref = { id: 'usd_iqd_ref', value: v, status: v == null ? 'unavailable' : base.status, data_time: base?.data_time ?? null, fetched_ok_at: base?.fetched_ok_at ?? null };
  derived.push({ id: 'usd_iqd_ref', label: 'السعر المرجعي للدولار (متوسط البيع والشراء)', unit: 'IQD/100 USD', source: SRC.calc, basis: v == null ? null : same ? 'mid' : 'bourse', buy: same ? sh.value.buy : null, sell: same ? sh.value.sell : null,
    inputs: Object.fromEntries([p, same ? sh : null].filter(Boolean).map((x) => [x.id, { value: x.value, data_time: x.data_time, status: x.status }])), value: v, status: I.usd_iqd_ref.status, status_ar: v == null ? 'غير متاحة' : I.usd_iqd_ref.status === 'current' ? 'حالية' : 'قديمة', time_gap_hours: 0 }); })();
mk('gsr', 'نسبة الذهب إلى الفضة', 'ratio', ['xau_usd', 'xag_usd'], (g, s) => r2(g / s));
const conv = (id, label, inputs, perOz, note) => mk(id, label, 'USD & IQD', inputs, (m, p) => { const usd = m * perOz; return { usd: r2(usd), iqd: Math.round(usd * p / 100) }; }, note || 'تحويل حسابي من السعر العالمي بالسعر المرجعي للدولار (متوسط البيع والشراء). لا يشمل المصنعية');
conv('gold_ounce_iqd', 'الذهب — أونصة', ['xau_usd', 'usd_iqd_ref'], 1);
conv('gold24_gram', 'ذهب عيار 24 — غرام', ['xau_usd', 'usd_iqd_ref'], 1 / OZ);
conv('gold21_gram', 'ذهب عيار 21 — غرام', ['xau_usd', 'usd_iqd_ref'], 0.875 / OZ);
conv('gold21_mithqal', 'ذهب عيار 21 — مثقال (5 غرام)', ['xau_usd', 'usd_iqd_ref'], 0.875 * 5 / OZ);
conv('gold24_mithqal', 'ذهب عيار 24 — مثقال (5 غرام)', ['xau_usd', 'usd_iqd_ref'], 5 / OZ);
conv('silver_ounce_iqd', 'الفضة — أونصة', ['xag_usd', 'usd_iqd_ref'], 1);
conv('silver999_kg', 'فضة 999 — كيلو', ['xag_usd', 'usd_iqd_ref'], 1000 * 0.999 / OZ);
// f1-v4.11: لا «المتوقع مع المصنعية» ولا مقارنة بسعر صاغة محلي في نبض السوق (قرار المستخدم)
mk('official_parallel_gap', 'فجوة الدولار الرسمي العراقي عن الموازي (السعر المرجعي)', '%', ['usd_iqd_official', 'usd_iqd_ref'], (o, p) => r2((p / 100 / o - 1) * 100));
mk('fed_target_range', 'نطاق الفائدة الأمريكية الرسمي', '%', ['fed_target_lower', 'fed_target_upper'], (l, u) => `${l}–${u}`);

const market = {
  schema: 'nabd-market/1', generated_at: iso(NOW), run: { forced: FORCE, log: runLog },
  rules: { stale: 'القيمة القديمة تبقى للمرجع فقط ولا تُعرض كسعر حالي', no_guess: 'لا قيمة مقدّرة: عند غياب المصدر تكون القيمة null وحالتها «غير متاحة»', conversions: 'أسعار الذهب والفضة بالدينار تحويل حسابي من السعر العالمي بسعر الموازي، ولا تشمل المصنعية' },
  attribution: [SRC.fred.attribution, 'سعر الدولار في السوق العراقي: مسح Shafaq News (يُذكر المصدر والرابط)'],
  groups: groupsState, indicators, derived,
};
let json = JSON.stringify(market, null, 1);
json = redact(json);
for (const s of SECRETS) if (json.includes(s)) throw new Error('توقف: سرّ داخل الملف الناتج');
mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, json + '\n');
if (SERIES) { const sj = redact(JSON.stringify(SERIES)); for (const sct of SECRETS) if (sj.includes(sct)) throw new Error('توقف: سرّ داخل السلاسل'); writeFileSync(join(dirname(OUT), 'series.json'), sj + '\n'); }

// سجل يومي (لقطة لكل يوم بتوقيت بغداد = آخر قيمة حالية في ذلك اليوم) لاستعماله لاحقاً في التحليل
const HIST = join(dirname(OUT), 'history.json');
const hist = (() => { try { return JSON.parse(readFileSync(HIST, 'utf8')); } catch { return { schema: 'nabd-history/1', note: 'لقطة يومية بتوقيت بغداد؛ القيم الحالية فقط', days: {} }; } })();
const day = new Date(NOW.getTime() + 3 * 3600000).toISOString().slice(0, 10);
const snap = hist.days[day] || {}; delete snap.gold21_mithqal_nahr; // لا أسعار صاغة (f1-v4.11)
for (const id of ['xau_usd', 'xag_usd', 'usd_iqd_parallel', 'usd_iqd_ref', 'usd_iqd_official', 'dxy', 'fed_target_upper', 'cpi_yoy', 'unrate', 'real10y', 'ust10y']) { const x = I[id]; if (x && x.status === 'current') snap[id] = x.value; }
const gsrD = derived.find((d) => d.id === 'gsr'); if (gsrD?.status === 'current') snap.gsr = gsrD.value;
const shb = I.usd_iqd_shops_baghdad; if (shb?.status === 'current' && shb.value) { snap.usd_buy = shb.value.buy; snap.usd_sell = shb.value.sell; }
const cg = I.cot_gold; if (cg?.status === 'current') snap.cot_gold_net = cg.value.net_noncommercial;
// لقطات ضمن اليوم (آخر 8 أيام) لمنحنى «يوم» و«أسبوع»: تُضاف فقط عند جلب جديد ناجح
hist.intraday = hist.intraday || {};
const addIntra = (k, x) => { if (!x || x.status !== 'current' || x.update !== 'ok' || !groupsState[x.group].ran) return; const a = hist.intraday[k] = hist.intraday[k] || []; const t = x.data_time || x.fetched_ok_at; if (!a.length || a[a.length - 1][0] !== t) a.push([t, typeof x.value === 'number' ? x.value : x.value.sell]); const cut = iso(NOW.getTime() - 8 * 864e5); hist.intraday[k] = a.filter((p) => p[0] >= cut); };
addIntra('xau_usd', I.xau_usd); addIntra('xag_usd', I.xag_usd); addIntra('usd_iqd_parallel', I.usd_iqd_parallel); addIntra('dxy', I.dxy);
// لا حدّ لعدد الأيام في الأرشيف الكامل (archive/)؛ هذا السجل الخفيف للتطبيق فقط ويحتفظ بآخر 1100 يوم
if (Object.keys(snap).length) { hist.days[day] = snap; const keys = Object.keys(hist.days).sort(); for (const k of keys.slice(0, Math.max(0, keys.length - 1100))) delete hist.days[k]; }
const hjson = redact(JSON.stringify(hist)); for (const sct of SECRETS) if (hjson.includes(sct)) throw new Error('توقف: سرّ داخل السجل'); writeFileSync(HIST, hjson + '\n');
const cnt = (st) => indicators.filter((x) => x.status === st).length;
console.log(redact(`market.json: ${cnt('current')} حالية، ${cnt('stale')} قديمة، ${cnt('unavailable')} غير متاحة\n` + runLog.join('\n')));

// الأرشيف الكامل (f1-v4.11): إضافة فقط، بلا حد زمني، مع المصدر ووقت البيانات ووقت الجلب لكل قيمة، وبصمة تكامل
import('./archive.mjs').then(({ appendRun }) => { const r = appendRun({ root: process.env.ARCHIVE_DIR || 'archive', indicators, groupsState, now: NOW });
  console.log(`archive: +${r.added} سجل في ${r.files.join(', ') || '—'}`); }).catch((e) => { console.error('archive: ' + redact(e.message)); process.exitCode = 2; });
