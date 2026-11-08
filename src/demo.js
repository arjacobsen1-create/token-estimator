/**
 * demo.js — run the engine from the command line:  node src/demo.js
 * This is the learning sandbox: change the examples, run it again,
 * and watch the numbers move.
 */

const {
  analysePrompt,
  compareModels,
} = require("./token-core");

// --- Example 1: anatomy of a typical "chat with a document" prompt ---------
const parts = {
  system: "You are a helpful assistant for a supply chain team. Answer in a professional tone. Always be concise.",
  context: "Q3 supplier report: On-time delivery fell to 87%. Two suppliers account for most delays. Freight costs rose 12% quarter over quarter. The Montreal DC is at 94% capacity.", // imagine pages of this
  history: "User: What happened last quarter? Assistant: Delivery slipped due to port delays. User: And the quarter before?",
  question: "Why is on-time delivery falling?",
};

console.log("PROMPT ANATOMY (GPT-6)");
console.log(analysePrompt(parts, "gpt-6"));
console.log("Notice: the question is the smallest part. The context is the bill.\n");

// --- Example 2: what does a task cost, on each model? ----------------------
const inputTokens = analysePrompt(parts, "gpt-6").total;
console.log("TASK ESTIMATE — summarise the prompt above, 200 runs/day");
for (const row of compareModels({ inputTokens, taskType: "summarise", runsPerDay: 200 })) {
  console.log(
    `${row.model.padEnd(34)} in ${row.inputTokens} / out ${row.outputTokens} tokens` +
      `  $${row.costPerRun.toFixed(4)}/run  $${row.costPerMonth.toFixed(2)}/month`
  );
}
console.log("");
