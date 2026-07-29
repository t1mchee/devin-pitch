import { Component } from '@angular/core';

@Component({
  selector: 'bofa-root',
  template: `<router-outlet></router-outlet>`,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #fff;
      }
    `,
  ],
})
export class AppComponent {
  title = 'retail-banking';

  constructor() {
    // `?theme=dark` puts the dark palette on <body>, which is also where CDK
    // attaches its overlay container — so panels and dialogs are themed too.
    // Test-surface only: there is no dark toggle in the product. It exists so
    // the override contract can be asserted twice, because an override can be
    // dead in one theme and load-bearing in the other.
    if (typeof window !== 'undefined') {
      const theme = new URLSearchParams(window.location.search).get('theme');
      document.body.classList.toggle('bofa-theme-dark', theme === 'dark');
    }
  }
}
