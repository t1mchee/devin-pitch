import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { UiCoreModule } from '../../ui-core.module';
import { BofaChipsComponent } from './bofa-chips.component';

/**
 * Characterisation test for the chips wrapper.
 *
 * The Material 15 MDC migration replaces `mat-chip-list` (removed) with
 * `mat-chip-set` inside this component's template. The inputs, the rendered
 * chip content and the disabled marker the visual regression suite keys on are
 * unchanged, and this pins that.
 */
describe('BofaChipsComponent', () => {
  let fixture: ComponentFixture<BofaChipsComponent>;
  let component: BofaChipsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiCoreModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(BofaChipsComponent);
    component = fixture.componentInstance;
  });

  it('renders one chip per category, carrying the bofa-chips hook', () => {
    component.chips = ['Groceries', 'Utilities', 'Transfers'];
    fixture.detectChanges();

    const set: HTMLElement = fixture.nativeElement.querySelector('.bofa-chips');
    const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('mat-chip'));

    expect(set).not.toBeNull();
    expect(chips.length).toBe(3);
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual([
      'Groceries',
      'Utilities',
      'Transfers',
    ]);
  });

  it('marks the disabled state for the visual regression suite', () => {
    component.chips = ['Groceries'];
    component.disabled = true;
    fixture.detectChanges();

    const chip: HTMLElement = fixture.nativeElement.querySelector('mat-chip');
    expect(chip.getAttribute('data-state')).toBe('disabled');
  });
});
