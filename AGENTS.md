# AGENTS.md · Englishheft（英语单词学习站）

> Jian 的英语单词复习站。**独立 git 仓库**，设计系统与部署链路对标姊妹站 `deutschheft/`（德语站）。
> 内容源：《15000 英语单词口袋书》（**课外教材**）。

## 定位

静态多页站，把一本 1370 页的纸质单词书蒸馏成可检索、可朗读、可自测的站点。
**格式统一为三行：英文 / 国际音标 / 中文（+词性）**。

## 页面与产物

| 路径 | 用途 |
|---|---|
| `index.html` | 首页：总量统计 + **6 张入口卡**（**复习队列**（今日到期 N 场景）+ 词汇 / 场景句 / 语音 / 大类导览 / 原文 PDF）+ 来源说明 |
| `vocab.html` | **词汇**：17 大类 → **Part 二级导航** → 场景，493 场景 / 7052 词条，三行格式 + 逐条 🔊；**全局搜索**（EN/中文/音标）、**单词联动链接**（→场景句）、**Anki 导出**（本 Part）、**进度打勾** |
| `sentences.html` | **场景句**：4941 句（英文/中文）+ **1272 条句子解析**（● 短语用法 / ★ 单词说明 / ■ 句型搭配）；可「只看有解析」；**单词联动**（`?w=词` 横幅 + 青绿高亮）、**场景互跳**、**进度打勾**、**🇩🇪 德文对照**（逐词 IPA + de-DE 朗读，**全部 17 大类 / 4941 句**） |
| `phonetics.html` | **语音·音标**：**51 个音素**（25 元音 + 26 辅音）表，每音素配**书中例词** + 出现次数；**点行音素反查**（→`vocab.html?ph=…`） |
| `sections.html` | **大类导览**：17 个 Section 的构成（Part / 场景清单）与学习建议；**学习进度**（总进度条 + 大类徽章 + 场景 chip ✓）+ **📅 复习队列入口**（今日到期 N 场景 →） |
| `review.html` | **复习（Leitner SRS）**：今日到期的「已学」场景逐卡展示（盒位徽章 + 词条 + 场景句 + 🔊/🇩🇪），自评「✅ 记住了·升盒 / ❌ 又忘了·回盒 1」。数据 `localStorage englishheft_srs`，五盒间隔 1/2/4/7/15 天；「标记已学」自动入盒 1，取消移出队列 |
| `pdf.html` | **原文 PDF**：在线翻阅《15000英语单词口袋书》原版（`<iframe>` 阅读器，镜像德语站 `lbk-viewer`）+ 下载按钮。**独立壳手工维护**（无 `#app`，仅载 site.js 走 initTheme + initBurger + 内联 toggle）；`assets/15000-en-words.pdf`（6.5 MB / 1370 页） |
| `assets/js/site.js` | 交互核心：页面分发、**en-US + de-DE 朗读**（语速三档共用）、隐藏中文自测、复制纯英文、**词汇↔场景句联动（hash `#sc-x-y-z` + `?w=` + `?ph=`）**、搜索 / 进度 / Anki 导出、**🇩🇪 德文对照渲染**（`gerHtml` 逐词 IPA + `speakDe`）、**整段场景连读**（`speakScene` 链式朗读全场景，随🇩🇪开关读英/德，会话 id 防串读，Esc/再点/切Section 停止）、**A3 场景级 Leitner SRS**（`srsEnroll/Advance/Reset/Drop/Due` + `srsMigrate` 一次性迁移 + `renderReview` 复习队列；done 打勾联动入/出队列，`localStorage englishheft_srs`）、**B1 重点句收藏**（`starGet/toggleStar/starCount/starTarget` + 句末 ☆/★ 按钮 + `starSection` 复习页清单，`localStorage englishheft_stars`）、**移动端 ☰ 汉堡导航**（`initBurger`，小屏 7 链接折叠为汉堡下拉） |
| `assets/js/offline.js` | **离线包（B2）**：注册 SW（install 自动预缓存核心包）+ 左下角「离线包」状态面板（核心 x/28 · PDF 是否就绪 · 占用 MB · 进度条 · 📥 下载全部 / 🗑 清理）+ 断网提示条 `#netBar`（面板打开时自动隐藏）+ iOS 首访「添加到主屏幕」提示 |
| `sw.js` / `manifest.webmanifest` | Service Worker：`VERSION=englishheft-v2`，**install 自动预缓存 `CORE_FILES`（全部页面 + JS/CSS/图标 ≈ 2.1 MB，不含 PDF）**；fetch 缓存优先且 `ignoreSearch:true`（`?v=N` 也能命中预缓存）；导航 network-first 失败回退；message 支持 `cache-all`（逐文件回执进度）/ `cache-clear` / `ping` |
| `assets/css/english.css` | 设计系统（复制自德语站 `deutsch.css`）+ 英语站专属样式 |
| `scripts/build_en_site.py` | **蒸馏脚本**：PDF 文本层 → `assets/js/data/english.js` |
| `scripts/gen_pages.py` | 生成 6 个页面（同壳不同内容，改导航/文案改这里；NAV 含「复习」→ `review.html`、**「原文」→ `pdf.html`**（该页本身**手工维护**不进生成）；`sentences`/`review` 页额外载 `en-de.js`） |
| `scripts/pack_en.py` | 打包 `dist/`（并把全量清单注入 `sw.js` / `offline.js`） |
| `scripts/_test_en_site.py` | Playwright 冒烟测试（21 项断言） |
| `scripts/extract_blue.py` | 从 PDF 按字符取色抽取**书本蓝色强调**（RGB 0,158,231）→ `en15000-blue.json`（12783 段） |
| `assets/js/annotate-en.js` | **三态音标标注**（关 / **常用（默认）** / 全部）：词典取自本书 7052 条音标，ruby 标注，**音标为书本蓝 `--en-blue` 加粗**，右下角浮动开关；打开时给 `#app` 加 `.ipa-on` 以留出 ruby 行高；localStorage `englishheft_ipa_v2` |
| `scripts/_test_en_features.py` | 三项新功能 Playwright 测试（音标三态 / 蓝色强调 / 中德对照） |
| `scripts/_test_en_links.py` | 六项联动功能 Playwright 测试（**32 项断言**：Part 导航 / 场景互跳 / 单词联动 / 搜索 / 音素反查 / 进度 / Anki；自带 http.server，**需 anaconda 解释器**：`/Users/Jack/opt/anaconda3/bin/python3 scripts/_test_en_links.py`） |
| `scripts/_test_srs.py` | **A3 Leitner SRS** Playwright 测试（3 个 context：首页/导览到期计数 + 复习卡渲染 + 升盒/回盒 + done 实时入/出队列 + 一次性迁移；自带 http.server 8652，**需 anaconda 解释器**：`/Users/Jack/opt/anaconda3/bin/python3 scripts/_test_srs.py`） |
| `scripts/_test_stars.py` | **B1 重点句收藏** Playwright 测试（音标默认「常用」+ 蓝色 / ☆ 收藏 2 句 / 刷新保留 / 复习页清单 2 行 / 移出 1 条 / 首页与导览计数 / 空态；自带 http.server 8653，**需 anaconda 解释器**：`/Users/Jack/opt/anaconda3/bin/python3 scripts/_test_stars.py`） |
| `scripts/_test_offline.py` | **B2 离线包** Playwright 测试（不点按钮自动预缓存 ≥28 文件 / 面板状态 / 断网打开未访问页面 4 个 / 下载全部后 PDF 就绪 / 断网 pdf.html；自带 http.server 8654，**需 anaconda 解释器**：`/Users/Jack/opt/anaconda3/bin/python3 scripts/_test_offline.py`） |
| `assets/img/favicon.svg` / `og-image.svg` | **Logo 源文件**（**双色块版**：Jian 指定的参考图——深海军蓝 #003366 + 青绿 #00CCCC 两平行色块，白字「英语」跨块 + 青绿拼音「Ying Yu」，透明底）；改 logo 只改这两个 SVG |
| `scripts/gen_logos.py` | Logo SVG → PNG 栅格化（Playwright Chromium）：favicon-16/32/48、apple-touch-icon、icon-192/512/512-maskable、logo-mark、og-image |
| `scripts/_check_logo.py` | Logo 本地验证（7 项断言：SVG 内容 / 引用版本号 / 导航 mark 渲染） |
| `assets/js/data/english.js` | 脚本生成，**勿手改**（1059 KB） |
| `assets/js/data/en-de.js` | **德文对照数据**，由 `build_en_de.py` 生成，**勿手改**。`const EN_DE = { "场景号:句idx": {de, ipa:[…]} }`；`ipa[]` 与 `de.split(/\s+/)` 逐词对齐，空串=未映射 IPA。当前**全部 17 大类（4941 句，99.9% 逐词 IPA；仅纯数字留空）** |
| `data/de_translations.json` | **英→德翻译**（4941 句 = 全书场景句，LLM 生成），key=`场景号:句idx`；`build_en_de.py` 输入源之一。各 Section 的中间产物 `tr_secN.json`/`work_secN.json` **不入库**（仅留合并后的本文件） |
| `data/de_ipa_dict.json` | **德语词→IPA 字典**（1249 词，快照自德语站 `pron.js`+`wortliste.js`，已剔除 word==ipa 回退项）；`build_en_de.py` 权威输入源 |
| `data/de_ipa_supplement.json` | **高频功能词/变位 IPA 补全**（50 词：das/an/am/so/als/da/mal/diese + 常见变位 hast/wird/wurde/kannst 等）；填补快照缺口，**base 优先**（冲突保留快照值）；`build_en_de.py` 可选输入源 |
| `data/de_ipa_espeak.json` | **第三层兜底词典**：base/supp 都未命中的**屈折/派生词**（5374 词）espeak-ng 近似 IPA，键=stem 口径、值带 `[..]`。由 `build_en_ipa_espeak.py` 生成，**勿手改** |
| `scripts/build_en_ipa_espeak.py` | 复用 `build_en_de.stem()` 算出未命中 distinct 词 → 过滤纯数字/无字母 → 批量 `espeak-ng -v de --ipa`（线程 + 断点续跑 `data/en_ipa_espeak_progress.json`）→ 写 `data/de_ipa_espeak.json`（**纯 JSON**）。`--dry` 只统计不调 espeak。⚠️ espeak 每次 ~1s，全量 ~12min，**后台跑** |
| `scripts/build_en_de.py` | 读 `data/`（translations + ipa_dict + ipa_supplement + **ipa_espeak**）→ 键归一化（小写/ß→ss）→ 分词逐词查 IPA → 生成 `en-de.js`。**三层查表 base → supplement → espeak**（冲突保留高层）。当前 **IPA 词覆盖 99.9%**（全书 4941 句；仅纯数字留空）。输出统一「裸 IPA」风格（剥首尾 `[]`），头部句数随数据动态。**每补一批翻译/词表后重跑即可**（若新增屈折词先跑 `build_en_ipa_espeak.py` 再跑本脚本） |
| `scripts/_extract_work.js` | 抽取某 Section 的「英文/中文对照待译清单」→ `data/work_secN.json`（`{key,en,zh}`）；用法 `node scripts/_extract_work.js data/work_secN.json 13 14 15`（section 号为字符串） |
| `scripts/_test_en_de.py` | 德文对照 Playwright 测试（默认隐藏 / 开关显形 / 逐词 IPA / de-DE 朗读函数 / Section 2 **已有数据**应渲染 / **无 JS 错误**；**需 anaconda 解释器**：`/Users/Jack/opt/anaconda3/bin/python3 scripts/_test_en_de.py`） |

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
- 本地存储：`englishheft_hidezh`（隐藏中文）、`englishheft_srate`（语速）、`englishheft_theme`（主题）、`englishheft_done`（已学场景号数组，进度打勾）、`englishheft_srs`（Leitner 盒位）、`englishheft_ipa_v2`（音标三态，默认 `smart`）、`englishheft_stars`（重点句 `{"场景号:句idx": 收藏时间戳}`）、`dh_ios_hint_v1`（iOS 加主屏提示已读）
- ⚠️ **改版发版时务必 bump `sw.js` 的 `VERSION`**（`englishheft-v2` → v3 …），否则老客户端缓存不清、页面停在旧版

## 部署

- **GitHub Pages**：push `main` 即发布 → https://jianwu-atlas.github.io/englishheft/
- **Cloudflare Pages**：`wrangler pages deploy dist --project-name=englishheft --branch=main`
  （凭据在 `~/Library/Preferences/.wrangler`，OAuth 会自动刷新；⚠️ 仓库未配 secrets，故 **GitHub Action 不会自动部署**）
- **腾讯 EdgeOne Pages**：MCP 部署（⚠️ `*.edgeone.cool` 被 SNI 丢包，**国内不可达**）
- 仓库：https://github.com/jianwu-atlas/englishheft （描述用中文）

## 更新记录

- 2026-10-27（**B2 · 离线包：自动预缓存 + 状态面板**，Jian 问「离线缓存怎么用、手机没网怎么办」）：
  - **诊断**：原实现只在 install 缓存 3 个外壳文件，其余靠手动点按钮；`cache.addAll()` 原子失败 + 「8 分钟后无条件标 ✓」→ 弱网下**假成功**；首访未被 SW 接管时走 `selfCacheAll`（只 fetch 不写 Cache Storage，等于没缓存）。实测：点击前 3 文件 → 点击后 30 文件 / 8.64 MB。
  - **改法**：① `sw.js` 重写 —— `install` 自动预缓存 **CORE_FILES（28 个，2.1 MB，不含 6.5 MB PDF）**；逐文件 `cacheList()`（单文件失败不影响其余，边缓存边回执）；`VERSION → englishheft-v2`（旧缓存自动清）；fetch 全部改 `caches.match(req, {ignoreSearch:true})`，让 `?v=N` 的静态资源也能命中预缓存（关键：无需逐页访问即可离线）。
  - ② `offline.js` 重写为**离线包状态面板**：左下角按钮三态（📥 未缓存 / ✓ 核心已缓存 / ✓ 离线可用），点开面板显示 核心 x/28、PDF 是否就绪、占用 MB（`content-length` 求和，不读 blob）、进度条、📥 下载全部 / 🗑 清理；`cache-all` 只补缺的文件（已缓存 PDF 时 1s 完成）；新增断网提示条 `#netBar`（面板打开时隐藏）；iOS 加主屏提示改为**首访即提示**（原来只在缓存后提示）。
  - **CSS**：`#offlinePanel` / `.of-*` / `#netBar` / `body.of-open`；版本 `english.css v13→v14`、`offline.js v1→v2`。
  - **验证**：新增 `scripts/_test_offline.py`（自动预缓存 28 文件/3s、面板状态、断网打开 4 个从未访问页面、下载全部后 PDF 就绪、断网 pdf.html 全绿）；其余五个套件回归全绿。桌面 + 390px 移动端截图核对。
  - **已知取舍**：导航仍是 network-first（保证内容新鲜），断网时控制台会留下 4 条 `ERR_INTERNET_DISCONNECTED`（来自失败的预取，非故障）；Google Fonts 跨域不缓存，离线回退系统字体。


- 2026-10-27（**B1 · 音标默认「常用」蓝色强调 + 重点句收藏 ⭐**）：
  - **需求**（Jian）①「标注音标（常用音标，不是所有），强调，例如标注蓝色」②「点击就把这句话标注重点，单独重点强调，存储在一个地方方便复习」。
  - **① 音标**：`annotate-en.js` 默认档 `off → smart`（「常用」跳过 the/a/is/of 等基础功能词），存储键 `englishheft_ipa → englishheft_ipa_v2`（避免旧 `off` 记忆让新默认失效）；`ruby.ipa` **单词本身与 `rt` 音标同用书本蓝 `--en-blue` #0090D6**（`rt` 加粗 .64em；深色主题走 #4DC2F5；`mark.wd-hl` 内的词保留青绿高亮 `color:inherit`）；新增 `#app.ipa-on` 状态类 + `#app.ipa-on .sc-turn-body .s-de{line-height:2.1}` / `.sc-turn{padding-top:12px}`，修掉音标压上一行的问题；注解范围排除 `.en-notes` / `.s-zh` / `.star-meta`（解析与中文不再标注），词汇页英文词在 `<a>` 内本就跳过（其下已有 `.s-pron` 音标行）。
  - **② 重点句**：`localStorage englishheft_stars = {"场景号:句idx": 收藏时间戳}`；`site.js` 加 `starGet/starSet/isStar/starCount/toggleStar/starTarget/starKeys` + 句末 `☆/★` 按钮（`starBtn`）。收藏后就地强调：`.sc-turn.starred`（金色左竖条 + 淡金底 + 金色圆点/★）、按钮转实心金。复习页顶部新增 `starSection()`（⭐ 重点句 · 共 N 句，按收藏时间倒序，含 🔊、中文、`→ 场景号 场景名` 回链、`✕` 移出，空态引导）；首页「复习」卡描述与「大类导览」复习入口显示重点句数。
  - **样式**（`english.css`）：`.s-acts`（🔊+⭐ 整体换行，手机端不再让星星单独掉行）、`.s-star/.s-star.on`、`.sc-turn.starred`、`.star-head/.star-card/.star-meta/.rev-star`。
  - **顺带修复**：`.s-speak` 嵌在 `<a class="en-wordlink">` 内时点击会误跳转场景句页（`stopPropagation` 不阻止链接默认行为）→ `bindSpeak` 增加 `preventDefault()`。
  - **版本**：`site.js v8→v9`、`english.css v11→v13`、`annotate-en.js v1→v2`（`gen_pages.py` + `pdf.html` 同步，regen 6 页 + `pack_en.py`）。
  - **验证**：新增 `scripts/_test_stars.py`（7 组断言全绿，0 console error）；回归 `_test_en_features.py`（三态改为「默认常用→全部→关」+ 蓝色断言）/`_test_srs.py`/`_test_en_links.py`/`_test_en_de.py`/`_test_en_site.py` 全绿（顺带把 `_test_en_site.py` 的过时断言 4 卡→6 卡、导航 5→7 项）。移动端 390px 与深色主题截图核对。


- 2026-10-16（**A3 · 场景级 Leitner SRS 复习队列**，commit 见下）：
  - **需求**：Jian 选「A·学习效果提升」后拍板「A3 = 场景级（Leitner）」。把场景「已学打勾」升级为 Leitner 五盒间隔复习：记住升盒、又忘回盒 1，间隔 1/2/4/7/15 天；首页/大类导览加「今日到期 N 场景」入口 → 独立复习页。
  - **数据**：`localStorage englishheft_srs = { "1.1.1": {b: 盒1-5, d: 到期时间戳ms} }`；`LEITNER_DAYS=[1,2,4,7,15]`。`srsEnroll(no,box)`/`srsAdvance`/`srsReset`/`srsDrop`/`srsDue`（`d<=now` 升序）/`srsTotal`。**一次性迁移 `srsMigrate()`**（`DOMContentLoaded` 里跑，幂等）：A3 上线前已「标记已学」但无 SRS 条目的场景入盒 1、今日到期。
  - **联动**：`bindDone` 打勾时**入盒 1**（`srsEnroll(no,1)`）、取消时**出队列**（`srsDrop`）。
  - **新增 `review.html`**（第 7 页）：`renderReview` 列今日到期场景卡（盒位徽章 + 词条三行 + 场景句 + 🔊/🇩🇪 德文复用 `gerHtml`），自评按钮 `✅ 记住了·升盒`（`srsAdvance` 后重渲）/`❌ 又忘了·回盒 1`（`srsReset` 后重渲）；空态引导去标记已学。`gen_pages.py` NAV/PAGES 加 review（**7 项导航**），`sentences`/`review` 页均载 `en-de.js`。
  - **入口**：首页 `renderStart` 第 1 张卡「复习」（今日到期 N 场景，红字强调）；大类导览 `renderSections` 进度卡下加「📅 复习队列 · N 场景今日到期 →」。
  - **样式**（`english.css`）：`.rev-box`（盒位徽章）/`.rev-actions`/`.rev-keep`（ok 绿）/`.rev-forget`（accent）/`.rev-head`/`.rev-sub`/`.rev-sents`/`.rev-empty`/`.rev-due`/`.rev-entry`。
  - **版本**：`site.js v7→v8`、`english.css v10→v11`（`gen_pages.py` + `pdf.html` 手工同步；**6 生成页 + pdf.html = 7 页**）。
  - **验证**：新增 `scripts/_test_srs.py`（3 context，全绿：首页/导览计数=2、复习卡 2 张含 34 词/20 句、记住 1.1.1→盒2 队列 2→1、又忘 3.1.1→盒1 队列→0 空态、迁移 1.1.2→盒1、标记已学入盒1/取消移出、**0 JS 错误**）+ `_test_en_de.py`+`_test_en_links.py` 回归全绿；7 页均含复习导航/页脚链接。
  - **部署**：GitHub Pages（push 即发）+ Cloudflare（`wrangler pages deploy dist`）；EdgeOne 依规则跳过。

- 2026-10-16（**A2 · 整段场景连读**，commit `f9c1d9d`）：
  - **需求**：Jian 选「A·学习效果提升」后拍板落地 A1/A2/A3。A2 = 场景句页每个场景标题加「▶ 连读」按钮，**链式** `speechSynthesis` 顺序朗读**整场景全部句子**（不受「只看有解析」过滤影响），读完自动停止。
  - **实现**（`assets/js/site.js`）：`speakScene(sc, useDe, btn)` 逐句组 `items`（`useDe` 且有 `EN_DE` 时取德文 `EN_DE[sc.no:idx].de`，否则英文 `s.en`），`step()` 里 `u.onend=step / u.onerror=step` 串下一句，末句 `i>=items.length` → `stopSceneSpeak()`；**会话 id**（`sceneSeq` 自增 + `my` 快照）防「新会话取代 / Esc 停止后旧 onend 误续」；`stopSceneSpeak()` 取消语音 + 复位按钮文案；`activeSceneBtn` 记录当前连读按钮切「⏹ 停止」。语言 `useDe?"de-DE":"en-US"`、音色 `deVoice`/`voice`、语速 `curSpeed().r`（三档与单句共用）。
  - **入口**：场景 `<h2 class="sc-title">` 加 `<button class="s-speak-scene" data-sceneno>`；点击绑定 `speakScene(sc, showDe(), b)`（**随既有「🇩🇪 德语对照」开关**读英/德），再点同按钮或按 **Esc** 停止；`renderSentences` 每次 `app.innerHTML=` 前调 `stopSceneSpeak()`（切 Section/Part/状态即停）。
  - **样式**（`assets/css/english.css`）：`.s-speak-scene` 胶囊按钮（accent 边框 + `--accent-soft` 底 + accent 字，hover 反白），贴 `.sc-done` 后。
  - **版本**：`site.js v6→v7`、`english.css v9→v10`（`gen_pages.py` + `pdf.html` 手工同步，共 6 页）。
  - **验证**：`scripts/_test_en_de.py` 加 A2 断言（`.s-speak-scene` 按钮存在 / `__enSpeakScene`+`__enStopScene` 函数暴露 / 点击切「⏹ 停止」/ 显式停止复位「▶ 连读」/ 连读过程 0 console error，headless 无音频文案断言从宽）+ `_test_en_links.py` 回归 **全绿（0 JS 错误）**；`node --check site.js` 通过（**坑**：初版 `speakScene` 首行误多一个 `"`（`window"))`）致语法错误，byte-diff 定位后修）。
  - **部署**：GitHub Pages（push 即发）+ Cloudflare（`englishheft.pages.dev`，wrangler 26 文件）均 curl 实测 `?v=7` + 线上 `site.js` 含 A2 函数（11 处）；EdgeOne 依规则跳过。

- 2026-10-16（**A1 · 德文逐词 IPA espeak 兜底补全，69%→99.9%**，commit `f72ef80`）：
  - **根因**：缺口几乎全是**屈折/派生形式**（变位 geht/wurde、复数 Tauben、过去分词 gegangen…）——词典只收词干/原形，命中不了变体。
  - **做法（Jian 拍板「espeak 近似兜底」）**：新增 `scripts/build_en_ipa_espeak.py`（复用 `build_en_de.stem()` 口径）对 base/supp 都未命中的 **5374 个 distinct 词**批量 `espeak-ng -v de --ipa` → `data/de_ipa_espeak.json`（纯 JSON，过滤纯数字 23 个，断点续跑 ~12min 后台）；`build_en_de.py` 查表升级为**三层 base→supplement→espeak**（冲突保留高层，复用既有剥 `[]` 逻辑）。
  - **产物**：`en-de.js` 重建，tokens **31045/31073 命中（69%→99.9%）**，0 方括号污染；屈折词现已有 IPA（geritten→ɡərˈɪtən / Tauben→tˈaʊbən / mitzunehmen→mˈɪttsuːnˌeːmən）。
  - **版本**：`en-de.js ?v=2→v3`（仅 `sentences.html` 载入），regen + 打包 dist（8.59MB）。
  - **验证**：`_test_en_de.py`（`.deu-ipa=332` 全有 IPA，此前 273/332 / Sec2 180 行 / 0 JS 错误）。
  - **部署**：GitHub Pages（push 即发）+ Cloudflare（`englishheft.pages.dev`）均 curl 实测 `?v=3` 上线；EdgeOne 依规则跳过。
- 2026-10-16（**场景句德文对照铺开至全部 17 大类（4941 句）**，commit `0f61c7d`）：
  - **背景**：试点 Section 1（179 句，`68cbe6b`）Jian 复核满意后拍板「继续全部译完并部署」，本条即终局落地。
  - **翻译管线（逐波）**：`_extract_work.js` 抽待译清单 → 按**英文原句**英→德 LLM 译（中/英冲突以英文为准，A1-A2 自然口语）→ 写 `data/tr_secN.json` → 校验（unique / 无空 / 与 work 1:1 / 与已有 0 冲突）→ 合并进 `data/de_translations.json` → 重跑 `build_en_de.py`。波次：sec13-15（730）→ sec16-17（429）。
  - **数据**：`de_translations.json` **3782→4941**（17 大类全齐：1=179/2=380/3=754/4=250/5=299/6=160/7=180/8=170/9=510/10=300/11=240/12=360/13=470/14=130/15=130/16=249/17=180）；重建 `en-de.js`（4941 句，**69% 逐词 IPA**，**0 方括号污染**）。
  - **`build_en_de.py` 增强**：输出统一「裸 IPA」（剥 w6000/espeak 来源词值首尾 `[]`，与 Section 1 已上线基线一致）；头部注释句数改为随数据动态。
  - **版本**：`gen_pages.py` 里 `english.js ?v=1→v=2`（**含 #101 的 4 处源数据修正**一并破缓存）、`en-de.js ?v=1→v=2`，regen 5 页 + `pack_en.py` 打包 `dist/`。
  - **`_test_en_de.py`**：Section 2 断言由「无德文数据」改为「已有德文数据」（全书已无缺数据 Section）。
  - **验证**：`_test_en_de.py`（Section 1 49 行 / Section 2 180 行 / 0 JS 错误）+ `_test_en_links.py`（32 断言 / 0 JS 错误）**全绿**。
  - **部署**：GitHub Pages（push `main` 即发，`jianwu-atlas.github.io/englishheft/`）+ Cloudflare（`englishheft.pages.dev`，wrangler 上传 26 文件）。**EdgeOne 依规则跳过**（已停用）。

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
