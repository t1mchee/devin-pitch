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

/**
 * The layer stack painted behind `element`, outermost last, or an explanation of
 * why it cannot be known. `opacity` on an ancestor multiplies the alpha of that
 * ancestor's background *and* of everything inside it, which is why it is folded
 * in here rather than handled at the call site.
 */
function backgroundLayers(element: HTMLElement): {
  layers: Rgba[];
  /** Product of `opacity` on the element and its ancestors. Applies to text too. */
  opacity: number;
  unmeasurable?: string;
} {
  const layers: Rgba[] = [];
  let node: HTMLElement | null = element;
  let inheritedOpacity = 1;

  while (node) {
    const style = getComputedStyle(node);

    if (paintsArtwork(style)) {
      return {
        layers,
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
        return { layers, opacity: inheritedOpacity };
      }
    }

    // A CDK overlay panel is a child of the overlay container, which is a child
    // of <body> — but the scrim that darkens the page behind it is the panel's
    // *sibling*. Walking parents alone measures the panel against the page and
    // reports a failure the customer cannot see.
    const backdrop = node.parentElement?.querySelector<HTMLElement>('.cdk-overlay-backdrop');
    if (backdrop && backdrop !== node) {
      const scrim = parseColour(getComputedStyle(backdrop).backgroundColor);
      if (scrim.a > 0) {
        layers.push({ ...scrim, a: scrim.a * inheritedOpacity });
      }
    }

    node = node.parentElement;
  }

  return { layers, opacity: inheritedOpacity };
}

/** The opaque colour actually painted behind `element`, canvas included. */
export function paintedBackground(element: HTMLElement): {
  colour: Rgba;
  opacity: number;
  unmeasurable?: string;
} {
  const { layers, opacity, unmeasurable } = backgroundLayers(element);
  return {
    colour: layers.reduceRight((below, above) => composite(above, below), CANVAS),
    opacity,
    unmeasurable,
  };
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

export function contrastRatio(element: HTMLElement): Measurement {
  const { colour: background, opacity, unmeasurable } = paintedBackground(element);
  const declared = parseColour(getComputedStyle(element).color);
  // `opacity` fades the glyphs as well as the box. Folding it into the background
  // only was the third version of the same mistake: the helper reported 2.00:1
  // for a label whose composited truth is 1.20:1 — still a fail, but the number
  // in the failure message has to be the number on the screen.
  const foreground = composite({ ...declared, a: declared.a * opacity }, background);

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
export function glyphRatio(svg: SVGElement): Measurement {
  const fill = getComputedStyle(svg as unknown as Element).fill;
  const { colour: background, opacity, unmeasurable } = paintedBackground(
    svg.parentElement as HTMLElement
  );
  if (unmeasurable) {
    return { ratio: 0, unmeasurable, detail: `UNMEASURABLE (${unmeasurable})` };
  }
  const declared = parseColour(fill);
  const painted = composite({ ...declared, a: declared.a * opacity }, background);
  return { ratio: ratioOf(painted, background), detail: `fill ${fill} → ${round(painted)} on ${round(background)}` };
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
  return rect.width > 0 && rect.height > 0;
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
    const { ratio, detail } = contrastRatio(element);
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
