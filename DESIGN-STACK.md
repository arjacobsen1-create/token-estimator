# Token Estimator — the stack: product integration specification, v1

Status: product structure DECIDED by Anahita in her own words,
2026-11-08 ("I don't want to separate app. I think it has to fold
under it and then [makes] it more meaningful"). SPEC APPROVED by her
the same day, all three recommendations in §6 accepted as written:
(1) module in Estimator cobalt/cyan, standalone keeps lavender,
shared logic underneath; (2) standalone repo and site retained
public, no delete/archive/redirect yet; (3) the standalone Minimiser
launch video concept is RETIRED, that version is not to be
published, assets preserved for a future complete-product launch.
Build approved with her added requirements: no existing Minimiser
functionality may disappear in the consolidation; JS/Python parity
and regression checks must pass before publication; PUBLIC
DEPLOYMENT REMAINS A SEPARATE APPROVAL GATE.
Origin: her stacking question + the GPT proposal she adopted
(`~/workspace/token-apps/stack-proposal-note-2026-11-08.md`).

## 1. The product

**Token Estimator — AI cost planning and optimisation.** One product,
three modules, one pricing engine:

- **Estimator** — forecast token consumption and cost (incl. Suggester
  and the domain editions).
- **Workflows** — forecast multi-step agent costs.
- **Minimiser** — reduce prompt size, cap the reply, re-estimate.

The loop the product teaches: **Estimate → Minimise → Re-estimate →
Run.** Run means the user copies the optimised prompt into their own
AI system. The boundary does not move: forecasting and preparation
only. No API execution, no live budget enforcement, no autonomous
routing, no orchestration engine. Estimated savings are never
presented as measured savings.

## 2. The shared engine (guardrail)

Never two implementations to maintain. Today each app carries its own
core file with its own MODELS table; the tables are identical since
the 2026-11-08 audit, but identical-by-discipline is not shared.

Spec: one canonical pricing + counting source
(`src/shared-models.js` + `python/shared_models.py`) from which both
engines take MODELS, charsPerToken and the counting method. The
Minimiser's intervention logic (strategies, control levels, output
prediction) and the Estimator's forecasting logic (tasks, workflows,
suggester) stay in their own modules on top of it. The Pages sites
keep the inline pattern: the shared source is generated into each
page at publish time, byte-identical, verified by script — the same
discipline the dashboard inline sync already uses.

Acceptance: both test suites pass unchanged in what they assert
(Estimator 157, Minimiser 8), plus a new parity test that fails if
the two engines' price tables ever differ again.

## 3. Stage 1 — the Minimiser becomes a module

- The Estimator dashboard gains a third module beside Estimator /
  Workflows: **Minimiser**. The app front gains the same entry.
- The module is the existing Minimiser tool, unchanged in behaviour:
  prompt in, task detected, control level (gentle / balanced /
  aggressive), before/after totals with the output cap, API-equivalent
  vs subscription framing, copy-out of the minimised prompt.
- It runs on minimiser-core, inlined as today, priced from the shared
  table (Stage 2 of the engine work in §2 can land with or before
  this; the module must not ship on a copied price table).
- The dashboard's current external Minimiser link is replaced by the
  internal module tab.
- Design decision for Anahita (see §6): inside the Estimator product
  the module wears the Estimator design system (Cobalt & Cyan). The
  standalone Minimiser site keeps her lavender design untouched.

## 4. Stage 2 — connect the calculations (spec only at this stage)

- An **Optimise this estimate** action on an Estimator result passes
  model, prompt and task type into the Minimiser module, pre-filled.
- The Minimiser returns the minimised prompt and its predicted
  output; the Estimator presents the comparison as the product's
  headline output: **Original estimate → Optimised estimate →
  Expected savings**, labelled estimated throughout.
- Workflows: the hand-off may offer "use the minimised prompt as the
  starting context" (reduces C0). It must not silently reduce the
  growth-per-step figure A: tool results are not the prompt, and
  replies shrink only if an output cap is actually applied — any
  reduction of A is a separate, labelled assumption.

## 5. Repos, sites, and Google Play

- Recommendation: both repos stay public. The Estimator repo becomes
  the product (and is the Google Play candidate, Route 2, as already
  sequenced). The Minimiser repo remains the standalone tool in her
  lavender design, its README noting it is also a module of the
  Estimator. Archive-or-fold of the repo is a later decision, taken
  only after Stage 1 is live and reviewed. Nothing is deleted.
- Play listing shape: one app, three capabilities (Estimate,
  Workflows, Minimise), one pricing engine. Mobile layout is a
  separate design pass (vertical input-and-results), not part of
  Stage 1.

## 6. Decisions this spec needs from Anahita

1. Module design: Estimator Cobalt & Cyan inside the product
   (recommended), lavender kept for the standalone site only — or
   lavender carried into the module?
2. Standalone Minimiser repo: stays public as-is for now
   (recommended), with the fold noted in its README.
3. The parked standalone Minimiser launch (video + post): the fold
   likely supersedes a separate product launch. Parked stays parked
   until she rules; no posting this week stands regardless.

## 7. What does not change

Both engines' calculations and published figures; ACCURACY.md; the
SAP edition's provenance ("written from public information only");
the MIT licences; the Minimiser's tagline, which becomes the
module's: "Use fewer tokens. Preserve the intent."

## 8. Build status (2026-11-08, local only — NOT published)

Built in the approved order, all of it local; public deployment
still waits for Anahita's separate approval.

- **Shared engine (§2): done.** `src/shared-models.js` +
  `python/shared_models.py` are the one pricing/counting source;
  both cores consume them; byte-identical copies in both repos,
  kept in sync by `~/workspace/token-apps/sync-inline.py`. Parity
  tests (`test/shared-parity.js`, `python/test_shared_parity.py`)
  fail if the copies or the engines' tables ever differ.
- **Stage 1 (§3): done.** The Minimiser is a native module of the
  Estimator dashboard in cobalt/cyan, full standalone functionality
  preserved (prompt in, task detection, control levels, before/after
  totals with output cap, API-equivalent framing, copy-out, the
  playbook, the tiny-prompt lesson). The dashboard's external link
  became the internal module tab; the app front's nav points to it.
- **Stage 2 (§4): done.** Two hand-offs, both labelled estimated:
  (a) on the app front, **Optimise this estimate** minimises the
  prompt as sent (system + context + question) and presents
  Original → Optimised → expected saving with the optimised prompt
  to copy; (b) in the dashboard, **Use as Workflows starting
  context** sets Workflows C0 to the minimised prompt's token
  count — C0 only; the growth per step A is never touched.
- **Verification:** suites green — Estimator 165 checks (JS 80,
  SAP 3, Python 82), Minimiser 4/4 JS + 4/4 Python. Rendered checks
  confirm the module and both hand-offs reproduce the engines'
  figures exactly, no page errors.
