/**
 * accuracy.mjs — the honesty test. Run:  node test/accuracy.mjs
 * (one-time setup: npm install — pulls the gpt-tokenizer devDependency)
 *
 * Counts the golden set (test/golden.json: ten texts — prose, code, JSON,
 * numbers, French, SAP text) three ways: the app's heuristic, the real
 * o200k_base tokenizer, and cl100k_base. Prints the heuristic's error so
 * nobody has to take the counts on faith. Claude's tokenizer is not
 * public; its ground truth was measured through the Anthropic API
 * (usage.input_tokens on real calls) and is recorded in ACCURACY.md.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const core = require("../src/token-core.js");

let encO, encC;
try {
  ({ encode: encO } = await import("gpt-tokenizer/encoding/o200k_base"));
  ({ encode: encC } = await import("gpt-tokenizer/encoding/cl100k_base"));
} catch {
  console.error(
    "gpt-tokenizer is not installed. Run:  npm install\n" +
      "(It is a devDependency used only by this test.)"
  );
  process.exit(2);
}

const golden = JSON.parse(readFileSync(new URL("./golden.json", import.meta.url)));
console.log(
  "id".padEnd(5) + "kind".padEnd(19) + "heuristic".padStart(10) + "o200k".padStart(7) + "cl100k".padStart(7) + "error".padStart(7)
);
let worst = 0;
for (const g of golden) {
  const h = core.countTokensHeuristic(g.text, "gpt-6");
  const o = encO(g.text).length;
  const c = encC(g.text).length;
  const err = Math.round(((h - o) / o) * 100);
  worst = Math.max(worst, Math.abs(err));
  console.log(
    g.id.padEnd(5) +
      g.kind.padEnd(19) +
      String(h).padStart(10) +
      String(o).padStart(7) +
      String(c).padStart(7) +
      ((err >= 0 ? "+" : "") + err + "%").padStart(7)
  );
}
console.log(
  `\nWorst heuristic error on the golden set: ${worst}%. ` +
    "That is why GPT-family counts go exact when a real tokenizer is wired in " +
    "(setExactCounter), and everything else is labelled an estimate."
);

// And the wired-in path must agree with the tokenizer exactly:
core.setExactCounter((t) => encO(t).length);
for (const g of golden) {
  if (core.countTokens(g.text, "gpt-6") !== encO(g.text).length)
    throw new Error("exact path disagrees with the tokenizer on " + g.id);
}
console.log("Exact path verified: wired-in counts match o200k_base on all 10 texts.");
