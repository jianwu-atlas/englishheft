/* ============================================================
   sw.js · Englishheft 离线缓存（PWA）
   ------------------------------------------------------------
   文件清单来自同级 filelist.json（由 scripts/pack_en.py 生成）：
     { "core": [核心包：全部页面 + JS/CSS/图标，不含 PDF], "all": [全部文件] }
   —— 不再往 sw.js 里注入清单：GitHub Pages 直接发布仓库根目录，
      注入只在 dist/ 生效，会导致线上仍是占位符（历史 bug）。
   install：自动预缓存 core（约 2.1 MB）
   fetch：同源 GET 缓存优先（ignoreSearch，?v=N 也能命中）→ 未命中走网络
   message：cache-all（补齐剩余，含 PDF，逐文件回执）/ cache-clear / ping
   ⚠️ 每次发版 bump VERSION，否则老客户端不会换新缓存。
   ============================================================ */
"use strict";

const VERSION = "englishheft-v3";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./filelist.json"];

/* 读清单；失败时退回 SHELL，保证 install 不整体失败 */
async function manifest() {
  try {
    const r = await fetch("./filelist.json", { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const core = [...new Set((j.core || []).concat(["./filelist.json"]))];
    return { core, all: [...new Set(j.all || [])] };
  } catch (e) {
    return { core: SHELL, all: SHELL };
  }
}

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
    const [c, m] = await Promise.all([caches.open(VERSION), manifest()]);
    await cacheList(c, m.core);       // 首次访问后台自动缓存核心包
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
      const [c, m] = await Promise.all([caches.open(VERSION), manifest()]);
      const have = new Set((await c.keys()).map(r => pathOf(r.url)));
      const want = m.all.filter(u => !have.has(pathOf(u)));
      if (!want.length) {
        reply({ type: "cache-all-done", done: 0, total: 0, failed: [], all: m.all.length });
        return;
      }
      const res = await cacheList(c, want, (n, t, f) =>
        reply({ type: "cache-progress", done: n, total: t, failed: f }));
      reply({ type: "cache-all-done", ...res, all: m.all.length });
    })().catch(err => reply({ type: "cache-all-done", done: 0, total: 0, failed: [String(err)], all: 0 })));
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
