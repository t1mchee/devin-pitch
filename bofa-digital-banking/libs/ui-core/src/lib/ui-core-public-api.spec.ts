import { reflectComponentType, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import * as uiCore from '../index';
import { UiCoreModule } from './ui-core.module';
import {
  BofaAutocompleteComponent,
  BofaButtonComponent,
  BofaChipsComponent,
  BofaCurrencyInputComponent,
  BofaDatepickerComponent,
  BofaDialogComponent,
  BofaFormFieldComponent,
  BofaPaginatorComponent,
  BofaResponsiveGridComponent,
  BofaSelectComponent,
  BofaSlideToggleComponent,
  BofaTableComponent,
  BofaTabsComponent,
} from '../index';

/**
 * Characterisation of the public surface of `@bofa/ui-core`.
 *
 * Three applications in this repository and several outside it compile against
 * this library. The test does not assert the API is good; it asserts it has not
 * changed by accident, and it covers the three things a consumer actually
 * couples to:
 *
 *  1. the exported symbols;
 *  2. each component's selector, `@Input` names and `@Output` names — a renamed
 *     input compiles fine in the library and breaks every consumer template;
 *  3. the `bofa-` classes and slots in the rendered DOM, which are what
 *     consumer stylesheets and Cypress selectors hang off.
 *
 * (3) is the one an `Object.keys` check cannot see. Material's MDC rewrite
 * changes Material's own class names by design — this pins the layer we own on
 * top of it, so "the characterisation test still passes" means something.
 */
describe('@bofa/ui-core public API', () => {
  const EXPECTED_EXPORTS = [
    'UiCoreModule',
    'BOFA_ICONS',
    'BofaAutocompleteComponent',
    'BofaButtonComponent',
    'BofaChipsComponent',
    'BofaCurrencyInputComponent',
    'BofaDatepickerComponent',
    'BofaDialogComponent',
    'BofaFormFieldComponent',
    'BofaPaginatorComponent',
    'BofaSelectComponent',
    'BofaSlideToggleComponent',
    'BofaTableComponent',
    'BofaTabsComponent',
    'BofaResponsiveGridComponent',
  ];

  it('exports exactly the documented surface', () => {
    expect(Object.keys(uiCore).sort()).toEqual([...EXPECTED_EXPORTS].sort());
  });

  describe('template contract', () => {
    interface ComponentContract {
      component: Type<unknown>;
      selector: string;
      inputs: string[];
      outputs: string[];
    }

    const CONTRACTS: ComponentContract[] = [
      {
        component: BofaAutocompleteComponent,
        selector: 'bofa-autocomplete',
        inputs: ['label', 'payees', 'control'],
        outputs: [],
      },
      {
        component: BofaButtonComponent,
        selector: 'bofa-button',
        inputs: ['variant', 'disabled', 'icon'],
        outputs: ['pressed'],
      },
      {
        component: BofaChipsComponent,
        selector: 'bofa-chips',
        inputs: ['chips', 'disabled'],
        outputs: [],
      },
      {
        component: BofaCurrencyInputComponent,
        selector: 'bofa-currency-input',
        inputs: ['label', 'symbol', 'control'],
        outputs: [],
      },
      {
        component: BofaDatepickerComponent,
        selector: 'bofa-datepicker',
        inputs: ['label', 'control'],
        outputs: [],
      },
      {
        component: BofaFormFieldComponent,
        selector: 'bofa-form-field',
        inputs: ['label', 'placeholder', 'hint', 'errorText', 'compact', 'control'],
        outputs: [],
      },
      {
        component: BofaPaginatorComponent,
        selector: 'bofa-paginator',
        inputs: ['length', 'pageSize', 'pageSizeOptions', 'disabled'],
        outputs: [],
      },
      {
        component: BofaSelectComponent,
        selector: 'bofa-select',
        inputs: ['label', 'options', 'control'],
        outputs: [],
      },
      {
        component: BofaSlideToggleComponent,
        selector: 'bofa-slide-toggle',
        inputs: ['label', 'control'],
        outputs: [],
      },
      {
        component: BofaTableComponent,
        selector: 'bofa-table',
        inputs: ['rows', 'columns'],
        outputs: [],
      },
      {
        component: BofaTabsComponent,
        selector: 'bofa-tabs',
        inputs: ['tabs', 'legacyShell'],
        outputs: [],
      },
      {
        component: BofaResponsiveGridComponent,
        selector: 'bofa-responsive-grid',
        inputs: ['dense'],
        outputs: [],
      },
    ];

    CONTRACTS.forEach((contract) => {
      it(`${contract.selector} keeps its selector, inputs and outputs`, () => {
        const mirror = reflectComponentType(contract.component);
        expect(mirror).not.toBeNull();
        expect(mirror?.selector).toBe(contract.selector);
        expect(mirror?.inputs.map((input) => input.templateName).sort()).toEqual(
          [...contract.inputs].sort()
        );
        expect(mirror?.outputs.map((output) => output.templateName).sort()).toEqual(
          [...contract.outputs].sort()
        );
      });
    });

    it('bofa-dialog is injected with data rather than bound, and is not part of the template API', () => {
      const mirror = reflectComponentType(BofaDialogComponent);
      expect(mirror?.inputs).toEqual([]);
    });
  });

  describe('rendered DOM contract', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [UiCoreModule, NoopAnimationsModule],
      }).compileComponents();
    });

    /**
     * The `bofa-` layer, not Material's. Material's class names change with
     * MDC; these are the hooks consumers were told were stable.
     */
    const DOM_HOOKS: Array<{ component: Type<unknown>; hooks: string[] }> = [
      { component: BofaButtonComponent, hooks: ['.bofa-button'] },
      { component: BofaFormFieldComponent, hooks: ['.bofa-form-field'] },
      { component: BofaSelectComponent, hooks: ['.bofa-form-field', '.bofa-select'] },
      { component: BofaTableComponent, hooks: ['.bofa-table'] },
      { component: BofaTabsComponent, hooks: ['.bofa-tabs'] },
      { component: BofaChipsComponent, hooks: ['.bofa-chips'] },
      { component: BofaSlideToggleComponent, hooks: ['.bofa-slide-toggle'] },
      { component: BofaPaginatorComponent, hooks: ['.bofa-paginator'] },
      {
        component: BofaResponsiveGridComponent,
        hooks: ['.bofa-responsive-grid__summary', '.bofa-responsive-grid__detail'],
      },
    ];

    DOM_HOOKS.forEach(({ component, hooks }) => {
      it(`${reflectComponentType(component)?.selector} still renders ${hooks.join(', ')}`, () => {
        const fixture = TestBed.createComponent(component);
        fixture.detectChanges();
        hooks.forEach((hook) => {
          expect(fixture.nativeElement.querySelector(hook)).toBeTruthy();
        });
      });
    });

    it('form field still exposes the compact density variant consumers rely on', () => {
      const fixture = TestBed.createComponent(BofaFormFieldComponent);
      fixture.componentInstance.compact = true;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.bofa-density-compact')).toBeTruthy();
    });
  });
});
