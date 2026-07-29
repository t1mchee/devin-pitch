import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Transaction category chips. Height and radius are OV-11. */
@Component({
  selector: 'bofa-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-chip-list class="bofa-chips" aria-label="Transaction categories">
      <mat-chip *ngFor="let chip of chips" [disabled]="disabled" [attr.data-state]="disabled ? 'disabled' : null">
        {{ chip }}
      </mat-chip>
    </mat-chip-list>
  `,
})
export class BofaChipsComponent {
  @Input() chips: string[] = ['Groceries', 'Utilities', 'Transfers'];
  @Input() disabled = false;
}
