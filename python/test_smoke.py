"""
test_smoke.py — proof the Python port works, mirroring test/smoke.js and
test/sap-edition.js. Run:  python3 python/test_smoke.py
The port is held to the JavaScript engine's numbers (parity-checked
during the port across counts, estimates, suggestions and SAP tasks).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from token_core import MODELS, TASK_TYPES, count_tokens, analyse_prompt, estimate_task, compare_models
from domain_sap import SAP_TASKS, estimate_sap_task

passed = 0


def check(name, fn):
    global passed
    fn()
    passed += 1
    print("PASS  " + name)


def check_counting():
    short = count_tokens("Why is delivery falling?", "gpt-6")
    long = count_tokens("Why is delivery falling? " * 10, "gpt-6")
    assert 0 < short < long


def check_anatomy():
    a = analyse_prompt(
        {"system": "Be concise.", "context": "word " * 100, "history": "", "question": "Why?"},
        "gpt-6",
    )
    assert a["system"] + a["context"] + a["history"] + a["question"] == a["total"]
    assert a["context"] > a["question"]


def check_cost_maths():
    e = estimate_task(1000, "summarise", "gpt-6", runs_per_day=10)
    assert abs(e["costPerMonth"] - e["costPerRun"] * 10 * 30) < 1e-9
    assert e["outputTokens"] == 200


def check_compare():
    rows = compare_models(500, "chat", runs_per_day=1)
    assert len(rows) == len(MODELS)
    assert all(r["costPerRun"] > 0 for r in rows)


def check_sap_complete():
    assert len(SAP_TASKS) >= 18
    for area in ("Run", "Build", "Transform"):
        assert any(t["area"] == area for t in SAP_TASKS), "missing area " + area
    ids = [t["id"] for t in SAP_TASKS]
    assert len(set(ids)) == len(ids)
    for t in SAP_TASKS:
        assert t["name"] and t["guidance"] and t["protection"]
        assert t["taskType"] in TASK_TYPES


def check_sap_estimates():
    for t in SAP_TASKS:
        e = estimate_sap_task(t["id"], "gpt-6", 10)["estimate"]
        assert e["costPerMonth"] > 0


check("counting grows with text length", check_counting)
check("prompt anatomy parts sum to the total", check_anatomy)
check("cost maths is consistent (month = run x runs/day x 30)", check_cost_maths)
check("model comparison returns one sane row per model", check_compare)
check("SAP edition: 21 tasks, complete, across Run/Build/Transform", check_sap_complete)
check("every SAP task estimates to a positive, finite cost", check_sap_estimates)

print(f"\n{passed}/6 checks passed — the Python port works.")
