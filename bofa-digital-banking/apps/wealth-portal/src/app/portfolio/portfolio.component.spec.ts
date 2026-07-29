import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { UiCoreModule } from '@bofa/ui-core';

import { PortfolioComponent } from './portfolio.component';

/**
 * Downstream-consumer verification for the second consuming application.
 *
 * `wealth-portal` couples to something the public API test cannot see: the
 * content-projection slots of `bofa-responsive-grid`. Renaming a slot compiles
 * cleanly and silently empties the page, which is the failure mode a consumer
 * discovers in production rather than in a build.
 */
describe('PortfolioComponent (consumer of @bofa/ui-core)', () => {
  let fixture: ComponentFixture<PortfolioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PortfolioComponent],
      imports: [NoopAnimationsModule, UiCoreModule],
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioComponent);
    fixture.detectChanges();
  });

  it('projects both slots of the shared responsive grid', () => {
    const summary = fixture.nativeElement.querySelector('.bofa-responsive-grid__summary');
    const detail = fixture.nativeElement.querySelector('.bofa-responsive-grid__detail');

    expect(summary).toBeTruthy();
    expect(detail).toBeTruthy();
    expect(summary.querySelector('bofa-select')).toBeTruthy();
    expect(detail.querySelector('bofa-table')).toBeTruthy();
  });

  it('renders portfolio holdings through the shared table', () => {
    const rows = fixture.nativeElement.querySelectorAll('.bofa-table tbody tr');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Dividend');
  });
});
