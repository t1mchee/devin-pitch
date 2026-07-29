# Auth wrapper rules

**Trigger:** auth, SSO, MFA, guard, interceptor, session, entitlement

All authentication, session and MFA flows go through `@bofa/auth-sdk-wrapper`. Nothing
bypasses it. This is a control, not a convention: it is the single place where session
handling and entitlements can be audited.

The wrapper pins `@angular/core` and `@angular/common` to `^14.0.0`. That pin will block
the upgrade. **Do not widen it as a formality.** Before changing the range:

1. Check the class-based `CanActivate` guard against the target version. Class-based
   guards are deprecated from Angular 15.2 in favour of `CanActivateFn`.
2. Check the `APP_INITIALIZER` factory registration.
3. Check the `HTTP_INTERCEPTORS` multi-provider registration against `withInterceptors`.
4. Check the `takeUntil(destroyed$)` teardown against `takeUntilDestroyed` (Angular 16+).

Write what you checked into the PR. "Widened the peer range" without that evidence is not
an acceptable PR description for this package.
