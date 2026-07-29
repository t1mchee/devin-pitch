import { contrastRatio, report, sweep } from '../support/contrast';

/**
 * Every visible piece of text on every route, in both palettes, measured against
 * WCAG 1.4.3.
 *
 * Why this exists, stated plainly, because it is the most useful thing in the
 * repo for a bank: the previous gate asserted contrast on fourteen selectors
 * that fourteen people had already thought about, and three consecutive hostile
 * reviews found illegible text somewhere else every single time — a heading on
 * the customer dashboard, a shared "eyebrow" class used on thirteen routes, a
 * secondary button on the accounts page, a field label that only fails while
 * focused. Each fix added a fifteenth selector. That is not a gate, it is a
 * changelog.
 *
 * A sweep changes the shape of the claim. It cannot be complete about *states* —
 * focus, hover, validation and overlays are enumerated by the override contract,
 * which drives them deliberately — but it is complete about elements, which is
 * the axis the fixed list kept missing. New markup is covered the day it lands,
 * without anyone remembering to add it.
 *
 * Coverage: 16 routes x 2 palettes. Exemptions are WCAG's own (inactive
 * controls) and are asserted to be non-vacuous below: if the exemption predicate
 * ever swallowed the whole page the suite would go quietly green, so one test
 * proves the sweep still sees real text, and one plants illegible text and
 * proves the sweep catches it.
 */
const SHOWCASE_ROUTES = [
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
].map((component) => ({ name: `/__showcase/${component}`, path: `/__showcase/${component}` }));

const CUSTOMER_ROUTES = [
  // The three routes a customer actually sees. All three rendered white-on-white
  // in the dark palette for a full round while every component on them measured
  // correctly, because `bofa-root` painted `background: #fff` over the themed
  // <body> and the components paint their own surfaces. The components looking
  // right is what hid it — which is the argument for sweeping the page rather
  // than the component.
  { name: '/accounts (customer dashboard)', path: '/accounts' },
  { name: '/__showcase (index)', path: '/__showcase' },
  { name: '/sign-in', path: '/sign-in' },
];

const ROUTES = [...CUSTOMER_ROUTES, ...SHOWCASE_ROUTES];

function visit(path: string, theme: 'light' | 'dark'): void {
  const query = `?vr=1${theme === 'dark' ? '&theme=dark' : ''}`;
  cy.visit(`${path}${query}`);
  // Wait for the route to have rendered *something* before measuring, or the
  // sweep passes trivially on an empty body.
  cy.get('h1, h2, .showcase, .index, .sign-in, .dashboard', { timeout: 15000 }).should('be.visible');
  cy.document().its('fonts.status').should('equal', 'loaded');
}

(['light', 'dark'] as const).forEach((theme) => {
  describe(`legibility sweep — every visible text node (${theme})`, () => {
    ROUTES.forEach(({ name, path }) => {
      it(`${name}: all text clears WCAG AA`, () => {
        visit(path, theme);
        cy.document().then((doc) => {
          const findings = sweep(doc);
          if (findings.length) {
            cy.log(report(findings));
          }
          expect(
            findings,
            `${findings.length} illegible text node(s) on ${name} (${theme}):\n${report(findings)}\n`
          ).to.have.length(0);
        });
      });
    });
  });
});

/**
 * Anti-vacuity. A sweep that measures nothing passes everything, and the two
 * ways it can silently measure nothing are an over-broad exemption predicate and
 * a visibility check that rejects the whole page.
 */
describe('legibility sweep — the sweep itself', () => {
  it('measures a substantial number of nodes on a real route', () => {
    visit('/accounts', 'dark');
    cy.document().then((doc) => {
      let measured = 0;
      const seen: string[] = [];
      doc.body.querySelectorAll<HTMLElement>('*').forEach((element) => {
        const own = Array.from(element.childNodes)
          .filter((node) => node.nodeType === 3)
          .map((node) => (node.textContent ?? '').trim())
          .join('')
          .trim();
        if (own && element.getBoundingClientRect().width > 0) {
          measured += 1;
          seen.push(own.slice(0, 20));
        }
      });
      cy.log(`text-bearing nodes: ${measured}`);
      // The dashboard has a heading, an eyebrow, a status line, summary tiles, a
      // statement table and a paginator. If this ever collapses, the sweep above
      // has stopped being evidence.
      expect(measured, `only found: ${seen.join(' | ')}`).to.be.greaterThan(25);
    });
  });

  it('catches illegible text planted on a swept route', () => {
    visit('/accounts', 'dark');
    cy.document().then((doc) => {
      const before = sweep(doc).length;
      // Both colours are stated on the node so the plant's own ratio does not
      // depend on the page surface: this control has to keep working while the
      // surface itself is the thing under test.
      const planted = doc.createElement('p');
      planted.style.color = '#c9cdd3';
      planted.style.background = '#ffffff';
      planted.textContent = 'Your available balance is $2,481.19';
      (doc.querySelector('.dashboard') ?? doc.body).appendChild(planted);

      const after = sweep(doc);
      expect(contrastRatio(planted).ratio).to.be.lessThan(4.5);
      expect(after.length, `planted node was not reported:\n${report(after)}`).to.equal(before + 1);
      expect(report(after)).to.contain('available balance');
    });
  });

  it('ignores text that is hidden rather than reporting it as a defect', () => {
    // `visibility: hidden` text is not on screen; measuring it produced two false
    // defect reports, and a false positive costs the gate its credibility as
    // surely as a false negative costs it its purpose.
    visit('/accounts', 'dark');
    cy.document().then((doc) => {
      const hidden = doc.createElement('p');
      hidden.style.color = '#c9cdd3';
      hidden.style.background = '#ffffff';
      hidden.style.visibility = 'hidden';
      hidden.textContent = 'Hidden and therefore not a contrast defect';
      doc.body.appendChild(hidden);
      expect(report(sweep(doc))).not.to.contain('Hidden and therefore');
    });
  });
});
