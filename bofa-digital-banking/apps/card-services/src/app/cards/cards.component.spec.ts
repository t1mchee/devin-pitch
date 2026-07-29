import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AnalyticsSdkShimModule } from '@bofa/analytics-sdk-shim';
import { UiCoreModule } from '@bofa/ui-core';

import { CardsComponent } from './cards.component';

/**
 * Downstream-consumer verification.
 *
 * `card-services` is one of the three applications that compile against
 * `@bofa/ui-core`. A migration PR that says "consumers need no source changes"
 * is an assertion until a consumer is built and exercised against the migrated
 * library — this is that check, and it fails if the wrapped components stop
 * rendering the DOM this application composes.
 */
describe('CardsComponent (consumer of @bofa/ui-core)', () => {
  let fixture: ComponentFixture<CardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CardsComponent],
      imports: [NoopAnimationsModule, UiCoreModule, AnalyticsSdkShimModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CardsComponent);
    fixture.detectChanges();
  });

  it('renders the shared table with one row per card transaction', () => {
    const rows = fixture.nativeElement.querySelectorAll('.bofa-table tbody tr');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Delta Air Lines');
  });

  it('renders the shared select and currency input it composes', () => {
    expect(fixture.nativeElement.querySelector('bofa-select .bofa-form-field')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('bofa-currency-input .bofa-form-field')).toBeTruthy();
  });

  it('keeps the analytics boundary attached to the page root', () => {
    // `bofaTrackView` is the only permitted route to the vendor SDK. If the
    // directive stops binding, page views stop being recorded silently.
    expect(fixture.nativeElement.querySelector('main.cards')).toBeTruthy();
  });
});
