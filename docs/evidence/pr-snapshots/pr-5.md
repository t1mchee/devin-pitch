<!-- Captured 2026-07-29T05:35:07Z from https://github.com/t1mchee/devin-pitch/pull/5 . PR bodies are mutable; this file is not. -->
# PR #5: build(workspace): Angular/Material 15 → 16 + remove @angular/flex-layout

**State:** open
**Author:** devin-ai-integration[bot]
**Branches:** run/ph2-1516-flexlayout → run/ph1-cb4f31e3-material15
**Merge status:** Mergeable (no conflicts)
**No labels**
**URL:** https://github.com/t1mchee/devin-pitch/pull/5

## Description

## Summary

The Angular 15 → 16 hop for the whole workspace, plus removal of `@angular/flex-layout` (no
release past `15.0.0-beta.42`). Full evidence, per-file rationale and every pixel count are in
[`docs/evidence/PHASE2-15-to-16.md`](../blob/run/ph2-1516-flexlayout/bofa-digital-banking/docs/evidence/PHASE2-15-to-16.md); the high-signal parts are below.

**Build + unit tests pass on all 6 projects; lint on all 7.** The base branch has since added a
**computed-style override oracle** (`override-contract.cy.ts`) — a font-independent gate — which this
branch reconciles and passes **22/22** (§6). The image `design-system` snapshot suite stays red on a
**pre-existing font substitution** (identical on the base branch), not a Phase-2 regression, and no
baseline was regenerated (§3).

### 1. flex-layout removal (hard part 1) — the contract baselines PASS in CI

`bofa-responsive-grid` directives reproduced 1:1 in CSS using flex-layout's default breakpoints
(`lt-sm ≤599.98`, `lt-md ≤959.98`, `lt-lg ≤1279.98`):

```
fxLayout row / .lt-md column      -> flex-direction + @media(≤959.98){column}
fxLayoutGap 16px                  -> gap:16px
fxLayoutAlign space-between stretch -> justify-content + align-items
fxFlex 30 / .lt-lg 40 / .lt-md 100 -> summary flex:0 0 30% ; @media(≤1279.98){40%} ; @media(≤959.98){0 0 auto}
fxFlex (detail)                   -> flex:1 1 0
fxHide.lt-sm (detail)             -> @media(≤599.98){display:none}
```

Proof — **the committed `responsive-grid-default` / `-md` / `-sm` baselines PASS in CI** on the CSS
rewrite (within the 40-px budget; they contain ~no text so the font noise that fails the other
snapshots doesn't touch them). Corroborated by a **0-pixel** diff vs the old flex-layout render in
the same docker container, and CDP geometry matching the contract (1280→summary 288/detail 656px +
16 gap; <1280→40%; <960→stacked 704px; <600→detail `display:none`). `FlexLayoutModule` and
`@angular/flex-layout` removed. **Downstream `card-services`:** its `fx*` attributes were **already
inert** (that app never imported `FlexLayoutModule`, so they rendered as plain block divs). They are
now **removed** (forced by a new base-branch consumer spec that imported `FlexLayoutModule`); the
never-active *intended* layout was deliberately **not** invented in CSS. Rendering unchanged (§6.5).

### 2. Material 16 theming (hard part 2)

No `legacy-*` imports exist (ph1 is already pure MDC); the v15 theming entry points (`mat.core`,
`define-palette`, `define-light-theme`, `define-typography-config`, `all-component-themes`) remain
valid in v16 — palette/typography/`density:0` unchanged, no Sass deprecations. **Two override fixes:**

- **OV-09 (slide-toggle, green thumb):** in v16 the visible thumb colour is a design token MDC
  derives from *primary* (red), so `background-color` on `.mdc-switch__handle::after` never wins the
  rendered knob. Set the token green for every selected interaction state **and** keep base's
  `background-color` on the `.mdc-switch__handle` element (the oracle reads a computed style off the
  handle, which cannot see an `::after`). Verified thumb = `rgb(11,122,59)`; `OV-09`/`OV-09b` pass.
- **OV-01 (disabled field label, slate not `rgba(0,0,0,.38)`):** the base oracle exposed a real v16
  regression — a disabled field *floats* its label and Material paints it via
  `color: var(--mdc-filled-text-field-disabled-label-text-color)` on a selector that ties the plain
  override on specificity and wins on source order. Fixed by setting the token to `$boa-slate-600`
  on `.bofa-form-field` (verified computed `rgb(93,102,115)`).

### 3. Every visual diff — CI base-vs-PR, same runner (isolates Phase-2 delta, zero font noise)

CI runs on the GitHub `ubuntu-24.04` runner — a font env distinct from the committed baseline, so
every text-heavy snapshot fails there **on ph1 too**. Comparing this PR against the base branch in
that identical env:

| snapshot | ph1 base | PR #5 | Δ | reading |
|---|---|---|---|---|
| responsive-grid default/md/sm | **PASS** | **PASS** | — | contract met |
| button / table / dialog / tabs / chips | 610/12453/6898/4661/722 | same | **0** | no change |
| paginator / form-field / select / datepicker / autocomplete / currency-input | 2323/7421/3148/2918/1511/1700 | ~ | −5…−24 | MDC v16 label/numerals only |
| slide-toggle | 2710 | 2525 | −185 | **intended** OV-09 blue→green |

Layout contract met, several components byte-identical to base, MDC-label family shifts ≤24 px, and
the one real change is the intended slide-toggle green. **No Phase-2 regression.** Recommend shipping
the `BoA Sans` … (88 chars truncated)
… (64 lines truncated)
<truncation_notice>
Full output written to: /home/ubuntu/.devin-files/devin-remote-overflows-1000/a909eb5d/content.txt
</truncation_notice>