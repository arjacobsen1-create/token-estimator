"""
model_suggester.py — the Python port of the Suggester (src/model-suggester.js).

Give it a task and a priority (quality / cost / speed / balanced) and it
recommends a model, a runner-up, and the reasoning. Same scoring table,
same weights, same answers as the JavaScript version.
"""

ROSTER = {
    "gpt-6": {
        "label": "GPT-6",
        "traits": {"quality": 5, "speed": 3, "cheap": 2},
        "strengths": ["reasoning", "draft", "chat"],
        "inputPerMillion": 2.0,  # GPT-6 Sol rates, checked 2026-11-08
        "outputPerMillion": 10.0,
        "note": "Frontier all-rounder.",
    },
    "gpt-6-1-terra": {
        "label": "GPT-6.1 Terra",
        "traits": {"quality": 4, "speed": 4, "cheap": 3},
        "strengths": ["computer-use", "agent"],
        "inputPerMillion": 2.5,
        "outputPerMillion": 12.0,
        "note": "Built for computer use — 3x faster than the pricier tiers at it.",
    },
    "claude-opus-5": {
        "label": "Claude Opus 5",
        "traits": {"quality": 5, "speed": 3, "cheap": 2},
        "strengths": ["code", "code-review", "reasoning", "draft"],
        "inputPerMillion": 5.0,
        "outputPerMillion": 25.0,
        "note": "The coding benchmark leader; writes ~90% of its own codebase's code.",
    },
    "claude-haiku-5-5": {
        "label": "Claude Haiku 5.5",
        "traits": {"quality": 3, "speed": 5, "cheap": 5},
        "strengths": ["classify", "extract", "summarise"],
        "inputPerMillion": 0.1,  # prompts up to 100K tokens; checked 2026-11-08
        "outputPerMillion": 0.5,
        "note": "Frontier-quality lineage at small-model speed and price.",
    },
    "gemini-4-argon": {
        "label": "Gemini 4 Argon",
        "traits": {"quality": 5, "speed": 3, "cheap": 3},
        "strengths": ["long-document", "rag", "reasoning"],
        "inputPerMillion": 4.0,
        "outputPerMillion": 20.0,
        "note": "Ties GPT-6 at the frontier; the long-context specialist.",
    },
    "mercury-3": {
        "label": "Mercury 3",
        "traits": {"quality": 3, "speed": 5, "cheap": 5},
        "strengths": ["classify", "extract", "chat"],
        "inputPerMillion": 0.2,
        "outputPerMillion": 0.7,
        "note": "Diffusion model — drafts many tokens at once. ~1,000 tokens/sec, pennies per run.",
    },
    "deepseek-v4-1-flash": {
        "label": "DeepSeek V4.1-Flash",
        "traits": {"quality": 4, "speed": 4, "cheap": 5},
        "strengths": ["code", "extract"],
        "inputPerMillion": 0.3,
        "outputPerMillion": 1.2,
        "note": "Beat Opus 5 on a coding benchmark at a fraction of the price. Note: US federal use is banned — check your compliance context.",
    },
    "kimi-k3-1-pro": {
        "label": "Kimi K3.1 Pro",
        "traits": {"quality": 4, "speed": 3, "cheap": 4},
        "strengths": ["code", "long-document"],
        "inputPerMillion": 0.6,
        "outputPerMillion": 2.5,
        "note": "Near-frontier, open weights coming — the strongest self-hostable option.",
    },
    "muse-spark-open": {
        "label": "Muse Spark Open",
        "traits": {"quality": 4, "speed": 4, "cheap": 4},
        "strengths": ["chat", "draft", "agent"],
        "inputPerMillion": 0.0,
        "outputPerMillion": 0.0,
        "note": "816B open weights that run on two Mac Studios. $0 per token — the cost is the hardware.",
    },
}

TASKS = {
    "classify": {"label": "Classify / label at volume", "weights": {"quality": 1, "speed": 3, "cheap": 5}},
    "extract": {"label": "Extract data from documents", "weights": {"quality": 3, "speed": 2, "cheap": 4}},
    "summarise": {"label": "Summarise", "weights": {"quality": 3, "speed": 2, "cheap": 3}},
    "chat": {"label": "Customer-facing chat", "weights": {"quality": 3, "speed": 4, "cheap": 3}},
    "draft": {"label": "Draft / write long-form", "weights": {"quality": 5, "speed": 1, "cheap": 2}},
    "code": {"label": "Generate code", "weights": {"quality": 5, "speed": 2, "cheap": 2}},
    "code-review": {"label": "Review code", "weights": {"quality": 5, "speed": 2, "cheap": 2}},
    "reasoning": {"label": "Hard reasoning / maths / analysis", "weights": {"quality": 5, "speed": 1, "cheap": 1}},
    "long-document": {"label": "Very long documents", "weights": {"quality": 4, "speed": 1, "cheap": 3}},
    "rag": {"label": "Answer questions over your documents (RAG)", "weights": {"quality": 4, "speed": 3, "cheap": 3}},
    "agent": {"label": "Multi-step agent work", "weights": {"quality": 4, "speed": 3, "cheap": 3}},
    "computer-use": {"label": "Computer use (clicks, forms, invoices)", "weights": {"quality": 4, "speed": 4, "cheap": 2}},
    "translate": {"label": "Translate", "weights": {"quality": 3, "speed": 3, "cheap": 4}},
}

PRIORITY_SHIFTS = {
    "balanced": {"quality": 0, "speed": 0, "cheap": 0},
    "quality": {"quality": 3, "speed": 0, "cheap": -1},
    "cost": {"quality": -1, "speed": 0, "cheap": 3},
    "speed": {"quality": 0, "speed": 3, "cheap": 0},
}


def suggest(task_id, priority="balanced"):
    if task_id not in TASKS:
        raise ValueError("Unknown task: " + task_id)
    task = TASKS[task_id]
    shift = PRIORITY_SHIFTS.get(priority) or PRIORITY_SHIFTS["balanced"]
    w = {
        "quality": max(0, task["weights"]["quality"] + shift["quality"]),
        "speed": max(0, task["weights"]["speed"] + shift["speed"]),
        "cheap": max(0, task["weights"]["cheap"] + shift["cheap"]),
    }

    scored = []
    for model_id, m in ROSTER.items():
        score = (
            m["traits"]["quality"] * w["quality"]
            + m["traits"]["speed"] * w["speed"]
            + m["traits"]["cheap"] * w["cheap"]
        )
        reasons = []
        if task_id in m["strengths"]:
            score += 10  # known-strength bonus
            reasons.append("known strength for this task")
        if m["traits"]["cheap"] >= 5:
            reasons.append("cheapest tier per token")
        if m["traits"]["speed"] >= 5:
            reasons.append("fastest tier")
        if m["traits"]["quality"] >= 5:
            reasons.append("frontier quality")
        reasons.append(m["note"])
        scored.append({"id": model_id, "label": m["label"], "score": score, "reasons": reasons})

    # Python's sort is stable, like the JS engine's: ties keep roster order.
    scored.sort(key=lambda s: -s["score"])
    return {
        "task": task["label"],
        "priority": priority,
        "pick": scored[0],
        "runnerUp": scored[1],
        "alsoConsidered": scored[2:4],
    }


def price_on(model_id, input_tokens, output_tokens, runs_per_day=1):
    m = ROSTER[model_id]
    per_run = (input_tokens / 1e6) * m["inputPerMillion"] + (
        output_tokens / 1e6
    ) * m["outputPerMillion"]
    return {"perRun": per_run, "perMonth": per_run * runs_per_day * 30}
