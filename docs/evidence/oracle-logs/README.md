# Raw transcripts behind every oracle number

Every figure quoted in `ORACLE-noise-floor.md`, `OVERRIDE-CONTRACT-dead-rules.md` and
`docs/meeting/security-qa.md` about *this* repo's oracle is reproduced here as the raw run output,
to the same standard the external control run was held to. Each log is a full
`npm run visual` transcript (digest-pinned `cypress/included@sha256:058d1834…`, `--skip-nx-cache`),
captured by `scripts/capture-oracle-logs.sh` on 2026-07-29. Everything except
`dark-contrast-regression.log` was re-captured after the round-9 sweep fixes landed, so those logs
show the current **146-test** suite (23 image + 77 computed-style + 46 sweep).
`dark-contrast-regression.log` is kept as originally captured against the 59-test suite because it is
the record of a specific defect at a specific moment; `delete-rule-dark-zebra.log` is its current
equivalent.

| log | what it establishes | result |
|---|---|---|
| `noise-repeat-{1,2,3}.log` | renderer noise floor: three consecutive runs, unmodified tree | **0 px on all 21 snapshots**, all 146 tests green, three times |
| `host-renderer-drift.log` | why the image is digest-pinned: the same suite on the host renderer against the same baselines | **21 of 21 snapshots fail**, `tabs-default` 455 px … `accounts-dashboard` 5,963 px, while every sweep and override-contract test passes — the drift is the renderer, not the CSS |
| `fault-injection-colour.log` | the budget catches a real regression: one brand colour swapped to red in `_overrides.scss` | `table-default` **753 px**, `accounts-dashboard` **788 px** — and probe `OV-05c` fails |
| `delete-rule-ov05d.log` | positive control for the probe method: delete the zebra-striping rule | **OV-05d fails** |
| `delete-rule-ov07.log` | the select-overlay probe has teeth: delete the active-option tint | **OV-07 fails** (`rgba(0,0,0,0.04)` — Material's default) |
| `delete-rule-ov08.log` | the disclosed vacuous probe: delete the selected-option colour rule | **still fully green** — which is exactly why it is labelled `KNOWN WEAK` |
| `delete-rule-ov18.log` | the newest probe, attacked in both themes: delete the legacy-shell tab-header border rule | **OV-18 and OV-18 [dark] both fail**, and `tabs-default` goes red too |
| `delete-rule-dark-zebra.log` | the dark zebra value, deleted on the current suite | 4 failures: the targeted ratio at **1.07:1** (`expected 1.0719326855029048 to be at least 4.5`), `OV-05d [dark]`, **and** the sweep independently reporting 10 illegible nodes on `/accounts` and 10 on `/__showcase/table` — three different gates on one defect |
| `delete-rule-ov01c.log` | the disabled-value colour, deleted — an AA failure that was live in the **light** theme for two rounds | 8 failures: `disabled value` at **2.66:1** (`rgba(0,0,0,0.38)` composited to `rgb(155,155,155)`) plus `OV-01c`, **and 6 image snapshots go red** (`form-field-default` 290 px, datepicker, autocomplete, currency-input and two overlay captures) — the two oracles agreeing |
| `delete-rule-ov01d.log` | the brand error colour, deleted — back to Material's `#f44336` | all three specs fail: `error message` at **3.68:1**, `OV-01d`, `form-field-default` 201 px, and the sweep reporting the same node from the other direction |
| `delete-rule-dark-inkbar.log` | the dark ink-bar tint, deleted | the non-text (1.4.11, 3:1) assertion fails at **2.24:1**, plus `OV-10 [dark]` |
| `delete-rule-dark-surface.log` | the two declarations that give the dark page its surface, deleted — this is **the defect that shipped** | **18 failures**, and the shape of them is the point: every one of the 16 dark routes fails the sweep, not two named targets. Before the sweep this same experiment produced 2 failures. Same defect, same log, an oracle that now describes it as what it is — a whole-application regression. |
| `delete-rule-ov01f.log` | the light-theme invalid-label colour, deleted — the defect the **sweep** found on its first run, two nodes from an existing probe | the sweep reports the label and the required asterisk at **3.37:1** on `/__showcase/form-field` (2 nodes, light palette); the 32 targeted ratios and all 38 probes stay green, which is the point of having the sweep. `form-field-default` also moves 280 px, so the pixel oracle sees it too — it just cannot say *why*. |
| `regress-root-surface.log` | the round-7 defect restored: `bofa-root` painted `background: #fff` over the themed page | the sweep fails on **`/accounts`, `/__showcase` and `/sign-in` in the dark palette**, while all 21 snapshots and all 38 component probes stay green — a whole-page defect that only a whole-page oracle can see |
| `regress-oracle-opacity-blind.log` | the oracle attacked again: stop folding ancestor `opacity` into the composite | the oracle's own self-test fails (`expected 2.00 to be close to 1.33`) — a 1.5x misreport on a number used to argue a threshold |
| `regress-oracle-gradient-blind.log` | and again: let it score text over a `background-image` against the canvas | the self-test fails (`the helper must say it cannot measure this: expected undefined to be a string`) — over artwork it must report UNMEASURABLE, not the maximum ratio |
| `regress-oracle-alpha-blind.log` | the oracle attacked instead of the CSS: the alpha-blind parse restored | **33 failures**, including the oracle's own self-test. Every alpha-composited target collapses to `rgb(0,0,0)` on `rgb(0,0,0)` = 1:1 — i.e. the alpha-blind version would have *inverted* the gate rather than merely weakened it. A gate tested against itself. |
| `fault-injection-glyph.log` | the product fault the glyph sweep exists to catch: the paginator's arrows recoloured to the paginator's own surface — no text node changes | the sweep reports **`svg "Next page" — 1.00:1, needs 3:1`** on `/accounts`, and `paginator-default` moves **70 px**. Before round 8 this same fault was **fully green**: an enabled control you cannot see, through a gate built to find exactly that |
| `regress-oracle-glyph-blind.log` | the round-8 hole restored: `sweep()` measures text nodes only, never an SVG `fill` | the icon-only self-test fails (`expected 0 to equal 1`) — the sweep reports nothing about an invisible enabled control |
| `regress-oracle-scrim-blind.log` | the other round-8 hole: only `.cdk-overlay-backdrop` treated as a covering sibling | the veil self-test fails at **13.20:1** where a human reads ~1.1:1 — a 12x overstatement on the loading-scrim pattern |
| `regress-oracle-zorder-blind.log` | the round-9 hole: paint order approximated by document order **alone** | the z-index self-test fails at **13.20:1** where the region is blank — one `z-index: 10` on a scrim written before the text was enough to hide a whole region from the gate |
| `regress-oracle-fold-blind.log` | round 9 again: skip text whose rect is past the fold | the below-the-fold self-test reports **nothing** — the same illegible node passed at `top: 2212` and failed at `top: 400`, making coverage a function of page height |
| `regress-oracle-sronly-blind.log` | round 9: the icon exemption reads `textContent`, which includes visually-hidden text | the sr-only self-test reports **nothing** — labelling an icon button the way accessibility guidance recommends hid its glyph from the gate |
| `regress-oracle-review-blanket.log` | round 9: `closest()` for the artwork declaration, and no ratio required | the review self-test fails — `data-contrast-reviewed="lgtm"` on an ancestor exempted artwork nobody reviewed |
| `dark-contrast-regression.log` | the defect the dark block itself shipped, reproduced: remove the dark zebra value and the WCAG assertion fires | **`expected 1.0719326855029048 to be at least 4.5`** — white statement text on the light stripe, plus `OV-05d [dark]` |

Read `fault-injection-colour.log` and `delete-rule-ov08.log` together: the first is the gate
working, the second is the gate not working, and both are committed. A gate whose failures are not
published is a claim, not a control.

What these logs do **not** establish, stated so nobody has to find out by reading carefully:

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
  regression was invisible in the light theme (`CONTROL-external-design-system.md` §5.1), so 11 of
  the 18 overrides are re-asserted as computed styles on a dark surface — behind a control that
  proves the dark palette actually rendered, since otherwise they would pass vacuously against the
  light theme — and the legibility sweep runs all 16 routes in both palettes. There are still **no
  dark pixel baselines**: a dark-only *geometry* or *layout* regression has no gate at all, only
  colour does.
- The sweep is complete about **elements, not states**. Focus, hover, validation and open overlays
  are driven deliberately by `override-contract.cy.ts`; a state nobody enumerated is unmeasured, and
  `regress-root-surface.log` is a reminder of how long a whole-page defect can hide behind
  correct-looking components.
