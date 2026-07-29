# Objection bank

Answers are only allowed to reference something in this repository or an explicit "I don't know".

### "`ng update` does this for free."

`docs/evidence/GATE-01-automated-migration-is-not-enough.md` is the transcript. The Nx and Angular
migrations run to completion, and then the build fails on the Material typography API. The
interesting work starts after the codemod exits 0. That is also why the demo's success criterion
is the visual suite, not the migration command's exit code.

### "Your demo repo is a toy."

It is a stand-in, and the numbers in it are small. What is not a toy is the structure: 13 wrapped
Material components, 18 overrides that each carry a reason, three consuming applications, a
deprecated `@angular/flex-layout`, an auth SDK pinned to Angular 14, an untyped vendor analytics
SDK, and a pixel oracle with committed baselines. If your real library breaks the tool, it will
break it on those same seams — which is why the pilot is on your repo, not this one.

### "How do I know it isn't just deleting the CSS it can't migrate?"

Two independent runs, both left OV-17 in place, inert and annotated, and both said in the PR that
they could not recover the intended density level. `AGENTS.md` forbids deleting an override to get
green, and the runs are the evidence that the instruction holds. Also: no baseline was regenerated
in either run, so the failing snapshots are still failing in CI, visibly.

### "Your own gate can be wrong, and then you'd never know."

Correct, and it happened here — volunteer it. The computed-style contract gained a dark-theme pass
because the external control run's worst regression was invisible in the light theme. The first
version of that pass asserted the **light** zebra-stripe colour on the dark surface, where Material
paints row text white: two of five transaction rows rendered at **1.07:1** against WCAG AA's 4.5:1,
unreadable, and the probe was green *because it asserted the value that caused it*. A hostile
reviewer found it by looking at the screen. No gate did.

What that changes, concretely: **32 WCAG ratios** — 16 targets in both themes — are now asserted
alongside the colour constants, and colour expectations are per-theme (`expectDark`). A constant
records what someone wrote down; a ratio records what the customer can read, and a migration that
moves a library foreground keeps the constant right and makes the render wrong.
`docs/evidence/OVERRIDE-CONTRACT-dead-rules.md`, `oracle-logs/dark-contrast-regression.log`.

Then the better half of the story, because it happened to the *fix*: that gate covered the statement
table only, and the next hostile round pointed it at the other twelve components. Six more defects,
all green in the suite at the time — five dark controls at **1.0:1** (the dark class recoloured
foregrounds and never gave the page a surface, so labels, hints, the select trigger, inactive tab
labels and a datepicker toggle you could not see to click went white-on-white), and **two in the
light theme, the shipping one**: a disabled account field showing its value at 2.66:1 and Material's
error red at 3.68:1. The oracle itself had two parse holes — transparent read as opaque black, and
foreground alpha dropped — either of which could score an invisible render as a pass. It now has
four tests of its own. §6 of the dead-rules evidence.

The general answer, which is the one that should land: **every gate in this repository has a
published failure.** The pixel budget has a documented blind spot under 40 px, two probes are
labelled `KNOWN WEAK` with the log of one not-failing committed, three of the eleven dark probes are
disclosed as geometry duplicates, this one encoded a defect, and the oracle that caught it had to be
tested against itself. That is the standard to hold us to
during the pilot — not "the gate is green", but "someone has tried to defeat the gate and written
down what worked".

### "Visual regression suites are flaky. You'll re-baseline until it's green."

Two things. First, the budget is absolute — 40 pixels — not a percentage: an earlier ratio budget
of 0.1 % silently accepted a sub-800-pixel brand-colour regression on the table header, which is
exactly the kind of change that ships a wrong red to millions of customers. Second, the suite runs
in a container pinned by digest (`cypress/included@sha256:058d1834…`, never the mutable tag) with `--skip-nx-cache`, because font hinting
differs between a laptop and a CI runner by more than 40 pixels, and because an Nx cache hit is
not a test run. Re-baselining is a separate, reviewable commit.

### "What does this cost us in review time?"

Honestly: a review per consumer, plus answering the escalated questions once. The variance page is
there so you can judge that yourself — the diffs differ between runs, the *questions* don't.

### "Can it run inside our network, against our internal registry?"

Straight answer on this repo first: it does **not** configure a private registry. There is no
`.npmrc`, and `package-lock.json` resolves against public npm. `@bofa/ui-core` is a workspace
library consumed through a TypeScript path mapping — which models the fan-out and the build
coupling, not your artifact hosting. Pointing it at an internal registry is an `.npmrc` and a
publish target; I have not done it here and I am not going to claim I have.

What I can say about the agent side is scoped in `docs/meeting/security-qa.md`: what this
repository evidences, and what your team has to decide before a pilot. Anything about your egress
rules, artifact hosts or identity provider I will come back with in writing rather than guess in
the room.

### "Who is accountable when it breaks production?"

The same person who is accountable today: the engineer who approved the PR. Nothing merges without
one, and the branch-protection path is unchanged.

### "Why not start with the cloud migration? That's our expensive problem."

Because the first engagement has to be one where correctness is *mechanically* checkable. The
notification service's hard questions are IBM MQ semantics, ordering guarantees, the Oracle
coupling, LDAP, data residency and a four-nines SLA — none of which a test suite settles, and all
of which need your architects in the room for weeks before code moves. See
`docs/meeting/usecase-cloud-migration.md`. The Angular programme has a compliance deadline, a
mechanical oracle, and fan-out across teams. It is the one where two weeks produces evidence
instead of opinions.
