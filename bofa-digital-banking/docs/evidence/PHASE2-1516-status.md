# Phase 2 (Angular 15 → 16) — short status

Branch: `run/ph2-1516-flexlayout` → base `run/ph1-cb4f31e3-material15` (PR #5).
Companion long-form evidence: `docs/evidence/PHASE2-15-to-16.md` (per-file rationale, pixel counts,
merge reconciliation §10). This file is the terse "where I got to" note.

## (a) Where I got to — DONE, not partial

The 15→16 hop is complete and the branch is pushed. PR #5 reports **Mergeable (no conflicts)** after
reconciling the advanced base branch.

Gates (Node 18.20.8, `--skip-nx-cache`):

| gate | result |
|---|---|
| `nx run-many --target=build --all` | **6/6 pass** |
| `nx run-many --target=test --all` | **6/6 pass** (incl. base's new `card-services` consumer spec) |
| `nx run-many --target=lint --all` | **7/7 pass** (3 deliberate `any` warnings in `analytics-sdk-shim`) |
| `npm run visual` → `override-contract.cy.ts` (computed-style oracle) | **22/22 pass** — font-independent, incl. OV-01 + OV-09b |
| `npm run visual` → `design-system.cy.ts` (image snapshots) | red on a **pre-existing font substitution** (identical on the base branch); responsive-grid default/md/sm **pass**; **no baseline regenerated** |

## (b) What the flex-layout removal required

`@angular/flex-layout` has no release past `15.0.0-beta.42`, so it had to be removed, not upgraded.

- **`libs/ui-core/.../bofa-responsive-grid`** — the only *live* consumer. Read the responsive intent
  out of the directives + breakpoint suffixes + TSDoc and reproduced it 1:1 in CSS flexbox using
  flex-layout's default breakpoints (`lt-sm ≤599.98`, `lt-md ≤959.98`, `lt-lg ≤1279.98`):
  - `fxLayout row` + `.lt-md column` → `flex-direction: row` + `@media(≤959.98){column}`
  - `fxLayoutGap 16px` → `gap: 16px`; `fxLayoutAlign space-between stretch` → `justify-content`/`align-items`
  - summary `fxFlex 30 / .lt-lg 40 / .lt-md 100` → `flex:0 0 30%` + `@media(≤1279.98){40%}` + `@media(≤959.98){0 0 auto}`; detail `fxFlex` → `flex:1 1 0`; `fxHide.lt-sm` → `@media(≤599.98){display:none}`
  - Removed `FlexLayoutModule` from `ui-core.module.ts` and `@angular/flex-layout` from `package.json`.
  - **Proven unchanged:** 0-pixel diff vs the old flex-layout render in the same docker container at
    default/md/sm; CDP geometry matches the contract (1280→summary 288/detail 656 + 16 gap; <1280→40%;
    <960→stacked 704; <600→detail hidden); the committed `responsive-grid-*` baselines PASS in CI.
- **`apps/card-services/.../cards.component`** — its `fx*` attributes were **inert** (the app never
  imported `FlexLayoutModule`, so they rendered as plain block divs). Removed them; rendering is
  unchanged. The base branch later added a consumer spec that imported `FlexLayoutModule`, which
  forced this cleanup so the workspace compiles with the dependency gone. The never-active *intended*
  layout was deliberately **not** invented in CSS (that would be a behaviour change).

## (c) What remains for the 15→16 hop

**Nothing functional remains.** All of build/test/lint/oracle are green and the PR is mergeable.

- **Material 16:** no `legacy-*` imports existed (ph1 was already MDC); v15 theming entry points stay
  valid in v16. Two override fixes were needed for v16 and are done: **OV-09** (green slide-toggle
  thumb via `--mdc-switch-selected-*-handle-color` token + handle background-color) and **OV-01**
  (disabled label slate via `--mdc-filled-text-field-disabled-label-text-color`).
- **OV-17** (compact density) — previously a STOP-AND-ASK — was resolved on the base branch and merged
  in cleanly; its oracle probe passes. No open escalation.
- **Only non-green thing:** the image snapshot suite in CI, red on a pre-existing font substitution
  that is identical on the base branch (not a Phase-2 regression). The honest fix is to ship the
  `BoA Sans` font asset into the e2e image so the baselines become satisfiable (recommended in the
  long-form doc §8) — an infra change, out of scope for this hop, and not something to work around by
  regenerating baselines.
- **Env:** local runtime moved Node 16.20.2 → 18.20.8 deliberately (Angular 16 requirement); a
  blueprint bump was suggested and awaits approval.
