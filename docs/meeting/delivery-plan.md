# Delivery plan — 14 → 18, dates, review cost, escalation

For the VP of Engineering. Two rules for this page: anything measured is labelled **[measured]**
with where it came from, and anything modelled is labelled **[model]** with the assumption it rests
on. A number with no label would be a guess, and there are none here.

## 1. The unit of work

The programme is not one migration, it is `4 hops × (1 library + N consumers)`. Everything below
follows from that shape.

| Hop | What actually breaks | Automatable share |
|---|---|---|
| 14 → 15 | Material MDC rewrite: every override targeting Material internals stops matching, silently. Bundle grows past budget. | Codemods run clean; the theming work is the job. **[measured]** — `docs/evidence/GATE-01-...md`: migration succeeds, build then fails, and CSS never fails to compile. |
| 15 → 16 | `@angular/flex-layout` has no release past `15.0.0-beta.42`. Every `fx*` directive becomes hand-written CSS. Legacy Material components removed, so 15's escape hatch closes. | Low. **[measured]** — run, not landed: PR [#5](https://github.com/t1mchee/devin-pitch/pull/5), written up in `docs/evidence/PHASE2-15-to-16.md`. The `fx*` rewrite holds (the three `responsive-grid` baselines pass at 0 px in CI), Node moved 16 → 18, and the run then **misexplained its own red image suite** as a font problem. Read that section; it is the most useful thing on this page. |
| 16 → 17 | Standalone-first defaults, `entryComponents` removal, Node runtime moves. | **[model, unevidenced]** — expected high, from the Angular changelogs. Nobody has run it here. |
| 17 → 18 | Control flow syntax is opt-in; mostly dependency alignment (NgRx, RxJS). | **[model, unevidenced]** — same. And "dependency alignment" is doing a lot of work: `@ngrx/*` ships its own majors and its own schematics, and this repo's NgRx layer has no unit tests, so it is the least evidenced thing in the programme. |

**2 of 4 hops have been run. Neither is merged.** Say that sentence out loud in the meeting before
anyone else says it for you.

The honest ordering point: hops 3 and 4 are cheap **only if** 1 and 2 were done properly. A team
that re-baselines its way through 14→15 pays for it twice.

## 2. What we can put a number on today

**[measured]** From `docs/evidence/VARIANCE-phase1-material15.md`, three independent runs of 14→15
on this repository:

- 18 minutes wall clock for the run that completed (Run B, session start → final message).
- 16/18 and 17/18 overrides re-expressed automatically.
- 2 and 1 overrides escalated, respectively — and **the same override, OV-17, in both**.
- 0 baselines regenerated to force a pass.
- 3 escalated questions, and both runs escalated the same three.

**[measured]** One of those escalations was a *false stop*: both runs justified refusing OV-17 with
a reason that is factually wrong, caught in human review, not by a test. That is a real cost and it
is on the page rather than under it.

The load-bearing result is not the 18 minutes. It is that **two independent runs escalated the same
small set of questions**. Review cost scales with the number of distinct questions, not with the
number of PRs — that is the whole basis of the model below.

## 3. The review-cost model

**[model]** Assumptions, all of which the pilot measures rather than assumes:

- N = 20 consumer repositories (your figure; this repo demonstrates 3, and I am not going to
  pretend 3 is 20).
- Library hop: ~1 day of design-system-owner attention, dominated by answering escalations once.
- Consumer hop: **[measured on 3 consumers]** the consumer change is a version bump and a build,
  because the wrapper layer absorbs the Material churn — that is what `ui-core` is for, and it is
  why the consumer tests added in this PR exist to check it rather than assert it.
- Consumer PR review: 15–30 min each when the library's questions are already answered.

| | Library | 20 consumers **[model]** | Total per hop |
|---|---|---|---|
| Distinct decisions to make | 3–5 | ~0 (answered once, applied via the parameterised playbook) | 3–5 |
| Reviewer hours | ~6 | 5–10 | **11–16 h** |
| Elapsed, at 5 concurrent sessions | 1–2 days | 2–3 days | **~1 week** |

Four hops ⇒ **~4 weeks of elapsed time and 45–65 reviewer hours**, against an EOL deadline.

**Three ways this model is wrong, before you find them.**

1. *The consumer column is a model, not a measurement.* Three consumers in one repo behind a
   wrapper is not twenty repos with their own overrides. If your consumers style Material
   directly, the column stops being ~0 and the total is not 45–65 hours. The
   `component-audit` playbook measures this in a day, and it is pilot task #1.
2. *n = 2, same model, same prompt.* The runs agreeing is evidence that the questions are few; it
   is **not** evidence that a bad stop gets caught. Two runs produced the *same wrong reason* for
   refusing OV-17. Twenty consumer PRs are therefore not twenty independent chances to catch that
   — they are one chance repeated twenty times. The pilot should measure *distinct wrong reasons
   per hop*, and if that number is not ~1, this model is optimistic.
3. *There is no human control.* Every number here is Devin's cost. Nobody has measured what this
   migration costs your team today, so "18 minutes" has no denominator and this page contains no
   savings figure. The pilot must run one hop with a human control on a comparable consumer, or
   week 3 is a conversation without arithmetic.

## 4. Escalation — who owns what, and how fast

An agent that stops and asks is only an asset if someone answers. This is the part that decides
whether the programme runs at one week per hop or three.

| Escalation | Owner | Target response | If unanswered |
|---|---|---|---|
| Override intent unrecoverable (OV-17 class) | Design-system owner (named, in `.github/CODEOWNERS`) | 1 business day | Session blocks. It does **not** guess, and it does not proceed to the next consumer with the question open. |
| Appearance change accepted / rejected (re-baseline) | Design-system owner + one consumer representative | 1 business day | Blocks. Re-baselining requires `BASELINE-CHANGE:` in the PR and CODEOWNERS review — enforced by CI, not by policy. |
| Bundle budget or peer-range change | Owning application team | 2 business days | Blocks that consumer only; the others continue. |
| External-shell coupling (OV-18 class) | Outside this repository's owners | No SLA — genuinely blocked | Permanent stop, documented as such. |

The 1-business-day target is **[model]**, and it is the assumption most likely to be wrong in a
bank. It is also the cheapest thing to fix: batch the escalations. All three phase-1 questions
arrived within 18 minutes of starting, and could have been answered in one 30-minute meeting before
any consumer work began.

## 5. Fan-out mechanics

1. **Library first, alone.** Nothing fans out until `ui-core` is green on the target hop with every
   visual diff either zero or explained.
2. **Publish, then fan out.** Consumers move via the same parameterised playbook
   (`playbooks/ng-upgrade-consumer.md`, `TARGET_VERSION=<hop>`), one session per repository, run
   concurrently.
3. **The playbook improves between hops, not during them.** `playbooks/REVISIONS.md` records what
   each round changed and on what evidence — six changes came out of phase 1 alone.
4. **Consumers verify against the migrated artefact**, not against a promise: build plus the
   consumer characterisation tests.

## 6. What I would commit to in a two-week pilot

- One repository, one named design-system owner, no merge authority for the agent.
- Week 1: component audit across the real consumer set (this is the model's biggest unknown, so it
  goes first), then the 14→15 library hop with escalations batched into one review session.
- Week 2: fan out to 3–5 real consumers; measure reviewer minutes per PR for real.
- Exit criteria, stated now so it can fail honestly: **consumer PRs merged with zero unexplained
  baseline regenerations, and a measured reviewer-minutes-per-consumer number** to replace the
  model in section 3.

If the audit in week 1 shows consumers with their own Material overrides, I would rather tell you
in week 1 that this is a bigger programme than the model says than discover it at hop three.
