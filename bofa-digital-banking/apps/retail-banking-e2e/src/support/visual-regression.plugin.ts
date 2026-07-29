import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import * as pixelmatch from 'pixelmatch';

export interface CompareArgs {
  name: string;
  screenshotPath: string;
}

export interface CompareResult {
  name: string;
  status: 'created' | 'match' | 'diff' | 'size-mismatch';
  diffPixels: number;
  diffRatio: number;
  diffPath?: string;
}

const BASELINE_DIR = path.resolve(__dirname, '../../visual-baselines');
const DIFF_DIR = path.resolve(__dirname, '../../visual-diffs');

/**
 * Diff budget, as an absolute pixel count rather than a ratio.
 *
 * A ratio is the wrong unit here. The captures are 1280x720, so a 0.1% budget
 * buys ~920 free pixels — more than a whole row of recoloured table header
 * text. Recolouring the five statement headings from slate to brand red moves
 * ~750 pixels, which a ratio budget waves through, and colour-only regressions
 * are exactly the MDC failure mode this suite exists to catch: a selector stops
 * matching, the brand colour silently reverts, and the build stays green.
 *
 * The budget is 40 because that is what the measured noise floor supports, not
 * because it is a round number. Inside the pinned image, repeat runs are
 * byte-identical: 0 differing pixels on every snapshot across the runs recorded
 * in docs/evidence/ORACLE-noise-floor.md. ACROSS renderers it is not close —
 * an unpinned host run drifts by thousands of pixels on text-heavy snapshots,
 * which is why the image is pinned by digest and why a host run is not evidence
 * of anything. Every diff pixel count is logged below, passing or failing, so
 * the floor can be re-measured rather than asserted.
 */
const MAX_DIFF_PIXELS = 40;

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function readPng(file: string): PNG {
  return PNG.sync.read(fs.readFileSync(file));
}

export function registerVisualRegressionTasks(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): void {
  const updateBaselines = process.env['UPDATE_VISUAL_BASELINES'] === '1';

  on('task', {
    compareSnapshot(args: CompareArgs): CompareResult {
      ensureDir(BASELINE_DIR);
      ensureDir(DIFF_DIR);

      const baselinePath = path.join(BASELINE_DIR, `${args.name}.png`);
      const actualPath = args.screenshotPath;

      if (!fs.existsSync(actualPath)) {
        throw new Error(`Screenshot not found for ${args.name} at ${actualPath}`);
      }

      if (!fs.existsSync(baselinePath) || updateBaselines) {
        fs.copyFileSync(actualPath, baselinePath);
        return { name: args.name, status: 'created', diffPixels: 0, diffRatio: 0 };
      }

      const baseline = readPng(baselinePath);
      const actual = readPng(actualPath);

      if (baseline.width !== actual.width || baseline.height !== actual.height) {
        return {
          name: args.name,
          status: 'size-mismatch',
          diffPixels: -1,
          diffRatio: 1,
        };
      }

      const diff = new PNG({ width: baseline.width, height: baseline.height });
      const diffPixels = pixelmatch(
        baseline.data,
        actual.data,
        diff.data,
        baseline.width,
        baseline.height,
        // Per-pixel colour distance. Lower is stricter; 0.05 still tolerates
        // font anti-aliasing but flags a hue change on rendered text.
        { threshold: 0.05 }
      );

      const total = baseline.width * baseline.height;
      const diffRatio = diffPixels / total;

      // Logged on every comparison, not only on failure: a budget defended by
      // an unmeasured claim is how a gate ends up permanently red and ignored.
      // eslint-disable-next-line no-console
      console.log(`[visual] ${args.name}: ${diffPixels} px (budget ${MAX_DIFF_PIXELS})`);

      if (diffPixels > MAX_DIFF_PIXELS) {
        const diffPath = path.join(DIFF_DIR, `${args.name}.diff.png`);
        fs.writeFileSync(diffPath, PNG.sync.write(diff));
        return { name: args.name, status: 'diff', diffPixels, diffRatio, diffPath };
      }

      return { name: args.name, status: 'match', diffPixels, diffRatio };
    },

    visualBaselineDir(): string {
      return BASELINE_DIR;
    },
  });

  config.env = { ...config.env, MAX_DIFF_PIXELS };
}
