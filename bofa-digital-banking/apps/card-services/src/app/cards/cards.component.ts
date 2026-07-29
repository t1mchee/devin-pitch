import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';

import { BofaTransactionRow } from '@bofa/ui-core';

@Component({
  selector: 'bofa-cards',
  templateUrl: './cards.component.html',
})
export class CardsComponent {
  readonly cardControl = new FormControl('crd-1190');
  readonly limitControl = new FormControl('2,500.00');

  readonly cards = [
    { value: 'crd-1190', label: 'Customized Cash Rewards ••1190' },
    { value: 'crd-7742', label: 'Travel Rewards ••7742' },
  ];

  readonly rows: BofaTransactionRow[] = [
    { date: '2024-01-12', description: 'Delta Air Lines', reference: 'POS 9931', amount: -412.6, balance: 1180.2 },
    { date: '2024-01-10', description: 'Statement credit', reference: 'ADJ 2210', amount: 45.0, balance: 1592.8 },
  ];
}
