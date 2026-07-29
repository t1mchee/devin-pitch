# Verification standard

**Trigger:** test, CI, done, verify, complete

"Done" for this repository means all five of these, with evidence:

1. `npx nx run-many --target=build --all` passes.
2. `npx nx run-many --target=test --all` passes.
3. `npm run visual` passes, or every visual diff is explained in the PR. It runs Cypress in the
   pinned `cypress/included:10.11.0` image with `--skip-nx-cache`: pixel baselines are only
   comparable against a fixed renderer, and a cached Nx result is not a run.
4. Any change to a `ui-core` public API has a characterisation test.
5. The PR contains a per-file rationale for everything under `theming/`.

Two things that are never acceptable:

- Regenerating a visual baseline to make the suite pass. Baselines change only as a
  deliberate, reviewed act, called out explicitly in the PR description.
- A test that asserts nothing meaningful. Coverage that exists to move a percentage is
  worse than no coverage, because it creates false assurance in an audit.
