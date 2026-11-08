# Learning notes

These notes grow as the app is built. Each lesson explains one idea the code
uses, in plain English, with an exercise. Ask Muse about any line, any time.

---

## Lesson 1 — What is a token, and how do you count one?

A **token** is the chunk of text a model actually reads. Models don't read
letters or words; they read tokens. Common words are one token ("the", "cat").
Rare words, code, and punctuation get split into several.

Rules of thumb for English prose:

- ~4 characters ≈ 1 token
- ~0.75 words ≈ 1 token (so 100 words ≈ 130 tokens)

Why it matters: **you are billed per token**, in and out — and output tokens
(the model's reply) usually cost 3–5x more than input tokens.

Each model family slices text slightly differently (its **tokenizer**), which
is why this app counts per model. Code and JSON slice "worse" (more tokens)
than plain prose, because of all the brackets, quotes and indentation.

### How our counter works (v1)

`countTokens()` in `src/token-core.js` uses the character rule with a
per-model adjustment factor. It's a **heuristic** — close, not exact.
Good enough to compare prompts and spot waste. Not good enough for billing.

### The production version

Real apps call the model's actual tokenizer (for OpenAI models, the
`tiktoken` / `gpt-tokenizer` library runs the exact same slicing, free and
offline). Swapping it in means replacing one function — the rest of the app
doesn't change. That's a design principle worth learning: **isolate the part
that will change.**

### Exercise

Run `node src/demo.js`. Then paste the same sentence into the demo three ways:
as a sentence, as JSON, and as a list. Watch the token counts and ask yourself
why JSON costs more. (Answer: structure characters are tokens too.)

---

## Lesson 2 — Predicting the tokens you can't count yet

*(Coming with the estimator: output ratios by task type, and why a summary
is predictable but a chat isn't.)*

---

## Lesson 3 — A suggester is a table plus weights

The model suggester (`src/model-suggester.js`) recommends which model to
use for which task. There's no AI inside it. It's three lists and one sum:

1. **Traits** — every model scored 1–5 on quality, speed and cheapness,
   plus the tasks it's known to be strong at.
2. **Weights** — every task says how much each trait usually matters
   (classification at volume: cheapness rules; code: quality rules).
3. **Score** — traits × weights, plus a bonus when the task is one of the
   model's known strengths. Highest score wins; the app shows its working.

Why build it this way instead of asking an AI "which model is best"?
Because a table can be **inspected, argued with, and fixed**. When it
picks wrong, you can see exactly which score caused it. And it will need
fixing: the model landscape changes monthly, so the table carries a date
(October 2026) and updating it is a regular chore — like prices.

Watch it happen: run `node src/suggest-demo.js`, then change one trait —
say, drop Mercury 3's quality score — and run it again. The classification
pick may flip. That sensitivity is the lesson: **a recommender is only as
good as its table, and its table is always going stale.**
