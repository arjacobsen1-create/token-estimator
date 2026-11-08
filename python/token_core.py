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


MODELS = {
    "gpt-6": {
        "label": "GPT-6 (frontier)",
        "charsPerToken": 4.0,
        "inputPerMillion": 5.0,
        "outputPerMillion": 25.0,
        "tokenizer": "o200k_base",  # exact counting available for this family
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
        "inputPerMillion": 1.0,
        "outputPerMillion": 5.0,
    },
    "gemini-4-argon": {
        "label": "Gemini 4 Argon (frontier)",
        "charsPerToken": 4.1,
        "inputPerMillion": 4.0,
        "outputPerMillion": 20.0,
    },
    "mercury-3": {
        "label": "Mercury 3 (diffusion, speed)",
        "charsPerToken": 4.0,
        "inputPerMillion": 0.2,  # price reported at launch, Oct 2026
        "outputPerMillion": 0.7,
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
