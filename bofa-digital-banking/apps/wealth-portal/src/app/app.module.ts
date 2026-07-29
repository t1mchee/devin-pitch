import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { UiCoreModule } from '@bofa/ui-core';
import { BofaAuthModule } from '@bofa/auth-sdk-wrapper';

import { AppComponent } from './app.component';
import { PortfolioComponent } from './portfolio/portfolio.component';

@NgModule({
  declarations: [AppComponent, PortfolioComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot([{ path: '**', component: PortfolioComponent }], {
      initialNavigation: 'enabledBlocking',
    }),
    UiCoreModule,
    BofaAuthModule.forRoot(),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
