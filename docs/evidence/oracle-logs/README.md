# Raw transcripts behind every oracle number

Every figure quoted in `ORACLE-noise-floor.md`, `OVERRIDE-CONTRACT-dead-rules.md` and
`docs/meeting/security-qa.md` about *this* repo's oracle is reproduced here as the raw run output,
to the same standard the external control run was held to. Each log is a full
`npm run visual` transcript (digest-pinned `cypress/included@sha256:058d1834…`, `--skip-nx-cache`),
captured by `scripts/capture-oracle-logs.sh` on 2026-07-29. Everything except
`dark-contrast-regression.log` was re-captured after the contrast gate was extended across the
library, so those logs show the current **98-test** suite (23 image + 75 computed-style).
`dark-contrast-regression.log` is kept as originally captured against the 59-test suite because it is
the record of a specific defect at a specific moment; `delete-rule-dark-zebra.log` is its current
equivalent.

| log | what it establishes | result |
|---|---|---|
| `noise-repeat-{1,2,3}.log` | renderer noise floor: three consecutive runs, unmodified tree | **0 px on all 21 snapshots**, 23 image + 75 computed-style tests green, three times |
| `host-renderer-drift.log` | why the image is digest-pinned: the same suite on the host renderer against the same baselines | **21 of 21 fail**, `tabs-default` 455 px … `accounts-dashboard` 5,963 px |
| `fault-injection-colour.log` | the budget catches a real regression: one brand colour swapped to red in `_overrides.scss` | `table-default` **753 px**, `accounts-dashboard` **788 px** — and probe `OV-05c` fails |
| `delete-rule-ov05d.log` | positive control for the probe method: delete the zebra-striping rule | **OV-05d fails** |
| `delete-rule-ov07.log` | the select-overlay probe has teeth: delete the active-option tint | **OV-07 fails** (`rgba(0,0,0,0.04)` — Material's default) |
| `delete-rule-ov08.log` | the disclosed vacuous probe: delete the selected-option colour rule | **still fully green** — which is exactly why it is labelled `KNOWN WEAK` |
| `delete-rule-ov18.log` | the newest probe, attacked in both themes: delete the legacy-shell tab-header border rule | **OV-18 and OV-18 [dark] both fail**, and `tabs-default` goes red too |
| `delete-rule-dark-zebra.log` | the dark zebra value, deleted on the current suite | 2 failures: the ratio at **1.07:1** (`expected 1.0719326855029048 to be at least 4.5`) **and** `OV-05d [dark]` |
| `delete-rule-ov01c.log` | the disabled-value colour, deleted — an AA failure that was live in the **light** theme for two rounds | `disabled value` fails at **2.66:1** (`rgba(0,0,0,0.38)` composited to `rgb(155,155,155)`) plus `OV-01c`; **and 6 image snapshots go red**, which is the two oracles agreeing |
| `delete-rule-ov01d.log` | the brand error colour, deleted — back to Material's `#f44336` | `error message` fails at **3.68:1** plus `OV-01d`, and `form-field-default` goes red |
| `delete-rule-dark-inkbar.log` | the dark ink-bar tint, deleted | the non-text (1.4.11, 3:1) assertion fails at **2.24:1**, plus `OV-10 [dark]` |
| `delete-rule-dark-surface.log` | the two declarations that give the dark page its surface, deleted — this is **the defect that shipped** | 2 failures at **1.88:1**. Note what this shows: the dark surface is delivered by two rules (the theme class and the showcase panel), so removing one leaves dark-on-dark rather than white-on-white — a *different* AA failure, still caught. Each rule is a control on the other. |
| `delete-rule-oracle-alpha.log` | the oracle attacked instead of the CSS: the alpha-blind parse restored | **16 failures**, including the oracle's own self-test. Every alpha-composited target collapses to `rgb(0,0,0)` on `rgb(0,0,0)` = 1:1 — i.e. the alpha-blind version would have *inverted* the gate rather than merely weakened it. A gate tested against itself. |
| `dark-contrast-regression.log` | the defect the dark block itself shipped, reproduced: remove the dark zebra value and the WCAG assertion fires | **`expected 1.0719326855029048 to be at least 4.5`** — white statement text on the light stripe, plus `OV-05d [dark]` |

Read `fault-injection-colour.log` and `delete-rule-ov08.log` together: the first is the gate
working, the second is the gate not working, and both are committed. A gate whose failures are not
published is a claim, not a control.

Two things these logs do **not** establish, stated so nobody has to find out by reading carefully:

- The budget is `MAX_DIFF_PIXELS = 40` on a 1280×720 canvas. The injected faults are ~750 px, two
  orders of magnitude above it, so they demonstrate detection, not the detection *threshold*. A
  change confined to under 40 pixels — a focus ring, a 2 px border on one control — passes. The
  computed-style probes exist partly to cover that class, and `ORACLE-noise-floor.md` says so.
- **The dark block shipped a defect of exactly the kind it was built to find, and these logs did not
  catch it — a human looking at the screen did.** It asserted the light zebra colour on the dark
  surface, so two of five statement rows rendered at 1.07:1 while the probe stayed green. Fixed, and
  the ratio is now asserted (`dark-contrast-regression.log`), but the general lesson is the one worth
  carrying into the room: an assertion can encode the bug. `OVERRIDE-CONTRACT-dead-rules.md`.
- The **image** suite is light-theme-only at two viewports. The external control run's worst
  regression was invisible in the light theme (`CONTROL-external-design-system.md` §5.1), so 7 of
  the 18 overrides are now re-asserted as computed styles on a dark surface — behind a control that
  proves the dark palette actually rendered, since otherwise those 7 would pass vacuously against
  the light theme. There are still **no dark pixel baselines**, and 11 overrides have no dark
  assertion.
