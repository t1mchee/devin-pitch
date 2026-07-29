import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { BofaTransactionRow } from '@bofa/ui-core';

import { loadTransactionsSuccess } from './transactions.actions';

export const SAMPLE_ROWS: BofaTransactionRow[] = [
  { date: '2024-01-12', description: 'Duke Energy', reference: 'ACH 8821', amount: -142.18, balance: 4821.44 },
  { date: '2024-01-11', description: 'Payroll ACME Corp', reference: 'DEP 1190', amount: 3210.0, balance: 4963.62 },
  { date: '2024-01-09', description: 'Transfer to Savings', reference: 'INT 4410', amount: -500.0, balance: 1753.62 },
  { date: '2024-01-08', description: 'Verizon Wireless', reference: 'ACH 7731', amount: -88.4, balance: 2253.62 },
  { date: '2024-01-05', description: 'Card purchase — Harris Teeter', reference: 'POS 5522', amount: -76.31, balance: 2342.02 },
];

/**
 * Class-based effect with constructor-injected `Actions` and a string action
 * type in `ofType`. Both still work in 14; the functional `createEffect` with
 * `inject()` is the modern form.
 */
@Injectable()
export class TransactionsEffects {
  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType('[Transactions] Load'),
      switchMap(() => of(SAMPLE_ROWS).pipe(map((rows) => loadTransactionsSuccess({ rows }))))
    )
  );

  constructor(private readonly actions$: Actions) {}
}
