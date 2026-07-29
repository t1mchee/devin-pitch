import * as uiCore from '../index';

/**
 * Characterisation test for the public surface of `@bofa/ui-core`.
 *
 * Three applications in this repository and several outside it compile against
 * these exports. This test does not assert that the API is good; it asserts
 * that it has not changed by accident. If a migration removes or renames an
 * export, this fails and the PR has to say why.
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
});
