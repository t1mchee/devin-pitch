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
 * The directives above have been replaced by the CSS in `styles` below. The
 * flex-layout defaults they encoded are preserved exactly:
 *  - fxLayout="row" / fxLayout.lt-md="column"  -> flex-direction, flipped below md
 *  - fxLayoutGap="16px"                         -> gap: 16px (row and column axes)
 *  - fxLayoutAlign="space-between stretch"      -> justify-content + align-items
 *  - fxFlex="30" / .lt-lg="40" / .lt-md="100"   -> summary flex-basis per breakpoint
 *  - fxFlex (detail)                            -> detail grows to fill the remainder
 *  - fxHide.lt-sm (detail)                      -> detail display:none below sm
 * flex-layout's default breakpoints are used verbatim: lt-sm = max-width 599.98px,
 * lt-md = max-width 959.98px, lt-lg = max-width 1279.98px.
 */
@Component({
  selector: 'bofa-responsive-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bofa-responsive-grid" [attr.data-state]="dense ? 'dense' : null">
      <div class="bofa-responsive-grid__summary">
        <ng-content select="[slot=summary]"></ng-content>
      </div>
      <div class="bofa-responsive-grid__detail">
        <ng-content select="[slot=detail]"></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .bofa-responsive-grid {
        display: flex;
        flex-direction: row;
        gap: 16px;
        justify-content: space-between;
        align-items: stretch;
        width: 100%;
      }
      .bofa-responsive-grid__summary,
      .bofa-responsive-grid__detail {
        box-sizing: border-box;
        min-width: 0;
      }
      /* >= lg: summary 30%, detail fills the remainder. */
      .bofa-responsive-grid__summary {
        flex: 0 0 30%;
      }
      .bofa-responsive-grid__detail {
        flex: 1 1 0;
      }
      /* md (fxFlex.lt-lg="40"): summary 40%. */
      @media (max-width: 1279.98px) {
        .bofa-responsive-grid__summary {
          flex-basis: 40%;
        }
      }
      /* < md (fxLayout.lt-md="column", fxFlex.lt-md="100"): stacked, summary first. */
      @media (max-width: 959.98px) {
        .bofa-responsive-grid {
          flex-direction: column;
        }
        .bofa-responsive-grid__summary,
        .bofa-responsive-grid__detail {
          flex: 0 0 auto;
        }
      }
      /* < sm (fxHide.lt-sm): the detail table is not usable below 600px. */
      @media (max-width: 599.98px) {
        .bofa-responsive-grid__detail {
          display: none;
        }
      }
    `,
  ],
})
export class BofaResponsiveGridComponent {
  @Input() dense = false;
}
