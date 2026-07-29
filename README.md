# Devin @ Bank of America — pitch build

Everything behind a 45-minute introductory meeting with Bank of America engineering
leadership, built around **one** of their three stated initiatives: the Angular 14 → 18+
upgrade of a customer-facing digital banking application built on a shared internal
component library with a custom design system over Angular Material.

Nothing in here is a mock-up. The application builds, the tests run, the visual
regression baselines were captured from real renders, and the migration evidence is a
transcript of commands that were actually executed.

## What is here

| Path | What it is |
|---|---|
| `bofa-digital-banking/` | Nx monorepo at Angular 14.2. Shared `ui-core` design system, 13 wrapped Material components, 18 intent-commented SCSS overrides, three consuming apps, a deprecated `@angular/flex-layout` dependency, a pinned auth SDK wrapper, an untyped vendor analytics shim, and a committed visual regression baseline. |
| `bofa-digital-banking/AGENTS.md` | The conventions an agent has to obey in this repo. |
| `bofa-digital-banking/.devin/blueprint.yaml` | The environment declaration: Node 16, install, Cypress browsers, verification commands. (No private registry is configured — see `docs/meeting/objections.md`.) |
| `playbooks/` | `!ng-upgrade-consumer` (parameterised on target version) and `!component-audit` (read-only). |
| `knowledge/` | The five Knowledge entries, in version control so a change to a standard is reviewable. |
| `docs/evidence/` | Raw command transcripts. Gate 1 proves the automated migration path completes and the build still fails. |
| `docs/meeting/` | Agenda, persona briefs, objection bank, the delivery/cost plan, the security Q&A, the two use cases not chosen. |
| `docs/evidence/VARIANCE-phase1-material15.md` | Three independent Devin runs of the same migration hop, including the one that died on a usage limit and the escalation both runs got wrong. |
| `docs/evidence/ORACLE-noise-floor.md` | The measurement behind the 40-pixel diff budget: 0 px across repeat runs on the pinned renderer, 455–5,963 px across renderers, 753 px of injected signal — and the day the host stopped drifting because an apt install changed its fonts, which is the case for pinning rather than against it. |
| `playbooks/REVISIONS.md` | What each round of runs changed in the playbook, and on what evidence. |
| `demo/RUNBOOK.md` | The timed 12-minute live demo, with the failure playbook. |
| `demo/PITCH-DECK.md` + `demo/PITCH-DECK.pdf` | The 14-slide executive deck (`pitch-deck.html` is the source it renders from). |
| `demo/SPEAKING-NOTES.md` | The whole 45-minute meeting: what to say, what to click, what to volunteer. |

## Why the Angular upgrade and not the other two

- **A deadline that cannot be renegotiated.** Angular 14 went end of life on
  18 November 2023. Running an unsupported framework in front of retail customers is a
  policy violation, not a preference.
- **It is mechanically verifiable.** Correctness can be proven — build, unit, visual
  regression against a committed baseline — rather than asserted. That matters more than
  speed for a first project inside a bank.
- **The shared library gives it fan-out.** The same procedure runs across every consuming
  repository, and the second run is the same Playbook with one parameter changed.

The notification service migration is architecture work first (what replaces IBM MQ while
preserving ordering, what happens to the on-prem Oracle dependency) and volume second,
behind a four-nines SLA on fraud alerts. Wrong first project on both axes. Test coverage
is the strongest *second* project; the risk there is generating assertions that move a
percentage without improving assurance, which is worse than nothing in front of an
examiner. Both are written up in `docs/meeting/usecase-cloud-migration.md` and
`docs/meeting/usecase-test-coverage.md`.

## Running it

```bash
cd bofa-digital-banking
nvm use 16.20.2          # Angular 14 requires Node 14–16
npm ci --legacy-peer-deps
npx nx run-many --target=build --all
npx nx run-many --target=test --all
npm run visual                           # visual regression in the pinned Cypress image
npx nx serve retail-banking              # http://localhost:4200/accounts, /__showcase
```

The oracle is two suites. **21 snapshots** — the component showcase at `/__showcase/:component`, the four real
overlays (dialog, select panel, autocomplete panel, calendar), the keyboard focus ring, two
responsive breakpoints, and the customer-facing `/accounts` dashboard. Overlays are captured by
opening them, not by rendering look-alike markup — a hand-authored copy of Material's DOM keeps
matching after MDC changes the real one, which makes it a decoration rather than a test.

And **77 computed-style tests** (`override-contract.cy.ts`) — 27 on the light surface, one per intent in
`_overrides.scss`, asserting the value the override exists to control on the running app. A
screenshot proves the surface still looks right; the probe proves the rule is still the thing
making it look right. Those come apart when a migration rewrites a selector onto something that
matches nothing and the library default sits close to the brand value — silent in the light
theme, wrong in the dark one — so **11 of the probes are re-asserted with the dark palette applied**,
behind a control that first proves the dark surface actually rendered (otherwise the whole block
would pass vacuously against the light theme), plus **32 WCAG contrast ratios** (16 targets in both
themes) and **6 tests of the contrast oracle itself**. The ratio gate exists because the first
version of the dark block asserted the *light* zebra colour on the dark surface and so certified an
unreadable transaction row (1.07:1) as correct: a colour constant records what someone wrote down, a
ratio records what the customer can read. Pointed at the rest of the library it then found six more
— five dark-surface controls rendering at 1.0:1 including a datepicker toggle you could not see to
click, and **two in the light theme**: a disabled account value at 2.66:1 and Material's error red at
3.68:1. Its own parse holes — transparent read as opaque black, foreground alpha dropped, ancestor
`opacity` ignored, text over a gradient scored against the canvas — are what the six self-tests pin.

And then **56 legibility-sweep tests** (`legibility-sweep.cy.ts`), which are the answer to the thing
that kept happening: three hostile rounds running, the targeted list of contrast probes was green and
a reviewer found illegible text somewhere the list did not point. Each fix added another selector,
which is a changelog, not a gate. The sweep walks **every visible text node on 16 routes in both
palettes** — the three customer-facing routes included — resolves what is actually painted behind each
one, applies WCAG 1.4.3 (4.5:1, or 3:1 for large text) and exempts only what the standard exempts.
On its first run it found a defect in the **shipping light theme** that fourteen hand-picked probes had
sat next to for three rounds: the label of an invalid field, and the "required" asterisk inside it,
are painted with Material's `#f44336` at **3.37:1** — illegible at the exact moment validation fires
(OV-01f). It also caught the round-7 defect that every component probe and all 21 snapshots missed:
`bofa-root` painted `background: #fff` over the themed page, so `/accounts`, `/__showcase` and
`/sign-in` rendered white-on-white in the dark palette *while every control on them measured
correctly* — the components looking right is what hid it. The fix is a set of surface tokens in
`bofa-theme.scss`, so a route cannot forget to follow the palette because it no longer states a
colour of its own.

**Eighteen of the 50 tests attack the sweep rather than the app**, and fifteen of them are the record
of three hostile rounds spent finding ways to fool it. Each one is a specific false verdict, now pinned:
an **icon-only control** whose glyph is recoloured to its own surface (a paginator arrow rendered at
1.00:1 with the gate green, because the sweep kept only nodes with a direct text child and read
`color`, never `fill`); the same control labelled the *accessible* way, with an `sr-only` span, which
made it look "decorated" and skipped it; a semi-transparent **sibling** veil (`rgba(255,255,255,0.92)`
over the dark table reported 13.20:1 where a human reads 1.1:1); an opaque scrim written *earlier* in
the DOM and raised with `z-index: 10`, which one line of CSS used to hide a whole region behind a
reported 13.20:1; illegible text **below the fold**, where the same node passed at `top: 2212` and
failed at `top: 400`, making coverage a function of page height; the select **caret**, a zero-box
border triangle that contains no SVG at all, so the claim that the glyph sweep covered it was false by
construction — and, once that was fixed, the *other* ways to draw the same mark: a rotated two-border
chevron and an L-shaped corner walked straight past a rule that recognised only a 0×0 box with one
painted side. Round ten added two more of the same family: a scrim raised inside a `transform`, which
the old "maximum `z-index` on the chain" model read as covering text a browser paints *above* it (a
stacking context contains its children, and the model did not know that); and inertness armed by the
mere presence of a `.cdk-overlay-backdrop` element, so one stray `0×0; opacity: 0` leftover switched
the sweep off for every `aria-hidden` subtree on the page. Round eleven found four more — and all four
were in round ten's fixes, which is the honest summary of this exercise: a veil inside a
`position: sticky` wrapper fell eight pixels short of *containing* the line it hid, so unreadable
white-on-white text scored 13.20:1; "clipped away" was decided by the first percentage in `inset()`,
which hid a painted 10% band and showed a box clipped to nothing; inertness was re-armed by any
visible pane with a character of text in it, so a 2×2 pane containing a full stop silenced the gate
again; and the shape-agnostic caret rule still excluded a four-sided frame, anything above 24 px and
anything drawn in `::before`, where Material draws several of them.

Round twelve found two more, and they are the pair worth understanding because they point in opposite
directions. Covers were collected by `position !== static`, which is not what decides paint order: an
ordinary in-flow `div` with a background paints over anything at a negative `z-index`, so text under a
static sibling scored **13.20:1** on a region that was blank on screen. And the widened caret rule
went the other way — it reported an empty `<td>` and an empty box carrying the design system's own
12 %-alpha divider token at 1.32:1, on markup where nothing is wrong. A gate that fires on ordinary
table chrome in CI is a gate people learn to switch off, so the shape rule is now scoped to marks that
*indicate* something: part of a control, or named. Both directions are self-tests, with the deliberate
regression for each committed.

Nine of the twenty-six guard the other direction, which matters just as much: a gate that fails
correct code gets switched off. Hidden text, off-screen skip links, the current `sr-only` recipe
(`clip-path: inset(100%)`, not just the `inset(50%)` spelling the first version matched), a box
clipped to nothing by `inset(0 0 100% 0)`, a `clip: rect(0,0,0,0)` on a *static* element where CSS
ignores it, `inset(50% round 4px)` whose `round` token is a corner radius and not a fifth side,
an empty bordered cell and a divider-bordered box, text painted *over* an in-flow background, a veil
that
paints nothing, a tooltip arrow that matches the surface it is a tail of, and the dimmed page behind
an open modal must all stay unreported. And text over a gradient fails as unmeasurable
until a human declares `data-contrast-reviewed="… 8.9:1 at the lightest stop"` **on the element
painting the artwork** — a sentence in the diff a reviewer can argue with, rather than a guess in the
helper or an `lgtm` on `<body>` that quietly exempts the page.

This gate came out of the external control run
([`CONTROL-external-design-system.md`](docs/evidence/CONTROL-external-design-system.md)) and, on
its first run, found **three dead overrides in this repository's own design system**
([`OVERRIDE-CONTRACT-dead-rules.md`](docs/evidence/OVERRIDE-CONTRACT-dead-rules.md)).
