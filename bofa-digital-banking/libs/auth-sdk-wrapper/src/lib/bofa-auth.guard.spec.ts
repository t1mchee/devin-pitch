import { discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';

import { BofaAuthGuard } from './bofa-auth.guard';
import { BofaAuthService } from './bofa-auth.service';

describe('BofaAuthGuard', () => {
  let guard: BofaAuthGuard;
  let auth: BofaAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RouterTestingModule] });
    guard = TestBed.inject(BofaAuthGuard);
    auth = TestBed.inject(BofaAuthService);
    TestBed.inject(Router);
  });

  function route(entitlement: string): ActivatedRouteSnapshot {
    return { data: { entitlement } } as unknown as ActivatedRouteSnapshot;
  }

  const state = { url: '/accounts' } as RouterStateSnapshot;

  async function loadPrincipal(): Promise<void> {
    auth.startSessionRefresh(60_000);
    await auth.sessionReady();
  }

  /**
   * Regression: the guard used to emit `false` for a null principal, redirecting
   * the very first navigation to `/sign-in` before the session had loaded.
   */
  it('does not decide until the principal has loaded', fakeAsync(() => {
    let decided = false;
    guard.canActivate(route('accounts:read'), state).subscribe(() => (decided = true));

    tick(0);
    expect(decided).toBe(false);

    auth.startSessionRefresh(60_000);
    tick(0);
    expect(decided).toBe(true);

    discardPeriodicTasks();
  }));

  it('allows a principal holding the required entitlement', async () => {
    await loadPrincipal();
    const result = await firstValueFrom(guard.canActivate(route('accounts:read'), state));
    expect(result).toBe(true);
  });

  it('refuses a principal missing the required entitlement', async () => {
    await loadPrincipal();
    const result = await firstValueFrom(guard.canActivate(route('wires:approve'), state));
    expect(result instanceof UrlTree).toBe(true);
  });

  it('preserves the attempted url on the redirect', async () => {
    await loadPrincipal();
    const result = (await firstValueFrom(
      guard.canActivate(route('wires:approve'), state)
    )) as UrlTree;
    expect(result.toString()).toContain('sign-in');
    expect(result.queryParams['r']).toBe('/accounts');
  });
});
