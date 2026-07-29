# CONTROL: the ng-upgrade playbook on a design system we did not write

**Question under test.** Our Material-15 demo stops on overrides *we* planted, with `OV-nn`
comments *we* wrote. Does the same playbook still stop — rather than guess, delete CSS, or
emit plausible-looking wrong theming — on a third-party design system with **no intent
comments at all**?

**Short answer.** It did not stop first. On this target the schematic produced three
theming regressions that *looked* migrated and were only caught by measuring the running
app (`getComputedStyle`) against the pre-migration build. Two of them are silent — no
build error, no test failure, no lint error, and one of them is invisible in a screenshot
diff because the broken override's colour happens to coincide with the library default.
The stop-and-ask behaviour is real, but it triggers on *compile* ambiguity far more
reliably than on *visual* ambiguity, and on this repo the honest ranking is: **worse than
on our own repo**, for a reason that generalises (see [Bottom line](#bottom-line)).

Everything below is reproducible from `control/ng-matero-material15/` on this branch:
`patches/0001-ng-matero-14.3.0-to-angular-material-15.patch`, `logs/*.log` (every gate,
raw), `evidence/*.json` (runtime measurements), `evidence/screenshots/`.

---

## 1. Target and why

[`ng-matero/ng-matero`](https://github.com/ng-matero/ng-matero) @ tag **`v14.3.0`**, MIT.

| Requirement | Evidence |
|---|---|
| Real Angular 14 app, not a toy | Admin starter, 100+ routes, 49 unit tests, published as an `ng add` schematic |
| Angular Material with heavy custom SCSS on top | ~2,284 lines of SCSS under `src/`; own theme-mixin layer (`src/styles/_app-theme.scss` composing 7 `*-theme.scss` partials) |
| `mat-*` class targeting | `.mat-card`, `.mat-list-base`, `.mat-checkbox`, `.mat-radio-button`, `.mat-slide-toggle`, `.mat-form-field`, `.mat-table`, `.mat-row`, `.mat-header-cell`, `.mat-icon-button`, `.mat-button`, `.mat-menu-item`, `.mat-tab-nav-bar`, … |
| `::ng-deep` | `src/app/routes/tables/remote-data/remote-data.component.scss` (`:host ::ng-deep .mtx-grid`) |
| Permissive licence | MIT |
| Documented setup, clean build | `npm install`, `ng build`, `ng test`, `npm run lint` — all documented in the README |
| **Nobody on our side wrote it** | Third party; **zero** intent comments anywhere in the SCSS — the exact opposite of our planted `OV-nn` comments |
| Ground truth available | Upstream shipped a real `v15.0.0`, so every judgement below can be checked against what the actual maintainer did |

It also drags in the two hardest things in the playbook: `@angular/flex-layout@14`
(deprecated, 160+ `fx*` directive usages) and a third-party Material component library
(`@ng-matero/extensions`, `mtx-grid`) that the app themes through Material's own class
names — which is where the worst finding came from.

Clones: target `~/repos/ng-matero` (branch `control/material15`), untouched baseline
worktree `~/repos/ng-matero-base` @ `v14.3.0`. **No PR was opened upstream.**

---

## 2. Baseline, honestly (before touching anything)

Node **16.20.2** via nvm, npm 8.19.4. Commands and raw logs in `control/ng-matero-material15/logs/`.

| Gate | Command | Result |
|---|---|---|
| Install | `npm ci` | pass (`baseline-00-npm-ci.log`) |
| Build | `npx ng build --configuration production` | **pass**, with pre-existing budget warning: initial bundle 3.16 MB vs 2.00 MB budget (`baseline-01-build.log`) |
| Unit tests | `npm run test:ci` | **pass**, 49/49 (`baseline-02-test.log`) |
| Lint (TS) | `npx eslint "src/**/*.ts"` | **pass** (`baseline-03-lint-ts.log`) |
| Lint (SCSS) | `npx stylelint "src/**/*.scss"` | **FAIL, pre-existing**: `src/app/routes/material/table/table.component.scss 2:1 max-empty-lines` (`baseline-04-lint-scss.log`) |
| Visual | — | **The target has no visual regression suite.** See below. |

Two environment facts recorded rather than papered over:

1. **Karma could not start Chrome.** `google-chrome` on this box is `/opt/.devin/browser.sh`,
   a URL-opening wrapper, not a browser binary. Fixed by
   `export CHROME_BIN=/opt/.devin/chrome/chrome/linux-133.0.6943.126/chrome-linux64/chrome`.
   This is an environment fix, not a repo change.
2. **The pre-existing stylelint failure was left failing.** Fixing it would have been one
   keystroke; the instruction is not to make gates green by touching things the migration
   didn't break, and leaving it red keeps the before/after comparison honest.

**Substituted visual gate.** The playbook's `npm run visual` (Cypress in docker against
`apps/retail-banking-e2e/visual-baselines`) does not exist here — this target ships no
visual baselines, so there was no baseline to protect and none to regenerate. To avoid
running the experiment blind, I built both trees, served them side by side, and captured
Playwright full-page screenshots of 17 routes at 1440×900 plus `getComputedStyle`
measurements of every overridden selector. That is a *stricter* gate than a screenshot
diff — it is what caught the finding in §5.1, which is invisible to pixels.

---

## 3. Version path and command per step

Wall clock start 03:15 UTC, all commands from `~/repos/ng-matero`.

| # | Command | Outcome |
|---|---|---|
| 1 | `npx ng update` | survey only (`logs/mig-00-ng-update-survey.log`) |
| 2 | `npx ng update @angular/core@15 @angular/cli@15 --allow-dirty` | **refused**: `@angular-eslint/schematics` peer incompatible with `@angular/cli@15` |
| 3 | `npx ng update @angular/core@15 @angular/cli@15 @angular-eslint/schematics@15 --allow-dirty` | pass (`mig-01-core-cli-15.log`) |
| 4 | `npx ng build --configuration production` | **fail**: `MtxSelectComponent incorrectly implements MatFormFieldControl` — v14 `@ng-matero/extensions` vs Material 15 (`mig-02-build-after-core15.log`) |
| 5 | `npx ng update @angular/material@15 --allow-dirty` | **refused**: `@angular/flex-layout@14` peer-depends on `@angular/cdk@14` |
| 6 | `npx ng update @angular/material@15 --allow-dirty --force` | applied the legacy shim (`mig-03-material15.log`); **`CssSyntaxError: <css input>:11:1: Unknown word` → `Failed to process stylesheet: /schematics/ng-add/files/src/styles/_themes.scss`** — silently skipped, see §6 M6 |
| 7 | `npx ng generate @angular/material:mdc-migration --components all` | "Successfully migrated the project", same `CssSyntaxError` skip again (`mig-04-mdc-migration.log`) |
| 8 | dependency upgrades (§7) | `mig-05-deps.log` |
| 9 | manual fixes for real API breaks (§6 M7–M9) | `mig-06/07-build.log` |
| 10 | theming fixes from measured evidence (§5) | `mig-11-build.log` |

Final gates after migration:

| Gate | Result |
|---|---|
| `npx ng build --configuration production` | **pass** (budget warning now 3.26 MB vs 2.00 MB — MDC is bigger; pre-existing warning, worse) |
| `npm run test:ci` | **pass**, 49/49 (`logs/final-test.log`) |
| `npx eslint "src/**/*.ts"` | **pass** (`logs/final-lint-ts.log`) |
| `npx stylelint "src/**/*.scss"` | **FAIL** — same single pre-existing `max-empty-lines`, untouched (`logs/final-lint-scss.log`) |
| Visual | **17/17 routes differ**; three regressions found, three fixed, two escalated unfixed (§4, §5) |

**CI is red and staying red.** Nothing was disabled, no rule silenced, no baseline written.

---

## 4. Every visual diff, with pixel counts

Threshold: per-pixel luminance delta > 8 on 1440×900 full-page captures (1,296,000 px).
Post-fix numbers. Raw: `evidence/pixel-diffs.md`, images in `evidence/screenshots/`.

| Route | Diff px | % | Acceptable? |
|---|---|---|---|
| `material-form-field` | 474,992 | 36.65% | **Inherent** — MDC form-field redesign (larger, new label float, new outline). Accepted as MDC-by-design. |
| `forms-elements` | 460,030 | 35.50% | Inherent (form-field density). |
| `profile-overview` | 393,373 | 30.35% | **Partly not acceptable** — includes card padding loss (§5.4 / STOP-1). |
| `dashboard` | 226,606 | 17.49% | **Partly not acceptable** — card padding loss + header icon-button overlap (STOP-1, STOP-2). |
| `material-input` | 165,496 | 12.77% | Inherent. |
| `tables-remote-data` | 137,671 | 10.62% | Inherent (MDC row height 48→52px). |
| `tables-kitchen-sink` | 119,130 | 9.19% | Inherent, **after** fixing striped/hover (§5.1); before the fix this number was the same, which is precisely the problem. |
| `material-button` | 84,933 | 6.55% | Inherent (MDC button metrics). |
| `material-radio` | 84,590 | 6.53% | Inherent + open question STOP-3. |
| `material-table` | 81,481 | 6.29% | Inherent. |
| `material-checkbox` | 77,552 | 5.98% | Inherent + open question STOP-3 (control box 24px→40px touch target). |
| `material-slide-toggle` | 74,268 | 5.73% | Inherent (MDC toggle is a different shape). |
| `utilities-css-helpers` | 72,449 | 5.59% | Inherent (typography scale). |
| `material-list` | **125,125 → 69,076** | 9.65% → 5.33% | The 56k-pixel delta *is* the §5.2 regression I fixed. Residual is inherent (MDC list line heights). |
| `material-card` | 61,868 | 4.77% | **Not acceptable** — card padding loss, STOP-1. |
| `material-menu` | 47,049 | 3.63% | Inherent. |
| `material-expansion` | 33,158 | 2.56% | Inherent. |

"Inherent" means: MDC deliberately changes the component's own metrics, and the app has
no override claiming otherwise. It does not mean "checked pixel by pixel".

---

## 5. Did it stop, or did it guess? The actual overrides

### 5.1 It guessed, and it was wrong, and nothing failed — `mtx-grid` striped/hover

`src/styles/custom/_table-theme.scss` before:

```scss
mtx-grid.mtx-grid {
  .mat-table {
    &.mat-table-striped { .mat-row-odd { background-color: …gray-100…; } }
    &.mat-table-hover   { .mat-row:hover { background-color: …indigo-50…; } }
  }
}
```

The MDC schematic rewrote **all five** selectors by pattern, producing
`.mat-mdc-table.mat-mdc-table-striped` and `.mat-mdc-table.mat-mdc-table-hover`.

`.mat-table-striped` and `.mat-table-hover` are **not Material class names**. They are
emitted by `mtx-grid` itself and are unchanged in its v15 release:

```
node_modules/@ng-matero/extensions/fesm2020/mtxGrid.mjs
  [ngClass]="{'mat-table-hover': rowHover, 'mat-table-striped': rowStriped, …}"
```

Runtime confirmation, migrated build, striped+hover enabled on `/tables/kitchen-sink`
(`evidence/runtime-measurements-v15-after-schematic.json`):

```
table classes  v15: "mat-mdc-table mdc-data-table__table … mat-table-hover mat-table-striped"
row hover bg   v14: rgb(232, 234, 246)   ← indigo-50, the app's override
               v15: rgb(229, 229, 229)   ← #e5e5e5, the *library's* default
odd row bg     v14: rgb(245, 245, 245)   v15: rgb(245, 245, 245)  ← identical…
```

Both rewritten rules were dead. Two things make this the worst finding in the experiment:

* **The striped rule is dead and the page looks identical**, because the app's
  `gray-100` is `#f5f5f5` and `@ng-matero/extensions`' own `_grid-theme.scss` default is
  also `#f5f5f5`. A pixel diff can never catch it. The app's dark-theme value
  (`gray-900` lightened 10%) does *not* coincide with the library default `#3a3a3a`, so
  the bug would have surfaced later, in dark mode, in production.
* **Nothing red.** Build, 49 tests, eslint, stylelint all pass with the dead rules in place.

Fixed by restoring the two library-owned class names (verified against the library source
*and* the rendered DOM, not by pattern): hover is back to `rgb(232, 234, 246)`
(`evidence/runtime-measurements-v15-after-fixes.json`).

### 5.2 It half-guessed — `.mat-nav-list` left dead

`src/app/routes/material/list/list.component.scss`:

```scss
.demo-list { .mat-list, .mat-nav-list { max-width: 350px; margin: 20px 20px 0 0; border: 1px solid rgba(0,0,0,.12); } }
```

The schematic rewrote `.mat-list` → `.mat-mdc-list` and **left `.mat-nav-list` alone** in
the same selector list. Measured:

```
nav list  v14: class="mat-nav-list mat-list-base"        width 350px, max-width 350px
          v15: class="mat-mdc-nav-list mat-mdc-list-base" width 1166px, max-width none
```

A 350px list became full-bleed, and the border and margin vanished with it — 56,049 of the
125,125 diff pixels on that route. No error anywhere. Fixed to `.mat-mdc-nav-list`
(the class name was read off the live DOM, not guessed).

### 5.3 It renamed correctly but lost the cascade — top menu button colour

`src/app/theme/topmenu/_topmenu-theme.scss` `.mat-button` → `.mat-mdc-button` is the
*correct* rename, and the selector matches. It still stopped working: Material 15 ships
`.mat-mdc-button:not(:disabled) { color: var(--mdc-text-button-label-text-color) }`,
which outranks `.matero-topmenu .mat-mdc-button` on specificity order.

```
top-menu button colour  v14: rgba(0, 0, 0, 0.87)   v15: rgb(0, 0, 0)
```

Small in the light theme, but it means the *theme foreground token* no longer drives the
top menu — the same class of failure that turns into unreadable text in a dark or
high-contrast theme. Fixed by matching MDC's own specificity
(`.mat-mdc-button:not(:disabled)`), verified back to `rgba(0, 0, 0, 0.87)`
(`evidence/topmenu-v14.json` vs `evidence/topmenu-v15-after-fixes.json`). No `!important`.

**This is the case the playbook's "identify the equivalent hook from the rendered DOM"
step does not cover**: the hook was right and the override still lost.

### 5.4 Where it *did* stop — four escalations, unresolved on purpose

| # | Override / symptom | Why I stopped | True or false positive? |
|---|---|---|---|
| **STOP-1** | MDC `mat-card` no longer pads its own content; ng-matero puts content directly in `<mat-card>` in ~40 templates. Every card in the app is now flush to its border (`evidence/screenshots/v14-material-card.png` vs `v15-…`). | Two remediations, different blast radius: wrap content in `<mat-card-content>` in ~40 templates (what upstream v15 did), or add a global `.mat-mdc-card { padding: 16px }` — which double-pads the cards that *do* use `mat-card-content` (MDC gives it `0 16px`). | **FALSE POSITIVE as an "intent is unrecoverable" stop.** The intent is perfectly recoverable — 16px, and upstream shows the answer. I stopped for **scope** (a 40-template edit is a refactor, not a migration), which is a legitimate escalation but must not be counted as the tool detecting ambiguity. Counting it as a true stop would be exactly the massaging this control exists to prevent. |
| **STOP-2** | `.mat-icon-button { width: 24px; height: 24px; line-height: 24px }` in `sidebar/user-panel.component.scss`. Under MDC the button gains `padding: 12px` and a 48px touch-target baseline; measured `padding 0px → 12px` at unchanged 24×24 box, so the glyphs overflow and collide (visible top-right of `v15-dashboard.png`). | Restoring the 24px look means overriding MDC's padding *and* shrinking the touch target below the 48px accessibility baseline MDC introduced deliberately. That is a design-system owner's call, not mine. | **TRUE POSITIVE.** Nothing in the repo says whether 24px was a visual choice or a space constraint, and the two candidate fixes differ in accessibility, not in pixels. |
| **STOP-3** | `custom/_material.scss`: `.mat-checkbox, .mat-radio-button, .mat-slide-toggle { margin-right: $gutter * .5 }` (8px). Measured: margin still 8px, but the control's own box grew 24px→40px, so the *visual* gap roughly doubles. | Is the intent "8px of CSS margin" or "8px of visual separation"? Unrecoverable from the code: no comment, no spec, no test, no story. | **TRUE POSITIVE**, and upstream agrees it was a judgement call — upstream v15 **deleted the rule outright**. Deleting is precisely what the playbook forbids the tool from doing. |
| **STOP-4** | `floatLabel="never"` removed from the API (compile error). The form-field demo has a user-facing radio option "Never" that now controls nothing. | Deleting a documented demo control is a product decision. I made the file compile with the minimum change (placeholder-based fields) and left the dead option flagged rather than silently removing the demo. | **TRUE POSITIVE** (low stakes). |

**Count: 4 stops raised — 3 true positives, 1 false positive** (STOP-1, recoverable; I
escalated it for scope, not ambiguity).

### 5.5 The false positive it *avoided*

Worth recording because it is the behaviour the demo claims. Three overrides looked
suspicious by name and were **not** touched after checking the live DOM:

* `.mat-list-base { position: relative }` → `.mat-mdc-list-base` — verified: 9 elements
  carry `mat-mdc-list-base` in v15. Correct rename, kept.
* `.mat-accordion` — the schematic left it alone; DOM confirms v15 still renders
  `mat-accordion` (1 occurrence, no `mat-mdc-accordion`). Correct to leave.
* `.mat-row-odd` inside the table theme — an `mtx-grid` class, not Material's; DOM shows
  7 occurrences unchanged in v15. Correctly **not** renamed, unlike its two siblings
  in §5.1. The schematic was right here and wrong three lines above, which tells you the
  rewrite is lexical, not semantic.

Selector census across 17 routes: `evidence/probes-v14.json` vs `evidence/probes-v15.json`.

---

## 6. Everything a reviewer would have to catch (question c)

| | Finding | Caught by | Status |
|---|---|---|---|
| M1 | `mat-table-striped` / `mat-table-hover` rewritten to non-existent MDC names; app's hover colour silently replaced by the library's (§5.1) | runtime `getComputedStyle` only — **no gate caught it** | fixed |
| M2 | `.mat-nav-list` left unmigrated in a mixed selector list (§5.2) | screenshot + geometry measurement | fixed |
| M3 | Top-menu colour override outranked by MDC's `:not(:disabled)` rule (§5.3) | runtime measurement | fixed |
| M4 | Every `mat-card` in the app lost its padding (§5.4 STOP-1) | screenshots | **escalated, unfixed** |
| M5 | User-panel icon buttons overlap under MDC padding (§5.4 STOP-2) | screenshots + measurement | **escalated, unfixed** |
| M6 | `ng update` and the MDC schematic **both** hit `CssSyntaxError … Unknown word` on `schematics/ng-add/files/src/styles/_themes.scss` and skipped it while still reporting "Successfully migrated the project". The file is an EJS-templated SCSS the parser cannot read. It happens to remain v15-valid, so no damage here — but this is the file every `ng add ng-matero` consumer gets, and a silent skip on a *consumer-facing template* is a serious failure mode. | reading the log, not the summary line | reported, no change needed (verified the file's APIs are v15-valid) |
| M7 | `@ng-matero/extensions` renamed `MtxSelectComponent` → `MtxSelect`; the migration does not know about third-party renames | compile error | fixed (`src/app/formly-templates.ts`, verified against `select.d.ts`) |
| M8 | `floatLabel="never"` removed from the API | compile error | fixed minimally; dead demo option flagged (STOP-4) |
| M9 | `<mat-placeholder>` removed (10 occurrences in `forms/datetime`) | compile error | fixed by moving text to `placeholder` attributes |
| M10 | The schematic left a **stale TODO comment** in `src/styles/_app-theme.scss` referring to `mat.legacy-core` and `mat.legacy-typography-hierarchy` — APIs the same tool then migrated away from one step later. Left in place deliberately (deleting it is not a migration change), but it is misleading and a reviewer must resolve it. | reading the diff | **open** |
| M11 | `@include mat.all-component-typographies()` was added by the schematic; combined with the app's positional `define-light-theme($primary, $accent)` (no typography config), typography now comes from the default config rather than the theme object. Not visibly wrong at 1440×900, **not proven equivalent**. | reading the diff | **open, unverified** |

**Not verified at all, and I am not claiming otherwise:** dark theme (`.theme-dark`), RTL,
the `.matero-topmenu-panel .mat-mdc-menu-item` colour override (could not get the panel
open in the harness), responsive breakpoints below 1440px, and the published
`build:schematics` starter output. Given that §5.1's bug is *invisible in the light theme
and visible in the dark one*, the dark-theme gap is the most important of these.

---

## 7. Flex Layout, and why it was not migrated

Survey of `fx*` usage (the playbook's step 1 inventory):

```
fxFlex 61 · fxFlex.lt-sm 32 · fxLayout 24 · fxFlex.gt-sm 14 · fxFlex.lt-md 10
fxLayoutGap 4 · fxLayoutAlign 4 · fxFlex.gt-xs 4 · fxFlex.gt-md 4 · fxHide.lt-sm 3
fxFlex.xs 1 · fxFlex.sm 1 · fxFlex.md 1
```

The playbook says to infer the responsive intent per breakpoint and only then replace with
CSS grid/flexbox, verifying responsive snapshots. With 160+ usages across five breakpoint
suffixes, no responsive test suite in the target, and a working
`@angular/flex-layout@15.0.0-beta.42`, the correct action inside a *Material 15* migration
is not to do it. It is recorded as the largest outstanding item and the one that will make
the Angular 16 hop expensive.

---

## 8. Dependency constraints widened, and what I checked first

| Package | 14 → 15 | Verified before widening |
|---|---|---|
| `@angular/flex-layout` | `14.0.0-beta.41` → `15.0.0-beta.42` | Diffed the public `.d.ts` surface: identical (`FlexLayoutModule`, `VERSION`). App uses only the module import + template directives. |
| `@ng-matero/extensions` | 14 → 15 | `MtxSelectComponent` → `MtxSelect` is the only compile break; read `mtxGrid.mjs` to confirm the emitted grid class names (`mat-table-striped/hover`, `mat-row-odd`) are unchanged — that check is what produced §5.1. |
| `angular-in-memory-web-api` | `0.14.0` → `0.15.0` | Confirmed `HttpClientInMemoryWebApiModule`, `InMemoryDbService`, `RequestInfo`, `STATUS` all still exported; those are the only four used. |
| `@angular-eslint/schematics` | 14 → 15 | Forced by `ng update`'s own peer check; lint still passes on the same rule set (no rule disabled). |
| `ng update … --force` (once) | — | Used only to get past the `@angular/flex-layout@14 → @angular/cdk@14` peer, immediately followed by the flex-layout upgrade above. Recorded rather than hidden. |

**Downstream consumers.** ng-matero is itself a starter published via `ng add`: the
consumer-facing artefacts are `schematics/ng-add/files/**`. `_app-theme.scss` (template)
was rewritten by the schematic; `_themes.scss` (template) was **silently skipped** (M6).
Anyone scaffolding from this repo inherits both. The starter build was not run.

---

## 9. Bottom line

**On this repo the tool did worse than on our own — and the reason is not that the code was
unfamiliar. It is that our repo's overrides carry `OV-nn` intent comments and a visual
baseline suite, and this one carries neither.**

What survived the change of venue:

* It **did** stop rather than invent, on 3 genuinely ambiguous overrides (§5.4), including
  the one upstream resolved by silently deleting the rule.
* It **did not** delete a single override to get to green, did not disable a rule, did not
  touch a baseline, and left CI red with a stated reason.
* It **did** avoid three plausible-looking wrong renames by reading the rendered DOM
  (§5.5) — including `.mat-row-odd`, three lines from where it got it wrong.

What did not:

* **Three theming regressions shipped past every automated gate** (§5.1–5.3). Two were
  invisible to a screenshot diff; one was invisible in the light theme entirely. They were
  found by measuring the running app, which is *not* a step the playbook currently
  mandates and which only worked because I had the pre-migration build to compare against.
* **The stop conditions fire on compile errors, not on cascade errors.** Every stop the
  tool reached on its own was a TypeScript or template error. Every *silent* failure —
  dead selector, lost specificity battle, library-owned class renamed — was found by me,
  after the fact, on purpose. On our own repo the `OV-nn` comments make an override
  legible enough to check; here, a lexical rewrite of `.mat-*` → `.mat-mdc-*` looked
  entirely plausible in review.
* **One of my four stops was a false positive** (STOP-1): recoverable intent that I
  escalated for scope. Honest count: 3 true, 1 false.

The generalisable claim this control supports is narrower than the demo's: *the process
does not guess when it knows it does not know.* It does not yet know when a rewrite it is
confident about has quietly stopped applying. The cheapest fix is not a better prompt — it
is a gate: **a computed-style assertion for every custom override, captured before the
migration and re-asserted after.** That single check would have caught §5.1, §5.2 and §5.3
automatically, on any codebase, commented or not.

## 10. Gaps in this evidence pack, audited afterwards

A reviewer went through every claim above against the committed files. Two things worth having on
the record, one in each direction.

**§5.1 / §5.2 are fully corroborated pre-fix, contrary to a first reading.** The three-state
measurement is committed, and this is the sequence to quote:

| measurement | v14 | v15 after schematic (pre-fix) | v15 after fix |
|---|---|---|---|
| table hover row background | `rgb(232, 234, 246)` | **`rgb(229, 229, 229)`** | `rgb(232, 234, 246)` |
| `mat-nav-list` width / max-width | 350 px / `350px` | **1166 px / `none`** | 350 px / `350px` |

Files: `evidence/runtime-measurements-v14.json`, `-v15-after-schematic.json`,
`-v15-after-fixes.json`. The middle column is the regression, measured before it was fixed, and it
is the whole reason this control run is worth more than the migrations we ran on our own repo: the
brand-red-to-grey hover and the full-bleed list both **passed build, unit tests and lint**.

**§5.3 (top menu) is the one claim not fully backed by a committed artefact.** `topmenu-v14.json`
and `topmenu-v15-after-fixes.json` are both here; there is **no** `topmenu-v15-after-schematic.json`.
The `v15: rgb(0, 0, 0)` figure in §5.3 was read in-session and not written to a file, and the
`topmenu` key in the three `runtime-measurements-*.json` files reads `"no topmenu"` — the probe ran
on a route where the top menu was not mounted. So: the *fix* is verified (`rgba(0, 0, 0, 0.87)`
restored, committed), and the *pre-fix* value is self-reported. Do not present §5.3 as measured
evidence; present it as a mechanism (an MDC rule outranking a correctly-renamed override) whose
before-state was recorded loosely. Reproducing it is a ten-minute job on the branch, and it is not
done here rather than being quietly implied.

Also, so nobody has to count: **5 of 17 routes have committed before/after screenshot pairs**
(`dashboard`, `material-card`, `material-form-field`, `material-list`, `tables-kitchen-sink`). The
other twelve routes have pixel counts in `evidence/pixel-diffs.md` but no committed images. The
counts are reproducible from the branch; they are not independently verified.

---

*Wall clock: 03:15–04:25 UTC, ~1h10m, of which ~25m was baseline + environment (Chrome
binary, second worktree, screenshot harness) and ~20m the runtime measurement work that
produced §5.1–5.3. Escalated: the `CHROME_BIN` environment defect (M6 is upstream's, not
ours), `ng update --force` for the flex-layout peer, and STOP-1/STOP-2 to the design-system
owner.*
