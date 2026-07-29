import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { BofaDialogComponent, BofaTransactionRow } from '@bofa/ui-core';

import { SAMPLE_ROWS } from '../state/transactions.effects';

export const SHOWCASE_COMPONENTS = [
  'button',
  'form-field',
  'select',
  'datepicker',
  'table',
  'dialog',
  'tabs',
  'chips',
  'slide-toggle',
  'autocomplete',
  'paginator',
  'currency-input',
  'responsive-grid',
] as const;

export type ShowcaseComponentName = typeof SHOWCASE_COMPONENTS[number];

/**
 * Deterministic render surface for the visual regression suite.
 *
 * Every component is rendered in its default and disabled states, plus an error
 * state where one applies. Nothing here is random or time dependent: the date
 * is fixed and the data set is a constant, because a flaky baseline is worse
 * than no baseline.
 */
@Component({
  selector: 'bofa-showcase',
  templateUrl: './showcase.component.html',
  styleUrls: ['./showcase.component.scss'],
})
export class ShowcaseComponent implements OnInit, OnDestroy {
  private readonly destroyed$ = new Subject<void>();

  component: ShowcaseComponentName = 'button';
  readonly all = SHOWCASE_COMPONENTS;
  readonly rows: BofaTransactionRow[] = SAMPLE_ROWS;

  readonly accounts = [
    { value: 'chk-4410', label: 'Advantage Plus Banking ••4410' },
    { value: 'sav-8821', label: 'Advantage Savings ••8821' },
  ];

  // One control per rendered field. Sharing a control across components put a
  // customer name in the currency field and made the snapshots nonsense.
  readonly nickname = new FormControl('Jane Q. Customer');
  readonly nicknameDisabled = new FormControl({ value: 'Household account', disabled: true });
  readonly errored = new FormControl('', Validators.required);

  readonly account = new FormControl('chk-4410');
  readonly accountDisabled = new FormControl({ value: 'sav-8821', disabled: true });

  readonly amount = new FormControl('1,250.00');
  readonly amountDisabled = new FormControl({ value: '250.00', disabled: true });

  readonly payee = new FormControl('');
  readonly payeeDisabled = new FormControl({ value: 'Duke Energy', disabled: true });

  dialogResult: string | null = null;
  readonly toggleOn = new FormControl(true);
  readonly toggleOff = new FormControl({ value: false, disabled: true });
  readonly fixedDate = new FormControl(new Date(2024, 0, 15));
  readonly fixedDateDisabled = new FormControl({ value: new Date(2024, 0, 15), disabled: true });

  constructor(private readonly route: ActivatedRoute, private readonly dialog: MatDialog) {}

  openDialog(): void {
    this.dialogResult = null;
    this.dialog
      .open(BofaDialogComponent, {
        panelClass: 'bofa-dialog',
        data: {
          title: 'Confirm this transfer',
          body: 'You are sending $1,250.00 to Duke Energy from Advantage Plus Banking ••4410.',
          confirmLabel: 'Confirm transfer',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        this.dialogResult = confirmed ? 'Transfer confirmed' : 'Transfer cancelled';
      });
  }

  ngOnInit(): void {
    this.errored.markAsTouched();

    this.route.paramMap
      .pipe(
        map((params) => (params.get('component') || 'button') as ShowcaseComponentName),
        takeUntil(this.destroyed$)
      )
      .subscribe((component) => (this.component = component));
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
