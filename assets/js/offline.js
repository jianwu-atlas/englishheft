/* ============================================================
   offline.js · PWA 离线包（自动预缓存 + 状态面板）
   ------------------------------------------------------------
   · sw.js 在 install 阶段自动预缓存核心包（7 页 + JS/CSS/图标 ≈ 2.2 MB）
     —— 不用点任何按钮，首次访问后台完成；之后断网可直接打开。
   · 教材 PDF（6.5 MB）体积大，改为面板里「📥 下载全部」按需缓存。
   · 左下角按钮 = 离线包状态入口：文件数 / 体积 / PDF 是否就绪 / 进度 / 清理。
   · 断网时顶部出现状态条，明确告知「已缓存，可离线使用」或「尚未缓存」。
   · 注意：file:// 直接打开不生效，必须经 http/https 访问。
   ============================================================ */
(function () {
  "use strict";

  const HINT_KEY = "dh_ios_hint_v1";
  const PDF_RE = /\.pdf($|\?)/i;
  let st = { n: 0, mb: 0, hasPdf: false, expect: 0 };
  let busy = false;

  const supported = () => ("serviceWorker" in navigator) &&
    (location.protocol === "http:" || location.protocol === "https:");
  const fmtMb = mb => (mb >= 0.05 ? mb.toFixed(1) + " MB" : "");

  /* ---------- 注册 SW（install 会自动预缓存核心包） ---------- */
  function registerSW() {
    if (!supported()) return;
    navigator.serviceWorker.register("sw.js", { scope: "./" })
      .catch(err => console.warn("[offline] SW 注册失败：", err));
  }

  /* ---------- 文件清单（filelist.json，由 pack_en.py 生成；离线时读缓存） ---------- */
  let FL = null;
  async function fileList() {
    if (FL) return FL;
    try {
      let res = null;
      try { res = await caches.match("./filelist.json", { ignoreSearch: true }); } catch (e) { /* ignore */ }
      if (!res) res = await fetch("filelist.json", { cache: "no-cache" });
      if (res && res.ok) FL = await res.json();
    } catch (e) { /* ignore */ }
    return FL || { core: [], all: [] };
  }

  /* ---------- 缓存统计（文件数 / 体积 / 是否含 PDF） ---------- */
  async function readStats() {
    let n = 0, bytes = 0, hasPdf = false;
    try {
      for (const name of await caches.keys()) {
        const c = await caches.open(name);
        for (const req of await c.keys()) {
          const res = await c.match(req, { ignoreSearch: true });
          if (!res) continue;
          n++;
          bytes += Number(res.headers.get("content-length") || 0);
          if (PDF_RE.test(req.url)) hasPdf = true;
        }
      }
    } catch (e) { /* ignore */ }
    const fl = await fileList();
    const expect = fl.all.length;
    const core = fl.core.length;    // 核心包条目数（不含 PDF）
    return { n: expect ? Math.min(n, expect) : n, mb: bytes / 1048576, hasPdf, expect, core };
  }

  /* ---------- UI ---------- */
  function buildUI() {
    if (!supported() || document.getElementById("offlineBtn")) return;

    const b = document.createElement("button");
    b.id = "offlineBtn";
    b.type = "button";
    b.textContent = "📥 离线缓存";
    b.title = "离线包状态：核心页面会自动缓存；教材 PDF 可在此额外下载";

    const p = document.createElement("div");
    p.id = "offlinePanel";
    p.innerHTML = `
      <div class="of-head">📴 离线包 <span class="of-x" role="button" title="关闭">✕</span></div>
      <div class="of-row"><span>核心页面</span><b class="of-core">—</b></div>
      <div class="of-row"><span>教材 PDF</span><b class="of-pdf">—</b></div>
      <div class="of-row"><span>占用</span><b class="of-size">—</b></div>
      <div class="of-bar"><i></i></div>
      <div class="of-note">首次打开时后台自动缓存核心页面（约 2.2 MB），无需任何操作；PDF 体积大，按需下载。</div>
      <div class="of-acts">
        <button class="of-go" type="button">📥 下载全部</button>
        <button class="of-clear" type="button">🗑 清理</button>
      </div>
      <div class="of-tip">iOS：Safari 分享 →「添加到主屏幕」，断网也能像 App 一样打开。</div>`;

    b.addEventListener("click", () => {
      const open = p.classList.toggle("show");
      b.classList.toggle("open", open);
      document.body.classList.toggle("of-open", open);   // 面板打开时藏起断网提示条，避免叠在一起
      if (open) refresh();
    });
    p.querySelector(".of-x").addEventListener("click", () => {
      p.classList.remove("show");
      b.classList.remove("open");
      document.body.classList.remove("of-open");
    });

    p.querySelector(".of-go").addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      setProgress(0, 0);
      try {
        if (!navigator.serviceWorker.controller) await navigator.serviceWorker.ready;
        const sw = navigator.serviceWorker.controller;
        if (!sw) { busy = false; return; }
        sw.postMessage({ type: "cache-all" });
        setTimeout(() => { if (busy) { busy = false; refresh(); } }, 300000);  // 5 分钟兜底，防卡在进度态
      } catch (e) { busy = false; }
    });

    p.querySelector(".of-clear").addEventListener("click", async () => {
      if (busy) return;
      if (!window.confirm("清理已下载的离线包？断网后将无法打开本站（联网可重新缓存）。")) return;
      try {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "cache-clear" });
        } else {
          for (const k of await caches.keys()) await caches.delete(k);
          refresh();
        }
      } catch (e) { /* ignore */ }
    });

    document.body.appendChild(b);
    document.body.appendChild(p);
    refresh();
  }

  function setProgress(done, total) {
    const p = document.getElementById("offlinePanel");
    const bar = p && p.querySelector(".of-bar i");
    if (bar) bar.style.width = total ? Math.round(done / total * 100) + "%" : "0%";
    const btn = document.getElementById("offlineBtn");
    if (btn) btn.textContent = total ? `⏳ 缓存中 ${done}/${total}` : "⏳ 准备中…";
  }

  async function refresh() {
    st = await readStats();
    const p = document.getElementById("offlinePanel");
    const btn = document.getElementById("offlineBtn");
    const coreOk = st.core ? st.n >= st.core : st.n > 0;
    const coreText = st.core ? `${Math.min(st.n, st.core)}/${st.core} 文件` : `${st.n} 文件`;

    if (btn && !busy) {
      btn.textContent = st.hasPdf ? "✓ 离线可用" : (st.n > 0 ? "✓ 核心已缓存" : "📥 离线缓存");
      btn.classList.toggle("done", st.n > 0);
    }
    if (!p) return;
    p.querySelector(".of-core").textContent = coreText + (coreOk ? " ✓" : "");
    p.querySelector(".of-core").classList.toggle("ok", coreOk);
    p.querySelector(".of-pdf").textContent = st.hasPdf ? "6.5 MB ✓" : "未缓存（点下方下载）";
    p.querySelector(".of-pdf").classList.toggle("ok", st.hasPdf);
    p.querySelector(".of-size").textContent = st.mb ? fmtMb(st.mb) + (st.hasPdf ? "" : "（不含 PDF）") : "—";
    const bar = p.querySelector(".of-bar i");
    if (bar && !busy) bar.style.width = (st.expect ? Math.min(100, Math.round(st.n / st.expect * 100)) : 0) + "%";
    p.querySelector(".of-go").disabled = busy;
    updateNetBar();
  }

  /* ---------- 断网状态条 ---------- */
  function updateNetBar() {
    const off = navigator.onLine === false;
    let bar = document.getElementById("netBar");
    if (!off) { if (bar) bar.remove(); return; }
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "netBar";
      document.body.appendChild(bar);
    }
    bar.classList.toggle("warn", st.n === 0);
    bar.textContent = st.n
      ? `📴 已离线 · 已缓存 ${st.n} 个文件${st.mb ? "（" + fmtMb(st.mb) + "）" : ""}，全部功能可用`
      : "📴 已离线 · 尚未缓存，部分页面可能打不开（联网后自动后台缓存）";
  }

  /* ---------- 添加到主屏幕提示（iOS，首访即提示一次） ---------- */
  function showIosHint() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    let seen = false;
    try { seen = localStorage.getItem(HINT_KEY) === "1"; } catch (e) { /* ignore */ }
    if (!isIOS || seen || document.getElementById("iosHint")) return;
    const d = document.createElement("div");
    d.id = "iosHint";
    d.innerHTML = '<b>📲 添加到主屏幕</b><br>' +
      '点 Safari 底部「分享」→「添加到主屏幕」，之后断网也能像 App 一样打开。' +
      '<span id="iosHintClose">知道了</span>';
    document.body.appendChild(d);
    const close = () => {
      try { localStorage.setItem(HINT_KEY, "1"); } catch (e) { /* ignore */ }
      d.remove();
    };
    document.getElementById("iosHintClose").addEventListener("click", close);
    setTimeout(close, 12000);
  }

  /* ---------- 消息：进度 / 完成 / 已清理 ---------- */
  if (supported()) {
    navigator.serviceWorker.addEventListener("message", ev => {
      const m = ev.data || {};
      if (m.type === "cache-progress") { setProgress(m.done, m.total); return; }
      if (m.type === "cache-all-done") {
        busy = false;
        setProgress(m.total || 1, m.total || 1);
        refresh();
        const btn = document.getElementById("offlineBtn");
        if (btn && m.failed && m.failed.length) {
          btn.textContent = `⚠ 失败 ${m.failed.length}`;
          btn.classList.remove("done");
        }
        return;
      }
      if (m.type === "cache-cleared") { busy = false; refresh(); }
    });
  }

  window.addEventListener("online", updateNetBar);
  window.addEventListener("offline", updateNetBar);

  function boot() {
    registerSW();
    buildUI();
    if (supported() && navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(() => refresh()).catch(() => {});
    }
    setTimeout(updateNetBar, 600);
    setTimeout(showIosHint, 2500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
