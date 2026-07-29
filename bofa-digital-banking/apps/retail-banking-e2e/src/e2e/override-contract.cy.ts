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

/** WCAG 2.1 relative luminance / contrast ratio, from computed `rgb()` strings. */
function contrastRatio(foreground: string, background: string): number {
  const luminance = (colour: string): number => {
    const [r, g, b] = (colour.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
    const channel = (value: number): number => {
      const s = value / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
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

  // Why a ratio and not another constant. A colour constant asserts what someone
  // wrote down; it cannot notice that the value has become unreadable against a
  // foreground the *library* controls. That is not hypothetical: this suite
  // shipped one round asserting the light zebra stripe on the dark surface, so
  // OV-05d was green while two of five transaction rows rendered at 1.07:1.
  // A migration moves library foregrounds. The requirement — a customer can read
  // the amount — survives that; a hard-coded pair of colours does not.
  ([
    ['even (striped) statement row', '.bofa-table .mat-row:nth-child(even) .mat-cell'],
    ['odd statement row', '.bofa-table .mat-row:nth-child(odd) .mat-cell'],
    ['header cell', '.bofa-table .mat-header-cell'],
  ] as const).forEach(([label, selector]) => {
    it(`statement text on the dark surface clears WCAG AA — ${label}`, () => {
      cy.visitShowcase('table', 'dark');
      cy.get(selector)
        .first()
        .then(($cell) => {
          const colour = getComputedStyle($cell[0]).color;
          // Cells are transparent; the paint comes from the row, so walk up to
          // the first ancestor that actually declares a background.
          let node: HTMLElement | null = $cell[0];
          let background = 'rgba(0, 0, 0, 0)';
          while (node && (background === 'rgba(0, 0, 0, 0)' || background === 'transparent')) {
            background = getComputedStyle(node).backgroundColor;
            node = node.parentElement;
          }
          const ratio = contrastRatio(colour, background);
          cy.log(`${label}: ${colour} on ${background} = ${ratio.toFixed(2)}:1`);
          expect(ratio, `${label}: ${colour} on ${background}`).to.be.at.least(4.5);
        });
    });
  });
});
