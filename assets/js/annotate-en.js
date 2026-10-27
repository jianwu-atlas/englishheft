/* ============================================================
   annotate-en.js · 英文正文的词级音标标注（三态：关 / 常用 / 全部）
   ------------------------------------------------------------
   参照德语站 annotate.js 的实现方式：
     · 词典来自《15000英语单词口袋书》本身的 7052 条音标（ENGLISH 数据）
     · 关   → 不标注
     · 常用 → 只标注「非基础功能词」（跳过 the/a/is/of… 等高频虚词）**默认档**
     · 全部 → 词典命中的词全标
   标注形式：<ruby class="ipa">word<rt>音标</rt></ruby>（音标为蓝色强调，见 english.css）
   开关：右下角浮动按钮，localStorage 记忆（englishheft_ipa）
   ============================================================ */
(function () {
  "use strict";

  const KEY = "englishheft_ipa_v2";   // v2：默认「常用」（蓝色强调），旧键 englishheft_ipa 弃用
  const MODES = ["off", "smart", "all"];
  const DEFAULT_MODE = "smart";       // 默认即标注「常用」音标（跳过 the/a/is/of 等基础功能词）
  const LABEL = { off: "音标：关", smart: "音标：常用", all: "音标：全部" };
  const SKIP_SEL = "script,style,noscript,ruby,rt,button,input,textarea,select,code,pre,a,.s-pron,.en-ipa,.ph-ipa,.en-note-k,.sc-spk,.en-notes,.s-zh,.star-meta";
  // 基础功能词：常用挡不标（与德语站 BASIC 同思路）
  const BASIC = new Set(("a an the and or but if then than so as of to in on at by for with from into over under " +
    "is are was were be been being am do does did have has had " +
    "i you he she it we they me him her us them my your his its our their mine yours " +
    "this that these those there here what when where who whom whose how why which " +
    "not no yes will would shall should can could may might must " +
    "very just too also only more most much many few little some any all both each every " +
    "up down out off away back again once now then ever never always often sometimes").split(" "));

  let ipaMap = null;
  function buildDict() {
    if (ipaMap) return ipaMap;
    ipaMap = Object.create(null);
    if (typeof ENGLISH === "undefined") return ipaMap;
    for (const s of ENGLISH.sections) for (const p of s.parts) for (const sc of p.scenes)
      for (const w of sc.words) {
        const k = String(w.en || "").toLowerCase().trim();
        if (k && !ipaMap[k]) ipaMap[k] = w.ipa;
      }
    return ipaMap;
  }

  const mode = () => {
    const v = localStorage.getItem(KEY);
    return MODES.includes(v) ? v : DEFAULT_MODE;
  };

  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function wrapText(node, m) {
    const txt = node.nodeValue;
    if (!txt || !/[A-Za-z]/.test(txt)) return;
    const dict = buildDict();
    const re = /[A-Za-z][A-Za-z'’-]*/g;
    let out = "", last = 0, hit = null;
    while ((hit = re.exec(txt))) {
      const raw = hit[0], key = raw.toLowerCase().replace(/[’]/g, "'");
      const ipa = dict[key];
      if (!ipa) continue;
      if (m === "smart" && BASIC.has(key)) continue;
      out += esc(txt.slice(last, hit.index)) +
             `<ruby class="ipa">${esc(raw)}<rt>${esc(ipa)}</rt></ruby>`;
      last = hit.index + raw.length;
    }
    if (!last) return;
    out += esc(txt.slice(last));
    const span = document.createElement("span");
    span.innerHTML = out;
    node.parentNode.replaceChild(span, node);
    span.replaceWith(...span.childNodes);
  }

  function annotate(root) {
    const m = mode();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        const p = n.parentElement;
        if (!p || p.closest(SKIP_SEL)) return NodeFilter.FILTER_REJECT;
        return /[A-Za-z]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => wrapText(n, m));
  }

  function unannotate(root) {
    root.querySelectorAll("ruby.ipa").forEach(r => {
      r.replaceWith(document.createTextNode(r.firstChild ? r.firstChild.nodeValue : ""));
    });
  }

  function apply() {
    const app = document.getElementById("app");
    if (!app) return;
    unannotate(app);
    const m = mode();
    app.classList.toggle("ipa-on", m !== "off");   // 打开时给正文留出音标行高（CSS：#app.ipa-on）
    if (m !== "off") annotate(app);
  }

  function buildButton() {
    if (document.getElementById("ipaToggle")) return;
    const b = document.createElement("button");
    b.id = "ipaToggle";
    b.addEventListener("click", () => {
      const i = MODES.indexOf(mode());
      const nx = MODES[(i + 1) % MODES.length];
      localStorage.setItem(KEY, nx);
      b.textContent = LABEL[nx];
      b.classList.toggle("all", nx === "all");
      apply();
    });
    b.textContent = LABEL[mode()];
    b.classList.toggle("all", mode() === "all");
    b.title = "音标标注：关 → 常用 → 全部（常用挡跳过 the/a/is/of 等基础功能词，音标为蓝色）";
    document.body.appendChild(b);
  }

  function boot() {
    buildButton();
    apply();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // 供 site.js 在重渲染后调用
  window.__enApplyIpa = apply;
  window.__enIpaMode = mode;
})();
