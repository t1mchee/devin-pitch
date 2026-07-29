# Strong second: test coverage on compliance-critical paths

**One line:** the best-fitting use case for an agent, and the easiest one to do badly — the failure
mode is thousands of assertions that raise the number and prove nothing to an OCC examiner.

## Why it fits

12+ services across Java, TypeScript and Python; ~30 % overall and lower on transaction
processing, authentication, PII handling and audit logging. Some services have no test
infrastructure at all. That is fan-out work with a mechanical oracle (the coverage report and CI),
which is exactly the shape an agent is good at, and it is bounded per service.

## Why we did not lead with it

An examiner does not accept a percentage. They ask what happens when a transaction is submitted
twice, when a decimal is rounded the wrong way, when an audit write fails after the business write
committed. Coverage is a proxy; the deliverable is evidence on named paths.

## How we would do it so the number means something

1. **Name the paths first**, with the compliance owner: not "the payments service" but
   "duplicate submission", "partial authorisation", "audit write failure after commit".
2. **Characterisation before coverage.** Write tests that pin current behaviour and get them
   reviewed. Where current behaviour is wrong, that is a finding, not a test to fix around.
3. **Standing up test infrastructure is its own PR** per service — framework, CI job, mocking
   pattern — reviewed on its merits before any test lands on top of it.
4. **A coverage gate that only counts the named paths**, so the number cannot be gamed by
   asserting on getters.
5. **No assertion whose only purpose is to raise the percentage.** That rule goes in the repo's
   `AGENTS.md`, the same way the design-system rules do here, so it is visible in every PR.

## The honest risk

This is the use case where an agent can most easily produce work that looks like progress. The
mitigation is that the definition of done is written by your compliance owner, not by us, and that
each service's test infrastructure is reviewed before it is used.
