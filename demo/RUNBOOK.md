# Demo runbook — 12 minutes, live

Everything here runs from `bofa-digital-banking/`. Node 16.20.2. Docker must be running (the
visual gate is containerised). **Rehearse with the timings; the cuts are where the value is.**

## Before you start (not on the clock)

```bash
nvm use 16.20.2
npm ci --legacy-peer-deps
npx nx reset                 # a stale Nx daemon is the #1 live-demo failure
lsof -ti:4200 | xargs -r kill
docker pull cypress/included:10.11.0
```

Open, in tabs: the repo, PR [#2](https://github.com/t1mchee/devin-pitch/pull/2),
PR [#3](https://github.com/t1mchee/devin-pitch/pull/3),
`docs/evidence/VARIANCE-phase1-material15.md`, `docs/evidence/GATE-01-automated-migration-is-not-enough.md`.

## 0:00–1:30 — The app, so the pixels mean something

`npx nx serve retail-banking` → `/accounts`. Make a transfer, confirm, cancel. Sort the table.
Say: *this is the customer surface; every control on it comes from one shared library that twenty
teams consume.*

## 1:30–3:00 — The library and its rules

`libs/ui-core` — 13 wrapped components. `_overrides.scss` — 18 overrides, each with an `OV-nn`
reason. `AGENTS.md` — the rules the agent is held to. Land the line: **an override without a
recorded reason is the actual migration risk, not the version number.**

## 3:00–4:30 — The oracle, and one deliberate failure

```bash
npm run visual        # 17 passing, in a pinned container, cache skipped
```

Then change `.bofa-table .mat-header-cell` colour to brand red and re-run:

```
Visual regression on table-default: 875 pixels differ (0.095%).
```

Say: *0.095 % — the percentage budget we started with allowed 0.1 %, so this shipped a wrong red to
millions of customers and the suite said green. The budget is now 40 absolute pixels.* Revert.

## 4:30–6:00 — "But `ng update` does this"

`docs/evidence/GATE-01-automated-migration-is-not-enough.md`. The migrations complete; the build
fails on the Material typography API. **The exit code of the codemod is not the deliverable.**

## 6:00–9:30 — What Devin actually produced

Open PR #2 and PR #3 — two independent runs of the same playbook, `TARGET_VERSION=15`.

- Both left CI **red** on the 12 snapshots MDC changed, and **neither regenerated a baseline**.
- Both refused OV-17 with the same reasoning, and left the rule inert and annotated.
- Run B raised the bundle budget by 50 kB and wrote down that it did; Run A stopped with a failing
  build instead.

## 9:30–11:00 — Variance, told honestly

`docs/evidence/VARIANCE-phase1-material15.md`. Chips: 6,635 px in one run, 707 px in the other.
Say: *the diffs vary; the refusals don't. That is what makes 20 of these reviewable.* Then say
Run C died on a usage limit — **2 of 3 completed** — before anyone asks.

## 11:00–12:00 — The ask

One repo, one named design-system owner, two weeks. Success = *n* consumer PRs merged with no
baseline regenerated without a written reason.

## If something breaks live

| Symptom | Do this |
|---|---|
| Port 4200 busy / Cypress hangs | `npx nx reset`, kill 4200, rerun |
| `nx e2e` suspiciously instant | it cached — always use `npm run visual`, which passes `--skip-nx-cache` |
| Docker unavailable | fall back to `npx nx e2e retail-banking-e2e --skip-nx-cache` and say out loud that baselines are renderer-pinned |
| Anything red you didn't plan | show it and read it aloud. A demo that can fail is the point |
