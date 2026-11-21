#!/usr/bin/env node
// أرشيف «نبض السوق» الكامل (f1-v4.11) — إضافة فقط (append-only)، بلا حد زمني.
// البنية:
//   archive/obs/YYYY-MM.jsonl  سطر لكل قيمة مرصودة جديدة: { n, id, v, t (وقت البيانات), at (وقت الجلب), src, url, kind:'obs' }
//   archive/last.json          آخر بصمة لكل مؤشر (لمنع التكرار فقط؛ يُعاد بناؤه من الملفات عند فقده)
//   archive/MANIFEST.json      لكل ملف: عدد الأسطر والحجم وSHA-256، وسلسلة بصمات (head) تربط كل الأسطر بالترتيب
//   archive/rtfx/IRQ_<تاريخ التنزيل>.csv  نسخ البنك الدولي RTFX كما نُزّلت، كل تنزيل نسخة منفصلة لا تُدمج مع المرصود
// الأوامر: verify | append-only <old> <new> | restore <from> <to> | rtfx <csv> <YYYY-MM-DD>
// المصادر تبقى هنا فقط؛ التطبيق لا يعرضها.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const readJ = (p, d) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return d; } };
const files = (root) => { const d = join(root, 'obs'); return existsSync(d) ? readdirSync(d).filter((f) => /^\d{4}-\d{2}\.jsonl$/.test(f)).sort() : []; };
const lines = (p) => { const t = readFileSync(p, 'utf8'); return t ? t.split('\n').filter((x) => x !== '') : []; };

// يعيد حساب البيان كاملاً من الملفات: البصمات والعدّ وسلسلة head
export function buildManifest(root) {
  let head = 'nabd-archive/1', n = 0; const out = { schema: 'nabd-archive-manifest/1', files: {}, rtfx: readJ(join(root, 'MANIFEST.json'), {}).rtfx || {} };
  for (const f of files(root)) { const p = join(root, 'obs', f), buf = readFileSync(p), ls = lines(p); for (const l of ls) head = sha(head + '\n' + l); n += ls.length; out.files[f] = { lines: ls.length, bytes: buf.length, sha256: sha(buf) }; }
  out.count = n; out.head = head; return out;
}
function lastFromFiles(root) { const last = {}; for (const f of files(root)) for (const l of lines(join(root, 'obs', f))) { const r = JSON.parse(l); last[r.id] = JSON.stringify([r.t, r.v]); } return last; }

// إضافة ما جُلب بنجاح في هذا التشغيل فقط، دون تكرار قيمة بالوقت نفسه
export function appendRun({ root = 'archive', indicators, groupsState, now = new Date() }) {
  mkdirSync(join(root, 'obs'), { recursive: true });
  const man0 = readJ(join(root, 'MANIFEST.json'), null);
  if (man0) { const chk = buildManifest(root); if (chk.head !== man0.head || chk.count !== man0.count) throw new Error('الأرشيف لا يطابق بيانه (MANIFEST): لن يُضاف شيء حتى يُفحص'); }
  const last = existsSync(join(root, 'last.json')) ? readJ(join(root, 'last.json'), {}) : lastFromFiles(root);
  let n = man0 ? man0.count : 0; const add = [];
  for (const x of indicators) {
    if (!groupsState[x.group]?.ran || x.update !== 'ok' || x.value == null) continue;
    const t = x.data_time || null, sig = JSON.stringify([t, x.value]); if (last[x.id] === sig) continue;
    last[x.id] = sig; add.push(JSON.stringify({ n: ++n, id: x.id, v: x.value, t, at: x.fetched_ok_at, src: x.source?.name || null, url: x.link || x.source?.url || null, kind: 'obs' }));
  }
  const f = new Date(now).toISOString().slice(0, 7) + '.jsonl', p = join(root, 'obs', f);
  if (add.length) writeFileSync(p, (existsSync(p) ? readFileSync(p, 'utf8') : '') + add.join('\n') + '\n');
  writeFileSync(join(root, 'last.json'), JSON.stringify(last) + '\n');
  writeFileSync(join(root, 'MANIFEST.json'), JSON.stringify(buildManifest(root), null, 1) + '\n');
  return { added: add.length, files: add.length ? [f] : [] };
}

// فحص السلامة: كل سطر JSON صالح، الترقيم متسلسل بلا فجوات، والبيان يطابق الملفات
export function verify(root = 'archive') {
  const bad = [], man = readJ(join(root, 'MANIFEST.json'), null); if (!man) return { ok: !files(root).length, bad: files(root).length ? ['لا يوجد MANIFEST.json'] : [], count: 0 };
  let k = 0;
  for (const f of files(root)) for (const l of lines(join(root, 'obs', f))) { let r; try { r = JSON.parse(l); } catch { bad.push(f + ': سطر غير صالح'); continue; }
    if (r.n !== ++k) bad.push(`${f}: الترقيم مختل عند ${r.n} (المتوقع ${k})`); if (!r.id || r.v === undefined || r.kind !== 'obs') bad.push(`${f}: حقول ناقصة في ${r.n}`); if (bad.length > 20) break; }
  const chk = buildManifest(root); if (chk.head !== man.head) bad.push('سلسلة البصمات لا تطابق البيان'); if (chk.count !== man.count) bad.push(`العدد ${chk.count} لا يطابق البيان ${man.count}`);
  for (const [f, m] of Object.entries(man.files || {})) if (!chk.files[f]) bad.push('ملف مفقود: ' + f); else if (chk.files[f].sha256 !== m.sha256) bad.push('بصمة مختلفة: ' + f);
  for (const [v, m] of Object.entries(man.rtfx || {})) { const p = join(root, 'rtfx', m.file); if (!existsSync(p)) bad.push('نسخة RTFX مفقودة: ' + m.file); else if (sha(readFileSync(p)) !== m.sha256) bad.push('بصمة RTFX مختلفة: ' + m.file); }
  return { ok: !bad.length, bad, count: chk.count };
}
// «إضافة فقط»: كل ملف قديم يجب أن يكون بداية الملف الجديد حرفياً، ولا يُحذف ملف
export function appendOnly(oldRoot, newRoot) {
  const bad = []; for (const f of files(oldRoot)) { const a = readFileSync(join(oldRoot, 'obs', f)), p = join(newRoot, 'obs', f);
    if (!existsSync(p)) { bad.push('حُذف ملف: ' + f); continue; } const b = readFileSync(p); if (b.length < a.length || !b.subarray(0, a.length).equals(a)) bad.push('تعديل أو حذف داخل ملف: ' + f); }
  const ro = join(oldRoot, 'rtfx'); if (existsSync(ro)) for (const f of readdirSync(ro)) { const p = join(newRoot, 'rtfx', f); if (!existsSync(p) || !readFileSync(p).equals(readFileSync(join(ro, f)))) bad.push('نسخة RTFX تغيّرت أو حُذفت: ' + f); }
  return { ok: !bad.length, bad };
}
// الاستعادة من نسخة احتياطية: تُفحص النسخة أولاً، ثم تُنسخ ملفاتها، ثم يُفحص الناتج
export function restore(from, to) {
  const v0 = verify(from); if (!v0.ok) throw new Error('النسخة الاحتياطية غير سليمة: ' + v0.bad.join(' | '));
  if (existsSync(join(to, 'MANIFEST.json'))) { const ao = appendOnly(to, from); if (!ao.ok) throw new Error('النسخة الاحتياطية ليست امتداداً للأرشيف الحالي: ' + ao.bad.join(' | ')); }
  for (const d of ['obs', 'rtfx']) { const s = join(from, d); if (!existsSync(s)) continue; mkdirSync(join(to, d), { recursive: true }); for (const f of readdirSync(s)) copyFileSync(join(s, f), join(to, d, f)); }
  for (const f of ['MANIFEST.json', 'last.json', 'README.md']) if (existsSync(join(from, f))) copyFileSync(join(from, f), join(to, f));
  const v1 = verify(to); if (!v1.ok) throw new Error('الاستعادة لم تنتج أرشيفاً سليماً: ' + v1.bad.join(' | ')); return v1;
}
// نسخة RTFX من البنك الدولي: تُحفظ كما هي باسم تاريخ تنزيلها، ولا تُدمج أبداً مع المرصود
export function rtfx(root, csv, downloaded) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(downloaded || '')) throw new Error('تاريخ التنزيل بصيغة YYYY-MM-DD'); const buf = readFileSync(csv); if (!buf.length) throw new Error('ملف فارغ');
  mkdirSync(join(root, 'rtfx'), { recursive: true }); const file = `IRQ_${downloaded}.csv`, p = join(root, 'rtfx', file); if (existsSync(p)) throw new Error('هذه النسخة موجودة: ' + file);
  writeFileSync(p, buf); const man = existsSync(join(root, 'MANIFEST.json')) ? readJ(join(root, 'MANIFEST.json'), {}) : buildManifest(root);
  man.rtfx = { ...(man.rtfx || {}), [downloaded]: { file, sha256: sha(buf), bytes: buf.length, note: 'World Bank RTFX — سلسلة مقارنة منفصلة، لا تُدمج مع المرصود' } };
  writeFileSync(join(root, 'MANIFEST.json'), JSON.stringify({ ...buildManifest(root), rtfx: man.rtfx }, null, 1) + '\n'); return file;
}

if (process.argv[1] && process.argv[1].endsWith('archive.mjs')) {
  const [cmd, a, b] = process.argv.slice(2);
  try {
    if (cmd === 'verify') { const r = verify(a || 'archive'); console.log(r.ok ? `سليم: ${r.count} سجل` : 'غير سليم:\n' + r.bad.join('\n')); process.exit(r.ok ? 0 : 1); }
    if (cmd === 'append-only') { const r = appendOnly(a, b); console.log(r.ok ? 'إضافة فقط: سليم' : 'مخالفة:\n' + r.bad.join('\n')); process.exit(r.ok ? 0 : 1); }
    if (cmd === 'restore') { const r = restore(a, b); console.log(`استُعيد: ${r.count} سجل`); process.exit(0); }
    if (cmd === 'rtfx') { console.log('حُفظت نسخة: ' + rtfx('archive', a, b)); process.exit(0); }
    console.log('الأوامر: verify [dir] | append-only <old> <new> | restore <from> <to> | rtfx <csv> <YYYY-MM-DD>'); process.exit(cmd ? 1 : 0);
  } catch (e) { console.error(e.message); process.exit(1); }
}
