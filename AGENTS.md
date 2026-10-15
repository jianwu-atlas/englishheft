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
| `vocab.html` | **词汇**：17 大类 → Part → 场景，493 场景 / 7052 词条，三行格式 + 逐条 🔊 |
| `sentences.html` | **场景句**：4941 句（英文/中文）+ **1272 条句子解析**（● 短语用法 / ★ 单词说明 / ■ 句型搭配）；可「只看有解析」 |
| `phonetics.html` | **语音·音标**：**51 个音素**（25 元音 + 26 辅音）表，每音素配**书中例词** + 出现次数 |
| `sections.html` | **大类导览**：17 个 Section 的构成（Part / 场景清单）与学习建议 |
| `assets/js/site.js` | 交互核心：页面分发、**en-US 朗读**（语速三档）、隐藏中文自测、复制纯英文 |
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
| `assets/img/favicon.svg` / `og-image.svg` | **Logo 源文件**（E 印章 + 书本蓝第四点 #009EE7，jwlab 设计语言）；改 logo 只改这两个 SVG |
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
- 本地存储：`englishheft_hidezh`（隐藏中文）、`englishheft_srate`（语速）、`englishheft_theme`（主题）

## 部署

- **GitHub Pages**：push `main` 即发布 → https://jianwu-atlas.github.io/englishheft/
- **Cloudflare Pages**：`wrangler pages deploy dist --project-name=englishheft --branch=main`
  （凭据在 `~/Library/Preferences/.wrangler`，OAuth 会自动刷新；⚠️ 仓库未配 secrets，故 **GitHub Action 不会自动部署**）
- **腾讯 EdgeOne Pages**：MCP 部署（⚠️ `*.edgeone.cool` 被 SNI 丢包，**国内不可达**）
- 仓库：https://github.com/jianwu-atlas/englishheft （描述用中文）

## 更新记录

- 2026-10-15（英语站独立 logo）：替换建站时从德语站拷来的「D 印章」为**「E 印章」**——同族设计（深印泥 #201B14 + 金字 E + 下划线 + 三点 #2456A6/#B03048/#2E7D5B + jwlab），**第四点小蓝点 #009EE7**（= 书本强调蓝 RGB 0,158,231）作为英语站签名。源：`assets/img/favicon.svg` + `og-image.svg`（ENGLISHHEFT 字标）；`scripts/gen_logos.py` 栅格化 9 个位图。一致性：nav 品牌 mark 走 CSS `.brand-mark` 背景（`favicon.svg?v=33`）、HTML favicon 组 `?v=2`、新增 `og:image`、manifest 图标换新 PNG；`_check_logo.py` 7 项断言全过（含头部渲染截图）。
- 2026-10-15（三项新功能：三态音标 / 书本蓝色强调 / 中德对照）：
  - **① 三态音标（参照德语站）**：新增 `assets/js/annotate-en.js`。词典**取自本书自身 7052 条音标**；`关 → 常用 → 全部` 循环，右下角浮动开关（全部挡金色，同德语站）；「常用」跳过 the / a / is / of 等基础功能词；ruby 标注，localStorage `englishheft_ipa`。实测：0 → 94（常用）→ 104（全部）处。
  - **② 书本蓝色强调**：新增 `scripts/extract_blue.py`，用 `pdfplumber` 按字符取 `non_stroking_color` 定位蓝色（**RGB 0,158,231**）→ **12783 段 / 1323 页**。蒸馏时按**句子所在页 ±1 页**匹配、**排除本场景词表词** → 得**句内强调 1114 句**；前端渲染为 `<mark class="en-hl">`；词表英文词亦按原书用蓝色（`--en-blue`）。
  - **③ 中英 / 中德对照**：新增「🇩🇪 德语对照」开关。中→德映射**三源合并**（德语站 `wortliste.js` + `VOCAB` + **德语教材 OCR 的「德语 / 中文意思」词列**）→ **1876 条**，覆盖 **654 / 7052 词（9.3%）**。⚠️ 覆盖率受限于德语侧词汇量，属客观上限。
  - **验证**：`_test_en_features.py` **20 项断言全过**（三态循环 + 全部挡含 the + 金色 + 蓝色 mark 21 个 + 德语对照显隐 + 首页回归 + **无 JS 错误**）。
- 2026-10-15（建站）：蒸馏《15000 英语单词口袋书》→ 17 Section / 61 Part / 493 场景 / **7052 词条** / **4941 场景句** / **1272 条句子解析** / **51 个音素**；5 个页面 + PWA（离线可用）；Playwright 21 项断言全过。
