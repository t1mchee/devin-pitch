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
}
