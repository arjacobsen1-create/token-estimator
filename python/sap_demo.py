"""sap_demo.py — the SAP & Transformation edition, Python edition:
    python3 python/sap_demo.py
Every SAP task, estimated on two models at a working volume."""

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from domain_sap import SAP_TASKS, estimate_sap_task

RUNS = 10
print(f"SAP & TRANSFORMATION EDITION — {len(SAP_TASKS)} tasks, {RUNS} runs/day each\n")
print("ID".ljust(8) + "Task".ljust(46) + "GPT-6 $/mo".rjust(12) + "Haiku 5.5 $/mo".rjust(16))
for t in SAP_TASKS:
    g = estimate_sap_task(t["id"], "gpt-6", RUNS)["estimate"]
    h = estimate_sap_task(t["id"], "claude-haiku-5-5", RUNS)["estimate"]
    print(
        t["id"].ljust(8)
        + t["name"][:44].ljust(46)
        + ("$" + format(g["costPerMonth"], ".2f")).rjust(12)
        + ("$" + format(h["costPerMonth"], ".2f")).rjust(16)
    )
print("\nSame work, same quality bar: the model choice is a budget decision.")
