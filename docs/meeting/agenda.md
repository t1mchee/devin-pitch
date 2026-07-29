# Bank of America — introductory meeting agenda (45 minutes)

**Attending:** VP of Engineering, Digital Banking · Security Engineer, Consumer Applications ·
Chief Architect

**Purpose:** decide whether a two-week, scoped pilot on the Angular 14 → 18 programme is worth
BofA's time. Not a product tour.

| Time | Item | Who leads | What we want out of it |
|---|---|---|---|
| 0–5 | Why we picked the Angular upgrade of your three, and what we assumed | Us | Correct our assumptions early — the rest of the meeting is wrong if the assumptions are |
| 5–12 | Your shape of the problem: how many consumers of the shared library, who owns the design system, what the EOL date actually is | VP Eng | Their numbers, not ours |
| 12–27 | Demo on a stand-in repo: one consumer upgraded end to end, then the same playbook run three times so you can see the variance | Us | Belief that the output is reviewable, and that the failures are honest |
| 27–35 | Security and governance: where the code runs, what it can reach, how a change gets to `main` | Security Engineer | Their veto conditions, written down |
| 35–42 | Architecture: the shared-library fan-out, what happens to the 20 downstream teams, what we do *not* automate | Chief Architect | Agreement on the boundary between machine and human decisions |
| 42–45 | Concrete next step | Us | A named pilot repo, a named owner, a date |

## The three things we are asking for

1. **One repository** — ideally the shared component library plus one consumer.
2. **One named design-system owner** who can answer the questions the runs escalate (they will be
   the same two or three questions, repeatedly).
3. **Two weeks** and an agreed definition of success: *n* consumer PRs merged with no baseline
   regenerated without a written reason.

## What we will not claim

- That the migration is fully automated. It is not; the demo shows exactly where it stops.
- Any figure for time saved, defect rate, or cost that we cannot show you the run for.
- Any statement about your internal network, your data residency posture or your controls. Those
  are your answers to give, and we will write down whatever they are.
