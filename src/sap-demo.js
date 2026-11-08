/**
 * sap-demo.js — the SAP & Transformation edition, from the command line:
 *   node src/sap-demo.js
 * Every SAP task, estimated on two models at a working volume.
 */

const { SAP_TASKS, estimateSapTask } = require("./domain-sap");

const RUNS = 10;
console.log(`SAP & TRANSFORMATION EDITION — ${SAP_TASKS.length} tasks, ${RUNS} runs/day each\n`);
console.log(
  "ID".padEnd(8) + "Task".padEnd(46) + "GPT-6 $/mo".padStart(12) + "Haiku 5.5 $/mo".padStart(16)
);
for (const t of SAP_TASKS) {
  const g = estimateSapTask(t.id, "gpt-6", RUNS).estimate;
  const h = estimateSapTask(t.id, "claude-haiku-5-5", RUNS).estimate;
  console.log(
    t.id.padEnd(8) +
      t.name.slice(0, 44).padEnd(46) +
      ("$" + g.costPerMonth.toFixed(2)).padStart(12) +
      ("$" + h.costPerMonth.toFixed(2)).padStart(16)
  );
}
console.log(
  "\nSame work, same quality bar: the model choice is a budget decision."
);
console.log("Protections and guidance for every task are in src/domain-sap.js.");
