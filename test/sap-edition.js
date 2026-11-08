/**
 * sap-edition.js — proof the SAP edition is sound. Run: node test/sap-edition.js
 */
const assert = require("node:assert");
const { TASK_TYPES } = require("../src/token-core");
const { SAP_TASKS, estimateSapTask } = require("../src/domain-sap");

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log("PASS  " + name);
}

check("at least 18 SAP tasks across Run, Build and Transform", () => {
  assert.ok(SAP_TASKS.length >= 18, `only ${SAP_TASKS.length}`);
  for (const area of ["Run", "Build", "Transform"])
    assert.ok(SAP_TASKS.some((t) => t.area === area), "missing area " + area);
});

check("task IDs are unique and every task is complete", () => {
  const ids = new Set(SAP_TASKS.map((t) => t.id));
  assert.strictEqual(ids.size, SAP_TASKS.length);
  for (const t of SAP_TASKS) {
    assert.ok(t.name && t.guidance && t.protection, t.id);
    assert.ok(t.typicalInputTokens > 0, t.id);
    assert.ok(TASK_TYPES[t.taskType], `${t.id} uses unknown type ${t.taskType}`);
  }
});

check("every SAP task estimates to a positive, finite cost", () => {
  for (const t of SAP_TASKS) {
    const { estimate } = estimateSapTask(t.id, "gpt-6", 10);
    assert.ok(Number.isFinite(estimate.costPerMonth) && estimate.costPerMonth > 0, t.id);
  }
});

console.log(`\n${passed}/3 checks passed — the SAP & Transformation edition works.`);
