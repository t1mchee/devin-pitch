# Playbook revision log

A playbook is only worth having if it gets worse-to-better with each run. This is the log of what
each run changed, and why. Every entry names the run that produced the evidence.

## `ng-upgrade-consumer.md`

### r3 — after the phase-1 15→16 and control runs

*Pending. Recorded when [phase 2](https://app.devin.ai/sessions/19b61285a4ed4715b59cdbacfbf2095e)
and the [control run](https://app.devin.ai/sessions/63c723a41df542d5827574157f121c91) report.*

### r2 — after phase 1 (three runs at `TARGET_VERSION=15`)

Evidence: `docs/evidence/VARIANCE-phase1-material15.md`.

| Change | Why |
|---|---|
| Step 4 must **propose** a density/spacing value measured from the committed baseline before it may escalate, and must state which snapshot it measured. | Runs A and B both stopped on OV-17 with the reason "no baseline exercises the compact variant". That reason was false — the compact field is in `form-field-default.png`. A safe stop for a wrong reason is still a wrong stop, and it costs the design-system owner a round trip. |
| Step 9 must report the diff pixel count **per snapshot, passing or failing**, and quote the run's own output rather than a remembered figure. | Reported pixel counts were renderer-dependent and one figure in the demo materials went stale. The plugin now logs every count for exactly this reason. |
| Step 3 must record wall clock as session-start to final-message, or write "not reported". | An unsourced "18 min" made it into the variance page and a reviewer was right to challenge it. |
| Step 2 must run `npm run visual` (pinned digest, `--skip-nx-cache`), never a bare `nx e2e`. | A host run disagreed with the baselines by 455–5,963 px (`docs/evidence/ORACLE-noise-floor.md`), and later the same day the same host agreed at 0 px because an apt install changed its fonts (§2.1) — so a host run is unusable in either direction; an Nx cache hit is not a test run either. Both mistakes were made during this build. |
| Step 8 must extend the characterisation test to any new `@Input`/`@Output`/rendered `bofa-` hook, not just the export list. | The original test only compared `Object.keys()` of the barrel, so a renamed input would have passed it and broken all three consumers. |
| New step 8b: build **and unit-test at least one consumer application** against the migrated library before opening the PR. | "Consumers are unaffected" was an assertion in the phase-1 PRs. It is now a check (`cards.component.spec.ts`, `portfolio.component.spec.ts`). |

### r1 — initial

Parameterised `TARGET_VERSION`, so the same playbook drives 14→15, 15→16 and each downstream
consumer's follow-on run rather than being rewritten per hop.

## Design-system repairs this surfaced (owned by BofA, not by the playbook)

- **OV-17** says "tightened" with no number. Any migration that meets a density override with no
  target value has to guess or ask. The repair is one line: write the intended height into the
  override comment. Cheap, and it converts a recurring escalation into an automated step.
- **OV-18** synchronises with a legacy shell that lives outside this repository, so the intent
  genuinely cannot be verified here. That one is a correct permanent stop until the shell's owner
  is in the loop.
