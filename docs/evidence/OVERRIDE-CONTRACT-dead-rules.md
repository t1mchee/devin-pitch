# The computed-style contract, and the three dead overrides it found in our own library

**Where this came from.** The control run against a design system we did not author
([`CONTROL-external-design-system.md`](CONTROL-external-design-system.md)) ended with a
concrete recommendation rather than a compliment: the pixel oracle cannot tell "the
override still works" from "the override is dead and the library default happens to look
similar". Three of the four theming regressions in that run were invisible to a screenshot
diff. Its closing line was that the cheapest fix is *a computed-style assertion for every
custom override, captured before the migration and re-asserted after*.

So we built it — `apps/retail-banking-e2e/src/e2e/override-contract.cy.ts`, driven by
`src/support/override-probes.ts`: 22 probes, one per intent in `_overrides.scss`, each
asserting the computed value of the property the override exists to control, on the
running app, in the pinned container.

**It failed on first run against our own design system. Three of the failures were real.**

| Probe | Expected | Measured | Diagnosis |
|---|---|---|---|
| OV-06 sort arrow | `opacity: 0.35` | `0` | Material drives arrow opacity from an Angular animation, which writes an **inline style**. No selector can outrank an inline style, so the rule had never applied once, in any build. |
| OV-11 chip height | `28px` | `32px` | Material sets `min-height: 32px` on `.mat-standard-chip`. A bare `height: 28px` is silently floored. The "predictable 28px rhythm in the filter drawer" was never happening. |
| OV-15 payee panel | `max-height: 224px` | `256px` | The rule was written `::ng-deep .bofa-autocomplete-panel { &.mat-autocomplete-panel { … } }` in a file compiled into the **global** stylesheet, where `::ng-deep` is not a real selector and the browser drops the whole block. This also killed OV-07 (tabular numerals in the select overlay) and OV-08 (brand-red selected option). |

The last row is the interesting one, and it is the control run's §5.1 reproduced in our own
code: **OV-08 was passing for the wrong reason.** Its rule was dropped by the browser, but
the selected option still rendered red — because the theme's primary palette is brand red
and Material paints the selected option with the primary colour. Delete the override
entirely and nothing changes; change the primary palette and a rule everyone believes is
protecting the option colour turns out to protect nothing. A pixel diff can never see
this, and neither can code review of the SCSS.

Two of the five failures were **the probe's fault, not the code's** — a wrong expectation
(compact density is `0.4em` of a 16px infix, i.e. `6.4px`, not `5.6px`) and a probe that
re-toggled a control that was already on. Recorded here because the honest count is
*3 real defects, 2 bad probes*, not "5 catches".

## What was changed, and what the pixel oracle then said

`_overrides.scss`: `!important` on the sort-arrow opacity (with the animation reason
written next to it), `min-height` alongside `height` on the chip, and `::ng-deep` removed
from OV-07 and OV-15. Nothing was deleted and no intent was changed.

Fixing dead CSS makes the app render differently — that is what "dead" means — so four
baselines moved, and every one of them is the revived rule and nothing else:

| Snapshot | Δ px | Cause |
|---|---|---|
| `chips-default` | 707 | chips are now 28px, as OV-11 always said |
| `autocomplete-panel-open` | 3,142 | options are now 40px, so the panel is shorter — OV-15 |
| `table-default` | 90 | the sort arrows are now visible at 0.35 — OV-06 |
| `accounts-dashboard` | 20,552 | the category chips above the statement table are 4px shorter, so every row below them moves up 4px |

The baselines were re-recorded with `UPDATE_VISUAL_BASELINES=1`, declared with
`BASELINE-CHANGE:` in the PR, and the diff images are attached to the PR rather than
described.

## Why this matters for the Angular 18 migration

Every one of these three failure modes is *more* likely during an MDC migration than
before it: the migration rewrites `.mat-*` selectors lexically, MDC introduces new
`min-*` and token-driven defaults, and MDC's own rules are more specific than v14's. The
control run found exactly these three shapes on a third-party codebase. The contract turns
all three from "someone notices in production, in dark mode, in six months" into a red
test on the migration PR.

It also changes what a reviewer is asked to do. Under a pixel-only oracle, review of a
migration diff is "does `.mat-mdc-x` look like the right rename?" — a guess. With the
contract, the rename is *checked*: if the new selector does not carry the value the intent
requires, the build is red regardless of how plausible the rename looked.

**Limits, stated.** The contract asserts 22 properties across 18 overrides; it is not a
complete description of the design system. It runs at one viewport, in the light theme, on
the pinned renderer. It cannot tell you an intent is *wrong* — only that the code no longer
delivers the value someone wrote down. And its expectations were captured from the running
Angular 14 app, so they inherit whatever the v14 build actually did, not what the design
spec says it should do.
