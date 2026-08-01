import { contrastRatio, glyphRatio, indicatorRatio } from '../support/contrast';
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
      // Every match, not `.first()`: the chip showcase renders three variants and
      // only the first was ever measured, so a second chip at 2.50:1 sat behind a
      // green assertion. A selector that matches n elements is a claim about n.
      it(`${surface}: ${label} clears 4.5:1`, () => {
        cy.visitShowcase(component, theme);
        cy.get(target).each(($element, index) => {
          const { ratio, detail } = contrastRatio($element[0]);
          cy.log(`${surface} / ${label}[${index}]: ${detail} = ${ratio.toFixed(2)}:1`);
          expect(ratio, `${surface} / ${label}[${index}]: ${detail}`).to.be.at.least(4.5);
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

    // The glyph's own `fill`, not the button's `color`. This assertion read the
    // button until a reviewer changed the SVG's fill alone: the contrast test
    // stayed green while the icon disappeared, and only the pixel oracle caught
    // it (382 px). An icon is painted by `fill`; measure what is painted.
    it('datepicker: the toggle glyph clears 3:1 (non-text contrast)', () => {
      cy.visitShowcase('datepicker', theme);
      cy.get('[data-variant=default] .mat-datepicker-toggle svg').each(($svg, index) => {
        const { ratio, detail } = glyphRatio($svg[0] as unknown as SVGElement);
        cy.log(`datepicker toggle glyph[${index}]: ${detail} = ${ratio.toFixed(2)}:1`);
        expect(ratio, `datepicker toggle glyph[${index}]: ${detail}`).to.be.at.least(3);
      });
    });
  });
});

/**
 * A gate is only worth what its oracle is worth, so the oracle is tested too —
 * against the exact inputs that made earlier versions report 21:1, 10.05:1 and
 * 13.20:1 for renders a customer could not read. Every case below is a defect
 * this helper actually shipped, found by review rather than by the suite.
 */
describe('design system — the contrast oracle itself', () => {
  const measure = (
    styles: {
      fg: string;
      bg: string;
      ancestors?: string[];
      ancestorStyle?: Partial<CSSStyleDeclaration>;
      style?: Partial<CSSStyleDeclaration>;
    },
    assertion: (measurement: { ratio: number; unmeasurable?: string }) => void
  ) => {
    cy.visitShowcase('table', 'light');
    cy.document().then((doc) => {
      const outermost = doc.createElement('div');
      let host = outermost;
      (styles.ancestors ?? []).forEach((background) => {
        host.style.backgroundColor = background;
        if (styles.ancestorStyle) {
          Object.assign(host.style, styles.ancestorStyle);
        }
        const child = doc.createElement('div');
        host.appendChild(child);
        host = child;
      });
      host.style.backgroundColor = styles.bg;
      host.style.color = styles.fg;
      if (styles.style) {
        Object.assign(host.style, styles.style);
      }
      host.textContent = 'Available balance';
      doc.body.appendChild(outermost);
      assertion(contrastRatio(host));
    });
  };

  it('a fully transparent chain resolves to the canvas, not to opaque black', () => {
    // Previously 21:1. White text on a transparent stack over a white canvas is
    // invisible, and the ratio has to say so.
    measure({ fg: 'rgb(255, 255, 255)', bg: 'rgba(0, 0, 0, 0)', ancestors: ['rgba(0, 0, 0, 0)'] }, ({ ratio }) => {
      expect(ratio).to.be.closeTo(1, 0.01);
    });
  });

  it('composites a semi-transparent foreground instead of treating it as opaque', () => {
    // Previously 10.05:1 (read as opaque white on #424242); composited truth is 3.87:1,
    // i.e. a fail, which is the entire point.
    measure({ fg: 'rgba(255, 255, 255, 0.5)', bg: 'rgb(66, 66, 66)' }, ({ ratio }) => {
      expect(ratio).to.be.closeTo(3.87, 0.02);
    });
  });

  it('composites a semi-transparent background over the layer behind it', () => {
    measure({ fg: 'rgb(255, 255, 255)', bg: 'rgba(0, 0, 0, 0.5)', ancestors: ['rgb(0, 0, 0)'] }, ({ ratio }) => {
      expect(ratio).to.be.closeTo(21, 0.01);
    });
  });

  it('agrees with the published figure on a known opaque pair', () => {
    // #121d29-ish brand slate on the zebra stripe: the light-theme statement row.
    measure({ fg: 'rgb(18, 22, 29)', bg: 'rgb(246, 247, 249)' }, ({ ratio }) => {
      expect(ratio).to.be.greaterThan(15);
    });
  });

  it('folds an ancestor `opacity` into the layer instead of ignoring it', () => {
    // Previously 13.20:1 on a slide-toggle label whose composited truth was
    // 3.28:1 — a 4x overstatement, and `opacity` is how Material dims things
    // that are not disabled as well as things that are.
    measure(
      {
        fg: 'rgb(255, 255, 255)',
        bg: 'rgba(0, 0, 0, 0)',
        ancestors: ['rgb(66, 66, 66)'],
        ancestorStyle: { opacity: '0.38' },
      },
      ({ ratio }) => {
        // White at 38% over #424242-at-38%-over-white composites to rgb(210) on
        // rgb(183): 1.33:1. The previous version answered 13.20:1 by ignoring
        // `opacity` entirely, then 2.00:1 by folding it into the background but
        // not the glyphs. Both were fails, but a gate that misreports by 10x
        // cannot be used to argue a threshold.
        expect(ratio).to.be.closeTo(1.33, 0.02);
      }
    );
  });

  it('refuses to score text over a gradient rather than reporting the canvas', () => {
    // Previously 21:1 over arbitrary artwork, which is the worst possible answer:
    // maximum confidence, no information. Reporting 0 fails the gate and says why.
    measure(
      {
        fg: 'rgb(255, 255, 255)',
        bg: 'rgba(0, 0, 0, 0)',
        style: { backgroundImage: 'linear-gradient(#fff, #000)' },
      },
      ({ ratio, unmeasurable }) => {
        expect(unmeasurable, 'the helper must say it cannot measure this').to.be.a('string');
        expect(ratio).to.equal(0);
      }
    );
  });
});
