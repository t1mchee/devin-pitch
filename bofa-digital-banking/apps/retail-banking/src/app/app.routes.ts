import { Routes } from '@angular/router';

import { BofaAuthGuard } from '@bofa/auth-sdk-wrapper';

import { DashboardComponent } from './dashboard/dashboard.component';
import { SignInComponent } from './sign-in/sign-in.component';

export const APP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'accounts' },
  {
    path: 'accounts',
    component: DashboardComponent,
    canActivate: [BofaAuthGuard],
    data: { entitlement: 'accounts:read' },
  },
  // Terminal route for a denied navigation. Without it a guard redirect and the
  // wildcard below bounce off each other and the application never renders.
  { path: 'sign-in', component: SignInComponent },
  // Design-system showcase. Not shipped to production: the production build
  // replaces this file with `app.routes.prod.ts`, which has no reference to the
  // lazy module, so no chunk is emitted for it. It exists so the visual
  // regression suite has a stable, deterministic surface for every component.
  {
    path: '__showcase',
    loadChildren: () => import('./showcase/showcase.module').then((m) => m.ShowcaseModule),
  },
  { path: '**', redirectTo: 'accounts' },
];
