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
npx nx run-many --target=test --all --skip-nx-cache    # expect: 3 suites / 7 tests
npx nx run-many --target=lint --all --skip-nx-cache    # expect: 7 projects
npx nx e2e retail-banking-e2e --skip-nx-cache          # expect: 17 passing, 15 baselines
```

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
this suite is byte-deterministic: max diff across all 15 baselines is 0 px on repeated forced runs.

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
- `/sign-in?r=/accounts` renders a terminal page showing the attempted route. Note the
  "Continue to sign in" button has **no click binding** — it is a deliberate stub for the SSO
  handoff, so "nothing happens when I click it" is expected, not a new bug. Also, the stub principal
  always carries `accounts:read`, so the guard's deny path is **unreachable through normal
  navigation** — you can only reach `/sign-in` by typing the URL. Don't claim you proved the
  deny-redirect end to end.
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
- `dialog` shows both: an "Open the real dialog" button driving `MatDialog` (Confirm/Cancel report a
  result), and static inline markup below it so the snapshot does not depend on overlay timing.
- Showcase form controls are one per field. If a currency field ever shows a name again, that is a
  regression in `showcase.component.ts`, not intended behaviour.

## Fault-injecting the visual regression harness

The harness (`apps/retail-banking-e2e/src/support/visual-regression.plugin.ts`) is pixelmatch with
`MAX_DIFF_PIXELS = 40` (absolute, not a ratio) and pixelmatch `threshold: 0.05`.

To prove it fails when it should, edit `libs/ui-core/src/lib/theming/_overrides.scss` uncommitted and
re-run the suite. **Never** set `UPDATE_VISUAL_BASELINES=1` and never commit the edit; revert with
`git checkout --` and `rm -rf apps/retail-banking-e2e/visual-diffs`.

Choose the injection carefully — many plausible tweaks are no-ops or fall under the budget:

- `color:` change on `.bofa-table .mat-header-cell` (slate → brand red) → 875 px (0.0949%) →
  **fails**. Under the old 0.1% ratio budget this passed silently; the budget is now absolute for
  exactly this case. This is the injection to use when asked whether the oracle catches MDC colour
  breakage. The diff is correctly localised to the header row (bbox ~`y 150-161`).
  (An older note said 785 px — that was measured against the pre-round-2 baselines, which have since
  been deliberately regenerated. 875 px is correct for current baselines.)

**Edit the single line surgically — do not use a blunt `sed`.** `color: bofa.$boa-slate-900;`
appears on **two** lines: 79 (`.bofa-table .mat-header-cell`) and 182 (`.bofa-chips .mat-chip`).
A global `sed -i 's/color: bofa.$boa-slate-900;/.../'` changes both and makes `chips-default` fail
too, which looks exactly like a flaky snapshot and will waste your time. Verify with
`grep -n 'color: bofa.$boa-slate-900;' libs/ui-core/src/lib/theming/_overrides.scss` before running.
- `height:` on `.mat-header-cell` → **0 diff pixels**: the row, not the cell, drives height. Row
  height now lives on `.mat-header-row` / `.mat-row` (OV-05), so inject there instead.
- `background:` on the same selector → 27126 px (2.943%) → fails loudly with the diff ratio in the
  error message and a diff PNG in `apps/retail-banking-e2e/visual-diffs/`.

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
