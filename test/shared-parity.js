/**
 * shared-parity.js — the stack guardrail, as a test.
 *
 * The Estimator and the Minimiser draw prices and counting from ONE
 * canonical module (src/shared-models.js). This test fails if:
 *  1. the shared copies in the two repos differ by a single byte
 *     (checked when the sibling repo is present on this machine);
 *  2. either engine's MODELS table differs from the shared table;
 *  3. the two engines ever count the same text differently.
 *
 * Run: node test/shared-parity.js
 */

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const shared = require("../src/shared-models.js");
const core = require("../src/token-core.js");

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log("PASS  " + name);
}

check("estimator engine prices from the shared table", () => {
  assert.deepStrictEqual(core.MODELS, shared.MODELS);
});

const minimiserPath = path.join(
  __dirname, "..", "..", "token-minimiser-app", "src", "minimiser-core.js"
);
const minimiserSharedPath = path.join(
  __dirname, "..", "..", "token-minimiser-app", "src", "shared-models.js"
);

if (fs.existsSync(minimiserPath)) {
  const minimiser = require(minimiserPath);
  check("minimiser engine prices from the shared table", () => {
    assert.deepStrictEqual(minimiser.MODELS, shared.MODELS);
  });
  check("both engines count identically", () => {
    const samples = [
      "Why is delivery falling?",
      "Please summarise the attached quarterly report and draft a reply to the supplier.",
      "const x = {a: 1, b: [1,2,3]}; function f() { return JSON.stringify(x); }",
      "12345 67890 24680 13579 99999 11111 22222 33333",
      "",
    ];
    for (const modelId of Object.keys(shared.MODELS)) {
      for (const text of samples) {
        assert.strictEqual(
          core.countTokens(text, modelId),
          minimiser.countTokens(text, modelId),
          `${modelId}: ${JSON.stringify(text.slice(0, 24))}`
        );
      }
    }
  });
} else {
  console.log("SKIP  minimiser repo not present on this machine");
}

if (fs.existsSync(minimiserSharedPath)) {
  check("shared-models.js copies are byte-identical across repos", () => {
    const a = fs.readFileSync(path.join(__dirname, "..", "src", "shared-models.js"));
    const b = fs.readFileSync(minimiserSharedPath);
    assert.ok(a.equals(b), "shared-models.js differs between repos — edit the canonical copy and re-sync");
  });
}

console.log(`\n${passed} checks passed — one price table, one counter, both engines.`);
