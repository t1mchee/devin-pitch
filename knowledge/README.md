# Knowledge entries

These are the Devin Knowledge entries configured for `bofa-digital-banking`. Each has a
trigger (when Devin should recall it) and a body (what it should then do). They are kept
in version control so a change to a standard is a reviewable event rather than a silent
edit in a settings page.

| # | Entry | Trigger | File |
|---|---|---|---|
| 1 | Design system override policy | `Material`, `SCSS`, `theming`, `_overrides` | `01-design-system-override-policy.md` |
| 2 | Downstream consumer contract | `ui-core`, `breaking change`, `public API` | `02-downstream-consumer-contract.md` |
| 3 | Auth wrapper rules | `auth`, `SSO`, `MFA`, `guard`, `interceptor` | `03-auth-wrapper-rules.md` |
| 4 | Verification standard | `test`, `CI`, `done`, `verify` | `04-verification-standard.md` |
| 5 | Currency and numerics | `currency`, `table`, `transaction`, `amount` | `05-currency-and-numerics.md` |
