import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { filter, firstValueFrom } from 'rxjs';

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

  it('redirects to sign-in when no principal is loaded', async () => {
    const result = await firstValueFrom(guard.canActivate(route('accounts:read'), state));
    expect(result instanceof UrlTree).toBe(true);
  });

  async function loadPrincipal(): Promise<void> {
    auth.startSessionRefresh(60_000);
    await firstValueFrom(auth.principal().pipe(filter((p) => p !== null)));
  }

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
});
