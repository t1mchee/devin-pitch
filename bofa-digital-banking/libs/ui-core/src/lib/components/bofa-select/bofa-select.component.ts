import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';

export interface BofaSelectOption {
  value: string;
  label: string;
}

/** Account selector. The overlay panel class carries OV-07 and OV-08. */
@Component({
  selector: 'bofa-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="bofa-form-field" appearance="fill">
      <mat-label>{{ label }}</mat-label>
      <mat-select
        class="bofa-select"
        panelClass="bofa-select-panel"
        [formControl]="control"
        [attr.data-state]="control.disabled ? 'disabled' : null"
      >
        <mat-option *ngFor="let option of options" [value]="option.value">{{ option.label }}</mat-option>
      </mat-select>
    </mat-form-field>
  `,
})
export class BofaSelectComponent {
  @Input() label = 'Account';
  @Input() options: BofaSelectOption[] = [];
  @Input() control: FormControl = new FormControl('');
}
