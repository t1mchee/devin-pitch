# Raw transcripts behind every oracle number

Every figure quoted in `ORACLE-noise-floor.md`, `OVERRIDE-CONTRACT-dead-rules.md` and
`docs/meeting/security-qa.md` about *this* repo's oracle is reproduced here as the raw run output,
to the same standard the external control run was held to. Each log is a full
`npm run visual` transcript (digest-pinned `cypress/included@sha256:058d1834…`, `--skip-nx-cache`),
captured by `scripts/capture-oracle-logs.sh` on 2026-07-29 at `ead1f37`.

| log | what it establishes | result |
|---|---|---|
| `noise-repeat-{1,2,3}.log` | renderer noise floor: three consecutive runs, unmodified tree | **0 px on all 21 snapshots**, 23/23 probes, three times |
| `host-renderer-drift.log` | why the image is digest-pinned: the same suite on the host renderer against the same baselines | **21 of 21 fail**, `tabs-default` 455 px … `accounts-dashboard` 5,963 px |
| `fault-injection-colour.log` | the budget catches a real regression: one brand colour swapped to red in `_overrides.scss` | `table-default` **753 px**, `accounts-dashboard` **788 px** — and probe `OV-05c` fails |
| `delete-rule-ov05d.log` | positive control for the probe method: delete the zebra-striping rule | **OV-05d fails** |
| `delete-rule-ov07.log` | the select-overlay probe has teeth: delete the active-option tint | **OV-07 fails** (`rgba(0,0,0,0.04)` — Material's default) |
| `delete-rule-ov08.log` | the disclosed vacuous probe: delete the selected-option colour rule | **still 23/23 green** — which is exactly why it is labelled `KNOWN WEAK` |

Read `fault-injection-colour.log` and `delete-rule-ov08.log` together: the first is the gate
working, the second is the gate not working, and both are committed. A gate whose failures are not
published is a claim, not a control.

Two things these logs do **not** establish, stated so nobody has to find out by reading carefully:

- The budget is `MAX_DIFF_PIXELS = 40` on a 1280×720 canvas. The injected faults are ~750 px, two
  orders of magnitude above it, so they demonstrate detection, not the detection *threshold*. A
  change confined to under 40 pixels — a focus ring, a 2 px border on one control — passes. The
  computed-style probes exist partly to cover that class, and `ORACLE-noise-floor.md` says so.
- Everything here is the light theme at one viewport. The external control run's worst regression
  was invisible in the light theme (`CONTROL-external-design-system.md` §5.1), so this is a real
  gap, not a pedantic one.
