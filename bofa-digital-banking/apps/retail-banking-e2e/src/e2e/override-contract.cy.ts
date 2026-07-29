import { DARK_PROBES, OVERRIDE_PROBES, OverrideProbe } from '../support/override-probes';

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
      // v15/MDC: `.mat-select-trigger` -> `.mat-mdc-select-trigger`.
      cy.get('[data-variant=default] .mat-mdc-select-trigger').click();
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
      // v15/MDC: `.mat-dialog-container` -> `.mat-mdc-dialog-container`.
      cy.get('.mat-mdc-dialog-container').should('be.visible');
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

function assertProbe(probe: OverrideProbe, theme: 'light' | 'dark'): void {
  cy.visitShowcase(probe.component, theme);
  act(probe);
  openOverlay(probe);

  // A probe that matches nothing is the failure this suite exists to catch:
  // it is precisely what a migration produces when it rewrites a selector
  // onto an element that no longer exists.
  cy.get(probe.target).should('exist');

  // Colour expectations are palette-dependent; geometry is not. Asserting the
  // light constant on the dark surface is how OV-05d spent a round certifying
  // an unreadable statement row as correct.
  const expected = theme === 'dark' && probe.expectDark ? probe.expectDark : probe.expect;

  Object.entries(expected).forEach(([property, value]) => {
    cy.get(probe.target).should('have.css', property, value);
  });
}

/**
 * WCAG 2.1 contrast, computed the pedantic way. Two shortcuts in the first
 * version of this helper were found by hostile review, and both of them made an
 * illegible render *pass*:
 *
 *   1. `rgba(0, 0, 0, 0)` parsed as opaque black, so a fully transparent
 *      ancestor chain scored 21:1 — the maximum — while rendering white on white.
 *   2. Foreground alpha was dropped, so `rgba(255, 255, 255, 0.5)` scored
 *      10.05:1 where the composited truth is 3.87:1. Secondary text (hints,
 *      disabled labels, inactive tabs) is *exactly* where Material uses alpha,
 *      so this shortcut would have failed precisely on the text it was added to
 *      protect.
 *
 * So: alpha is parsed, every layer is composited over the one behind it, and an
 * ancestor chain that never becomes opaque terminates on the canvas rather than
 * on a convenient default.
 */
interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const CANVAS: Rgba = { r: 255, g: 255, b: 255, a: 1 };

function parseColour(value: string): Rgba {
  const parts = (value.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  if (parts.length < 3) {
    // `transparent`, `currentColor`, an empty string: treat as fully transparent
    // rather than as a colour, so it composites away instead of scoring well.
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
}

/** Source-over composite of `top` onto an opaque `bottom`. */
function composite(top: Rgba, bottom: Rgba): Rgba {
  return {
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  };
}

/** The opaque colour actually painted behind `element`, canvas included. */
function paintedBackground(element: HTMLElement): Rgba {
  const layers: Rgba[] = [];
  let node: HTMLElement | null = element;

  while (node) {
    const layer = parseColour(getComputedStyle(node).backgroundColor);
    if (layer.a > 0) {
      layers.push(layer);
      if (layer.a === 1) {
        break;
      }
    }
    node = node.parentElement;
  }

  return layers.reduceRight((below, above) => composite(above, below), CANVAS);
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (value: number): number => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(element: HTMLElement): { ratio: number; detail: string } {
  const background = paintedBackground(element);
  const declared = parseColour(getComputedStyle(element).color);
  const foreground = composite(declared, background);

  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  const round = ({ r, g, b }: Rgba): string =>
    `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

  return {
    ratio,
    detail: `${getComputedStyle(element).color} → ${round(foreground)} on ${round(background)}`,
  };
}

/**
 * Non-text contrast for a painted state indicator (the tab ink bar): its own
 * surface against the surface behind it, per WCAG 1.4.11.
 */
function indicatorRatio(indicator: HTMLElement): { ratio: number; detail: string } {
  const bar = paintedBackground(indicator);
  const behind = paintedBackground(indicator.parentElement as HTMLElement);
  const [lighter, darker] = [luminance(bar), luminance(behind)].sort((a, b) => b - a);
  const round = ({ r, g, b }: Rgba): string =>
    `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  return { ratio: (lighter + 0.05) / (darker + 0.05), detail: `${round(bar)} on ${round(behind)}` };
}

describe('design system — override contract (computed styles)', () => {
  OVERRIDE_PROBES.forEach((probe) => {
    it(`${probe.ov}: ${probe.intent}`, () => assertProbe(probe, 'light'));
  });
});

/**
 * The same contract on the dark surface. This is not theme support for its own
 * sake: the control run's worst regression was invisible in the light theme
 * because the library default happened to equal the brand value there, and the
 * dark palette is where that coincidence stops holding. Probes whose expected
 * value is a fixed brand colour or a geometry must hold in both themes — if one
 * of them only holds in the light theme, the rule is not doing the work.
 */
describe('design system — override contract (dark surface)', () => {
  // Control for the controls. If `?theme=dark` silently stopped applying — a
  // renamed class, a dropped mixin, a query param the app no longer reads —
  // every assertion in this block would keep passing against the light theme
  // and the whole block would be decoration. So first prove the palette moved,
  // on a surface we do NOT override: the Material table background.
  it('the dark surface is actually dark (else every probe below is vacuous)', () => {
    cy.visitShowcase('table', 'light');
    cy.get('.bofa-table').should('have.css', 'background-color', 'rgb(255, 255, 255)');
    cy.visitShowcase('table', 'dark');
    cy.get('body').should('have.class', 'bofa-theme-dark');
    cy.get('.bofa-table').should('have.css', 'background-color', 'rgb(66, 66, 66)');
  });

  DARK_PROBES.forEach((probe) => {
    it(`${probe.ov} [dark]: ${probe.intent}`, () => assertProbe(probe, 'dark'));
  });
});

/**
 * Legibility, asserted as a ratio rather than as a colour.
 *
 * Why this is a separate gate and not more probes. A colour constant records
 * what someone wrote down. It cannot notice that the value has become unreadable
 * against a foreground the *library* controls — and this suite proved that
 * against itself twice in two rounds:
 *
 *   - the dark block first asserted the *light* zebra colour, so OV-05d was
 *     green while two of five transaction rows rendered at 1.07:1;
 *   - `all-component-colors` then turned out to recolour foregrounds without
 *     touching the page, so form-field labels, inactive tab labels, the select
 *     trigger and the datepicker toggle icon rendered white on white — 1.0:1,
 *     one of them a button you cannot see to click — with every probe green.
 *
 * Neither was found by a gate. Both are now gated. A migration moves library
 * foregrounds and surfaces; "a customer can read the amount" survives that,
 * a hard-coded pair of colours does not.
 *
 * Run in BOTH themes on purpose: the light theme is where these values were
 * captured, so a light-theme failure here means the palette itself regressed.
 */
// v15/MDC: every selector below moves onto its MDC equivalent —
// `.mat-row`/`.mat-cell`/`.mat-header-cell` -> `.mat-mdc-*`,
// `.mat-form-field-label` -> `.mdc-floating-label`, `.mat-input-element` ->
// `.mat-mdc-input-element`, `.mat-hint` -> `.mat-mdc-form-field-hint`,
// `.mat-error` -> `.mat-mdc-form-field-error`, `.mat-tab-label[-active]` ->
// `.mat-mdc-tab[.mdc-tab--active]` with the text in `.mdc-tab__text-label`,
// `.mat-chip` -> `.mat-mdc-chip` with the text in
// `.mdc-evolution-chip__text-label`, and the `mat-paginator`/`mat-select`
// internals gain the `mat-mdc-` prefix. No ratio floor changed.
const CONTRAST_TARGETS = [
  { surface: 'statement table', component: 'table', label: 'even (striped) row', target: '.bofa-table .mat-mdc-row:nth-child(even) .mat-mdc-cell' },
  { surface: 'statement table', component: 'table', label: 'odd row', target: '.bofa-table .mat-mdc-row:nth-child(odd) .mat-mdc-cell' },
  { surface: 'statement table', component: 'table', label: 'header cell', target: '.bofa-table .mat-mdc-header-cell' },
  { surface: 'form field', component: 'form-field', label: 'field label', target: '[data-variant=default] .mdc-floating-label' },
  { surface: 'form field', component: 'form-field', label: 'entered value', target: '[data-variant=default] input.mat-mdc-input-element' },
  { surface: 'form field', component: 'form-field', label: 'hint', target: '[data-variant=default] .mat-mdc-form-field-hint' },
  // OV-01's whole point: a disabled field must stay readable. Material greys
  // disabled text with alpha, which is why the helper composites rather than
  // parsing three channels.
  { surface: 'form field', component: 'form-field', label: 'disabled value', target: '[data-variant=disabled] input.mat-mdc-input-element' },
  { surface: 'form field', component: 'form-field', label: 'error message', target: '[data-variant=error] .mat-mdc-form-field-error' },
  { surface: 'tabs', component: 'tabs', label: 'inactive tab label', target: '.bofa-tabs:not(.bofa-legacy-shell) .mat-mdc-tab:not(.mdc-tab--active) .mdc-tab__text-label' },
  { surface: 'tabs', component: 'tabs', label: 'active tab label', target: '.bofa-tabs:not(.bofa-legacy-shell) .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label' },
  { surface: 'select', component: 'select', label: 'trigger text', target: '[data-variant=default] .mat-mdc-select-value-text' },
  { surface: 'chips', component: 'chips', label: 'chip label', target: '[data-variant=default] .mat-mdc-chip.mat-mdc-standard-chip .mdc-evolution-chip__text-label' },
  { surface: 'paginator', component: 'paginator', label: 'range label', target: '.mat-mdc-paginator-range-label' },
  { surface: 'currency input', component: 'currency-input', label: 'amount', target: '[data-variant=default] input.mat-mdc-input-element' },
] as const;

(['light', 'dark'] as const).forEach((theme) => {
  describe(`design system — legibility (WCAG AA, ${theme} surface)`, () => {
    CONTRAST_TARGETS.forEach(({ surface, component, label, target }) => {
      it(`${surface}: ${label} clears 4.5:1`, () => {
        cy.visitShowcase(component, theme);
        cy.get(target)
          .first()
          .then(($element) => {
            const { ratio, detail } = contrastRatio($element[0]);
            cy.log(`${surface} / ${label}: ${detail} = ${ratio.toFixed(2)}:1`);
            expect(ratio, `${surface} / ${label}: ${detail}`).to.be.at.least(4.5);
          });
      });
    });

    // The datepicker toggle is an icon, not text: WCAG 1.4.11 sets 3:1 for a
    // control you have to see in order to operate it. Included because this is
    // the one that was *unclickable* on the dark surface — Material's toggle SVG
    // is `fill: currentColor`, so it inherited white onto white and vanished.
    // The ink bar is the only thing on the strip that says which section you are
    // in besides the label colour, and it is a painted surface rather than text:
    // 1.4.11, 3:1. Full-strength brand red is 2.24:1 against the dark page, which
    // is why the dark scope states a tint instead of inheriting the constant.
    it('tabs: the active-section ink bar clears 3:1 (non-text contrast)', () => {
      cy.visitShowcase('tabs', theme);
      cy.get('.bofa-tabs:not(.bofa-legacy-shell) .mdc-tab-indicator__content--underline')
        .first()
        .then(($bar) => {
          const { ratio, detail } = indicatorRatio($bar[0]);
          cy.log(`ink bar: ${detail} = ${ratio.toFixed(2)}:1`);
          expect(ratio, `ink bar: ${detail}`).to.be.at.least(3);
        });
    });

    it('datepicker: the toggle icon clears 3:1 (non-text contrast)', () => {
      cy.visitShowcase('datepicker', theme);
      cy.get('[data-variant=default] .mat-datepicker-toggle button')
        .first()
        .then(($button) => {
          const { ratio, detail } = contrastRatio($button[0]);
          cy.log(`datepicker toggle icon: ${detail} = ${ratio.toFixed(2)}:1`);
          expect(ratio, `datepicker toggle icon: ${detail}`).to.be.at.least(3);
        });
    });
  });
});

/**
 * A gate is only worth what its oracle is worth, so the oracle is tested too —
 * against the two exact inputs that made the previous version report 21:1 and
 * 10.05:1 for renders a customer could not read.
 */
describe('design system — the contrast oracle itself', () => {
  const measure = (
    styles: { fg: string; bg: string; ancestors?: string[] },
    assertion: (ratio: number) => void
  ) => {
    cy.visitShowcase('table', 'light');
    cy.document().then((doc) => {
      const outermost = doc.createElement('div');
      let host = outermost;
      (styles.ancestors ?? []).forEach((background) => {
        host.style.backgroundColor = background;
        const child = doc.createElement('div');
        host.appendChild(child);
        host = child;
      });
      host.style.backgroundColor = styles.bg;
      host.style.color = styles.fg;
      host.textContent = 'Available balance';
      doc.body.appendChild(outermost);
      assertion(contrastRatio(host).ratio);
    });
  };

  it('a fully transparent chain resolves to the canvas, not to opaque black', () => {
    // Previously 21:1. White text on a transparent stack over a white canvas is
    // invisible, and the ratio has to say so.
    measure({ fg: 'rgb(255, 255, 255)', bg: 'rgba(0, 0, 0, 0)', ancestors: ['rgba(0, 0, 0, 0)'] }, (ratio) => {
      expect(ratio).to.be.closeTo(1, 0.01);
    });
  });

  it('composites a semi-transparent foreground instead of treating it as opaque', () => {
    // Previously 10.05:1 (read as opaque white on #424242); composited truth is 3.87:1,
    // i.e. a fail, which is the entire point.
    measure({ fg: 'rgba(255, 255, 255, 0.5)', bg: 'rgb(66, 66, 66)' }, (ratio) => {
      expect(ratio).to.be.closeTo(3.87, 0.02);
    });
  });

  it('composites a semi-transparent background over the layer behind it', () => {
    measure({ fg: 'rgb(255, 255, 255)', bg: 'rgba(0, 0, 0, 0.5)', ancestors: ['rgb(0, 0, 0)'] }, (ratio) => {
      expect(ratio).to.be.closeTo(21, 0.01);
    });
  });

  it('agrees with the published figure on a known opaque pair', () => {
    // #121d29-ish brand slate on the zebra stripe: the light-theme statement row.
    measure({ fg: 'rgb(18, 22, 29)', bg: 'rgb(246, 247, 249)' }, (ratio) => {
      expect(ratio).to.be.greaterThan(15);
    });
  });
});
