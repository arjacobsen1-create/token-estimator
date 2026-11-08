/**
 * token-core.js — the engine of the Token Estimator app.
 *
 * Everything the app does comes from the functions in this file:
 *   countTokens()     — how many tokens is this text?
 *   analysePrompt()   — where do the tokens sit (system / context / history / question)?
 *   estimateTask()    — what will a task cost, on each model, at volume?
 *
 * Read it top to bottom — it's written to be learned from.
 * See LEARNING.md for the matching lessons.
 */

"use strict";

// ---------------------------------------------------------------------------
// 1. MODEL PROFILES
// ---------------------------------------------------------------------------
// Each model needs two things:
//   charsPerToken — how its tokenizer slices text (a v1 heuristic, see
//                   LEARNING.md Lesson 1). Prose in English averages ~4.
//                   Code and JSON slice into more tokens, so their effective
//                   chars-per-token is lower.
//   inputPerMillion / outputPerMillion — price in USD per 1M tokens.
//                   *** EDITABLE DEFAULTS — verify against the provider's
//                   current pricing page before relying on any figure. ***
// ---------------------------------------------------------------------------

const MODELS = {
  "gpt-6": {
    label: "GPT-6 (frontier)",
    charsPerToken: 4.0,
    inputPerMillion: 5.0,
    outputPerMillion: 25.0,
    tokenizer: "o200k_base", // exact counting available for this family
  },
  "claude-opus-5": {
    label: "Claude Opus 5 (frontier)",
    charsPerToken: 3.9,
    inputPerMillion: 5.0,
    outputPerMillion: 25.0,
  },
  "claude-haiku-5-5": {
    label: "Claude Haiku 5.5 (fast/cheap)",
    charsPerToken: 3.9,
    inputPerMillion: 1.0,
    outputPerMillion: 5.0,
  },
  "gemini-4-argon": {
    label: "Gemini 4 Argon (frontier)",
    charsPerToken: 4.1,
    inputPerMillion: 4.0,
    outputPerMillion: 20.0,
  },
  "mercury-3": {
    label: "Mercury 3 (diffusion, speed)",
    charsPerToken: 4.0,
    inputPerMillion: 0.2, // price reported at launch, Oct 2026
    outputPerMillion: 0.7,
  },
};

// ---------------------------------------------------------------------------
// 2. COUNTING
// ---------------------------------------------------------------------------
// v1 heuristic: tokens ≈ characters / charsPerToken, blended with a
// word-based estimate (words / 0.75). Taking the average of the two is more
// stable than either alone across prose, code and lists.
// The production version replaces ONLY this function with the model's real
// tokenizer — everything else in the app stays the same.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ACCURACY — read this before trusting a count (added 2026-11-08).
// The heuristic below was measured against real tokenizers on a golden
// set of ten texts (test/accuracy.mjs, ACCURACY.md). Verdict: fine on
// short plain prose (±12%), but it overstates long prose by ~30% and
// understates code, JSON and number-heavy text by 35–60%. A number that
// wrong is not a count, it's a guess — so:
//   * Models with a published tokenizer (the GPT family, o200k_base)
//     can be counted EXACTLY once a real counter is wired in with
//     setExactCounter() — the demo pages load one; Node users can pass
//     gpt-tokenizer's encode. Exact beats estimated, always.
//   * Models without a public tokenizer (Claude and others) stay
//     estimates, labelled as such, with the measured error published.
// ---------------------------------------------------------------------------

let exactCounter = null;

/** Wire in a real tokenizer: setExactCounter(text => encode(text).length). */
function setExactCounter(fn) {
  exactCounter = fn;
}

/** "exact" when a real tokenizer is wired for this model, else "estimate". */
function countingMethod(modelId) {
  const model = MODELS[modelId] || MODELS["gpt-6"];
  return exactCounter && model.tokenizer ? "exact" : "estimate";
}

function countTokensHeuristic(text, modelId) {
  if (!text) return 0;
  const model = MODELS[modelId] || MODELS["gpt-6"];
  const byChars = text.length / model.charsPerToken;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const byWords = words / 0.75;
  return Math.round((byChars + byWords) / 2);
}

function countTokens(text, modelId) {
  if (!text) return 0;
  const model = MODELS[modelId] || MODELS["gpt-6"];
  if (exactCounter && model.tokenizer) return exactCounter(text);
  return countTokensHeuristic(text, modelId);
}

// ---------------------------------------------------------------------------
// 3. PROMPT ANATOMY
// ---------------------------------------------------------------------------
// A real prompt is not one blob. It's parts, and the parts behave very
// differently: the question is usually tiny; the dragged-along context is
// where the tokens (and the waste) live.
// ---------------------------------------------------------------------------

function analysePrompt(parts, modelId) {
  // parts: { system, context, history, question } — any may be empty.
  const result = {};
  let total = 0;
  for (const [name, text] of Object.entries(parts)) {
    const tokens = countTokens(text || "", modelId);
    result[name] = tokens;
    total += tokens;
  }
  result.total = total;
  // Percentages make the waste visible at a glance.
  for (const name of Object.keys(parts)) {
    result[name + "Pct"] = total ? Math.round((result[name] / total) * 100) : 0;
  }
  return result;
}

// ---------------------------------------------------------------------------
// 4. TASK ESTIMATION
// ---------------------------------------------------------------------------
// You can count input tokens exactly. Output tokens you must PREDICT.
// The honest way: ratios by task type, learned from real work.
//   outputRatio — expected reply length as a share of input length.
//   fixedOutput — for tasks whose reply is a set size (classification etc.)
// These are starting defaults; the app replaces them with the user's own
// history over time.
// ---------------------------------------------------------------------------

const TASK_TYPES = {
  summarise: { label: "Summarise", outputRatio: 0.2, fixedOutput: 0 },
  classify: { label: "Classify / label", outputRatio: 0, fixedOutput: 10 },
  extract: { label: "Extract data", outputRatio: 0.3, fixedOutput: 0 },
  draft: { label: "Draft / write", outputRatio: 1.5, fixedOutput: 0 },
  code: { label: "Generate code", outputRatio: 2.0, fixedOutput: 0 },
  chat: { label: "Chat reply", outputRatio: 0, fixedOutput: 300 },
  translate: { label: "Translate", outputRatio: 1.0, fixedOutput: 0 },
};

function estimateTask({ inputTokens, taskType, modelId, runsPerDay = 1 }) {
  const model = MODELS[modelId];
  const task = TASK_TYPES[taskType] || TASK_TYPES.chat;
  const outputTokens = task.fixedOutput
    ? task.fixedOutput
    : Math.round(inputTokens * task.outputRatio);

  const costPerRun =
    (inputTokens / 1e6) * model.inputPerMillion +
    (outputTokens / 1e6) * model.outputPerMillion;

  return {
    model: model.label,
    inputTokens,
    outputTokens,
    costPerRun,
    costPerDay: costPerRun * runsPerDay,
    costPerMonth: costPerRun * runsPerDay * 30,
  };
}

// Compare one task across every model — the table the app shows.
function compareModels(input) {
  return Object.keys(MODELS).map((modelId) =>
    estimateTask({ ...input, modelId })
  );
}

// ---------------------------------------------------------------------------
// 5. SAVINGS LEVERS
// ---------------------------------------------------------------------------
// Beyond compression, the big levers, as approximate saving ranges the app
// can apply to an estimate so users can model "what if":
//   promptCaching — resent static context (system prompt, reference docs)
//                   is billed at a steep discount by major providers.
//   modelRouting  — send easy steps to a small model, hard steps to frontier.
//   leanFormat    — JSON carries structure characters; lists/CSV are leaner.
// ---------------------------------------------------------------------------

const SAVINGS_LEVERS = {
  promptCaching: {
    label: "Prompt caching for repeated context",
    typicalSavingPct: "up to ~90% on the cached portion",
  },
  modelRouting: {
    label: "Route easy steps to a small model",
    typicalSavingPct: "~60–80% on the routed steps",
  },
  leanFormat: {
    label: "Lean formats instead of JSON",
    typicalSavingPct: "~20–40% on structured data",
  },
  fewerAgentSteps: {
    label: "Fewer agent round-trips (context is resent every step)",
    typicalSavingPct: "compounds — the deepest saving there is",
  },
};

module.exports = {
  MODELS,
  TASK_TYPES,
  SAVINGS_LEVERS,
  countTokens,
  countTokensHeuristic,
  setExactCounter,
  countingMethod,
  analysePrompt,
  estimateTask,
  compareModels,
};
