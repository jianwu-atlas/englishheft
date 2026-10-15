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

  /* ---------------- 朗读（en-US） ---------------- */
  let voice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /^en[-_]US/i.test(v.lang)) || vs.find(v => /^en([-_]|$)/i.test(v.lang)) || null;
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
  document.addEventListener("keydown", e => {
    const t = e.target;
    if (t && (t.nodeName === "INPUT" || t.nodeName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.key === "Escape") { speechSynthesis.cancel(); return; }
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
      speak(b.dataset.t);
    }));
  }

  /* ---------------- 顶部工具条 ---------------- */
  function toolBar(extra) {
    return `<div class="sc-bar"><div class="sc-tools">
      <button class="chip ${hideZh() ? "on" : ""}" id="hideZh">${hideZh() ? "👁 显示中文" : "🙈 隐藏中文自测"}</button>
      ${extra || ""}
      <button class="chip" id="speedBtn">${curSpeed().label}</button>
      <span class="sc-stat" id="statLine"></span>
    </div></div>`;
  }
  function bindTools(app, onToggle) {
    app.classList.toggle("hide-zh", hideZh());
    const hz = $("#hideZh", app);
    if (hz) hz.addEventListener("click", () => {
      localStorage.setItem(HKEY, hideZh() ? "0" : "1");
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
    const cards = [
      ["vocab.html", "词汇", "Vocabulary", `${nSc} 场景 · ${nW} 词条`, "英文 / 音标 / 中文三行对照，点词即朗读"],
      ["sentences.html", "场景句", "Sentences", `${nS} 句 · ${nN} 条解析`, "Top10 场景句 + 短语用法 / 单词说明 / 句型搭配"],
      ["phonetics.html", "语音·音标", "Phonetics", `${ph.vowels.length} 元音 · ${ph.consonants.length} 辅音`, "从全书音标反推的音素表，每个音素配书中例词"],
      ["sections.html", "大类导览", "Sections", `${secs.length} 个大类 · ${secs.reduce((a, s) => a + s.parts.length, 0)} 个 Part`, "按 Section → Part → 场景逐层展开"],
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
  const V_STATE = { sec: 0, part: 0 };
  function renderVocab(app) {
    const { secs, nSc, nW } = stats();
    if (V_STATE.sec >= secs.length) V_STATE.sec = 0;
    const sec = secs[V_STATE.sec];
    if (V_STATE.part >= sec.parts.length) V_STATE.part = 0;
    const part = sec.parts[V_STATE.part];
    app.innerHTML = `
      <div class="chip-row sc-tabs">
        ${secs.map((s, i) => `<button class="chip ${i === V_STATE.sec ? "on" : ""}" data-s="${i}">${s.no}. ${esc(s.zh)}<span class="sc-cnt">${s.parts.reduce((a, p) => a + p.scenes.length, 0)}</span></button>`).join("")}
      </div>
      ${toolBar(`<button class="chip" id="copyPart">📋 复制本 Part 纯英文</button>`)}
      ${part.scenes.map(sc => `
        <section class="sc-scene card">
          <h2 class="sc-title"><span class="sc-num">${esc(sc.no.split(".").pop())}</span>${esc(sc.zh)}
            <span class="sc-badge">${sc.words.length} 词</span></h2>
          <div class="en-words">
            ${sc.words.map(w => `
              <div class="en-word">
                <p class="en-en">${esc(w.en)}<button class="s-speak" data-t="${escA(w.en)}" title="朗读">🔊</button></p>
                <p class="s-pron">${esc(w.ipa)}</p>
                <p class="en-zh">${esc(w.zh)}<span class="en-pos">${esc(w.pos)}</span></p>
              </div>`).join("")}
          </div>
        </section>`).join("")}`;
    setStat(`全书 ${nSc} 场景 · ${nW} 词`);
    $$(".sc-tabs .chip", app).forEach(b => b.addEventListener("click", () => {
      V_STATE.sec = +b.dataset.s; V_STATE.part = 0; renderVocab(app);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }));
    copyBtn("#copyPart", "", () => part.scenes.map(sc =>
      `【${sc.zh}】\n` + sc.words.map(w => w.en).join("\n")).join("\n\n"));
    bindTools(app, () => renderVocab(app));
  }

  /* ---------------- 场景句 ---------------- */
  const S_STATE = { sec: 0, part: 0, onlyNotes: false };
  function renderSentences(app) {
    const { secs, nS, nN } = stats();
    if (S_STATE.sec >= secs.length) S_STATE.sec = 0;
    const sec = secs[S_STATE.sec];
    if (S_STATE.part >= sec.parts.length) S_STATE.part = 0;
    const part = sec.parts[S_STATE.part];
    const blocks = part.scenes.map(sc => ({
      sc, sents: S_STATE.onlyNotes ? sc.sentences.filter(x => x.notes.length) : sc.sentences,
    })).filter(b => b.sents.length);
    app.innerHTML = `
      <div class="chip-row sc-tabs">
        ${secs.map((s, i) => `<button class="chip ${i === S_STATE.sec ? "on" : ""}" data-s="${i}">${s.no}. ${esc(s.zh)}<span class="sc-cnt">${s.parts.reduce((a, p) => a + p.scenes.reduce((c, x) => c + x.sentences.length, 0), 0)}</span></button>`).join("")}
      </div>
      ${toolBar(`<button class="chip ${S_STATE.onlyNotes ? "on" : ""}" id="onlyNotes">🔎 只看有解析</button><button class="chip" id="copyPart">📋 复制本 Part 纯英文</button>`)}
      ${blocks.map(({ sc, sents }) => `
        <section class="sc-scene card">
          <h2 class="sc-title"><span class="sc-num">${esc(sc.no.split(".").pop())}</span>${esc(sc.zh)}
            <span class="sc-badge">${sents.length} 句</span></h2>
          ${sents.map(s => `
            <div class="sc-turn">
              <span class="sc-spk">·</span>
              <div class="sc-turn-body">
                <p class="s-de">${esc(s.en)}<button class="s-speak" data-t="${escA(s.en)}" title="朗读">🔊</button></p>
                <p class="s-zh">${esc(s.zh)}</p>
                ${s.notes.length ? `<div class="en-notes">${s.notes.map(n =>
                  `<p class="en-note-line"><b class="en-note-k">${esc(n.k)}</b>${esc(n.t)}</p>`).join("")}</div>` : ""}
              </div>
            </div>`).join("")}
        </section>`).join("") || `<div class="card"><p>本 Part 暂无带解析的句子。</p></div>`}`;
    setStat(`全书 ${nS} 句 · ${nN} 条解析`);
    $$(".sc-tabs .chip", app).forEach(b => b.addEventListener("click", () => {
      S_STATE.sec = +b.dataset.s; S_STATE.part = 0; renderSentences(app);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }));
    const on = $("#onlyNotes", app);
    if (on) on.addEventListener("click", () => { S_STATE.onlyNotes = !S_STATE.onlyNotes; renderSentences(app); });
    copyBtn("#copyPart", "", () => part.scenes.map(sc =>
      `【${sc.zh}】\n` + sc.sentences.map(x => x.en).join("\n")).join("\n\n"));
    bindTools(app, () => renderSentences(app));
  }

  /* ---------------- 语音·音标 ---------------- */
  function renderPhonetics(app) {
    const ph = ENGLISH.phonetics;
    const tbl = (rows, cls) => `
      <table class="sc-md-table ph-table ${cls}">
        <thead><tr><th>音标</th><th>说明</th><th>书中例词</th><th>出现</th></tr></thead>
        <tbody>${rows.map(r => `
          <tr>
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
    bindTools(app);
  }

  /* ---------------- 大类导览 ---------------- */
  function renderSections(app) {
    const { secs } = stats();
    app.innerHTML = `
      ${toolBar()}
      ${ENGLISH.intros.map(it => {
        const s = secs.find(x => x.no === it.no);
        return `
        <section class="sc-scene card">
          <h2 class="sc-title"><span class="sc-num">${it.no}</span>${esc(it.zh)}
            <span class="sc-badge">${s.parts.length} Part · ${s.parts.reduce((a, p) => a + p.scenes.length, 0)} 场景</span></h2>
          <p class="en-intro">${esc(it.text)}</p>
          <div class="en-parts">
            ${s.parts.map(p => `
              <div class="en-part">
                <div class="en-part-h">${esc(p.zh)}<span class="en-part-n">${p.scenes.length} 场景</span></div>
                <div class="en-scene-chips">${p.scenes.map(sc => `<span class="en-scene-chip">${esc(sc.zh)}</span>`).join("")}</div>
              </div>`).join("")}
          </div>
        </section>`;
      }).join("")}`;
    setStat(`${secs.length} 个大类`);
    bindTools(app);
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

  /* ---------------- 分发 ---------------- */
  const RENDER = {
    start: renderStart,
    vocab: renderVocab,
    sentences: renderSentences,
    phonetics: renderPhonetics,
    sections: renderSections,
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
    const app = $("#app");
    if (app) render(app);
  });
})();
