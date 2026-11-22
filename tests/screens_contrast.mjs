// f1-v4.15 (اختبار دائم): فحص كل الشاشات في كل الثيمات: تباين كل نص ظاهر مع خلفيته الفعلية، الفيض الأفقي، أهداف لمس صغيرة
import { open, seed } from '/home/claude/tests/lib.mjs';
import fs from 'node:fs';
const D = process.argv[2], { page, ev, W, close, errs } = await open(D, +(process.argv[3] || 9610));
const id = await seed(ev); const pc = await ev(() => Object.keys(S.pieces)[0]);
await ev(async () => { await act(() => { S.x.set.palerts = [{ id: 'a1', k: 'usd', op: '>', v: 100000 }]; S.x.wish = [{ id: 'w1', name: 'سماعات', amount: 150000, type: null, t: Date.now() - 30 * 3600e3, done: null, at: null }]; }); });
const R = [['home'], ['ops', null, { kind: 'expense' }], ['ops', null, { kind: 'income' }], ['ops', null, { kind: 'transfer' }], ['accts'], ['accts', 'acct', { id: id.c }], ['accts', 'acct', { id: id.usd }], ['accts', 'recon', { id: id.c, c: 100 }], ['accts', 'gold'], ['accts', 'piece', { id: pc }], ['accts', 'goldlog'], ['accts', 'stocks'],
  ['nabd', null, { t: 'now' }], ['nabd', null, { t: 'why' }], ['nabd', null, { t: 'mine' }], ['nabd', null, { t: 'archive' }], ['insights'], ['insights', 'path'], ['insights', 'buy'], ['insights', 'whatif'], ['insights', 'wrap'], ['insights', 'wrap', { tab: 'month' }], ['insights', 'advisor'], ['insights', 'decisions'],
  ['more', 'settings'], ['more', 'help'], ['more', 'backup'], ['more', 'debts'], ['more', 'goals'], ['more', 'recurring'], ['more', 'wish'], ['more', 'set', { s: 'feat' }], ['more', 'set', { s: 'skin' }], ['assets', 'buy'], ['assets', 'sell', { id: pc }]];
const skins = ['', 'royal', 'emerald', 'crystal', 'babylon', 'engraved'], modes = ['light', 'dark'], out = {};
for (const sk of skins) for (const md of modes) { const V = (sk || 'default') + '-' + md;
  for (const [t, s, p] of R) { await ev(([t, s, p]) => go(t, s, p || {}), [t, s, p]); await W(120);
    await ev(([sk, md]) => { const e = document.documentElement; if (sk) e.dataset.skin = sk; else delete e.dataset.skin; e.dataset.theme = md; }, [sk, md]); await W(60);
    const r = await ev(() => {
      const parse = c => { const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null; };
      const lum = c => { const f = x => (x /= 255) <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
      const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const bgOf = el => { const stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage.includes('gradient') && !e.matches('html')) { const m = cs.backgroundImage.match(/(#[0-9a-fA-F]{6}|rgba?\([^)]*\))/g); if (m) { const c = m.map(x => x.startsWith('#') ? [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16), 1] : parse(x)); stack.push(c.reduce((a, b) => a[3] < b[3] ? a : b)); if (stack[stack.length - 1][3] >= 1) break; } }
          const b = parse(cs.backgroundColor); if (b && b[3] > 0) { stack.push(b); if (b[3] >= 1) break; } }
        let base = parse(getComputedStyle(document.documentElement).backgroundColor) || [255, 255, 255, 1]; if (base[3] < 1) base = [255, 255, 255, 1];
        for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i]; base = [0, 1, 2].map(k => c[k] * c[3] + base[k] * (1 - c[3])).concat(1); } return base; };
      const bad = [], small = [];
      document.querySelectorAll('#app *, #nav *').forEach(el => { if (!el.checkVisibility() || el.closest('#coach')) return; const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); 
        if (own) { const cs = getComputedStyle(el); if (+cs.opacity < .5 || el.closest('.dim,.nold,.tx.void,.mst.no,.badge:not(.on),.card.dim')) return; let fg = parse(cs.color); const bg = bgOf(el); if (fg[3] < 1) fg = [0, 1, 2].map(k => fg[k] * fg[3] + bg[k] * (1 - fg[3])).concat(1);
          const size = parseFloat(cs.fontSize), big = size >= 24 || (size >= 18.6 && +cs.fontWeight >= 700), need = big ? 3 : 4.5, c = cr(fg, bg);
          if (c < need - 0.05) bad.push([el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''), el.textContent.trim().slice(0, 24), +c.toFixed(2)]); }
        if (el.matches('button, a, input, select, summary') && !el.matches('.ib, button.kb')) { const r = el.getBoundingClientRect(); if (r.height < 36 || r.width < 36) small.push([el.tagName.toLowerCase() + '.' + (el.className || '').split(' ')[0], (el.textContent || el.placeholder || '').trim().slice(0, 16), Math.round(r.width) + 'x' + Math.round(r.height)]); } });
      const ov = document.documentElement.scrollWidth > window.innerWidth + 1; const wide = [...document.querySelectorAll('#app *')].filter(e => { if (!e.checkVisibility() || e.closest('.wrow,.hz,.noswipe,table,svg')) return false; const r = e.getBoundingClientRect(); return r.right > window.innerWidth + 2 || r.left < -2; }).slice(0, 3).map(e => e.tagName + '.' + e.className + ':' + e.textContent.trim().slice(0, 20));
      return { bad, small, ov, wide, err: document.querySelector('#app').textContent.includes('تعذّر عرض') }; });
    const k = [t, s || '', p ? JSON.stringify(p).slice(0, 20) : ''].join('/'); (out[k] = out[k] || {})[V] = r; } }
await close(); console.log('errs', errs.slice(0, 5));
// ملخص
const agg = {}; let ovs = [], errsS = [];
for (const [k, vs] of Object.entries(out)) for (const [v, r] of Object.entries(vs)) { if (r.err) errsS.push(k + ' ' + v); if (r.ov || r.wide.length) ovs.push(k + ' ' + v + ' ' + r.wide.join(';'));
  r.bad.forEach(([sel, t, c]) => { const key = sel + ' «' + t + '»'; (agg[key] = agg[key] || []).push(v + '@' + k + '=' + c); }); }
console.log('screen errors:', errsS.length, errsS.slice(0, 5)); console.log('overflow:', ovs.length, ovs.slice(0, 8));
const top = Object.entries(agg).sort((a, b) => b[1].length - a[1].length); console.log('low-contrast distinct texts:', top.length); top.slice(0, 40).forEach(([k, v]) => console.log(v.length, k, v.slice(0, 3).join(' , ')));
let nb = 0, nc = 0; for (const vs of Object.values(out)) for (const r of Object.values(vs)) { nc++; nb += r.bad.length; }
const fail = nb + errsS.length + ovs.length + errs.length; console.log(`PASS ${nc - (fail ? 1 : 0)}  FAIL ${fail}  (screens×themes ${nc}; low-contrast ${nb}; errors ${errsS.length}; overflow ${ovs.length}; js ${errs.length})`); process.exit(fail ? 1 : 0);
