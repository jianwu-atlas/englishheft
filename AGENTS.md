# AGENTS.md · Englishheft（英语单词学习站）

> Jian 的英语单词复习站。**独立 git 仓库**，设计系统与部署链路对标姊妹站 `deutschheft/`（德语站）。
> 内容源：《15000 英语单词口袋书》（**课外教材**）。

## 定位

静态多页站，把一本 1370 页的纸质单词书蒸馏成可检索、可朗读、可自测的站点。
**格式统一为三行：英文 / 国际音标 / 中文（+词性）**。

## 页面与产物

| 路径 | 用途 |
|---|---|
| `index.html` | 首页：总量统计 + **5 张入口卡**（含原文 PDF）+ 来源说明 |
| `vocab.html` | **词汇**：17 大类 → **Part 二级导航** → 场景，493 场景 / 7052 词条，三行格式 + 逐条 🔊；**全局搜索**（EN/中文/音标）、**单词联动链接**（→场景句）、**Anki 导出**（本 Part）、**进度打勾** |
| `sentences.html` | **场景句**：4941 句（英文/中文）+ **1272 条句子解析**（● 短语用法 / ★ 单词说明 / ■ 句型搭配）；可「只看有解析」；**单词联动**（`?w=词` 横幅 + 青绿高亮）、**场景互跳**、**进度打勾**、**🇩🇪 德文对照**（逐词 IPA + de-DE 朗读，试点 Section 1） |
| `phonetics.html` | **语音·音标**：**51 个音素**（25 元音 + 26 辅音）表，每音素配**书中例词** + 出现次数；**点行音素反查**（→`vocab.html?ph=…`） |
| `sections.html` | **大类导览**：17 个 Section 的构成（Part / 场景清单）与学习建议；**学习进度**（总进度条 + 大类徽章 + 场景 chip ✓） |
| `pdf.html` | **原文 PDF**：在线翻阅《15000英语单词口袋书》原版（`<iframe>` 阅读器，镜像德语站 `lbk-viewer`）+ 下载按钮。**独立壳手工维护**（无 `#app`，仅载 site.js 走 initTheme + initBurger + 内联 toggle）；`assets/15000-en-words.pdf`（6.5 MB / 1370 页） |
| `assets/js/site.js` | 交互核心：页面分发、**en-US + de-DE 朗读**（语速三档共用）、隐藏中文自测、复制纯英文、**词汇↔场景句联动（hash `#sc-x-y-z` + `?w=` + `?ph=`）**、搜索 / 进度 / Anki 导出、**🇩🇪 德文对照渲染**（`gerHtml` 逐词 IPA + `speakDe`）、**移动端 ☰ 汉堡导航**（`initBurger`，小屏 6 链接折叠为汉堡下拉） |
| `assets/js/offline.js` | PWA：注册 SW + 「📥 离线缓存」按钮 + iOS 添加到主屏幕提示 |
| `sw.js` / `manifest.webmanifest` | Service Worker（缓存优先 + 导航回退）与 PWA 清单 |
| `assets/css/english.css` | 设计系统（复制自德语站 `deutsch.css`）+ 英语站专属样式 |
| `scripts/build_en_site.py` | **蒸馏脚本**：PDF 文本层 → `assets/js/data/english.js` |
| `scripts/gen_pages.py` | 生成 5 个页面（同壳不同内容，改导航/文案改这里；NAV 含「原文」→ `pdf.html`，该页本身**手工维护**不进生成） |
| `scripts/pack_en.py` | 打包 `dist/`（并把全量清单注入 `sw.js` / `offline.js`） |
| `scripts/_test_en_site.py` | Playwright 冒烟测试（21 项断言） |
| `scripts/extract_blue.py` | 从 PDF 按字符取色抽取**书本蓝色强调**（RGB 0,158,231）→ `en15000-blue.json`（12783 段） |
| `assets/js/annotate-en.js` | **三态音标标注**（关 / 常用 / 全部）：词典取自本书 7052 条音标，ruby 标注，右下角浮动开关 |
| `scripts/_test_en_features.py` | 三项新功能 Playwright 测试（音标三态 / 蓝色强调 / 中德对照） |
| `scripts/_test_en_links.py` | 六项联动功能 Playwright 测试（**32 项断言**：Part 导航 / 场景互跳 / 单词联动 / 搜索 / 音素反查 / 进度 / Anki；自带 http.server，**需 anaconda 解释器**：`/Users/Jack/opt/anaconda3/bin/python3 scripts/_test_en_links.py`） |
| `assets/img/favicon.svg` / `og-image.svg` | **Logo 源文件**（**双色块版**：Jian 指定的参考图——深海军蓝 #003366 + 青绿 #00CCCC 两平行色块，白字「英语」跨块 + 青绿拼音「Ying Yu」，透明底）；改 logo 只改这两个 SVG |
| `scripts/gen_logos.py` | Logo SVG → PNG 栅格化（Playwright Chromium）：favicon-16/32/48、apple-touch-icon、icon-192/512/512-maskable、logo-mark、og-image |
| `scripts/_check_logo.py` | Logo 本地验证（7 项断言：SVG 内容 / 引用版本号 / 导航 mark 渲染） |
| `assets/js/data/english.js` | 脚本生成，**勿手改**（1059 KB） |
| `assets/js/data/en-de.js` | **德文对照数据**，由 `build_en_de.py` 生成，**勿手改**。`const EN_DE = { "场景号:句idx": {de, ipa:[…]} }`；`ipa[]` 与 `de.split(/\s+/)` 逐词对齐，空串=未映射 IPA。当前**试点 Section 1（179 句）** |
| `data/de_translations.json` | **英→德翻译**（179 句，LLM 生成），key=`场景号:句idx`；`build_en_de.py` 输入源之一 |
| `data/de_ipa_dict.json` | **德语词→IPA 字典**（1249 词，快照自德语站 `pron.js`+`wortliste.js`，已剔除 word==ipa 回退项）；`build_en_de.py` 权威输入源 |
| `data/de_ipa_supplement.json` | **高频功能词/变位 IPA 补全**（50 词：das/an/am/so/als/da/mal/diese + 常见变位 hast/wird/wurde/kannst 等）；填补快照缺口，**base 优先**（冲突保留快照值）；`build_en_de.py` 可选输入源 |
| `scripts/build_en_de.py` | 读 `data/`（translations + ipa_dict + ipa_supplement）→ 键归一化（小写/ß→ss，base 优先合并）→ 分词逐词查 IPA → 生成 `en-de.js`。当前 **IPA 词覆盖 72%**。铺开其它 Section 时先补 `de_translations.json` 再重跑 |
| `scripts/_test_en_de.py` | 德文对照 Playwright 测试（默认隐藏 / 开关显形 / 逐词 IPA / de-DE 朗读函数 / 无数据 Part 优雅降级 / **无 JS 错误**；**需 anaconda 解释器**） |

## 数据源与蒸馏要点

- **源 PDF**：`/Users/Jack/Library/CloudStorage/OneDrive-Personal/01_个人_Personal/2_书籍_Books/15000英语单词口袋书-最重要.pdf`
  （1370 页 / 6.5 MB，**有完整文本层 → 无需 OCR**）
- **全文缓存**：`~/.workbuddy/wiki-knowledge-en/raw/en15000-ocr.txt`（602 KB，`pypdf` 抽取，约 17 秒）
- 数据结构：`sections[] → parts[] → scenes[]`，`scene.words[{zh,en,ipa,pos}]`、`scene.sentences[{en,zh,notes[{k,t}]}]`
- 关键处理：
  1. 词条正则 `^[①-⑳]\s*(中文)\s+(英文)\s*\[(音标)\]\s*(词性)`
  2. 场景号 `N.M.K` = Section.Part.场景；**Section / Part 名称从目录页（p7–p28）另抽**
  3. **CJK 字距空格清洗**（PDF 抽文本通病）：`数 量 相 关`→`数量相关`、`时间 （ 1 ）`→`时间（1）`
  4. 句子解析按 `●` / `★` / `■` 行**附着到上一条场景句**
  5. 音素表由**全书音标反推**（贪婪最长匹配切音素 → 计数 → 取最高频词作例词）
- ⚠️ **书中没有 Section 导语**（也无独立语音章节，仅封面 2 页为图片）。`intros` 为**站点据目录与词汇量生成**，字段 `src: "generated"` 标注来源，页面亦注明。

## 课外教材约束（Jian 2026-10-15 定，长期有效）

- 本站内容属**课外教材**：`ENGLISH.meta.extra = true`
- 其词汇**不计入**德语站的 `VOCAB` / `wortliste.js`（德语站 `gen_wortliste.js` 已按 `extra` 过滤）
- 本页与德语站的生词表**无数据往来**；`build_en_site.py` 输出独立文件，不回写德语站

## 常用操作

- 本地预览：`cd englishheft/dist && python3 -m http.server 8641 --bind 127.0.0.1`
- 重新蒸馏：`python3 scripts/build_en_site.py`
- 重新生成页面：`python3 scripts/gen_pages.py`
- 重生成德文对照：`python3 scripts/build_en_de.py`（读 `data/` → `en-de.js`）
- 打包：`python3 scripts/pack_en.py`
- 冒烟测试：先起本地服务，再 `python3 scripts/_test_en_site.py`
- 校验：`node --check assets/js/site.js`
- 本地存储：`englishheft_hidezh`（隐藏中文）、`englishheft_srate`（语速）、`englishheft_theme`（主题）、`englishheft_done`（已学场景号数组，进度打勾）

## 部署

- **GitHub Pages**：push `main` 即发布 → https://jianwu-atlas.github.io/englishheft/
- **Cloudflare Pages**：`wrangler pages deploy dist --project-name=englishheft --branch=main`
  （凭据在 `~/Library/Preferences/.wrangler`，OAuth 会自动刷新；⚠️ 仓库未配 secrets，故 **GitHub Action 不会自动部署**）
- **腾讯 EdgeOne Pages**：MCP 部署（⚠️ `*.edgeone.cool` 被 SNI 丢包，**国内不可达**）
- 仓库：https://github.com/jianwu-atlas/englishheft （描述用中文）

## 更新记录

- 2026-10-15（**vocab 场景卡左边距修复**，Jian 反馈「还是老问题，左边太靠边界」@vocab.html）：
  - **根因**：与德语站 #90 同根——`.card` 基类无 padding，vocab/sentences 页的场景卡 `.sc-scene` 亦无内边距，卡内 `.en-words` 网格与德文对照行 `.en-de` 紧贴卡片左缘（Playwright 实测内容 gapL≈1px）。
  - **修复**（`assets/css/english.css` `.sc-scene`）：加 `padding: 18px 22px`，**与德语站 `.sc-scene` 逐字一致**（设计系统同步）。vocab 与 sentences 两张 `.sc-scene` 卡同时生效。
  - **版本**：`english.css` v8→**v9**（`gen_pages.py` 模板 bump + 重新生成 5 页 + `pdf.html` 手工同步，共 6 页）。
  - **验证**：Playwright 1400px，vocab 卡内容左边距 ~1px→**23px**、`padding-left=22px`，`.en-de` 存在，0 JS 报错。
  - **部署**：GitHub Pages（push 即发）+ Cloudflare `englishheft.pages.dev`（wrangler）。

- 2026-10-15（**首页卡片内边距加宽**，Jian 5 项改动中的 #2「左边太挤，留点空位置」）：
  - **根因**：`.card` 基类无 padding，`.en-card`（首页 5 张导航卡）亦无内边距，卡内「词汇 / 493 场景·7052 词条 / 描述」紧贴卡片左边框（Playwright 实测 gapL=1px）。
  - **修复**（`assets/css/english.css` `.en-card`）：加 `padding:16px 20px`，卡内容统一内缩，与德语站卡片边距惯例一致。桌面/移动均生效。
  - **版本**：`english.css` v7→**v8**（`gen_pages.py` 模板 bump + 重新生成 5 页 + `pdf.html` 手工同步，共 6 页）。
  - **部署规则变更（Jian 拍板，长期有效）**：**以后不再部署到 EdgeOne Makers**（`englishheft.edgeone.cool` 国内不可达）。本仓库后续仅 GitHub Pages（push 即发）+ Cloudflare（`englishheft.pages.dev`，wrangler）；EdgeOne 现有站点保留不动、停止更新。
  - 📌 **连带澄清（Jian 5 项中的 #4「德文对照句在哪」）**：场景句「🇩🇪 德语对照」功能已于 commit `68cbe6b`（19:18）上线，覆盖 Section 1 试点 179 句。Jian 截图（18:35）拍于上线之前，故看不到；**现线上已正常**（Playwright 实测 github.io 线上：开启开关后 49/49 德文行渲染，含「I'll be there in just a minute.」→「Ich bin gleich in einer Minute da.」）。用户浏览器刷新即可见，无需改代码。
- 2026-10-15（**移动端导航修复**：手机端 6 个导航链接彻底消失、无汉堡入口，commit `328c278`）：
  - **根因**：英语站导航 CSS 从德语站拷来、假设有 ☰ 汉堡（小屏 `.nav-links{display:none}` + `.nav-burger{display:inline-flex}`），但 **HTML 的 `nav-tools` 里从没加过汉堡按钮**（只有主题按钮 `◐`）→ 手机端 6 链接被隐藏且无入口唤出（Playwright 390px 实测 0/6 可见）。
  - **修复（与德语站同步）**：① `gen_pages.py` 模板 + `pdf.html` 的 `nav-tools` 加 `<button class="nav-burger" id="navBurger">☰</button>`；② `site.js` 加 `initBurger()`（汉堡 toggle `#navLinks .show`、点链接关闭）并接入 `DOMContentLoaded`；③ `english.css` `@media ≤900px` 同步德语站压缩（品牌区 `flex-shrink:1;min-width:0` + 隐 `.nav-brand-sub` + `.nav-tools{flex-shrink:0;margin-left:auto}`）防汉堡被挤出视口。
  - **版本**：`english.css v6→v7`、`site.js v5→v6`（6 页：5 生成 + `pdf.html` 手工）。
  - **验证**（Playwright）：390px 汉堡 `right=378` 入视口、点击展开 6 链接（index 与 pdf.html 均生效）；1500px 桌面 6 链接 + 副标题正常、无汉堡；**0 JS 错误**。三线部署 + curl 验证（Cloudflare/GitHub 出 v7 + navBurger；EdgeOne deploy 成功）。
- 2026-10-15（**场景句德文对照 + 逐词 IPA + de-DE 朗读（试点 Section 1）**，commit `68cbe6b`）：
  - **方案（Jian 拍板）**：翻译范围 = **先试点 1 个大类**（Section 1「基本常识」5 Part / 18 场景 / **179 句**）；德语音标 = **逐词 IPA**（复用德语站词级 IPA，句内拼合，**仅示意**，未映射词留空）。
  - **数据管线**：`data/de_translations.json`（179 句英→德，LLM 生成，key=`场景号:句idx`，已校验与 179 句一一对齐、无缺无多）+ `data/de_ipa_dict.json`（1249 词→IPA，快照自德语站 `pron.js`+`wortliste.js`，剔除 word==ipa 回退项）→ **`scripts/build_en_de.py`**（分词：去首尾标点/小写/ß→ss，逐词查 IPA）→ **`assets/js/data/en-de.js`**（`const EN_DE={"1.1.1:0":{de, ipa:[…]}}`，`ipa[]` 与 `de.split(/\s+/)` 逐词对齐）。当前 IPA 词覆盖 **72%**（Jian 拍板「补高频词」后新增 `data/de_ipa_supplement.json`：50 条高频功能词/变位，base 优先合并，键归一化小写/ß→ss 修掉 ß 匹配坑）。
  - **前端**：`site.js` 加 `gerHtml()`（逐词 + 逐词 IPA + de-DE 🔊 按钮）、`speakDe()`/`deVoice`（`lang="de-DE"`，语速三档与英语共用）；`renderSentences` 取**原始句 idx**（非「只看解析」过滤后）组 key 注入德文行（英文 → 🇩🇪德文 → 中文 → 解析）。**复用既有「🇩🇪 德语对照」开关**（`#app.show-de`，同时控制词级 `w.de` 与句级德文行）。`en-de.js` 仅在 `sentences.html` 加载（`gen_pages.py` 加 `{extra_scripts}` 钩子）。无数据 Part 优雅降级（不渲染德文行、英文照常）。
  - **版本**：`english.css v5→v6`、`site.js v4→v5`、新增 `en-de.js?v=1`（6 页导航/页脚不变）。
  - **验证**：`scripts/_test_en_de.py` 全过（默认 `display:none` / 开关后 `flex` / 逐词 IPA / de-DE 函数 / Section 2 无数据不崩 / **0 JS 错误**）；截图确认逐词 IPA 排版。
  - ✅ **① 已补高频功能词 IPA**（Jian 拍板「补高频词」）：`data/de_ipa_supplement.json` 50 条 → 覆盖 55%→**72%**。⏳ **② 铺开其余 16 个 Section**（4762 句，需逐批 LLM 翻译）——**Jian 拍板「先只留 Section 1」**，待复核试点后再定。
- 2026-10-15（**首页 logo 放大 + 内容左边距加宽 + 原文 PDF 在线阅读**，commit `663a591`）：
  - **① logo 放大**：`.brand-mark` 34px→**44px**（border-radius 9px→11px）。双色块 logo 为填充色块（非细线稿），放大无小尺寸稀释问题；德语站金印 logo 仍 34px（两站独立，互不影响）。
  - **② 内容左边距加宽**：`.page-wrap` 水平 padding 桌面 **24px→44px**（两处重复定义同改）/ 小屏 **18px→28px** / print 保持 0——与德语站对齐（Jian「左边太挤，留点空间」）。
  - **③ 原文 PDF 在线阅读**：新增 **`pdf.html`**（独立壳手工维护：工具条「📖 在线阅读 / ⬇ 下载 PDF」+ `<iframe>` 阅读器，无 `#app`，仅载 site.js 走 initTheme + 内联 toggle；镜像德语站 `lbk-viewer` iframe 方案）。源 PDF 从德语站 `assets/lehrbuch/E1_15000-en-words.pdf`（**同一文件，sha256 一致**）拷入 `assets/15000-en-words.pdf`（6.5 MB / 1370 页，有文本层）。首页 `renderStart` 加第 5 张入口卡「原文 PDF」；`gen_pages.py` NAV 加「原文」→ **6 页导航 + 页脚 chip 均含「原文」**。
  - **版本**：`english.css v4→v5`、`site.js v3→v4`（favicon 组仍 `v3`）。**SW/打包**：`pack_en.py` 自动含 `pdf.html` + PDF；SW install 仅预缓存 shell，PDF 运行时 / 「📥 离线缓存」时缓存（同德语站 14MB PDF 处理，无配额问题）。
  - **验证**：Playwright 全 6 页 **0 JS 错误**；首页 logo 44px / 左边距 44px / 5 卡（含原文 PDF）/ 6 项导航；pdf.html 工具条 + iframe `src=assets/15000-en-words.pdf` + 点击展开（headless 下 PDF 不栅格化属正常，真机浏览器正常显示）。
- 2026-10-15（**词汇 ↔ 场景句联动 + 4 项新功能**，commit `a3a77dd`）：
  - **P0 修复**：`V_STATE.part` / `S_STATE.part` 恒为 0 且**无 Part UI**——每个大类只能看到第一个 Part 的场景（如 Section 1 共 18 场景只出 5 个）。新增 **Part 二级导航**（`part-tabs`，词汇/场景句两页）。
  - **A 场景级互跳**：两页场景卡互相加「→ N 句 / → N 词」链接；hash `#sc-1-1-1`（点号→连字符）定位 + **flash 金色描边 2.2s**（`_lastFlash` 防重复）。
  - **B 单词级联动**：点任意英文词 → `sentences.html?w=词#sc-…`，横幅「单词「X」在本场景…的 N 句中命中 M 句」+ **青绿 `mark.wd-hl`** 高亮（`\b` 词边界，区分书本蓝 `.en-hl`）。
  - **① 全局单词搜索**：vocab 工具栏搜 EN / 中文 / 音标（7052 词，140ms 防抖，前 200 条），结果行带 `sr-src` 一键回定位场景。
  - **② 进度打勾**：场景卡「○ 标记已学 / ✓ 已学」（localStorage `englishheft_done`）；sections 页**总进度条 + 大类 x/y 徽章 + 场景 chip 绿✓**。
  - **③ 音素反查**：phonetics 表 51 行可点 → `vocab.html?ph=…`（首次实现漏了 `V_STATE.ph = qp("ph")` 初始化，本条一并修复，`site.js` v2→v3）。
  - **④ Anki 导出**：vocab「📥 Anki（本 Part）」复制双字段 CSV：`"en","中文 pos [ipa] · 场景号 场景名"`。
  - **验证**：`scripts/_test_en_links.py` **32/32 全过、无 JS 错误**；三线部署（GitHub Pages / Cloudflare / EdgeOne）curl 验证 site.js v3 已上线。
- 2026-10-15（**双色块 logo，完全参考 Jian 指定图**，替换同日先做的 E 印章版）：logo = 深海军蓝 #003366 + 青绿 #00CCCC 两块平行色块（右块更宽且下移、压住左块）+ 白色「英语」二字跨块 + 青绿拼音「Ying Yu」右上角，透明底；og-image 白底左 logo + 右 ENGLISHHEFT 字标。源仍为 `favicon.svg` + `og-image.svg`，`gen_logos.py` 重栅格化 9 位图；版本号 favicon 组 `?v=3`、`.brand-mark` 背景 `favicon.svg?v=34`、`english.css?v=3`；**移除 `.brand-mark` 暗色覆写**（双色块透明底深浅背景通用）。`_check_logo.py` 10 项断言全过（含色块像素断言）。
- 2026-10-15（英语站独立 logo，E 印章版——**已被上一条双色块版替换**）：「D 印章」→「E 印章」（深印泥 + 金字 + 三点 + 第四点小蓝点 #009EE7）。
- 2026-10-15（三项新功能：三态音标 / 书本蓝色强调 / 中德对照）：
  - **① 三态音标（参照德语站）**：新增 `assets/js/annotate-en.js`。词典**取自本书自身 7052 条音标**；`关 → 常用 → 全部` 循环，右下角浮动开关（全部挡金色，同德语站）；「常用」跳过 the / a / is / of 等基础功能词；ruby 标注，localStorage `englishheft_ipa`。实测：0 → 94（常用）→ 104（全部）处。
  - **② 书本蓝色强调**：新增 `scripts/extract_blue.py`，用 `pdfplumber` 按字符取 `non_stroking_color` 定位蓝色（**RGB 0,158,231**）→ **12783 段 / 1323 页**。蒸馏时按**句子所在页 ±1 页**匹配、**排除本场景词表词** → 得**句内强调 1114 句**；前端渲染为 `<mark class="en-hl">`；词表英文词亦按原书用蓝色（`--en-blue`）。
  - **③ 中英 / 中德对照**：新增「🇩🇪 德语对照」开关。中→德映射**三源合并**（德语站 `wortliste.js` + `VOCAB` + **德语教材 OCR 的「德语 / 中文意思」词列**）→ **1876 条**，覆盖 **654 / 7052 词（9.3%）**。⚠️ 覆盖率受限于德语侧词汇量，属客观上限。
  - **验证**：`_test_en_features.py` **20 项断言全过**（三态循环 + 全部挡含 the + 金色 + 蓝色 mark 21 个 + 德语对照显隐 + 首页回归 + **无 JS 错误**）。
- 2026-10-15（建站）：蒸馏《15000 英语单词口袋书》→ 17 Section / 61 Part / 493 场景 / **7052 词条** / **4941 场景句** / **1272 条句子解析** / **51 个音素**；5 个页面 + PWA（离线可用）；Playwright 21 项断言全过。
