import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Statement paginator. Range label spacing is OV-14. */
@Component({
  selector: 'bofa-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-paginator
      class="bofa-paginator"
      [length]="length"
      [pageSize]="pageSize"
      [pageSizeOptions]="pageSizeOptions"
      [attr.data-state]="disabled ? 'disabled' : null"
      [disabled]="disabled"
    ></mat-paginator>
  `,
})
export class BofaPaginatorComponent {
  @Input() length = 240;
  @Input() pageSize = 25;
  @Input() pageSizeOptions: number[] = [10, 25, 50];
  @Input() disabled = false;
}
