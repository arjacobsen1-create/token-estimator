"""test_workflows.py — golden tests for estimate_workflow().

Mirror of test/workflows.js, same three groups:
  1. LIVE PRICE TABLE — corrected prices, checked against the providers'
     published pages on 2026-11-08.
  2. HISTORICAL REGRESSION — the DESIGN-AGENTIC.md worked examples at the
     illustrative rates in force when the spec was written (frontier
     $5/$25, fast tier $1/$5), via price_overrides. Arithmetic regression
     cases, NOT current prices.
  3. LIVE WORKFLOWS — the same examples at the corrected live prices.

Run: python3 python/test_workflows.py
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from token_core import MODELS, estimate_workflow

passed = 0
failed = 0


def check(label, actual, expected, dp=3):
    global passed, failed
    if round(actual, dp) == round(expected, dp):
        passed += 1
    else:
        failed += 1
        print(f"FAIL {label}: got {actual}, expected {expected}")


def check_str(label, actual, expected):
    global passed, failed
    if actual == expected:
        passed += 1
    else:
        failed += 1
        print(f"FAIL {label}: got {actual!r}, expected {expected!r}")


def check_list(label, actual, expected):
    global passed, failed
    if list(actual) == list(expected):
        passed += 1
    else:
        failed += 1
        print(f"FAIL {label}: got {actual}, expected {expected}")


# --- 1. Live price table (checked 2026-11-08) ------------------------------
check("price GPT-6 Sol in", MODELS["gpt-6"]["inputPerMillion"], 2, 2)
check("price GPT-6 Sol out", MODELS["gpt-6"]["outputPerMillion"], 10, 2)
check_str("label GPT-6 Sol", MODELS["gpt-6"]["label"], "GPT-6 Sol (frontier)")
check("price Astra in", MODELS["gpt-6-astra"]["inputPerMillion"], 10, 2)
check("price Astra out", MODELS["gpt-6-astra"]["outputPerMillion"], 50, 2)
check("price Opus 5 in", MODELS["claude-opus-5"]["inputPerMillion"], 5, 2)
check("price Opus 5 out", MODELS["claude-opus-5"]["outputPerMillion"], 25, 2)
check("price Haiku 5.5 in", MODELS["claude-haiku-5-5"]["inputPerMillion"], 0.1, 2)
check("price Haiku 5.5 out", MODELS["claude-haiku-5-5"]["outputPerMillion"], 0.5, 2)
check("price Gemini in", MODELS["gemini-4-argon"]["inputPerMillion"], 4, 2)
check("price Gemini out", MODELS["gemini-4-argon"]["outputPerMillion"], 20, 2)
check("price Mercury in", MODELS["mercury-3"]["inputPerMillion"], 0.2, 2)
check("price Mercury out", MODELS["mercury-3"]["outputPerMillion"], 0.7, 2)
check_str(
    "Gemini note is dated",
    "dated" if re.search(r"1 Dec 2026", MODELS["gemini-4-argon"].get("priceNote", "")) else "undated",
    "dated",
)
check_str(
    "Haiku note states the tier",
    "tiered" if "100K" in MODELS["claude-haiku-5-5"].get("priceNote", "") else "flat",
    "tiered",
)

# --- 2. Historical regression (illustrative rates: $5/$25, $1/$5) ----------
HISTORICAL = {
    "gpt-6": {"inputPerMillion": 5.0, "outputPerMillion": 25.0},
    "claude-haiku-5-5": {"inputPerMillion": 1.0, "outputPerMillion": 5.0},
}

A = estimate_workflow("gpt-6", 6, 4000, 1500, 500, retry_rate=0.05, runs_per_day=200, price_overrides=HISTORICAL)
check("HIST A baseline", A["baseline"]["costPerRun"], 0.195)
check("HIST A full", A["modes"]["full"]["costPerRun"], 0.324)
check("HIST A windowed", A["modes"]["windowed"]["costPerRun"], 0.276)
check("HIST A summarised", A["modes"]["summarised"]["costPerRun"], 0.287)
check("HIST A summary calls", A["modes"]["summarised"]["summaryCostPerRun"], 0.046)
check("HIST A full premium", A["modes"]["full"]["premium"], 1.66, 2)
check("HIST A windowed premium", A["modes"]["windowed"]["premium"], 1.42, 2)
check("HIST A summarised premium", A["modes"]["summarised"]["premium"], 1.47, 2)
check("HIST A baseline monthly", A["baseline"]["costPerMonth"], 1170, 0)
check("HIST A full monthly", A["modes"]["full"]["costPerMonth"], 1942, 0)
check_list("HIST A full contextByStep", A["modes"]["full"]["contextByStep"], [4000, 5500, 7000, 8500, 10000, 11500])
check("HIST A full maxContext", A["modes"]["full"]["maxContext"], 11500, 0)

Ac = estimate_workflow("gpt-6", 6, 4000, 1500, 500, retry_rate=0.05, caching=True, price_overrides=HISTORICAL)
check("HIST A cached baseline", Ac["baseline"]["costPerRun"], 0.105)
check("HIST A cached full", Ac["modes"]["full"]["costPerRun"], 0.158)
check("HIST A cached full premium", Ac["modes"]["full"]["premium"], 1.50, 2)

Al = estimate_workflow("gpt-6", 6, 4000, 1500, 500, retry_rate=0.05, context_limit=10000, price_overrides=HISTORICAL)
check("HIST A limit: full exceeds", 1 if Al["modes"]["full"]["exceedsLimit"] else 0, 1, 0)
check("HIST A limit: windowed fits", 1 if Al["modes"]["windowed"]["exceedsLimit"] else 0, 0, 0)
check("HIST A limit: summarised fits", 1 if Al["modes"]["summarised"]["exceedsLimit"] else 0, 0, 0)

B = estimate_workflow("gpt-6", 12, 6000, 2500, 600, retry_rate=0.10, runs_per_day=200, price_overrides=HISTORICAL)
check("HIST B baseline", B["baseline"]["costPerRun"], 0.54)
check("HIST B full", B["modes"]["full"]["costPerRun"], 1.517)
check("HIST B windowed", B["modes"]["windowed"]["costPerRun"], 0.892)
check("HIST B summarised", B["modes"]["summarised"]["costPerRun"], 1.191)
check("HIST B summary calls", B["modes"]["summarised"]["summaryCostPerRun"], 0.316)
check("HIST B full premium", B["modes"]["full"]["premium"], 2.81, 2)
check("HIST B windowed premium", B["modes"]["windowed"]["premium"], 1.65, 2)
check("HIST B summarised premium", B["modes"]["summarised"]["premium"], 2.21, 2)
check("HIST B baseline monthly", B["baseline"]["costPerMonth"], 3240, 0)
check("HIST B full monthly", B["modes"]["full"]["costPerMonth"], 9100, 0)

Bc = estimate_workflow("gpt-6", 12, 6000, 2500, 600, retry_rate=0.10, caching=True, price_overrides=HISTORICAL)
check("HIST B cached baseline", Bc["baseline"]["costPerRun"], 0.243)
check("HIST B cached full", Bc["modes"]["full"]["costPerRun"], 0.499)
check("HIST B cached full premium", Bc["modes"]["full"]["premium"], 2.05, 2)

# --- 3. Live workflows (Sol $2/$10, Haiku $0.10/$0.50) ----------------------
LA = estimate_workflow("gpt-6", 6, 4000, 1500, 500, retry_rate=0.05, runs_per_day=200)
check("LIVE A baseline", LA["baseline"]["costPerRun"], 0.078)
check("LIVE A full", LA["modes"]["full"]["costPerRun"], 0.129)
check("LIVE A windowed", LA["modes"]["windowed"]["costPerRun"], 0.111)
check("LIVE A summarised", LA["modes"]["summarised"]["costPerRun"], 0.101)
check("LIVE A summary calls", LA["modes"]["summarised"]["summaryCostPerRun"], 0.005)
check("LIVE A full premium", LA["modes"]["full"]["premium"], 1.66, 2)
check("LIVE A windowed premium", LA["modes"]["windowed"]["premium"], 1.42, 2)
check("LIVE A summarised premium", LA["modes"]["summarised"]["premium"], 1.29, 2)
check("LIVE A baseline monthly", LA["baseline"]["costPerMonth"], 468, 0)
check("LIVE A full monthly", LA["modes"]["full"]["costPerMonth"], 777, 0)

LB = estimate_workflow("gpt-6", 12, 6000, 2500, 600, retry_rate=0.10, runs_per_day=200)
check("LIVE B baseline", LB["baseline"]["costPerRun"], 0.216)
check("LIVE B full", LB["modes"]["full"]["costPerRun"], 0.607)
check("LIVE B windowed", LB["modes"]["windowed"]["costPerRun"], 0.357)
check("LIVE B summarised", LB["modes"]["summarised"]["costPerRun"], 0.382)
check("LIVE B summary calls", LB["modes"]["summarised"]["summaryCostPerRun"], 0.032)
check("LIVE B full premium", LB["modes"]["full"]["premium"], 2.81, 2)
check("LIVE B windowed premium", LB["modes"]["windowed"]["premium"], 1.65, 2)
check("LIVE B summarised premium", LB["modes"]["summarised"]["premium"], 1.77, 2)
check("LIVE B baseline monthly", LB["baseline"]["costPerMonth"], 1296, 0)
check("LIVE B full monthly", LB["modes"]["full"]["costPerMonth"], 3640, 0)

LAc = estimate_workflow("gpt-6", 6, 4000, 1500, 500, retry_rate=0.05, caching=True)
check("LIVE A cached baseline", LAc["baseline"]["costPerRun"], 0.042)
check("LIVE A cached full", LAc["modes"]["full"]["costPerRun"], 0.063)
check("LIVE A cached full premium", LAc["modes"]["full"]["premium"], 1.50, 2)

LBc = estimate_workflow("gpt-6", 12, 6000, 2500, 600, retry_rate=0.10, caching=True)
check("LIVE B cached baseline", LBc["baseline"]["costPerRun"], 0.097)
check("LIVE B cached full", LBc["modes"]["full"]["costPerRun"], 0.200)
check("LIVE B cached full premium", LBc["modes"]["full"]["premium"], 2.05, 2)

print(f"workflows (python): {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
