# Security Q&A — Consumer Applications

For the Security Engineer in the room. Three columns of honesty throughout: **what this repository
demonstrates**, **what Cognition documents** (linked, so it can be verified rather than believed),
and **what BofA has to decide**. Nothing here asserts a control on your behalf, and nothing claims
a certification beyond the linked source.

---

### Q1. Where does the agent execute, and what can it reach?

Each session runs in an isolated cloud VM ("devbox"). Two deployment models are documented:
Enterprise Cloud, and Customer Dedicated — single-tenant VPC connected over AWS PrivateLink or an
IPSec tunnel, which is the model for privately networked resources that cannot support IP
allowlisting. MFA VPNs are documented as incompatible with Enterprise Cloud.
<https://docs.devin.ai/enterprise/deployment/overview>

**Your decision:** which model, and therefore what the devbox can route to — GHE, Artifactory,
internal npm. For an Angular upgrade the reachability requirement is small and worth stating up
front: source control, your npm registry, and nothing else. The migration needs no production data
and no production credentials.

### Q2. What can it do to our repositories?

Repository access is granted through the GitHub App installation and can be scoped to **specific
repositories** rather than the whole org, changed at any time in GitHub's own settings.
<https://docs.devin.ai/integrations/gh>

**Evidenced here:** the agent's authority in this demo ends at "open a PR". Every merge is a human
merge. `.github/CODEOWNERS` puts a named owner on the design system, the visual baselines, the
oracle itself and the auth/analytics boundaries, so an agent PR that touches any of them cannot
merge without that person.

**Your decision:** branch protection and required reviewers are yours and unchanged. Recommended
for a pilot: one repository, no merge rights beyond PR creation, CODEOWNERS on the shared library.

### Q3. What stops it from disabling the controls that would catch a mistake?

This is the honest core of the demo, because "the agent got to green" is worthless if it got there
by moving the goalposts. Three layers, all in this repository:

1. `AGENTS.md` forbids re-baselining to pass, disabling lint/type/test gates, and widening an
   unverified dependency range. That is instruction, and instructions are not controls.
2. The **Guard the oracle** CI job fails any PR that touches `visual-baselines/**`,
   `visual-regression.plugin.ts` or a bundle budget without a `BASELINE-CHANGE: <reason>` line in
   the description. This PR trips it deliberately — the baselines genuinely changed, and the reason
   is in the description where a reviewer reads it.
3. `.github/CODEOWNERS` requires the design-system owner on those same paths.

**Measured, not asserted:** in three uncached runs on the pinned renderer the oracle reports 0 px
drift; the injected brand-colour regression reports 753 px on the component and 788 px on the
customer dashboard. `docs/evidence/ORACLE-noise-floor.md`.

### Q4. You bypassed a provenance check in your own evidence log.

Yes — `NX_SKIP_PROVENANCE_CHECK=true` in `docs/evidence/GATE-01-...md`, and you are right to pull
on it. It disables Nx's signature verification on the migration packages it downloads. It is set
in that transcript because the sandbox has no route to the provenance endpoint, and the log now
says so explicitly, along with the rule: **on your runners it must not be set, and a provenance
failure is an incident to investigate, not a flag to add.** A migration is exactly the moment an
attacker would want a codemod package substituted.

### Q5. Dependency risk during the upgrade itself.

`npm audit` on this Angular 14 tree is bad, and it is supposed to be — that is the compliance
argument for the upgrade, not a counterargument to it. CI now prints the audit on every run
(report-only, deliberately: a permanently-red blocking gate on an EOL tree is a gate everyone
learns to ignore). What matters is the number moving in the right direction hop by hop, and it is
printed on every PR so the trend is visible rather than claimed.

The renderer that produces the visual evidence is pinned by **digest**
(`cypress/included@sha256:058d1834…dc517a`), not by the mutable `10.11.0` tag, in CI and in
`npm run visual`.

**Your decision:** whether the pilot's audit gate is blocking, and at what severity, once the tree
is on a supported major.

### Q6. Credentials and secrets.

Secrets are held in Devin's secrets manager and injected at run time, with enterprise/org/repo/
personal scopes and documented hygiene rules — never in blueprint YAML, because YAML ends up in
logs and artifacts. <https://docs.devin.ai/product-guides/secrets> ·
<https://docs.devin.ai/enterprise/environment-management/best-practices>

**Evidenced here:** this repository needs none. No `.npmrc`, no tokens, no production endpoints —
the auth and analytics integrations are stubbed at their boundary. An Angular upgrade is a
low-credential workload, which is part of why it is a good first engagement for a regulated bank.

### Q7. Auditability — can we reconstruct what it did and why?

Enterprise audit logs are exposed via API (`/v3/enterprise/audit-logs`, enterprise admin key),
alongside enterprise session listing. <https://docs.devin.ai/api-reference/v3/audit-logs/enterprise-audit-logs>

**Evidenced here:** every artefact of a run is in Git — the PR, the per-file theming rationale, the
diff images, the CI logs, and the session transcript linked from the PR body. The three phase-1
runs in `docs/evidence/VARIANCE-phase1-material15.md` are each traceable to a session URL, including
the one that died on a usage limit and produced nothing.

### Q8. Prompt injection — the repository is untrusted input.

Real risk, and worth naming rather than deflecting: an agent that reads source, issues and comments
can be told things by that content. What limits blast radius here is structural, not clever — the
agent's output is a pull request, on a branch, in one repository, reviewed by a human who owns the
paths that matter. The controls in Q2 and Q3 are the answer to injection as much as to error,
because they do not depend on the agent's judgement being sound.

**Your decision:** whether pilot repositories carry third-party-authored issue/comment content, and
whether CODEOWNERS coverage should be broader than the design system for the first weeks.

### Q9. Data handling and certification.

Cognition documents SOC 2 Type II certification and publishes controls through its Trust Center;
data is encrypted in transit and at rest. <https://docs.devin.ai/enterprise/security-access/security/enterprise-security>
· <https://trust.cognition.ai>

I am not going to characterise model training, retention windows or residency from memory in the
room. Those are Trust Center and contractual questions, and you should have them in writing.

### Q10. What would I put in the pilot's security exit criteria?

1. Scoped GitHub App installation: one repository.
2. No merge authority; CODEOWNERS on the shared library, the oracle and the boundaries.
3. Provenance verification **on**; any failure investigated, not bypassed.
4. Audit-log export verified once, end to end, by your team rather than demonstrated by me.
5. Dependency audit printed on every PR, with the trend reviewed at the end of the two weeks.
6. A written answer from Cognition on Q9 before the pilot starts, not after.
