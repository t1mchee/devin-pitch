import { Routes } from '@angular/router';

import { BofaAuthGuard } from '@bofa/auth-sdk-wrapper';

import { DashboardComponent } from './dashboard/dashboard.component';
import { SignInComponent } from './sign-in/sign-in.component';

/**
 * Production route table. Swapped in by `fileReplacements` in the production
 * build configuration. The `__showcase` routes exist only to give the visual
 * regression suite a deterministic surface and are not shipped to customers.
 */
export const APP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'accounts' },
  {
    path: 'accounts',
    component: DashboardComponent,
    canActivate: [BofaAuthGuard],
    data: { entitlement: 'accounts:read' },
  },
  { path: 'sign-in', component: SignInComponent },
  { path: '**', redirectTo: 'accounts' },
];
