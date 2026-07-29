/// <reference types="cypress" />

import type { CompareResult } from './visual-regression.plugin';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Capture the viewport and compare it against the committed baseline.
       *
       * Baselines live in `apps/retail-banking-e2e/visual-baselines` and are the
       * contract for the design system. They are regenerated only by running
       * with `UPDATE_VISUAL_BASELINES=1`, which is a deliberate, reviewable act.
       */
      matchImageSnapshot(name: string): Chainable<CompareResult>;

      /** Visit a showcase route with animations and carets suppressed. */
      visitShowcase(component: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('visitShowcase', (component: string) => {
  cy.visit(`/__showcase/${component}`);
  cy.get('.showcase', { timeout: 15000 }).should('be.visible');
  // Let fonts settle before capture; a half-loaded webfont is the classic
  // source of false positives in visual regression.
  cy.document().its('fonts.status').should('equal', 'loaded');
});

Cypress.Commands.add('matchImageSnapshot', (name: string) => {
  const screenshotName = `vr__${name}`;

  cy.screenshot(screenshotName, {
    overwrite: true,
    capture: 'viewport',
    disableTimersAndAnimations: true,
  });

  return cy.then(() => {
    const screenshotPath = `${Cypress.config('screenshotsFolder')}/${Cypress.spec.name}/${screenshotName}.png`;
    return cy.task<CompareResult>('compareSnapshot', { name, screenshotPath }).then((result) => {
      if (result.status === 'size-mismatch') {
        throw new Error(`Visual baseline size mismatch for ${name}`);
      }
      if (result.status === 'diff') {
        throw new Error(
          `Visual regression on ${name}: ${result.diffPixels} pixels differ ` +
            `(${(result.diffRatio * 100).toFixed(3)}%). Diff written to ${result.diffPath}. ` +
            `Explain the change in the PR or fix it. Do not re-baseline to make this pass.`
        );
      }
      return result;
    });
  });
});

export {};
