import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { UiCoreModule, BofaDialogComponent } from '@bofa/ui-core';
import { BofaAuthModule } from '@bofa/auth-sdk-wrapper';
import { AnalyticsSdkShimModule } from '@bofa/analytics-sdk-shim';

import { AppComponent } from './app.component';
import { APP_ROUTES } from './app.routes';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ShowcaseComponent } from './showcase/showcase.component';
import { transactionsReducer } from './state/transactions.reducer';
import { TransactionsEffects } from './state/transactions.effects';

@NgModule({
  declarations: [AppComponent, DashboardComponent, ShowcaseComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
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
  // Removed as a concept in Ivy but still accepted in 14; a v15+ upgrade
  // should delete it rather than carry it forward.
  entryComponents: [BofaDialogComponent],
})
export class AppModule {}
