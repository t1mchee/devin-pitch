import { OVERRIDE_PROBES, OverrideProbe } from '../support/override-probes';

/**
 * The override contract: what each OV-nn override is *for*, asserted against the
 * computed style of the running application.
 *
 * This is the gate the external-design-system control run said was missing
 * (docs/evidence/CONTROL-external-design-system.md §9). A pixel oracle answers
 * "does it still look the same"; this answers "is the rule still the thing
 * making it look that way". Those come apart exactly when a migration rewrites
 * a selector onto something that no longer matches and the library default
 * happens to sit close to the brand value — silent in the light theme, wrong in
 * the dark one, invisible to a screenshot.
 *
 * A migration is expected to edit the `target` selectors in override-probes.ts.
 * It is not expected to edit the `expect` values: those are the customer-visible
 * contract, and changing one is a design decision that needs the design-system
 * owner.
 */
function openOverlay(probe: OverrideProbe): void {
  switch (probe.open) {
    case 'select':
      cy.get('[data-variant=default] .mat-select-trigger').click();
      cy.get('.bofa-select-panel').should('be.visible');
      break;
    case 'datepicker':
      cy.get('[data-variant=default] .mat-datepicker-toggle button').click();
      cy.get('.mat-calendar').should('be.visible');
      break;
    case 'autocomplete':
      cy.get('[data-variant=default] input').click();
      cy.get('[data-variant=default] input').type('e');
      cy.get('.bofa-autocomplete-panel').should('be.visible');
      break;
    case 'dialog':
      cy.contains('button', 'Open the real dialog').click();
      cy.get('.mat-dialog-container').should('be.visible');
      break;
    default:
      break;
  }

  if (probe.keyboard === 'arrow-down') {
    // Moves the active option off the selected one: Material's selected-option
    // rule outranks the active tint, so the two must be measured separately.
    cy.focused().type('{downarrow}');
  }
}

function act(probe: OverrideProbe): void {
  switch (probe.act) {
    case 'focus-keyboard':
      cy.get('body').trigger('keydown', { key: 'Tab' });
      cy.get('[data-variant=default] button').focus();
      break;
    default:
      break;
  }
}

describe('design system — override contract (computed styles)', () => {
  OVERRIDE_PROBES.forEach((probe) => {
    it(`${probe.ov}: ${probe.intent}`, () => {
      cy.visitShowcase(probe.component);
      act(probe);
      openOverlay(probe);

      // A probe that matches nothing is the failure this suite exists to catch:
      // it is precisely what a migration produces when it rewrites a selector
      // onto an element that no longer exists.
      cy.get(probe.target).should('exist');

      Object.entries(probe.expect).forEach(([property, value]) => {
        cy.get(probe.target).should('have.css', property, value);
      });
    });
  });
});
