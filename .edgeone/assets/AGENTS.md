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

- 2026-10-15：建站。蒸馏《15000 英语单词口袋书》→ 17 Section / 61 Part / 493 场景 / **7052 词条** / **4941 场景句** / **1272 条句子解析** / **51 个音素**；5 个页面 + PWA（离线可用）；Playwright 21 项断言全过。
