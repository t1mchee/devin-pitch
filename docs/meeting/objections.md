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

What that changed, concretely: **32 WCAG ratios** — 16 targets in both themes — are asserted
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
six tests of its own. §6 and §7 of the dead-rules evidence.

And then the round after *that*, because the pattern is the finding: the ratio gate was still a list
of fourteen selectors, and a reviewer again found unreadable text somewhere the list did not point —
this time the whole page. `bofa-root` painted `background: #fff` over the themed `<body>`, so all
three customer-facing routes were white-on-white in the dark palette **while every control on them
measured correctly**; the components looking right is what hid it. Two fixes, and the second is the
one worth defending: the page surface, muted text, links and borders are now **tokens** declared once
per palette, so an application route cannot state a colour the other palette has never heard of; and
the gate is now a **sweep** — every visible text node and every painted glyph on 16 routes in both
palettes, 46 tests — rather
than a list of the places someone already thought about. On its first run the sweep found an AA
failure in the **shipping light theme** two nodes from an existing probe: the invalid field's label
and the required asterisk inside it, Material's `#f44336` at **3.37:1**, illegible at the moment
validation fires. Its own blind spots were closed in the same round (ancestor `opacity` ignored — a
1.5x misreport; text over a gradient scored as if over the canvas; `visibility:hidden` text reported
as a defect; a CDK backdrop measured as though it were not there; and only the *first* match of each
selector measured at all). `oracle-logs/regress-root-surface.log` and `delete-rule-ov01f.log`.

And then the sweep itself was attacked, and it failed in **both** directions, which is the version of
this story to tell: an icon-only control — the paginator's arrows — was recoloured to the surface it
sits on and rendered at 1.00:1 with the sweep green, because the sweep kept only nodes with a text
child and read `color`, never an SVG `fill`; and a semi-transparent veil painted over the dark table
was reported at 13.20:1 where a human reads 1.1:1, because only the CDK backdrop was treated as a
covering sibling. Both were the same mistake — a special case where a general rule belonged.

Then the *generalisations* were attacked, and four more fell, all to a single CSS declaration each:
paint order was document order, so `z-index: 10` on a scrim written before the text hid a whole region
at a reported 13.20:1; text below the fold was skipped, so the same illegible node passed at
`top: 2212` and failed at `top: 400`; the icon exemption read `textContent`, so labelling an icon
button the *accessible* way with an `sr-only` span hid its glyph from the gate; and the select caret
turned out to be a border triangle with no SVG in it at all, so "the caret is covered" had been false
by construction. Each is now a self-test, with the transcript of the fix removed committed as
`oracle-logs/regress-oracle-{glyph,scrim,zorder,fold,sronly,review}-*.log`, plus
`fault-injection-glyph.log` for the product-side version.

Then the *fixes* were attacked, and four more fell — the same family a fourth time, which is itself
the finding worth saying out loud: **each generalisation was still implemented as one case of the
thing it was supposed to generalise.** The new paint-order model read the largest `z-index` on the
ancestor chain, which is not how painting works — a `transform` creates a stacking context its
children cannot escape — so it both missed a wrapper that genuinely covers text and would have
composited one the browser paints underneath. Inertness behind a modal was keyed on the *presence* of
a `.cdk-overlay-backdrop` element, so one stray `0×0; opacity: 0` leftover switched the sweep off for
every `aria-hidden` subtree on the page. The caret rule recognised a 0×0 box with one painted side, so
a rotated two-border chevron and an L-shaped corner mark walked past it, while a tooltip arrow — which
is a *tail* of its surface — was measured against the surface it matches and filed as a false defect.
And the `sr-only` skip matched `inset(45–50%)` as a string, so today's `inset(100%)` recipe
false-failed. All four are self-tests
(`oracle-logs/regress-oracle-{stacking,backdrop-armed,indicator-narrow,clip-literal}.log`), and one of
them caught a bad *test*: the first version planted a 1×1 element, which the sweep skips for its size,
so it passed with the bug still in place. The deliberate regression returning 154/154 is what found
that — a self-test that cannot fail is worth less than no self-test.

Then a fifth round found the same family again, and it is the honest thing to lead with rather than
bury: **four of the five defects were in the fixes from round four.** Coverage was a yes/no — the
layer had to *contain* the text's box — so a veil inside a `position: sticky` wrapper, offset by the
sticky `top` and eight pixels short, scored white-on-white text at 13.20:1. "Clipped away" was decided
by the first percentage in `inset()`, which hid a painted 10% band and showed a box clipped to nothing,
and the legacy `clip` property was honoured on static elements, where CSS ignores it entirely.
Inertness was re-armed by any visible pane with a character of text in it — a 2×2 pane containing a
full stop silenced the whole gate, exactly as the stray backdrop had one round earlier. And the caret
rule, now shape-agnostic, still excluded a four-sided frame, anything over 24 px, and anything drawn
in `::before`, which is where Material draws several of them. All five are self-tests with a
deliberate regression behind them
(`oracle-logs/regress-oracle-{cover-contains,clip-firstvalue,modal-textonly,indicator-r10}.log`).

What that trend line says, and it is the point to make in the room: the *product* defects stopped
coming several rounds ago; what keeps failing is the oracle's model of a browser, always in the same
direction — an approximation narrower than the thing it approximates. That is why the residual
approximations are enumerated in `OVERRIDE-CONTRACT-dead-rules.md` — sliver coverage, `inset()` in
absolute units, `opacity < 1` as a stacking context, negative `z-index` — rather than described as
complete.

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

The best evidence for that pin arrived by accident and is worth telling: the host run in the
evidence pack disagreed with the baselines by 455–5,963 pixels in the morning and by **0** in the
evening, same commit, same baselines — because recovering a broken desktop session on that machine
installed font packages. The renderer moved without a commit. Both transcripts are in
`oracle-logs/`, and the pinned digest is why no baseline moved with it.

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
