#!/usr/bin/env python3
# اختبار التباين (f1-v4.13، وفي f1-v4.15 يقيس كل نقاط التدرّج): يفحص وضوح ألوان الكتابة على خلفياتها في كل ثيم بالوضعين الفاتح والداكن (12 حالة)، بمعيار WCAG AA.
# f1-v4.13: وضع تقرير (يطبع المشكلات ولا يفشل). من f1-v4.14 يصبح شرطاً: --strict يجعل أي مشكلة فشلاً.
import re, sys
D = sys.argv[1]; STRICT = '--strict' in sys.argv
css = open(D + '/index.html', encoding='utf-8').read()
B = {sel: dict(re.findall(r'--([\w-]+):([^;]+)', body)) for sel, body in re.findall(r'(html\[data-skin=\w+\]\[data-theme=\w+\]|:root|html\[data-theme=dark\])\{([^}]*)\}', css)}
def col(v):
    v = v.strip(); m = re.search(r'#([0-9a-fA-F]{6})', v)
    if m: h = m.group(1); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)), 1.0
    m = re.search(r'rgba?\(([\d.]+),([\d.]+),([\d.]+)(?:,([\d.]+))?\)', v.replace(' ', ''))
    if m: return tuple(float(m.group(i)) for i in (1, 2, 3)), float(m.group(4) or 1)
    return None, None
def lum(c):
    f = lambda x: (x / 255) / 12.92 if x / 255 <= 0.03928 else ((x / 255 + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
blend = lambda fg, a, bg: tuple(fg[i] * a + bg[i] * (1 - a) for i in range(3))
cr = lambda a, b: (max(lum(a), lum(b)) + 0.05) / (min(lum(a), lum(b)) + 0.05)
root = B[':root']; dark = {**root, **B['html[data-theme=dark]']}; sets = {'default-light': root, 'default-dark': dark}
for k, v in B.items():
    s = re.search(r'skin=(\w+)\]\[data-theme=(\w+)', k)
    if s: sets[s.group(1) + '-' + s.group(2)] = {**(root if s.group(2) == 'light' else dark), **v}
PAIRS = [('ink', 'bar', 4.5), ('mute', 'bar', 4.5), ('acc', 'bar', 4.5), ('ok', 'bar', 4.5), ('bad', 'bar', 4.5), ('wait', 'bar', 4.5), ('btnt', 'btn', 4.5), ('ink', 'bg', 4.5), ('mute', 'soft', 4.5), ('acc', 'soft', 4.5),
         ('herot', 'hero', 4.5), ('hmute', 'hero', 4.5), ('hok', 'hero', 4.5), ('hbad', 'hero', 4.5), ('hwait', 'hero', 3), ('navfg', 'navbg', 4.5), ('navonfg', 'navonbg', 4.5)]
FIXED = [('#C99A2E', 'hero', 4.5, 'ذهب بطاقة الشهر (لون ثابت)')]  # ألوان مكتوبة مباشرة في CSS تُفحص على خلفية كل ثيم
LITERAL = [(r'\.c-na\{background:(#\w{6});color:(#\w{6})\}', 'شارة «غير متاح»'), (r'\.c-cur\{background:(#\w{6});color:(#\w{6})\}', 'شارة «حالي»'), (r'\.c-old\{background:(#\w{6});color:(#\w{6})\}', 'شارة «قديم»'),
  (r'\.rate-bad\{background:(#\w{6})!important;color:(#\w{6})!important\}', 'سعر قديم'), (r'button\.kb\.k-obs\{background:(#\w{6});color:(#\w{6})\}', 'شارة مرصود'), (r'button\.kb\.k-calc\{background:(#\w{6});color:(#\w{6})\}', 'شارة محسوب'),
  (r'button\.kb\.k-est\{background:(#\w{6});color:(#\w{6})\}', 'شارة مقدّر'), (r'button\.kb\.k-mod\{background:(#\w{6});color:(#\w{6})\}', 'شارة نموذجنا')]  # أزواج ثابتة (خلفية، نص) بكل تكراراتها (فاتح وداكن)
bad = []
for name, V in sets.items():
    bg, _ = col(V['bg'])
    def get(k, under):
        c, a = col(V[k]) if k in V else col(k)
        return (blend(c, a, under) if a < 1 else c) if c else None
    for f, b, th in PAIRS:
        if f not in V or b not in V: continue
        # f1-v4.15: الخلفية المتدرجة تُفحص عند كل نقطة لون فيها (الأسوأ يحكم)، لا عند الطرف الأول فقط
        stops = re.findall(r'#[0-9a-fA-F]{6}|rgba?\([^)]*\)', V[b]) if 'gradient' in V[b] else [b]
        worst = None
        for st in stops:
            bc = get(st, bg); fc = get(f, bc)
            if bc and fc and (worst is None or cr(fc, bc) < worst): worst = cr(fc, bc)
        if worst is not None and worst < th: bad.append((name, f, b, round(worst, 2), th))
    for f, b, th, label in FIXED:
        if f in css:
            bc = get(b, bg); fc = col(f)[0]
            if bc and cr(fc, bc) < th: bad.append((name, label, b, round(cr(fc, bc), 2), th))
for rx, label in LITERAL:
    for bgc, fgc in re.findall(rx, css):
        r = cr(col(fgc)[0], col(bgc)[0])
        if r < 4.5: bad.append(('fixed', label, bgc + '/' + fgc, round(r, 2), 4.5))
print(f'CONTRAST {len(sets)} variants · {len(bad)} issue(s)' + ('' if STRICT else ' (report mode)'))
for x in bad: print('  ✗', *x)
sys.exit(1 if STRICT and bad else 0)
