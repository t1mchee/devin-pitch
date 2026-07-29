import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';

/**
 * Amount entry. Right alignment and tabular numerals are OV-16 and are a
 * readability requirement from Accessibility, not a preference.
 */
@Component({
  selector: 'bofa-currency-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="bofa-form-field bofa-currency-input" appearance="fill">
      <mat-label>{{ label }}</mat-label>
      <span matPrefix>{{ symbol }}</span>
      <input
        matInput
        inputmode="decimal"
        [formControl]="control"
        [attr.data-state]="control.disabled ? 'disabled' : null"
      />
    </mat-form-field>
  `,
})
export class BofaCurrencyInputComponent {
  @Input() label = 'Amount';
  @Input() symbol = '$';
  @Input() control: FormControl = new FormControl('1,250.00');
}
