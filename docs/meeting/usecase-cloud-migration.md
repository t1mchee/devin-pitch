# Not chosen (yet): notification service → AWS Lambda

**One line:** the hard parts are architectural decisions, not code transformations, so an agent
cannot show you evidence in two weeks — it can only produce opinions you would have to review
anyway.

## What the work actually is

| Element today | What moving to Lambda forces you to decide |
|---|---|
| IBM MQ | Replacement semantics. SQS FIFO gives ordering per message-group, at a throughput ceiling; EventBridge and SNS give neither. Which ordering guarantee does a fraud alert actually need, per event type? |
| Spring Boot service | Cold start against a customer-facing alert path; connection pooling from a function to a database that was designed for long-lived pools |
| On-prem Oracle | Either the database moves, or every invocation crosses the boundary. Both are programmes, not tickets |
| LDAP auth | Identity federation for a workload that no longer sits inside the perimeter |
| 99.99 % SLA | Multi-region, replay, poison-message handling and a tested failback |
| Data residency, encryption at rest | Key custody and region pinning, decided before any code moves |

## Why it is a poor *first* engagement, not a poor engagement

There is no oracle. On the Angular programme, "did it work" is a build, a unit suite and a pixel
diff — a machine can answer it and you can audit the answer in minutes. Here, "did it work" is
*did we preserve ordering under partial failure*, which is answered by design review and load
testing over weeks.

## Where an agent is genuinely useful here — after the decisions are made

- Mechanical translation once the target topology is fixed: Spring handler → Lambda handler,
  per-handler, with the contract tests carried across.
- Writing the characterisation tests for current behaviour *before* anything moves — including the
  ordering and idempotency cases nobody wrote down.
- Infrastructure-as-code scaffolding against a topology your architects have already signed.
- The unglamorous fan-out: consumers, dashboards, runbooks, alert wiring.

## What we would need from you before proposing it

The event taxonomy with the ordering requirement per type, the current failure modes and their
frequency, the Oracle access pattern, and whoever owns the residency answer. That conversation is
worth having in the second meeting, not this one.
