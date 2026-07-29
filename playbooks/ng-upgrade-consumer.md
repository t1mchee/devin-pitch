# Playbook: `!ng-upgrade-consumer`

Parameters: `{{TARGET_PACKAGE}}`, `{{TARGET_VERSION}}`

> `{{TARGET_VERSION}}` is parameterised deliberately. The 20-to-22 follow-on run is this
> same Playbook with that one value changed. If a future version needs a different
> Playbook, the "every migration after the first is a re-run" claim is false.

## Objective

Upgrade `{{TARGET_PACKAGE}}` to Angular `{{TARGET_VERSION}}`, preserving all visual
behaviour and without breaking downstream consumers.

## Scope

You are upgrading ONE package. Do not modify others unless strictly required to make the
target build, and if you do, state it explicitly in the PR with the reason.

Do not refactor. Do not rename. Do not "improve" code you are passing through. Scope
drift is the single largest cause of a migration PR being rejected.

## Procedure

1. **Survey. Change nothing. Post this before touching a file.**
   Report: the current Angular version; every Angular-adjacent dependency with its
   version; every usage of `@angular/flex-layout`; every `legacy-*` Material import;
   every direct `@angular/material` import outside `libs/ui-core`; every override in
   `_overrides.scss` with its `OV-nn` number and one line on what it does.

2. **Baseline.** Run `nx run-many --target=build --all`, `nx run-many --target=test --all`
   and `npm run visual`. Record the pass state. **If anything fails before you
   start, stop and report.** You cannot attribute a failure you did not establish a
   baseline for.

3. **Step the version. One major at a time.** Build after each major. Do not proceed to
   the next until the current one builds. Record the command used and the outcome.

4. **Material MDC — the hard part.** At v15 the components move to MDC and the DOM
   changes shape. Run the schematic first. Then, for each override in `_overrides.scss`:
   - read the `OV-nn` intent comment and state the visual outcome it protects;
   - identify the equivalent hook in the MDC DOM (inspect the rendered markup; do not
     guess from the class name);
   - rewrite the override to achieve the same visual outcome;
   - re-run the visual suite for that component before moving to the next.

   **If you cannot identify an equivalent hook, stop and ask. Do not guess, and do not
   delete the override.** An override you cannot map is a question for the design system
   owner, not a judgement call for you.

5. **`@angular/flex-layout`.** There is no automated path and no drop-in replacement.
   Determine the responsive behaviour from the directives and the breakpoint suffixes,
   write the equivalent CSS grid or flexbox, and verify against the responsive snapshots
   (`responsive-grid-md`, `responsive-grid-sm`). The intent is documented in the
   component's TSDoc; that comment is the contract.

6. **Theming API.** Migrate through each API generation in turn. Preserve exact palette
   values, typography levels and density. The palette is locked by Brand: if a colour
   value changes, you have made a mistake.

7. **Peer dependencies.** Do not widen a range until you have verified the package's
   actual API usage against the target version. For `@bofa/auth-sdk-wrapper`, that means
   checking the guard, the `APP_INITIALIZER` factory, the interceptor registration and
   the teardown pattern against the target's API surface. Document exactly what you
   checked in the PR.

8. **Tests.** Any change to a `ui-core` public API gets a characterisation test that
   pins the existing behaviour. A test that asserts nothing meaningful is worse than no
   test, because it creates false assurance in an audit.

9. **Verify.** Build, unit tests, visual regression. Every visual diff is either zero or
   explained. **Never regenerate a baseline to make the suite pass.**

10. **PR.** Include:
    - the version path taken and the command used at each step;
    - per-file rationale for everything under `theming/`;
    - every visual diff and why it is acceptable;
    - downstream consumers affected by any public API change;
    - any constraint widened, with what you verified before widening it.

## Stop conditions

Stop and ask rather than guessing if:

- an override's intent is ambiguous or unrecoverable from the code;
- a visual diff cannot be explained;
- a dependency has no path to the target version;
- the change you would have to make touches auth, or changes a public `ui-core` API in a
  way a consumer cannot absorb without code changes.

Stopping to ask is a successful outcome for this Playbook. Guessing is not.

## Revision history

Kept in `playbooks/REVISIONS.md`. Every change to this file is a change to a standard and
is reviewed like one.
