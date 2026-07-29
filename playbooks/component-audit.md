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
5. Migration risk per consumer — low / medium / high — with a one-line reason.
6. Estimated files requiring manual attention per consumer.
7. Anything you could not determine, stated as an open question rather than an estimate.

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

### Open questions
- ...
```

## Why this exists

The reason a shared-library upgrade sits in the backlog for years is rarely skill. It is
that nobody currently holds the map of what breaks downstream, and building that map by
hand costs three weeks before any migration work starts. This Playbook produces the map
at the lowest access tier an organisation can grant.
