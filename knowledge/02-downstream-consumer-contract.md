# Downstream consumer contract

**Trigger:** `ui-core`, breaking change, public API, consumer

`libs/ui-core` is consumed by `retail-banking`, `card-services` and `wealth-portal`, and
in the real estate by teams outside this repository. Breaking it breaks all of them.

Any change to a `ui-core` public API — a component selector, an `@Input`, an `@Output`, an
exported type, or the module's exports — requires:

1. A characterisation test pinning the existing behaviour **before** the change.
2. A note in the PR listing every affected consumer and the code change each must make.
3. An explicit statement of whether the change is source-compatible.

If a change can be made without altering the public API, make it that way, even if the
result is slightly less elegant. Elegance inside `ui-core` is worth less than not
scheduling work for three other teams.
