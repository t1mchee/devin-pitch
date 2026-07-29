import { Routes } from '@angular/router';

import { BofaAuthGuard } from '@bofa/auth-sdk-wrapper';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ShowcaseComponent } from './showcase/showcase.component';

export const APP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'accounts' },
  {
    path: 'accounts',
    component: DashboardComponent,
    canActivate: [BofaAuthGuard],
    data: { entitlement: 'accounts:read' },
  },
  // Design-system showcase. Not shipped to production; the production build
  // configuration excludes this route file. It exists so the visual regression
  // suite has a stable, deterministic surface for every component and state.
  { path: '__showcase/:component', component: ShowcaseComponent },
  { path: '__showcase', redirectTo: '__showcase/button' },
  { path: '**', redirectTo: 'accounts' },
];
