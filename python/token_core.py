"""
token_core.py — the Python port of the Token Estimator engine.

Same engine, second language: the JavaScript version (src/token-core.js)
powers the live web demo; this port gives identical answers for people
who work in Python. A parity check (python/test_smoke.py) holds the two
to the same numbers.

Functions mirror the JS names in snake_case:
  countTokens -> count_tokens, analysePrompt -> analyse_prompt,
  estimateTask -> estimate_task, compareModels -> compare_models.
"""

import math

# JS Math.round rounds halves up; Python's round() is banker's rounding.
# Use this everywhere the JS engine rounds, or the ports drift by one.
def _round(x):
    return math.floor(x + 0.5)


# Prices checked 2026-11-08 against the providers' published pricing
# pages (see src/token-core.js for the pricing history note).
MODELS = {
    "gpt-6": {
        "label": "GPT-6 Sol (frontier)",
        "charsPerToken": 4.0,
        "inputPerMillion": 2.0,
        "outputPerMillion": 10.0,
        "tokenizer": "o200k_base",  # exact counting available for this family
    },
    "gpt-6-astra": {
        "label": "GPT-6 Astra (premium frontier)",
        "charsPerToken": 4.0,
        "inputPerMillion": 10.0,
        "outputPerMillion": 50.0,
        "tokenizer": "o200k_base",
    },
    "claude-opus-5": {
        "label": "Claude Opus 5 (frontier)",
        "charsPerToken": 3.9,
        "inputPerMillion": 5.0,
        "outputPerMillion": 25.0,
    },
    "claude-haiku-5-5": {
        "label": "Claude Haiku 5.5 (fast/cheap)",
        "charsPerToken": 3.9,
        "inputPerMillion": 0.1,
        "outputPerMillion": 0.5,
        "priceNote": "Rate for prompts up to 100K tokens; $0.50 / $2.50 above 100K.",
    },
    "gemini-4-argon": {
        "label": "Gemini 4 Argon (frontier)",
        "charsPerToken": 4.1,
        "inputPerMillion": 4.0,
        "outputPerMillion": 20.0,
        "priceNote": "Standard rate from 1 Dec 2026; introductory $2 / $10 through 30 Nov 2026.",
    },
    "mercury-3": {
        "label": "Mercury 3 (diffusion, speed)",
        "charsPerToken": 4.0,
        "inputPerMillion": 0.2,  # list price; a launch promotion halves it
        "outputPerMillion": 0.7,
        "priceNote": "List price; the launch promotion is half this.",
    },
}


# ACCURACY (2026-11-08): the heuristic below was measured against real
# tokenizers on a golden set (see ACCURACY.md in this repo). It overstates
# long prose by ~30% and understates code, JSON and number-heavy text by
# 35-60%. Models with a published tokenizer (GPT family, o200k_base) can
# be counted EXACTLY once a real counter is wired in, e.g.:
#   import tiktoken
#   enc = tiktoken.get_encoding("o200k_base")
#   set_exact_counter(lambda text: len(enc.encode(text)))
# Everything else stays a labelled estimate with the measured error
# published.
_exact_counter = None


def set_exact_counter(fn):
    """Wire in a real tokenizer: set_exact_counter(fn) where fn(text)->int."""
    global _exact_counter
    _exact_counter = fn


def counting_method(model_id=None):
    """"exact" when a real tokenizer is wired for this model, else "estimate"."""
    model = MODELS.get(model_id) or MODELS["gpt-6"]
    return "exact" if (_exact_counter and model.get("tokenizer")) else "estimate"


def count_tokens_heuristic(text, model_id=None):
    if not text:
        return 0
    model = MODELS.get(model_id) or MODELS["gpt-6"]
    by_chars = len(text) / model["charsPerToken"]
    words = len(text.split())
    by_words = words / 0.75
    return _round((by_chars + by_words) / 2)


def count_tokens(text, model_id=None):
    if not text:
        return 0
    model = MODELS.get(model_id) or MODELS["gpt-6"]
    if _exact_counter and model.get("tokenizer"):
        return _exact_counter(text)
    return count_tokens_heuristic(text, model_id)


def analyse_prompt(parts, model_id=None):
    """parts: dict with any of system / context / history / question."""
    result = {}
    total = 0
    for name, text in parts.items():
        tokens = count_tokens(text or "", model_id)
        result[name] = tokens
        total += tokens
    result["total"] = total
    for name in parts:
        result[name + "Pct"] = _round((result[name] / total) * 100) if total else 0
    return result


TASK_TYPES = {
    "summarise": {"label": "Summarise", "outputRatio": 0.2, "fixedOutput": 0},
    "classify": {"label": "Classify / label", "outputRatio": 0, "fixedOutput": 10},
    "extract": {"label": "Extract data", "outputRatio": 0.3, "fixedOutput": 0},
    "draft": {"label": "Draft / write", "outputRatio": 1.5, "fixedOutput": 0},
    "code": {"label": "Generate code", "outputRatio": 2.0, "fixedOutput": 0},
    "chat": {"label": "Chat reply", "outputRatio": 0, "fixedOutput": 300},
    "translate": {"label": "Translate", "outputRatio": 1.0, "fixedOutput": 0},
}


def estimate_task(input_tokens, task_type, model_id, runs_per_day=1):
    model = MODELS[model_id]
    task = TASK_TYPES.get(task_type) or TASK_TYPES["chat"]
    if task["fixedOutput"]:
        output_tokens = task["fixedOutput"]
    else:
        output_tokens = _round(input_tokens * task["outputRatio"])

    cost_per_run = (input_tokens / 1e6) * model["inputPerMillion"] + (
        output_tokens / 1e6
    ) * model["outputPerMillion"]

    return {
        "model": model["label"],
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "costPerRun": cost_per_run,
        "costPerDay": cost_per_run * runs_per_day,
        "costPerMonth": cost_per_run * runs_per_day * 30,
    }


def compare_models(input_tokens, task_type, runs_per_day=1):
    return [
        estimate_task(input_tokens, task_type, model_id, runs_per_day)
        for model_id in MODELS
    ]


# ---------------------------------------------------------------------------
# WORKFLOWS — multi-step agent runs (added 2026-11-08). Mirror of
# estimateWorkflow in src/token-core.js; specification: DESIGN-AGENTIC.md
# (v3). The context at step k (k = 1..N), growth landing after each call:
#   baseline:    C0                       (each step sent fresh, no retries)
#   full carry:  C0 + A * (k - 1)
#   windowed:    C0 + A * min(k - 1, windowSteps - 1)
#   summarised:  C0 + S * (k - 1),  S = summaryRatio * A
# Summarised mode also pays for summarising: after each step j (1..N-1),
# one fast-tier call, in: S*(j-1) + A, out: S*j. Reported separately,
# not retried. Retries multiply the MAIN calls by 1 / (1 - retryRate).
# Caching is IDEALISED reuse: repeated prefixes at cacheRate x input
# price (full carry: the whole previous context; baseline: C0 from step
# 2 on; summarised: C0 only; windowed: none — the window shifts).
# ---------------------------------------------------------------------------

WORKFLOW = {
    "summaryRatio": 0.30,
    "windowSteps": 3,
    "cacheRate": 0.10,
    "fastModelId": "claude-haiku-5-5",
}


def estimate_workflow(
    model_id,
    steps,
    start_context,
    growth_per_step,
    reply_tokens,
    reasoning_tokens=0,
    retry_rate=0,
    caching=False,
    runs_per_day=1,
    days_per_month=30,
    context_limit=0,
    summary_ratio=WORKFLOW["summaryRatio"],
    window_steps=WORKFLOW["windowSteps"],
    cache_rate=WORKFLOW["cacheRate"],
    fast_model_id=WORKFLOW["fastModelId"],
    price_overrides=None,
):
    # price_overrides: see estimateWorkflow in src/token-core.js — it keeps
    # the design page's historical worked examples reproducible as
    # arithmetic regression tests without bending the live price table.
    overrides = price_overrides or {}
    model = {**MODELS[model_id], **overrides.get(model_id, {})}
    fast = {**MODELS[fast_model_id], **overrides.get(fast_model_id, {})}
    n = steps
    c0 = start_context
    a = growth_per_step
    s = summary_ratio * a
    out_per_step = reply_tokens + reasoning_tokens
    attempts = 1 / (1 - retry_rate)

    def price(fresh, cached, out, m):
        return ((fresh + cached * cache_rate) / 1e6) * m["inputPerMillion"] + (
            out / 1e6
        ) * m["outputPerMillion"]

    # Baseline: same steps, sent fresh, no history, no retries.
    base_cost = 0.0
    for k in range(n):
        if caching and k >= 1:
            base_cost += price(0, c0, out_per_step, model)
        else:
            base_cost += price(c0, 0, out_per_step, model)
    baseline = {
        "costPerRun": base_cost,
        "costPerMonth": base_cost * runs_per_day * days_per_month,
        "inputTokens": c0 * n,
        "outputTokens": out_per_step * n,
    }

    def run_mode(ctx_at, cache_split):
        cost = 0.0
        input_tokens = 0
        context_by_step = []
        for k in range(n):
            ctx = ctx_at(k)
            context_by_step.append(ctx)
            fresh, cached = ctx, 0
            if caching and k >= 1 and cache_split is not None:
                cached = cache_split(k, ctx)
                fresh = ctx - cached
            cost += price(fresh, cached, out_per_step, model)
            input_tokens += ctx
        cost *= attempts
        max_context = max(context_by_step)
        return {
            "costPerRun": cost,
            "costPerMonth": cost * runs_per_day * days_per_month,
            "premium": (cost / base_cost) if base_cost else 0,
            "inputTokens": input_tokens * attempts,
            "outputTokens": out_per_step * n * attempts,
            "maxContext": max_context,
            "exceedsLimit": bool(context_limit > 0 and max_context > context_limit),
            "contextByStep": context_by_step,
        }

    full = run_mode(lambda k: c0 + a * k, lambda k, ctx: c0 + a * (k - 1))
    windowed = run_mode(lambda k: c0 + a * min(k, window_steps - 1), None)
    summarised = run_mode(lambda k: c0 + s * k, lambda k, ctx: c0)

    summary_cost = 0.0
    summary_input = 0
    summary_output = 0
    for j in range(1, n):
        in_tok = s * (j - 1) + a
        out_tok = s * j
        summary_cost += price(in_tok, 0, out_tok, fast)
        summary_input += in_tok
        summary_output += out_tok
    summarised["summaryCostPerRun"] = summary_cost
    summarised["summaryInputTokens"] = summary_input
    summarised["summaryOutputTokens"] = summary_output
    summarised["costPerRun"] += summary_cost
    summarised["costPerMonth"] += summary_cost * runs_per_day * days_per_month
    summarised["premium"] = (summarised["costPerRun"] / base_cost) if base_cost else 0

    return {
        "model": model["label"],
        "steps": n,
        "attempts": attempts,
        "baseline": baseline,
        "modes": {"full": full, "windowed": windowed, "summarised": summarised},
    }


SAVINGS_LEVERS = {
    "promptCaching": {
        "label": "Prompt caching for repeated context",
        "typicalSavingPct": "up to ~90% on the cached portion",
    },
    "modelRouting": {
        "label": "Route easy steps to a small model",
        "typicalSavingPct": "~60–80% on the routed steps",
    },
    "leanFormat": {
        "label": "Lean formats instead of JSON",
        "typicalSavingPct": "~20–40% on structured data",
    },
    "fewerAgentSteps": {
        "label": "Fewer agent round-trips (context is resent every step)",
        "typicalSavingPct": "compounds — the deepest saving there is",
    },
}
