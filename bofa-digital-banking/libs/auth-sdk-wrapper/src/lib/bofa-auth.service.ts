import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of, timer } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';

export interface BofaPrincipal {
  subjectId: string;
  displayName: string;
  entitlements: string[];
  mfaLevel: 'none' | 'otp' | 'hardware';
}

/**
 * Thin wrapper over the enterprise SSO/MFA SDK.
 *
 * Application code MUST NOT talk to the underlying SDK directly. Every auth and
 * step-up flow goes through this service so that session handling, entitlement
 * caching and MFA level are enforced in exactly one place and can be audited.
 */
@Injectable({ providedIn: 'root' })
export class BofaAuthService implements OnDestroy {
  private readonly destroyed$ = new Subject<void>();
  private readonly principal$ = new BehaviorSubject<BofaPrincipal | null>(null);

  /**
   * Pre-`takeUntilDestroyed` teardown pattern. `takeUntilDestroyed` arrived in
   * Angular 16 and would be the idiomatic replacement, but changing it is a
   * behavioural change to session refresh and needs its own review.
   */
  startSessionRefresh(intervalMs = 300_000): void {
    timer(0, intervalMs)
      .pipe(
        switchMap(() => this.fetchPrincipal()),
        takeUntil(this.destroyed$)
      )
      .subscribe((principal) => this.principal$.next(principal));
  }

  principal(): Observable<BofaPrincipal | null> {
    return this.principal$.asObservable();
  }

  hasEntitlement(entitlement: string): Observable<boolean> {
    return this.principal$.pipe(map((p) => !!p && p.entitlements.includes(entitlement)));
  }

  requireStepUp(level: BofaPrincipal['mfaLevel']): Observable<boolean> {
    return this.principal$.pipe(map((p) => !!p && p.mfaLevel === level));
  }

  private fetchPrincipal(): Observable<BofaPrincipal> {
    // Stand-in for the enterprise SDK call. Shape matches the real payload.
    return of({
      subjectId: 'u-8827301',
      displayName: 'Retail Customer',
      entitlements: ['accounts:read', 'payments:create'],
      mfaLevel: 'otp' as const,
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
