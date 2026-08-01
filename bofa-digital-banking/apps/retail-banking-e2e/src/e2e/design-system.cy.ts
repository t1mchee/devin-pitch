/**
 * Design-system visual regression suite.
 *
 * This is the oracle for the Angular upgrade. Every wrapped component is
 * captured in its default and disabled states at Angular 14, and those images
 * are the definition of "the upgrade did not change what the customer sees".
 */
const COMPONENTS = [
  'button',
  'form-field',
  'select',
  'datepicker',
  'table',
  'dialog',
  'tabs',
  'chips',
  'slide-toggle',
  'autocomplete',
  'paginator',
  'currency-input',
  'responsive-grid',
];

describe('design system — visual baseline', () => {
  COMPONENTS.forEach((component) => {
    it(`${component} renders to spec`, () => {
      cy.visitShowcase(component);
      cy.matchImageSnapshot(`${component}-default`);
    });
  });

  it('form field renders its disabled and error states', () => {
    cy.visitShowcase('form-field');
    cy.get('[data-variant=disabled] [data-state=disabled]').should('exist');
    cy.get('[data-variant=error] [data-state=error]').should('exist');
  });

  it('button exposes a disabled state', () => {
    cy.visitShowcase('button');
    cy.get('[data-variant=disabled] [data-state=disabled]').should('exist');
  });

  it('responsive grid collapses below the md breakpoint', () => {
    cy.viewport(768, 1024);
    cy.visitShowcase('responsive-grid');
    cy.matchImageSnapshot('responsive-grid-md');
  });

  it('responsive grid hides the detail pane below the sm breakpoint', () => {
    cy.viewport(560, 900);
    cy.visitShowcase('responsive-grid');
    cy.get('.bofa-responsive-grid__detail').should('not.be.visible');
    cy.matchImageSnapshot('responsive-grid-sm');
  });
});

/**
 * Overlay and interaction states.
 *
 * Five of the eighteen overrides live on surfaces that are not in the DOM until
 * the customer opens or focuses something: the select panel (OV-07, OV-08), the
 * calendar (OV-13), the autocomplete panel (OV-15, the Confirmation-of-Payee
 * height cap) and the keyboard focus ring (OV-04, audited annually by
 * Accessibility). A suite that never opens an overlay cannot see any of them
 * stop matching, which is precisely what the MDC rewrite does to them.
 *
 * The dialog is opened for real rather than approximated with static markup:
 * this is the step-up authentication surface, and a hand-authored copy of
 * Material's DOM would keep matching after Material's own DOM changed.
 */
describe('design system — overlay and interaction states', () => {
  it('opens the real dialog overlay', () => {
    cy.visitShowcase('dialog');
    cy.contains('button', 'Open the real dialog').click();
    // v15/MDC: the dialog container is `.mat-mdc-dialog-container`.
    cy.get('.mat-mdc-dialog-container', { timeout: 10000 }).should('be.visible');
    cy.contains('.mat-mdc-dialog-container', 'Confirm this transfer').should('be.visible');
    cy.matchImageSnapshot('dialog-open');
  });

  it('opens the select panel', () => {
    cy.visitShowcase('select');
    // v15/MDC: `.mat-select-trigger` -> `.mat-mdc-select-trigger`, and options
    // are list items (`.mat-mdc-option` / `.mdc-list-item--selected`).
    cy.get('[data-variant=default] .mat-mdc-select-trigger').click();
    cy.get('.bofa-select-panel', { timeout: 10000 }).should('be.visible');
    cy.get('.bofa-select-panel .mat-mdc-option.mdc-list-item--selected').should('exist');
    cy.matchImageSnapshot('select-panel-open');
  });

  it('opens the autocomplete panel', () => {
    cy.visitShowcase('autocomplete');
    cy.get('[data-variant=default] input').click();
    cy.get('[data-variant=default] input').type('e');
    cy.get('.bofa-autocomplete-panel', { timeout: 10000 }).should('be.visible');
    cy.matchImageSnapshot('autocomplete-panel-open');
  });

  it('opens the datepicker calendar', () => {
    cy.visitShowcase('datepicker');
    cy.get('[data-variant=default] .mat-datepicker-toggle button').click();
    cy.get('.mat-calendar', { timeout: 10000 }).should('be.visible');
    cy.get('.mat-calendar-body-selected').should('exist');
    cy.matchImageSnapshot('datepicker-calendar-open');
  });

  it('shows the keyboard focus ring on the primary button', () => {
    cy.visitShowcase('button');
    // `cdk-keyboard-focused` is the class OV-04 hangs off, and the CDK only
    // applies it when the last input modality was the keyboard — hence the
    // keydown before the focus. Asserting on the class rather than adding it is
    // the point: if MDC stops applying it, this test fails rather than lying.
    cy.get('body').trigger('keydown', { key: 'Tab' });
    cy.get('[data-variant=default] button').focus();
    cy.get('[data-variant=default] button.cdk-keyboard-focused').should('exist');
    cy.matchImageSnapshot('button-focus-ring');
  });
});

/**
 * The customer surface itself.
 *
 * Every other baseline is captured from `/__showcase`, which is stripped from
 * the production build. If the shared library regresses only in the way the
 * dashboard composes it, no showcase snapshot moves. This one does.
 */
describe('retail banking — customer surface', () => {
  it('renders the accounts dashboard', () => {
    cy.visit('/accounts?vr=1');
    cy.contains('Make a transfer', { timeout: 15000 }).should('be.visible');
    cy.document().its('fonts.status').should('equal', 'loaded');
    cy.matchImageSnapshot('accounts-dashboard');
  });
});
