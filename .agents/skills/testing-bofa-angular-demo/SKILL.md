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
npm run visual                                         # expect: 23 passing, 21 snapshots (preferred)
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

### KNOWN HOLE: deleting a baseline silently re-creates it and passes

`visual-regression.plugin.ts` copies the actual screenshot over a **missing** baseline and returns
`status: 'created'`, and `matchImageSnapshot` only throws on `'diff'` / `'size-mismatch'` — so
`'created'` passes. Verified: `rm visual-baselines/accounts-dashboard.png` then `npm run visual` →
`23 passing`, exit 0, and only 20 `[visual]` lines logged because the deleted snapshot was never
compared.

This is dangerous, not cosmetic: delete a baseline while a regression is live and the regression is
baked into the regenerated baseline and reported green. Removing `-e UPDATE_VISUAL_BASELINES` from
the `visual` script (so a host env var cannot leak in) closed the *altered*-baseline hole but not
this one.

When testing:

- **Count the `[visual]` lines — expect 21.** Fewer means a snapshot was skipped, not that it passed.
- Do not accept "a deleted baseline fails" without deleting one; check whether the fix rejects
  `'created'` unless `UPDATE_VISUAL_BASELINES=1`.
- CI's "Guard the oracle" job (requires a `BASELINE-CHANGE:` line in the PR body when
  `visual-baselines/**`, the plugin, or an app `project.json` changes) catches *committed* baseline
  changes, but does not make a local run honest.
- Restore with `git checkout -- apps/retail-banking-e2e/visual-baselines/` and re-verify the count
  is back to 21.

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

## Repo rules to respect while testing

`bofa-digital-banking/AGENTS.md` forbids regenerating a visual baseline to make a test pass,
bypassing `@bofa/auth-sdk-wrapper`, and deleting an `OV-nn` override. Keep any diagnostic edits
uncommitted and revert them; finish by confirming `git diff HEAD` is empty.

## Devin Secrets Needed

None. Everything runs locally with no credentials.
