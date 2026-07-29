import { defineConfig } from 'cypress';
import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';

import { registerVisualRegressionTasks } from './src/support/visual-regression.plugin';

/**
 * Visual regression is the oracle for the design-system migration. Determinism
 * matters more than realism here:
 *  - fixed viewport, fixed device pixel ratio
 *  - animations disabled at the app level via the `?vr=1` query flag
 *  - baselines captured and compared in the same container image
 */
export default defineConfig({
  e2e: {
    ...nxE2EPreset(__dirname),
    viewportWidth: 1280,
    viewportHeight: 900,
    video: false,
    screenshotOnRunFailure: false,
    defaultCommandTimeout: 10_000,
    setupNodeEvents(on, config) {
      registerVisualRegressionTasks(on, config);
      return config;
    },
  },
});
