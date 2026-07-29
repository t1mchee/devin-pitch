---
name: testing-bofa-angular-demo
description: How to build, serve, browser-test and fault-inject the bofa-digital-banking Angular 14 / Nx 14.8 workspace in this repo, including the traps that silently waste time.
---

# Testing `bofa-digital-banking` (Angular 14 / Nx 14.8)

## Toolchain

Angular 14 requires Node 14–16. Every command must be prefixed:

```bash
cd <repo>/bofa-digital-banking
source ~/.nvm/nvm.sh && nvm use 16.20.2
```

`node_modules` is usually already installed; if not, use `npm ci` (note: any dependency
work needs `--legacy-peer-deps` because of `@angular/flex-layout@14.0.0-beta.41`).

## Gates

```bash
npx nx run-many --target=build --all --skip-nx-cache   # expect: 6 projects
npx nx run-many --target=test --all --skip-nx-cache    # expect: 6 projects, 8 suites / 43 tests
npx nx run-many --target=lint --all --skip-nx-cache    # expect: 7 projects, 0 errors / 3 warnings
npm run visual                                         # expect: 23 + 36 passing, 21 snapshots (preferred)
```

The **test tally is easy to get wrong**, and it changes as specs are added — always re-derive it,
never quote a remembered figure. All six projects now set `"passWithNoTests": false`, so every
project must report at least one suite; as of the 23-test era the tally is **8 suites / 43 tests**
(`analytics-sdk-shim` 1/1, `auth-sdk-wrapper` 1/4, `card-services` 1/3, `retail-banking` 1/3,
`wealth-portal` 1/2, `ui-core` 3/30). Earlier rounds of this repo read 5 suites / 12 tests.
If a project's target is cached it prints *nothing*, so grepping a cached run under-counts badly.
Always use `--skip-nx-cache` before quoting a count.

The 3 lint warnings are `@typescript-eslint/no-explicit-any` in `analytics-sdk-shim`; `AGENTS.md`
declares that untyped vendor SDK deliberate, so lint is green with warnings, not broken.

### Prefer `npm run visual` over raw `nx e2e`

`npm run visual` runs the suite inside the Cypress image **pinned by digest**
(`cypress/included@sha256:058d1834…dc517a`) via docker and already passes `--skip-nx-cache`.
CI (`.github/workflows/ci.yml`, `env.CYPRESS_IMAGE`) uses the identical digest, and
`.devin/blueprint.yaml` verifies with `npm run visual`. The image is usually already pulled; docker
must be running.

**A host run is not evidence of anything.** Baselines are captured in that container, so
`npx nx e2e retail-banking-e2e --skip-nx-cache` on the host fails **21 of 21 snapshots** — measured
drift 455 px (`tabs-default`, smallest) to 5,963 px (`accounts-dashboard`), all far over the 40 px
budget. This is renderer/font-hinting difference, not a regression. Two consequences:

- Never conclude "the suite is broken" from a host run, and never use one to demo the gate.
- `demo/RUNBOOK.md` offers a host run as the "docker unavailable" fallback. Following that advice
  live produces a wall of 21 red failures; prefer showing `docs/evidence/ORACLE-noise-floor.md`
  and the last CI run instead.

### `nx e2e` is a CACHED target — this matters for determinism claims

Running `npx nx e2e retail-banking-e2e` twice back to back does **not** run Cypress twice. The
second invocation replays stored output:

```
> nx run retail-banking-e2e:e2e  [existing outputs match the cache, left as is]
   17 passing (6s)
   Nx read the output from the cache instead of running the command for 1 out of 1 tasks.
```

So "I ran it twice and got 17/17 both times" proves nothing on its own. **Always pass
`--skip-nx-cache` when testing determinism or flakiness.** To confirm Cypress really executed,
check that the screenshot mtimes advanced:

```bash
ls --time-style=+%H:%M:%S -l dist/cypress/apps/retail-banking-e2e/screenshots/design-system.cy.ts/
```

If the timestamps are unchanged after a "passing" run, you got a cache replay. Measured properly,
this suite is byte-deterministic: **0 px on all 21 snapshots** across repeated forced runs in the
pinned container, including the five overlay snapshots.

### Overlay snapshots and the `?vr=1` flag

The suite covers interaction states, not just static defaults: `dialog-open`, `select-panel-open`,
`autocomplete-panel-open`, `datepicker-calendar-open`, `button-focus-ring`, plus the customer
surface `accounts-dashboard`. Overlays are only deterministic because `app.module.ts` reads a
`?vr=1` query flag and disables Angular animations (`BrowserAnimationsModule.withConfig`);
`cy.visitShowcase()` appends it and the dashboard test visits `/accounts?vr=1`. Without the flag a
dialog captured mid-transition drifts thousands of pixels.

When testing as a user, **drive the app WITHOUT `?vr=1`** — a human demo will not use it. The flag
is read nowhere else in the codebase, so it should change nothing but animation; verify data,
layout and dialog results match between `/accounts` and `/accounts?vr=1`. Note it ships in the
customer bundle by design, so any URL can disable animations.

Be aware you probably **cannot prove the animation visually**: the enter transition is ~150 ms,
shorter than screenshot latency, so both flagged and unflagged captures look settled. Report that
as inconclusive rather than asserting it; the screen recording is the better evidence.

## Serving the three apps

```bash
setsid nohup npx nx serve retail-banking            > /tmp/serve4200.log 2>&1 < /dev/null &
setsid nohup npx nx serve card-services --port 4201 > /tmp/serve4201.log 2>&1 < /dev/null &
setsid nohup npx nx serve wealth-portal --port 4202 > /tmp/serve4202.log 2>&1 < /dev/null &
```

Use `setsid nohup … < /dev/null &` — plain `&` background jobs die when the shell session is
reaped, and you will come back to `ERR_CONNECTION_REFUSED`. First compile takes ~40–60s per app;
poll `curl -s -o /dev/null -w '%{http_code}' http://localhost:4200/` rather than sleeping blindly.

## Traps that will cost you time

- **`nx e2e` hangs silently if anything holds :4200.** The Cypress target starts its own
  `retail-banking:serve:development`; if the port is taken it stops at an interactive
  `Port 4200 is already in use. Would you like to use a different port? (Y/n)` prompt and never
  fails or times out. Kill dev servers before running the visual suite.
- **`nx serve` can break entirely** with
  `node_modules/.cache/nx/d/server-process.json: Unexpected end of JSON input` after a process is
  killed abruptly. Fix: `npx nx reset`, then restart. Consider running `nx reset` up front.
- **Cypress `--browser chrome` fails** here (Cypress does not discover the Chrome binary). Electron
  (the default) works. Don't chase this as a repo defect.
- **Killing PIDs by hand is risky** — verify with `pgrep -a` first; killing the wrong node process is
  what corrupts the nx cache above.

## Where the UI lives

- `/accounts` — guarded dashboard (`BofaAuthGuard`, entitlement `accounts:read`). The `APP_INITIALIZER`
  blocks bootstrap until the first principal resolves, and `/sign-in` is a real route, so a denied
  navigation terminates instead of looping. If this page is ever blank with chrome at 100% CPU,
  suspect a reintroduced router redirect loop rather than a slow build.
- `/sign-in?r=/accounts` renders a terminal page showing the attempted route. The "Continue to sign
  in" button **is now wired** (`(pressed)="continueToSignIn()"`): it calls
  `BofaAuthService.startSessionRefresh()` and then `navigateByUrl()` to the `?r=` value. To prove it
  honours `?r=` rather than hardcoding the dashboard, test it with a **non-default** target such as
  `/sign-in?r=%2F__showcase%2Ftable` — with `?r=%2Faccounts` alone, a hardcoded redirect would look
  identical.
- **The stub principal always carries `accounts:read`, so the guard never denies and a cold
  `/accounts` never bounces to `/sign-in`.** `/sign-in` is only reachable by typing the URL. If a
  task description says "hit /accounts cold and get bounced", that flow does not exist in the shipped
  code — verify before accepting the premise.
- To exercise the real deny path, temporarily remove `'accounts:read'` from `fetchPrincipal()` in
  `libs/auth-sdk-wrapper/src/lib/bofa-auth.service.ts` (revert afterwards). `/accounts` then does
  redirect to `/sign-in?r=%2Faccounts`, proving the guard wiring is real. But note
  `continueToSignIn()` **cannot recover from a genuine denial**: `startSessionRefresh()` re-fetches
  the same static stub, so entitlements never change and the user stays on `/sign-in`. The sign-in
  round trip is cosmetic by design — do not report it as a crash, but do not claim the deny→sign-in→
  access flow works end to end either.
- Verifying the production build really drops the showcase: `curl` returns **200** for `/__showcase`
  on a static server purely because of SPA `index.html` fallback. That is not evidence the route
  exists. Check the client-side router in a browser (it should land on `/accounts`) and grep the
  bundle for `__showcase` / `Design system`, plus a positive control like `Make a transfer` to prove
  you grepped a real bundle.
- `/__showcase` → index page listing every component. 13 components:
  `button, form-field, select, datepicker, table, dialog, tabs, chips, slide-toggle, autocomplete,
  paginator, currency-input, responsive-grid` (source of truth:
  `apps/retail-banking/src/app/showcase/showcase.component.ts`). Navigate from the index; each page
  links back. The showcase is a lazy module and is dropped from the production build by
  `fileReplacements` swapping `app.routes.ts` for `app.routes.prod.ts`.
- `dialog` now shows **only** an "Open the real dialog" button driving `MatDialog` (Confirm/Cancel
  report a result). The old hand-authored static `.bofa-dialog` markup was deleted, so the
  `dialog-open` snapshot exercises the real overlay. If static dialog markup reappears in
  `showcase.component.html`, the snapshot has become a decoration.
- **Chrome URL-bar autocomplete will bite you**: typing `localhost:4200/__showcase` often completes
  to a previously visited `/__showcase/<component>`. Reach the index via the in-app
  "← all components" link, and confirm the URL before asserting on the page.
- Showcase form controls are one per field. If a currency field ever shows a name again, that is a
  regression in `showcase.component.ts`, not intended behaviour.

## Fault-injecting the visual regression harness

The harness (`apps/retail-banking-e2e/src/support/visual-regression.plugin.ts`) is pixelmatch with
`MAX_DIFF_PIXELS = 40` (absolute, not a ratio) and pixelmatch `threshold: 0.05`.

To prove it fails when it should, edit `libs/ui-core/src/lib/theming/_overrides.scss` uncommitted and
re-run the suite. **Never** set `UPDATE_VISUAL_BASELINES=1` and never commit the edit; revert with
`git checkout --` and `rm -rf apps/retail-banking-e2e/visual-diffs`.

Choose the injection carefully — many plausible tweaks are no-ops or fall under the budget:

- `color:` change on `.bofa-table .mat-header-cell` (slate → brand red) → **753 px (0.082%)** when
  run via `npm run visual` against the current container-captured baselines → **fails**. Under the
  old 0.1% ratio budget this passed silently; the budget is now absolute for exactly this case. This
  is the injection to use when asked whether the oracle catches MDC colour breakage. The diff is
  correctly localised to the header row (bbox ~`y 150-161`), and only `table-default` should fail.
  **This pixel count is renderer- and baseline-dependent — do not quote it from memory.** It has
  been 785 px, then 875 px, now 753 px, changing each time the baselines were regenerated. Measure it
  in the run you are actually doing, and treat any doc that hardcodes a figure as suspect.

**Edit the single line surgically — do not use a blunt `sed`.** `color: bofa.$boa-slate-900;`
appears on **two** lines: 79 (`.bofa-table .mat-header-cell`) and 182 (`.bofa-chips .mat-chip`).
A global `sed -i 's/color: bofa.$boa-slate-900;/.../'` changes both and makes `chips-default` fail
too, which looks exactly like a flaky snapshot and will waste your time. Verify with
`grep -n 'color: bofa.$boa-slate-900;' libs/ui-core/src/lib/theming/_overrides.scss` before running.
- `height:` on `.mat-header-cell` → **0 diff pixels**: the row, not the cell, drives height. Row
  height now lives on `.mat-header-row` / `.mat-row` (OV-05), so inject there instead.
- `background:` on the same selector → 27126 px (2.943%) → fails loudly with the diff ratio in the
  error message and a diff PNG in `apps/retail-banking-e2e/visual-diffs/`.

Every comparison now logs `[visual] <snapshot>: <n> px (budget 40)` on pass **and** fail, so you can
read all counts off one run instead of inferring them from failures.

### Two injections worth knowing

- **Does the customer surface catch a shared-library regression?** The `.bofa-table
  .mat-header-cell` colour injection above fails **both** `table-default` (~753 px) and
  `accounts-dashboard` (~788 px). Exactly two failures is the expected result; one means the
  application-surface baseline stopped covering the dashboard.
- **Do the overlay snapshots earn their keep?** Inject an override that only renders inside an
  overlay — best target is OV-13, `background-color` on `.bofa-datepicker-panel
  .mat-calendar-body-selected` (line ~224), red → blue. Expect `datepicker-calendar-open` to fail
  (~887 px) while the static `datepicker-default` stays at **0 px**. That asymmetry is the proof;
  before the overlay snapshots existed, no snapshot in the suite could see this class of break.

### The missing-baseline hole (was a real HIGH; FIXED — re-verify it stays fixed)

Historically `visual-regression.plugin.ts` copied the actual screenshot over a **missing** baseline
and returned `status: 'created'`, which `matchImageSnapshot` did not throw on. `rm
visual-baselines/accounts-dashboard.png` then `npm run visual` gave `23 passing`, exit 0, and only
20 `[visual]` lines. That allowed a **laundering attack**: delete a baseline while a regression is
live and the regression gets baked into the regenerated baseline and reported green.

As of the override-contract commit this is fixed — the plugin returns `status: 'missing'` when the
file is absent and `UPDATE_VISUAL_BASELINES` is unset, and `commands.ts` throws `No visual baseline
for <name>`. **Re-verify rather than assume**, with all three cases:

1. Delete one baseline → that snapshot must FAIL **and** the file must NOT reappear (`ls` after).
2. Delete a baseline *and* inject a live regression → must fail on both the missing baseline and a
   pixel diff elsewhere; the deleted file must not be written.
3. `npm run visual:update` must still recreate it, and the recreated file must be **byte-identical**
   to the committed one (`md5sum` + `git diff --stat` on `visual-baselines/`). This doubles as a
   renderer-determinism check.

Always:

- **Count the `[visual]` lines — expect 21.** Fewer means a snapshot was skipped, not that it passed.
- CI's "Guard the oracle" job (requires a `BASELINE-CHANGE:` line in the PR body when
  `visual-baselines/**`, the plugin, or an app `project.json` changes) catches *committed* baseline
  changes, but does not make a local run honest.
- Restore with `git checkout -- apps/retail-banking-e2e/visual-baselines/` and re-verify the count
  is back to 21.

### `visual-diffs/` is gitignored — check whose run produced a diff before reporting flakiness

Stray diff PNGs can survive from the **author's** pre-re-baseline run and look like flakiness in
yours. Cross-check every diff filename against your own run logs; if no run of yours produced it,
it is a leftover. Do not present it as your evidence.

Always confirm your injected CSS actually reached the browser before concluding the harness is broken:

```bash
curl -s http://localhost:4200/styles.css | grep -A3 "bofa-table .mat-header-cell"
```

and measure the true ratio yourself against the committed baseline rather than trusting pass/fail:

```bash
node -e "const PNG=require('pngjs').PNG,pm=require('pixelmatch'),fs=require('fs');
const a=PNG.sync.read(fs.readFileSync('apps/retail-banking-e2e/visual-baselines/table-default.png'));
const b=PNG.sync.read(fs.readFileSync('dist/cypress/apps/retail-banking-e2e/screenshots/design-system.cy.ts/vr__table-default.png'));
const d=new PNG({width:a.width,height:a.height});
const n=pm(a.data,b.data,d.data,a.width,a.height,{threshold:0.1});
console.log(n,(n/(a.width*a.height)*100).toFixed(4)+'%');"
```

## Attacking the computed-style override contract (the second Cypress suite)

`apps/retail-banking-e2e/src/e2e/override-contract.cy.ts` + `src/support/override-probes.ts` hold 27
probes, one per `OV-nn` intent, asserting `getComputedStyle` values on the running app. Total suite
is **139 tests = 23 snapshot tests (21 snapshots) + 77 computed-style tests (27 light, 11 dark, 1
dark-surface anti-vacuity control, 32 WCAG ratios over 16 targets in both themes, 6 tests of the
contrast oracle itself) + 39 legibility-sweep tests (`legibility-sweep.cy.ts`: every visible text node
and every painted SVG glyph on 16 routes x 2 palettes, plus 7 tests that attack the sweep itself)**.

The contrast helper lives in `src/support/contrast.ts` and is shared by both suites. Attack it there,
not in the spec: the six self-tests in `override-contract.cy.ts` pin transparent parsing, foreground
alpha, semi-transparent backgrounds, a known opaque pair, ancestor `opacity`, and refusal to score
text over a gradient. Useful attacks — flip `paintsArtwork` to `return false`, drop the
`declared.a * opacity` term, or restore `a: 1` in `parseColour`; each must turn a self-test red.
For the sweep, the highest-value attack is a whole-page one: set `background: #fff` back on
`bofa-root` in `apps/retail-banking/src/app/app.component.ts` and confirm the three customer routes
fail in the dark palette **while all 21 snapshots and all 38 component probes stay green**.

The sweep's own two round-8 false passes are now self-tested, so attack the generalisations rather
than re-deriving them: stub out the `querySelectorAll<SVGElement>('svg')` loop in `sweep()` (the
icon-only test must go red — that hole let a paginator arrow render at 1.00:1 with the gate green),
and make `scrimsOver` return `[]` (the covering-sibling test must go red — that hole overstated a
veiled dark table by 12x). Both are scripted in `scripts/capture-oracle-logs.sh` as
`regress-oracle-glyph-blind` and `regress-oracle-scrim-blind`, with `fault-injection-glyph` as the
product-side version: recolour the paginator arrows to the paginator surface and the sweep must
report an invisible enabled control. Note the two directions that are *policy*, not defect: off-screen
screen-reader-only text is ignored, and text over a gradient fails as UNMEASURABLE unless an ancestor
carries `data-contrast-reviewed="..."`.

Run only this suite (much faster than the whole thing) in the pinned container. **The `--spec` path
is workspace-relative — `src/e2e/...` silently finds no specs:**

```bash
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp \
  -e CYPRESS_CACHE_FOLDER=/root/.cache/Cypress \
  -v "$PWD/..":/w -w /w/bofa-digital-banking --entrypoint bash \
  cypress/included@sha256:058d1834239bf09b381325b8369d05e9e0516a46b65b32e6dc0c991801dc517a \
  -c "npx nx e2e retail-banking-e2e --skip-nx-cache --spec apps/retail-banking-e2e/src/e2e/override-contract.cy.ts"
```

Four attacks worth running, all as uncommitted edits to `_overrides.scss`, reverted after:

- **Change a value** (e.g. header colour, chip height, dialog padding) → the matching probe must fail
  printing `-actual` / `+expected`, and **no unrelated probe** should fail.
- **Break a selector** (rename `.mat-slide-toggle-bar` → `…-DEAD`) → OV-09 must fail measuring
  Material's default `36px`. This is the MDC-migration failure mode the suite exists for.
- **Break a probe's own `target`** → must fail on the `cy.get(probe.target).should('exist')` guard
  ("Expected to find element … but never found it"), not silently skip.
- **VACUITY (the sharpest test): delete the whole rule and see if the probe still passes.**

### Known-vacuous probes — the palette makes them true regardless of our CSS

`bofa-theme.scss` builds Material's **primary** palette from `$boa-red-600`, so Material already
paints selected options, selected calendar days and ink bars brand red. These assertions therefore
pass with the override deleted:

| Probe | Assertion | Vacuous? |
|---|---|---|
| OV-08 | `color` on `.mat-option.mat-selected` | yes (disclosed in the dead-rules doc) |
| OV-13 | `background-color` + `color` on `.mat-calendar-body-selected` | yes |
| OV-10 | `background-color` on `.mat-ink-bar` | yes — but its `height: 3px` **has** teeth |
| OV-05d | zebra `background` on `.mat-row:nth-child(even)` | **no** — use as positive control |

Method notes: always include **OV-05d as a positive control** — if deleting its rule does not fail,
your deletion method is broken and every vacuity result is void. And when a probe asserts several
properties, a meaningful one can fail first and mask a vacuous one (OV-10 fails on `height` before
colour is evaluated) — delete only the single suspect declaration to isolate it.

### The three revived dead overrides — reproducible by reverting each fix

All three are also checkable **live in a browser**, which is better client evidence than a probe:

| Revert | Probe | Measured value that reappears | Visible as |
|---|---|---|---|
| drop `!important` from `.mat-sort-header-arrow` | OV-06 | `opacity: 0` | sort arrows invisible (should be 0.35, 1 on hover) |
| drop `min-height: 28px` from the chip rule | OV-11 | `height: 32px` | chips taller than the 28px rhythm |
| re-wrap OV-15 in `::ng-deep` | OV-15 | `max-height: 256px` | autocomplete panel taller (should be 224px) |

`::ng-deep` in a file compiled into the **global** stylesheet is dropped by the browser — a whole
block can be silently dead. Worth grepping for.

## Proving `?vr=1` is dead in the production bundle

`app.module.ts` gates the flag on `!environment.production`. In the production bundle the branch is
constant-folded to `Sz.withConfig({disableAnimations:false})`, so grep for that literal rather than
for `has('vr')`. Note `URLSearchParams` and `disableAnimations` **do** survive in production from
unrelated Angular internals (`HttpClient.serializeBody`, the animation engine) — do not call that a
false pass.

To check it at runtime, serve the built bundle statically and measure the dialog animation:

```bash
(cd dist/apps/retail-banking && python3 -m http.server 4300)
```

Then click the real trigger and sample `opacity`/`transform` per `requestAnimationFrame`. **Do not
assert from a screenshot** — the ~150 ms animation is shorter than capture latency (this was
inconclusive for two rounds). Two gotchas: the console eval does not await, so stash results on
`window.__x` and read them back in a second call; and a dialog left open by an earlier probe makes
`querySelector` return an already-settled container — always start from a fresh page load and assert
`dialogsBeforeClick === 0`.

Calibrate the instrument in **both** directions before trusting it:

| Scenario | Expected |
|---|---|
| dev, no flag | animation curve: opacity `0`→`1`, scale `0.7`→`1` |
| dev, `?vr=1` | snaps: opacity `1`, transform `none`, every frame |
| prod, `?vr=1` | animation curve ⇒ flag correctly dead |

## Responsive testing — unmaximize before resizing

`xdotool getactivewindow windowsize W H` **silently does nothing while the window is maximized**
(`window.innerWidth` stays put and you will wrongly conclude the breakpoints are broken). Do:

```bash
wmctrl -r :ACTIVE: -b remove,maximized_vert,maximized_horz
xdotool getactivewindow windowsize 900 900
```

Verify with `window.innerWidth` before judging, and re-maximize afterwards.

At ~600px the responsive-grid Detail pane is **hidden with `display:none`, NOT removed from the
DOM** — the wrapper `.bofa-responsive-grid__detail` gets flex-layout's `fxHide.lt-sm`. Earlier
rounds of this skill claimed DOM removal; that was wrong. The trap that caused it: the **stripped
page HTML returned alongside screenshots omits `display:none` subtrees**, so "absent from the HTML I
was shown" is NOT "absent from the DOM". To judge hide-vs-remove, walk the ancestor chain in the
console and read `display` at each level:

```js
let el = document.querySelectorAll('bofa-responsive-grid section')[1], out = [];
while (el && el !== document.documentElement) {
  out.push([el.tagName, el.className, getComputedStyle(el).display]); el = el.parentElement;
}
out // the `display:none` ancestor is the real mechanism
```

A `0×0` rect with `offsetParent === null` while the element's own `display` is `flex` means an
*ancestor* is hidden — keep walking up.

## Dark theme (`?theme=dark`): what it does and does not cover

`.bofa-theme-dark` is built with `mat.all-component-colors`, **not** `all-component-themes`, so it
re-emits **colours only**. Prove it from the compiled bundle rather than arguing from source — parse
`dist/apps/retail-banking/styles.*.css` for rules scoped under `.bofa-theme-dark` and collect the
property names; expect ~397 rules and no `height`/`min-height`/`max-height`/`padding*`/
`border-bottom-width` (only `border-radius` sneaks in). Consequences:

- A dark probe asserting a **geometry** cannot fail dark-only; it fails symmetrically with its light
  twin. Those are **duplicates, not vacuous** — a materially different claim, so say which you mean.
- A dark probe asserting a **Material-primary-derived colour** is vacuous in dark too, because
  primary is BofA red in both themes (OV-10's `background-color`).
- The page `body` background stays white under `?theme=dark`. The dark surface is a partial QA
  surface, not a shipped customer theme — scope severity accordingly.

**Always check dark mode for contrast, not just for asserted values.** A brand-constant override that
is correct in light can become illegible in dark: OV-05d pins the zebra row background to light
slate-50 while the dark palette sets text to white → **1.07:1** contrast, unreadable rows, and the
dark probe **asserts that state as correct** so the suite stays green. Compute ratios in the console
(WCAG AA body text needs 4.5:1) instead of eyeballing:

```js
const lum = ([r,g,b]) => { const f=c=>{c/=255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
  return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
const ratio = (a,b) => { const L1=Math.max(lum(a),lum(b)), L2=Math.min(lum(a),lum(b));
  return ((L1+0.05)/(L2+0.05)).toFixed(2); };
```

The anti-vacuity control is real and worth respecting: break the dark theme two independent ways
(rename `.bofa-theme-dark` in `bofa-theme.scss`; change `get('theme')` in `app.component.ts`) and the
control fails both times, while **all dark probes pass silently** without it (7 at round 6, 8 from
round 6b onward — recount from the run output rather than quoting a number).

## Attacking the WCAG contrast assertions (the legibility gate)

The dark block computes a real ratio from the computed `color` and the first ancestor that actually
paints a `background-color`. Verified behaviours, useful as regression expectations:

| Attack | Result |
|---|---|
| Remove the dark zebra value | contrast fails at **1.0719326855029048** (matches the committed `oracle-logs/dark-contrast-regression.log`) |
| Remove the dark header colour | header contrast fails at **1.8041446049984542**; light OV-05c still passes ⇒ genuine dark-only failure |
| Point the target selector at nothing | fails on Cypress's implicit existence assertion (`Expected to find element … but never found it`) — cannot be silenced |
| Regress the value **and** move the probe's `expectDark` to match | the colour probe goes **green** while the contrast assertion still **fails** — this is the whole point of the design, and the best demo of it |

### Historical helper weaknesses — now FIXED, keep as regression expectations

These three were live defects in earlier rounds and are now hardened in
`apps/retail-banking-e2e/src/support/contrast.ts`. Re-injecting each one still fails the self-test
that names it, so they are useful fault-injection targets (see
`oracle-logs/regress-oracle-{alpha,opacity,gradient}-blind.log`):

1. `rgba(0,0,0,0)` parsing to opaque **black** ⇒ 21:1 on invisible text. Now parses alpha and
   terminates a transparent chain on the white canvas.
2. Foreground alpha ignored (`rgba(255,255,255,0.5)` scored 10.05:1 vs a true 3.87:1). Now
   composited.
3. Ancestor `opacity` ignored (13.20:1 reported where the truth was 3.28:1). Now folded into **both**
   foreground and background.

### The page-wide sweep (`legibility-sweep.cy.ts`) — four gaps that survive

`sweep()` iterates `body *`, keeps elements with a **non-empty direct text child**
(`nodeType === 3`), skips `!visible()`/`exempt()`, and compares `contrastRatio()` to
`requiredRatio()`. That design implies four holes. All four were reproduced live; expect them to
still be there unless the diff says otherwise, and re-test them each round:

| Gap | Why the model cannot see it | Symptom |
|---|---|---|
| **SVG-only content** | requires a direct *text* node, and only calls `contrastRatio()`. `glyphRatio()` exists but is invoked from **one** place (`override-contract.cy.ts`, datepicker toggle). | **false PASS**: recolour the paginator's enabled arrows to the paginator surface ⇒ `glyphRatio` 1.00:1 (invisible) while `sweep()` reports **0 findings** |
| **Semi-transparent *sibling* overlay** | `backgroundLayers()` walks `parentElement` and special-cases only `.cdk-overlay-backdrop`. | **false PASS**: an `rgba(255,255,255,0.92)` positioned sibling over the dark table ⇒ helper says **13.20:1**, human sees ~1.1:1 (12× overstatement) |
| **Legible gradient / image** | `paintsArtwork()` returns UNMEASURABLE ⇒ `ratio: 0` ⇒ reported. Product paints no artwork today, so it is never exercised in-product. | **false FAIL**: white text on `linear-gradient(#7a0019,#c8102e)` is reported as a defect |
| **Off-screen / clipped text** | `visible()` checks `display`/`visibility`/folded `opacity`/non-zero rect — **not** `left:-9999px`, `clip-path`, or a zero-height `overflow:hidden` ancestor. | **false FAIL**: a standard sr-only skip-link is measured as if on screen |

Also: `aria-hidden="true"` content **is** swept and reported. That may be intended policy; treat it
as a question to raise rather than an outright bug.

**Beware the anti-vacuity plant.** It sets **both** `color` and `background` inline, so it never
exercises the ancestor walk — it would still pass if `backgroundLayers()` were wholly broken. The
test that actually covers that path is reverting `--bofa-surface` to `#fff` (see the root-surface
section below).

### Method: attack the shipped helper, not a paraphrase of it

Don't re-implement the ratio maths — a bug in your copy becomes a false finding. Mirror the shipped
`contrast.ts` into a `localStorage`-persisted `__src` string, `eval` it, and expose
`window.__C.sweep`/`__run`. Then a verdict is the gate's own. Two gotchas:

- `localStorage` is **per-origin**, so the helper must be re-injected for each of :4200/:4201/:4202.
- Always print the finding *count* alongside a `glyphRatio`/`contrastRatio` of the element you broke;
  "sweep=0 while this control is 1.00:1" is the whole evidence for a false pass.

Disabled controls are exempt from WCAG 1.4.3, so don't file them as defects — but verify the
exemption is not over-broad by checking a merely-grey **enabled** control *is* reported. Use
`/(^|\s)mat-[a-z-]*disabled(\s|$)/`; a naive pattern misses `mat-chip-disabled`.

## The dark route: "legible" depends on who paints the surface, and `bofa-root` can defeat `body`

This has been the single most productive place to find bugs for three rounds running. The defect
class is always the same: **a light constant surviving onto a dark surface, somewhere the suite does
not look.** Expect it to recur.

**Status:** as of round 8 this is **fixed** — `app.component.ts` now uses
`background: var(--bofa-surface)`, with the token declared once per palette in `bofa-theme.scss`
(`--bofa-surface`, `-raised`, `-sunken`, `--bofa-text-muted`, `--bofa-link`, `--bofa-border`,
`--bofa-text-success`). `bofa-root` computes to `rgb(48,48,48)` on every dark route. Keep the check
below anyway: this defect class recurred three rounds running, and a hardcoded hex re-entering any
stylesheet reintroduces it. **Prefer tokens over per-component `:host-context` rules** — the
token refactor is what finally fixed it globally instead of route by route.

One remnant survives: the **`html` element itself stays `rgb(255,255,255)`** in dark. On most routes
`bofa-root`'s `min-height: 100vh` hides that, but any route with a top margin on its own card exposes
a white band (`/sign-in` has `margin: 96px auto` ⇒ `body.top = 96`). Check
`getComputedStyle(document.documentElement).backgroundColor` explicitly.

**Check the whole ancestor chain, not just `body`.** Even after `.bofa-theme-dark` correctly sets a
dark `background`/`color` on `<body>`, an opaque wrapper *below* body can cover it. If `bofa-root`
ever regains a literal `background: #fff` with no dark counterpart, every route renders
white-on-white while `body` is correctly dark. Diagnose in one line rather than trusting the
screenshot:

```js
// what actually paints under the text?
let n = document.querySelector('h1');
while (n && n.tagName !== 'HTML') {
  const bg = getComputedStyle(n).backgroundColor;
  if (bg !== 'rgba(0, 0, 0, 0)') { console.log('painted by', n.tagName, bg); break; }
  n = n.parentElement;
}
console.log(document.elementFromPoint(500, 600).tagName);  // sanity: who is on top
```

Components that paint their **own** surface (table, paginator, dialog, CDK overlay panels, chips)
stay legible and therefore *mask* the bug — a dark-looking table on a white page is the signature.
Per-component dark styling can also be applied unevenly: showcase *detail* routes got
`:host-context(.bofa-theme-dark)` panels while the showcase **index**, `/accounts` and `/sign-in`
did not.

**Audit with a generic scanner, not a fixed selector list.** The shipped suite asserts a hand-picked
list of targets, so it structurally cannot find anything outside it. Walk every visible
text-bearing element, compute the ratio, and classify enabled vs disabled — this is what surfaced
the secondary button (1.12:1), the currency `$` prefix (1.66:1), the focused field label (1.64:1),
the selected select option (1.20:1) and the shared `.showcase__eyebrow` (2.27:1). Persist the
scanner in `localStorage` so it survives the reloads that `?theme=dark` navigation requires:

```js
localStorage.setItem('__scanSrc', '(' + scanFn.toString() + ')()');
// after every navigation:
eval(localStorage.getItem('__scanSrc'));
```

**Classify disabled state correctly or you will file false defects.** I twice flagged
WCAG-exempt disabled controls as bugs. Match `/mat-[a-z-]*disabled/` — `mat-chip-disabled` and
`mat-button-disabled` do *not* match a narrower pattern — and also check the `disabled` attribute
and `aria-disabled`.

**States the suite never asserts** — check these by hand every round: `:focus` (the focus colour is
often a light-theme accent, so fields go illegible the moment they are clicked), `:hover`,
placeholder text, error/required labels, open overlay panels, the showcase index, `/sign-in`, and
`/accounts?theme=dark`. A fix applied to `.mat-error` did **not** reach the required label, so verify
each element of a "fixed" pair independently.

## Trap: `npx nx e2e` hangs silently if a dev server holds port 4200

`npx nx e2e retail-banking-e2e --skip-nx-cache` starts its **own** dev server. If you already have
`nx serve retail-banking` running for a browser walkthrough, the e2e run blocks **forever** on an
interactive prompt that never appears in a piped log beyond:

```
? Port 4200 is already in use.
```

It looks like a slow test run. Free the port first (`pkill -f "nx serve retail-banking"`, then confirm
with `ss -ltn | grep :4200`), or run the browser walkthrough and the e2e gate in separate phases.

Expected host-run result (this is **not** a product regression, see `ORACLE-noise-floor.md`):
21 of 23 pixel snapshots fail on host-renderer drift (`accounts-dashboard` ~5,963 px,
`table-default` ~4,656 px), while the **39 sweep and 77 override-contract tests pass** — those two
layers are renderer-independent, which is the useful signal from a host run. Only `npm run visual`
(digest-pinned image) is authoritative for pixels.

## Finding the X display for `xdotool`/`wmctrl`

Don't assume `DISPLAY=:1`. Check `ls /tmp/.X11-unix/` — an `X0` entry means `DISPLAY=:0`. A wrong
value fails with `Failed creating new xdo instance. / Cannot open display.` Get the window id with
`xdotool getactivewindow` (searching `--class chrome` can return nothing).

## Verifying a declared `BASELINE-CHANGE` pixel count authoritatively

Don't hand-roll a pixel diff — your threshold metric will disagree with the plugin's (mine reported
606 px where the plugin reported 280 px on the same pair). Instead, restore the **old** blob as the
baseline and let the suite print its own number:

```bash
git show <old-sha>:<path-to>/visual-baselines/form-field-default.png > /tmp/ff-old.png
cp /tmp/ff-old.png apps/retail-banking-e2e/visual-baselines/form-field-default.png
npm run visual                      # prints e.g. [visual] form-field-default: 280 px
git checkout -- apps/retail-banking-e2e/visual-baselines/form-field-default.png
```

Use Pillow's `ImageChops.difference(...).getbbox()` only for **where** the change is (confirming it is
confined to the claimed element), not for how many pixels.

## `--ignore-scripts` installs defer ngcc to build time

`npm ci --legacy-peer-deps --ignore-scripts` skips `postinstall`
(`decorate-angular-cli.js && ngcc`). Build, unit tests and `npm run visual` all still pass (verified
55/55 from a genuinely emptied `node_modules`). Confirm scripts really were skipped via: no
`node_modules/.ngcc_entry_points.json`, zero `__ivy_ngcc__` dirs, and `node_modules/.bin/ng` not
decorated. Expect `Another process, with id …, is currently running ngcc` lock notices on the first
parallel build — the CLI runs ngcc lazily. Harmless here (exit 0, no stale `.ngcc_lock_file`) but a
plausible CI flake source, so don't mistake it for a real failure.

## `visual-diffs/*.diff.png` only appear on FAILURE

The plugin writes a diff PNG only when `diffPixels > MAX_DIFF_PIXELS`. So a full set of 21 diffs means
some run failed all 21 — almost always a **host-renderer** run (455–5,963 px drift), not a real
regression. Check mtimes against your own pinned runs before reporting anything; a passing pinned run
writes none. The dir is gitignored.

## Verifying baseline integrity without fooling yourself

`md5sum <dir>/*.png | md5sum` embeds the **filenames**, so hashing from the repo root vs the workspace
dir yields different manifest hashes for identical files. Always hash from the same cwd, and treat
`git status --porcelain <baselines dir>` as authoritative instead.

## Repo rules to respect while testing

`bofa-digital-banking/AGENTS.md` forbids regenerating a visual baseline to make a test pass,
bypassing `@bofa/auth-sdk-wrapper`, and deleting an `OV-nn` override. Keep any diagnostic edits
uncommitted and revert them; finish by confirming `git diff HEAD` is empty.

## Devin Secrets Needed

None. Everything runs locally with no credentials.
