# Design system override policy

**Trigger:** Material, SCSS, theming, `_overrides.scss`, MDC, design system

Overrides in `libs/ui-core/src/lib/theming/_overrides.scss` are numbered `OV-nn` and each
carries a comment stating its intent. The selector is an implementation detail of Angular
Material. **The intent is the contract.**

When migrating an override:

1. Read the intent comment and state the visual outcome in one sentence.
2. Inspect the rendered DOM at the target Material version. Do not infer the new hook
   from the old class name — MDC renames and restructures, it does not just rename.
3. Rewrite the override to achieve the same visual outcome.
4. Re-run the visual regression suite for that component before moving on.

**Never delete an override to make a build or a test pass.** An override you cannot map
is a question for the design system owner. Stop and ask.

CSS does not error when a selector stops matching. A migration that removes the overrides
compiles clean, passes unit tests, and ships a visually broken application. The visual
regression baseline is the only thing that catches it.
