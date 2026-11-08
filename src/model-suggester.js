/**
 * model-suggester.js — "what to use for what."
 *
 * The Estimator counts and prices. The Suggester DECIDES:
 * give it a task (and what you care about — quality, cost, speed),
 * and it recommends a model, a runner-up, and the reasoning.
 *
 * How it works — no magic, and that's the point:
 *   1. Every model gets TRAITS: quality, speed, cheapness scores (1–5),
 *      plus the tasks it's known to be strong at.
 *   2. Every task gets WEIGHTS: how much quality vs speed vs cheapness
 *      usually matters for that kind of work.
 *   3. Score = weighted sum, + a bonus when the task is one of the
 *      model's known strengths. Rank, explain, price the winner.
 *
 * A recommender is a scoring table plus weights. When the table is wrong,
 * you fix the table — you can always see WHY it picked what it picked.
 *
 * *** The model landscape changes monthly. This table is dated
 * (October 2026) and is meant to be edited — updating it IS the job. ***
 */

"use strict";

// ---------------------------------------------------------------------------
// 1. THE MODEL TABLE (October 2026 — edit me)
// ---------------------------------------------------------------------------
// traits: quality / speed / cheap are 1–5 (5 = most / fastest / cheapest).
// strengths: task ids this model is a known-good pick for.
// Prices are EDITABLE DEFAULTS per 1M tokens — verify before relying.
// ---------------------------------------------------------------------------

const ROSTER = {
  "gpt-6": {
    label: "GPT-6",
    traits: { quality: 5, speed: 3, cheap: 2 },
    strengths: ["reasoning", "draft", "chat"],
    inputPerMillion: 5.0,
    outputPerMillion: 25.0,
    note: "Frontier all-rounder.",
  },
  "gpt-6-1-terra": {
    label: "GPT-6.1 Terra",
    traits: { quality: 4, speed: 4, cheap: 3 },
    strengths: ["computer-use", "agent"],
    inputPerMillion: 2.5,
    outputPerMillion: 12.0,
    note: "Built for computer use — 3x faster than the pricier tiers at it.",
  },
  "claude-opus-5": {
    label: "Claude Opus 5",
    traits: { quality: 5, speed: 3, cheap: 2 },
    strengths: ["code", "code-review", "reasoning", "draft"],
    inputPerMillion: 5.0,
    outputPerMillion: 25.0,
    note: "The coding benchmark leader; writes ~90% of its own codebase's code.",
  },
  "claude-haiku-5-5": {
    label: "Claude Haiku 5.5",
    traits: { quality: 3, speed: 5, cheap: 4 },
    strengths: ["classify", "extract", "summarise"],
    inputPerMillion: 1.0,
    outputPerMillion: 5.0,
    note: "Frontier-quality lineage at small-model speed and price.",
  },
  "gemini-4-argon": {
    label: "Gemini 4 Argon",
    traits: { quality: 5, speed: 3, cheap: 3 },
    strengths: ["long-document", "rag", "reasoning"],
    inputPerMillion: 4.0,
    outputPerMillion: 20.0,
    note: "Ties GPT-6 at the frontier; the long-context specialist.",
  },
  "mercury-3": {
    label: "Mercury 3",
    traits: { quality: 3, speed: 5, cheap: 5 },
    strengths: ["classify", "extract", "chat"],
    inputPerMillion: 0.2, // launch price, Oct 2026
    outputPerMillion: 0.7,
    note: "Diffusion model — drafts many tokens at once. ~1,000 tokens/sec, pennies per run.",
  },
  "deepseek-v4-1-flash": {
    label: "DeepSeek V4.1-Flash",
    traits: { quality: 4, speed: 4, cheap: 5 },
    strengths: ["code", "extract"],
    inputPerMillion: 0.3,
    outputPerMillion: 1.2,
    note: "Beat Opus 5 on a coding benchmark at a fraction of the price. Note: US federal use is banned — check your compliance context.",
  },
  "kimi-k3-1-pro": {
    label: "Kimi K3.1 Pro",
    traits: { quality: 4, speed: 3, cheap: 4 },
    strengths: ["code", "long-document"],
    inputPerMillion: 0.6,
    outputPerMillion: 2.5,
    note: "Near-frontier, open weights coming — the strongest self-hostable option.",
  },
  "muse-spark-open": {
    label: "Muse Spark Open",
    traits: { quality: 4, speed: 4, cheap: 4 },
    strengths: ["chat", "draft", "agent"],
    inputPerMillion: 0.0, // open weights: you pay for your own hardware, not tokens
    outputPerMillion: 0.0,
    note: "816B open weights that run on two Mac Studios. $0 per token — the cost is the hardware.",
  },
};

// ---------------------------------------------------------------------------
// 2. THE TASK TABLE
// ---------------------------------------------------------------------------
// weights say what usually matters for the task, BEFORE the user adjusts.
// priority shifts ("I care about cost") move the weights — see suggest().
// ---------------------------------------------------------------------------

const TASKS = {
  classify: { label: "Classify / label at volume", weights: { quality: 1, speed: 3, cheap: 5 } },
  extract: { label: "Extract data from documents", weights: { quality: 3, speed: 2, cheap: 4 } },
  summarise: { label: "Summarise", weights: { quality: 3, speed: 2, cheap: 3 } },
  chat: { label: "Customer-facing chat", weights: { quality: 3, speed: 4, cheap: 3 } },
  draft: { label: "Draft / write long-form", weights: { quality: 5, speed: 1, cheap: 2 } },
  code: { label: "Generate code", weights: { quality: 5, speed: 2, cheap: 2 } },
  "code-review": { label: "Review code", weights: { quality: 5, speed: 2, cheap: 2 } },
  reasoning: { label: "Hard reasoning / maths / analysis", weights: { quality: 5, speed: 1, cheap: 1 } },
  "long-document": { label: "Very long documents", weights: { quality: 4, speed: 1, cheap: 3 } },
  rag: { label: "Answer questions over your documents (RAG)", weights: { quality: 4, speed: 3, cheap: 3 } },
  agent: { label: "Multi-step agent work", weights: { quality: 4, speed: 3, cheap: 3 } },
  "computer-use": { label: "Computer use (clicks, forms, invoices)", weights: { quality: 4, speed: 4, cheap: 2 } },
  translate: { label: "Translate", weights: { quality: 3, speed: 3, cheap: 4 } },
};

// ---------------------------------------------------------------------------
// 3. THE SUGGESTER
// ---------------------------------------------------------------------------

const PRIORITY_SHIFTS = {
  balanced: { quality: 0, speed: 0, cheap: 0 },
  quality: { quality: 3, speed: 0, cheap: -1 },
  cost: { quality: -1, speed: 0, cheap: 3 },
  speed: { quality: 0, speed: 3, cheap: 0 },
};

function suggest(taskId, priority = "balanced") {
  const task = TASKS[taskId];
  if (!task) throw new Error("Unknown task: " + taskId);
  const shift = PRIORITY_SHIFTS[priority] || PRIORITY_SHIFTS.balanced;
  const w = {
    quality: Math.max(0, task.weights.quality + shift.quality),
    speed: Math.max(0, task.weights.speed + shift.speed),
    cheap: Math.max(0, task.weights.cheap + shift.cheap),
  };

  const scored = Object.entries(ROSTER).map(([id, m]) => {
    let score =
      m.traits.quality * w.quality +
      m.traits.speed * w.speed +
      m.traits.cheap * w.cheap;
    const reasons = [];
    if (m.strengths.includes(taskId)) {
      score += 10; // known-strength bonus
      reasons.push("known strength for this task");
    }
    if (m.traits.cheap >= 5) reasons.push("cheapest tier per token");
    if (m.traits.speed >= 5) reasons.push("fastest tier");
    if (m.traits.quality >= 5) reasons.push("frontier quality");
    reasons.push(m.note);
    return { id, label: m.label, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  return {
    task: task.label,
    priority,
    pick: scored[0],
    runnerUp: scored[1],
    alsoConsidered: scored.slice(2, 4),
  };
}

// Price a task on the suggested model, reusing the Estimator's logic:
// predicted output by task-type ratio lives in token-core.js (TASK_TYPES).
// Here we keep it simple: caller passes expected in/out tokens.

function priceOn(modelId, inputTokens, outputTokens, runsPerDay = 1) {
  const m = ROSTER[modelId];
  const perRun =
    (inputTokens / 1e6) * m.inputPerMillion +
    (outputTokens / 1e6) * m.outputPerMillion;
  return { perRun, perMonth: perRun * runsPerDay * 30 };
}

module.exports = { ROSTER, TASKS, PRIORITY_SHIFTS, suggest, priceOn };
