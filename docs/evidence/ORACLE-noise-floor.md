# The visual oracle's noise floor, measured

A pixel budget defended by "it feels about right" is a number a reviewer should
refuse. This is the measurement behind `MAX_DIFF_PIXELS = 40` in
`apps/retail-banking-e2e/src/support/visual-regression.plugin.ts`.

Every figure below is copied from the `[visual] <snapshot>: <n> px` lines the
plugin now prints on **every** comparison, pass or fail. Reproduce with
`npm run visual` (pinned container) or `npx nx e2e retail-banking-e2e
--skip-nx-cache` (host renderer).

Captures are 1280x720. Suite: 23 tests, 21 compared snapshots.

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
