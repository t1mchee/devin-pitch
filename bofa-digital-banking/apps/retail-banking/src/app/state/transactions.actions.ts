import { createAction, props } from '@ngrx/store';

import { BofaTransactionRow } from '@bofa/ui-core';

export const loadTransactions = createAction('[Transactions] Load');

export const loadTransactionsSuccess = createAction(
  '[Transactions] Load Success',
  props<{ rows: BofaTransactionRow[] }>()
);
