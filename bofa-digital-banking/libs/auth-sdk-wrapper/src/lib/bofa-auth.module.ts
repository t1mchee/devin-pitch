import { APP_INITIALIZER, ModuleWithProviders, NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { BofaAuthInterceptor } from './bofa-auth.interceptor';
import { BofaAuthService } from './bofa-auth.service';

export function initialiseSession(auth: BofaAuthService): () => void {
  return () => auth.startSessionRefresh();
}

@NgModule({})
export class BofaAuthModule {
  static forRoot(): ModuleWithProviders<BofaAuthModule> {
    return {
      ngModule: BofaAuthModule,
      providers: [
        BofaAuthService,
        { provide: HTTP_INTERCEPTORS, useClass: BofaAuthInterceptor, multi: true },
        {
          provide: APP_INITIALIZER,
          useFactory: initialiseSession,
          deps: [BofaAuthService],
          multi: true,
        },
      ],
    };
  }
}
