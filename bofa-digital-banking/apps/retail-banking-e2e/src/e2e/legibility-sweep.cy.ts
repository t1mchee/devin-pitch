import { contrastRatio, glyphRatio, report, sweep } from '../support/contrast';

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

  it('catches an icon-only control whose glyph is invisible', () => {
    // The gate went green with the paginator's enabled arrows recoloured to the
    // paginator's own surface: the sweep kept only nodes with a direct text
    // child, and the one place that read an SVG `fill` was a hand-written probe
    // for the datepicker toggle. An icon-only control is the whole affordance —
    // you cannot press what you cannot see — so 1.4.11's 3:1 applies to it.
    visit('/__showcase/paginator', 'dark');
    cy.document().then((doc) => {
      const before = sweep(doc).length;
      const host = doc.createElement('button');
      host.setAttribute('aria-label', 'Invisible next page');
      // Pinned into the viewport: the sweep ignores off-screen nodes (that is the
      // screen-reader-only exemption below), so a plant appended past the fold
      // would be skipped and this test would pass for the wrong reason.
      host.style.cssText =
        'position:fixed;top:8px;left:8px;display:block;width:32px;height:32px;background:#303030';
      const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '24');
      svg.setAttribute('height', '24');
      svg.style.fill = '#303030';
      const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M8 5l8 7-8 7z');
      svg.appendChild(path);
      host.appendChild(svg);
      doc.body.appendChild(host);

      const after = sweep(doc);
      expect(glyphRatio(svg).ratio).to.be.lessThan(1.05);
      expect(after.length, `invisible glyph was not reported:\n${report(after)}`).to.equal(
        before + 1
      );
      expect(report(after)).to.contain('Invisible next page');
    });
  });

  it('composites a semi-transparent sibling painted over the text', () => {
    // Only `.cdk-overlay-backdrop` used to be treated as a painting sibling, so
    // an `rgba(255,255,255,0.92)` veil over the dark table reported 13.20:1
    // where a human reads about 1.1:1 — a twelve-fold overstatement on exactly
    // the loading-scrim pattern any future skeleton state will use.
    visit('/__showcase/table', 'dark');
    cy.document().then((doc) => {
      const holder = doc.createElement('div');
      holder.style.cssText =
        'position:fixed;top:8px;left:8px;width:320px;background:#303030;padding:8px';
      const text = doc.createElement('p');
      text.style.cssText = 'color:#ffffff;margin:0';
      text.textContent = 'Balance behind a loading veil';
      const veil = doc.createElement('div');
      veil.style.cssText =
        'position:absolute;inset:0;background:rgba(255,255,255,0.92)';
      holder.append(text, veil);
      doc.body.appendChild(holder);

      const measured = contrastRatio(text);
      expect(measured.ratio, measured.detail).to.be.lessThan(1.5);
      expect(report(sweep(doc))).to.contain('loading veil');
    });
  });

  it('does not report off-screen screen-reader-only text', () => {
    // A skip link is not a contrast defect. `left: -9999px`, a clipped 1px box
    // and `clip-path: inset(50%)` are the three shapes of the same pattern, and
    // a gate that fails correct markup gets switched off.
    visit('/accounts', 'dark');
    cy.document().then((doc) => {
      const link = doc.createElement('a');
      link.style.cssText =
        'position:fixed;top:8px;left:-9999px;color:#c9cdd3;background:#ffffff';
      link.textContent = 'Skip to main content';
      const clipped = doc.createElement('span');
      clipped.style.cssText =
        'position:fixed;top:8px;left:8px;clip-path:inset(50%);color:#c9cdd3;background:#ffffff';
      clipped.textContent = 'Statement table, 240 rows';
      doc.body.append(link, clipped);

      const output = report(sweep(doc));
      expect(output).not.to.contain('Skip to main content');
      expect(output).not.to.contain('240 rows');
    });
  });

  it('fails text over artwork until the artwork is declared reviewed', () => {
    // A gradient cannot be reduced to one colour, so guessing would be a green
    // gate over unknown pixels and assuming the canvas would be a red gate over
    // correct code. The third option is the one that leaves a trail: fail, and
    // let a human write down what they checked, in the diff.
    visit('/accounts', 'light');
    cy.document().then((doc) => {
      const banner = doc.createElement('div');
      banner.style.cssText =
        'position:fixed;top:8px;left:8px;width:320px;background:linear-gradient(#7a0019,#c8102e);padding:12px';
      const headline = doc.createElement('p');
      headline.style.cssText = 'color:#ffffff;margin:0;font-size:14px';
      headline.textContent = 'Zelle is now in your app';
      banner.appendChild(headline);
      doc.body.appendChild(banner);

      const measured = contrastRatio(headline);
      expect(measured.unmeasurable, measured.detail).to.be.a('string');
      expect(report(sweep(doc))).to.contain('Zelle is now');

      banner.setAttribute(
        'data-contrast-reviewed',
        'white on the #7a0019–#c8102e brand gradient: 8.9:1 at the lightest stop'
      );
      expect(report(sweep(doc))).not.to.contain('Zelle is now');
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

  it('composites a covering layer that is raised with z-index but written first', () => {
    // Document order was the whole of the paint-order model, and `z-index: 10`
    // on a scrim written *before* the text defeated it: an opaque #303030 panel
    // covering the region entirely reported 13.20:1 with the sweep clean, on a
    // region that is blank on screen.
    visit('/__showcase/table', 'dark');
    cy.document().then((doc) => {
      const holder = doc.createElement('div');
      holder.style.cssText = 'position:fixed;top:8px;left:8px;width:320px;height:80px';
      const veil = doc.createElement('div');
      veil.style.cssText =
        'position:absolute;inset:0;background:#303030;z-index:10';
      const text = doc.createElement('p');
      text.style.cssText =
        'position:absolute;inset:0;margin:0;color:#ffffff;background:#303030;z-index:1';
      text.textContent = 'Balance under a raised panel';
      // The veil comes first in the DOM and paints on top anyway.
      holder.append(veil, text);
      doc.body.appendChild(holder);

      const measured = contrastRatio(text);
      expect(measured.ratio, measured.detail).to.be.lessThan(1.5);
      expect(report(sweep(doc))).to.contain('raised panel');
    });
  });

  it('measures text below the fold, because coverage cannot depend on page height', () => {
    // The same 1.01:1 node was reported at the top of the page and silently
    // passed at `top: 2212`, so what the gate covered was a function of how tall
    // the page happened to be. Nothing was hidden by it today; that is luck, not
    // a property.
    visit('/accounts', 'dark');
    cy.document().then((doc) => {
      const below = doc.createElement('p');
      below.style.cssText =
        'position:absolute;top:2400px;left:8px;color:#fdfdfd;background:#ffffff;font-size:14px';
      below.textContent = 'Overdraft fee disclosure below the fold';
      doc.body.appendChild(below);
      expect(report(sweep(doc))).to.contain('Overdraft fee disclosure');
    });
  });

  it('measures an icon-only control that is labelled with visually hidden text', () => {
    // The exemption read `textContent`, which includes an `sr-only` label — so
    // the accessible way to label an icon button made its glyph invisible to the
    // gate. It reads what a sighted user reads now.
    visit('/__showcase/paginator', 'dark');
    cy.document().then((doc) => {
      const host = doc.createElement('button');
      host.style.cssText =
        'position:fixed;top:8px;left:8px;display:block;width:32px;height:32px;background:#303030';
      const label = doc.createElement('span');
      label.style.cssText = 'position:absolute;clip-path:inset(50%);overflow:hidden';
      label.textContent = 'Download statement';
      const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '24');
      svg.setAttribute('height', '24');
      svg.style.fill = '#303030';
      svg.setAttribute('aria-label', 'Download statement');
      const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M8 5l8 7-8 7z');
      svg.appendChild(path);
      host.append(label, svg);
      doc.body.appendChild(host);

      expect(glyphRatio(svg).ratio).to.be.lessThan(1.05);
      expect(report(sweep(doc))).to.contain('Download statement');
    });
  });

  it('does not composite a veil that paints nothing', () => {
    // `visibility: hidden` on a scrim was still composited, scoring plainly
    // legible white-on-dark text 1.09:1. The false-failure direction of the same
    // model, and it fails correct code.
    visit('/__showcase/table', 'dark');
    cy.document().then((doc) => {
      const holder = doc.createElement('div');
      holder.style.cssText =
        'position:fixed;top:8px;left:8px;width:320px;background:#303030;padding:8px';
      const text = doc.createElement('p');
      text.style.cssText = 'color:#ffffff;margin:0';
      text.textContent = 'Balance with no veil in front of it';
      const veil = doc.createElement('div');
      veil.style.cssText =
        'position:absolute;inset:0;background:#ffffff;visibility:hidden';
      holder.append(text, veil);
      doc.body.appendChild(holder);

      const measured = contrastRatio(text);
      expect(measured.ratio, measured.detail).to.be.greaterThan(10);
      expect(report(sweep(doc))).not.to.contain('no veil in front');
    });
  });

  it('requires the review declaration on the artwork itself, citing a ratio', () => {
    // `closest()` meant one `data-contrast-reviewed="lgtm"` on <body> exempted
    // every gradient on the page. A review trail that can be satisfied by one
    // junk character high in the tree is not a review trail.
    visit('/accounts', 'light');
    cy.document().then((doc) => {
      const wrapper = doc.createElement('div');
      wrapper.style.cssText = 'position:fixed;top:8px;left:8px;width:320px';
      const banner = doc.createElement('div');
      banner.style.cssText =
        'background:linear-gradient(#7a0019,#c8102e);padding:12px';
      const headline = doc.createElement('p');
      headline.style.cssText = 'color:#ffffff;margin:0;font-size:14px';
      headline.textContent = 'Erica can now split a bill';
      banner.appendChild(headline);
      wrapper.appendChild(banner);
      doc.body.appendChild(wrapper);

      wrapper.setAttribute('data-contrast-reviewed', 'lgtm');
      expect(report(sweep(doc)), 'an ancestor must not exempt the artwork').to.contain(
        'Erica can now'
      );

      banner.setAttribute('data-contrast-reviewed', 'x');
      expect(report(sweep(doc)), 'a declaration must cite a ratio').to.contain('Erica can now');

      banner.setAttribute(
        'data-contrast-reviewed',
        'white on the #7a0019–#c8102e gradient: 8.9:1 at the lightest stop'
      );
      expect(report(sweep(doc))).not.to.contain('Erica can now');
    });
  });

  it('measures a CSS-painted indicator, which no SVG sweep can see', () => {
    // The select caret is a 0x0 box with border triangles, so claiming the glyph
    // sweep covered it was false by construction. This is the general shape —
    // any zero-box element painting a single border colour — not a selector for
    // one component.
    visit('/__showcase/select', 'dark');
    cy.document().then((doc) => {
      const host = doc.createElement('div');
      host.style.cssText =
        'position:fixed;top:8px;left:8px;width:48px;height:48px;background:#303030';
      const caret = doc.createElement('div');
      caret.style.cssText =
        'width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid #303030';
      host.appendChild(caret);
      doc.body.appendChild(host);
      expect(report(sweep(doc))).to.contain('css-painted indicator');
    });
  });

  it('does not report the dimmed page behind an open modal', () => {
    // Sweeping in an overlay state reported the inert page underneath at 4.35:1
    // on correct UI. Content behind a modal is dimmed deliberately and is not
    // what anyone is reading; content inside the overlay is still measured.
    visit('/__showcase/dialog', 'light');
    cy.contains('button', /open/i).click();
    cy.get('.cdk-overlay-backdrop').should('exist');
    cy.document().then((doc) => {
      expect(sweep(doc), report(sweep(doc))).to.have.length(0);
    });
  });

  it('composites a scrim raised inside a transform, and only when it truly paints above', () => {
    // `z-index` was read as the maximum over the ancestor chain, which is not
    // how painting works. A `transform` creates a stacking context its children
    // cannot escape, so the model was wrong in both directions: it missed a
    // wrapper that genuinely covers the text, and would have composited one the
    // browser paints underneath.
    visit('/__showcase/table', 'dark');
    cy.document().then((doc) => {
      const holder = doc.createElement('div');
      holder.style.cssText = 'position:fixed;top:8px;left:8px;width:320px;height:80px';
      const text = doc.createElement('p');
      text.style.cssText =
        'position:absolute;inset:0;margin:0;color:#ffffff;background:#303030';
      text.textContent = 'Balance under a transformed panel';
      // `translateZ(0)` is the commonest promotion hint in a real codebase, and
      // it is what makes the inner `z-index: 10` local.
      const wrapper = doc.createElement('div');
      wrapper.style.cssText = 'position:absolute;inset:0;transform:translateZ(0)';
      const veil = doc.createElement('div');
      veil.style.cssText = 'position:absolute;inset:0;background:#303030;z-index:10';
      wrapper.appendChild(veil);
      holder.append(text, wrapper);
      doc.body.appendChild(holder);

      const covered = contrastRatio(text);
      expect(covered.ratio, covered.detail).to.be.lessThan(1.5);
      expect(report(sweep(doc))).to.contain('transformed panel');

      // The inverse: the same inner `z-index: 10` cannot lift the subtree past a
      // sibling of the stacking context, so raising the text makes it visible —
      // and a gate that still reported it would be failing correct code.
      text.style.zIndex = '1';
      const raised = contrastRatio(text);
      expect(raised.ratio, raised.detail).to.be.greaterThan(10);
      expect(report(sweep(doc))).not.to.contain('transformed panel');
    });
  });

  it('is not disarmed by a stray overlay backdrop left in the DOM', () => {
    // Inertness was armed by the *presence* of a `.cdk-overlay-backdrop`, so one
    // leftover 0x0 node switched the sweep off for every `aria-hidden` subtree
    // on the page. It takes an overlay with content now.
    visit('/accounts', 'light');
    cy.document().then((doc) => {
      const container = doc.createElement('div');
      container.className = 'cdk-overlay-container';
      const stray = doc.createElement('div');
      stray.className = 'cdk-overlay-backdrop';
      stray.style.cssText = 'position:fixed;width:0;height:0;opacity:0';
      container.appendChild(stray);
      doc.body.appendChild(container);

      const region = doc.createElement('div');
      region.setAttribute('aria-hidden', 'true');
      region.style.cssText = 'position:fixed;top:8px;left:8px;background:#ffffff;padding:8px';
      const text = doc.createElement('p');
      text.style.cssText = 'color:#ffffff;margin:0;font-size:14px';
      text.textContent = 'Wire cut-off time 5pm ET';
      region.appendChild(text);
      doc.body.appendChild(region);

      expect(report(sweep(doc)), 'a stray backdrop must not switch the gate off').to.contain(
        'Wire cut-off'
      );

      // And an empty pane is not a modal either: it is what a closing animation
      // leaves behind.
      const pane = doc.createElement('div');
      pane.className = 'cdk-overlay-pane';
      pane.style.cssText = 'position:fixed;top:200px;left:200px;width:200px;height:100px';
      container.appendChild(pane);
      expect(report(sweep(doc))).to.contain('Wire cut-off');
    });
  });

  it('measures painted marks of any shape, and not a tail of the surface it matches', () => {
    // The indicator rule recognised one drawing technique (a 0x0 box, one
    // painted side). A rotated two-border chevron and an L-shaped corner mark
    // are the same defect drawn differently, and both walked past — while a
    // tooltip arrow, which hangs outside its parent and paints over what is
    // behind the tooltip, was measured against the surface it matches and filed
    // as a false defect.
    visit('/__showcase/select', 'dark');
    cy.document().then((doc) => {
      const host = doc.createElement('div');
      host.style.cssText =
        'position:fixed;top:8px;left:8px;width:64px;height:64px;background:#303030';
      const chevron = doc.createElement('span');
      chevron.style.cssText =
        'display:block;width:8px;height:8px;border-right:2px solid #303030;border-bottom:2px solid #303030;transform:rotate(45deg)';
      host.appendChild(chevron);
      doc.body.appendChild(host);
      expect(report(sweep(doc)), 'a rotated chevron is a caret too').to.contain(
        'css-painted indicator'
      );
      host.remove();

      const corner = doc.createElement('div');
      corner.style.cssText =
        'position:fixed;top:120px;left:8px;width:10px;height:10px;border-left:2px solid #303030;border-bottom:2px solid #303030;background:transparent';
      const canvas = doc.createElement('div');
      canvas.style.cssText = 'position:fixed;top:112px;left:0;width:40px;height:40px;background:#303030';
      doc.body.append(canvas, corner);
      expect(report(sweep(doc)), 'an L-shaped mark is a shape too').to.contain(
        'css-painted indicator'
      );
      corner.remove();
      canvas.remove();

      // A two-tone triangle with one legible half is legible.
      const surface = doc.createElement('div');
      surface.style.cssText =
        'position:fixed;top:200px;left:8px;width:64px;height:64px;background:#303030';
      const twoTone = doc.createElement('div');
      twoTone.style.cssText =
        'width:0;height:0;border-left:6px solid #303030;border-right:6px solid #ffffff;border-top:6px solid transparent';
      surface.appendChild(twoTone);
      doc.body.appendChild(surface);
      expect(report(sweep(doc)), 'one visible half is visible').not.to.contain(
        'css-painted indicator'
      );
      surface.remove();

      // The tooltip arrow: same colour as its surface, painted over the page.
      const page = doc.createElement('div');
      page.style.cssText =
        'position:fixed;top:300px;left:8px;width:200px;height:80px;background:#ffffff';
      const tooltip = doc.createElement('div');
      tooltip.style.cssText =
        'position:absolute;top:8px;left:8px;width:120px;height:24px;background:#303030';
      const arrow = doc.createElement('div');
      arrow.style.cssText =
        'position:absolute;bottom:-6px;left:12px;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid #303030';
      tooltip.appendChild(arrow);
      page.appendChild(tooltip);
      doc.body.appendChild(page);
      expect(report(sweep(doc)), 'an arrow is a tail of its surface').not.to.contain(
        'css-painted indicator'
      );
    });
  });

  it('recognises the current sr-only recipe, not one spelling of it', () => {
    // `clip-path: inset(50%)` was matched literally, so `inset(100%)` — what
    // every current framework emits — was measured and false-failed. The
    // distinction the gate needs is "clipped away", not a string.
    visit('/accounts', 'light');
    cy.document().then((doc) => {
      // Deliberately a full-size box: a 1x1 clip is already skipped for its
      // size, so a test written that way passes with the bug still in place —
      // the first version of this test did exactly that and proved nothing.
      const label = doc.createElement('span');
      label.style.cssText =
        'position:absolute;top:8px;left:8px;width:160px;height:20px;overflow:hidden;clip-path:inset(100%);color:#ffffff;background:#ffffff';
      label.textContent = 'Skip to main content';
      doc.body.appendChild(label);
      expect(report(sweep(doc))).not.to.contain('Skip to main content');
    });
  });

  it('evaluates clipping instead of matching it, in both directions', () => {
    // "First percentage >= 45" is not what CSS does. It called `inset(45%)` on a
    // 300x28 box hidden while a 10% band of it is painted, and `inset(0 0 100% 0)`
    // — clipped to nothing — visible. And the legacy `clip` property applies only
    // to positioned elements, so honouring it on a static one hid painted text.
    visit('/accounts', 'light');
    cy.document().then((doc) => {
      const plant = (css: string, text: string): HTMLElement => {
        const node = doc.createElement('p');
        node.style.cssText = `width:300px;height:28px;margin:0;font-size:14px;color:#ffffff;background:#ffffff;${css}`;
        node.textContent = text;
        doc.body.appendChild(node);
        return node;
      };
      const fixed = 'position:fixed;top:8px;left:8px;';

      const band = plant(`${fixed}clip-path:inset(45%)`, 'Available balance 45');
      expect(report(sweep(doc)), 'a painted centre band is painted').to.contain(
        'Available balance 45'
      );
      band.remove();

      const gone = plant(`${fixed}clip-path:inset(50%)`, 'Available balance 50');
      expect(report(sweep(doc)), 'inset(50%) leaves nothing').not.to.contain(
        'Available balance 50'
      );
      gone.remove();

      const shorthand = plant(`${fixed}clip-path:inset(0 0 100% 0)`, 'Available balance 100');
      expect(report(sweep(doc)), 'the shorthand has four sides').not.to.contain(
        'Available balance 100'
      );
      shorthand.remove();

      const staticClip = plant('clip:rect(0,0,0,0)', 'Pending transfers static');

      expect(report(sweep(doc)), 'clip does nothing to a static element').to.contain(
        'Pending transfers static'
      );
      staticClip.remove();

      plant(`${fixed}clip:rect(0,0,0,0)`, 'Pending transfers absolute');
      expect(report(sweep(doc)), 'and everything to a positioned one').not.to.contain(
        'Pending transfers absolute'
      );
    });
  });

  it('composites a layer that covers most of the text, not only one that contains it', () => {
    // Coverage was a yes/no: the layer had to contain the target's whole box. A
    // veil inside a `position: sticky` wrapper is offset by the sticky `top`, so
    // it fell eight pixels short and text no human can read measured at 13.20:1.
    visit('/__showcase/table', 'dark');
    cy.document().then((doc) => {
      const holder = doc.createElement('div');
      holder.style.cssText = 'position:fixed;top:8px;left:8px;width:360px;height:48px';
      const text = doc.createElement('p');
      text.style.cssText =
        'position:absolute;top:8px;left:0;width:360px;height:40px;margin:0;font-size:14px;color:#ffffff;background:#303030';
      text.textContent = 'Statement total under a sticky veil';
      const veil = doc.createElement('div');
      veil.style.cssText =
        'position:absolute;top:0;left:0;width:360px;height:40px;background:#303030;z-index:10';
      holder.append(text, veil);
      doc.body.appendChild(holder);

      const covered = contrastRatio(text);
      expect(covered.ratio, covered.detail).to.be.lessThan(1.5);
      expect(report(sweep(doc))).to.contain('sticky veil');

      // A sliver is still the disclosed partial-overlap case: compositing it
      // would mis-state the colour of the part still on screen.
      veil.style.height = '10px';
      expect(report(sweep(doc)), 'a sliver is not a cover').not.to.contain('sticky veil');
    });
  });

  it('is silenced by a real modal and by nothing that merely resembles one', () => {
    // Requiring "a visible pane with text in it" was satisfied by a 2x2 pane
    // containing a full stop, which switched the gate off for every `aria-hidden`
    // subtree on the page just as effectively as the stray backdrop did.
    visit('/accounts', 'light');
    cy.document().then((doc) => {
      const container = doc.createElement('div');
      container.className = 'cdk-overlay-container';
      const pane = doc.createElement('div');
      pane.className = 'cdk-overlay-pane';
      pane.style.cssText = 'position:fixed;top:100px;left:100px;width:2px;height:2px';
      pane.textContent = '.';
      container.appendChild(pane);
      doc.body.appendChild(container);

      const region = doc.createElement('div');
      region.setAttribute('aria-hidden', 'true');
      region.style.cssText = 'position:fixed;top:8px;left:8px;background:#ffffff;padding:8px';
      const text = doc.createElement('p');
      text.style.cssText = 'color:#ffffff;margin:0;font-size:14px';
      text.textContent = 'Zelle daily limit';
      region.appendChild(text);
      doc.body.appendChild(region);

      expect(report(sweep(doc)), 'a 2x2 pane is not a modal').to.contain('Zelle daily limit');

      // What makes a page inert is the thing MatDialog marks as a dialog — the
      // same thing that put `aria-hidden` on the siblings this rule trusts.
      const dialog = doc.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.style.cssText = 'width:320px;height:180px;background:#ffffff';
      dialog.textContent = 'Confirm transfer';
      pane.style.cssText = 'position:fixed;top:100px;left:100px;width:320px;height:180px';
      pane.textContent = '';
      pane.appendChild(dialog);

      expect(report(sweep(doc)), 'the page behind a real dialog is inert').not.to.contain(
        'Zelle daily limit'
      );
    });
  });

  it('measures a mark drawn with four sides, at 32px, or in a pseudo-element', () => {
    // Three exclusions with no principle behind them: fewer than four painted
    // sides (a leftover from counting zero-width `currentColor` borders), a 24px
    // ceiling, and the element's own box — which cannot see `::before`, where
    // Material draws several of these.
    visit('/__showcase/select', 'dark');
    cy.document().then((doc) => {
      const surface = (top: number): HTMLElement => {
        const node = doc.createElement('div');
        node.style.cssText = `position:fixed;top:${top}px;left:8px;width:80px;height:80px;background:#303030`;
        doc.body.appendChild(node);
        return node;
      };

      const boxed = surface(8);
      const frame = doc.createElement('span');
      frame.style.cssText = 'display:block;width:12px;height:12px;border:2px solid #303030';
      boxed.appendChild(frame);
      expect(report(sweep(doc)), 'four sides is a shape').to.contain('css-painted indicator');
      boxed.remove();

      const large = surface(100);
      const mark = doc.createElement('span');
      mark.style.cssText = 'display:block;width:32px;height:32px;border-bottom:3px solid #303030';
      large.appendChild(mark);
      expect(report(sweep(doc)), '32px is still a mark').to.contain('css-painted indicator');
      large.remove();

      const pseudo = surface(200);
      pseudo.classList.add('r11-pseudo-caret');
      const style = doc.createElement('style');
      style.textContent =
        '.r11-pseudo-caret::before{content:"";position:absolute;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid #303030}';
      doc.head.appendChild(style);
      expect(report(sweep(doc)), 'a caret in ::before is still a caret').to.contain(
        'css-painted indicator'
      );
    });
  });
});
