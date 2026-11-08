/**
 * suggest-demo.js — run the suggester:  node src/suggest-demo.js
 * Try changing the priorities and watch the picks change.
 */

const { suggest, priceOn } = require("./model-suggester");

function show(taskId, priority, priceArgs) {
  const s = suggest(taskId, priority);
  console.log(`TASK: ${s.task}  (priority: ${s.priority})`);
  console.log(`  USE:        ${s.pick.label} — ${s.pick.reasons.join("; ")}`);
  console.log(`  RUNNER-UP:  ${s.runnerUp.label} — ${s.runnerUp.reasons.join("; ")}`);
  if (priceArgs) {
    const p = priceOn(s.pick.id, ...priceArgs);
    console.log(
      `  On the pick: $${p.perRun.toFixed(4)}/run, $${p.perMonth.toFixed(2)}/month at volume`
    );
  }
  console.log("");
}

// Coding, quality first — and what 500 runs/day costs on the pick.
show("code", "quality", [800, 1600, 500]);
// Classification at serious volume — cost rules.
show("classify", "cost", [300, 10, 10000]);
// Computer use — the specialist wins.
show("computer-use", "balanced");
// Long documents on a budget.
show("long-document", "cost");
