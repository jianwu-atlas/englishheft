#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_en_ipa_espeak.py — 为英语站德文对照「未命中词典的屈折/派生词」批量用 espeak-ng 生成近似 IPA。

背景：build_en_de.py 的逐词 IPA 只查 base（de_ipa_dict，1249 权威）+ supplement（de_ipa_supplement，
6035 w6000 源），命中 ~69%。缺口几乎全是屈折/派生形式（变位 geht/wurde、复数 Tauben、过去分词
gegangen…）——词典只收词干/原形，命中不了变体。本脚本对「base+supp 都未命中的 distinct 词干」
跑 espeak-ng（德语 G2P，对屈折形式也能出近似 IPA），产出第三层兜底词典。

输入（均在 data/）：de_translations.json + de_ipa_dict.json(base) + de_ipa_supplement.json(supp)
输出：data/de_ipa_espeak.json   { "<stem>": "[ipa]" }   （键与 build_en_de.stem() 口径一致，值带 [..] 由 build_en_de 剥）

过滤规则（IPA 对这类 token 意义不大 / espeak 会拼成德语读法过长）：
  - 长度 < 2
  - 不含任何字母（纯数字/符号，如 1952、8:30、%）
  其余（含字母的德语词、混合格如 24-karat）保留，espeak 出近似 IPA。

用法：
  python3 scripts/build_en_ipa_espeak.py --dry    # 只统计 missing / 过滤 / 待生成，不调 espeak
  python3 scripts/build_en_ipa_espeak.py          # 全量生成（建议后台跑；断点续跑，进度存 data/en_ipa_espeak_progress.json）
"""
import json
import os
import re
import sys
import subprocess
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from build_en_de import stem, norm_key, TR_PATH, IPA_PATH, SUPP_PATH  # noqa: E402

ESPEAK = "/opt/homebrew/bin/espeak-ng"
OUT_PATH = os.path.join(ROOT, "data", "de_ipa_espeak.json")
PROG_PATH = os.path.join(ROOT, "data", "en_ipa_espeak_progress.json")
WORKERS = int(os.environ.get("WORKERS", "8"))


def compute_missing():
    """复用 build_en_de 的分词/stem/查表口径，返回 (missing_stems, stats)。"""
    tr = json.load(open(TR_PATH, encoding="utf-8"))
    base = {norm_key(k): v for k, v in json.load(open(IPA_PATH, encoding="utf-8")).items()}
    supp_raw = {}
    if os.path.exists(SUPP_PATH):
        supp_raw = json.load(open(SUPP_PATH, encoding="utf-8"))
    supp = {norm_key(k): v for k, v in supp_raw.items()}
    merged = {**supp, **base}  # 与 build_en_de 一致（base 优先）

    missing = set()
    for de in tr.values():
        for tok in de.split():
            s = stem(tok)
            if s and s not in merged:
                missing.add(s)
    return missing, {"tr_sents": len(tr), "base": len(base), "supp": len(supp)}


def keep(s: str) -> bool:
    """过滤：只保留「有意义、适合 espeak 的德语词」。"""
    if len(s) < 2:
        return False
    if not any(c.isalpha() for c in s):
        return False
    return True


def gen_ipa(word):
    if not word:
        return (word, "")
    try:
        r = subprocess.run([ESPEAK, "-v", "de", "--ipa", word],
                           capture_output=True, text=True, timeout=10)
        out = re.sub(r"\([^)]*\)", "", (r.stdout or ""))   # 去 (en)/(de) 语音标签
        out = re.sub(r"\s+", " ", out).strip()
        return (word, ("[" + out + "]" if out else ""))
    except Exception:
        return (word, "")


def dry():
    missing, st = compute_missing()
    todo = sorted(s for s in missing if keep(s))
    skipped = sorted(s for s in missing if not keep(s))
    print(f"[dry] tr_sents={st['tr_sents']} base={st['base']} supp={st['supp']}")
    print(f"[dry] distinct_missing={len(missing)}  ->  待 espeak={len(todo)}  过滤跳过={len(skipped)}")
    print(f"[dry] 跳过样例: {', '.join(skipped[:40])}")
    print(f"[dry] 待生成样例: {', '.join(todo[:40])}")


def main():
    if "--dry" in sys.argv:
        dry()
        return
    if not os.path.exists(ESPEAK):
        print(f"ESPEAK not found: {ESPEAK}", file=sys.stderr); sys.exit(1)
    missing, _ = compute_missing()
    todo = sorted(s for s in missing if keep(s))

    prog = {}
    if os.path.exists(PROG_PATH):
        prog = json.load(open(PROG_PATH, encoding="utf-8"))
    # 断点续跑：逐个 chunk 处理，直到全部完成（一次后台运行跑完）
    while True:
        remaining = [w for w in todo if w not in prog]
        if not remaining:
            break
        batch = remaining  # 单次跑完剩余（后台运行无 100s 看门狗）
        print(f"todo={len(todo)}  done={len(todo) - len(remaining)}  this_batch={len(batch)}  workers={WORKERS}")
        for i, (w, ipa) in enumerate(ThreadPoolExecutor(max_workers=WORKERS).map(gen_ipa, batch), 1):
            prog[w] = ipa  # 空值也记录，避免反复重试 espeak 失败词
            if i % 50 == 0:
                json.dump(prog, open(PROG_PATH, "w", encoding="utf-8"), ensure_ascii=False)
                print(f"  {i}/{len(batch)} (saved)")
        json.dump(prog, open(PROG_PATH, "w", encoding="utf-8"), ensure_ascii=False)

    ordered = {w: prog[w] for w in todo if w in prog and prog[w]}
    # 纯 JSON（无注释头，与 de_ipa_dict / de_ipa_supplement 口径一致，build_en_de.py 直接 json.load）
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(json.dumps(ordered, ensure_ascii=False))
    print(f"WROTE {os.path.relpath(OUT_PATH, ROOT)}  entries={len(ordered)} (non-empty)")
    for w in todo[:15]:
        if w in prog:
            print(f"  {w} → {prog[w]}")


if __name__ == "__main__":
    main()
