import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { firstValueFrom, Observable } from 'rxjs';

import { BofaDialogComponent, BofaTransactionRow } from '@bofa/ui-core';

import { loadTransactions } from '../state/transactions.actions';
import { TransactionsState } from '../state/transactions.reducer';

@Component({
  selector: 'bofa-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  readonly accountControl = new FormControl('chk-4410');
  readonly amountControl = new FormControl('1,250.00');
  readonly payeeControl = new FormControl('');
  readonly paperlessControl = new FormControl(true);

  readonly accounts = [
    { value: 'chk-4410', label: 'Advantage Plus Banking ••4410' },
    { value: 'sav-8821', label: 'Advantage Savings ••8821' },
    { value: 'crd-1190', label: 'Customized Cash Rewards ••1190' },
  ];

  rows$!: Observable<BofaTransactionRow[]>;

  transferStatus: string | null = null;

  constructor(
    private readonly store: Store<{ transactions: TransactionsState }>,
    private readonly dialog: MatDialog
  ) {}

  /** Step-up confirmation. Every money movement goes through this dialog. */
  confirmTransfer(): void {
    const account = this.accounts.find((a) => a.value === this.accountControl.value);
    this.transferStatus = null;

    this.dialog
      .open(BofaDialogComponent, {
        panelClass: 'bofa-dialog',
        data: {
          title: 'Confirm this transfer',
          body: `You are sending $${this.amountControl.value} to ${
            this.payeeControl.value || 'a new payee'
          } from ${account?.label ?? 'your account'}.`,
          confirmLabel: 'Confirm transfer',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        this.transferStatus = confirmed
          ? `Transfer of $${this.amountControl.value} scheduled.`
          : 'Transfer cancelled.';
      });
  }

  ngOnInit(): void {
    this.rows$ = this.store.select((state) => state.transactions.rows);
    this.store.dispatch(loadTransactions());
  }

  /**
   * `toPromise()` is deprecated in RxJS 7 and removed in RxJS 8, which lands
   * with the Angular majors in this upgrade path.
   */
  async currentRowCount(): Promise<number> {
    const rows = await firstValueFrom(this.rows$);
    return rows.length;
  }
}
