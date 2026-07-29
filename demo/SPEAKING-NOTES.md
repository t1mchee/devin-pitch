# Speaking notes — Bank of America, Angular 14 → 18

Say-this / click-this script for the 45-minute meeting, with the 12-minute demo inside it. The
timed version of the demo alone is `RUNBOOK.md`; the objection answers are
`../docs/meeting/objections.md`. Read those once, present from this.

Two ways to show the app:

| | URL / command | When |
|---|---|---|
| Hosted | https://t1mchee.github.io/devin-pitch/ | screen-share, no laptop risk, works on their wifi |
| Local | `nvm use 16.20.2 && npx nx serve retail-banking` | when you want to break something live |

Hosted deep links: `/accounts`, `/__showcase`, `/__showcase?palette=dark`,
`/__showcase/datepicker`. The hosted build is the same commit as the PR; it cannot run the visual
gate, so keep a terminal ready for the part where a gate fails on purpose.

---

## 0:00–5:00 — Frame it before you demo it

Say, in this order:

1. "Angular 14 hits end of life, so this is a security-policy deadline, not a modernisation
   project. That changes who has to sign off, not just how fast you go."
2. "You have three initiatives. I picked the Angular upgrade to build against, for one reason: it
   is the only one where the risk is **fan-out**. A shared component library with a custom design
   system on top of Material, consumed by teams who did not ask for this upgrade. Cloud migration
   risk is runtime and reversible with a cutover plan; coverage risk is measurable with a number.
   Fan-out risk is the one that shows up as somebody else's broken build the week of a deadline."
3. "So the question I want to answer today is not 'can an agent run `ng update`'. It is: **when
   the codemod finishes, who tells you what the customer now sees?**"

Ask, and shut up for the answers — these three shape the rest:

- (VP) "How many teams consume the library, and what does 'we broke them' cost you today?"
- (Security) "What has to be true for an agent to hold a credential in your environment — or is
  the answer that it never does?"
- (Architect) "Where is your design system's intent written down — comments, docs, or people?"

---

## 5:00–17:00 — Demo

### The app (1 min) — `/accounts`

Click: change the account in the select, type in the amount, sort the table, page it, open the
transfer dialog, cancel.

Say: "This is a customer surface. Every control on it comes out of one shared library. Twenty
teams render these same components."

### The library and its rules (1.5 min)

Show `libs/ui-core` (13 wrapped components), then `theming/_overrides.scss`, then `AGENTS.md`.

Land: **"An override with no recorded reason is the migration risk. Not the version number."**

Point at one `OV-nn` comment. Say: "Material moves an internal class name between majors. The
selector dies, the intent survives — and nothing in a normal test suite knows the difference."

### The gate (4 min) — the part that earns the room

Run `npm run visual` and talk while it runs (156 tests: 23 image over 21 snapshots, 77
computed-style probes — one per override intent — and 56 legibility tests over 16 routes in both
palettes).

Then tell three stories, in this order, because each one costs you something:

1. **The gate found bugs in the thing being migrated.** The computed-style contract's first run
   found three dead overrides in our own library, one green only because the Material default
   happened to equal the brand colour. `docs/evidence/OVERRIDE-CONTRACT-dead-rules.md`.
2. **The gate shipped the defect it was built to catch.** The first dark-theme probe asserted the
   *light* zebra value; two of five transaction rows rendered at 1.07:1 — unreadable balances,
   suite green. A hostile reviewer found it, no gate did. Fix: assert **ratios**, per theme.
   "A constant records what someone wrote down. A ratio records what the customer can read."
3. **A targeted list was the wrong shape.** Three rounds it was green while a reviewer found
   unreadable text somewhere it did not point. So now every visible text node on 16 routes is
   swept in both palettes. Its first run found an AA failure in the *shipping light theme* and a
   root element painting `#fff` over the dark page — white-on-white on three customer routes while
   every individual control measured correctly.

Now break something on purpose. Change `.bofa-table .mat-header-cell` to brand red, re-run:

- image suite: "~753 px differ on `table-default`, ~788 px on `accounts-dashboard`"
- contract suite: `OV-05c: Header cells carry the slate-900 brand weight, not the Material grey`

Land: **"One gate tells you something moved. The other tells you which promise you broke."**

If asked "is 40 px tuned to pass?" → `docs/evidence/ORACLE-noise-floor.md`: 0 px across three
repeat runs on the digest-pinned renderer, 753 px of signal. And volunteer the original sin: the
budget used to be 0.1 % of pixels, which waved a wrong brand red through to millions of customers.

If asked "what stops an engineer deleting a baseline?" → delete one, re-run, it fails as `missing`;
CI also requires `BASELINE-CHANGE:` in the PR body.

### The migration itself (4 min)

`docs/evidence/GATE-01-automated-migration-is-not-enough.md`: the schematics complete, the build
fails on the Material typography API. **"The exit code of the codemod is not the deliverable."**

Open PR #2 and PR #3 — two independent runs of the same playbook at `TARGET_VERSION=15`:

- both left CI red on the 12 snapshots MDC changed; **neither regenerated a baseline**
- both refused the same override with the same reasoning, left it inert and annotated
- **volunteer:** that shared reasoning was *wrong* — a baseline does exercise the compact variant.
  Human review caught it. "Two runs producing the same false stop is the reviewable property; the
  repair is one number in an override comment."

If anyone says "so you only did 14→15": "Two of four hops are run and neither is merged." PR #5 is
15→16 — the flex-layout removal, the hop nothing automates. Then volunteer the worst part: that run
explained its own red image suite as a missing-webfont problem, and it was not; the gate held but
the narrative failed. "That is exactly why the reviewer owns 'is this diff acceptable', not the
agent." 16→17 and 17→18 are labelled unevidenced estimates — call them that.

### Not our repo (1.5 min)

`docs/evidence/CONTROL-external-design-system.md` — same playbook against ng-matero v14.3.0, MIT,
2,300 lines of someone else's SCSS, zero intent comments. Report it unflatteringly: 3 true stops, 1
false positive, deleted nothing — **and guessed wrong three times with no gate catching it.** Then:
"that run's recommendation is what became the computed-style gate, and the gate then failed on our
own library."

Claim only what the evidence supports: *"It does not guess when it knows it does not know. It does
not yet know when a confident rewrite has quietly stopped applying — which is why the contract gate
is in pilot scope, not a nice-to-have."*

---

## 17:00–35:00 — Working session, not slides

Take these in the order the room raises them; each has a page open behind it.

- **VP — throughput and dates.** `docs/meeting/delivery-plan.md`. Every number labelled measured
  or modelled. Do not defend a modelled number as measured; say "that one is a model, and here is
  the measurement that would replace it in week one."
- **Security — controls.** `docs/meeting/security-qa.md`: `--ignore-scripts` as policy, egress,
  secret handling, provenance/SCA baseline, CI guards that cannot be edited in the same PR they
  gate. The strongest line: "the agent's output is a PR. It inherits every control you already
  have on PRs, plus the ones we added because an agent can produce more of them."
- **Architect — where it stops being useful.** Be first to the limits: partial-overlay colour
  compositing is approximated, unnamed marks outside controls are not measured, nested stacking
  contexts are incomplete, the sweep is renderer- and viewport-specific. All written down in
  `docs/evidence/OVERRIDE-CONTRACT-dead-rules.md`.

Then get concrete on their repo, on the call: which app first, who owns the design system, which
consumer teams get the first PRs, what CI already blocks.

---

## 35:00–45:00 — The ask

"One repo, one named design-system owner, two weeks. Success is *n* consumer PRs merged with **no
baseline regenerated without a written reason**."

Then the follow-ups, out loud, with owners: a read-only pass over the notification service
(`docs/meeting/usecase-cloud-migration.md`) and one over the 12-service monorepo before the OCC
exam (`docs/meeting/usecase-test-coverage.md`).

---

## Say these before you are asked

- SSO/MFA is stubbed: `@bofa/auth-sdk-wrapper` returns a fixed principal, so the guard never denies
  in the running app. Deny/redirect is unit-tested. **Do not script "watch the guard bounce me."**
- Analytics SDK is not present; the shim is the boundary, and the `any` inside it is deliberate.
- Account and transaction data is fixtures.
- The stack, wrapper layer, overrides, oracle, migration runs and CI gates are real.

## If it breaks live

| Symptom | Do |
|---|---|
| Local app won't serve | switch to https://t1mchee.github.io/devin-pitch/ and keep talking |
| `nx e2e` instant | it cached — always `npm run visual` (`--skip-nx-cache`) |
| Docker down | do **not** run the host suite; show `ORACLE-noise-floor.md` and the last green CI run, and say why the renderer is digest-pinned |
| Something red you didn't plan | read it aloud and diagnose it in front of them. A demo that can fail is the point |
