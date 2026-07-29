import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';

import { BofaAuthService } from '@bofa/auth-sdk-wrapper';

/**
 * Terminal route for a denied navigation. In production this hands off to the
 * enterprise SSO endpoint; the attempted url is carried on `?r=` so the SSO
 * round trip can return the customer to where they were going.
 */
@Component({
  selector: 'bofa-sign-in',
  template: `
    <main class="sign-in">
      <span class="sign-in__eyebrow">Bank of America</span>
      <h1 class="sign-in__title">Sign in to continue</h1>
      <p class="sign-in__body">
        Your session does not carry the entitlement required for
        <code>{{ attempted$ | async }}</code
        >. Sign in with your enterprise credentials to continue.
      </p>
      <bofa-button variant="primary" (pressed)="continueToSignIn()">Continue to sign in</bofa-button>
    </main>
  `,
  styles: [
    `
      .sign-in {
        max-width: 420px;
        margin: 96px auto;
        padding: 32px;
        border: 1px solid #eceef2;
        border-radius: 4px;
      }
      .sign-in__eyebrow {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #5d6673;
      }
      .sign-in__title {
        margin: 8px 0 12px;
        font-size: 24px;
        font-weight: 600;
      }
      .sign-in__body {
        margin: 0 0 24px;
        color: #5d6673;
        line-height: 20px;
      }
    `,
  ],
})
export class SignInComponent {
  readonly attempted$ = this.route.queryParamMap.pipe(map((params) => params.get('r') || '/accounts'));

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly auth: BofaAuthService
  ) {}

  /**
   * Stands in for the SSO round trip: the wrapper refreshes the principal and
   * the customer is returned to the url they were denied.
   *
   * The demo SDK returns a fixed principal, so the refresh cannot change an
   * entitlement and this route is unreachable in the running demo — the guard's
   * deny and redirect behaviour is covered by `bofa-auth.guard.spec.ts` instead.
   * Behind a real SSO endpoint the refresh is what grants the new session.
   */
  continueToSignIn(): void {
    this.auth.startSessionRefresh();
    this.attempted$.pipe(take(1)).subscribe((url) => this.router.navigateByUrl(url));
  }
}
