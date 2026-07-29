<!-- Captured 2026-07-29T05:35:07Z from https://github.com/t1mchee/devin-pitch/pull/2 . PR bodies are mutable; this file is not. -->
# PR #2: feat(ui-core): migrate ui-core and retail-banking to Angular 15.2 / Material 15.2 (MDC)

**State:** open
**Author:** devin-ai-integration[bot]
**Branches:** run/ph1-cb4f31e3-material15 → devin/1785284066-bofa-angular-demo
**Merge status:** **⚠️ Merge conflict detected**
**No labels**
**URL:** https://github.com/t1mchee/devin-pitch/pull/2

## Description

## Summary

Moves `libs/ui-core` and `retail-banking` (and, unavoidably, the rest of the workspace) from Angular 14.2 / Material 14.2 to **Angular 15.2.9 / Material 15.2.9**, and rewrites the `ui-core` theming layer for MDC.

The migration itself is mechanical. The real work is `libs/ui-core/src/lib/theming/_overrides.scss`: all 13 wrapped components are now MDC, so every v14 selector in that file stopped matching — silently, because CSS does not error. **All 18 overrides are remapped onto hooks read off the rendered v15 DOM** (dumped from the running showcase, not guessed from class names), and the override contract (`override-contract.cy.ts`, 22 probes) is **green**: every `OV-nn` intent is measured on the running app and holds.

**The pixel oracle is not green.** `npm run visual` is **29 passing / 16 failing** across the two specs (45 tests): the override contract 22/22, the screenshot suite 7/23. **No baseline image was touched** — `git diff <base> HEAD -- apps/retail-banking-e2e/visual-baselines` is empty, as is the diff of `visual-regression.plugin.ts`, and `UPDATE_VISUAL_BASELINES` was never set. The 16 diffs are MDC's own geometry and typography, tabulated one by one below; whether they become the new baseline is a design-system owner decision, not something to erase.

BASELINE-CHANGE: no baseline image and no diff budget threshold changed. Declared for the oracle guard because this PR edits two guarded files: (a) `override-probes.ts` — only the `target` selectors move onto their MDC equivalents, which is the migration work the contract explicitly anticipates; **every `expect` value is byte-for-byte unchanged**; (b) `apps/retail-banking/project.json` — initial-bundle *error* budget 1.00 MB → 1.05 MB (rationale under "Dependency constraints").

### Status

| | |
|---|---|
| Angular / Material 15.2.9 | done |
| `_overrides.scss` mapped to MDC | **18 / 18** |
| Override contract (`override-contract.cy.ts`) | **22 / 22 pass** |
| `nx run-many --target=build --all` | pass (6 projects) |
| `nx run-many --target=test --all` | pass (6 projects) |
| `nx run-many --target=lint --all` | pass (7 projects, 0 errors) |
| `npm run visual` (pinned image, `--skip-nx-cache`) | **29 passing / 16 failing** (screenshots 7/23) |
| Baseline images / diff budget modified | **no** |
| `@angular/flex-layout` removal (playbook step 6) | **not done — deferred, see below** |

## Version path and commands

```bash
nvm use 16.20.2 && npm ci --legacy-peer-deps

# baseline before any change: build pass, test pass, e2e 17/17
npx nx run-many --target=build --all
npx nx run-many --target=test --all
npx nx e2e retail-banking-e2e

# 14 -> 15 (single major hop; 15 is the target, so no intermediate step)
npx nx migrate 15.9.7            # @nrwl/* 14.8.6 -> 15.9.7
npx nx migrate --run-migrations  # includes the Material 15 MDC schematic
```

`@angular/*` `~14.2` → `15.2.9`, `@angular/material` + `@angular/cdk` `^14.2.7` → `15.2.9`, `@nrwl/*` `14.8.6` → `15.9.7`, `@ngrx/*` `14.3.2` → `15.3.0`, TypeScript `4.8` → `4.9.5`, `jest` 28 → 29, `jest-preset-angular` 12 → 13, `ng-packagr` 14 → 15, `zone.js` `0.11.4` → `0.12.0`, `rxjs` `7.5` → `7.8.2`.

Three manual interventions:

1. The generated `migrations.json` contained a **duplicate** `15-7-0-split-configuration-into-project-json-files` entry, and the second copy failed with `Schematic ... is missing a factory`. The duplicate was removed (35 → 33 migrations) and the run completed.
2. The Material schematic rewrote every import to `@angular/material/legacy-*` (`MatLegacyButtonModule`, `MAT_LEGACY_DIALOG_DATA`, …). **All of those were reverted to the modern entry points.** The legacy packages are the v14 components under a new name; taking them would have made the build and the visual suite pass while shipping none of MDC and leaving the whole problem for the v16 hop, where the legacy packages are deleted.
3. **Cypress is pinned back to `10.11.0`** (the Nx 15 migration had moved it to `12.17.4`). The visual oracle runs inside `cypress/included@sha256:058d18…`, which ships the 10.11.0 binary; with `cypress@12` in `package.json` the container run dies with *"the Cypress binary is missing"* and the gate cannot execute at all. Bumping the image instead would replace the renderer the baselines are a contract against, so the package moved, not the image.

## Per-file rationale — `libs/ui-core/src/lib/theming/`

### `_typography.scss`

The 2014 level names are gone from `define-typography-config`. Every px/line-height/weight value is unchanged; only names move.

```diff
- $headline:     28px/34px … (37 chars truncated)
… (155 lines truncated)
<truncation_notice>
Full output written to: /home/ubuntu/.devin-files/devin-remote-overflows-1000/807b568f/content.txt
</truncation_notice>