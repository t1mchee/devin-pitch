import { APP_INITIALIZER, ModuleWithProviders, NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { BofaAuthInterceptor } from './bofa-auth.interceptor';
import { BofaAuthService } from './bofa-auth.service';

/**
 * The initializer returns a promise so that bootstrap blocks until the first
 * principal has been fetched. Returning void here lets the router evaluate
 * guards against a null principal and deny the first navigation.
 */
export function initialiseSession(auth: BofaAuthService): () => Promise<unknown> {
  return () => {
    auth.startSessionRefresh();
    return auth.sessionReady();
  };
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
