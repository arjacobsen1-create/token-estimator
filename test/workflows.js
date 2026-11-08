/**
 * workflows.js — golden tests for estimateWorkflow().
 *
 * Three groups:
 *  1. LIVE PRICE TABLE — the corrected prices, checked against the
 *     providers' published pages on 2026-11-08.
 *  2. HISTORICAL REGRESSION — the worked examples from DESIGN-AGENTIC.md,
 *     computed at the illustrative rates in force when the specification
 *     was written (frontier $5/$25, fast tier $1/$5). They are arithmetic
 *     regression cases, NOT current prices; priceOverrides keeps them
 *     reproducible without bending the live table to fit them.
 *  3. LIVE WORKFLOWS — the same two examples at the corrected live
 *     prices (GPT-6 Sol $2/$10, Haiku 5.5 $0.10/$0.50).
 *
 * Run: node test/workflows.js
 */

const core = require("../src/token-core.js");

let pass = 0;
let fail = 0;
function check(label, actual, expected, dp = 3) {
  const a = Number(actual.toFixed(dp));
  const e = Number(expected.toFixed(dp));
  if (a === e) pass++;
  else {
    fail++;
    console.log(`FAIL ${label}: got ${actual} (rounds to ${a}), expected ${e}`);
  }
}
function checkStr(label, actual, expected) {
  if (actual === expected) pass++;
  else {
    fail++;
    console.log(`FAIL ${label}: got "${actual}", expected "${expected}"`);
  }
}
function checkArr(label, actual, expected) {
  const ok =
    actual.length === expected.length &&
    actual.every((v, i) => v === expected[i]);
  if (ok) pass++;
  else {
    fail++;
    console.log(`FAIL ${label}: got [${actual}], expected [${expected}]`);
  }
}

// --- 1. Live price table (checked 2026-11-08) ------------------------------
check("price GPT-6 Sol in", core.MODELS["gpt-6"].inputPerMillion, 2, 2);
check("price GPT-6 Sol out", core.MODELS["gpt-6"].outputPerMillion, 10, 2);
checkStr("label GPT-6 Sol", core.MODELS["gpt-6"].label, "GPT-6 Sol (frontier)");
check("price Astra in", core.MODELS["gpt-6-astra"].inputPerMillion, 10, 2);
check("price Astra out", core.MODELS["gpt-6-astra"].outputPerMillion, 50, 2);
check("price Opus 5 in", core.MODELS["claude-opus-5"].inputPerMillion, 5, 2);
check("price Opus 5 out", core.MODELS["claude-opus-5"].outputPerMillion, 25, 2);
check("price Haiku 5.5 in", core.MODELS["claude-haiku-5-5"].inputPerMillion, 0.1, 2);
check("price Haiku 5.5 out", core.MODELS["claude-haiku-5-5"].outputPerMillion, 0.5, 2);
check("price Gemini in", core.MODELS["gemini-4-argon"].inputPerMillion, 4, 2);
check("price Gemini out", core.MODELS["gemini-4-argon"].outputPerMillion, 20, 2);
check("price Mercury in", core.MODELS["mercury-3"].inputPerMillion, 0.2, 2);
check("price Mercury out", core.MODELS["mercury-3"].outputPerMillion, 0.7, 2);
checkStr(
  "Gemini note is dated",
  /1 Dec 2026/.test(core.MODELS["gemini-4-argon"].priceNote || "") ? "dated" : "undated",
  "dated"
);
checkStr(
  "Haiku note states the tier",
  /100K/.test(core.MODELS["claude-haiku-5-5"].priceNote || "") ? "tiered" : "flat",
  "tiered"
);

// --- 2. Historical regression (illustrative rates: $5/$25, $1/$5) ----------
const HISTORICAL = {
  "gpt-6": { inputPerMillion: 5.0, outputPerMillion: 25.0 },
  "claude-haiku-5-5": { inputPerMillion: 1.0, outputPerMillion: 5.0 },
};

const A = core.estimateWorkflow({
  modelId: "gpt-6", steps: 6, startContext: 4000, growthPerStep: 1500,
  replyTokens: 500, retryRate: 0.05, runsPerDay: 200, priceOverrides: HISTORICAL,
});
check("HIST A baseline", A.baseline.costPerRun, 0.195);
check("HIST A full", A.modes.full.costPerRun, 0.324);
check("HIST A windowed", A.modes.windowed.costPerRun, 0.276);
check("HIST A summarised", A.modes.summarised.costPerRun, 0.287);
check("HIST A summary calls", A.modes.summarised.summaryCostPerRun, 0.046);
check("HIST A full premium", A.modes.full.premium, 1.66, 2);
check("HIST A windowed premium", A.modes.windowed.premium, 1.42, 2);
check("HIST A summarised premium", A.modes.summarised.premium, 1.47, 2);
check("HIST A baseline monthly", A.baseline.costPerMonth, 1170, 0);
check("HIST A full monthly", A.modes.full.costPerMonth, 1942, 0);
checkArr("HIST A full contextByStep", A.modes.full.contextByStep, [
  4000, 5500, 7000, 8500, 10000, 11500,
]);
check("HIST A full maxContext", A.modes.full.maxContext, 11500, 0);

const Ac = core.estimateWorkflow({
  modelId: "gpt-6", steps: 6, startContext: 4000, growthPerStep: 1500,
  replyTokens: 500, retryRate: 0.05, caching: true, priceOverrides: HISTORICAL,
});
check("HIST A cached baseline", Ac.baseline.costPerRun, 0.105);
check("HIST A cached full", Ac.modes.full.costPerRun, 0.158);
check("HIST A cached full premium", Ac.modes.full.premium, 1.5, 2);

const Al = core.estimateWorkflow({
  modelId: "gpt-6", steps: 6, startContext: 4000, growthPerStep: 1500,
  replyTokens: 500, retryRate: 0.05, contextLimit: 10000, priceOverrides: HISTORICAL,
});
check("HIST A limit: full exceeds", Al.modes.full.exceedsLimit ? 1 : 0, 1, 0);
check("HIST A limit: windowed fits", Al.modes.windowed.exceedsLimit ? 1 : 0, 0, 0);
check("HIST A limit: summarised fits", Al.modes.summarised.exceedsLimit ? 1 : 0, 0, 0);

const B = core.estimateWorkflow({
  modelId: "gpt-6", steps: 12, startContext: 6000, growthPerStep: 2500,
  replyTokens: 600, retryRate: 0.1, runsPerDay: 200, priceOverrides: HISTORICAL,
});
check("HIST B baseline", B.baseline.costPerRun, 0.54);
check("HIST B full", B.modes.full.costPerRun, 1.517);
check("HIST B windowed", B.modes.windowed.costPerRun, 0.892);
check("HIST B summarised", B.modes.summarised.costPerRun, 1.191);
check("HIST B summary calls", B.modes.summarised.summaryCostPerRun, 0.316);
check("HIST B full premium", B.modes.full.premium, 2.81, 2);
check("HIST B windowed premium", B.modes.windowed.premium, 1.65, 2);
check("HIST B summarised premium", B.modes.summarised.premium, 2.21, 2);
check("HIST B baseline monthly", B.baseline.costPerMonth, 3240, 0);
check("HIST B full monthly", B.modes.full.costPerMonth, 9100, 0);

const Bc = core.estimateWorkflow({
  modelId: "gpt-6", steps: 12, startContext: 6000, growthPerStep: 2500,
  replyTokens: 600, retryRate: 0.1, caching: true, priceOverrides: HISTORICAL,
});
check("HIST B cached baseline", Bc.baseline.costPerRun, 0.243);
check("HIST B cached full", Bc.modes.full.costPerRun, 0.499);
check("HIST B cached full premium", Bc.modes.full.premium, 2.05, 2);

// --- 3. Live workflows (Sol $2/$10, Haiku $0.10/$0.50) ----------------------
const LA = core.estimateWorkflow({
  modelId: "gpt-6", steps: 6, startContext: 4000, growthPerStep: 1500,
  replyTokens: 500, retryRate: 0.05, runsPerDay: 200,
});
check("LIVE A baseline", LA.baseline.costPerRun, 0.078);
check("LIVE A full", LA.modes.full.costPerRun, 0.129);
check("LIVE A windowed", LA.modes.windowed.costPerRun, 0.111);
check("LIVE A summarised", LA.modes.summarised.costPerRun, 0.101);
check("LIVE A summary calls", LA.modes.summarised.summaryCostPerRun, 0.005);
check("LIVE A full premium", LA.modes.full.premium, 1.66, 2);
check("LIVE A windowed premium", LA.modes.windowed.premium, 1.42, 2);
check("LIVE A summarised premium", LA.modes.summarised.premium, 1.29, 2);
check("LIVE A baseline monthly", LA.baseline.costPerMonth, 468, 0);
check("LIVE A full monthly", LA.modes.full.costPerMonth, 777, 0);

const LB = core.estimateWorkflow({
  modelId: "gpt-6", steps: 12, startContext: 6000, growthPerStep: 2500,
  replyTokens: 600, retryRate: 0.1, runsPerDay: 200,
});
check("LIVE B baseline", LB.baseline.costPerRun, 0.216);
check("LIVE B full", LB.modes.full.costPerRun, 0.607);
check("LIVE B windowed", LB.modes.windowed.costPerRun, 0.357);
check("LIVE B summarised", LB.modes.summarised.costPerRun, 0.382);
check("LIVE B summary calls", LB.modes.summarised.summaryCostPerRun, 0.032);
check("LIVE B full premium", LB.modes.full.premium, 2.81, 2);
check("LIVE B windowed premium", LB.modes.windowed.premium, 1.65, 2);
check("LIVE B summarised premium", LB.modes.summarised.premium, 1.77, 2);
check("LIVE B baseline monthly", LB.baseline.costPerMonth, 1296, 0);
check("LIVE B full monthly", LB.modes.full.costPerMonth, 3640, 0);

const LAc = core.estimateWorkflow({
  modelId: "gpt-6", steps: 6, startContext: 4000, growthPerStep: 1500,
  replyTokens: 500, retryRate: 0.05, caching: true,
});
check("LIVE A cached baseline", LAc.baseline.costPerRun, 0.042);
check("LIVE A cached full", LAc.modes.full.costPerRun, 0.063);
check("LIVE A cached full premium", LAc.modes.full.premium, 1.5, 2);

const LBc = core.estimateWorkflow({
  modelId: "gpt-6", steps: 12, startContext: 6000, growthPerStep: 2500,
  replyTokens: 600, retryRate: 0.1, caching: true,
});
check("LIVE B cached baseline", LBc.baseline.costPerRun, 0.097);
check("LIVE B cached full", LBc.modes.full.costPerRun, 0.2);
check("LIVE B cached full premium", LBc.modes.full.premium, 2.05, 2);

console.log(`workflows: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
