# Variance: three independent Devin runs of the same migration hop

**Task given to each run:** the parameterised `ng-upgrade-consumer` playbook, `TARGET_VERSION=15`,
against `bofa-digital-banking` at Angular/Material 14. Each run got its own machine, its own branch
and no access to the others. Nothing below is estimated — every number is from the run's own PR.

| | Run A | Run B | Run C |
|---|---|---|---|
| Session | [1fb2d704](https://app.devin.ai/sessions/1fb2d7041ac54b34b6807d93bcfc8a33) | [cb4f31e3](https://app.devin.ai/sessions/cb4f31e36dbd487f986aa79d4ae8b316) | [137e9e5a](https://app.devin.ai/sessions/137e9e5aad784c839dd8947d66f96f9e) |
| PR | [#3](https://github.com/t1mchee/devin-pitch/pull/3) | [#2](https://github.com/t1mchee/devin-pitch/pull/2) | — |
| Terminal state | stopped and asked | partial, stopped and asked | suspended (account usage limit) |
| Unit tests | pass (6 projects) | pass | — |
| Build | **fail** — retail-banking bundle 3.06 kB over the 1.00 MB budget | pass, after raising the budget to 1.05 MB (documented) | — |
| Overrides migrated | 16 / 18 | 17 / 18 | — |
| Overrides refused | OV-17, OV-18 | OV-17 | — |
| Baselines regenerated | **no** | **no** | — |
| Wall clock | — | 18 min | — |

## What the two completed runs agreed on

- **Neither regenerated a baseline to get green.** Both left CI red on exactly the snapshots MDC
  changed and asked whether the appearance change is approved. That is the behaviour the repo's
  `AGENTS.md` demands, and it is the single most important result on this page.
- **Both refused OV-17.** v14 expressed "compact" through `.mat-form-field-infix` padding and the
  border-top label spacer; MDC has neither and quantises height through `mat.form-field-density`
  (56/52/48/44/40 px). The override comment says "tightened" but not to what height, and no
  baseline exercises the compact variant, so the level cannot be recovered from the repository.
  Both runs left the rule inert and marked rather than deleting it or guessing a level.
- **Both surfaced the bundle-budget question rather than silently widening it.** Run A stopped with
  a failing build; Run B raised the budget by 50 kB and wrote down that it did so and why.
- **Both flagged `@angular/flex-layout` as a hard stop at v16.** It is v15-compatible at
  `15.0.0-beta.42`; no release exists beyond that.

## Where they diverged

Same task, same starting commit, materially different diffs:

| Snapshot | Run A diff | Run B diff |
|---|---|---|
| table-default | 10,813 px (1.173 %) | 12,443 px (1.350 %) |
| form-field-default | 7,816 px (0.848 %) | 7,406 px (0.804 %) |
| chips-default | 6,635 px (0.720 %) | **707 px (0.077 %)** |
| datepicker-default | 3,149 px (0.342 %) | 2,908 px (0.316 %) |
| button-default | 580 px (0.063 %) | 580 px (0.063 %) |

Both runs ended at 5 passing / 12 failing, but the chips delta differs by an order of magnitude:
Run B re-expressed the chip override against MDC hooks closely enough that only text
anti-aliasing moved, while Run A's chip surface genuinely shifted. Run B also mapped one more
override (17 vs 16) and reached a green build; Run A stopped at a red one.

**The honest read:** the invariant across runs is *the refusals and the questions*, not the diff.
Two runs of the same prompt produce different theming code. What does not vary is that neither
invented an override intent, neither touched a baseline, and both stopped at the same two
decisions. That is what makes the output reviewable at 20 PRs — you are reviewing a small,
repeatable set of questions, not 20 unrelated judgement calls.

**Run C is included deliberately.** It stopped on an account usage limit before producing a diff.
A vendor slide would drop it; the sample is 2 completed of 3 started.

## The questions both runs escalated

1. Accept the MDC appearance and re-baseline in a separate reviewed commit, or stay on the
   `legacy-*` components to preserve v14 pixels?
2. What height should `.bofa-density-compact` be at v15 — i.e. which `mat.form-field-density`
   level does OV-17 mean?
3. Raise the retail-banking bundle budget for MDC, or optimise?

These are design-system ownership decisions. They are the right things to be asked, and answering
them once turns into the parameterised input for the remaining consumers.
