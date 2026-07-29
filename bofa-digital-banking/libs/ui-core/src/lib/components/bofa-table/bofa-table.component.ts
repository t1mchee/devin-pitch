import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

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
    <table mat-table class="bofa-table" [dataSource]="rows" [attr.data-state]="rows.length ? null : 'empty'">
      <ng-container matColumnDef="date">
        <th mat-header-cell *matHeaderCellDef>Date</th>
        <td mat-cell *matCellDef="let row">{{ row.date }}</td>
      </ng-container>
      <ng-container matColumnDef="description">
        <th mat-header-cell *matHeaderCellDef>Description</th>
        <td mat-cell *matCellDef="let row">{{ row.description }}</td>
      </ng-container>
      <ng-container matColumnDef="reference">
        <th mat-header-cell *matHeaderCellDef>Reference</th>
        <td mat-cell *matCellDef="let row">{{ row.reference }}</td>
      </ng-container>
      <ng-container matColumnDef="amount">
        <th mat-header-cell *matHeaderCellDef>Amount</th>
        <td mat-cell *matCellDef="let row">{{ row.amount | currency: 'USD' }}</td>
      </ng-container>
      <ng-container matColumnDef="balance">
        <th mat-header-cell *matHeaderCellDef>Balance</th>
        <td mat-cell *matCellDef="let row">{{ row.balance | currency: 'USD' }}</td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns"></tr>
    </table>
  `,
})
export class BofaTableComponent {
  @Input() rows: BofaTransactionRow[] = [];
  @Input() columns: string[] = ['date', 'description', 'reference', 'amount', 'balance'];
}
