#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""build_en_site.py · 蒸馏《15000英语单词口袋书》→ 英语站数据

产出：assets/js/data/english.js → const ENGLISH
  sections[] → parts[] → scenes[]
    scene.words     = [{ zh, en, ipa, pos }]
    scene.sentences = [{ en, zh, notes:[{k, t}] }]   k ∈ ●/★/■
  intros    = [{ no, zh, text }]      17 个 Section 导语（据目录与词汇量生成）
  phonetics = { vowels:[], consonants:[] }  从全书 7052 条音标反推的音素表

数据源：~/.workbuddy/wiki-knowledge-en/raw/en15000-ocr.txt（PDF 文本层，1370 页）
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

RAW = Path.home() / ".workbuddy/wiki-knowledge-en/raw/en15000-ocr.txt"
PDF = Path("/Users/Jack/Library/CloudStorage/OneDrive-Personal/01_个人_Personal/2_书籍_Books/"
           "15000英语单词口袋书-最重要.pdf")
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/js/data/english.js"

PAGE_RE = re.compile(r"^=+\s*PAGE\s*\d+\s*/\s*\d+\s*=+$")
CJK = r"\u4e00-\u9fff"
CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"
WORD_RE = re.compile(
    rf"^[{CIRCLED}]\s*(?P<zh>[{CJK}、，/（）()·]+)\s+"
    r"(?P<en>[A-Za-z][A-Za-z .'\-]*?)\s*"
    r"\[(?P<ipa>[^\]]+)\]\s*"
    r"(?P<pos>[a-z]+\.)"
)
SCENE_RE = re.compile(rf"^(?P<no>\d+\.\d+\.\d+)\s*(?P<zh>[{CJK}][{CJK}（）()、·0-9\s]*)$")
SENT_ZH_RE = re.compile(rf"^(?P<n>\d+)\s*[．.]\s*(?P<zh>[{CJK}].*)$")
NOTE_RE = re.compile(r"^\s*([●★■])\s*(.+)$")
SEC_RE = re.compile(r"^Section\s*(\d+)\s*(.+)$")
PART_RE = re.compile(r"^Part\s*(\d+)\s*(.+)$")
TOPCNT_RE = re.compile(r"Top10")

# ---------- 英语 IPA 音素表（按书中用法整理；贪婪匹配取最长） ----------
IPA_VOWELS = ["iː", "ɪ", "e", "æ", "ɑː", "ɒ", "ɔː", "ʊ", "uː", "ʌ", "ɜː", "ə",
              "eɪ", "aɪ", "ɔɪ", "əʊ", "aʊ", "ɪə", "eə", "ʊə", "ɑɪ", "ɑu", "ɔi",
              "au", "əu", "ɛ", "ɔ", "ɑ", "i", "u", "ɐ", "ɚ", "ɝ", "ei", "ou", "ai"]
IPA_CONS = ["tʃ", "dʒ", "p", "b", "t", "d", "k", "g", "f", "v", "θ", "ð", "s", "z",
            "ʃ", "ʒ", "h", "m", "n", "ŋ", "l", "r", "j", "w", "ɹ", "ts", "dz"]
IPA_ORDER = sorted(IPA_VOWELS + IPA_CONS, key=len, reverse=True)
VOWEL_SET = set(IPA_VOWELS)
VOWEL_ZH = {"iː": "长元音 i（see）", "ɪ": "短元音 i（sit）", "e": "短元音 e（bed）",
            "æ": "梅花音 æ（cat）", "ɑː": "长元音 a（car）", "ɒ": "短元音 o（hot）",
            "ɔː": "长元音 o（door）", "ʊ": "短元音 u（book）", "uː": "长元音 u（food）",
            "ʌ": "短元音 a（cup）", "ɜː": "长元音 er（bird）", "ə": "弱读央元音（about）",
            "eɪ": "双元音（day）", "aɪ": "双元音（my）", "ɔɪ": "双元音（boy）",
            "əʊ": "双元音（go）", "aʊ": "双元音（now）", "ɪə": "双元音（near）",
            "eə": "双元音（hair）", "ʊə": "双元音（tour）"}
CONS_ZH = {"p": "清辅音 p", "b": "浊辅音 b", "t": "清辅音 t", "d": "浊辅音 d",
           "k": "清辅音 k", "g": "浊辅音 g", "f": "清辅音 f", "v": "浊辅音 v",
           "θ": "清辅音 th（think）", "ð": "浊辅音 th（this）", "s": "清辅音 s",
           "z": "浊辅音 z", "ʃ": "清辅音 sh（she）", "ʒ": "浊辅音（vision）",
           "h": "清辅音 h", "tʃ": "清辅音 ch（chair）", "dʒ": "浊辅音 j（job）",
           "m": "鼻音 m", "n": "鼻音 n", "ŋ": "鼻音 ng（sing）", "l": "边音 l",
           "r": "近音 r", "j": "半元音 y（yes）", "w": "半元音 w（we）"}


def unspace(s: str) -> str:
    s = re.sub(r"\s*([（）])\s*", r"\1", s)
    s = re.sub(rf"(?<=[{CJK}])\s+(?=[{CJK}])", "", s)
    s = re.sub(rf"(?<=[{CJK}、，。])\s+(?=[{CJK}])", "", s)
    return re.sub(r"\s{2,}", " ", s).strip()


def tokenize_ipa(ipa: str) -> list[str]:
    """把音标串切成音素（贪婪最长匹配，忽略重音/连字符/空格）"""
    s = re.sub(r"[ˈˌ\s\-·.()（）]", "", ipa)
    out, i = [], 0
    while i < len(s):
        for sym in IPA_ORDER:
            if s.startswith(sym, i):
                out.append(sym)
                i += len(sym)
                break
        else:
            i += 1
    return out


def load_toc() -> tuple[dict[str, str], dict[str, str]]:
    import pypdf
    r = pypdf.PdfReader(str(PDF))
    secs: dict[str, str] = {}
    parts: dict[str, str] = {}
    cur = ""
    for i in range(6, 30):
        if i >= len(r.pages):
            break
        for line in (r.pages[i].extract_text() or "").split("\n"):
            s = unspace(line)
            m = SEC_RE.match(s)
            if m:
                cur = m.group(1)
                secs.setdefault(cur, m.group(2).strip())
                continue
            m = PART_RE.match(s)
            if m and cur:
                parts.setdefault(f"{cur}.{m.group(1)}", m.group(2).strip())
    return secs, parts


def main() -> int:
    if not RAW.exists():
        sys.exit(f"❌ 缺少全文 {RAW}")
    lines = RAW.read_text(encoding="utf-8", errors="ignore").split("\n")
    toc_secs, toc_parts = load_toc()

    marks = []
    for i, l in enumerate(lines):
        s = unspace(l)
        m = SCENE_RE.match(s)
        if m and "场景" not in s:
            marks.append((i, m.group("no"), m.group("zh").strip()))
    marks.append((len(lines), "", ""))

    scenes, ipa_words = [], defaultdict(list)
    for k in range(len(marks) - 1):
        a, no, zh = marks[k]
        blk = lines[a + 1:marks[k + 1][0]]
        words, sentences = [], []
        for l in blk:
            if PAGE_RE.match(l.strip()):
                continue
            m = WORD_RE.match(l.strip())
            if m:
                w = {"zh": unspace(m.group("zh")), "en": m.group("en").strip(),
                     "ipa": m.group("ipa").strip(), "pos": m.group("pos")}
                words.append(w)
                for t in tokenize_ipa(w["ipa"]):
                    ipa_words[t].append(w["en"])
        # 场景句 + 解析（●★■ 附到前一句）
        ti = next((i for i, l in enumerate(blk) if TOPCNT_RE.search(l)), None)
        if ti is not None:
            i, cur_s = ti + 1, None
            while i < len(blk):
                t = blk[i].strip()
                if PAGE_RE.match(t):
                    i += 1
                    continue
                mn = NOTE_RE.match(unspace(t))
                if mn and cur_s is not None:
                    cur_s["notes"].append({"k": mn.group(1), "t": mn.group(2).strip()})
                    i += 1
                    continue
                mz = SENT_ZH_RE.match(unspace(t))
                if mz:
                    if cur_s and cur_s["en"]:
                        sentences.append(cur_s)
                    cur_s = {"zh": mz.group("zh").strip(), "en": "", "notes": []}
                    i += 1
                    continue
                if cur_s is not None and not cur_s["en"] and re.match(r"^[A-Za-z]", t):
                    en, j = "", i
                    while j < len(blk) and len(en) < 240:
                        tj = blk[j].strip()
                        if (not tj or PAGE_RE.match(tj) or SENT_ZH_RE.match(unspace(tj))
                                or NOTE_RE.match(unspace(tj))):
                            break
                        if re.match(r"^[A-Za-z]", tj):
                            en = (en + " " + tj).strip()
                        elif en:
                            break
                        j += 1
                    cur_s["en"] = en
                    i = j
                    continue
                i += 1
            if cur_s and cur_s["en"]:
                sentences.append(cur_s)
        if words or sentences:
            scenes.append({"no": no, "zh": zh, "words": words, "sentences": sentences})

    # 三层组装
    sec_map: dict[str, dict] = {}
    for sc in scenes:
        p3 = sc["no"].split(".")
        sno, pno = p3[0], f"{p3[0]}.{p3[1]}"
        sec = sec_map.setdefault(sno, {"no": sno, "zh": toc_secs.get(sno, f"Section {sno}"), "parts": {}})
        sec["parts"].setdefault(pno, {"no": pno, "zh": toc_parts.get(pno, f"Part {p3[1]}"), "scenes": []})
        sec["parts"][pno]["scenes"].append(sc)
    sections = []
    for sno in sorted(sec_map, key=int):
        s = sec_map[sno]
        parts = [s["parts"][p] for p in sorted(s["parts"], key=lambda x: int(x.split(".")[1]))]
        sections.append({"no": sno, "zh": s["zh"], "parts": parts})

    # Section 导语（据目录与词汇量生成；书中无此内容，故明确标注来源）
    intros = []
    for s in sections:
        nsc = sum(len(p["scenes"]) for p in s["parts"])
        nw = sum(len(sc["words"]) for p in s["parts"] for sc in p["scenes"])
        ns = sum(len(sc["sentences"]) for p in s["parts"] for sc in p["scenes"])
        partnames = "、".join(p["zh"] for p in s["parts"][:6])
        intros.append({
            "no": s["no"], "zh": s["zh"],
            "text": f"本大类覆盖 {len(s['parts'])} 个 Part（{partnames}），"
                    f"共 {nsc} 个场景、{nw} 个词条、{ns} 个场景句。"
                    f"建议按 Part 顺序推进，每场景先过词汇三行（英文 / 音标 / 中文），"
                    f"再用 Top10 场景句做输出练习。",
            "src": "generated",
        })

    # 音素表（从全书音标反推）
    def build(symbols, zhmap):
        out = []
        for sym in symbols:
            ex = ipa_words.get(sym, [])
            if not ex:
                continue
            top = [w for w, _ in Counter(ex).most_common(4)]
            out.append({"ipa": sym, "zh": zhmap.get(sym, ""), "n": len(ex), "examples": top})
        return sorted(out, key=lambda x: -x["n"])
    phonetics = {"vowels": build(IPA_VOWELS, VOWEL_ZH), "consonants": build(IPA_CONS, CONS_ZH)}

    payload = {
        "meta": {"id": "en15000", "zh": "15000英语单词口袋书",
                 "en": "15000 English Words Pocket Book", "extra": True,
                 "note": "课外教材；词汇不计入生词表"},
        "sections": sections,
        "intros": intros,
        "phonetics": phonetics,
    }
    OUT.write_text(
        "/* eslint-disable */\n"
        "// 由 englishheft/scripts/build_en_site.py 自动生成，请勿手改\n"
        "const ENGLISH = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")

    nw = sum(len(sc["words"]) for s in sections for p in s["parts"] for sc in p["scenes"])
    ns = sum(len(sc["sentences"]) for s in sections for p in s["parts"] for sc in p["scenes"])
    nn = sum(len(x["notes"]) for s in sections for p in s["parts"] for sc in p["scenes"] for x in sc["sentences"])
    nsc = sum(len(p["scenes"]) for s in sections for p in s["parts"])
    print(f"[✓] 已生成 {OUT.relative_to(ROOT)}（{OUT.stat().st_size // 1024} KB）")
    print(f"    Section {len(sections)} | Part {sum(len(s['parts']) for s in sections)} | 场景 {nsc}")
    print(f"    词条 {nw} | 场景句 {ns} | 句子解析 {nn}")
    print(f"    音素：元音 {len(phonetics['vowels'])} 个 · 辅音 {len(phonetics['consonants'])} 个")
    print(f"    Section 导语 {len(intros)} 条（据目录与词汇量生成）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
