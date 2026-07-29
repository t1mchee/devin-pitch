import { AfterViewInit, ChangeDetectionStrategy, Component, Input, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

export interface BofaTransactionRow {
  date: string;
  description: string;
  reference: string;
  amount: number;
  balance: number;
}

/** Statement table. Numeric columns rely on OV-05 for tabular alignment. */
@Component({
  selector: 'bofa-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table
      mat-table
      matSort
      class="bofa-table"
      [dataSource]="dataSource"
      [attr.data-state]="rows.length ? null : 'empty'"
    >
      <ng-container matColumnDef="date">
        <th mat-header-cell mat-sort-header *matHeaderCellDef>Date</th>
        <td mat-cell *matCellDef="let row">{{ row.date }}</td>
      </ng-container>
      <ng-container matColumnDef="description">
        <th mat-header-cell mat-sort-header *matHeaderCellDef>Description</th>
        <td mat-cell *matCellDef="let row">{{ row.description }}</td>
      </ng-container>
      <ng-container matColumnDef="reference">
        <th mat-header-cell *matHeaderCellDef>Reference</th>
        <td mat-cell *matCellDef="let row">{{ row.reference }}</td>
      </ng-container>
      <ng-container matColumnDef="amount">
        <th mat-header-cell mat-sort-header *matHeaderCellDef class="bofa-cell--numeric">Amount</th>
        <td mat-cell *matCellDef="let row" class="bofa-cell--numeric">
          {{ row.amount | currency: 'USD' }}
        </td>
      </ng-container>
      <ng-container matColumnDef="balance">
        <th mat-header-cell *matHeaderCellDef class="bofa-cell--numeric">Balance</th>
        <td mat-cell *matCellDef="let row" class="bofa-cell--numeric">
          {{ row.balance | currency: 'USD' }}
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns"></tr>
    </table>
  `,
})
export class BofaTableComponent implements AfterViewInit {
  @Input()
  set rows(value: BofaTransactionRow[]) {
    this.currentRows = value ?? [];
    this.dataSource.data = this.currentRows;
  }
  get rows(): BofaTransactionRow[] {
    return this.currentRows;
  }

  @Input() columns: string[] = ['date', 'description', 'reference', 'amount', 'balance'];

  @ViewChild(MatSort) private sort?: MatSort;

  readonly dataSource = new MatTableDataSource<BofaTransactionRow>([]);

  private currentRows: BofaTransactionRow[] = [];

  ngAfterViewInit(): void {
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }
}
