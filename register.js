'use strict';
// فلوسي — تسجيل العمل دون إنترنت والتحديث التلقائي.
// لا يقرأ ولا يكتب أي بيانات: IndexedDB والنسخ الاحتياطية خارج نطاق هذا الملف تماماً.
(() => {
  if (!('serviceWorker' in navigator)) return;
  const had = !!navigator.serviceWorker.controller; // هل كان للصفحة Worker مسبقاً؟ (وإلا فالتفعيل الأول لا يستدعي رسالة)
  let shown = false;
  function banner() {
    if (shown || !document.body) return; shown = true;
    const b = document.createElement('div'), t = document.createElement('span'), x = document.createElement('button');
    b.id = 'upd'; b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 8px);z-index:10;display:flex;gap:10px;align-items:center;justify-content:space-between;background:var(--acc);color:var(--btnt);padding:10px 14px;border-radius:10px;font:inherit';
    x.style.cssText = 'font:inherit;border:0;border-radius:8px;min-height:44px;padding:6px 14px;background:var(--btnt);color:var(--acc)';
    t.textContent = 'تحديث جديد جاهز'; x.textContent = 'أعد التشغيل الآن'; x.onclick = () => location.reload();
    b.append(t, x); document.body.append(b);
  }
  // الـWorker الجديد يستولي فور تثبيته (skipWaiting + claim في sw.js)، فنُنبّه المستخدم ليعيد التشغيل متى شاء بدل إعادة تحميل مفاجئة تقطع إدخاله
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) banner(); });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
    const check = () => { reg.update().catch(() => {}); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); }); // عند العودة إلى التطبيق
    check();
  }).catch(() => {});
})();
