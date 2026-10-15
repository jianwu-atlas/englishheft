#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_en_de.py — 生成英语站场景句「德文对照 + 逐词 IPA」数据文件。

输入（均在 data/ 目录，手维护 / 已校验）：
  data/de_translations.json     { "<场景号:idx>": "<德文句子>", ... }   （英→德 LLM 翻译）
  data/de_ipa_dict.json         { "<德文词>": "<IPA>", ... }            （德语站词级 IPA 快照，权威源）
  data/de_ipa_supplement.json   { "<德文词>": "<IPA>", ... }            （可选：高频功能词/变位补全，填充快照缺口）

输出：
  assets/js/data/en-de.js    const EN_DE = { "<key>": {de, ipa:[...]}, ... }

逐词 IPA 规则：
  - 德文句子按空白分词（与前端 de.split(/\\s+/) 完全一致，保证对齐）。
  - 每词取「词干」用于查 IPA：去首尾标点 → 小写 → ß→ss。
  - 词典合并：base 与 supplement 的键都按同一规则（小写 + ß→ss）归一化，
    **base 优先**（冲突时保留快照值），supplement 只填补 base 没有的词。
  - 命中词典 → 该词 IPA；未命中 → 空串 ""（Jian 拍板「仅示意」，空缺可接受）。

数据随 de_translations.json 增长：每补一个 Section 的英→德翻译，再重跑本脚本即可。
IPA 统一输出「裸」风格（base 快照无括号；w6000/espeak 来源的括号值会被剥掉）。
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

TR_PATH = os.path.join(ROOT, "data", "de_translations.json")
IPA_PATH = os.path.join(ROOT, "data", "de_ipa_dict.json")
SUPP_PATH = os.path.join(ROOT, "data", "de_ipa_supplement.json")
OUT_PATH = os.path.join(ROOT, "assets", "js", "data", "en-de.js")


def norm_key(k: str) -> str:
    """词典键归一化（与词干查找口径一致）：去首尾空白 → 小写 → ß→ss。"""
    return k.strip().lower().replace("ß", "ss")


def stem(token: str) -> str:
    """取词干用于 IPA 查找：去掉首尾标点，保留字母核心（含变音符/数字）→ 小写 → ß→ss。"""
    t = token.strip()
    i = 0
    while i < len(t) and not t[i].isalnum():
        i += 1
    j = len(t)
    while j > i and not t[j - 1].isalnum():
        j -= 1
    return t[i:j].lower().replace("ß", "ss")


def main():
    tr = json.load(open(TR_PATH, encoding="utf-8"))
    ipa_raw = json.load(open(IPA_PATH, encoding="utf-8"))
    supp_raw = {}
    if os.path.exists(SUPP_PATH):
        supp_raw = json.load(open(SUPP_PATH, encoding="utf-8"))

    base = {norm_key(k): v for k, v in ipa_raw.items()}
    supp = {norm_key(k): v for k, v in supp_raw.items()}
    conflicts = sorted(k for k in supp if k in base and base[k] != supp[k])
    # base 优先（冲突保留快照值），supplement 只填补缺口
    ipa = {**supp, **base}

    result = {}
    total_tokens = 0
    covered = 0
    missing = set()
    used_supp = set()

    for key, de in tr.items():
        tokens = de.split()
        ipa_list = []
        for tok in tokens:
            s = stem(tok)
            hit = ipa.get(s, "") if s else ""
            # 统一为「裸 IPA」风格（与 base 快照 / Section 1 已上线基线一致）：
            # 去掉 w6000/espeak 来源词值首尾的方括号 [..]。
            if hit:
                hit = hit.strip()
                if hit.startswith("[") and hit.endswith("]"):
                    hit = hit[1:-1].strip()
            if hit:
                covered += 1
                if s in supp and s not in base:
                    used_supp.add(s)
            else:
                if s:
                    missing.add(s)
                # 纯标点 token 不算缺失
            ipa_list.append(hit)
        total_tokens += len(tokens)
        result[key] = {"de": de, "ipa": ipa_list}

    # 按场景号自然排序输出，便于阅读
    def sort_key(k):
        scen, idx = k.rsplit(":", 1)
        parts = [int(x) for x in scen.split(".")]
        return (parts, int(idx))

    ordered = {k: result[k] for k in sorted(result.keys(), key=sort_key)}

    payload = json.dumps(ordered, ensure_ascii=False)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("// en-de.js — 由 scripts/build_en_de.py 生成，勿手改。\n")
        f.write(f"// 英语站场景句「德文对照 + 逐词 IPA」。当前：{len(ordered)} 句（随 de_translations.json 增长）。\n")
        f.write("// ipa[] 与 de.split(/\\s+/) 逐词对齐，统一裸 IPA；空串 = 该词未映射 IPA（仅示意）。\n")
        f.write(f"const EN_DE = {payload};\n")

    print(f"wrote {os.path.relpath(OUT_PATH, ROOT)}")
    print(f"sents={len(ordered)}  tokens={total_tokens}  ipa_covered={covered} ({100*covered//max(total_tokens,1)}%)")
    print(f"dict: base={len(base)}  supplement={len(supp)}  merged={len(ipa)}  conflicts(base-wins)={len(conflicts)}")
    if conflicts:
        print("  conflicts:", ", ".join(conflicts))
    print(f"supplement words actually used={len(used_supp)}", sorted(used_supp)[:12])
    print(f"distinct_missing_words={len(missing)}")
    if missing:
        print("missing sample:", ", ".join(sorted(missing)[:40]))


if __name__ == "__main__":
    main()
