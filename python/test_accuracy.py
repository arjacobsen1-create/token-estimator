"""
test_accuracy.py — the honesty test, Python side.
Run:  python3 python/test_accuracy.py   (needs: pip install tiktoken)

Counts the golden set (../test/golden.json) with the heuristic and with
the real o200k_base tokenizer (via tiktoken), prints the error, then
wires the exact counter in and verifies the engine's counts match the
tokenizer on every text. Claude's ground truth (measured through the
Anthropic API) is recorded in ../ACCURACY.md.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import tiktoken
except ImportError:
    print("tiktoken is not installed. Run:  pip install tiktoken")
    sys.exit(2)

import token_core as core

enc = tiktoken.get_encoding("o200k_base")
golden_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "test", "golden.json")
golden = json.load(open(golden_path))

print("id".ljust(5) + "kind".ljust(19) + "heuristic".rjust(10) + "o200k".rjust(7) + "error".rjust(7))
worst = 0
for g in golden:
    h = core.count_tokens_heuristic(g["text"], "gpt-6")
    o = len(enc.encode(g["text"]))
    err = round((h - o) / o * 100)
    worst = max(worst, abs(err))
    print(g["id"].ljust(5) + g["kind"].ljust(19) + str(h).rjust(10) + str(o).rjust(7) + (("+" if err >= 0 else "") + str(err) + "%").rjust(7))
print(f"\nWorst heuristic error on the golden set: {worst}%.")

core.set_exact_counter(lambda text: len(enc.encode(text)))
for g in golden:
    assert core.count_tokens(g["text"], "gpt-6") == len(enc.encode(g["text"])), g["id"]
    assert core.counting_method("gpt-6") == "exact"
print("Exact path verified: wired-in counts match o200k_base on all 10 texts.")
