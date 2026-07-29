import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';

/** Consent toggle (paperless statements, alerts). Geometry is OV-09. */
@Component({
  selector: 'bofa-slide-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-slide-toggle
      class="bofa-slide-toggle"
      [formControl]="control"
      [attr.data-state]="control.disabled ? 'disabled' : null"
    >
      {{ label }}
    </mat-slide-toggle>
  `,
})
export class BofaSlideToggleComponent {
  @Input() label = 'Paperless statements';
  @Input() control: FormControl = new FormControl(true);
}
