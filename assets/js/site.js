/* ============================================================
   site.js · Englishheft 交互核心
   · 页面分发（body[data-page]）
   · 朗读：en-US（英式/美式英语音色），语速三档，localStorage 记忆
   · 隐藏中文自测、复制纯英文
   · 数据：assets/js/data/english.js（脚本生成，勿手改）
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escA = s => esc(s).replace(/"/g, "&quot;");
  /* 把句子中被书本标蓝的短语包成 <mark>（长短语优先，一次扫描） */
  function hlText(en, hl) {
    const list = (hl || []).filter(Boolean).sort((a, b) => b.length - a.length);
    if (!list.length) return esc(en);
    const re = new RegExp("(" + list.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return esc(en).replace(re, '<mark class="en-hl">$1</mark>');
  }

  /* ---------------- 朗读（en-US / de-DE） ---------------- */
  let voice = null;      // 英语音色
  let deVoice = null;    // 德语音色（场景句德文对照朗读）
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /^en[-_]US/i.test(v.lang)) || vs.find(v => /^en([-_]|$)/i.test(v.lang)) || null;
    deVoice = vs.find(v => /^de[-_]DE/i.test(v.lang)) || vs.find(v => /^de([-_]|$)/i.test(v.lang)) || null;
  }
  if ("speechSynthesis" in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  const SKEY = "englishheft_srate";
  const SPEEDS = [{ r: 0.7, label: "语速：慢" }, { r: 0.9, label: "语速：正常" }, { r: 1.15, label: "语速：快" }];
  const curSpeed = () => SPEEDS.find(s => s.r === parseFloat(localStorage.getItem(SKEY))) || SPEEDS[1];
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    const t = String(text || "").trim();
    if (!t) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "en-US";
    u.rate = curSpeed().r;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }
  window.__enSpeak = speak;
  /* 德文朗读（de-DE，场景句德文对照） */
  function speakDe(text) {
    if (!("speechSynthesis" in window)) return;
    const t = String(text || "").trim();
    if (!t) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "de-DE";
    u.rate = curSpeed().r;
    if (deVoice) u.voice = deVoice;
    speechSynthesis.speak(u);
  }
  window.__enSpeakDe = speakDe;
  /* ---------------- 整段场景连读（链式 speechSynthesis，会话 id 防串读） ---------------- */
  let sceneSeq = 0;          // 会话序号：每次发起/停止自增，旧会话 onend 据此失效
  let activeSceneBtn = null; // 当前正在连读的按钮（用于切「⏹ 停止」文案与复位）
  function stopSceneSpeak() {
    sceneSeq++;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    if (activeSceneBtn) { activeSceneBtn.textContent = "▶ 连读"; activeSceneBtn = null; }
  }
  function speakScene(sc, useDe, btn) {
    if (!("speechSynthesis" in window)) return;
    const hasDE = typeof EN_DE !== "undefined";
    // 连读整场景全部句子（不受「只看有解析」过滤影响）；德文模式取 EN_DE 德文，否则英文
    const items = sc.sentences.map((s, idx) =>
      (useDe && hasDE && EN_DE[sc.no + ":" + idx]) ? EN_DE[sc.no + ":" + idx].de : s.en);
    if (activeSceneBtn && activeSceneBtn !== btn) activeSceneBtn.textContent = "▶ 连读";
    const my = ++sceneSeq;
    activeSceneBtn = btn; btn.textContent = "⏹ 停止";
    let i = 0;
    function step() {
      if (sceneSeq !== my) return;              // 已被停止 / 新会话取代
      if (i >= items.length) { stopSceneSpeak(); return; }
      const t = items[i++];
      if (!t) { step(); return; }
      const u = new SpeechSynthesisUtterance(t);
      u.lang = useDe ? "de-DE" : "en-US";
      u.rate = curSpeed().r;
      if (useDe && deVoice) u.voice = deVoice; else if (!useDe && voice) u.voice = voice;
      u.onend = step; u.onerror = step;
      speechSynthesis.speak(u);
    }
    speechSynthesis.cancel();
    step();
  }
  window.__enSpeakScene = speakScene;
  window.__enStopScene = stopSceneSpeak;
  document.addEventListener("keydown", e => {
    const t = e.target;
    if (t && (t.nodeName === "INPUT" || t.nodeName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.key === "Escape") { stopSceneSpeak(); return; }
    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault();
      const sel = String(window.getSelection()).trim();
      if (sel) speak(sel);
    }
  });

  /* ---------------- 隐藏中文（localStorage 记忆） ---------------- */
  const HKEY = "englishheft_hidezh";
  const hideZh = () => localStorage.getItem(HKEY) === "1";

  function bindSpeak(root) {
    $$(".s-speak", root).forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      e.preventDefault();   // 🔊 常嵌在 <a class="en-wordlink"> 内：阻止链接默认跳转
      b.classList.contains("s-speak-de") ? speakDe(b.dataset.de) : speak(b.dataset.t);
    }));
  }

  /* ---------------- 中德对照（localStorage 记忆） ---------------- */
  const DEKEY = "englishheft_showde";
  const showDe = () => localStorage.getItem(DEKEY) === "1";

  /* ---------------- 场景索引（词汇 ↔ 场景句联动的基础） ---------------- */
  const SCENE_INDEX = {};   // scene.no -> { si, pi, sc }
  const ALL_WORDS = [];     // { no, szh, w } 全书词条扁平表
  if (typeof ENGLISH !== "undefined") {
    ENGLISH.sections.forEach((s, si) => s.parts.forEach((p, pi) => p.scenes.forEach(sc => {
      SCENE_INDEX[sc.no] = { si, pi, sc };
      sc.words.forEach(w => ALL_WORDS.push({ no: sc.no, szh: sc.zh, w }));
    })));
  }
  const sceneNoFromHash = () => {
    const m = (location.hash || "").match(/^#sc-(\d+(?:-\d+){1,2})/);
    return m ? m[1].replace(/-/g, ".") : null;
  };
  const qp = k => new URLSearchParams(location.search).get(k);
  const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  /* 词边界高亮（不影响书本蓝色 hl）：返回 [html, 命中次数] */
  function markWord(en, word, baseHtml) {
    const re = new RegExp("\\b" + escRe(word) + "\\b", "gi");
    const n = (en.match(re) || []).length;
    if (!n) return [baseHtml, 0];
    return [esc(en).replace(re, '<mark class="wd-hl">$&</mark>'), n];
  }
  /* ---------------- 场景进度（localStorage 记忆） ---------------- */
  const DKEY = "englishheft_done";
  const getDone = () => { try { return new Set(JSON.parse(localStorage.getItem(DKEY) || "[]")); } catch (e) { return new Set(); } };
  const setDone = s => localStorage.setItem(DKEY, JSON.stringify([...s]));

  /* ---------------- A3 · 场景级 Leitner SRS 复习队列（localStorage） ---------------- */
  const RKEY = "englishheft_srs";           // { "1.1.1": {b: 盒1-5, d: 到期时间戳ms} }
  const DAY = 86400000;
  const LEITNER_DAYS = [1, 2, 4, 7, 15];     // 盒 1..5 的复习间隔（天）
  const srsGet = () => { try { return JSON.parse(localStorage.getItem(RKEY) || "{}") || {}; } catch (e) { return {}; } };
  const srsSet = o => localStorage.setItem(RKEY, JSON.stringify(o));
  const srsEnroll = (no, box) => { const b = Math.min(Math.max(box || 1, 1), LEITNER_DAYS.length); const o = srsGet(); o[no] = { b, d: Date.now() + LEITNER_DAYS[b - 1] * DAY }; srsSet(o); };
  const srsAdvance = no => { const o = srsGet(); const e = o[no]; if (!e) return; e.b = Math.min(e.b + 1, LEITNER_DAYS.length); e.d = Date.now() + LEITNER_DAYS[e.b - 1] * DAY; srsSet(o); };
  const srsReset = no => { const o = srsGet(); const e = o[no]; if (!e) return; e.b = 1; e.d = Date.now() + LEITNER_DAYS[0] * DAY; srsSet(o); };
  const srsDrop = no => { const o = srsGet(); if (o[no]) { delete o[no]; srsSet(o); } };
  const srsDue = () => { const o = srsGet(); const now = Date.now(); return Object.keys(o).filter(k => o[k].d <= now).sort((a, b) => a.localeCompare(b, "en", { numeric: true })); };
  const srsDueCount = () => srsDue().length;
  const srsTotal = () => Object.keys(srsGet()).length;
  /* 一次性迁移：A3 上线前已「标记已学」的场景入盒 1、今日到期（幂等，已有 SRS 条目的不动） */
  function srsMigrate() {
    const o = srsGet(); let changed = false;
    getDone().forEach(no => { if (!o[no]) { o[no] = { b: 1, d: Date.now() }; changed = true; } });
    if (changed) srsSet(o);
  }
  window.__enSrs = { get: srsGet, due: srsDue, enroll: srsEnroll, advance: srsAdvance, reset: srsReset, drop: srsDrop };

  /* ---------------- B1 · 重点句收藏（⭐，localStorage） ---------------- */
  const STARKEY = "englishheft_stars";       // { "1.1.1:0": 收藏时间戳ms }
  const starGet = () => { try { return JSON.parse(localStorage.getItem(STARKEY) || "{}") || {}; } catch (e) { return {}; } };
  const starSet = o => localStorage.setItem(STARKEY, JSON.stringify(o));
  const isStar = k => !!starGet()[k];
  const starCount = () => Object.keys(starGet()).length;
  const toggleStar = k => {
    const o = starGet();
    if (o[k]) delete o[k]; else o[k] = Date.now();
    starSet(o);
    return !!o[k];
  };
  /* key = "场景号:句idx" → { sc, s, idx }（场景或句子不存在时返回 null） */
  const starTarget = k => {
    const [no, idx] = String(k).split(":");
    const it = SCENE_INDEX[no];
    if (!it) return null;
    const s = it.sc.sentences[+idx];
    return s ? { sc: it.sc, s, idx: +idx } : null;
  };
  /* 按收藏时间倒序（最新在前） */
  const starKeys = () => { const o = starGet(); return Object.keys(o).sort((a, b) => o[b] - o[a]); };
  const starBtn = (k, on) => `<button class="s-star${on ? " on" : ""}" data-star="${k}"
      title="${on ? "取消重点句" : "标为重点句（收进「复习 → 重点句」）"}">${on ? "★" : "☆"}</button>`;

  const doneBtn = sc => {
    const d = getDone().has(sc.no);
    return `<button class="sc-done${d ? " on" : ""}" data-done="${sc.no}" title="${d ? "取消本场景「已学」标记" : "标记本场景已学"}">${d ? "✓ 已学" : "○ 标记已学"}</button>`;
  };
  function bindDone(app, onRedraw) {
    $$(".sc-done", app).forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const s = getDone();
      if (s.has(b.dataset.done)) { s.delete(b.dataset.done); srsDrop(b.dataset.done); }   // 取消已学 → 移出复习队列
      else { s.add(b.dataset.done); srsEnroll(b.dataset.done, 1); }                      // 标记已学 → 入盒 1
      setDone(s);
      b.classList.toggle("on", s.has(b.dataset.done));
      b.textContent = s.has(b.dataset.done) ? "✓ 已学" : "○ 标记已学";
      if (onRedraw) onRedraw();
    }));
  }

  /* ---------------- 顶部工具条 ---------------- */
  function toolBar(extra) {
    return `<div class="sc-bar"><div class="sc-tools">
      <button class="chip ${hideZh() ? "on" : ""}" id="hideZh">${hideZh() ? "👁 显示中文" : "🙈 隐藏中文自测"}</button>
      <button class="chip ${showDe() ? "on" : ""}" id="deToggle" title="显示德文对照：场景句德文（逐词 IPA，可德语朗读）+ 词条对应德语（数据来自德语站词表与教材词列）">🇩🇪 德语对照</button>
      ${extra || ""}
      <button class="chip" id="speedBtn">${curSpeed().label}</button>
      <span class="sc-stat" id="statLine"></span>
    </div></div>`;
  }
  function bindTools(app, onToggle) {
    app.classList.toggle("hide-zh", hideZh());
    app.classList.toggle("show-de", showDe());
    const hz = $("#hideZh", app);
    if (hz) hz.addEventListener("click", () => {
      localStorage.setItem(HKEY, hideZh() ? "0" : "1");
      onToggle ? onToggle() : render(app);
    });
    const dt = $("#deToggle", app);
    if (dt) dt.addEventListener("click", () => {
      localStorage.setItem(DEKEY, showDe() ? "0" : "1");
      onToggle ? onToggle() : render(app);
    });
    const sp = $("#speedBtn", app);
    if (sp) sp.addEventListener("click", () => {
      const i = SPEEDS.findIndex(s => s.r === curSpeed().r);
      const nx = SPEEDS[(i + 1) % SPEEDS.length];
      localStorage.setItem(SKEY, String(nx.r));
      sp.textContent = nx.label;
    });
    bindSpeak(app);
    if (window.__enApplyIpa) window.__enApplyIpa();
  }
  function copyBtn(id, label, getText) {
    const b = $(id);
    if (!b) return;
    b.addEventListener("click", e => {
      const btn = e.currentTarget;
      const done = () => { const o = btn.textContent; btn.textContent = "✓ 已复制"; setTimeout(() => { btn.textContent = o; }, 1600); };
      const txt = getText();
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done).catch(done);
      else {
        const ta = document.createElement("textarea");
        ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (err) { /* ignore */ }
        ta.remove(); done();
      }
    });
  }
  function setStat(t) { const el = $("#statLine"); if (el) el.textContent = t; }

  /* ---------------- 统计 ---------------- */
  function stats() {
    const secs = ENGLISH.sections;
    const nSc = secs.reduce((a, s) => a + s.parts.reduce((b, p) => b + p.scenes.length, 0), 0);
    const nW = secs.reduce((a, s) => a + s.parts.reduce((b, p) => b + p.scenes.reduce((c, x) => c + x.words.length, 0), 0), 0);
    const nS = secs.reduce((a, s) => a + s.parts.reduce((b, p) => b + p.scenes.reduce((c, x) => c + x.sentences.length, 0), 0), 0);
    const nN = secs.reduce((a, s) => a + s.parts.reduce((b, p) => b + p.scenes.reduce((c, x) =>
      c + x.sentences.reduce((d, y) => d + y.notes.length, 0), 0), 0), 0);
    return { secs, nSc, nW, nS, nN };
  }

  /* ---------------- 首页 ---------------- */
  function renderStart(app) {
    const { secs, nSc, nW, nS, nN } = stats();
    const ph = ENGLISH.phonetics;
    const nDue = srsDueCount();
    const nStar = starCount();
    const cards = [
      ["review.html", "复习", "Review", nDue ? `<span class="rev-due">${nDue} 场景今日到期</span>` : "今日无到期场景", `⭐ ${nStar} 句重点句 · Leitner 五盒间隔复习（${LEITNER_DAYS.join("/")} 天）·「标记已学」场景自动入队`],
      ["vocab.html", "词汇", "Vocabulary", `${nSc} 场景 · ${nW} 词条`, "英文 / 音标 / 中文三行对照，点词即朗读"],
      ["sentences.html", "场景句", "Sentences", `${nS} 句 · ${nN} 条解析`, "Top10 场景句 + 短语用法 / 单词说明 / 句型搭配"],
      ["phonetics.html", "语音·音标", "Phonetics", `${ph.vowels.length} 元音 · ${ph.consonants.length} 辅音`, "从全书音标反推的音素表，每个音素配书中例词"],
      ["sections.html", "大类导览", "Sections", `${secs.length} 个大类 · ${secs.reduce((a, s) => a + s.parts.length, 0)} 个 Part`, "按 Section → Part → 场景逐层展开"],
      ["pdf.html", "原文 PDF", "Original", "1370 页 · 6.5 MB", "在线翻阅《15000英语单词口袋书》原版，或下载离线阅读"],
    ];
    app.innerHTML = `
      <div class="en-hero">
        <div class="en-hero-num">${nW.toLocaleString()}</div>
        <div class="en-hero-label">词条 · ${nSc} 场景 · ${nS} 场景句 · ${nN} 条解析</div>
      </div>
      <div class="en-cards">
        ${cards.map(([h, zh, en, num, desc]) => `
          <a class="card en-card" href="${h}">
            <div class="en-card-head"><span class="en-card-zh">${zh}</span><span class="en-card-en">${en}</span></div>
            <div class="en-card-num">${num}</div>
            <div class="en-card-desc">${desc}</div>
          </a>`).join("")}
      </div>
      <div class="card en-note">
        <h3>📖 关于本站</h3>
        <p>本站是《<b>15000 英语单词口袋书</b>》的完整蒸馏：把书里的 <b>场景词汇</b>、<b>Top10 场景句</b>、<b>句子解析</b> 结构化，做成可检索、可朗读、可自测的静态站。</p>
        <p>全书 <b>${secs.length} 个大类 / ${secs.reduce((a, s) => a + s.parts.length, 0)} 个 Part / ${nSc} 个场景</b>，
        每场景约 20 个词条与 10 个场景句。词汇的三行格式为「英文 / 音标 / 中文+词性」。</p>
        <p class="en-note-warn">⚠️ 本教材属<b>课外教材</b>：其词汇<b>不计入</b>德语站的生词表（VOCAB / wortliste.js），
        与 <a href="https://deutschheft.pages.dev/" target="_blank" rel="noopener">Mein Deutschheft</a> 的课内词汇相互独立。</p>
        <p class="en-note-src">数据源：PDF 文本层直抽（1370 页，无 OCR）；Section 导语为站点据目录与词汇量生成。</p>
      </div>`;
    bindTools(app);
  }

  /* ---------------- 词汇 ---------------- */
  const V_STATE = { sec: 0, part: 0, q: null, ph: null, inited: false };
  const SR_LIMIT = 200;
  function searchWords(q, ph) {
    const ql = String(q || "").trim().toLowerCase();
    return ALL_WORDS.filter(it =>
      (ph ? it.w.ipa.toLowerCase().includes(ph.toLowerCase()) : true) &&
      (!ql || it.w.en.toLowerCase().includes(ql) || it.w.zh.includes(ql) || it.w.ipa.toLowerCase().includes(ql)));
  }
  function renderVocab(app) {
    if (!V_STATE.inited) { V_STATE.inited = true; V_STATE.ph = qp("ph"); }
    const { secs, nSc, nW } = stats();
    const target = sceneNoFromHash();
    if (target && SCENE_INDEX[target]) {
      V_STATE.sec = SCENE_INDEX[target].si; V_STATE.part = SCENE_INDEX[target].pi;
    }
    if (V_STATE.sec >= secs.length) V_STATE.sec = 0;
    const sec = secs[V_STATE.sec];
    if (V_STATE.part >= sec.parts.length) V_STATE.part = 0;
    const part = sec.parts[V_STATE.part];

    const searching = V_STATE.q || V_STATE.ph;
    const hits = searching ? searchWords(V_STATE.q, V_STATE.ph) : null;

    let body;
    if (searching) {
      body = `<section class="sc-scene card sr-card">
        <h2 class="sc-title">🔍 ${V_STATE.ph ? "音素 " + esc(V_STATE.ph) : "搜索 " + esc(V_STATE.q)}
          <span class="sc-badge">${hits.length} / ${nW} 词${hits.length >= SR_LIMIT ? "（前 " + SR_LIMIT + "）" : ""}</span>
          <button class="chip sr-clear">✕ 退出搜索</button></h2>
        ${hits.slice(0, SR_LIMIT).map(it => `
          <div class="sr-row">
            <div class="en-word">
              <p class="en-en"><a class="en-wordlink" href="sentences.html?w=${encodeURIComponent(it.w.en)}#sc-${it.no.replace(/\./g, "-")}" title="看本场景中所有含该词的句子">${esc(it.w.en)}<button class="s-speak" data-t="${escA(it.w.en)}" title="朗读">🔊</button></a></p>
              <p class="s-pron">${esc(it.w.ipa)}</p>
              <p class="en-zh">${esc(it.w.zh)}<span class="en-pos">${esc(it.w.pos)}</span></p>
            </div>
            <button class="sr-src" data-go="${it.no}" title="定位到该场景">${esc(it.no)} ${esc(it.szh)}</button>
          </div>`).join("") || `<p class="sr-none">没有匹配的词条。</p>`}
      </section>`;
    } else {
      body = part.scenes.map(sc => `
        <section class="sc-scene card" data-sceneno="${sc.no}">
          <h2 class="sc-title"><span class="sc-num">${esc(sc.no.split(".").pop())}</span>${esc(sc.zh)}
            <span class="sc-badge">${sc.words.length} 词</span>
            <a class="sc-xlink" href="sentences.html#sc-${sc.no.replace(/\./g, "-")}" title="看本场景的 ${sc.sentences.length} 个场景句">→ ${sc.sentences.length} 句</a>
            ${doneBtn(sc)}</h2>
          <div class="en-words">
            ${sc.words.map(w => `
              <div class="en-word">
                <p class="en-en"><a class="en-wordlink" href="sentences.html?w=${encodeURIComponent(w.en)}#sc-${sc.no.replace(/\./g, "-")}" title="看本场景中所有含该词的句子">${esc(w.en)}<button class="s-speak" data-t="${escA(w.en)}" title="朗读">🔊</button></a></p>
                <p class="s-pron">${esc(w.ipa)}</p>
                <p class="en-zh">${esc(w.zh)}<span class="en-pos">${esc(w.pos)}</span></p>
                ${w.de ? `<p class="en-de">🇩🇪 ${esc(w.de)}</p>` : ""}
              </div>`).join("")}
          </div>
        </section>`).join("");
    }

    app.innerHTML = `
      <div class="chip-row sc-tabs">
        ${secs.map((s, i) => `<button class="chip ${i === V_STATE.sec ? "on" : ""}" data-s="${i}">${s.no}. ${esc(s.zh)}<span class="sc-cnt">${s.parts.reduce((a, p) => a + p.scenes.length, 0)}</span></button>`).join("")}
      </div>
      <div class="chip-row part-tabs">
        ${sec.parts.map((p, i) => `<button class="chip ${!searching && i === V_STATE.part ? "on" : ""}" data-p="${i}">${esc(p.no)} ${esc(p.zh)}<span class="sc-cnt">${p.scenes.length}</span></button>`).join("")}
      </div>
      ${toolBar(
        `<input class="sr-input" id="wordSearch" type="search" placeholder="🔍 搜索英文 / 中文 / 音标（全书 ${nW} 词）" value="${escA(searching ? (V_STATE.ph ? "" : V_STATE.q) : "")}" ${searching ? "" : "autofocus"}>` +
        `<button class="chip" id="copyPart" title="把本 Part 全部词条复制为 Anki CSV（正面英文 / 反面中文+词性+音标+场景）">📥 Anki（本 Part）</button>` +
        `<button class="chip" id="copyPartEn">📋 复制纯英文</button>`)}
      ${body}`;
    setStat(`全书 ${nSc} 场景 · ${nW} 词`);

    $$(".sc-tabs .chip", app).forEach(b => b.addEventListener("click", () => {
      V_STATE.sec = +b.dataset.s; V_STATE.part = 0; V_STATE.q = null; V_STATE.ph = null;
      history.replaceState(null, "", location.pathname);
      renderVocab(app);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }));
    $$(".part-tabs .chip", app).forEach(b => b.addEventListener("click", () => {
      V_STATE.part = +b.dataset.p; V_STATE.q = null; V_STATE.ph = null;
      history.replaceState(null, "", location.pathname);
      renderVocab(app);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }));

    const si = $("#wordSearch", app);
    let tmr = null;
    if (si) si.addEventListener("input", () => {
      clearTimeout(tmr);
      tmr = setTimeout(() => {
        const v = si.value.trim();
        if (!v && !V_STATE.ph) { V_STATE.q = null; V_STATE.ph = null; history.replaceState(null, "", location.pathname); renderVocab(app); return; }
        V_STATE.q = v || null; V_STATE.ph = v ? null : V_STATE.ph;
        renderVocab(app);
        const ni = $("#wordSearch", app);
        if (ni) { ni.focus(); ni.setSelectionRange(ni.value.length, ni.value.length); }
      }, 140);
    });
    const clr = $(".sr-clear", app);
    if (clr) clr.addEventListener("click", () => {
      V_STATE.q = null; V_STATE.ph = null;
      history.replaceState(null, "", location.pathname);
      renderVocab(app);
    });
    $$(".sr-src", app).forEach(b => b.addEventListener("click", () => {
      const it = SCENE_INDEX[b.dataset.go];
      if (!it) return;
      V_STATE.sec = it.si; V_STATE.part = it.pi; V_STATE.q = null; V_STATE.ph = null;
      history.replaceState(null, "", location.pathname + "#sc-" + b.dataset.go.replace(/\./g, "-"));
      renderVocab(app);
      flashScene(app);
    }));

    /* Anki 导出（本 Part，带场景号） */
    const cp = $("#copyPart", app);
    if (cp) {
      cp.addEventListener("click", () => {
        const rows = [];
        part.scenes.forEach(sc => sc.words.forEach(w => {
          rows.push(`"${w.en.replace(/"/g, '""')}","${(w.zh + " " + w.pos + " [" + w.ipa + "] · " + sc.no + " " + sc.zh).replace(/"/g, '""')}"`);
        }));
        const txt = rows.join("\n");
        const done = () => { const o = cp.textContent; cp.textContent = `✓ 已复制 ${rows.length} 词`; setTimeout(() => { cp.textContent = o; }, 1800); };
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done).catch(done);
        else { const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (err) {} ta.remove(); done(); }
      });
    }
    copyBtn("#copyPartEn", "", () => part.scenes.map(sc =>
      `【${sc.no} ${sc.zh}】\n` + sc.words.map(w => w.en).join("\n")).join("\n\n"));
    bindDone(app, () => {});
    bindTools(app, () => renderVocab(app));
    if (!searching) flashScene(app);
  }
  let _lastFlash = null;
  function flashScene(app) {
    const no = sceneNoFromHash();
    if (!no || no === _lastFlash) return;
    _lastFlash = no;
    const el = $(`[data-sceneno="${no}"]`, app);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 2200);
  }

  /* ---------------- 场景句 ---------------- */
  /* 德文对照行：逐词 + 逐词 IPA（仅示意，未映射词留空）；带 de-DE 朗读按钮 */
  function gerHtml(entry) {
    const toks = entry.de.split(/\s+/);
    const words = toks.map((tok, i) => {
      const ip = (entry.ipa && entry.ipa[i]) || "";
      return `<span class="deu-w">${esc(tok)}${ip ? `<small class="deu-ipa">${esc(ip)}</small>` : ""}</span>`;
    }).join(" ");
    return `<div class="s-deu" title="德文对照 · 逐词 IPA（仅示意，未映射词留空）">
      <span class="s-deu-flag">🇩🇪</span><span class="s-deu-words">${words}</span>
      <button class="s-speak s-speak-de" data-de="${escA(entry.de)}" title="德语朗读">🔊</button>
    </div>`;
  }
  const S_STATE = { sec: 0, part: 0, onlyNotes: false, w: null };
  function renderSentences(app) {
    const { secs, nS, nN } = stats();
    const target = sceneNoFromHash();
    if (target && SCENE_INDEX[target]) {
      S_STATE.sec = SCENE_INDEX[target].si; S_STATE.part = SCENE_INDEX[target].pi;
    }
    if (S_STATE.sec >= secs.length) S_STATE.sec = 0;
    const sec = secs[S_STATE.sec];
    if (S_STATE.part >= sec.parts.length) S_STATE.part = 0;
    const part = sec.parts[S_STATE.part];
    S_STATE.w = qp("w");
    const tSc = target ? SCENE_INDEX[target] : null;
    let hitCount = 0;
    if (tSc && S_STATE.w) {
      const re = new RegExp("\\b" + escRe(S_STATE.w) + "\\b", "gi");
      hitCount = tSc.sc.sentences.filter(s => (s.en.match(re) || []).length).length;
    }

    const hasDE = typeof EN_DE !== "undefined";
    const blocks = part.scenes.map(sc => {
      const isT = tSc && tSc.sc.no === sc.no && S_STATE.w;
      const all = sc.sentences.map((s, idx) => ({ s, idx }));
      const sents = S_STATE.onlyNotes ? all.filter(x => x.s.notes.length) : all;
      return { sc, sents, isT };
    }).filter(b => b.sents.length);

    const banner = (tSc && S_STATE.w) ? `
      <div class="wd-banner">
        📎 单词「<b>${esc(S_STATE.w)}</b>」在本场景 ${esc(tSc.sc.zh)} 的 ${tSc.sc.sentences.length} 句中命中
        <b>${hitCount}</b> 句${hitCount === 0 ? "（本场景句子未出现该词）" : ""}
        <button class="wd-clear" id="wdClear">✕ 清除高亮</button>
      </div>` : "";

    stopSceneSpeak();  // 切换 Section/Part/状态时停止进行中的整段连读
    app.innerHTML = `
      <div class="chip-row sc-tabs">
        ${secs.map((s, i) => `<button class="chip ${i === S_STATE.sec ? "on" : ""}" data-s="${i}">${s.no}. ${esc(s.zh)}<span class="sc-cnt">${s.parts.reduce((a, p) => a + p.scenes.reduce((c, x) => c + x.sentences.length, 0), 0)}</span></button>`).join("")}
      </div>
      <div class="chip-row part-tabs">
        ${sec.parts.map((p, i) => `<button class="chip ${i === S_STATE.part ? "on" : ""}" data-p="${i}">${esc(p.no)} ${esc(p.zh)}<span class="sc-cnt">${p.scenes.reduce((a, x) => a + x.sentences.length, 0)}</span></button>`).join("")}
      </div>
      ${toolBar(`<button class="chip ${S_STATE.onlyNotes ? "on" : ""}" id="onlyNotes">🔎 只看有解析</button><button class="chip" id="copyPart">📋 复制本 Part 纯英文</button>`)}
      ${banner}
      ${blocks.map(({ sc, sents, isT }) => `
        <section class="sc-scene card" data-sceneno="${sc.no}">
          <h2 class="sc-title"><span class="sc-num">${esc(sc.no.split(".").pop())}</span>${esc(sc.zh)}
            <span class="sc-badge">${sents.length} 句</span>
            <a class="sc-xlink" href="vocab.html#sc-${sc.no.replace(/\./g, "-")}" title="看本场景的 ${sc.words.length} 个词条">→ ${sc.words.length} 词</a>
            ${doneBtn(sc)}
            <button class="s-speak-scene" data-sceneno="${sc.no}" title="整段连读本场景（随「🇩🇪 德语对照」开关读英文/德文，再点或按 Esc 停止）">▶ 连读</button></h2>
          ${sents.map(({ s, idx }) => {
            let html;
            if (isT) {
              const base = hlText(s.en, s.hl);
              const r = markWord(s.en, S_STATE.w, base);
              html = r[0];
              if (r[1]) hitCount += 1;
            } else {
              html = hlText(s.en, s.hl);
            }
            const g = (hasDE && EN_DE[`${sc.no}:${idx}`]) || null;
            const key = `${sc.no}:${idx}`;
            const isSt = isStar(key);
            return `
            <div class="sc-turn${isSt ? " starred" : ""}">
              <span class="sc-spk">${isSt ? "★" : "·"}</span>
              <div class="sc-turn-body">
                <p class="s-de">${html}<span class="s-acts"><button class="s-speak" data-t="${escA(s.en)}" title="朗读">🔊</button>${starBtn(key, isSt)}</span></p>
                ${g ? gerHtml(g) : ""}
                <p class="s-zh">${esc(s.zh)}</p>
                ${s.notes.length ? `<div class="en-notes">${s.notes.map(n =>
                  `<p class="en-note-line"><b class="en-note-k">${esc(n.k)}</b>${esc(n.t)}</p>`).join("")}</div>` : ""}
              </div>
            </div>`;
          }).join("")}
        </section>`).join("") || `<div class="card"><p>本 Part 暂无带解析的句子。</p></div>`}`;
    setStat(`全书 ${nS} 句 · ${nN} 条解析`);
    $$(".sc-tabs .chip", app).forEach(b => b.addEventListener("click", () => {
      S_STATE.sec = +b.dataset.s; S_STATE.part = 0;
      history.replaceState(null, "", location.pathname + location.hash);
      renderSentences(app);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }));
    $$(".part-tabs .chip", app).forEach(b => b.addEventListener("click", () => {
      S_STATE.part = +b.dataset.p;
      history.replaceState(null, "", location.pathname + location.hash);
      renderSentences(app);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }));
    const on = $("#onlyNotes", app);
    if (on) on.addEventListener("click", () => { S_STATE.onlyNotes = !S_STATE.onlyNotes; renderSentences(app); });
    const wc = $("#wdClear", app);
    if (wc) wc.addEventListener("click", () => {
      history.replaceState(null, "", location.pathname + location.hash);
      renderSentences(app);
    });
    copyBtn("#copyPart", "", () => part.scenes.map(sc =>
      `【${sc.no} ${sc.zh}】\n` + sc.sentences.map(x => x.en).join("\n")).join("\n\n"));
    bindDone(app, () => {});
    bindTools(app, () => renderSentences(app));
    // ⭐ 重点句：点句子右侧 ☆ → 收藏（就地高亮 + 写入 localStorage，复习页集中呈现）
    $$(".s-star", app).forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const on = toggleStar(b.dataset.star);
      b.textContent = on ? "★" : "☆";
      b.classList.toggle("on", on);
      b.title = on ? "取消重点句" : "标为重点句（收进「复习 → 重点句」）";
      const turn = b.closest(".sc-turn");
      if (turn) {
        turn.classList.toggle("starred", on);
        const spk = turn.querySelector(".sc-spk");
        if (spk) spk.textContent = on ? "★" : "·";
      }
    }));
    // 整段场景连读：随「🇩🇪 德语对照」开关读英文/德文；再点同按钮或 Esc 停止
    $$(".s-speak-scene", app).forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const sc = SCENE_INDEX[b.dataset.sceneno] && SCENE_INDEX[b.dataset.sceneno].sc;
      if (!sc) return;
      if (activeSceneBtn === b) { stopSceneSpeak(); return; }
      speakScene(sc, showDe(), b);
    }));
    if (target) flashScene(app);
  }

  /* ---------------- 语音·音标 ---------------- */
  function renderPhonetics(app) {
    const ph = ENGLISH.phonetics;
    const tbl = (rows, cls) => `
      <table class="sc-md-table ph-table ${cls}">
        <thead><tr><th>音标</th><th>说明</th><th>书中例词</th><th>出现</th></tr></thead>
        <tbody>${rows.map(r => `
          <tr class="ph-row" data-ph="${escA(r.ipa)}" title="点击在词汇页反查本书转写含 /${esc(r.ipa)}/ 的词">
            <td><span class="ph-ipa">/${esc(r.ipa)}/</span><button class="s-speak" data-t="${escA(r.examples[0] || "")}" title="朗读例词">🔊</button></td>
            <td>${esc(r.zh)}</td>
            <td>${r.examples.map(e => esc(e)).join(" · ")}</td>
            <td class="ph-n">${r.n}</td>
          </tr>`).join("")}</tbody>
      </table>`;
    app.innerHTML = `
      ${toolBar()}
      <div class="card en-note">
        <h3>🔤 英语音素表</h3>
        <p>下表<b>从全书 ${stats().nW} 条词条的音标反推</b>：统计每个音素在书中的出现次数，并取出现最多的词作例词。
        因此例词都出自本书语境，便于对照记忆。</p>
        <p>💡 <b>点任意一行</b> → 词汇页反查「本书转写含该音素的所有词」。</p>
        <p class="en-note-src">注：原书音标混用英式/美式写法（如 <code>ei</code> 与 <code>eɪ</code>、<code>ai</code> 与 <code>aɪ</code> 并存），此处按原书写法分别统计。</p>
      </div>
      <section class="sc-scene card">
        <h2 class="sc-title"><span class="sc-num">${ph.vowels.length}</span>元音 Vowels</h2>
        ${tbl(ph.vowels, "ph-vowel")}
      </section>
      <section class="sc-scene card">
        <h2 class="sc-title"><span class="sc-num">${ph.consonants.length}</span>辅音 Consonants</h2>
        ${tbl(ph.consonants, "ph-cons")}
      </section>`;
    setStat(`元音 ${ph.vowels.length} · 辅音 ${ph.consonants.length}`);
    $$(".ph-row", app).forEach(tr => tr.addEventListener("click", e => {
      if (e.target.closest("button")) return;
      location.href = "vocab.html?ph=" + encodeURIComponent(tr.dataset.ph);
    }));
    bindTools(app);
  }

  /* ---------------- 大类导览 ---------------- */
  function renderSections(app) {
    const { secs, nSc } = stats();
    const done = getDone();
    const totalDone = done.size;
    const nDue = srsDueCount();
    const secProg = s => {
      let tot = 0, dn = 0;
      s.parts.forEach(p => p.scenes.forEach(sc => { tot++; if (done.has(sc.no)) dn++; }));
      return { tot, dn };
    };
    app.innerHTML = `
      ${toolBar()}
      <div class="prog-card card">
        <div class="prog-head">🗸 学习进度 <b>${totalDone}</b> / ${nSc} 场景（在词汇 / 场景句页的场景卡上点「标记已学」）</div>
        <div class="prog"><i style="width:${nSc ? (totalDone / nSc * 100) : 0}%"></i></div>
        <a class="rev-entry" href="review.html">📅 复习队列 · <b>${nDue}</b> 场景今日到期 · <span class="rev-star">⭐ <b>${starCount()}</b> 重点句</span> →</a>
      </div>
      ${ENGLISH.intros.map(it => {
        const s = secs.find(x => x.no === it.no);
        const pg = secProg(s);
        return `
        <section class="sc-scene card">
          <h2 class="sc-title"><span class="sc-num">${it.no}</span>${esc(it.zh)}
            <span class="sc-badge">${s.parts.length} Part · ${pg.tot} 场景</span>
            <span class="sc-badge prog-badge">${pg.dn}/${pg.tot} ✓</span></h2>
          <div class="prog prog-sm"><i style="width:${pg.tot ? (pg.dn / pg.tot * 100) : 0}%"></i></div>
          <p class="en-intro">${esc(it.text)}</p>
          <div class="en-parts">
            ${s.parts.map(p => `
              <div class="en-part">
                <div class="en-part-h">${esc(p.zh)}<span class="en-part-n">${p.scenes.length} 场景</span></div>
                <div class="en-scene-chips">${p.scenes.map(sc => `<span class="en-scene-chip${done.has(sc.no) ? " done" : ""}">${done.has(sc.no) ? "✓ " : ""}${esc(sc.zh)}</span>`).join("")}</div>
              </div>`).join("")}
          </div>
        </section>`;
      }).join("")}`;
    setStat(`${secs.length} 个大类 · 已完成 ${totalDone}/${nSc} 场景`);
    bindTools(app);
  }

  /* ---------------- A3 · 复习队列（Leitner SRS） ---------------- */
  function reviewCard(no) {
    const idx = SCENE_INDEX[no];
    if (!idx) return "";
    const sc = idx.sc;
    const e = srsGet()[no] || {};
    const box = e.b || 1;
    const words = sc.words.map(w => `
      <div class="en-word">
        <p class="en-en">${esc(w.en)}<button class="s-speak" data-t="${escA(w.en)}" title="朗读">🔊</button></p>
        <p class="s-pron">${esc(w.ipa)}</p>
        <p class="en-zh">${esc(w.zh)}<span class="en-pos">${esc(w.pos)}</span></p>
      </div>`).join("");
    const sents = sc.sentences.map((s, i) => {
      const g = (typeof EN_DE !== "undefined" && EN_DE[no + ":" + i]) || null;
      return `<div class="sc-turn"><span class="sc-spk">·</span><div class="sc-turn-body">
        <p class="s-de">${esc(s.en)}<button class="s-speak" data-t="${escA(s.en)}" title="朗读">🔊</button></p>
        ${g ? gerHtml(g) : ""}
        <p class="s-zh">${esc(s.zh)}</p>
      </div></div>`;
    }).join("");
    return `<section class="sc-scene card rev-card" data-sceneno="${no}">
      <h2 class="sc-title"><span class="sc-num">${esc(no.split(".").pop())}</span>${esc(sc.zh)}
        <span class="sc-badge rev-box">盒 ${box} · 间隔 ${LEITNER_DAYS[box - 1]} 天</span>
        <a class="sc-xlink" href="sentences.html#sc-${no.replace(/\./g, "-")}" title="看本场景全部句子与解析">→ 场景句</a></h2>
      <div class="en-words">${words}</div>
      <div class="rev-sents">${sents}</div>
      <div class="rev-actions">
        <button class="chip rev-keep" data-keep="${no}">✅ 记住了 · 升盒</button>
        <button class="chip rev-forget" data-forget="${no}">❌ 又忘了 · 回盒 1</button>
      </div>
    </section>`;
  }
  /* ---------- B1 · 重点句清单（复习页顶部，按收藏时间倒序） ---------- */
  function starSection() {
    const items = starKeys().map(k => ({ k, t: starTarget(k) })).filter(x => x.t);
    const head = `
      <div class="prog-card card star-head">
        <div class="prog-head">⭐ 重点句 · 共 <b>${items.length}</b> 句（在「场景句」页每句右侧点 ☆ 收藏）</div>
        <p class="rev-sub">按收藏时间倒序；「→ 场景」回原场景上下文，「✕」移出重点。</p>
      </div>`;
    if (!items.length) return head + `<div class="card rev-empty star-empty">还没有重点句。去 <a href="sentences.html">场景句</a> 页，点任意句子右侧的 ☆ 即可收进这里。</div>`;
    return head + `
      <section class="sc-scene card star-card">
        ${items.map(({ k, t }) => `
          <div class="sc-turn starred" data-starkey="${k}">
            <span class="sc-spk">★</span>
            <div class="sc-turn-body">
              <p class="s-de">${hlText(t.s.en, t.s.hl)}<span class="s-acts"><button class="s-speak" data-t="${escA(t.s.en)}" title="朗读">🔊</button>
                <button class="s-star on" data-star="${k}" title="移出重点句">✕</button></span></p>
              <p class="s-zh">${esc(t.s.zh)}</p>
              <p class="star-meta"><a class="sc-xlink" href="sentences.html#sc-${t.sc.no.replace(/\./g, "-")}">→ ${esc(t.sc.no)} ${esc(t.sc.zh)}</a></p>
            </div>
          </div>`).join("")}
      </section>`;
  }
  function renderReview(app) {
    const due = srsDue();
    const total = srsTotal();
    const nDone = getDone().size;
    app.innerHTML = `
      ${toolBar()}
      ${starSection()}
      <div class="prog-card card rev-head">
        <div class="prog-head">📅 复习队列 · 今日到期 <b>${due.length}</b> 场景（队列共 ${total} 场景 · 已学 ${nDone}）</div>
        <p class="rev-sub">Leitner 五盒：记住 → 升盒（间隔 ${LEITNER_DAYS.join(" / ")} 天）；又忘 → 回盒 1。新「标记已学」的场景自动入盒 1。</p>
        <a class="chip rev-exit" href="sections.html">← 返回大类导览</a>
      </div>
      ${due.length ? due.map(reviewCard).join("") :
        `<div class="card rev-empty">🎉 今日无到期场景。<br>去 <a href="vocab.html">词汇</a> / <a href="sentences.html">场景句</a> 页的场景卡上「标记已学」，它们会按 Leitner 间隔进入复习队列。</div>`}
    `;
    setStat(`今日到期 ${due.length} 场景 · 重点句 ${starCount()}`);
    bindTools(app);
    $$(".star-card .s-star", app).forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      toggleStar(b.dataset.star);
      renderReview(app);
    }));
    $$(".rev-keep", app).forEach(b => b.addEventListener("click", () => { srsAdvance(b.dataset.keep); renderReview(app); }));
    $$(".rev-forget", app).forEach(b => b.addEventListener("click", () => { srsReset(b.dataset.forget); renderReview(app); }));
  }

  /* ---------------- 主题 ---------------- */
  const TKEY = "englishheft_theme";
  function initTheme() {
    const t = localStorage.getItem(TKEY);
    if (t) document.documentElement.dataset.theme = t;
    const b = $("#themeToggle");
    if (b) b.addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme === "dark" ? "" : "dark";
      document.documentElement.dataset.theme = cur;
      localStorage.setItem(TKEY, cur);
    });
  }

  /* ---------------- 移动端导航 ---------------- */
  function initBurger() {
    const burger = $("#navBurger");
    const links = $("#navLinks");
    if (!burger || !links) return;
    burger.addEventListener("click", () => links.classList.toggle("show"));
    links.addEventListener("click", e => { if (e.target.tagName === "A") links.classList.remove("show"); });
  }

  /* ---------------- 分发 ---------------- */
  const RENDER = {
    start: renderStart,
    vocab: renderVocab,
    sentences: renderSentences,
    phonetics: renderPhonetics,
    sections: renderSections,
    review: renderReview,
  };
  function render(app) {
    const fn = RENDER[document.body.dataset.page] || renderStart;
    if (typeof ENGLISH === "undefined") {
      app.innerHTML = `<div class="card"><p>数据未加载（assets/js/data/english.js）。</p></div>`;
      return;
    }
    fn(app);
  }
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initBurger();
    srsMigrate();   // A3：把已「标记已学」但无 SRS 条目的场景一次性入盒 1（幂等）
    const app = $("#app");
    if (app) render(app);
  });
})();
