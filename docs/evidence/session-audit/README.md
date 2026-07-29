# One session's audit record, exported

The Security Engineer's question in `docs/meeting/security-qa.md` §Q6 is *"what exactly does the
audit trail contain?"*, and the honest answer in the last revision was a documentation link. This is
the artefact instead: the complete event stream of one real migration session — **Run B of the
phase-1 Material 15 hop** ([session `cb4f31e3`](https://app.devin.ai/sessions/cb4f31e36dbd487f986aa79d4ae8b316),
PR [#2](https://github.com/t1mchee/devin-pitch/pull/2), the run described in
`../VARIANCE-phase1-material15.md`) — exported through the session-events API and committed here.

`cb4f31e3-events.tsv` is that export: **3,525 events**, one per line, ordered by timestamp, in the
form the API returns them.

```
[event-019fab4538697ae0b2d88c1ea8c5b395] 2026-07-29 00:27:48 UTC >>> shell_process_started (shell): exec: ls ~/repos 2>/dev/null; ls ~ ; date -u +%s (shell: 438fe4)   [shell]
 └ event id            └ UTC timestamp        └ direction  └ event type           └ category  └ payload summary
```

Every event carries an immutable id, a UTC timestamp, a direction (`<<<` into the session, `>>>` out
of it), a type, a category, and a payload; full payloads are retrievable per-event, so the summary
line here is an index, not the extent of what is recorded.

## What one 18-minute migration session generated

| Category | Events | What is in it |
|---|---|---|
| `shell` | 673 | **168 commands**, each with its exit code and captured output — every `npm`, `ng`, `nx` and `git` invocation the run made |
| `status` | 1,360 | working/blocked/finished transitions and activity updates |
| `other` | 1,360 | reasoning summaries, context and iteration statistics, ACU consumption |
| `file` | 66 | every file opened and every edit applied, by absolute path |
| `git` | 24 | PR created, PR bodies updated, CI checks polled, CI job logs fetched — each with the PR or Actions URL |
| `webhook` | 19 | inbound CI/PR notifications the session reacted to |
| `message` | 6 | the initial task prompt and every message the session sent |
| `lifecycle` | 6 | suspensions (all `user_inactivity`) |
| `playbook` | 5 | `rules_injected: AGENTS` — the repository's own `AGENTS.md`, re-injected on each resumption |
| `search` | 5 | code searches |
| `todo` | 1 | the plan the session committed to |
| `secret` | **0** | no credential was requested or used |
| `browser` | **0** | no browsing; nothing left the box except git and the package registry |
| `mcp`, `recording`, `knowledge` | 0 | not exercised by this run |

Three things a reviewer can verify directly from the file rather than take on trust:

1. **The refusal is in the record, including the reasoning that led to it.** `grep OV-17
   cb4f31e3-events.tsv` returns the run's own reasoning events from 00:28:45 — 65 seconds in, before
   any file was edited — identifying OV-17 and OV-18 as the two overrides whose stated intent might
   not be recoverable, which is where the eventual stop came from. The stop itself is in the
   `devin_message` at 00:46:37 and in PR #2's body, snapshotted under `../pr-snapshots/`. (That the
   *reason* it gave was factually wrong is on the variance page; an audit trail records what happened
   and why the agent thought so, not whether it was right.)
2. **Repository rules are enforced per resumption, not once.** Five `rules_injected: AGENTS` events,
   one per resumption, including the two after overnight suspensions.
3. **Nothing here shows a credential or an egress.** `secret` and `browser` are both zero for a run
   that cloned a repo, installed a full Angular 15 dependency tree, ran migrations and opened a PR.

## What this does not establish

- **This is the session-events API, not the enterprise audit-log API.** It is scoped to sessions this
  account owns. The enterprise endpoint (`/v3/enterprise/audit-logs`) needs an enterprise admin key
  this demo account does not have, so its schema — and specifically whether it records the same
  granularity across an *organisation* — is a claim to verify against BofA's own tenant in week 0,
  and `security-qa.md` says so rather than implying this export answers it.
- **Retention of these events is a contract question, not a technical one.** The export proves the
  record exists and is complete enough to reconstruct the run; how long Cognition keeps it, and what
  is deleted on termination, belongs in the DPA (Q9).
- **Payload summaries are truncated in this file.** Full contents are retrievable per event id
  through the API; the committed TSV is an index sized to be readable in a review, and the summaries
  were not edited beyond that truncation.
