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
oracle itself and the auth/analytics boundaries.

**And now the part I have to say before you say it: CODEOWNERS on its own is inert.** A CODEOWNERS
file is a routing table, not a control. Without *Require a pull request before merging* +
*Require review from Code Owners* + *Dismiss stale approvals* on the protected branch, it requests
reviewers and nothing more. This repository is a demo repo with no branch protection configured, so
what is demonstrated here is the **routing**, not the enforcement, and the difference matters to
your examiner more than it matters to me.

The separation of duties is also not demonstrated here, for a structural reason worth naming: the
agent authored the PRs *and* is the only actor in this repo, so the reviewer and the author are the
same identity. In your environment the enforceable version is: the Devin GitHub App is the PR
author and is **not** in any CODEOWNERS entry, and GitHub refuses self-approval, so the design
system owner's approval is mechanically required. That is the configuration to verify on day one of
the pilot — by exporting the branch-protection settings, not by reading this page.

**Your decision, and the exact settings to require:**

| Setting | Value | Why |
|---|---|---|
| Require PR before merging | on | otherwise every control below is optional |
| Require review from Code Owners | on | this is what makes `CODEOWNERS` enforceable |
| Required status checks | `verify` (the visual + probe + build job) | a red oracle must block, not warn |
| Dismiss stale approvals on push | on | stops approve-then-amend |
| Allow force push / branch deletion | off | protects the baseline history |
| App installation scope | one repository | Q1 |
| Merge authority for the app | none | the app opens PRs; humans merge |

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
customer dashboard. `docs/evidence/ORACLE-noise-floor.md`, and the **raw run transcripts are
committed** under `docs/evidence/oracle-logs/` — including `delete-rule-ov08.log`, which is a probe
failing to fail. Publishing the gate's own blind spot is the only reason to believe the rest.

**Where layer 2 is weaker than it looks, stated plainly.** `BASELINE-CHANGE:` is a *declaration*,
not a control: it proves the author said something, not that what they said is true. It raises the
cost of a silent re-baseline from zero to "write a sentence a reviewer will read next to the diff",
and that is all it does. Two hardening fixes are in this PR because a reviewer of this pack found
them: the guard now runs on `edited` (a description can be emptied after the check passed) and with
`if: always()` (previously a failing visual job could skip the guard entirely). The load-bearing
control remains the human code owner on `visual-baselines/**`.

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

**A trend needs two readings, so the first one is committed.** `docs/evidence/sca-baseline.json`,
captured at Angular 14.2 on 2026-07-29:

| | critical | high | moderate | low | total | packages |
|---|---|---|---|---|---|---|
| Angular 14.2 (today) | 4 | 89 | 15 | 3 | **111** | 1,620 |

CI now diffs every run against that file and warns on any severity that got *worse*. That is the
difference between "the audit is printed" (a log nobody reads) and "the audit regressed in this PR"
(a line in the check output). The pilot's success measure on this row is simple and falsifiable:
after 14→18, that 111 should be a small number, and if it is not, the upgrade did not buy what the
compliance case said it would.

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
diff images, the CI logs, and the raw oracle transcripts under `docs/evidence/oracle-logs/`.

**Where "it is all in Git" was false, and what changed.** The evidentiary spine of the variance page
used to be three `app.devin.ai/sessions/…` links — which BofA cannot retain, export, or produce
under subpoena, and which point at *mutable* pages. Two fixes are in this PR: the mutable PR bodies
those figures were read from are now committed verbatim under `docs/evidence/pr-snapshots/`, and
every figure is pinned to the commit SHA it describes. A session link is now corroboration, not the
record.

**What is still a link and not a demonstration:** the audit-log API itself. I have not exercised
`/v3/enterprise/audit-logs` here — it needs an enterprise admin key this demo account does not have
— so I cannot show you the schema, and I am not going to describe fields I have not seen. What the
logs record (prompts? tool calls? files read? egress?) is a question to answer against a live
endpoint in week 0. It is exit criterion #4 for exactly that reason, and it is your team that should
run it, not me.

### Q8. Prompt injection — the repository is untrusted input.

Real risk, and worth naming rather than deflecting: an agent that reads source, issues and comments
can be told things by that content. What limits blast radius here is structural, not clever — the
agent's output is a pull request, on a branch, in one repository, reviewed by a human who owns the
paths that matter. The controls in Q2 and Q3 are the answer to injection as much as to error,
because they do not depend on the agent's judgement being sound.

**Your decision:** whether pilot repositories carry third-party-authored issue/comment content, and
whether CODEOWNERS coverage should be broader than the design system for the first weeks.

**The blast radius is bigger than "it opens a bad PR", and pretending otherwise would be the wrong
answer to give a security engineer.** Before any human sees the diff, the session has already run
`npm install` on this tree — and npm lifecycle scripts (`preinstall`/`postinstall`) execute
arbitrary code inside the devbox with the session's network reach and whatever secrets are scoped to
it. Injected content that persuades an agent to add a dependency therefore gets code execution at
install time, not at merge time. Review is downstream of that.

What actually bounds it, in order of strength:

1. **Nothing reachable is worth stealing.** Q1's reachability list for this workload is source
   control + registry. No production data, no prod credentials.
2. **`--ignore-scripts` on the install** \u2014 not advice, it is in this repository's CI
   (`.github/workflows/ci.yml`, the `Install` step), verified to still build, unit-test and pass the
   visual suite. An added dependency now gets code execution only if someone also lands an explicit
   allowlist entry, which is itself a reviewable change. This is a change to *your* pipeline rather
   than to Devin, and it is the single highest-value hardening on this page.
3. **One repo-scoped, short-lived token per session** — not an org-wide PAT. Compromise of a session
   should cost you one branch in one repository.
4. **Egress:** the honest position is that a devbox with internet access can exfiltrate what it can
   read. If that is unacceptable for a given repo, the answer is the Customer Dedicated model in Q1
   with egress controlled at your network boundary, and the reachability list enforced there rather
   than promised here.
5. The PR-only authority and code-owner review of Q2 — which catch the *output*, and only the output.

### Q9. Data handling, model providers, retention and training.

Quoted from the documentation rather than paraphrased, because paraphrase is where security
answers go wrong. Verify each against the link before you rely on it.

| Question | What the documentation says | Source |
|---|---|---|
| Training on our code | "By default, we may use your data for model training purposes… If you're on a paid plan, you can opt out at any time on the Data Controls settings page. After you opt out, your data will not be used for training **and Zero Data Retention will be enabled with our model providers**." On Teams, only an admin can opt out. | [admin/security](https://docs.devin.ai/admin/security#how-is-your-data-used-to-improve-devin) |
| Enterprise agreements | "If you are an Enterprise customer, we will **never train on your data without your express prior written consent**." | same |
| Retention | "Cognition only retains data processed through Devin for the duration of the relationship with a given Customer, unless otherwise specified by the Customers." Feedback and User Interaction Data are "retained as long as needed and as determined by Cognition". | same |
| Model providers (subprocessors) | Devin runs on frontier models from **Anthropic, OpenAI, Google and Cognition**, plus open-source models. Which model serves a given session is a product configuration, so **your code leaves Cognition's boundary and reaches a model provider** — that is the fact to contract around, and ZDR-on-opt-out above is the documented mitigation. | [cli/models](https://docs.devin.ai/cli/models#available-models) |
| Certification | SOC 2 Type II; controls published via the Trust Center; encryption in transit and at rest. | [enterprise-security](https://docs.devin.ai/enterprise/security-access/security/enterprise-security) · [trust.cognition.ai](https://trust.cognition.ai) |

**What I will not do is turn any of that into a commitment on this page.** "As determined by
Cognition" is not a retention window, the published subprocessor list is not the same artefact as a
contractual one, and residency is not addressed by any link above. For BofA the three things that
have to be in the agreement, not in a doc site, are: **(1)** an explicit retention window with
deletion on termination, **(2)** the current subprocessor list with change notification, and
**(3)** written confirmation of no-training + ZDR at the model provider. Ask for the DPA and the
subprocessor addendum in week 0. If those three are not signable, the pilot should not start — and
that is my recommendation, not a sales position.

**One scoping fact that shrinks this whole conversation:** an Angular upgrade sends *front-end
source* to a model. No customer records, no PII, no production credentials, no transaction data.
That is a materially smaller data-classification question than the notification-service migration
or the test-coverage work on PII paths would be — which is part of why it is the right first
engagement.

### Q10. What would I put in the pilot's security exit criteria?

1. Scoped GitHub App installation: one repository.
2. **Branch protection exported and checked against the table in Q2** — required PR, required
   code-owner review, `verify` as a required status check, stale approvals dismissed, force-push
   off. CODEOWNERS without these is routing, not enforcement.
3. The app is the PR author and is in **no** CODEOWNERS entry, so self-approval is mechanically
   impossible. Verified by attempting it once and being refused.
4. Provenance verification **on**; any failure investigated, not bypassed.
5. `--ignore-scripts` on installs, with a reviewed allowlist for any package that genuinely needs a
   lifecycle script.
6. One repo-scoped, short-lived token per session; no org-wide PAT.
7. Audit-log export exercised once end to end **by your team**, with the record of *what fields
   exist* written down — this is the item I could not demonstrate, so it is the item I would put
   first in week 0.
8. Dependency audit diffed against `docs/evidence/sca-baseline.json` on every PR; trend reviewed at
   the end of the two weeks against the committed 111.
9. Signed DPA + subprocessor list + written no-training/ZDR confirmation (Q9) **before** the pilot
   starts, not after.
