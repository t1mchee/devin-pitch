import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { UiCoreModule } from '../../ui-core.module';
import { BofaTableComponent, BofaTransactionRow } from './bofa-table.component';

const ROWS: BofaTransactionRow[] = [
  { date: '2024-01-12', description: 'Duke Energy', reference: 'ACH 8821', amount: -142.18, balance: 4821.44 },
  { date: '2024-01-11', description: 'Payroll', reference: 'DEP 1190', amount: 3210.0, balance: 4963.62 },
];

describe('BofaTableComponent', () => {
  let fixture: ComponentFixture<BofaTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiCoreModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(BofaTableComponent);
    fixture.componentInstance.rows = ROWS;
    fixture.detectChanges();
  });

  it('renders one row per transaction with the documented columns', () => {
    const headers = fixture.nativeElement.querySelectorAll('th');
    const bodyRows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(Array.from(headers).map((h) => (h as HTMLElement).textContent?.trim())).toEqual([
      'Date',
      'Description',
      'Reference',
      'Amount',
      'Balance',
    ]);
    expect(bodyRows.length).toBe(2);
  });

  it('formats amounts as USD currency', () => {
    const cells: string[] = Array.from(fixture.nativeElement.querySelectorAll('tbody tr:first-child td')).map((c) =>
      ((c as HTMLElement).textContent || '').trim()
    );
    expect(cells).toContain('-$142.18');
  });
});
