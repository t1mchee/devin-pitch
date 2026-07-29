import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { of } from 'rxjs';

import { AnalyticsSdkShimModule } from '@bofa/analytics-sdk-shim';
import { UiCoreModule } from '@bofa/ui-core';

import { DashboardComponent } from './dashboard.component';
import { transactionsReducer } from '../state/transactions.reducer';
import { TransactionsEffects } from '../state/transactions.effects';

/**
 * The consumer side of the design-system contract.
 *
 * The visual suite proves the library still looks right. These tests prove the
 * application still behaves right when the library's DOM changes underneath it:
 * the transfer dialog is the step-up authentication surface, and "confirmed"
 * and "cancelled" must stay distinguishable through an MDC rewrite that moves
 * every class name in the dialog.
 */
describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let dialog: MatDialog;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      imports: [
        NoopAnimationsModule,
        UiCoreModule,
        AnalyticsSdkShimModule,
        StoreModule.forRoot({ transactions: transactionsReducer }),
        EffectsModule.forRoot([TransactionsEffects]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    dialog = TestBed.inject(MatDialog);
    fixture.detectChanges();
  });

  it('loads transactions into the shared table', async () => {
    await expect(component.currentRowCount()).resolves.toBeGreaterThan(0);
    const rendered = fixture.nativeElement.querySelectorAll('.bofa-table tbody tr');
    expect(rendered.length).toBeGreaterThan(0);
  });

  it('routes every money movement through the confirmation dialog', () => {
    const open = jest
      .spyOn(dialog, 'open')
      .mockReturnValue({ afterClosed: () => of(true) } as MatDialogRef<unknown>);

    component.confirmTransfer();

    expect(open).toHaveBeenCalledTimes(1);
    const data = open.mock.calls[0][1]?.data as { title: string; body: string };
    expect(data.title).toContain('Confirm');
    // The amount and the source account must be in the body the customer reads
    // before authorising — this is the text the step-up flow attests to.
    expect(data.body).toContain('1,250.00');
    expect(data.body).toContain('Advantage Plus Banking');
  });

  it('distinguishes a confirmed transfer from a cancelled one', () => {
    jest
      .spyOn(dialog, 'open')
      .mockReturnValue({ afterClosed: () => of(true) } as MatDialogRef<unknown>);
    component.confirmTransfer();
    expect(component.transferStatus).toBe('Transfer of $1,250.00 scheduled.');

    jest
      .spyOn(dialog, 'open')
      .mockReturnValue({ afterClosed: () => of(false) } as MatDialogRef<unknown>);
    component.confirmTransfer();
    expect(component.transferStatus).toBe('Transfer cancelled.');
  });
});
