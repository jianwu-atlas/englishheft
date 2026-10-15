/* ============================================================
   sw.js · Englishheft 离线缓存（PWA）
   install 预缓存外壳 → fetch 同源 GET 缓存优先 → 导航失败回退 index
   ALL_FILES 由 scripts/pack_en.py 打包时注入（全量清单）
   ============================================================ */
"use strict";

const VERSION = "englishheft-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest"];
const ALL_FILES = "__ALL__";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
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
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});

self.addEventListener("message", e => {
  if (e.data && e.data.type === "cache-all") {
    e.waitUntil(
      caches.open(VERSION).then(c => c.addAll(ALL_FILES))
        .then(() => e.source && e.source.postMessage({ type: "cache-all-done" }))
    );
  }
});
