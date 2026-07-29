# Gate 1 — the automated migration path completes, and the build still fails

**Claim being tested:** "You can just run the vendor codemod" is false for an app with a
custom design system layered over Angular Material.

**Environment:** Node 16.20.2, npm 8.19.4, Nx 14.8.6 → 15.9.7, Angular 14.2.13 → 15.2.9,
Angular Material 14.2.7 → 15.2.9. Run in a scratch copy of `bofa-digital-banking`
at commit `visual regression harness and Angular 14 baselines`.

## What was run, in order

| # | Command | Result | Log |
|---|---|---|---|
| 1 | `ng update @angular/core@15 @angular/cli@15` | **Refused.** `This command is not available when running the Angular CLI outside a workspace.` The Angular CLI cannot drive an Nx workspace that has no `angular.json`. The migration entry point is `nx migrate`, which runs the same Angular `ng-update` schematics. | `gate-01-core15.log` |
| 2 | `nx migrate @angular/core@15` | Succeeded, but bumped **only** `@angular/core`. Material, CDK and the workspace tooling were left at 14. A partial bump like this builds and is the most common way teams end up in a half-migrated state. | `gate-01a-nx-migrate.log` |
| 3 | `nx migrate nx@15.9.7` | Succeeded. Bumped Angular, Material, CDK, Nx, TypeScript 4.8 → 4.9, zone.js 0.11 → 0.12. Generated `migrations.json` with 35 migrations. | `gate-02-nx15-migrate.log` |
| 4 | `npm install` | **Failed** on peer resolution (`ERESOLVE`). Succeeded only with `--legacy-peer-deps`. `@angular/flex-layout@14.0.0-beta.41` peers `@angular/core@^14.0.0` and has no version that peers 15+, so every install from this point forward is a forced install. | `gate-03-npm-install-15.log` |
| 5 | `nx migrate --run-migrations` | **Failed** on `15-7-0-split-configuration-into-project-json-files` ("Schematic is missing a factory"). The migration is inapplicable to this workspace — it targets `workspace.json`, which this repo does not have — so it was removed from `migrations.json` and the run repeated. 33 of 35 migrations then applied cleanly, ending with `This workspace is up to date!`. | `gate-04-run-migrations.log` |
| 6 | `nx build retail-banking` | **Failed.** | `gate-05-build-after-15.log` |

## The failure

```
SassError: No arguments named $headline, $title or $subheading-2.
    ┌──> libs/ui-core/src/lib/theming/_typography.scss
7   │   $boa-typography: mat.define-typography-config(
```

Angular Material 15 renamed every typography level (`$headline` → `$headline-5`,
`$title` → `$headline-6`, `$subheading-2` → `$subtitle-1`, and so on) as part of the
Material Design 3 alignment. Nothing in the migration touches a custom typography
config, because the schematic cannot know which of your levels map to which of theirs.

## Why this is the whole argument

Three separate classes of work survive the codemod:

1. **Theming API generations.** v14 positional `define-light-theme`, v15 map-based,
   v18 `define-theme` for M3, v20 `mat.theme()`. Four rewrites of the same file.
2. **A dependency with no forward path.** `@angular/flex-layout` was deprecated by the
   Angular team and never carried past 15. There is no drop-in replacement; each usage
   has to be read for responsive intent and reproduced in CSS.
3. **Silent visual breakage.** This is the important one and it does not show up here,
   because *CSS does not fail to compile when a selector stops matching anything*.
   The 18 overrides in `_overrides.scss` target Material internals
   (`.mat-form-field-underline`, `.mat-button-wrapper`, `.mat-slide-toggle-bar`, ...).
   Material 15 rewrote the components onto MDC and those elements no longer exist.
   The build is green, the unit tests are green, and the application is visually wrong.

Point 3 is why this repository has a committed visual regression baseline at Angular 14
(`apps/retail-banking-e2e/visual-baselines`, 21 images including four real overlays and the
customer-facing `/accounts` surface; 0 px drift across repeat runs in the pinned renderer, measured
in `docs/evidence/ORACLE-noise-floor.md`).
The baseline, not the compiler, is the oracle for this migration.

## Reproducing

```bash
nvm use 16.20.2
cp -r bofa-digital-banking /tmp/gate && cd /tmp/gate
# NX_SKIP_PROVENANCE_CHECK disables Nx's signature check on the migration
# packages it downloads. It is set here because this sandbox has no network path
# to the provenance endpoint, and it is called out rather than buried: on a BofA
# runner it must NOT be set. If the check fails there, that is a finding to
# investigate, not a flag to add — see docs/meeting/security-qa.md Q4.
NX_SKIP_PROVENANCE_CHECK=true npx nx migrate nx@15.9.7
npm install --legacy-peer-deps
NX_SKIP_PROVENANCE_CHECK=true npx nx migrate --run-migrations --if-exists
npx nx build retail-banking   # fails in _typography.scss
```
