import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Attaches the session assertion to outbound calls. Registered via the
 * `HTTP_INTERCEPTORS` multi-provider; `withInterceptors` is the Angular 15+
 * replacement and is a separate migration decision.
 */
@Injectable()
export class BofaAuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const cloned = req.clone({
      setHeaders: {
        'X-BoA-Channel': 'digital-banking-web',
      },
    });
    return next.handle(cloned);
  }
}
