# Demo runbook — 12 minutes, live

Everything here runs from `bofa-digital-banking/`. Node 16.20.2. Docker must be running (the
visual gate is containerised). **Rehearse with the timings; the cuts are where the value is.**

## Before you start (not on the clock)

```bash
nvm use 16.20.2
npm ci --legacy-peer-deps
npx nx reset                 # a stale Nx daemon is the #1 live-demo failure
lsof -ti:4200 | xargs -r kill
docker pull cypress/included@sha256:058d1834239bf09b381325b8369d05e9e0516a46b65b32e6dc0c991801dc517a
```

Open, in tabs: the repo, PR [#2](https://github.com/t1mchee/devin-pitch/pull/2),
PR [#3](https://github.com/t1mchee/devin-pitch/pull/3),
`docs/evidence/VARIANCE-phase1-material15.md`, `docs/evidence/GATE-01-automated-migration-is-not-enough.md`.

## 0:00–1:30 — The app, so the pixels mean something

`npx nx serve retail-banking` → `/accounts`. Make a transfer, confirm, cancel. Sort the table.
Say: *this is the customer surface; every control on it comes from one shared library that twenty
teams consume.*

## 1:30–3:00 — The library and its rules

`libs/ui-core` — 13 wrapped components. `_overrides.scss` — 18 overrides, each with an `OV-nn`
reason. `AGENTS.md` — the rules the agent is held to. Land the line: **an override without a
recorded reason is the actual migration risk, not the version number.**

## 3:00–4:30 — The oracle, and one deliberate failure

```bash
npm run visual        # 154 tests: 23 image tests over 21 compared snapshots,
                      # + 27 light probes, 11 dark probes, 1 anti-vacuity control,
                      # + 32 WCAG ratios (16 targets x 2 themes),
                      # + 6 tests of the contrast oracle itself,
                      # + 54 legibility-sweep tests (16 routes x 2 palettes,
                      #   every visible text node and every painted SVG glyph,
                      #   + 22 tests that attack the sweep itself)
```

While it runs, say what is in it: the components, **the four real overlays** — dialog, select
panel, autocomplete panel, calendar — the keyboard focus ring, two breakpoints, and `/accounts`
itself. *The dialog is opened, not drawn: a hand-written copy of Material's DOM would keep matching
after MDC replaced the real one.*

Then point at the second suite, because it is the better story: **77 computed-style tests**, one
per `OV-nn` intent, asserting the value on the running app. Say why it exists — the control run on
somebody else's design system found three theming regressions a screenshot diff cannot see — and
then say what it did here: **it found three dead overrides in our own library on its first run**,
including one that was passing only because the library default happened to match the brand
colour. `docs/evidence/OVERRIDE-CONTRACT-dead-rules.md`. That is the sentence the Chief Architect
remembers: *the gate we built to check the migration found bugs in the thing we were migrating.*

If they ask what the gate still cannot see — and the Chief Architect will — answer before they
finish, and tell this one against yourself, because it is the best thing in the pack:

**the dark block shipped the exact defect it was built to catch.** The control run's worst finding
was invisible in the light theme, so eight probes now run against the dark palette. The first
version asserted the *light* zebra colour there. Material paints dark-theme row text white, so two
of five transaction rows rendered at **1.07:1** contrast — unreadable banking data — and OV-05d was
**green, because it was asserting the value that caused it.** A hostile reviewer looking at the
screen found it; no gate did.

Then the fix, which is the actual lesson: **32 WCAG ratios** — 16 targets across both themes — are
now asserted, and colour expectations are per-theme. A constant records what someone wrote down; a
ratio records what the customer can read, and only one of those survives a migration moving a
library foreground. `docs/evidence/oracle-logs/dark-contrast-regression.log` shows the assertion
firing at 1.07:1 when the fix is removed.

And then the part that makes the point better than any of it, because it happened *after* that fix:
the first version of the ratio gate covered the statement table only, so a hostile reviewer pointed
it at the rest of the library. **Six more findings, five of them invisible controls:** the dark page
never got a surface, so form-field labels and hints, the select trigger, inactive tab labels and the
datepicker toggle icon — a button you cannot see to click — all rendered at **1.0:1**. And two were
in the **light** theme, the shipping one: a disabled account field displayed its value at 2.66:1, and
Material's error red is 3.68:1 against AA's 4.5. The oracle itself had two parse holes on top of
that — `rgba(0,0,0,0)` read as opaque black (a transparent chain scored 21:1) and foreground alpha
dropped (`rgba(255,255,255,0.5)` on a dark card scored 10.05:1 instead of 3.87:1). All fixed; the
oracle now has **six tests of its own**, one per hole.

Be precise about how much the dark block buys: **8 of the 11 dark probes can fail dark-only**; three
are geometry duplicates that cannot — measured from the compiled bundle, not assumed. The two probes
that pass whether or not our rule exists are labelled `KNOWN WEAK` in the file, with the log of one
*not failing* committed at `docs/evidence/oracle-logs/delete-rule-ov08.log`.

And then the part to land if they only remember one thing about the gate, because it is the general
fix rather than another finding: **the targeted list was the wrong shape.** Three rounds running it
was green and a reviewer found unreadable text somewhere it did not point; each fix added a
fifteenth selector. So there is now a **legibility sweep** — every visible text node on 16 routes in
both palettes, 46 tests. On its first run it found an AA failure in the **shipping light theme** two
nodes away from an existing probe (the invalid field's label and its required asterisk, Material's
`#f44336` at **3.37:1**, illegible exactly when validation fires) and the round-7 defect that all 21
snapshots and all 38 component probes missed: the app root painted `#fff` over the themed page, so
the three customer-facing routes were white-on-white in the dark palette *while every control on them
measured correctly*. Fixed by making the page surface a token instead of a hex, so a route cannot
state a colour the other palette has never heard of. Fourteen of the 46 tests keep the sweep honest —
it must measure a substantial page, report planted illegible text, *not* report planted hidden text
or off-screen skip links, catch an **icon-only control** whose glyph is recoloured to its own surface,
composite a semi-transparent sibling veil, and refuse to score text over a gradient until someone
declares `data-contrast-reviewed="…"` **on the artwork element, citing a ratio**. Eleven of those
fourteen are findings from two hostile rounds spent attacking the gate rather than the app, and they
fooled it in **both** directions — a paginator arrow at 1.00:1 with the gate green, an `sr-only` label
that made an icon-only control look decorated, an opaque scrim hidden behind one `z-index: 10`,
illegible text that passed only because it was below the fold, a veil overstated 12x, and a
`visibility: hidden` veil that failed correct code at 1.09:1. That is the honest version of this
story, and the reason to trust the fourteen tests rather than the claim. `docs/evidence/oracle-logs/regress-root-surface.log` is the sweep catching the
root-surface defect with the fix removed.

Then change `.bofa-table .mat-header-cell` colour to brand red and re-run:

```
Visual regression on table-default: <n> pixels differ (0.0xx%).
Visual regression on accounts-dashboard: <n> pixels differ (0.0xx%).
```

…and, in the second suite, a sentence instead of a pixel count:

```
1) OV-05c: Header cells carry the slate-900 brand weight, not the Material grey
   + expected - actual
   -'rgb(200, 16, 46)'
   +'rgb(18, 22, 29)'
```

*One gate tells you something moved. The other tells you which promise you broke.*

Read the numbers off the screen — they are renderer- and baseline-dependent and have moved every
time the baselines were regenerated (785 → 875 → 753). On the current baselines: **two** failures,
~753 px on `table-default` and ~788 px on `accounts-dashboard`. Point at the second one: *it is
caught on the customer's dashboard, not only in the component gallery.*

If someone asks the sharper version — *"what stops an engineer deleting the baseline?"* — delete
one and re-run: the snapshot fails as `missing`. It used to be silently re-created, which is how a
regression gets laundered into a green run; that was found by hostile testing of this repo, not by
design. CI additionally requires `BASELINE-CHANGE:` in the PR body for any baseline change.

If asked "how do you know 40 px isn't tuned to pass?" — `docs/evidence/ORACLE-noise-floor.md`:
0 px across three repeat runs on the pinned renderer, 455–5,963 px across renderers (which is why
it is digest-pinned — and §2.1 records the same host later agreeing at 0 px after an apt install
added fonts, which is the argument, not a counter-example), 753 px of signal.

Say: *under a tenth of a percent — the percentage budget we started with allowed 0.1 %, so this
shipped a wrong red to millions of customers and the suite said green. The budget is now 40
absolute pixels.* Revert.

## 4:30–6:00 — "But `ng update` does this"

`docs/evidence/GATE-01-automated-migration-is-not-enough.md`. The migrations complete; the build
fails on the Material typography API. **The exit code of the codemod is not the deliverable.**

## 6:00–9:30 — What Devin actually produced

Open PR #2 and PR #3 — two independent runs of the same playbook, `TARGET_VERSION=15`.

- Both left CI **red** on the 12 snapshots MDC changed, and **neither regenerated a baseline**.
- Both refused OV-17 with the same reasoning, and left the rule inert and annotated.
- **Volunteer the failure:** that shared reasoning was wrong. Both said "no baseline exercises the
  compact variant"; it does — `form-field-default.png`. Human review caught it, not a test. Then
  say why it still matters: two runs producing the *same* false stop is the reviewable property,
  and the repair is one number in an override comment (`playbooks/REVISIONS.md`). Do not let the
  room find this before you say it.
- Run B raised the bundle budget by 50 kB and wrote down that it did; Run A stopped with a failing
  build instead.

## Interject if anyone says "so you only did 14→15"

They will, and the answer is short and unflattering, which is why it lands. **Two of four hops have
been run, and neither is merged.** The 15→16 hop is PR #5 — the flex-layout removal, which is the
hop nothing automates. The `fx*` directives were rewritten as CSS against flex-layout's real
breakpoints and the three `responsive-grid` baselines pass at **0 px in CI** on that rewrite; Node
moved 16→18; the computed-style contract caught two real MDC v16 regressions (a token-driven toggle
thumb and a disabled-label colour) that the pixel suite could not attribute.

**And then volunteer the bad part, because it is the most useful thing in the pack:** that run
explained its own red image suite as a missing-webfont problem. It is not. The same baseline blob
passes at 0 px in the same pinned container on this branch, and in the run's *own* CI several
text-bearing snapshots are 0 px while others are thousands. So those pixels are the migration's real
visual delta, and the run talked itself out of them with a plausible environmental story. Nothing
was re-baselined — the gate held — **but the narrative failed where the gate did not.** That is
precisely why the reviewer, not the agent, owns "is this diff acceptable?".
`docs/evidence/PHASE2-15-to-16.md`, top of file.

16→17 and 17→18 are **unevidenced model estimates** and are labelled that way in
`docs/meeting/delivery-plan.md`. Do not describe them as anything else.

## 9:30–11:00 — Variance, told honestly

`docs/evidence/VARIANCE-phase1-material15.md`. Chips: 6,635 px in one run, 707 px in the other.
Say: *the diffs vary; the refusals don't. That is what makes 20 of these reviewable.* Then say
Run C died on a usage limit — **2 of 3 completed** — before anyone asks.

## 11:00 — If the Chief Architect says "you only proved this on a repo you wrote"

Have `docs/evidence/CONTROL-external-design-system.md` open. Same playbook,
**ng-matero v14.3.0** — MIT, third-party, ~2,300 lines of custom SCSS, zero intent comments,
`@angular/flex-layout`, and a real upstream v15 to check the answers against. Report the result
the way it happened, because it is not flattering:

- It **stopped** on 3 genuinely ambiguous overrides and raised 1 stop that was really a scope
  call, not ambiguity. Honest count: **3 true, 1 false positive**. It deleted nothing, disabled
  nothing, and left CI red with a reason.
- It also **guessed wrong three times and no gate caught it** — a rewrite onto class names the
  Material schematic does not own, one selector left behind in a comma list, and a correct rename
  that then lost a specificity battle to MDC's own rule. Two were invisible to a screenshot diff;
  one was invisible in the light theme entirely.
- **Then say what we did about it.** That control run's recommendation was a computed-style gate.
  We built it, and it immediately failed on *our* library — three dead overrides
  (`docs/evidence/OVERRIDE-CONTRACT-dead-rules.md`), one of which was only "passing" because the
  Material default happened to equal the brand colour.

The claim to make is the narrow one the evidence supports: *it does not guess when it knows it
does not know — and it does not yet know when a confident rewrite has quietly stopped applying,
which is why the contract gate is part of the pilot scope, not a nice-to-have.*

## 11:00–12:00 — The ask

One repo, one named design-system owner, two weeks. Success = *n* consumer PRs merged with no
baseline regenerated without a written reason.

If the VP pushes on dates and cost, go to `docs/meeting/delivery-plan.md` — every number there is
labelled measured or modelled. If the Security Engineer pushes on controls, go to
`docs/meeting/security-qa.md`.

## What is stubbed — say it before you are asked

- **SSO/MFA.** `@bofa/auth-sdk-wrapper` returns a fixed principal holding `accounts:read`, so the
  guard never denies in the running demo and `/sign-in` is unreachable by clicking. The deny,
  redirect and `?r=` round trip are covered by `bofa-auth.guard.spec.ts`. Do **not** script "watch
  the guard bounce me" — it will not happen.
- **Analytics.** `@bofa/analytics-sdk-shim` wraps an untyped vendor SDK that is not present; the
  point is the boundary, not the vendor.
- **Financial data.** Account and transaction data is fixtures.

The stack, the wrapper layer, the overrides, the visual oracle, the migration runs and the CI
gates are all real. The integrations are stubbed at their boundary, which is exactly where the
migration risk they represent lives.

## If something breaks live

| Symptom | Do this |
|---|---|
| Port 4200 busy / Cypress hangs | `npx nx reset`, kill 4200, rerun |
| `nx e2e` suspiciously instant | it cached — always use `npm run visual`, which passes `--skip-nx-cache` |
| Docker unavailable | **do not** fall back to a host `nx e2e` — on a host whose fonts differ from the image's it fails 21 of 21 on renderer drift (455–5,963 px) and you would be narrating design-system safety over a wall of red; on a host that happens to match it passes and proves nothing. Show `docs/evidence/ORACLE-noise-floor.md` and the last green CI run instead, and say why the renderer is digest-pinned. That story is stronger than the live run anyway |
| Anything red you didn't plan | show it and read it aloud. A demo that can fail is the point |
