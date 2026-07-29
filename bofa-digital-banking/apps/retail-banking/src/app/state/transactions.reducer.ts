import { createReducer, on } from '@ngrx/store';

import { BofaTransactionRow } from '@bofa/ui-core';

import { loadTransactionsSuccess } from './transactions.actions';

export interface TransactionsState {
  rows: BofaTransactionRow[];
  loaded: boolean;
}

export const initialState: TransactionsState = { rows: [], loaded: false };

export const transactionsReducer = createReducer(
  initialState,
  on(loadTransactionsSuccess, (state, { rows }) => ({ ...state, rows, loaded: true }))
);
