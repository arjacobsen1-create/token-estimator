/**
 * smoke.js — the proof this engine works. Run:  node test/smoke.js
 * Exits 0 and prints PASS lines when every check holds; exits 1 otherwise.
 */
const assert = require("node:assert");
const { countTokens, analysePrompt, estimateTask, compareModels, MODELS } =
  require("../src/token-core");

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log("PASS  " + name);
}

// 1. Counting grows with text length.
check("countTokens grows with text length", () => {
  const short = countTokens("Why is delivery falling?", "gpt-6");
  const long = countTokens(
    "Why is delivery falling? " + "The Q3 report shows delays at two suppliers. ".repeat(20),
    "gpt-6"
  );
  assert.ok(long > short * 5, `expected long (${long}) >> short (${short})`);
});

// 2. Anatomy adds up: the parts sum to the total.
check("analysePrompt parts sum to the total", () => {
  const a = analysePrompt(
    { system: "You are helpful.", context: "A long context document.", history: "User: hi", question: "Why?" },
    "gpt-6"
  );
  assert.strictEqual(a.system + a.context + a.history + a.question, a.total);
  assert.ok(a.total > 0);
});

// 3. Estimation is internally consistent: month = run x runs/day x 30.
check("estimateTask cost maths is consistent", () => {
  const e = estimateTask({ inputTokens: 500, taskType: "summarise", modelId: "gpt-6", runsPerDay: 10 });
  assert.ok(e.outputTokens > 0);
  assert.ok(Math.abs(e.costPerMonth - e.costPerRun * 10 * 30) < 0.01);
});

// 4. Every model in the table produces a positive, finite cost.
check("compareModels returns one sane row per model", () => {
  const rows = compareModels({ inputTokens: 500, taskType: "draft", runsPerDay: 5 });
  assert.strictEqual(rows.length, Object.keys(MODELS).length);
  for (const r of rows) {
    assert.ok(Number.isFinite(r.costPerRun) && r.costPerRun > 0, r.model);
  }
});

console.log(`\n${passed}/4 checks passed — the Token Estimator engine works.`);
