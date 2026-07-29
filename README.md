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
| `docs/evidence/ORACLE-noise-floor.md` | The measurement behind the 40-pixel diff budget: 0 px across repeat runs on the pinned renderer, 455–5,963 px across renderers, 753 px of injected signal. |
| `playbooks/REVISIONS.md` | What each round of runs changed in the playbook, and on what evidence. |
| `demo/RUNBOOK.md` | The timed 12-minute live demo, with the failure playbook. |

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

And then **35 legibility-sweep tests** (`legibility-sweep.cy.ts`), which are the answer to the thing
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
colour of its own. Three of the 35 tests exist to keep the sweep honest: one proves it still measures
a substantial page, one plants illegible text and requires it to be reported, one plants *hidden*
text and requires it not to be.

This gate came out of the external control run
([`CONTROL-external-design-system.md`](docs/evidence/CONTROL-external-design-system.md)) and, on
its first run, found **three dead overrides in this repository's own design system**
([`OVERRIDE-CONTRACT-dead-rules.md`](docs/evidence/OVERRIDE-CONTRACT-dead-rules.md)).
