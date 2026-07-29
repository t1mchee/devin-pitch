import { Component } from '@angular/core';

import { SHOWCASE_COMPONENTS } from './showcase.component';

/** Index of the design-system showcase. Not captured by the visual suite. */
@Component({
  selector: 'bofa-showcase-index',
  template: `
    <div class="index">
      <header class="index__header">
        <span class="index__eyebrow">@bofa/ui-core</span>
        <h1 class="index__title">Design system</h1>
        <p class="index__body">
          13 wrapped Material components, 18 custom overrides. Every tile below is the
          surface the visual regression suite captures.
        </p>
      </header>
      <nav class="index__grid">
        <a class="index__tile" *ngFor="let name of all" [routerLink]="['/__showcase', name]">
          {{ name }}
        </a>
      </nav>
    </div>
  `,
  styles: [
    `
      .index {
        padding: 32px;
        max-width: 960px;
        margin: 0 auto;
      }
      /* Tokens, not hexes: these three colours are the ones that rendered
         invisible on /__showcase?theme=dark. See bofa-theme.scss. */
      .index__eyebrow {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--bofa-text-muted);
      }
      .index__title {
        margin: 4px 0 8px;
        font-size: 24px;
        font-weight: 600;
      }
      .index__body {
        margin: 0 0 24px;
        color: var(--bofa-text-muted);
      }
      .index__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
      }
      .index__tile {
        display: block;
        padding: 16px;
        border: 1px solid var(--bofa-border);
        border-radius: 4px;
        color: var(--bofa-link);
        text-decoration: none;
        font-weight: 600;
      }
      .index__tile:hover {
        border-color: var(--bofa-link);
        background: var(--bofa-surface-raised);
      }
    `,
  ],
})
export class ShowcaseIndexComponent {
  readonly all = SHOWCASE_COMPONENTS;
}
