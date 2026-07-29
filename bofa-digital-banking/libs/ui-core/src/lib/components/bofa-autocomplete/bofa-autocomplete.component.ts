import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

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
        <mat-option *ngFor="let payee of filtered$ | async" [value]="payee">{{ payee }}</mat-option>
      </mat-autocomplete>
    </mat-form-field>
  `,
})
export class BofaAutocompleteComponent implements OnInit {
  @Input() label = 'Payee';
  @Input() payees: string[] = ['Duke Energy', 'Verizon Wireless', 'City of Charlotte'];
  @Input() control: FormControl = new FormControl('');

  filtered$!: Observable<string[]>;

  ngOnInit(): void {
    this.filtered$ = this.control.valueChanges.pipe(
      startWith(this.control.value ?? ''),
      map((value: string) => this.filter(value))
    );
  }

  private filter(value: string): string[] {
    const term = (value || '').trim().toLowerCase();
    if (!term) {
      return this.payees;
    }
    return this.payees.filter((payee) => payee.toLowerCase().includes(term));
  }
}
