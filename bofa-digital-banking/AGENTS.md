# BoA Digital Banking — agent conventions

Read this before changing anything in this repository.

## Architecture

- Nx monorepo. `libs/ui-core` is the shared design system, published internally as
  `@bofa/ui-core`. Three applications consume it: `retail-banking`, `card-services`,
  `wealth-portal`. **Breaking `ui-core` breaks all three.**
- Every Material component is wrapped as `bofa-*`. Application code must never import
  from `@angular/material` directly. The wrapper layer is what makes a Material major
  upgrade a change in one library rather than a change in every application.
- `libs/auth-sdk-wrapper` is the only permitted route to SSO/MFA.
- `libs/analytics-sdk-shim` is the boundary that contains the untyped vendor analytics
  SDK. `any` inside it is deliberate.

## Non-negotiables

- **Never bypass `@bofa/auth-sdk-wrapper`.** All auth, session and MFA flows go through it.
- **Never modify a visual regression baseline to make a test pass.** Baselines live in
  `apps/retail-banking-e2e/visual-baselines`. If a snapshot changes, the change is either
  intentional and documented in the PR with a reason, or it is a bug. Regenerating a
  baseline (`npm run visual:update`) is a deliberate, reviewable act: it must be called
  out with a `BASELINE-CHANGE: <reason>` line in the PR description, which the "Guard the
  oracle" CI job enforces, and it needs design-system owner review (`.github/CODEOWNERS`).
- **Run the visual suite through `npm run visual`.** It pins the renderer by digest and
  passes `--skip-nx-cache`. A host run disagrees with the committed baselines by thousands
  of pixels (`docs/evidence/ORACLE-noise-floor.md`), and an Nx cache hit is not a test run.
- **Overrides in `libs/ui-core/src/lib/theming/_overrides.scss` exist for stated reasons.**
  Each carries an `OV-nn` comment explaining its intent. Preserve the intent, not the
  selector. Deleting an override to make a build or a test pass is never acceptable.
- **The override contract is the intent, expressed as an assertion.**
  `apps/retail-banking-e2e/src/support/override-probes.ts` holds one probe per `OV-nn`
  intent, asserting a computed style on the running app. A migration is *expected* to
  change a probe's `target` when Material moves an internal — that edit is the work, and
  it is reviewable. Changing a probe's `expect` value is changing what the customer sees:
  it needs the design-system owner, and it is declared like a baseline change. Deleting a
  probe to get to green is never acceptable.
- **Never widen a dependency constraint you have not verified.** If a peer range blocks,
  read the package's actual API usage against the target version first and write what you
  checked into the PR.
- **Never disable a lint rule, a type check, or a test to get to green.**

## Commands

```bash
nvm use 16.20.2                     # Angular 14 requires Node 14–16
# `--ignore-scripts` is the security policy, not a preference: a lifecycle script
# from a transitive dependency runs before any human reads the diff. CI installs
# the same way, so a package that genuinely needs a postinstall must be
# allowlisted deliberately rather than discovered by a green build here.
npm ci --legacy-peer-deps --ignore-scripts   # bare `npm ci` fails ERESOLVE on the auth peer pin
npx nx build ui-core
npx nx run-many --target=build --all
npx nx run-many --target=test --all
npx nx run-many --target=lint --all
npm run visual                      # visual regression in the pinned Cypress image
npm run visual:update               # re-baseline (reviewable act)
```

## Definition of done

A change is complete when **all** of the following hold:

1. `nx run-many --target=build --all` passes.
2. `nx run-many --target=test --all` passes.
3. `npm run visual` passes, **or** every visual diff is explained in the PR.
4. Any change to a `ui-core` public API has a characterisation test.
5. The PR contains a per-file rationale for everything under `theming/`.

## PR format

- Conventional commits: `type(scope): message`.
- Every PR touching `ui-core` includes a per-file rationale.
- Any dependency version change states why the previous constraint was safe to move and
  what was verified.
- List downstream consumers affected by any public API change.
