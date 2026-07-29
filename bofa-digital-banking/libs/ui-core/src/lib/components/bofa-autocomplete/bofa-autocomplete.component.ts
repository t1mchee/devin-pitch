import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';

/** Payee search. Panel height cap is OV-15 (Confirmation of Payee copy). */
@Component({
  selector: 'bofa-autocomplete',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="bofa-form-field" appearance="fill">
      <mat-label>{{ label }}</mat-label>
      <input
        matInput
        [formControl]="control"
        [matAutocomplete]="auto"
        [attr.data-state]="control.disabled ? 'disabled' : null"
      />
      <mat-autocomplete #auto="matAutocomplete" class="bofa-autocomplete-panel" panelWidth="auto">
        <mat-option *ngFor="let payee of payees" [value]="payee">{{ payee }}</mat-option>
      </mat-autocomplete>
    </mat-form-field>
  `,
})
export class BofaAutocompleteComponent {
  @Input() label = 'Payee';
  @Input() payees: string[] = ['Duke Energy', 'Verizon Wireless', 'City of Charlotte'];
  @Input() control: FormControl = new FormControl('');
}
