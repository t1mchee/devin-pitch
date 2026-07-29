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

### "Visual regression suites are flaky. You'll re-baseline until it's green."

Two things. First, the budget is absolute — 40 pixels — not a percentage: an earlier ratio budget
of 0.1 % silently accepted an 875-pixel brand-colour regression on the table header, which is
exactly the kind of change that ships a wrong red to millions of customers. Second, the suite runs
in a pinned `cypress/included:10.11.0` container with `--skip-nx-cache`, because font hinting
differs between a laptop and a CI runner by more than 40 pixels, and because an Nx cache hit is
not a test run. Re-baselining is a separate, reviewable commit.

### "What does this cost us in review time?"

Honestly: a review per consumer, plus answering the escalated questions once. The variance page is
there so you can judge that yourself — the diffs differ between runs, the *questions* don't.

### "Can it run inside our network, against our internal registry?"

The library is consumed as a private package in this repo's model, and the workspace is configured
against a private registry rather than the public one. Anything beyond that — your egress rules,
your artifact hosts, your identity provider — I don't know, and I'll come back with a written
answer rather than guess in the room.

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
