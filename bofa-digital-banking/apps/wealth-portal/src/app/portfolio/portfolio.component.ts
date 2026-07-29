import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';

import { BofaTransactionRow } from '@bofa/ui-core';

@Component({
  selector: 'bofa-portfolio',
  templateUrl: './portfolio.component.html',
})
export class PortfolioComponent {
  readonly portfolioControl = new FormControl('mgd-3301');

  readonly portfolios = [
    { value: 'mgd-3301', label: 'Managed Portfolio ••3301' },
    { value: 'sdb-9920', label: 'Self-Directed ••9920' },
  ];

  readonly rows: BofaTransactionRow[] = [
    { date: '2024-01-12', description: 'Dividend — VTI', reference: 'DIV 3301', amount: 212.4, balance: 184320.11 },
    { date: '2024-01-05', description: 'Advisory fee', reference: 'FEE 3301', amount: -96.0, balance: 184107.71 },
  ];
}
