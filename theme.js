// المظهر والثيم: خمسة ثيمات × فاتح/داكن. المظهر (حسب الوقت/متزامن/فاتح/داكن) يحدد فاتح أم داكن، والثيم يحدد الشكل (ثابت أو تناوب يومي/أسبوعي/شهري).
// يغيّر الألوان والزخارف فقط ولا يلمس البيانات المالية. يُحفظ على هذا الجهاز في localStorage.
(function () {
  const KM = 'flousi-theme', KS = 'flousi-skin', MODES = ['time', 'sync', 'light', 'dark'], EVERY = ['day', 'week', 'month'];
  const SKINS = {"royal": {"name": "ذهب ملكي", "desc": "كحلي وذهبي بنجوم هندسية", "L": ["#F6F1E3", "linear-gradient(150deg,#1B2547 0%,#0E152B 75%)", "#7E5F0C", "#F6EFD7"], "D": ["#080C18", "linear-gradient(150deg,#1B2547 0%,#0E152B 75%)", "#D9B65A", "#F6EFD7"], "tc": ["#F6F1E3", "#080C18"]}, "emerald": {"name": "زمرد وعاج", "desc": "زمرد وذهب بنقش أطباق نباتية", "L": ["#F5F0E4", "linear-gradient(155deg,#0B5443 0%,#13785F 100%)", "#0D5C4A", "#FFFBEA"], "D": ["#07130F", "linear-gradient(155deg,#0B4A3B 0%,#0F6A55 100%)", "#E2C26A", "#FFF3CC"], "tc": ["#F5F0E4", "#07130F"]}, "crystal": {"name": "كريستال زجاجي", "desc": "زجاج شفاف وتوهج ملوّن", "L": ["#E9F0F8", "linear-gradient(160deg,rgba(255,255,255,.92),rgba(255,255,255,.55))", "#0A7A8A", "#12263A"], "D": ["#070B16", "linear-gradient(160deg,rgba(255,255,255,.17),rgba(255,255,255,.05))", "#5EE7D6", "#F2F7FC"], "tc": ["#E9F0F8", "#070B16"]}, "babylon": {"name": "بابل", "desc": "لازورد وذهب كبوابة عشتار", "L": ["#F0E3CB", "linear-gradient(160deg,#1D4E89,#173F70)", "#1D4E89", "#FFF6E0"], "D": ["#0C1624", "linear-gradient(160deg,#1D4E89,#12376A)", "#E3A93B", "#FFF6E0"], "tc": ["#F0E3CB", "#0C1624"]}, "engraved": {"name": "ورق منقوش", "desc": "ورق مصرفي بخطوط نقش دقيقة", "L": ["#F6F1E5", "#FFFDF6", "#2A5B4B", "#1B1A17"], "D": ["#121210", "#1B1A17", "#8FD0B8", "#EDE7D6"], "tc": ["#F6F1E5", "#121210"]}}, IDS = Object.keys(SKINS), DEF = { mode: 'fixed', skin: 'emerald', set: ['royal', 'babylon', 'emerald'], every: 'week' };
  const getMode = () => { try { const v = localStorage.getItem(KM); return MODES.includes(v) ? v : 'sync'; } catch (e) { return 'sync'; } };
  const cfg = () => { try { const c = JSON.parse(localStorage.getItem(KS) || 'null') || {}; const set = (Array.isArray(c.set) ? c.set : DEF.set).filter((x, i, a) => IDS.includes(x) && a.indexOf(x) === i);
    return { mode: c.mode === 'rotate' ? 'rotate' : 'fixed', skin: IDS.includes(c.skin) ? c.skin : DEF.skin, set: set.length >= 2 ? set : DEF.set.slice(), every: EVERY.includes(c.every) ? c.every : DEF.every }; } catch (e) { return Object.assign({}, DEF, { set: DEF.set.slice() }); } };
  const sysDark = () => { try { return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) { return false; } };
  const resolve = (m, d) => { d = d || new Date(); return m === 'light' ? 'light' : m === 'dark' ? 'dark' : m === 'time' ? (d.getHours() >= 6 && d.getHours() < 18 ? 'light' : 'dark') : (sysDark() ? 'dark' : 'light'); };
  // رقم الفترة بالتقويم المحلي: يوم، أسبوع يبدأ السبت، أو شهر
  const dayNo = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  const period = (every, d) => every === 'day' ? dayNo(d) : every === 'week' ? Math.floor((dayNo(d) - 2) / 7) : d.getFullYear() * 12 + d.getMonth();
  const pick = (c, d) => { d = d || new Date(); if (c.mode !== 'rotate') return c.skin; const set = IDS.filter(x => c.set.includes(x)); return set[((period(c.every, d) % set.length) + set.length) % set.length]; };
  // أول يوم يتغير فيه الثيم القادم (كائن Date محلي)
  const nextChange = (c, d) => { d = d || new Date(); const n = dayNo(d); return c.every === 'day' ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) : c.every === 'week' ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + ((Math.floor((n - 2) / 7) + 1) * 7 + 2 - n)) : new Date(d.getFullYear(), d.getMonth() + 1, 1); };
  function apply() { const m = resolve(getMode()), k = pick(cfg()), r = document.documentElement;
    if (r.dataset.theme !== m) r.dataset.theme = m; if (r.dataset.skin !== k) r.dataset.skin = k; r.style.colorScheme = m;
    const mt = document.querySelector('meta[name=theme-color]'), col = SKINS[k].tc[m === 'dark' ? 1 : 0]; if (mt && mt.content !== col) mt.content = col; return { mode: m, skin: k }; }
  function setMode(m) { if (!MODES.includes(m)) return getMode(); try { localStorage.setItem(KM, m); } catch (e) {} apply(); return m; }
  function setCfg(p) { const c = Object.assign(cfg(), p || {}); try { localStorage.setItem(KS, JSON.stringify({ mode: c.mode, skin: c.skin, set: c.set, every: c.every })); } catch (e) {} apply(); return cfg(); }
  apply();
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply); } catch (e) {}
  document.addEventListener('visibilitychange', () => { if (!document.hidden) apply(); });
  setInterval(apply, 60000);
  window.FTheme = { get: getMode, set: setMode, apply, resolve, MODES, SKINS, IDS, EVERY, cfg, setCfg, pick, nextChange, period };
})();
