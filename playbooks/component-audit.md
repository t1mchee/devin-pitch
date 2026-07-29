# Playbook: `!component-audit` (read-only)

Parameter: `{{COMPONENT}}`

This Playbook requires **read access only**. It makes no code changes, creates no branch
and opens no pull request. It is the week-one artefact for a staged-trust evaluation:
useful whether or not you buy anything.

## Objective

Produce a blast-radius report for `{{COMPONENT}}` in `libs/ui-core`.

## Procedure

1. Every consuming application, and the specific files where the component is used.
2. Every custom SCSS override targeting the component or its Material internals, by
   `OV-nn` number.
3. For each override, the Material internal element or class it depends on.
4. Which of those internals **do not exist** in the MDC implementation (Material 15+),
   and therefore which overrides will silently stop applying.
5. **A census of `fx*` layout attributes** (`fxLayout`, `fxFlex`, `fxLayoutGap`, `fxLayoutAlign`,
   `fxHide`, `fxShow`, and every `.lt-*`/`.gt-*` responsive variant), per file, per consumer — plus
   which templates carry them **without** their module importing `FlexLayoutModule`.
   `@angular/flex-layout` has no release past `15.0.0-beta.42`, so every one of these becomes
   hand-written CSS at v16. It is the hop nothing automates, so it is the number that sets the
   schedule. Report the count even when it is zero, and never infer it from a module import alone.
   Two traps found by actually running this (see `docs/evidence/PHASE2-15-to-16.md` §3.3):
   - **Inert attributes.** `card-services` carried `fx*` attributes in a template whose module never
     imported `FlexLayoutModule`, so they rendered as plain block divs and always had. The correct
     action is *delete*, not "reproduce in CSS" — reproducing an intent that never rendered is
     inventing a layout change and calling it a migration.
   - **Breakpoint values are not obvious.** flex-layout's defaults are `lt-sm ≤ 599.98px`,
     `lt-md ≤ 959.98px`, `lt-lg ≤ 1279.98px`. Write them into the report so the CSS rewrite is a
     transcription rather than a guess.
6. Migration risk per consumer — low / medium / high — with a one-line reason.
7. Estimated files requiring manual attention per consumer.
8. Anything you could not determine, stated as an open question rather than an estimate.

## Output

A markdown report in the session. No commits, no branches, no PR.

Format:

```
## {{COMPONENT}} — blast radius

| Consumer | Files | Overrides in play | Risk | Reason |
|---|---|---|---|---|

### Overrides
| OV | Intent | Material internal | Exists in MDC? | Action |
|---|---|---|---|---|

### flex-layout census (blocks v16)
| Consumer | File | `fx*` attributes | `FlexLayoutModule` imported? | Action |
|---|---|---|---|---|

### Open questions
- ...
```

## Why this exists

The reason a shared-library upgrade sits in the backlog for years is rarely skill. It is
that nobody currently holds the map of what breaks downstream, and building that map by
hand costs three weeks before any migration work starts. This Playbook produces the map
at the lowest access tier an organisation can grant.
