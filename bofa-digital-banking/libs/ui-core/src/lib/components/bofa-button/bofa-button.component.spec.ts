import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { UiCoreModule } from '../../ui-core.module';
import { BofaButtonComponent } from './bofa-button.component';

describe('BofaButtonComponent', () => {
  let fixture: ComponentFixture<BofaButtonComponent>;
  let component: BofaButtonComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiCoreModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(BofaButtonComponent);
    component = fixture.componentInstance;
  });

  it('defaults to the primary variant', () => {
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(component.variant).toBe('primary');
    expect(button.getAttribute('data-variant')).toBe('primary');
    expect(button.classList.contains('bofa-button')).toBe(true);
  });

  it('marks the disabled state for the visual regression suite', () => {
    component.disabled = true;
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('data-state')).toBe('disabled');
    expect(button.disabled).toBe(true);
  });

  it('renders a stroked button for the secondary variant', () => {
    component.variant = 'secondary';
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('bofa-button--secondary')).toBe(true);
  });
});
