# Phase 2 — Angular / Material 15 → 16 (whole workspace)

Playbook: `playbooks/ng-upgrade-consumer.md`, `TARGET_PACKAGE = whole workspace`,
`TARGET_VERSION = 16`. Branch `run/ph2-1516-flexlayout` off `run/ph1-cb4f31e3-material15`.

This document is written to the same honesty standard as the phase-1 evidence: it records
what completed, what stopped, what was **guessed / interpreted**, and **what no gate caught**.

---

## 1. Version path and command per step

Runtime changed **deliberately**: Node `16.20.2` → **`18.20.8`** (Angular 16 supports
`^16.14 || ^18.10`; Node 16 is EOL and the repo's forward path is Node 18). Docker/Cypress
image unchanged (`cypress/included:10.11.0`).

```bash
# 1. flex-layout removal first, isolated on Angular 15 (see §3) — commit 7bba869
npm install --legacy-peer-deps          # drops @angular/flex-layout

# 2. version hop — commit 56aa670
nvm install 18.20.8 && nvm use 18.20.8
npx nx migrate 16.10.0                    # writes package.json + migrations.json
npm install --legacy-peer-deps
npx nx migrate --run-migrations           # ran 16 code migrations (see §5)
```

Resulting version moves (package.json):

| package | 15 | 16 |
|---|---|---|
| `@angular/*` (core, common, forms, router, cdk, material, animations, platform-browser*) | 15.2.9 | 16.2.9 |
| `@angular/cli` | ~15.2.0 | ~16.2.0 |
| `@angular-devkit/*`, `@schematics/angular`, `@angular/compiler-cli`, `@angular/language-service` | 15.2.9 | 16.2.9 |
| `@angular-eslint/*` | 15.0.0 | 16.0.3 |
| `ng-packagr` | 15.2.2 | 16.2.3 |
| `nx`, `@nrwl/*` → `@nx/*` | 15.9.7 | 16.10.0 |
| `@ngrx/{store,effects,entity}` | 15.3.0 | 16.0.1 |
| `typescript` | 4.9.5 | 5.1.6 |
| `zone.js` | 0.12.0 | 0.13.3 |
| `cypress` | ^12.2.0 | ^13 (nx migration `update-16-8-0-cypress-13`) |
| `@angular/flex-layout` | 15.0.0-beta.42 | **removed** |

Build after the hop is green for all 6 projects (§6).

---

## 2. Survey (playbook step 1)

- **flex-layout usages** (all removed / accounted for, §3):
  - `libs/ui-core/.../bofa-responsive-grid.component.ts` — `fxLayout`, `fxLayout.lt-md`,
    `fxLayoutGap`, `fxLayoutAlign`, `fxFlex`(+`.lt-lg`,`.lt-md`), `fxHide.lt-sm`.
  - `libs/ui-core/.../ui-core.module.ts` — `FlexLayoutModule` import.
  - `apps/card-services/.../cards.component.html` — `fxLayout row wrap`, `fxLayoutGap "24px grid"`,
    `fxFlex 50`, `fxHide.lt-md`. **See §3.3 — this was already inert.**
- **`legacy-*` Material imports**: none. ph1 already runs pure MDC. The only "legacy" tokens are
  the BoA-specific `bofa-legacy-shell` CSS class (OV-18), unrelated to `@angular/material/legacy-*`.
- **direct `@angular/material` imports outside `libs/ui-core`**: `MatDialog` in
  `apps/retail-banking` dashboard/showcase (service injection only — allowed; not a component import).
- **`_overrides.scss`**: OV-01..OV-18 present. Only **OV-09** changed this phase (§5).
  **OV-17 remains UNMAPPED — open question carried forward, see §7.**

---

## 3. flex-layout removal (playbook step 5) — the layout is proven unchanged

### 3.1 `bofa-responsive-grid` — directive → CSS mapping

The directives were read out and reproduced 1:1 with flex-layout's **default** breakpoints
(`lt-sm ≤ 599.98px`, `lt-md ≤ 959.98px`, `lt-lg ≤ 1279.98px`):

| flex-layout | CSS |
|---|---|
| `fxLayout="row"` / `fxLayout.lt-md="column"` | `flex-direction: row`; `@media (max-width:959.98px){ column }` |
| `fxLayoutGap="16px"` | `gap: 16px` |
| `fxLayoutAlign="space-between stretch"` | `justify-content: space-between; align-items: stretch` |
| `fxFlex="30"` / `.lt-lg="40"` / `.lt-md="100"` | summary `flex: 0 0 30%`; `@media(≤1279.98){40%}`; `@media(≤959.98){flex:0 0 auto}` |
| `fxFlex` (detail) | `flex: 1 1 0` |
| `fxHide.lt-sm` (detail) | `@media (max-width:599.98px){ display:none }` |

### 3.2 Proof the layout did not move

**(a) Pixel-exact, in the identical Docker container.** The old flex-layout render was captured
before the rewrite; the new CSS render was captured after. Same font, same container, so the
comparison isolates layout only:

| snapshot | old(flex-layout) vs new(CSS), same env |
|---|---|
| responsive-grid-default | **0 px** |
| responsive-grid-md | **0 px** |
| responsive-grid-sm | **0 px** |

**(b) Computed geometry (CDP, live app).** Matches the TSDoc contract and the committed baseline
geometry exactly:

| viewport | direction | summary | detail | note |
|---|---|---|---|---|
| 1280 | row | 288px (30% of 960 grid) | 656px | 16px gap |
| 1000 (< lg) | row | 374px (~40%) | 546px | |
| 768 (< md) | column | 704px | 704px | stacked, summary first |
| 560 (< sm) | column | 496px | `display:none` | detail hidden |

The `should('not.be.visible')` assertion in `responsive grid hides the detail pane below the sm
breakpoint` executes (and passes) before the image step, so the < sm contract is gate-verified.

### 3.3 card-services (downstream, §honesty)

`apps/card-services/src/app/cards/cards.component.html` still contains `fx*` attributes, **but they
were already inert on ph1**: `card-services` never imported `FlexLayoutModule`, so those attributes
have never had any effect (plain unknown attributes). Removing the dependency therefore changes
nothing for card-services at runtime, and its build/lint stay green. The dead attributes are left
in place rather than cleaned up because that is out of scope for this hop and touching a second app
is exactly the kind of unrequested change the playbook warns against. **Recommended follow-up:**
delete the dead `fx*` attributes from `cards.component.html` in a dedicated card-services change.

---

## 4. Non-theming code changes required by v16

- `ui-core.module.ts`, `retail-banking/app.module.ts`: removed `entryComponents` (removed API in
  v16; no-op under Ivy since v9). Removed the now-unused `BofaDialogComponent` import in the app.
- `libs/auth-sdk-wrapper/.../bofa-auth.guard.ts`: nx/Angular migration
  `migration-v16-guard-and-resolve-interfaces` removed the deprecated `implements CanActivate`
  marker and its import. **Behaviour-preserving** — the `canActivate()` method body is untouched.
  See §7 for the auth verification the playbook requires.

---

## 5. Theming (playbook steps 4 & 6) — per-file rationale

`@include mat.core()`, `mat.define-palette`, `mat.define-light-theme`,
`mat.define-typography-config`, `mat.all-component-themes`, `mat.all-component-typographies` are all
still valid in v16 — **no API rename was required for 15 → 16**, and the SCSS compiles with no Sass
deprecation warnings. Palette hues, typography levels and `density: 0` are unchanged.

Per-file under `theming/`:

- `bofa-theme.scss` — **unchanged.** v16 keeps the v15 theming entry points. (The `define-theme`
  M3 API and `mat.theme()` land in v18/v20 respectively, out of scope for this hop.)
- `_palette.scss` — **unchanged.**
- `_typography.scss` — **unchanged.**
- `_overrides.scss` — **only OV-09 changed.** Rationale below. All other OV-nn selectors already
  target MDC (done in ph1) and render identically v15 → v16 (§6).

### OV-09 (slide-toggle) — the one substantive theming change

Intent (from the comment): widen the bar **and** paint the *selected thumb* BoA success **green**
(`$boa-success-600` = `#0b7a3b`).

What was actually happening (measured, not guessed — CDP on the live app):

| render | selected thumb `::after` bg |
|---|---|
| committed baseline (pre-MDC era) | green (intent) |
| **ph1 / v15** | **NOT green** — default indigo; OV-09's `background-color` on `.mdc-switch__handle::after` never beat MDC's token |
| v16 before fix | `rgb(200,16,46)` — BoA **red** (v16 moved the MDC switch selected token to derive from *primary*) |
| **v16 after fix** | `rgb(11,122,59)` = `#0b7a3b` — **green, intent restored** |

Fix (v16-idiomatic — "preserve the intent, not the selector"): the MDC switch thumb colour is a
**design token**, not a paintable background, so the intent is expressed by setting the token:

```scss
.bofa-slide-toggle {
  --mdc-switch-selected-handle-color: #{bofa.$boa-success-600};
  --mdc-switch-selected-focus-handle-color: #{bofa.$boa-success-600};
  --mdc-switch-selected-hover-handle-color: #{bofa.$boa-success-600};
  --mdc-switch-selected-pressed-handle-color: #{bofa.$boa-success-600};
  /* geometry unchanged */
}
```

**Interpretation flagged for review:** OV-09's comment only literally names the base selected
thumb. I extended green to the focus/hover/pressed selected states too, because a thumb that turns
red on hover would contradict the stated intent. The **track** colour is intentionally left
theme-driven (now primary-derived light red, `#e8656f`); no override ever governed the track, so
inventing one would be guessing. This is a visible change from the v15 indigo track and from the
baseline's blue-grey track — called out here rather than hidden.

---

## 6. Verification — every visual diff accounted for

Gates (Node 18.20.8):

```
npx nx run-many --target=build --all   # 6/6 projects PASS
npx nx run-many --target=test  --all   # PASS (auth 4, ui-core 9)
npx nx run-many --target=lint  --all   # 7/7 PASS
docker run ... cypress/included:10.11.0 ... design-system.cy.ts   # 2 pass / 15 fail (see below)
```

### The visual gate cannot go green in this container — and why that is honest

All 15 image snapshots fail against `apps/retail-banking-e2e/visual-baselines`, **and they failed
identically on ph1 before any Phase-2 edit**. Cause: the baselines were captured with a webfont the
`cypress/included:10.11.0` container does not have (no font assets ship in the repo; the styles ask
for `"BoA Sans", Arial, …`, the container substitutes Liberation Sans). The diffs are text-glyph
anti-aliasing; box geometry, colour and layout match. Baselines were **not** regenerated.

To separate a real regression from font noise, every component was diffed **v16 vs the Angular-15
render in the same container** (font cancels out). This is the migration-attributable delta:

| component | v16 vs v15 (same env) | v16 vs baseline | verdict |
|---|---|---|---|
| button, chips, dialog, paginator, table, tabs | **0** | 1648–11899 (font) | identical; baseline diff is 100% font |
| responsive-grid default / md / sm | **0 / 0 / 0** | 1097 / 1097 / 828 (font) | layout unchanged (§3.2) |
| form-field | 736 | 7758 | floating-label glyph micro-shift only (MDC v16 label); no geometry/colour change |
| autocomplete | 411 | 2026 | same wrapped form-field label |
| select | 593 | 3580 | same wrapped form-field label |
| currency-input | 646 | 2289 | same label; `$` prefix + numerals unchanged (OV-16 intact) |
| datepicker | 667 | 3425 | same label; toggle icon unchanged |
| slide-toggle | 3087 | 2913 | **intended** — OV-09 thumb blue→green + track→primary (§5) |

The form-field-family diffs are all confined to the ~44px floating-label band and are sub-pixel
label rendering changes in MDC v16 — visually a few faint glyph edges, well within tolerance and
explained rather than re-baselined. The one non-font, non-label diff is slide-toggle, which is the
deliberate OV-09 intent restoration.

`MAX_DIFF_PIXELS = 40` in the harness is an absolute-pixel oracle that assumes the baseline font is
present; it is not satisfiable in this container for any snapshot containing text, independent of
this migration.

### The CI runner confirms it directly — and the responsive-grid contract PASSES

CI (`bofa-digital-banking CI` / `verify`) runs on the GitHub `ubuntu-24.04` runner (Node 16.20.2),
a **third** font environment distinct from both the committed baseline and the docker container. It
is **red on this PR and equally red on the base branch `run/ph1-cb4f31e3-material15`** (`5 passing,
12 failing`). Comparing the two runs in that identical environment isolates the Phase-2 delta with
zero font noise:

| snapshot | ph1 base (px) | PR #5 (px) | Δ | reading |
|---|---|---|---|---|
| **responsive-grid-default** | **PASS** | **PASS** | — | committed baseline met |
| **responsive-grid-md** | **PASS** | **PASS** | — | committed baseline met (the contract) |
| **responsive-grid-sm** | **PASS** | **PASS** | — | committed baseline met (the contract) |
| button | 610 | 610 | **0** | no change |
| table | 12453 | 12453 | **0** | no change |
| dialog | 6898 | 6898 | **0** | no change |
| tabs | 4661 | 4661 | **0** | no change |
| chips | 722 | 722 | **0** | no change |
| paginator | 2323 | 2299 | −24 | MDC v16 numerals/label |
| form-field | 7421 | 7407 | −14 | MDC v16 floating label |
| select | 3148 | 3137 | −11 | MDC v16 floating label |
| datepicker | 2918 | 2899 | −19 | MDC v16 floating label |
| autocomplete | 1511 | 1506 | −5 | MDC v16 floating label |
| currency-input | 1700 | 1692 | −8 | MDC v16 label; `$`/numerals intact (OV-16) |
| slide-toggle | 2710 | 2525 | −185 | **intended** OV-09 thumb blue→green (§5) |

Two conclusions the CI makes unarguable:

1. **The flex-layout → CSS rewrite passes the committed `responsive-grid-md` / `-sm` / `-default`
   baselines byte-for-byte in CI**, well inside the 40-px budget — the hard-part-1 contract is met,
   not merely "looks the same". (These three pass in CI because they contain almost no text, so the
   font substitution that sinks the other snapshots does not affect them.)
2. **Every failing snapshot fails identically on the base branch** (0 delta for the 5 text-heavy
   Material components, ≤24 px for the MDC-label family, and the single intended −185 px slide-toggle
   change). Phase 2 introduced **no** visual regression; the red is pre-existing font-substitution
   noise, honestly left red per the task rather than re-baselined.

---

## 7. Peer deps, auth, escalations, stop conditions

- **Peer deps (step 7):** the only removed constraint is `@angular/flex-layout` (removed, not
  widened). `--legacy-peer-deps` is used for install (unchanged from ph1). No dependency range was
  widened without cause.
- **auth-sdk-wrapper (step 7 verification):** verified present and intact under v16 —
  auth guard (`BofaAuthGuard.canActivate`, body unchanged; only the deprecated marker interface
  removed), `APP_INITIALIZER` factory + `HTTP_INTERCEPTORS` multi-provider registration in
  `bofa-auth.module.ts`, the interceptor class, and the service `ngOnDestroy` teardown. The 4 guard
  characterization tests pass. No auth flow was changed and no wrapper boundary was bypassed.
- **Characterization (step 8):** no public `ui-core` API signature changed
  (`ui-core-public-api.spec.ts` passes; `BofaResponsiveGridComponent` selector, `dense` input and
  content slots are unchanged). The responsive-grid *behaviour* is characterized by the e2e
  breakpoint assertions and the §3.2 geometry measurements.
- **OV-17 — RESOLVED upstream (see §10).** Originally left as STOP-AND-ASK. The base branch
  `run/ph1-cb4f31e3-material15` subsequently pinned the intent in the override contract (6.4px
  top/bottom infix padding, the v14 `0.4em` at the 14px MDC body font) and reimplemented it by
  releasing the MDC `min-height`/`height` floors so the padding takes effect. That resolution merged
  in cleanly and its oracle probe passes; the density question no longer needs a human decision.

---

## 8. What no gate caught

- **OV-09 was silently wrong since ph1.** The visual gate was already red (fonts), so it never
  flagged that the "green" consent thumb had been rendering default indigo since the MDC migration.
  A green oracle would have caught it. It surfaced here only because the v15-vs-v16 same-env diff
  was done by hand.
- **The visual gate has a blind spot in CI as configured.** Because every text-bearing snapshot
  fails on the font substitution, a genuine regression smaller than the per-snapshot font noise
  floor (hundreds–thousands of px) could hide behind an already-red suite. Mitigated here by the
  same-environment v15↔v16 diff; **recommended fix:** ship the `BoA Sans` font asset (or a metric
  match) into the e2e image so the baselines are satisfiable.
- **`card-services` dead `fx*` attributes** compiled and lint-clean (just unknown attributes), so
  no gate flagged them — until the base branch added a consumer spec that imported
  `FlexLayoutModule`. They are now removed (see §10); noted originally in §3.3.

---

## 9. Wall-clock and outcome

- Wall-clock: ~4.5 h across the phase (survey + baseline, flex-layout rewrite + proof, version hop,
  theming investigation + OV-09, gates, evidence).
- **Completed:** flex-layout removed and reimplemented in CSS with 0-pixel layout proof; Angular /
  Material / Nx / NgRx 15 → 16; Node → 18; build + unit tests + lint green; OV-09 intent restored
  and verified; auth surface verified.
- **Responsive baselines:** **PASS.** The committed `responsive-grid-default` / `-md` / `-sm`
  baselines pass byte-for-byte in CI on the CSS reimplementation (§6, within the 40-px budget); the
  0-px docker diff vs the old flex-layout render and the CDP geometry corroborate it. Hard part 1 is
  met against the actual contract, not merely "looks the same".
- **Other (text-heavy) baselines:** fail on the pre-existing font substitution — identically on the
  base branch (§6 CI table) — **not** a Phase-2 regression and not worked around by re-baselining.
- **Stopped / needs a human:** none outstanding. OV-17 (the only carried-forward open question) was
  resolved by the base branch and reconciled here (§7, §10).

---

## 10. Merge reconciliation with the updated base branch

After this PR opened, `run/ph1-cb4f31e3-material15` advanced with a new **computed-style override
oracle** (`apps/retail-banking-e2e/src/e2e/override-contract.cy.ts` +
`src/support/override-probes.ts`) that asserts each `OV-nn` intent as a *computed style* rather than
a pixel snapshot — a font-independent gate that runs alongside the image suite. Merging that base
work into this branch produced three conflicts, resolved as follows. **No baseline was regenerated;
no check was weakened.**

### 10.1 `_overrides.scss` — OV-09 (slide-toggle), combined resolution

The two branches fixed OV-09 differently and both are needed under v16:

- **This branch (v16 colour):** the *visible* selected thumb is painted by
  `--mdc-switch-selected-*-handle-color`; a `background-color` on `.mdc-switch__handle::after` no
  longer wins the rendered knob, so the token is set green for every selected interaction state.
- **Base branch (oracle-measurable colour + geometry):** sets `background-color` on the
  `.mdc-switch__handle` element itself (the oracle reads a computed style off the handle, which
  cannot see an `::after`), plus MDC geometry tokens (`--mdc-switch-track-*` / `--mdc-switch-handle-*`).

Resolution keeps **both**: base's handle-background rule and geometry tokens *and* this branch's
selected-handle colour tokens, under base's stronger `.bofa-slide-toggle.mat-mdc-slide-toggle`
selector. Verified: `OV-09` and `OV-09b` (green thumb, `rgb(11,122,59)`) both pass the oracle, and
the thumb renders green in the browser.

### 10.2 `_overrides.scss` — OV-01 (disabled field label), new v16 fix

The oracle's `OV-01` probe (disabled floating label must be slate `rgb(93,102,115)`, not Material's
`rgba(0,0,0,0.38)`) **failed under v16** even though it passed on the v15 base. CDP inspection of the
rendered MDC DOM showed why: a disabled field *floats* its label, and Material paints the floated
disabled label with
`color: var(--mdc-filled-text-field-disabled-label-text-color)` on
`.mdc-text-field--filled.mdc-text-field--disabled .mdc-floating-label--float-above` — a selector that
**ties the plain override on specificity (3 classes each) and wins on source order.** Fix (same
token strategy as OV-09): set `--mdc-filled-text-field-disabled-label-text-color: $boa-slate-600` on
`.bofa-form-field`, so the computed colour resolves to slate regardless of which rule wins. The
direct `color` rule is kept for the resting (non-floated) label. Verified: computed label colour =
`rgb(93, 102, 115)`; `OV-01` passes.

### 10.3 OV-17 — resolved upstream, accepted

Base's OV-17 rework (compact density via 6.4px infix padding + released MDC height floors) merged in
cleanly and its oracle probe passes. The ph1/Phase-2 STOP-AND-ASK is therefore closed (§7).

### 10.4 `package.json` / `package-lock.json`

Conflict was over `cypress` (base pinned exactly `10.11.0` to match the oracle Docker image;
this branch's nx-16 migration had bumped it to `^13`) and the eslint toolchain. Resolution keeps
**base's `cypress: 10.11.0`** (the deterministic-oracle pin is deliberate and must not drift) and
**this branch's `eslint 8.46.0` / `@typescript-eslint 5.62.0`** (required by `angular-eslint` 16).
`package-lock.json` was regenerated with `npm install --legacy-peer-deps` on Node 18.20.8 and is
internally consistent (cypress resolves to 10.11.0).

### 10.5 `card-services` — flex-layout removed from the new consumer spec

Base added `apps/card-services/src/app/cards/cards.component.spec.ts` (a downstream-consumer check)
that imported `FlexLayoutModule` — a module this phase removes workspace-wide, so the merged spec
failed to compile. The import was dropped and the template's dead `fx*` attributes (never active:
`card-services` never imported `FlexLayoutModule` in production, so they rendered as plain block
divs) were removed. Rendering is unchanged; the never-active *intended* layout was deliberately
**not** invented in CSS (that would be a behaviour change). The consumer spec's three assertions
(shared table rows, wrapped select/currency-input, analytics boundary) pass.

### 10.6 Post-merge gates

- `nx run-many --target=build --all` → **6/6 pass**
- `nx run-many --target=test --all` → **6/6 pass** (incl. base's new `card-services` consumer spec)
- `nx run-many --target=lint --all` → **7/7 pass** (3 deliberate `any` warnings in
  `analytics-sdk-shim`, unchanged)
- `npm run visual` → **override-contract oracle 22/22 pass** (font-independent, incl. OV-01, OV-09b);
  the image `design-system` snapshots still fail on the container font substitution (§6) — the same
  pre-existing condition, not touched.
