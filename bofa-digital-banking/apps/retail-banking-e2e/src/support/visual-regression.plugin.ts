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
 * A ratio is the wrong unit here. At 1280x900, a 0.1% budget buys ~1150 free
 * pixels — more than a whole row of recoloured table header text. Recolouring
 * the five statement headings from slate to brand red moves 785 pixels, which a
 * ratio budget waves through, and colour-only regressions are exactly the MDC
 * failure mode this suite exists to catch: a selector stops matching, the
 * brand colour silently reverts, and the build stays green.
 *
 * Baselines are captured and compared inside the same container image, so
 * repeat runs are byte-identical (measured: 0 differing pixels across runs).
 * The budget is therefore small and absolute: enough to absorb sub-pixel text
 * anti-aliasing, not enough to hide a colour change on a single word.
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
