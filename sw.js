const V = 'f1-v3', C = 'flousi-' + V; // ارفع V مع VER في index.html عند كل إصدار
const D = 'flousi-data'; // بيانات السوق: من الشبكة أولاً، والنسخة المحفوظة عند انقطاع الإنترنت (الحالة تُحسب في التطبيق فلا يُعرض القديم كحالي)
const F = ['./', './index.html', './core.js', './engine.js', './logic.js', './store.js', './backup.js', './selftest.js', './selftest2.js', './nabd.js', './mind.js', './advisor.js', './selftest3.js', './app.js', './register.js', './diagnostics.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-512.png'];
// reload: يتجاوز مخزن المتصفح المؤقت فلا يُخزَّن ملف قديم. لا بيانات للمستخدم هنا إطلاقاً (هي في IndexedDB).
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(F.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith('flousi-') && x !== C && x !== D).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.includes('/data/')) { e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(D).then(x => x.put(e.request.url.split('?')[0], c)); } return r; }).catch(() => caches.match(e.request.url.split('?')[0]).then(r => r || new Response('{}', { status: 503 })))); return; }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).catch(() => caches.match('./index.html'))));
});
