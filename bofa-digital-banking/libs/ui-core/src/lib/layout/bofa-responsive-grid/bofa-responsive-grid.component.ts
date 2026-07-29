import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Summary-and-detail layout used on every account landing page.
 *
 * Responsive intent (this is the contract, the directives are the implementation):
 *  - >= lg   : summary 30% / detail fills remaining, side by side, 16px gutter
 *  - md      : summary 40% / detail fills remaining
 *  - < md    : stacked, summary first
 *  - < sm    : detail is hidden entirely (mobile web shows summary only and
 *              links out to the detail route; the detail table is not usable
 *              below 600px and was cut after usability testing)
 *
 * @angular/flex-layout is deprecated and has no forward path past Angular 15.
 * Migrating this component means reproducing the intent above in CSS.
 */
@Component({
  selector: 'bofa-responsive-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bofa-responsive-grid"
      fxLayout="row"
      fxLayout.lt-md="column"
      fxLayoutGap="16px"
      fxLayoutAlign="space-between stretch"
      [attr.data-state]="dense ? 'dense' : null"
    >
      <div class="bofa-responsive-grid__summary" fxFlex="30" fxFlex.lt-lg="40" fxFlex.lt-md="100">
        <ng-content select="[slot=summary]"></ng-content>
      </div>
      <div class="bofa-responsive-grid__detail" fxFlex fxHide.lt-sm>
        <ng-content select="[slot=detail]"></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .bofa-responsive-grid {
        width: 100%;
      }
      .bofa-responsive-grid__summary,
      .bofa-responsive-grid__detail {
        min-width: 0;
      }
    `,
  ],
})
export class BofaResponsiveGridComponent {
  @Input() dense = false;
}
