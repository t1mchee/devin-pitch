import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { UiCoreModule } from '@bofa/ui-core';
import { BofaAuthModule } from '@bofa/auth-sdk-wrapper';
import { AnalyticsSdkShimModule } from '@bofa/analytics-sdk-shim';

import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { APP_ROUTES } from './app.routes';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SignInComponent } from './sign-in/sign-in.component';
import { transactionsReducer } from './state/transactions.reducer';
import { TransactionsEffects } from './state/transactions.effects';

/**
 * Visual-regression mode. `?vr=1` disables Angular animations for the whole
 * app so that an overlay is captured in its settled state rather than part way
 * through an enter transition — without it, a dialog snapshot differs by
 * thousands of pixels between runs and the oracle is noise.
 *
 * It is a query flag rather than a separate build so the visual suite exercises
 * the same code the customer runs — but it is gated on the non-production
 * environment, so the production bundle has no URL-reachable switch for turning
 * animations off. The e2e target serves the development configuration.
 */
const animationsDisabled =
  !environment.production &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('vr');

@NgModule({
  declarations: [AppComponent, DashboardComponent, SignInComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule.withConfig({ disableAnimations: animationsDisabled }),
    HttpClientModule,
    RouterModule.forRoot(APP_ROUTES, { initialNavigation: 'enabledBlocking' }),
    // NgRx NgModule registration. `provideStore` is the standalone-era
    // replacement and lands with the Angular 15+ APIs.
    StoreModule.forRoot({ transactions: transactionsReducer }, {}),
    EffectsModule.forRoot([TransactionsEffects]),
    UiCoreModule,
    BofaAuthModule.forRoot(),
    AnalyticsSdkShimModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
