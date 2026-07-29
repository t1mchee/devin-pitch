# Executive pitch deck — Bank of America

Source of `PITCH-DECK.pdf`. 14 slides, no charts, one table. Every external number is sourced in
the notes under each slide; if a number is not sourced, do not say it in the room.

---

## 1 — Title

**The Angular 14 → 18 upgrade, run as a pipeline instead of a project**

Cognition · Devin · Bank of America engineering leadership

*Speaker note:* open with the deadline, not the product. "This is a security-policy date, not a
modernisation initiative. That changes who signs off."

---

## 2 — What we already know about your engineering

| | |
|---|---|
| ~$14B | annual technology budget; ~$4B of it on new initiatives |
| 60,000 | people in the technology organisation |
| ~59M | verified digital users; ~30B digital interactions last year, +14% |
| 86% | of clients rate their digital experience 9/10 or better |
| ~8,400 | patents granted or pending; ~1,600 AI |
| 18,500 | developers on GitHub Copilot, up from 500 in under a year |

*Speaker note:* the last row is the one that matters. You are not early on AI in the SDLC; you
have already run the hardest part — enterprise-wide developer adoption.
*Sources:* American Banker, Jun 2026 (budget, 60k, Copilot 500→18,500); Banking Dive, Jun 2026
($13.5B / $4B, 8,400 patents); BofA newsroom, Mar 2026 (59M users, 30B interactions, 86%).

---

## 3 — The wedge

> "We have 17,000 programmers using AI coding technology today **saving 10% to 15% in code
> generation costs**." — Brian Moynihan, Q2 2025 earnings call

Code generation is the cheap part of an Angular major upgrade.

The expensive parts: deciding whether a diff is safe, why an override existed, and who tells
twenty consuming teams their build is about to break.

**Assistants make a developer faster inside a file. This work is measured in completed,
reviewable pull requests across repositories.**

*Speaker note:* do not attack Copilot. Position: same direction, different unit of work.

---

## 4 — Why this use case, of your three

**Angular upgrade.** Risk is *fan-out*: one shared library, a custom design system over Material,
consumed by teams who did not ask for this upgrade. Failure shows up as somebody else's broken
build in deadline week.

**Cloud migration.** Risk is runtime, and you already have the harder half — a private cloud you
burst out of by design, not a lift-and-shift.

**Test coverage.** Risk is measurable, and an OCC examination gives you the number to hit.

Fan-out risk is the one no dashboard shows you, and the only one where an agent working across
repositories changes the shape of the problem.

*Source:* Gopalkrishnan on the private-cloud/burst posture, CIO.com, Apr 2025.

---

## 5 — The uncomfortable part of your own brief

Angular 14 left LTS in **June 2024**. Angular 18 reached **end of life in November 2025**.

So the stated target no longer satisfies the policy that created the deadline. Supported today:
20 (to Nov 2026), 21, 22.

**If a single hop is a project, you will land on an unsupported version again. The deliverable
isn't 18. It's a hop you can run four times a year.**

*Speaker note:* say this early and plainly. It reframes the whole meeting from "help us do 18" to
"help us stop doing this by hand", and it is the credibility moment of the first ten minutes.
*Source:* Angular release/support policy, endoflife.date.

---

## 6 — What you'll see in the demo

A real Angular 14.2 Nx monorepo: 13 Material components wrapped as `bofa-*`, 18 documented
overrides, three consuming apps, stubbed SSO/MFA and analytics boundaries.

Live at **t1mchee.github.io/devin-pitch**

Three things, in order:

1. The customer surface, so the pixels mean something.
2. Two gates: one that tells you *something moved*, one that tells you *which promise broke*.
3. Two independent Devin runs of the same migration hop — and what both got wrong.

---

## 7 — The risk isn't the version number

An override with no recorded reason is the migration risk.

```scss
/* OV-05c: header cells carry the slate-900 brand weight,
   not Material's grey — brand review, Mar 2023 */
.bofa-table .mat-header-cell { color: $boa-slate-900; }
```

Material renames the internal class between majors. The selector dies silently. The intent — a
brand decision someone signed off — is now unenforced, and no test in the repo knows.

**Migrating a design system is migrating intent, not selectors.**

---

## 8 — Two gates

**Pixels.** 21 snapshots, budget 40 absolute pixels. Catches what moved.

**Intent.** 77 computed-style probes, one per override reason, asserted on the running app, plus
a legibility sweep that reads every visible text node on 16 routes in both palettes and scores
contrast.

Injected a wrong brand red: pixel gate said *753 pixels differ*. Intent gate said
*`OV-05c`: header cells carry the slate-900 brand weight, not the Material grey*.

**One is a diff. The other is a sentence a reviewer can act on.**

---

## 9 — Where it failed (the slide that should buy your trust)

- The pixel budget was originally 0.1% of pixels. It waved a **wrong brand red through to a
  customer dashboard**. Fixed to 40 absolute pixels.
- The first dark-theme check asserted the light-theme colour, so two of five transaction rows
  rendered at **1.07:1** — unreadable balances — and the suite was **green**.
- The intent gate's first run found **three dead overrides in our own library**, one passing only
  because Material's default happened to equal the brand colour.
- A migration run explained its own red screenshots as a missing-font problem. It wasn't. **The
  gate held; the narrative failed.**

Every one of those was found by adversarial review, not by design, and every one is written down
in the repo.

---

## 10 — What the agent did and did not do

Two independent runs, same playbook, `TARGET_VERSION=15`:

- both left CI **red** on the 12 snapshots Material's MDC rewrite changed
- **neither regenerated a baseline** to get green
- both stopped on the same ambiguous override, with the same reasoning — and that reasoning was
  **wrong**; human review caught it
- one raised a bundle budget and wrote down that it did; the other stopped with a failing build

Same playbook against a **third-party** design system (ng-matero, 2,300 lines of someone else's
SCSS, zero intent comments): 3 genuine stops, 1 false stop, three confident wrong guesses no gate
caught.

**The claim: it does not guess when it knows it doesn't know. The limit: it doesn't yet know when
a confident rewrite quietly stopped applying — which is why the intent gate is in pilot scope.**

---

## 11 — Controls, in your language

- The output is a **pull request**. It inherits every control you already have on PRs — CODEOWNERS,
  branch protection, your scanners — plus gates we added because an agent produces more of them.
- **No baseline changes without a written reason.** CI rejects the PR body without
  `BASELINE-CHANGE:`, and the guard cannot be edited by the PR it guards.
- `npm ci --ignore-scripts` as policy: a transitive lifecycle script must not run before a human
  reads the diff.
- Renderer pinned by digest, so "it passed on my machine" is not evidence.
- Every session is a replayable transcript: prompt, commands, diffs, who approved.

*Speaker note:* for the Security Engineer, lead with the last bullet, not the first.

---

## 12 — Why an examiner likes this better than a person doing it

An OCC examiner asks: who changed the customer-facing control, on what evidence, reviewed by whom.

A migration done by hand answers that with a commit message. This answers it with a transcript, a
named override intent, a contrast ratio, and a review record — **for every hop, every time**.

The audit artefact is a by-product of the work, not a document written afterwards.

---

## 13 — The pilot

**Two weeks. One repository. One named design-system owner.**

Week 1: land the intent gate on the real library; run 14→15 on a branch; three consumer PRs.
Week 2: run the next hop; measure reviewer minutes per PR; publish the refusal rate.

**Success:** *n* consumer PRs merged with **no baseline regenerated without a written reason**.

**Failure we'd accept:** the agent stops more often than it ships, and we can tell you exactly why
from the transcripts.

---

## 14 — The ask

1. Name the repository and the design-system owner.
2. One 90-minute working session with the consuming teams' leads.
3. Read-only passes on the other two, in parallel, at no risk: the notification service and the
   12-service monorepo before the examination.

Then the honest sentence to end on: *"You've already proven your developers will adopt this. The
open question is whether the work arrives finished and reviewable. Two weeks and one repo answers
it."*
