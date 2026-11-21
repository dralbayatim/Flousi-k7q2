// يتحقق أن كل محدِّد في الشروح يجد عنصره في شاشته ببيانات تجريبية (حتى لا يوجد شرح لا يظهر أبداً)
import { open, seed } from '/home/claude/tests/lib.mjs';
const { ev, W, close } = await open(process.argv[2] || '/home/claude/repo', +(process.argv[3] || 8981));
const id = await seed(ev); let bad = [], n = 0;
const keys = await ev(() => Object.keys(COACH).filter(k => !ONCE.includes(k)));
for (const k of keys) { const [tab, sub] = k.split('/'); await ev(([t, s, c]) => go(t, s || null, s === 'acct' ? { id: c } : {}), [tab, sub, id.c]); await W(300);
  const miss = await ev(k => COACH[k].filter(([s]) => !coachFind(s)).map(x => x[0]), k); n += 1; if (miss.length) bad.push(k + ': ' + miss.join(', ')); }
console.log('coach screens', n, 'missing:', bad); await close(); process.exit(bad.length ? 1 : 0);
