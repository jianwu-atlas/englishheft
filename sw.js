/* ============================================================
   sw.js · Englishheft 离线缓存（PWA）
   install 自动预缓存「核心包」（全部页面 + JS + CSS + 图标，约 2.2 MB，不含 PDF）
   fetch 同源 GET：缓存优先（ignoreSearch，让 ?v=N 也能命中预缓存）→ 未命中再走网络
   message: cache-all（补齐 PDF 等剩余文件，逐文件回执进度）/ cache-clear / ping
   CORE_FILES / ALL_FILES 由 scripts/pack_en.py 打包时注入
   ============================================================ */
"use strict";

const VERSION = "englishheft-v2";
const CORE_FILES = "__CORE__";
const ALL_FILES = "__ALL__";

/* 逐文件缓存：单个失败不影响其余，边缓存边回报进度 */
async function cacheList(cache, list, onProgress) {
  const failed = [];
  let done = 0;
  for (const url of list) {
    try {
      const res = await fetch(url, { cache: "reload" });
      if (!res || !res.ok) throw new Error(String(res && res.status));
      await cache.put(url, res);
      done++;
    } catch (err) {
      failed.push(url);
    }
    if (onProgress) onProgress(done + failed.length, list.length, failed.length);
  }
  return { done, total: list.length, failed };
}

const pathOf = u => new URL(u, self.location.href).pathname;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await cacheList(c, CORE_FILES);      // 自动预缓存核心包（首次访问后台完成）
    await self.skipWaiting();
  })().catch(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true })
        .then(r => r || caches.match("./index.html", { ignoreSearch: true })))
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});

self.addEventListener("message", e => {
  const msg = e.data || {};
  const reply = data => { if (e.source) e.source.postMessage(data); };

  if (msg.type === "ping") {
    e.waitUntil(Promise.resolve(reply({ type: "pong", version: VERSION })));
    return;
  }

  if (msg.type === "cache-all") {
    e.waitUntil((async () => {
      const c = await caches.open(VERSION);
      const have = new Set((await c.keys()).map(r => pathOf(r.url)));
      const want = ALL_FILES.filter(u => !have.has(pathOf(u)));
      if (!want.length) {
        reply({ type: "cache-all-done", done: 0, total: 0, failed: [], all: ALL_FILES.length });
        return;
      }
      const res = await cacheList(c, want, (n, t, f) =>
        reply({ type: "cache-progress", done: n, total: t, failed: f }));
      reply({ type: "cache-all-done", ...res, all: ALL_FILES.length });
    })().catch(err => reply({ type: "cache-all-done", done: 0, total: 0, failed: [String(err)], all: ALL_FILES.length })));
    return;
  }

  if (msg.type === "cache-clear") {
    e.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => reply({ type: "cache-cleared" }))
    );
  }
});
