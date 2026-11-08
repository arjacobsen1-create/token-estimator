# Token Estimator — Workflows mode: calculation specification, version 3

Status: APPROVED by Anahita in her own words, 2026-11-08, and BUILT the
same day: estimateWorkflow in src/token-core.js and python/token_core.py,
golden tests in both engines, dashboard mode rendered and verified
against the examples below. A pricing audit followed on 2026-11-08: the
live price table was corrected to the providers' published prices, the
worked examples below were kept as labelled historical-rate regression
cases, and she approved publishing the updated web version, this
document included, once both engines passed (157 checks in all) and the
dashboard showed the corrected figures.
Origin: Vortex Cloud & FinOps comment, 2026-11-08 (FEEDBACK.md).
Reviews: V1 and V2 were externally reviewed; every correction from both
reviews is incorporated or answered below.

## What it is

A second mode in the dashboard. The Estimator prices tasks; Workflows
prices multi-step agent runs. Name: **Workflows**, subtitle "Multi-step AI
cost forecasting." Principle: forecast the cost of the workflow
architecture, not merely the number of tokens in an individual prompt.

The comparison throughout: **same model and task configuration,
different execution assumptions.** The baseline is a cost-only reference.
It is not a functionally equivalent way to run the work: in the baseline,
later steps cannot use what earlier steps found.

## Inputs

- Model (prices Pin / Pout per million tokens, from the tool's table).
- N: steps in the run.
- C0: starting context. The instruction plus the first step's retrieved
  pack. Presets (illustrative, not benchmarks): 2,000 / 6,000 / 20,000.
- A: history added by one step: its additional retrieval, tool results,
  and its reply. The reply is billed as output when produced and again as
  input when resent as history; that resending is what this mode prices.
  Presets: 800 / 1,500 / 4,000. (In the presets, A is always larger than
  the reply size R, as it must be, since the reply is part of A.)
- R: reply size per step, predicted by task type as the Estimator does.
- Reasoning allowance T: optional, off by default, user-set tokens per
  step, priced as output where the provider bills reasoning as output.
- f: retry rate, the share of step calls that fail and are resent.
- Caching: toggle, off by default (specification below).
- Runs per day, days per month. Monthly figures are expected spend,
  not a guaranteed bill.
- Optional: the model's context window, used only for the limit check.

## The calculation, exactly

Steps are numbered k = 1..N. Timing rule: a step's material joins the
history AFTER its call completes, and is first resent by the NEXT call.

Main call at step k: sends ctx_k input tokens; receives R (+ T if set)
output tokens. One call costs ctx_k × Pin + (R + T) × Pout.

- **Baseline:** ctx_k = C0 for every k. No retries.
  Total = N × (C0 × Pin + R × Pout).
- **Full carry:** ctx_k = C0 + A × (k − 1).
- **Windowed (window 3):** each call carries the starting context plus at
  most the two most recent steps of history:
  ctx_k = C0 + A × min(k − 1, 2).
- **Summarised (incremental):** the history is carried as a running
  summary of size S = 0.30 × A per step of history:
  ctx_k = C0 + S × (k − 1).
  After each step j (j = 1..N − 1), one summarising call on the fast
  tier: input = previous summary S × (j − 1) + the step's new material A;
  output = updated summary S × j. Previous summary plus newest step
  produces the updated summary. Summary calls are priced separately,
  reported as their own line, and are not retried in this model.

**Retries** apply to the main calls: total main cost × 1 / (1 − f).
Assumptions, stated on screen: a failed call is billed in full, and a
step is retried until it succeeds.

**Caching (idealised cache reuse).** When the toggle is on:
- Full carry, step k ≥ 2: the prefix C0 + A × (k − 2), everything the
  previous call already sent, is priced at 0.10 × Pin; the rest at Pin.
- Baseline: C0 is priced at the cache rate for steps 2..N.
- Summarised: caching applies to C0 only. The summary changes every
  step, so it is not a stable prefix.
- Windowed: no cache benefit. The shifting window breaks prefix
  stability.
Labelled on screen as idealised: real hit rates depend on the provider,
prefix eligibility and minimums, cache creation charges and expiry,
which this mode does not simulate.

**Context limit check.** If a context window is set and any step's
ctx_k exceeds it, the screen flags it: the run as designed cannot
execute on that model.

**"What you give up" lines.** Full carry: maximum history retention,
subject to context limits. Summarised: detail is compressed; some of it
will be lost. Windowed: older context is omitted; steps can repeat or
contradict earlier work. Lower cost does not establish equivalent
quality, completeness or reliability. This mode measures none of those.

## Proof: Example A reconciles, step by step

**Rates label (added 2026-11-08, on the record):** the worked examples in
this section were computed at the illustrative rates in force when this
specification was written, frontier $5 / $25 per M and fast tier $1 / $5.
They are kept, labelled as such, as arithmetic regression cases: the test
suites reproduce them exactly through an explicit price override. They
are NOT current prices. A pricing audit on 2026-11-08 corrected the live
table to published prices (GPT-6 Sol $2 / $10; Claude Haiku 5.5
$0.10 / $0.50), and the same examples are also tested at live prices:
Example A baseline $0.078, full carry $0.129; Example B baseline $0.216,
full carry $0.607, summarised $0.382 (its premium falls to ×1.77 because
the summary calls ride the corrected fast tier). The specification below
is rate-independent; only the illustrations carry the historical rates.

GPT-6 prices (Pin $5, Pout $25 per M, illustrative rates, see above).
C0 4,000, A 1,500, N 6, R 500, retries 5%, caching off, full carry.

| Step | Context sent | Step cost |
|---|---|---|
| 1 | 4,000 | $0.0325 |
| 2 | 5,500 | $0.0400 |
| 3 | 7,000 | $0.0475 |
| 4 | 8,500 | $0.0550 |
| 5 | 10,000 | $0.0625 |
| 6 | 11,500 | $0.0700 |
| Sum | | $0.3075 |
| With retries (× 1 / 0.95) | | **$0.324** |

All modes, Example A: baseline $0.195, full $0.324 (×1.66),
windowed $0.276 (×1.42), summarised $0.287 (×1.47), of which the summary
calls are $0.046. At 200 runs/day × 30 days: baseline $1,170 expected
monthly spend, full carry $1,942.

Example B (C0 6,000, A 2,500, N 12, R 600, retries 10%): baseline
$0.540, full $1.517 (×2.81), windowed $0.892 (×1.65), summarised $1.191
(×2.21), summary calls $0.316 of it. Monthly at 200/day: $3,240 vs
$9,100. Caching on, Example B: full carry $0.499 against a cached
baseline of $0.243 (×2.05).

**Build gate:** these two examples are the engine's golden tests. The
JavaScript and Python implementations must reproduce every figure on
this page exactly before any screen is built.

## What it does not do

No infrastructure costs (GPUs, networking, egress). No live measurement.
No quality or reliability measurement. No provider-specific caching
simulation. No orchestration, telemetry or extra carry strategies in
this release.

## Decisions (approved in review; Anahita to confirm)

1. Name: Workflows, subtitle as above.
2. Reasoning allowance: included, optional, off by default, user-sized.
3. Presets: kept, labelled illustrative, custom values allowed.
