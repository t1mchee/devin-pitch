# Who is in the room and what actually moves them

## VP of Engineering, Digital Banking

**Owns:** the delivery date. Angular 14 is out of support; running it in production breaches
internal policy. Every sprint spent on the upgrade is a sprint not spent on the roadmap.

**Cares about:** throughput of *merged* PRs, not sessions started. Whether his team's review
capacity becomes the new bottleneck. Whether he can put a date in front of his own leadership.

**What we say:** the unit of work is one consumer, one PR, one reviewer. Show the variance page —
two runs of the same task differ in their diffs but agree on what they refuse to decide, so the
review load is a small repeated set of questions rather than 20 novel ones. Ask him for his real
consumer count; our arithmetic is worthless against his.

**What loses him:** a demo where everything is green. He knows what a Material major does to a
custom theme. Green means we hid something.

## Security Engineer, Consumer Applications

**Owns:** the veto. Cares far more about the blast radius than about the feature.

**Cares about:** where the agent executes, what network it can reach, what credentials it holds,
whether it can merge, whether a change can bypass review, what is logged, and whether a dependency
can be introduced or a version constraint widened without a human.

**What we say, precisely and without embellishment:** the agent works in an isolated VM, on a
branch, and opens a PR — the same review, CODEOWNERS and branch-protection path as any engineer.
It does not merge. In this repository the rules are written down in `AGENTS.md` and are visible in
the runs: no baseline regenerated, no lint rule disabled, no dependency constraint widened without
the reason written into the PR. Where a run wanted more budget (the 1.00 → 1.05 MB bundle change)
it said so in the PR rather than doing it quietly.

**What we do not say:** anything about certifications, egress rules or data residency that we have
not confirmed. If asked something we do not know, the answer is "I don't know, I'll come back with
it in writing".

**What loses him:** hand-waving on credentials, or a claim that the agent "can't" do something when
the honest answer is "it is scoped so that it doesn't".

## Chief Architect

**Owns:** the shared component library and the fan-out. Has almost certainly been burned by a
codemod that "succeeded".

**Cares about:** intent preservation. Whether the design-system overrides survive with their
*reasons* intact, what happens at the boundary the tool can't reason about, and whether downstream
teams get a breaking change they did not ask for.

**What we say:** show `GATE-01` first — the official migration completes and the build still fails.
Then show the two runs both refusing OV-17 with the same reasoning: MDC quantises density and the
override's intent comment never recorded the target height, so the level cannot be recovered from
the repository and neither run guessed. Then show the `ui-core` public-API characterisation test:
the contract with the downstream teams is a test, not a promise.

**What loses him:** any suggestion that the tool decides design-system intent. It must escalate,
and we must be able to point at where it did.
