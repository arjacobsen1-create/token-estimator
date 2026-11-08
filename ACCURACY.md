# Accuracy — how the counts are checked, and how wrong the estimate is

The founder's rule for this project: a token count must not be an
arbitrary number. So the counter is measured, in the open, against the
real tokenizers.

## Method

A golden set of ten texts (`test/golden.json`): a short question, a
wordy prompt, SAP incident text, code, JSON, a bullet list, numbers and
dates, French, a long prose paragraph, and a tiny prompt. Each text is
counted by:

- the app's built-in heuristic (characters blended with word count),
- the real **o200k_base** tokenizer (GPT family) — `node test/accuracy.mjs`,
- the real **cl100k_base** tokenizer, for comparison,
- **Anthropic's own count**, taken from `usage.input_tokens` on real
  Messages API calls (Haiku, 2026-11-08). The API adds about 7 tokens of
  message formatting per call; the table shows content-only counts
  (API count minus that overhead).

## Results (2026-11-08)

| Text | Heuristic | o200k real | Error | Heuristic (Claude rates) | Claude real (content) | Error |
|---|---|---|---|---|---|---|
| Short question | 7 | 7 | 0% | 7 | ~8 | −12% |
| Wordy prompt | 105 | 80 | +31% | 106 | ~80 | +32% |
| SAP incident text | 81 | 83 | −2% | 82 | ~93 | −12% |
| Code | 57 | 88 | −35% | 58 | ~104 | −44% |
| JSON | 21 | 51 | −59% | 21 | ~55 | −62% |
| Bullet list | 43 | 40 | +8% | 43 | ~41 | +5% |
| Numbers and dates | 27 | 52 | −48% | 28 | ~58 | −52% |
| French | 30 | 29 | +3% | 30 | ~46 | −35% |
| Long prose | 193 | 147 | +31% | 196 | ~154 | +27% |
| Tiny prompt | 4 | 4 | 0% | 4 | ~4 | 0% |

## What the engine does about it

- **GPT family: exact.** The tokenizer is public, so the engine accepts
  a real counter via `setExactCounter()` and uses it whenever one is
  wired in. The live demos load the o200k_base tokenizer and count GPT
  models exactly; the Python port does the same with `tiktoken` when
  installed. The accuracy test verifies the wired-in path matches the
  tokenizer on every golden text.
- **Claude and other models: labelled estimates.** Their tokenizers are
  not public, so no honest exact count exists client-side. Counts for
  them carry the measured error above: fine for short prose and lists,
  up to ~30% high on long prose, and 35–60% low on code, JSON, numbers
  and (for Claude) French. Exact Claude counts are available only
  through Anthropic's API.
- Output prediction remains a prediction by nature. It is reported as a
  range, never a point figure (see the Minimiser).

Any price derived from an estimated count inherits its error. The apps
say which counts are exact and which are estimates, on screen, rather
than letting a guessed number wear the clothes of a measured one.
