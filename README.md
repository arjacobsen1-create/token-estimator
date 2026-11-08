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

Version 1 counts tokens with a calibrated heuristic (see LEARNING.md, Lesson 1).
The production step is swapping in each model's real tokenizer — that's
Lesson 2, and the code is shaped so the swap is one function.
