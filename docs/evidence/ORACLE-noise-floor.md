# The visual oracle's noise floor, measured

A pixel budget defended by "it feels about right" is a number a reviewer should
refuse. This is the measurement behind `MAX_DIFF_PIXELS = 40` in
`apps/retail-banking-e2e/src/support/visual-regression.plugin.ts`.

Every figure below is copied from the `[visual] <snapshot>: <n> px` lines the
plugin now prints on **every** comparison, pass or fail. Reproduce with
`npm run visual` (pinned container) or `npx nx e2e retail-banking-e2e
--skip-nx-cache` (host renderer).

Captures are 1280x720. The full command runs **98 tests**: the 23-test image
suite (21 compared snapshots plus two interaction tests) and 75 computed-style
tests — 27 light-surface probes, 11 re-asserted on the dark surface, one control
that fails if the dark surface silently stopped rendering, 32 WCAG contrast
ratios (16 targets in both themes), and 4 tests of the contrast oracle itself.

**The raw transcripts for every number on this page are committed** under
`docs/evidence/oracle-logs/` — the three repeat runs, the host-renderer run, the
fault injection, and the delete-the-rule experiments, including the one that
shows a probe *not* failing. See `oracle-logs/README.md`.

## 1. Repeatability inside the pinned renderer

`cypress/included@sha256:058d1834…dc517a`, Electron 106, same machine, three
consecutive uncached runs against committed baselines:

| Run | Snapshots compared | Max diff | Snapshots above 0 px |
|---|---|---|---|
| 1 | 21 | 0 px | 0 |
| 2 | 21 | 0 px | 0 |
| 3 | 21 | 0 px | 0 |

Byte-identical. This includes the four overlay snapshots (`dialog-open`,
`select-panel-open`, `autocomplete-panel-open`, `datepicker-calendar-open`),
which are only deterministic because `?vr=1` disables Angular animations app
wide — see `apps/retail-banking/src/app/app.module.ts`. Before that flag, a
dialog captured mid-enter-transition drifted **10,790 px** between two runs of
the same commit. That measurement is the reason the flag exists.

## 2. Across renderers — why the image is pinned by digest

Same commit, same baselines, run on the **host** Electron instead of the pinned
image:

| Snapshot | Diff vs container baseline |
|---|---|
| accounts-dashboard | 5,963 px |
| table-default | 4,656 px |
| form-field-default | 2,809 px |
| dialog-open | 2,434 px |
| select-default | 1,362 px |
| button-default | 1,220 px |
| button-focus-ring | 1,202 px |
| datepicker-calendar-open | 1,149 px |
| tabs-default (smallest) | 455 px |
| **21 of 21 snapshots** | **failed** |

Cross-renderer drift is 10x–100x larger than any regression this suite is meant
to catch. There is no threshold that both tolerates it and catches a colour
change, which is why the renderer is pinned by **digest** — a mutable tag can be
repointed underneath the check — and why a laptop run that disagrees with CI is
a renderer difference, not a finding.

## 3. Sensitivity — what the budget actually catches

Fault injection: `.bofa-table .mat-header-cell` recoloured from
`$boa-slate-900` to `$boa-red-600`, one word of colour on five table headings.
No baseline touched.

| Snapshot | Diff | Ratio | Old 0.1 % ratio budget | 40 px budget |
|---|---|---|---|---|
| table-default | 753 px | 0.082 % | **passed** (silent) | fails |
| accounts-dashboard | 788 px | 0.086 % | **passed** (silent) | fails |

The customer-facing dashboard catches it too, not just the component showcase —
that is the point of having an application-surface baseline at all.

Signal-to-noise inside the pinned renderer: **753 px of signal against 0 px of
noise**. 40 px is therefore not tuned to sit just under the smallest regression
we happened to test; it is nearly two orders of magnitude below it, with room
for sub-pixel anti-aliasing if a future runner is not perfectly identical.

## 4. What this does not prove

- It does not prove 0 px on **BofA's** runners. The number to reproduce there is
  section 1: three uncached runs, then read the logged `px` values. If they are
  not 0, the budget must be re-derived from that measurement and written down —
  not quietly raised until the suite is green.
- It does not cover snapshots that do not exist yet. The oracle sees 21
  surfaces; anything else migrates unobserved, which is why the pilot's
  first task is baseline coverage of the real customer journeys.
- pixelmatch runs with `threshold: 0.05` per pixel. A colour change smaller
  than that distance on a handful of pixels is below the floor by construction.
- **A regression confined to fewer than 40 pixels passes.** The budget is
  absolute and whole-canvas, so a focus ring, a small icon, or a 2 px border on
  one control sits under it on a 921,600-pixel capture. The injected faults
  measured above are ~750 px — they demonstrate that detection works, not where
  the threshold is. Two consequences, both deliberate: the computed-style
  probes cover the small-but-meaningful class the pixel budget cannot (a 3 px
  ink bar, a 28 px chip, a focus outline colour), and a real deployment should
  add a per-region budget on the surfaces where 40 px is a lot — a payment
  confirmation button is not a dashboard. The alternative, lowering the global
  budget toward 0, buys precision with a flake risk on the first BofA runner
  that is not byte-identical, and 0 px measured on one machine is not a licence
  to assume it everywhere.
