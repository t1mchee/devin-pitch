import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';

/** Scheduled payment date picker. Panel class carries OV-13. */
@Component({
  selector: 'bofa-datepicker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="bofa-form-field" appearance="fill">
      <mat-label>{{ label }}</mat-label>
      <input
        matInput
        [matDatepicker]="picker"
        [formControl]="control"
        [attr.data-state]="control.disabled ? 'disabled' : null"
      />
      <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
      <mat-datepicker #picker panelClass="bofa-datepicker-panel"></mat-datepicker>
    </mat-form-field>
  `,
})
export class BofaDatepickerComponent {
  @Input() label = 'Payment date';
  @Input() control: FormControl = new FormControl(new Date(2024, 0, 15));
}
