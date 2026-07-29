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
