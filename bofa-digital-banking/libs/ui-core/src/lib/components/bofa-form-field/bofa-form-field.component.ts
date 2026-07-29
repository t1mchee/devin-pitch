import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';

/** Wrapped Material form field. Carries the BoA error and density conventions. */
@Component({
  selector: 'bofa-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field
      class="bofa-form-field"
      [ngClass]="{ 'bofa-density-compact': compact }"
      appearance="fill"
      [attr.data-state]="control.disabled ? 'disabled' : control.invalid && control.touched ? 'error' : null"
    >
      <mat-label>{{ label }}</mat-label>
      <input matInput [formControl]="control" [placeholder]="placeholder" [attr.aria-label]="label" />
      <mat-hint *ngIf="hint">{{ hint }}</mat-hint>
      <mat-error *ngIf="control.invalid">{{ errorText }}</mat-error>
    </mat-form-field>
  `,
})
export class BofaFormFieldComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() hint?: string;
  @Input() errorText = 'Check this value and try again';
  @Input() compact = false;
  @Input() control: FormControl = new FormControl('');
}
