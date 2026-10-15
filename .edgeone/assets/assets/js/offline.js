/* ============================================================
   offline.js · PWA 支持：Service Worker 注册 + 离线缓存按钮
   ------------------------------------------------------------
   用法（iPad）：Safari 打开网站 → 点「📥 离线缓存」等它跑完
     → 分享 → 添加到主屏幕 → 之后像 App 一样离线打开。
   注意：file:// 直接打开时不生效，必须经 http/https 访问。
   ============================================================ */
(function () {
  "use strict";

  const HINT_KEY = "dh_ios_hint_v1";

  function supported() {
    return ("serviceWorker" in navigator) &&
           (location.protocol === "http:" || location.protocol === "https:");
  }

  /* ---------- 注册 Service Worker ---------- */
  function registerSW() {
    if (!supported()) return;
    navigator.serviceWorker.register("sw.js", { scope: "./" })
      .then(() => { /* ready */ })
      .catch(err => console.warn("[offline] SW 注册失败：", err));
  }

  /* ---------- 离线缓存按钮 ---------- */
  function buildButton() {
    if (!supported() || document.getElementById("offlineBtn")) return;
    const b = document.createElement("button");
    b.id = "offlineBtn";
    b.textContent = "📥 离线缓存";
    b.title = "把整站（含音频与教材 PDF）下载到本机，之后离线也能打开全部内容";
    b.addEventListener("click", async () => {
      if (!navigator.serviceWorker.controller) {
        // SW 首次注册后尚未接管页面，等一下再试
        b.textContent = "⏳ 准备中…";
        try { await navigator.serviceWorker.ready; } catch (e) { /* ignore */ }
      }
      const total = (window.__DH_SW_FILES || []).length;
      b.textContent = total ? `⏳ 缓存中 0/${total}` : "⏳ 缓存中…";
      b.disabled = true;
      const done = ev => {
        if (ev.data && ev.data.type === "cache-all-done") {
          b.textContent = "✓ 已可离线使用";
          b.classList.add("done");
          try { localStorage.setItem("dh_offline_ready", "1"); } catch (e) { /* ignore */ }
          showHint();
        }
      };
      navigator.serviceWorker.addEventListener("message", done);
      // 兜底：发送后 8 分钟还没回执也算完成（大文件慢）
      setTimeout(() => {
        if (b.textContent.indexOf("✓") !== 0) { b.textContent = "✓ 已可离线使用"; b.classList.add("done"); }
      }, 480000);
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "cache-all" });
      } else {
        // 没有控制器时直接自己抓一遍（SW 尚未接管）
        selfCacheAll(b);
      }
    });
    document.body.appendChild(b);
    try {
      if (localStorage.getItem("dh_offline_ready") === "1") {
        b.textContent = "✓ 已可离线使用";
        b.classList.add("done");
      }
    } catch (e) { /* ignore */ }
  }

  /* 没有 SW 控制器时的降级：页面自己抓全站 */
  async function selfCacheAll(btn) {
    const files = collectUrls();
    let n = 0;
    for (const f of files) {
      try { await fetch(f, { cache: "reload" }); } catch (e) { /* ignore */ }
      if (++n % 4 === 0 || n === files.length) btn.textContent = `⏳ 缓存中 ${n}/${files.length}`;
    }
    btn.textContent = "✓ 已可离线使用";
    btn.classList.add("done");
  }

  /* 收集要缓存的 URL：
     优先用打包时注入的全量清单（dist/ 场景，含音频与 PDF）；
     若清单为空（如 Cloudflare 直接部署仓库根目录），则从当前 DOM 收集。 */
  function collectUrls() {
    const set = new Set(window.__DH_SW_FILES || []);
    if (set.size) return [...set];
    const add = u => {
      if (!u) return;
      if (/^[a-z]+:/i.test(u) || u.startsWith("//") || u.startsWith("#")) return;
      u = u.split("?")[0].split("#")[0];
      if (u) set.add(u);
    };
    document.querySelectorAll("a[href]").forEach(a => add(a.getAttribute("href")));
    document.querySelectorAll("script[src]").forEach(e => add(e.getAttribute("src")));
    document.querySelectorAll("link[href]").forEach(e => add(e.getAttribute("href")));
    document.querySelectorAll("img[src]").forEach(e => add(e.getAttribute("src")));
    return [...set];
  }

  /* ---------- 添加到主屏幕提示 ---------- */
  function showHint() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    let seen = false;
    try { seen = localStorage.getItem(HINT_KEY) === "1"; } catch (e) { /* ignore */ }
    if (!isIOS || seen || document.getElementById("iosHint")) return;
    const d = document.createElement("div");
    d.id = "iosHint";
    d.innerHTML = '<b>📲 添加到主屏幕</b><br>' +
      '点 Safari 底部「分享」→「添加到主屏幕」，' +
      '之后就能像 App 一样离线打开本站。<span id="iosHintClose">知道了</span>';
    document.body.appendChild(d);
    const close = () => {
      try { localStorage.setItem(HINT_KEY, "1"); } catch (e) { /* ignore */ }
      d.remove();
    };
    document.getElementById("iosHintClose").addEventListener("click", close);
    setTimeout(close, 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { registerSW(); buildButton(); });
  } else {
    registerSW(); buildButton();
  }
})();
