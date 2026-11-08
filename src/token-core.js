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
//                   *** EDITABLE DEFAULTS — checked 2026-11-08 against the
//                   providers' published pricing pages. Rates move; check
//                   the page again before relying on any figure. ***
//   priceNote (where present) — a tier or a date the single rate hides.
//                   A rate with a date on it is a fact; without one it is
//                   a guess. Pricing history: before 2026-11-08 this table
//                   carried an illustrative $5/$25 "GPT-6" and Haiku 4.5's
//                   $1/$5 against Haiku 5.5's name; a pricing audit against
//                   the published pages corrected both, on the record.
// ---------------------------------------------------------------------------

const MODELS = {
  "gpt-6": {
    label: "GPT-6 Sol (frontier)",
    charsPerToken: 4.0,
    inputPerMillion: 2.0,
    outputPerMillion: 10.0,
    tokenizer: "o200k_base", // exact counting available for this family
  },
  "gpt-6-astra": {
    label: "GPT-6 Astra (premium frontier)",
    charsPerToken: 4.0,
    inputPerMillion: 10.0,
    outputPerMillion: 50.0,
    tokenizer: "o200k_base",
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
    inputPerMillion: 0.1,
    outputPerMillion: 0.5,
    priceNote: "Rate for prompts up to 100K tokens; $0.50 / $2.50 above 100K.",
  },
  "gemini-4-argon": {
    label: "Gemini 4 Argon (frontier)",
    charsPerToken: 4.1,
    inputPerMillion: 4.0,
    outputPerMillion: 20.0,
    priceNote: "Standard rate from 1 Dec 2026; introductory $2 / $10 through 30 Nov 2026.",
  },
  "mercury-3": {
    label: "Mercury 3 (diffusion, speed)",
    charsPerToken: 4.0,
    inputPerMillion: 0.2, // list price; a launch promotion halves it
    outputPerMillion: 0.7,
    priceNote: "List price; the launch promotion is half this.",
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

// ---------------------------------------------------------------------------
// 6. WORKFLOWS — multi-step agent runs (added 2026-11-08)
// ---------------------------------------------------------------------------
// estimateTask() prices one call. An agent run is N calls, and at every
// step the model receives the starting context PLUS the accumulated
// history — and that history is billed again. This function prices the
// run under three carry modes against an honest baseline, exactly as
// specified in DESIGN-AGENTIC.md (v3). The worked examples in that
// document are this function's golden tests (test/workflows.js).
//
// Timing rule: a step's material joins the history AFTER its call
// completes, and is first resent by the NEXT call. So the context at
// step k (k = 1..N) is:
//   baseline:    C0                       (each step sent fresh, no retries)
//   full carry:  C0 + A * (k - 1)
//   windowed:    C0 + A * min(k - 1, windowSteps - 1)
//   summarised:  C0 + S * (k - 1),  S = summaryRatio * A
// "A" is everything one step adds to history: its extra retrieval, tool
// results and its reply (the reply is billed as output when produced
// and again as input when resent — that resending is the point).
//
// Summarised mode also pays for the summarising itself: after each step
// j (1..N-1), one call on the fast tier takes the previous summary plus
// the step's new material (in: S*(j-1) + A) and returns the updated
// summary (out: S*j). Summary calls are reported separately and are
// not retried in this model.
//
// Retries multiply the MAIN calls by 1 / (1 - retryRate): a failed call
// is billed in full and the step is retried until it succeeds.
//
// Caching is IDEALISED cache reuse: when on, a repeated prefix is priced
// at cacheRate x the input price. Full carry: at step k >= 2 the prefix
// C0 + A*(k-2) is cached. Baseline: C0 is cached from step 2 on.
// Summarised: only C0 is cached (the summary changes every step, so it
// is not a stable prefix). Windowed: no cache benefit (the shifting
// window breaks prefix stability). Real hit rates vary by provider.
// ---------------------------------------------------------------------------

const WORKFLOW = {
  summaryRatio: 0.3, // summary size as a share of the history it replaces
  windowSteps: 3, // windowed mode: current step + (windowSteps - 1) of history
  cacheRate: 0.1, // cached input priced at this share of the input price
  fastModelId: "claude-haiku-5-5", // tier that writes the summaries
};

function estimateWorkflow({
  modelId,
  steps,
  startContext,
  growthPerStep,
  replyTokens,
  reasoningTokens = 0,
  retryRate = 0,
  caching = false,
  runsPerDay = 1,
  daysPerMonth = 30,
  contextLimit = 0,
  summaryRatio = WORKFLOW.summaryRatio,
  windowSteps = WORKFLOW.windowSteps,
  cacheRate = WORKFLOW.cacheRate,
  fastModelId = WORKFLOW.fastModelId,
  priceOverrides = null,
}) {
  // priceOverrides exists for one reason: the design page's worked
  // examples were computed at the illustrative rates in force when the
  // specification was written, and they stay reproducible as arithmetic
  // regression tests without bending the live price table to fit them.
  const model = { ...MODELS[modelId], ...((priceOverrides || {})[modelId] || {}) };
  const fast = { ...MODELS[fastModelId], ...((priceOverrides || {})[fastModelId] || {}) };
  const N = steps;
  const C0 = startContext;
  const A = growthPerStep;
  const S = summaryRatio * A;
  const outPerStep = replyTokens + reasoningTokens;
  const attempts = 1 / (1 - retryRate);

  // Price one call: fresh input at full price, cached input at cacheRate.
  const price = (fresh, cached, out, m) =>
    ((fresh + cached * cacheRate) / 1e6) * m.inputPerMillion +
    (out / 1e6) * m.outputPerMillion;

  // --- Baseline: same steps, sent fresh, no history, no retries. ---
  let baseCost = 0;
  for (let k = 0; k < N; k++) {
    baseCost +=
      caching && k >= 1
        ? price(0, C0, outPerStep, model)
        : price(C0, 0, outPerStep, model);
  }
  const baseline = {
    costPerRun: baseCost,
    costPerMonth: baseCost * runsPerDay * daysPerMonth,
    inputTokens: C0 * N,
    outputTokens: outPerStep * N,
  };

  // --- The three carry modes (main calls, retries applied). ---
  function runMode(ctxAt, cacheSplit) {
    let cost = 0;
    let input = 0;
    const contextByStep = [];
    for (let k = 0; k < N; k++) {
      const ctx = ctxAt(k);
      contextByStep.push(ctx);
      let fresh = ctx;
      let cached = 0;
      if (caching && k >= 1 && cacheSplit) {
        cached = cacheSplit(k, ctx);
        fresh = ctx - cached;
      }
      cost += price(fresh, cached, outPerStep, model);
      input += ctx;
    }
    cost *= attempts;
    const maxContext = Math.max(...contextByStep);
    return {
      costPerRun: cost,
      costPerMonth: cost * runsPerDay * daysPerMonth,
      premium: baseCost ? cost / baseCost : 0,
      inputTokens: input * attempts,
      outputTokens: outPerStep * N * attempts,
      maxContext,
      exceedsLimit: contextLimit > 0 && maxContext > contextLimit,
      contextByStep,
    };
  }

  // Full carry cache split: this call (0-based k) sends C0 + A*k, and the
  // previous call sent C0 + A*(k-1) — so the whole previous context is
  // the repeated prefix, and only the newest A tokens are fresh.
  const full = runMode(
    (k) => C0 + A * k,
    (k, ctx) => C0 + A * (k - 1)
  );

  const windowed = runMode(
    (k) => C0 + A * Math.min(k, windowSteps - 1),
    null // shifting window: no stable prefix, no cache benefit
  );

  const summarised = runMode(
    (k) => C0 + S * k,
    (k, ctx) => C0 // only the starting context is a stable prefix
  );

  // --- Summarising calls (fast tier, not retried, reported apart). ---
  let summaryCost = 0;
  let summaryInput = 0;
  let summaryOutput = 0;
  for (let j = 1; j <= N - 1; j++) {
    const inTok = S * (j - 1) + A; // previous summary + newest step's material
    const outTok = S * j; // the updated summary
    summaryCost += price(inTok, 0, outTok, fast);
    summaryInput += inTok;
    summaryOutput += outTok;
  }
  summarised.summaryCostPerRun = summaryCost;
  summarised.summaryInputTokens = summaryInput;
  summarised.summaryOutputTokens = summaryOutput;
  summarised.costPerRun += summaryCost;
  summarised.costPerMonth += summaryCost * runsPerDay * daysPerMonth;
  summarised.premium = baseCost ? summarised.costPerRun / baseCost : 0;

  return {
    model: model.label,
    steps: N,
    attempts,
    baseline,
    modes: { full, windowed, summarised },
  };
}

module.exports = {
  MODELS,
  TASK_TYPES,
  SAVINGS_LEVERS,
  WORKFLOW,
  countTokens,
  countTokensHeuristic,
  setExactCounter,
  countingMethod,
  analysePrompt,
  estimateTask,
  compareModels,
  estimateWorkflow,
};
