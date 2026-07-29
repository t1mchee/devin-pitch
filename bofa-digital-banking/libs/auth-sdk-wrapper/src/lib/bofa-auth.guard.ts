import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BofaAuthService } from './bofa-auth.service';

/**
 * Class-based route guard. Functional guards (`CanActivateFn`) arrived in
 * Angular 15 and the class-based interface is deprecated from 15.2, so this is
 * a genuine migration decision rather than a rename.
 *
 * The guard resolves against a loaded principal only. `hasEntitlement` waits for
 * the session to settle rather than emitting `false` for a null principal, so a
 * cold navigation is never denied because the SDK has not answered yet.
 */
@Injectable({ providedIn: 'root' })
export class BofaAuthGuard {
  constructor(private readonly auth: BofaAuthService, private readonly router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const required = (route.data && (route.data['entitlement'] as string)) || 'accounts:read';
    return this.auth
      .hasEntitlement(required)
      .pipe(map((allowed) => allowed || this.router.createUrlTree(['/sign-in'], { queryParams: { r: state.url } })));
  }
}
