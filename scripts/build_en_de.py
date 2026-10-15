#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_en_de.py — 生成英语站场景句「德文对照 + 逐词 IPA」数据文件。

输入（均在 data/ 目录，手维护 / 已校验）：
  data/de_translations.json  { "<场景号:idx>": "<德文句子>", ... }   （英→德 LLM 翻译）
  data/de_ipa_dict.json      { "<德文词>": "<IPA>", ... }            （德语站词级 IPA 快照）

输出：
  assets/js/data/en-de.js    const EN_DE = { "<key>": {de, ipa:[...]}, ... }

逐词 IPA 规则：
  - 德文句子按空白分词（与前端 de.split(/\\s+/) 完全一致，保证对齐）。
  - 每词取「词干」用于查 IPA：去首尾标点 → 小写 → ß→ss。
  - 命中词典 → 该词 IPA；未命中 → 空串 ""（Jian 拍板「仅示意」，空缺可接受）。

仅试点 Section 1（179 句）。铺开到其它 Section 时，先补 de_translations.json，再重跑本脚本。
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

TR_PATH = os.path.join(ROOT, "data", "de_translations.json")
IPA_PATH = os.path.join(ROOT, "data", "de_ipa_dict.json")
OUT_PATH = os.path.join(ROOT, "assets", "js", "data", "en-de.js")


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
    # 统一小写键（本词典已无大小写冲突，见校验）
    ipa = {k.lower(): v for k, v in ipa_raw.items()}

    result = {}
    total_tokens = 0
    covered = 0
    missing = set()

    for key, de in tr.items():
        tokens = de.split()
        ipa_list = []
        for tok in tokens:
            s = stem(tok)
            hit = ipa.get(s, "") if s else ""
            if hit:
                covered += 1
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
        f.write("// 英语站场景句「德文对照 + 逐词 IPA」。当前试点：Section 1（179 句）。\n")
        f.write("// ipa[] 与 de.split(/\\s+/) 逐词对齐；空串 = 该词未映射 IPA（仅示意）。\n")
        f.write(f"const EN_DE = {payload};\n")

    print(f"wrote {os.path.relpath(OUT_PATH, ROOT)}")
    print(f"sents={len(ordered)}  tokens={total_tokens}  ipa_covered={covered} ({100*covered//max(total_tokens,1)}%)")
    print(f"distinct_missing_words={len(missing)}")
    if missing:
        print("missing sample:", ", ".join(sorted(missing)[:40]))


if __name__ == "__main__":
    main()
