import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { UiCoreModule } from '@bofa/ui-core';
import { BofaAuthModule } from '@bofa/auth-sdk-wrapper';
import { AnalyticsSdkShimModule } from '@bofa/analytics-sdk-shim';

import { AppComponent } from './app.component';
import { CardsComponent } from './cards/cards.component';

@NgModule({
  declarations: [AppComponent, CardsComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot([{ path: '**', component: CardsComponent }], {
      initialNavigation: 'enabledBlocking',
    }),
    UiCoreModule,
    BofaAuthModule.forRoot(),
    AnalyticsSdkShimModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
