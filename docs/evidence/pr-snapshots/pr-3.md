<!-- Captured 2026-07-29T05:35:07Z from https://github.com/t1mchee/devin-pitch/pull/3 . PR bodies are mutable; this file is not. -->
# PR #3: feat(ui-core): Angular 15.2 / Material 15.2 (MDC) migration — partial, stopped-and-asked

**State:** open
**Author:** devin-ai-integration[bot]
**Branches:** run/ph1-1fb2d704-material15 → devin/1785284066-bofa-angular-demo
**Merge status:** **⚠️ Merge conflict detected**
**No labels**
**URL:** https://github.com/t1mchee/devin-pitch/pull/3

## Description

## Summary

Migrates the workspace from Angular 14 / Material 14 to **Angular 15.2.9 / Material 15.2.9 (MDC)**, targeting `libs/ui-core` and its consumer `retail-banking`. The version step is mechanically complete and the code compiles, unit tests pass, and lint passes. **The migration is a partial / stopped-and-asked result:** an honest MDC migration changes the rendered DOM of every wrapped component, so the committed visual baselines no longer match, and re-baselining is forbidden. That, plus a production bundle-budget failure and two overrides whose intent is unrecoverable, are the open questions below.

**Terminal state: `stopped-and-asked` (partial).** Nothing was forced to green. No baseline was modified.

> **Rebased on base `devin/1785284066-bofa-angular-demo`** (commit `f9d0de0`, *"session-aware guard, real interactions, tighter visual oracle"*). That commit, on the v14 line, **regenerated all 15 baselines**, **tightened the oracle** from a `0.1%` ratio to an **absolute `MAX_DIFF_PIXELS = 40`** budget (pixelmatch `threshold: 0.05`), added session-aware guard logic + real e2e interactions, and added new override rules to OV-05 / OV-12 / OV-17. The one merge conflict (OV-05) was resolved by hand; the base's new rules were reconciled with the MDC migration (details below). All numbers below are re-measured against the base's new baselines/oracle.

---

## Version path & commands (per step)

| Step | Command | Result |
|---|---|---|
| Setup | `nvm use 16.20.2 && npm ci --legacy-peer-deps` | ok |
| 2 — baseline (v14) | `nx run-many --target=build --all` / `--target=test --all` / `nx e2e retail-banking-e2e` | build ✅, test ✅, **e2e 17/17 ✅** |
| 3 — version step | `nx migrate nx@15.9.7` → `npm i --legacy-peer-deps` → `nx migrate --run-migrations` | Angular 15.2.9, Material 15.2.9, Nx 15.9.7, NgRx 15.3.0, RxJS 7.8.2, TS 4.9.5, zone.js 0.12.0, `@angular/flex-layout` 15.0.0-beta.42 |
| 4 — MDC | moved components off the schematic's `legacy-*` escape hatch onto real MDC; remapped overrides | see below |
| 6 — theming | rewrote `_typography.scss`, `bofa-theme.scss` | see below |
| 9 — verify (post-rebase) | `nx run-many build/test`, `nx e2e retail-banking-e2e` | build ❌ (budget), test ✅ (6 projects), **e2e 5/17** |

The Material schematic took the **`legacy-*`** path (keeps v14 components/DOM, defeating the point of the migration). I reverted `ui-core.module.ts` and `bofa-dialog.component.ts` to the non-legacy **MDC** modules (these net to zero vs. the v14 base, so they don't appear in the diff) and did the real MDC work by hand.

## Per-file rationale — everything under `theming/`

- **`_typography.scss`** — Material 15 renamed the 2014 typography levels to the 2018 names; the old `$headline/$title/$subheading-2` args are rejected (this was the step-3 build break). Renamed to `$headline-5/$headline-6/$subtitle-1` and applied the **`body-1`↔`body-2` swap** (2014 `body-1`=400 → 2018 `body-2`; 2014 `body-2`=600 → 2018 `body-1`). **All px / line-height / weight / letter-spacing values are unchanged** — only parameter names moved. Mapping taken from Material's own `private-typography-to-2014-config`.
- **`bofa-theme.scss`** — v15 replaces the positional `define-light-theme($primary,$accent,$warn)` with a single config map. Palette definitions (`define-palette` hues 600/100/800 red, 500/50/700 blue) are **unchanged**; typography and `density: 0` (the v14 default) are declared explicitly.
- **`_overrides.scss`** — remapped 16/18 overrides to MDC DOM hooks confirmed by **inspecting the rendered markup** of each showcase component, not guessed from class names. Every `OV-nn` intent comment is preserved verbatim. See mapping table.

## Override migration (16/18 mapped)

| OV | v14 hook → MDC hook | Note |
|---|---|---|
| 01 | `.mat-form-field-underline` → `.mdc-line-ripple::before`; ripple → `.mdc-line-ripple::after`; label → `.mat-mdc-floating-label` | host `mat-focused`/`mat-form-field-disabled` unchanged |
| 02 | `.mat-form-field-subscript-wrapper` → `.mat-mdc-form-field-subscript-wrapper` | |
| 03 | `.mat-button-wrapper` → `.mdc-button` + `.mat-icon`; `mat-flat-button` → `mat-mdc-unelevated-button` | |
| 04 | focus overlay → `.mat-mdc-button-persistent-ripple::before` | interaction state, not in snapshots |
| 05 | `.mat-header-cell/.mat-cell/.mat-row` → `.mat-mdc-header-cell/.mat-mdc-cell/.mat-mdc-row`; **row-height on `.mat-mdc-header-row`/`.mat-mdc-row`** | reconciled with base's new rules — see below |
| 06 | `.mat-sort-header-arrow` unchanged in MDC | not in snapshots |
| 07 | `.ma… (94 chars truncated)
… (96 lines truncated)
<truncation_notice>
Full output written to: /home/ubuntu/.devin-files/devin-remote-overflows-1000/9f715e93/content.txt
</truncation_notice>