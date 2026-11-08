# Token Estimator — field feedback and build candidates

Local only. Not published. Captured at Anahita's instruction; nothing here is a
committed build. Each entry: what was said, by whom, and what it would take to
build on it.

## 2026-11-08 — Vortex Cloud & FinOps (LinkedIn comment on the launch post)

Post: https://www.linkedin.com/feed/update/urn:li:activity:7525246321704730624/
Post had 66 impressions when the comment landed (~25 min after publishing).

What they said (verbatim):

"Moving from AI experiments to predictable AI unit costs is the #1 governance
hurdle for enterprise transformation leaders in 2026, Anahita—great initiative
releasing Token Estimator as open source.

Across enterprise SAP and cloud estates we audit in Europe and North America,
two hidden infrastructure multipliers frequently cause actual production AI
bills to exceed initial token estimates by 40%–65%:

01 — Unbounded Agentic Retry Loops & Context Window Bloat:
Multi-step agent workflows often pass full conversation histories and RAG
payloads on every sub-step without token circuit-breakers or semantic caching.

02 — Idle Whole-GPU Capacity & Cross-AZ Data Egress:
When teams deploy self-hosted or VPC-isolated models alongside API endpoints,
dedicating whole A100/H100 nodes instead of partitioning each physical GPU
into 7 hardware-isolated NVIDIA MIG slices—or routing vector lookups across
Availability Zones ($0.02/GB) and NAT Gateways ($0.045/GB)—silently doubles
the unit cost per workflow.

Does Token Estimator already factor in multi-turn agentic context growth, or
are you seeing teams struggle most with sizing RAG vs. reasoning token ratios?"

Note: their figures (40–65%, $0.02/GB, $0.045/GB) are their claims, unverified.

### Decomposition

IN SCOPE, buildable — their point 01 (agentic context growth):
The current engine prices single-pass tasks: one prompt, one predicted reply,
one volume. A multi-step agent run re-sends accumulated context at every step,
so input tokens compound. Candidate build ("agentic layer", Estimator v-next):
- Inputs per workflow: number of steps, starting context size, context added
  per step (fixed tokens or % growth), retry rate per step.
- Model: step k input ≈ base + growth accumulated over k steps; retries add
  expected re-runs (1 / (1 − retry rate)); output per step as today.
- Output: the workflow's total next to the naive single-pass estimate, so the
  "estimate vs reality" gap they cite becomes a visible, priced number.
- Fits the existing layer framing and the Suggester's routing logic unchanged.
- Status: CANDIDATE ONLY. Not designed, not scheduled. Anahita's gate decides.

OUT OF SCOPE, by design — their point 02 (GPU capacity, egress):
Infrastructure costs of self-hosted models are not token consumption. The
Estimator's "What this measures, and what it doesn't" boundary already covers
this class (no actual consumption, no vendor units). No build; if anything,
one clarifying line in that section someday. Their question's second half
(RAG vs reasoning ratios) is answered by the reply: the observed gap is
unsized output, which is the Minimiser's whole premise.


## Outcome (2026-11-08)

The agentic-layer candidate was designed as the Workflows mode
(DESIGN-AGENTIC.md, three review rounds), approved by Anahita in her own
words, and BUILT the same day: estimateWorkflow in both engines, 31/31
golden checks each, dashboard mode verified against the design examples.
Point 02 (infrastructure) remains out of scope by design, as answered.
