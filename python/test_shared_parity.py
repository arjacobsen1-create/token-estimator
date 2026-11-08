"""test_shared_parity.py — mirror of test/shared-parity.js.

Fails if the shared price table copies differ across repos (when the
sibling repo is present), if either Python port's MODELS differs from
shared_models, or if the two ports count the same text differently.
Run: python3 python/test_shared_parity.py
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import shared_models
import token_core

passed = 0


def check(name, fn):
    global passed
    fn()
    passed += 1
    print("PASS  " + name)


check("estimator port prices from the shared table",
      lambda: (_ for _ in ()).throw(AssertionError()) if token_core.MODELS != shared_models.MODELS else None)

MIN_DIR = os.path.join(HERE, "..", "..", "token-minimiser-app", "python")
MIN_CORE = os.path.join(MIN_DIR, "minimiser_core.py")
MIN_SHARED = os.path.join(MIN_DIR, "shared_models.py")

if os.path.exists(MIN_CORE):
    sys.path.insert(0, MIN_DIR)
    import minimiser_core

    def _min_models():
        assert minimiser_core.MODELS == shared_models.MODELS
    check("minimiser port prices from the shared table", _min_models)

    def _counts():
        samples = [
            "Why is delivery falling?",
            "Please summarise the attached quarterly report and draft a reply to the supplier.",
            "const x = {a: 1, b: [1,2,3]}; function f() { return JSON.stringify(x); }",
            "12345 67890 24680 13579 99999 11111 22222 33333",
            "",
        ]
        for model_id in shared_models.MODELS:
            for text in samples:
                assert token_core.count_tokens(text, model_id) == minimiser_core.count_tokens(text, model_id), (model_id, text[:24])
    check("both ports count identically", _counts)
else:
    print("SKIP  minimiser repo not present on this machine")

if os.path.exists(MIN_SHARED):
    def _bytes():
        with open(os.path.join(HERE, "shared_models.py"), "rb") as f:
            a = f.read()
        with open(MIN_SHARED, "rb") as f:
            b = f.read()
        assert a == b, "shared_models.py differs between repos — edit the canonical copy and re-sync"
    check("shared_models.py copies are byte-identical across repos", _bytes)

print(f"\n{passed} checks passed — one price table, one counter, both ports.")
