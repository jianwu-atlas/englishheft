# AGENTS.md · Englishheft（英语单词学习站）

> Jian 的英语单词复习站。**独立 git 仓库**，设计系统与部署链路对标姊妹站 `deutschheft/`（德语站）。
> 内容源：《15000 英语单词口袋书》（**课外教材**）。

## 定位

静态多页站，把一本 1370 页的纸质单词书蒸馏成可检索、可朗读、可自测的站点。
**格式统一为三行：英文 / 国际音标 / 中文（+词性）**。

## 页面与产物

| 路径 | 用途 |
|---|---|
| `index.html` | 首页：总量统计 + 4 张入口卡 + 来源说明 |
| `vocab.html` | **词汇**：17 大类 → **Part 二级导航** → 场景，493 场景 / 7052 词条，三行格式 + 逐条 🔊；**全局搜索**（EN/中文/音标）、**单词联动链接**（→场景句）、**Anki 导出**（本 Part）、**进度打勾** |
| `sentences.html` | **场景句**：4941 句（英文/中文）+ **1272 条句子解析**（● 短语用法 / ★ 单词说明 / ■ 句型搭配）；可「只看有解析」；**单词联动**（`?w=词` 横幅 + 青绿高亮）、**场景互跳**、**进度打勾** |
| `phonetics.html` | **语音·音标**：**51 个音素**（25 元音 + 26 辅音）表，每音素配**书中例词** + 出现次数；**点行音素反查**（→`vocab.html?ph=…`） |
| `sections.html` | **大类导览**：17 个 Section 的构成（Part / 场景清单）与学习建议；**学习进度**（总进度条 + 大类徽章 + 场景 chip ✓） |
| `assets/js/site.js` | 交互核心：页面分发、**en-US 朗读**（语速三档）、隐藏中文自测、复制纯英文、**词汇↔场景句联动（hash `#sc-x-y-z` + `?w=` + `?ph=`）**、搜索 / 进度 / Anki 导出 |
| `assets/js/offline.js` | PWA：注册 SW + 「📥 离线缓存」按钮 + iOS 添加到主屏幕提示 |
| `sw.js` / `manifest.webmanifest` | Service Worker（缓存优先 + 导航回退）与 PWA 清单 |
| `assets/css/english.css` | 设计系统（复制自德语站 `deutsch.css`）+ 英语站专属样式 |
| `scripts/build_en_site.py` | **蒸馏脚本**：PDF 文本层 → `assets/js/data/english.js` |
| `scripts/gen_pages.py` | 生成 5 个页面（同壳不同内容，改导航/文案改这里） |
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
