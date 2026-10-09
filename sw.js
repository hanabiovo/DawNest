const SHELL = 'yachao-shell-v3';
const SHARE = 'yachao-share';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png?v=3', './icon-512.png?v=3', './icon-maskable-512.png?v=3', './apple-touch-icon.png?v=3'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== SHELL && k !== SHARE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 安卓"分享到鸦巢"：把图片暂存进缓存，再跳回主页
  if (e.request.method === 'POST' && url.pathname.endsWith('/share')) {
    e.respondWith((async () => {
      const form = await e.request.formData();
      const files = form.getAll('images');
      const cache = await caches.open(SHARE);
      await Promise.all(files.map((f, i) =>
        cache.put(`./shared/${Date.now()}-${i}`, new Response(f, {
          headers: { 'content-type': f.type, 'x-name': encodeURIComponent(f.name || 'image') }
        }))
      ));
      return Response.redirect('./?shared=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // 外壳：网络优先，断网用缓存
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(SHELL).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./')))
  );
});
