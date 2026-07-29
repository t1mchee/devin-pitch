/**
 * WCAG 2.1 contrast, computed the pedantic way — and the pedantry is the point.
 *
 * This helper has been attacked in three consecutive hostile rounds and every
 * shortcut it contained made an *illegible* render pass. In order of discovery:
 *
 *   1. `rgba(0, 0, 0, 0)` parsed as opaque black, so a fully transparent
 *      ancestor chain scored 21:1 — the maximum — while rendering white on white.
 *   2. Foreground alpha was dropped, so `rgba(255, 255, 255, 0.5)` scored
 *      10.05:1 where the composited truth is 3.87:1. Secondary text (hints,
 *      disabled labels, inactive tabs) is exactly where Material uses alpha, so
 *      the shortcut failed precisely on the text it was added to protect.
 *   3. Only `background-color` was read, and only up the `parentElement` chain.
 *      That left four holes: an ancestor `opacity` (reported 13.20:1 where the
 *      composited truth was 3.28:1), a gradient or `background-image` (reported
 *      21:1 over arbitrary artwork), `visibility: hidden` text measured as
 *      though it were on screen, and a CDK overlay — whose backdrop is a
 *      *sibling* of the panel, not an ancestor — measured against the page and
 *      reported as a false failure.
 *
 * So: alpha is parsed, `opacity` is folded into the layer alpha, every layer is
 * composited over the one behind it, a chain that never becomes opaque
 * terminates on the canvas, an overlay composites its backdrop, and anything
 * this model genuinely cannot compute (an image, a gradient) is reported as
 * UNMEASURABLE rather than guessed — because a guess here is a green gate over
 * unreadable text.
 *
 * Round four of the same attack found two more, and both were the same mistake
 * in different clothes — a *special case where a general rule belonged*:
 *
 *   4. Only the CDK backdrop was treated as a painting sibling. Any positioned
 *      sibling that overlaps the text paints over it the same way (a loading
 *      veil, a skeleton, a modal scrim of our own), and an `rgba(255,255,255,
 *      0.92)` veil over the dark table reported 13.20:1 where a human reads
 *      1.1:1. `collectScrims` now finds overlapping painted siblings generally.
 *   5. Only *text* was swept, and only `color` was read, so an icon-only control
 *      could be invisible with the gate green: the paginator's arrows recoloured
 *      to their own surface measured 1.00:1 and the sweep reported nothing. The
 *      datepicker toggle had been caught the round before *only* because someone
 *      hand-wrote a probe for it — which is the fixed-list failure this file
 *      exists to end. `sweep` now measures SVG geometry too, at 1.4.11's 3:1.
 *
 * Two policies are stated here rather than left implicit, because both were read
 * as bugs by a reviewer and one of them will block a correct PR otherwise:
 *
 *   - Text over a gradient or image **fails** as UNMEASURABLE. If artwork behind
 *     text is genuinely intended, declare it with
 *     `data-contrast-reviewed="<who checked, and against what>"`, which is a line
 *     in the diff a reviewer can argue with. Silence is not an option, and
 *     neither is scoring text against a canvas it is not painted on.
 *   - `aria-hidden` content **is** swept. It is hidden from assistive technology
 *     but painted for sighted users, and 1.4.3 is about what is displayed.
 */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Measurement {
  /** WCAG ratio, or 0 when the background cannot be computed (which fails). */
  ratio: number;
  detail: string;
  unmeasurable?: string;
}

const CANVAS: Rgba = { r: 255, g: 255, b: 255, a: 1 };

export function parseColour(value: string): Rgba {
  const parts = (value.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  if (parts.length < 3) {
    // `transparent`, `currentColor`, an empty string: treat as fully transparent
    // rather than as a colour, so it composites away instead of scoring well.
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
}

/** Source-over composite of `top` onto an opaque `bottom`. */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  return {
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  };
}

const round = ({ r, g, b }: Rgba): string =>
  `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

function paintsArtwork(style: CSSStyleDeclaration): boolean {
  const image = style.backgroundImage;
  return !!image && image !== 'none';
}

export interface Scrim {
  element: HTMLElement;
  colour: Rgba;
  rect: DOMRect;
}

/**
 * Every positioned, painted element in the document that could be covering
 * something. Collected once per sweep and passed down, because doing it per
 * measurement is quadratic on a real page.
 */
export function collectScrims(doc: Document): Scrim[] {
  const scrims: Scrim[] = [];
  doc.body.querySelectorAll<HTMLElement>('*').forEach((element) => {
    const style = getComputedStyle(element);
    if (style.position === 'static') {
      return;
    }
    const colour = parseColour(style.backgroundColor);
    const opacity = Number(style.opacity);
    const alpha = colour.a * (Number.isNaN(opacity) ? 1 : opacity);
    if (alpha <= 0) {
      return;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      scrims.push({ element, colour: { ...colour, a: alpha }, rect });
    }
  });
  return scrims;
}

/**
 * The scrims painted *over* `element`: fully covering it, outside its subtree
 * and its ancestor chain, and later in paint order.
 *
 * "Fully covering" is deliberate and it is the difference between a gate and a
 * noise generator. The first version of this used rect *intersection*, and every
 * partial overlap in Material became a background: the tab ink bar (a 2px
 * sibling at the bottom of the label) was composited over the label and reported
 * red-on-red, and eighteen legible routes failed. A layer that hides text covers
 * the text; a layer that touches its bounding box does not. Document order is
 * the approximation for paint order — exact stacking-context resolution is not
 * recoverable from computed styles.
 */
function scrimsOver(element: HTMLElement, scrims: Scrim[], counted: Set<HTMLElement>): Rgba[] {
  const rect = element.getBoundingClientRect();
  const covers = (other: DOMRect): boolean =>
    other.left <= rect.left &&
    other.right >= rect.right &&
    other.top <= rect.top &&
    other.bottom >= rect.bottom;

  return scrims
    .filter(
      (scrim) =>
        scrim.element !== element &&
        !scrim.element.contains(element) &&
        !element.contains(scrim.element) &&
        covers(scrim.rect) &&
        !counted.has(scrim.element) &&
        // eslint-disable-next-line no-bitwise
        !!(element.compareDocumentPosition(scrim.element) & Node.DOCUMENT_POSITION_FOLLOWING)
    )
    .map((scrim) => {
      counted.add(scrim.element);
      return scrim.colour;
    });
}

/**
 * The layer stack painted behind `element`, outermost last, or an explanation of
 * why it cannot be known. `opacity` on an ancestor multiplies the alpha of that
 * ancestor's background *and* of everything inside it, which is why it is folded
 * in here rather than handled at the call site.
 */
function backgroundLayers(
  element: HTMLElement,
  scrims: Scrim[]
): {
  layers: Rgba[];
  /** Layers painted *over* the element, nearest first. Also cover the text. */
  over: Rgba[];
  /** Product of `opacity` on the element and its ancestors. Applies to text too. */
  opacity: number;
  unmeasurable?: string;
} {
  const layers: Rgba[] = [];
  const over: Rgba[] = [];
  const counted = new Set<HTMLElement>();
  let node: HTMLElement | null = element;
  let inheritedOpacity = 1;

  const collectOver = (from: HTMLElement): void => {
    // A CDK overlay panel is a child of the overlay container, which is a child
    // of <body> — but the scrim that darkens the page is the panel's *sibling*,
    // and walking parents alone measures the panel against the page. Siblings of
    // every ancestor count for the same reason: a veil over a card covers the
    // card's text without being anywhere above it in the tree. A layer that
    // covers both the element and an ancestor is counted once.
    scrimsOver(from, scrims, counted).forEach((scrim) => over.push(scrim));
  };

  collectOver(element);

  while (node) {
    const style = getComputedStyle(node);

    if (paintsArtwork(style)) {
      return {
        layers,
        over,
        opacity: inheritedOpacity,
        unmeasurable: `${node.tagName.toLowerCase()} paints ${style.backgroundImage.slice(0, 48)}`,
      };
    }

    const opacity = Number(style.opacity);
    if (!Number.isNaN(opacity) && opacity < 1) {
      inheritedOpacity *= opacity;
    }

    const layer = parseColour(style.backgroundColor);
    const effective = { ...layer, a: layer.a * inheritedOpacity };
    if (effective.a > 0) {
      layers.push(effective);
      if (effective.a === 1) {
        return { layers, over, opacity: inheritedOpacity };
      }
    }

    node = node.parentElement;
    if (node) {
      collectOver(node);
    }
  }

  return { layers, over, opacity: inheritedOpacity };
}

/** Paint `over` (nearest first) on top of an already-opaque colour. */
function applyOver(colour: Rgba, over: Rgba[]): Rgba {
  return over.reduceRight((below, above) => composite(above, below), colour);
}

/** The opaque colour actually painted behind `element`, canvas included. */
export function paintedBackground(
  element: HTMLElement,
  scrims: Scrim[] = collectScrims(element.ownerDocument)
): {
  colour: Rgba;
  /** The same colour without the covering layers, which the text sits on. */
  beneath: Rgba;
  over: Rgba[];
  opacity: number;
  unmeasurable?: string;
} {
  const { layers, over, opacity, unmeasurable } = backgroundLayers(element, scrims);
  const beneath = layers.reduceRight((below, above) => composite(above, below), CANVAS);
  return { colour: applyOver(beneath, over), beneath, over, opacity, unmeasurable };
}

export function luminance({ r, g, b }: Rgba): number {
  const channel = (value: number): number => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratioOf(a: Rgba, b: Rgba): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Artwork behind text is unmeasurable, and that fails — unless someone has
 * written down that they checked it. The attribute is the audit trail: a green
 * gate with no explanation and a red gate on correct code are both worse than a
 * reviewable sentence in the diff.
 */
function reviewed(element: HTMLElement): string | null {
  const declared = element.closest<HTMLElement>('[data-contrast-reviewed]');
  return declared?.getAttribute('data-contrast-reviewed')?.trim() || null;
}

export function contrastRatio(
  element: HTMLElement,
  scrims: Scrim[] = collectScrims(element.ownerDocument)
): Measurement {
  const { colour: background, beneath, over, opacity, unmeasurable } = paintedBackground(
    element,
    scrims
  );
  const declared = parseColour(getComputedStyle(element).color);
  // `opacity` fades the glyphs as well as the box. Folding it into the background
  // only was the third version of the same mistake: the helper reported 2.00:1
  // for a label whose composited truth is 1.20:1 — still a fail, but the number
  // in the failure message has to be the number on the screen.
  // A covering layer dims the glyphs and the surface alike, so it is applied to
  // both: a veil over white-on-black leaves the text legible against itself and
  // illegible against the page, and only measuring both sides shows that.
  const foreground = applyOver(
    composite({ ...declared, a: declared.a * opacity }, beneath),
    over
  );

  if (unmeasurable) {
    return {
      ratio: 0,
      unmeasurable,
      detail: `UNMEASURABLE (${unmeasurable}): a painted image or gradient behind text cannot be reduced to one colour, so this reports 0 rather than guessing`,
    };
  }

  return {
    ratio: ratioOf(foreground, background),
    detail: `${getComputedStyle(element).color} → ${round(foreground)} on ${round(background)}`,
  };
}

/**
 * Non-text contrast for a painted state indicator (the tab ink bar, a control
 * outline): its own surface against the surface behind it, per WCAG 1.4.11.
 */
export function indicatorRatio(indicator: HTMLElement): Measurement {
  const bar = paintedBackground(indicator);
  const behind = paintedBackground(indicator.parentElement as HTMLElement);
  if (bar.unmeasurable || behind.unmeasurable) {
    const why = bar.unmeasurable ?? behind.unmeasurable ?? '';
    return { ratio: 0, unmeasurable: why, detail: `UNMEASURABLE (${why})` };
  }
  return {
    ratio: ratioOf(bar.colour, behind.colour),
    detail: `${round(bar.colour)} on ${round(behind.colour)}`,
  };
}

/**
 * Contrast of an SVG glyph, which is painted with `fill` and not with `color`.
 *
 * Asserted separately because the datepicker toggle proved the difference the
 * hard way: the 3:1 assertion read the *button's* `color`, so changing the SVG's
 * `fill` alone left the test green while the glyph vanished. `fill: currentColor`
 * resolves to an `rgb()` in the computed style, so this is a real reading of the
 * painted pixel and not a re-reading of the inherited one.
 */
export function glyphRatio(
  svg: SVGElement,
  scrims: Scrim[] = collectScrims(svg.ownerDocument)
): Measurement {
  const style = getComputedStyle(svg as unknown as Element);
  // A stroked outline icon paints nothing with `fill`; measuring the fill would
  // score `none` (transparent) and pass everything.
  const painter = parseColour(style.fill).a > 0 ? 'fill' : 'stroke';
  const paint = painter === 'fill' ? style.fill : style.stroke;
  const host = (svg.parentElement ?? svg.ownerDocument.body) as HTMLElement;
  const { colour: background, beneath, over, opacity, unmeasurable } = paintedBackground(
    host,
    scrims
  );
  if (unmeasurable) {
    return { ratio: 0, unmeasurable, detail: `UNMEASURABLE (${unmeasurable})` };
  }
  const declared = parseColour(paint);
  const painted = applyOver(
    composite({ ...declared, a: declared.a * opacity }, beneath),
    over
  );
  return {
    ratio: ratioOf(painted, background),
    detail: `${painter} ${paint} → ${round(painted)} on ${round(background)}`,
  };
}

/** WCAG 1.4.3: 3:1 for large text (>=24px, or >=18.66px bold), else 4.5:1. */
export function requiredRatio(element: HTMLElement): number {
  const style = getComputedStyle(element);
  const size = parseFloat(style.fontSize);
  const weight = Number(style.fontWeight) || (style.fontWeight === 'bold' ? 700 : 400);
  const large = size >= 24 || (size >= 18.66 && weight >= 700);
  return large ? 3 : 4.5;
}

function visible(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  if (style.visibility === 'hidden' || style.visibility === 'collapse' || style.display === 'none') {
    return false;
  }
  // Folded opacity: text inside an ancestor at opacity 0 is not on screen, and
  // measuring it produced two false defect reports before this existed.
  let node: HTMLElement | null = element;
  while (node) {
    if (Number(getComputedStyle(node).opacity) === 0) {
      return false;
    }
    node = node.parentElement;
  }
  const rect = element.getBoundingClientRect();
  // The screen-reader-only patterns are all here: `left: -9999px`, a 1x1 box
  // with `overflow: hidden`, and `clip-path: inset(50%)`. A skip link is not a
  // contrast defect, and a gate that says it is gets switched off.
  const view = element.ownerDocument.defaultView;
  const offScreen =
    rect.right <= 0 ||
    rect.bottom <= 0 ||
    (!!view && (rect.left >= view.innerWidth || rect.top >= view.innerHeight));
  const clipped = /inset\(\s*(4[5-9]|50)/.test(style.clipPath || '');
  return rect.width > 1 && rect.height > 1 && !offScreen && !clipped;
}

/**
 * WCAG 1.4.3 exempts text that is part of an inactive control. Matching this
 * correctly matters in both directions: `mat-chip-disabled` does not contain
 * `mat-*-disabled` in the shape a naive pattern expects, and two rounds of
 * review filed false defects on disabled controls because of it.
 */
function exempt(element: HTMLElement): boolean {
  if (element.closest('[disabled], [aria-disabled=true], .mat-form-field-disabled')) {
    return true;
  }
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    if (/(^|\s)mat-[a-z-]*disabled(\s|$)/.test(node.className || '')) {
      return true;
    }
  }
  return false;
}

export interface Finding {
  where: string;
  text: string;
  required: number;
  ratio: number;
  detail: string;
}

/**
 * Every visible, non-exempt text node on the page, measured.
 *
 * This exists because a hand-picked target list is a list of the places someone
 * already thought about. Three rounds running, the defects were somewhere else:
 * a heading on the customer dashboard, a shared eyebrow class on thirteen
 * routes, a field label that only fails while focused. A sweep cannot be
 * complete about *states*, but it is complete about elements, which is the axis
 * the fixed list kept missing.
 */
export function sweep(doc: Document): Finding[] {
  const findings: Finding[] = [];
  const scrims = collectScrims(doc);

  // WCAG 1.4.11: a graphical object needed to understand the content clears 3:1.
  // An icon-only control is that by definition — you cannot press what you
  // cannot see — so every painted SVG shape is measured, not a list of the ones
  // someone remembered. Icons that merely decorate a text label are exempt, and
  // that is the only exemption.
  doc.body.querySelectorAll<SVGElement>('svg').forEach((svg) => {
    const control = svg.parentElement?.closest<HTMLElement>(
      'button, a, [role=button], [role=link], [role=menuitem], [role=tab]'
    );
    const labelled = !!control && (control.textContent ?? '').trim().length > 0;
    const host = svg.parentElement as HTMLElement | null;
    if (labelled || !host || !visible(host) || exempt(host)) {
      return;
    }
    const { ratio, detail, unmeasurable } = glyphRatio(svg, scrims);
    if (unmeasurable && reviewed(host)) {
      return;
    }
    if (ratio + 0.005 < 3) {
      findings.push({
        where: `${describe(host)} > svg`,
        text: (
          svg.getAttribute('aria-label') ??
          control?.getAttribute('aria-label') ??
          'icon'
        ).slice(0, 40),
        required: 3,
        ratio,
        detail,
      });
    }
  });

  doc.body.querySelectorAll<HTMLElement>('*').forEach((element) => {
    const own = Array.from(element.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => (node.textContent ?? '').trim())
      .join(' ')
      .trim();

    if (!own || !visible(element) || exempt(element)) {
      return;
    }

    const required = requiredRatio(element);
    const { ratio, detail, unmeasurable } = contrastRatio(element, scrims);
    if (unmeasurable && reviewed(element)) {
      return;
    }
    if (ratio + 0.005 < required) {
      findings.push({
        where: describe(element),
        text: own.slice(0, 40),
        required,
        ratio,
        detail,
      });
    }
  });

  return findings;
}

function describe(element: HTMLElement): string {
  const classes = (element.className || '')
    .split(/\s+/)
    .filter((name) => name && !name.startsWith('ng-') && !name.startsWith('cdk-'))
    .slice(0, 3)
    .join('.');
  return classes ? `${element.tagName.toLowerCase()}.${classes}` : element.tagName.toLowerCase();
}

export function report(findings: Finding[]): string {
  return findings
    .map((f) => `  ${f.where} "${f.text}" — ${f.ratio.toFixed(2)}:1, needs ${f.required}:1 (${f.detail})`)
    .join('\n');
}
