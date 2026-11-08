# Token Estimator

An app that estimates how many tokens an AI task will use — and helps you use fewer.

You paste a prompt (or describe a task), and it tells you:

1. **How many tokens** the input is, per model
2. **Where they sit** — system prompt vs. context vs. history vs. your actual question
3. **What the reply will probably cost** — predicted output tokens by task type
4. **What it costs at volume** — per run, per day, per month, per model

## Why

Tokens are the meter running underneath every AI product. The next decade of AI
economics is about token minimising: doing the same work for fewer tokens.
This app makes the meter visible.

## Project layout

```
src/
  token-core.js      The engine: counting, anatomy, estimation.
                     Heavily commented — this is the file to learn from.
  model-suggester.js "What to use for what": a task-to-model recommender
                     (trait table + task weights + scoring). Also commented.
  demo.js            Run it:  node src/demo.js
  suggest-demo.js    Run it:  node src/suggest-demo.js
LEARNING.md          Lesson notes. Start here if you're learning to code this.
```

## Running it

You need Node.js (v18+). No dependencies for the core demo.

```bash
node src/demo.js
```

## Status

Public prototype, in development. A working prototype also exists as a web app;
this repo is the real codebase that will be packaged for the App Store.

## Python version

The same engine in Python lives in `python/` — `token_core.py`,
`model_suggester.py`, `domain_sap.py` — held to the JavaScript engine's
numbers by a parity check (counts, estimates, suggestions and all 21 SAP
tasks compared value for value during the port).

```
python3 python/test_smoke.py   the proof the port works (6 checks)
python3 python/sap_demo.py     the SAP edition, priced on two models
```

The JavaScript engine remains the one that powers the live web demo —
the browser runs JavaScript natively, with no server.

## SAP & Transformation edition

The domain edition lives in `src/domain-sap.js`: 21 shapes of SAP work
(Run, Build, Transform), each with a typical input size, guidance, and the
protection to apply before pasting anything into a model. The human-readable
list is [SAP-TASKS.md](SAP-TASKS.md). Built from public SAP work shapes
only — no client input, no ticket content, no system data.

```
node src/sap-demo.js      the whole edition, priced on two models
node test/sap-edition.js  the proof the edition is sound (3 checks)
```

## Accuracy

Counts are not taken on faith. The counter is measured against the real
tokenizers on a golden set, the errors are published in
[ACCURACY.md](ACCURACY.md), GPT-family counts go exact when a real
tokenizer is wired in (the live demo loads one), and every other count
is labelled an estimate with its measured error.


## What this measures, and what it doesn't

**It measures**

- **Input tokens** — the material handed to the model, counted. Exact for GPT
  models when the real o200k_base tokenizer is wired in (the live demo loads
  one); labelled estimates for other models, with the measured error published
  in ACCURACY.md.
- **Predicted output tokens** — forecast from the type of task (summarise
  ~0.2x the input, extract ~0.3x, draft ~1.5x, code ~2x, classify a fixed
  short label). A forecast, not a meter reading.
- **Cost** — input plus predicted output, at the selected model's price, at
  your volume. Prices are editable defaults; verify before relying on a figure.
- **For the SAP & Transformation edition** — 21 generic shapes of SAP work
  with typical input sizes, published in SAP-TASKS.md. Built from public SAP
  work shapes only: no client data, no system data.

**It doesn't measure**

- **Quality.** A cheaper run is not a better run; nothing here scores the answer.
- **Actual consumption.** Only a metered bill or platform telemetry proves
  what a workload really used.
- **Vendor consumption units** (SAP AI Units and the like). Vendors set
  conversion rates per scenario; this measures the token driver underneath,
  which is what every basis converts from.
- **Business value.** Whether a task was worth doing at all stays a human decision.

**If you pay a flat subscription**, read the dollar figures as an
API-equivalent yardstick: they size and compare workloads and show what burns
the allowance you already bought. **If you pay per token or in consumption
units**, they are a direct forecast.

**Channel note.** The tool prices the work, not the channel. Joule, Joule
Studio skills, in-tenant agents, third-party plugins and direct APIs all
consume the same tokens. Governance differs sharply by channel — Joule runs
inside the tenant under the user's own authorisations; external plugins take
data outside that boundary — so anonymise before anything leaves the tenant.
The protections list in SAP-TASKS.md is the checklist.

## Live demo

**https://arjacobsen1-create.github.io/token-estimator/** — the app running in your browser, on the same engine as `src/`.

## Verify it works

```
node test/smoke.js
```

Four checks, including the ones that encode this project's lessons. If they
pass, the engine works. The command-line demo is `node src/demo.js`.

## A note on prices

Model prices in `src/token-core.js` are editable defaults, marked as such.
Always verify against the provider's current pricing page before relying on
a cost figure — prices change often.

## A note on counting

Counting runs two ways. By default the engine uses a calibrated heuristic.
When a real tokenizer is wired in — the live demo loads o200k_base in the
browser — GPT-family counts are exact. Other models' tokenizers are not
public, so their counts stay estimates; the heuristic was measured against
the real tokenizers on a golden set and the full error table is published
in ACCURACY.md (short prose within about ±12%, code and JSON much worse,
which is exactly why the exact path exists). The Python port wires in
tiktoken the same way.
