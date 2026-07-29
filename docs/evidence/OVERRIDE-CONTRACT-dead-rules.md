# The computed-style contract, and the three dead overrides it found in our own library

**Where this came from.** The control run against a design system we did not author
([`CONTROL-external-design-system.md`](CONTROL-external-design-system.md)) ended with a
concrete recommendation rather than a compliment: the pixel oracle cannot tell "the
override still works" from "the override is dead and the library default happens to look
similar". Three of the four theming regressions in that run were invisible to a screenshot
diff. Its closing line was that the cheapest fix is *a computed-style assertion for every
custom override, captured before the migration and re-asserted after*.

So we built it — `apps/retail-banking-e2e/src/e2e/override-contract.cy.ts`, driven by
`src/support/override-probes.ts`: 24 probes on the light surface — at least one per `OV-nn` intent
in `_overrides.scss`, including `OV-18` — plus 7 re-asserted on the dark surface, each
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

## How many of the assertions actually constrain our CSS? 22 of 24.

A gate that passes whether or not the code is there is decoration, so every probe was
tested by deleting the rule it claims to protect and re-running. `OV-05d` (zebra striping)
is the positive control: delete the rule, the probe fails, so the method works.

Three assertions did **not** fail when their rule was deleted, all for the same reason:
`bofa-theme.scss` builds Material's **primary** palette from `$boa-red-600`, so Material
paints these brand red on its own.

| Probe | Why it was weak | What was done |
|---|---|---|
| OV-07 active option tint | The original probe measured the *selected* option, which reports `rgba(0, 0, 0, 0.12)` from Material's own selected rule regardless of the override — it was not weak, it was **wrong**, and it caught a fourth ineffective rule. | Re-pointed at the *active, not selected* option, where the Material default is `rgba(0, 0, 0, 0.04)`. Now fails when deleted. |
| OV-08 selected option colour | Primary is red, so the option is red without us. | Kept, marked `KNOWN WEAK` in the probe file. It is a tripwire on the rendered colour, not proof the rule works; OV-07 is the load-bearing assertion for that overlay. |
| OV-13 selected calendar day | Same: primary fills the selected day. The "today is outlined in navy" half of OV-13 *is* ours, but the showcase renders a fixed month so that today never appears — it cannot be asserted deterministically. | Kept, marked `KNOWN WEAK`. Honest gap. |
| OV-10 ink bar | `background-color` is vacuous for the same reason; **`height: 3px` is not** — Material's bar is 2px. | Kept as-is; the colour half is documented as vacuous, the height half has teeth. |

So the number to quote in the room is **25 of 27 light-surface assertions constrain our own CSS**,
not 27 (OV-08 and OV-13 are vacuous; OV-10 is half vacuous in the light theme and counted as
constraining on its `height` half — its colour half stopped being vacuous in the *dark* theme, see
below). This was found by hostile testing of the gate, not by writing it, which is the
general point: a gate nobody has tried to defeat is an assumption. **The raw transcripts are
committed**, including `docs/evidence/oracle-logs/delete-rule-ov08.log` — a probe conspicuously
*not* failing.

## The dark surface — which then failed for a fourth reason nobody had thought of

Eleven probes are re-asserted with the dark palette applied (`?theme=dark` → `.bofa-theme-dark` on
`<body>`, which is also where CDK attaches overlays, so panels and dialogs are themed too). The
subset is chosen by one rule: a probe qualifies when its expected value is a **fixed brand constant
or a geometry** — something our CSS states outright, and which therefore must not move when the
palette does. Probes whose expected value is Material-derived are excluded, because under a dark
palette the *correct* value is different and asserting the light one would be a bug in the test.

This exists because it is the exact shape of the control run's worst finding: an override rewritten
onto a selector that matches nothing, where the library default happens to equal the brand value —
invisible in the light theme, wrong in the dark one
(`CONTROL-external-design-system.md` §5.1). A single-theme oracle, pixel or computed-style, cannot
see that class of defect at all.

And because a second theme is itself a thing that can silently stop working, the block opens with an
anti-vacuity control: it asserts that a surface we do **not** override (the Material table
background) actually changes, `rgb(255,255,255)` → `rgb(66,66,66)`. If `?theme=dark` ever stops
applying, that test fails first and loudly, instead of eleven probes quietly re-passing against the
light theme. `OV-18` was verified the hostile way in both themes: delete the rule and both the light
and dark assertions fail (`oracle-logs/delete-rule-ov18.log`).

### And then the dark block certified an unreadable statement table as correct

The first version of that block asserted `background-color: SLATE_50` on the dark surface — the
*light* zebra stripe — because the probe model had one expected value per property, shared across
themes. Material's dark palette paints row text white. So:

| dark surface, as first shipped | text | background | ratio | WCAG AA |
|---|---|---|---|---|
| even (striped) statement rows | `rgb(255,255,255)` | `rgb(246,247,249)` | **1.07:1** | fails 4.5:1 |
| header cells (OV-05c) | `rgb(18,22,29)` | `rgb(66,66,66)` | **1.80:1** | fails 4.5:1 |
| odd statement rows | `rgb(255,255,255)` | `rgb(66,66,66)` | 10.05:1 | passes |

Two of five transaction rows were effectively invisible, and the header line with them. **The gate
could not see it because the gate was enforcing it:** OV-05d was green *precisely because* it
asserted the value that caused the defect, and there are no dark pixel baselines to disagree. This
is the same failure shape as OV-08 — an assertion that passes for a reason unrelated to the intent
— arriving from the opposite direction, inside the block built to catch that shape. Found by
hostile review of the round it shipped in, not by the suite.

Three changes, in order of importance:

1. **WCAG AA contrast assertions**, computing the real ratio from the computed foreground and the
   surface actually painted behind it. This is the only assertion here that constrains *legibility*
   rather than a recorded value — a colour constant records what someone wrote down, and a migration
   that moves a library foreground makes the constant right and the render wrong. Hostile check:
   `oracle-logs/dark-contrast-regression.log`, where removing the fix reports
   `expected 1.0719326855029048 to be at least 4.5`. It started as three assertions on the statement
   table; the next round of hostile review pointed it at the rest of the library, which is §6.
2. **`expectDark` on the probe model.** Colour is palette-dependent, geometry is not — so a probe
   may now carry a second expectation for the dark surface, and asserting a light colour constant on
   a dark surface is now a reviewable choice rather than an accident of the data structure.
3. `_overrides.scss` gains dark-scoped values for OV-05c and OV-05d (slate-100 header text at
   8.65:1; a slate-750 stripe at 8.24:1). The *intents* are unchanged — "zebra striping for
   scanability", "header cells carry the brand weight" — which is the point: an intent survives a
   palette change and a hard-coded colour does not.

### How much of the dark block carries incremental power? Eight probes of eleven.

Measured from the compiled bundle rather than assumed: the `.bofa-theme-dark` scope emits 397 rules
and no `height`, `min-height`, `max-height`, `padding*` or `border-bottom-width`.

| Probe | Dark-only failure possible? | Why |
|---|---|---|
| OV-05c, OV-05d | **yes — and both did** | palette-dependent colours; the defect above |
| OV-10 (colour half), OV-10b | **yes — and both did** | brand red is 2.24:1 on the dark page: the ink bar failed 1.4.11's 3:1 and the active section label failed AA. The dark scope now states red-300/red-100 outright, so the colour half is no longer vacuous there. |
| OV-01c, OV-01d | **yes — and both did, in *both* themes** | the disabled account value and the validation copy; see §6 |
| OV-07, OV-11 | yes | brand-constant colours our CSS states outright |
| OV-15, OV-17, OV-18 | **no — geometry duplicates** | nothing in the dark scope touches these properties, so they fail symmetrically with their light twins. Duplicates, not vacuous: they still fail when the rule is deleted. Kept as a tripwire for a future dark rule that changes density. |

So the number to quote is **8 of 11 dark probes, plus 32 contrast ratios and 6 tests of the contrast
oracle itself** — and, since §7, a **legibility sweep** over every visible text node on 16 routes in
both palettes, which is the part of this page that stopped being a list of selectors.

## §6 — What happened when the ratio gate was pointed at the other twelve components

The previous round of this document closed with a stated limit: *"contrast is asserted on the
statement table only; the other twelve components have no ratio assertion in either theme."* A
hostile reviewer read that as an invitation, looked at all 13 dark showcase routes by eye, and found
six defects behind it. All six were green in a 59-test suite.

| # | Where | Rendered | Root cause | Fix |
|---|---|---|---|---|
| 1 | form-field labels, hint, disabled value, dark | **1.0:1** — white on white | `mat.all-component-colors` recolours component *foregrounds* and never touches the page, so the dark class turned text white over a white surface | the dark class now carries `background`/`color` from the dark theme's own background and foreground maps, and the showcase panel follows the palette |
| 2 | inactive tab labels, dark | **1.0:1** | same | same |
| 3 | select trigger, dark | **1.0:1** | same | same |
| 4 | datepicker toggle icon, dark | **1.0:1** — `fill: currentColor`, i.e. **a button you cannot see to click** | same | same, plus a 1.4.11 non-text (3:1) assertion |
| 5 | disabled form-field **value**, *light* | **2.66:1** | OV-01 covered the disabled *label* and stopped there. Wrong in the shipping theme, for two rounds. | OV-01c: the value takes slate-600 too (5.57:1) |
| 6 | error text, **both** themes | **3.68:1** | Material's error red is `#f44336`; AA needs 4.5 | OV-01d: brand danger red, 7.33:1 light / red-100 8.65:1 dark |

And two defects in the **oracle**, which matter more than the six, because a broken oracle certifies
everything behind it:

| Input | Old helper | Truth | Consequence |
|---|---|---|---|
| `rgba(0, 0, 0, 0)` | parsed as opaque **black** | fully transparent | a transparent ancestor chain scored **21:1** — the maximum — while rendering white on white |
| `rgba(255, 255, 255, 0.5)` on `#424242` | **10.05:1** (alpha dropped) | **3.87:1** | Material uses alpha for exactly the secondary text — hints, disabled values, inactive tabs — that this gate was added to protect |

The helper now parses alpha, composites every layer over the one behind it, and terminates an
ever-transparent chain on the canvas rather than on a convenient default. It has **six tests of its
own**, one per hole (see §7 for the last two), in `override-contract.cy.ts` — because a gate nobody
has tried to defeat is an assumption, and that applies recursively to the thing doing the measuring.

The ratio gate now covers **16 targets in both themes**: statement rows and header, form-field label
/ value / hint / disabled value / error, active and inactive tab labels, the ink bar as a non-text
indicator, select trigger, chip label, paginator range label, currency amount, and the datepicker
toggle icon.

**Limits, stated.** The contract asserts 27 light and 11 dark probes, 32 ratios and 6 oracle
self-tests across 18 overrides; it is not a complete description of the design system. It runs at one
viewport, and the dark pass covers 11 of 18 overrides, not all of them. The image suite is still
light-theme-only — **there are no dark pixel baselines**, which is why every defect in §6 needed a
human looking at the screen to find. §7 replaces the "16 named targets" claim with a wider one, and
the three surfaces listed here as unasserted (slide-toggle labels, dialog body copy, autocomplete
option text) are now swept — but see §7's own limits, which are about *states*, not elements. It
cannot tell you an intent is *wrong* — only that the code no longer delivers the value someone wrote
down. And its expectations were captured from the running Angular 14 app, so they inherit whatever the
v14 build actually did, not what the design spec says it should do.

## §7 — The list was the wrong shape: what the sweep found

§6 fixed six defects and closed with a limit: *"this repository can now detect this defect class on 16
named targets, not that it has swept the design system for it."* The next hostile round read that the
same way the last one did, and found seven more defects — six dark, one in the shipping light theme.
That is three rounds in a row where a *green* targeted gate sat next to unreadable text, and each
round's fix was another selector. The pattern is the finding: **a hand-picked target list is a list of
the places someone has already thought about.**

The worst of the seven is worth stating in full because it is the failure mode a bank should care
about. `.bofa-theme-dark` correctly themed `<body>`; the application root, `bofa-root`, then painted
`background: #fff` over it. So `/accounts`, `/__showcase` and `/sign-in` — every route a customer
sees — rendered **white text on a white page in the dark palette, while every component on them
measured correctly**, because components paint their own surfaces. All 21 snapshots green, all 38
component probes green, 32 ratios green. The components looking right is what hid it.

| # | Where | Rendered | Fix |
|---|---|---|---|
| 1 | `/accounts`, `/__showcase`, `/sign-in` page surface, dark | **white on white** | the page surface, muted text, links, borders and success copy are now **tokens** (`--bofa-surface`, `--bofa-text-muted`, `--bofa-link`, `--bofa-border`, `--bofa-text-success`) declared once per palette in `bofa-theme.scss`. Light values are the hexes the application stylesheets already carried, so the refactor moves zero light pixels. |
| 2 | secondary button ("Download statement"), dark | **1.12:1** — brand navy on the dark page | OV-03b: navy tint at 7.47:1, and the stroke with it (1.4.11) |
| 3 | *selected* option in an open select, dark | **1.20:1** — the account the customer is confirming | OV-08b, which is also where OV-08 stops being the `KNOWN WEAK` tripwire it is labelled as |
| 4 | any field label **while focused**, dark | **1.64:1** — a control failing while it is being used | OV-01e |
| 5 | currency prefix (`$`), dark | **1.66:1** — "500.00" without a legible symbol is a different number | OV-16b |
| 6 | required-field label + asterisk of an invalid field, **both** themes | **3.37:1 light**, 2.62:1 dark | OV-01f. Light is the shipping theme; this was live for three rounds two DOM nodes from an existing probe. Brand danger red is 6.72:1 on the field fill. |
| 7 | showcase eyebrow / body copy, dark | **2.27:1** | slate-200 token, 9.41:1 |

And four more holes in the **oracle**, all of which made an unreadable render measurable as fine:

| Input | Old helper | Truth | Consequence |
|---|---|---|---|
| ancestor `opacity: 0.38` | **13.20:1**, then 2.00:1 | **1.33:1** | `opacity` fades glyphs as well as boxes; folding it into the background only still misreported by 1.5x, and these numbers are what a threshold argument rests on |
| text over `linear-gradient(...)` | **21:1** (the canvas) | unknowable | maximum confidence, zero information — it now reports `UNMEASURABLE` and fails |
| `visibility: hidden` text | measured, reported as a defect | not on screen | two false defect reports; a false positive costs a gate its credibility as surely as a false negative costs it its purpose |
| a CDK overlay panel | measured against the page | the scrim is a **sibling**, not an ancestor | false failure on every overlay target |

Plus two measurement errors that were not parse holes: every ratio target was read with `.first()`, so
a selector matching three chips asserted one; and the datepicker non-text assertion read the
*button's* `color` while the glyph is painted by the SVG's `fill` — change the fill alone and the
contrast test stayed green while the icon vanished (only the pixel oracle caught it, 382 px). Both
fixed: `.each()` over every match, and a `glyphRatio` that reads what is painted.

**The fix that matters is the shape, not the seven values.** `legibility-sweep.cy.ts` walks every
visible text node on **16 routes in both palettes** — 32 tests — resolves the composited background
behind each one, applies WCAG 1.4.3 (4.5:1, or 3:1 for large text) and exempts only what 1.4.3 exempts
(inactive controls). It found #6 on its first run. Seven further tests keep it from going quietly
green: it must measure >25 text nodes on `/accounts`, report planted illegible text and an icon-only
control whose glyph is recoloured to its own surface, composite a semi-transparent covering sibling,
and **not** report planted hidden text, off-screen screen-reader-only text, or artwork that carries a
`data-contrast-reviewed` declaration. Four of those seven exist because round 8 fooled the sweep in
both directions — an invisible paginator arrow reported as clean, and a legible gradient banner
reported as a defect — which is worth stating plainly: the sweep's *shape* is right, and it still took
an adversary to find where the shape had been implemented too narrowly. Raw logs: `oracle-logs/regress-root-surface.log` (the sweep
catching #1 with the fix removed, while every snapshot and probe stays green) and
`oracle-logs/delete-rule-ov01f.log`.

**Limits of the sweep, stated.** It is complete about *elements*, not about *states*: focus, hover,
validation, and open overlays are still enumerated deliberately by the override contract, and a state
nobody enumerated is unmeasured. It runs at one viewport. Since round 8 it does judge one kind of
non-text contrast — every painted SVG glyph, at 1.4.11's 3:1, because a reviewer made the paginator's
enabled arrows invisible at 1.00:1 with the sweep green — and CSS-painted indicators, because the
next reviewer pointed out that `mat-select`'s caret is a zero-box border triangle containing no SVG
at all, so "the caret is covered" had been false by construction. Icons that sit beside *visible*
label text are still exempt as decoration (the `/accounts` "+" is one), which is WCAG's position and
not an oversight — but the exemption now reads visible text, because an `sr-only` label used to make
an icon-only control invisible to the gate.

What remains out of scope is worth stating plainly. It measures what the browser computes, so a
defect that only appears under a real webfont, a customer's zoom level, or forced-colours mode is not
covered. Paint order is approximated by `z-index` and then document order, not by resolving stacking
contexts — better than document order alone, which one `z-index: 10` defeated, but still an
approximation. A covering layer must *fully contain* the text to count, so a sticky header that hides
70% of a line is not composited (the alternative, rect intersection, produced 38 false positives on
tab ink bars). Content behind an open modal is skipped as inert, so a sweep in that state describes
the dialog and not the page. And text over a gradient is reported as unmeasurable rather than scored,
which means artwork behind text has to be declared on the artwork element, citing a ratio, by a human
rather than checked by the gate. Total suite:
**146 tests**.
