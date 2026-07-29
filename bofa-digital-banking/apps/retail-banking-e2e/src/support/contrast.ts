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
 *     neither is scoring text against a canvas it is not painted on. The
 *     declaration must sit **on the element painting the artwork** and must cite
 *     a ratio (`8.9:1`): round nine put `data-contrast-reviewed="lgtm"` on
 *     `<body>` and exempted every gradient on the page at once.
 *   - `aria-hidden` content **is** swept. It is hidden from assistive technology
 *     but painted for sighted users, and 1.4.3 is about what is displayed. The
 *     one exception is content made inert behind an **open modal**, which is
 *     dimmed on purpose and is not what the user is reading.
 *
 * Round nine attacked the round-eight generalisations and found four more, all
 * of the same family — an approximation that a single CSS declaration defeats:
 *
 *   6. Paint order was approximated by document order alone, so an opaque scrim
 *      raised with `z-index` and written *earlier* in the DOM covered white-on-
 *      dark text completely while the helper reported 13.20:1. `z-index` is now
 *      compared first and document order only breaks the tie.
 *   7. Text below the fold was skipped as "off-screen", so the *same* illegible
 *      node was reported at `top: 400` and silently passed at `top: 2212`. What
 *      the gate covers must not be a function of how tall the page is; only
 *      genuinely negative (screen-reader) offsets are skipped now.
 *   8. The icon exemption read `textContent`, which includes visually-hidden
 *      text — so an icon-only button labelled the *recommended* way, with an
 *      `sr-only` span, was treated as decorated and never measured. It reads
 *      visible text now.
 *   9. A `visibility: hidden` veil paints nothing but was still composited,
 *      scoring legible text 1.09:1 — a false failure, which costs a gate its
 *      credibility as surely as a false pass.
 *
 * Round ten attacked the round-nine fixes. Four more, same family:
 *
 *  10. `z-index` was read as the maximum over the ancestor chain, which is not
 *      how painting works: a `transform` or `filter` on an ancestor creates a
 *      stacking context that a child's `z-index: 10` cannot escape. Both
 *      directions were wrong — a scrim that genuinely hid text was ignored, and
 *      one that a browser paints *below* the text would have been composited.
 *      Paint order is now resolved at the lowest common ancestor, comparing the
 *      two branches at the first stacking context on each path.
 *  11. Inertness was armed by the mere *presence* of a `.cdk-overlay-backdrop`
 *      element. A stray `0x0; opacity: 0` backdrop left in the DOM therefore
 *      switched the sweep off for every `aria-hidden` subtree on the page, which
 *      is one attribute away from disabling the gate. It now takes an overlay
 *      pane that is visible and has content — the state a user is reading.
 *  12. The CSS-indicator rule only recognised its narrowest case (a 0x0 box with
 *      exactly one painted border), so a rotated two-border chevron, an L-shape
 *      and a two-colour triangle were all invisible to it, while a *tooltip
 *      arrow* — which is a tail of its surface, painted over what is behind that
 *      surface — was reported as a false defect because it was measured against
 *      the surface it matches. Detection is now shape-agnostic and the host
 *      surface is chosen by geometry.
 *  13. The `sr-only` detection matched `inset(45–50%)` literally, so the equally
 *      common `inset(100%)` (and `clip: rect(0,0,0,0)`) false-failed.
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
  /** A reviewer's declaration on the artwork itself, if there is a valid one. */
  reviewedAs?: string;
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
 * Every painted element in the document that could be covering something.
 * Collected once per sweep and passed down, because doing it per measurement is
 * quadratic on a real page.
 *
 * Positioning is not the filter. It was, and that made a whole family of covers
 * invisible to the gate: an ordinary in-flow `div` with an opaque background
 * paints over anything at a negative `z-index`, so text under a *static*
 * sibling's background measured 13.20:1 while the region was blank on screen.
 * Where a static background sits in paint order is `paintsAbove`'s problem, not
 * this function's.
 */
export function collectScrims(doc: Document): Scrim[] {
  const scrims: Scrim[] = [];
  doc.body.querySelectorAll<HTMLElement>('*').forEach((element) => {
    const style = getComputedStyle(element);
    // A veil that is not painted covers nothing. Skipping this scored plainly
    // legible text at 1.09:1 behind a `visibility: hidden` overlay — the
    // mirror-image mistake to the ones above, and just as fatal to the gate.
    if (style.visibility === 'hidden' || style.visibility === 'collapse') {
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
 * the text; a layer that touches its bounding box does not.
 *
 * Paint order is approximated by `z-index` first and document order second.
 * Document order alone was not enough: an opaque scrim written earlier in the
 * DOM and raised with `z-index: 10` hid a whole region while the helper happily
 * reported 13.20:1. Full stacking-context resolution is still not recoverable
 * from computed styles, so this remains an approximation — but one that a single
 * declaration no longer defeats.
 */
function createsStackingContext(style: CSSStyleDeclaration): boolean {
  const contains = (style.contain || '')
    .split(/\s+/)
    .some((value) => ['paint', 'layout', 'strict', 'content'].includes(value));
  return Boolean(
    (style.transform && style.transform !== 'none') ||
      (style.filter && style.filter !== 'none') ||
      (style.perspective && style.perspective !== 'none') ||
      style.isolation === 'isolate' ||
      (style.mixBlendMode && style.mixBlendMode !== 'normal') ||
      contains ||
      /transform|opacity|filter/.test(style.willChange || '') ||
      style.position === 'fixed' ||
      style.position === 'sticky' ||
      (style.position !== 'static' && !Number.isNaN(Number(style.zIndex)))
  );
}

/**
 * The level at which `branch` paints, looking only along the path down to `leaf`.
 *
 * A `z-index` inside a stacking context is resolved *within* it and cannot lift
 * the subtree past a sibling of the context — so the walk stops at the first
 * boundary and takes that element's own `z-index` (`auto` counts as 0). Reading
 * the maximum `z-index` over the whole chain, as this used to, let a
 * `transform`ed wrapper's inner `z-index: 10` claim a level the browser never
 * gives it.
 */
function branchLevel(branch: HTMLElement, leaf: HTMLElement): number {
  const path: HTMLElement[] = [];
  for (let node: HTMLElement | null = leaf; node; node = node.parentElement) {
    path.unshift(node);
    if (node === branch) {
      break;
    }
  }
  for (const node of path) {
    const style = getComputedStyle(node);
    const z = Number(style.zIndex);
    if (!Number.isNaN(z)) {
      return z;
    }
    if (createsStackingContext(style)) {
      return 0;
    }
  }
  return 0;
}

/**
 * Whether `scrim`'s background is painted over `element`.
 *
 * CSS paints a stacking context in steps: negative-`z-index` descendants (step
 * 3), then in-flow block backgrounds (step 4), then inline content and text
 * (step 7). So an in-flow background is *below* text at the same level and
 * *above* anything the author pushed to a negative level — which is exactly the
 * pair of behaviours a position-based filter got wrong in both directions.
 */
function paintsAbove(scrim: HTMLElement, element: HTMLElement): boolean {
  // Painting is only comparable inside a common stacking parent: find it, then
  // compare the two branches that descend from it.
  let common: HTMLElement | null = element.parentElement;
  while (common && !common.contains(scrim)) {
    common = common.parentElement;
  }
  if (!common) {
    return false;
  }
  const branchOf = (node: HTMLElement): HTMLElement => {
    let walk = node;
    while (walk.parentElement && walk.parentElement !== common) {
      walk = walk.parentElement;
    }
    return walk;
  };
  const [over, under] = [branchOf(scrim), branchOf(element)];
  const [above, below] = [branchLevel(over, scrim), branchLevel(under, element)];
  if (above !== below) {
    return above > below;
  }
  const scrimStyle = getComputedStyle(scrim);
  const inFlowBackground =
    scrimStyle.position === 'static' &&
    Number.isNaN(Number(scrimStyle.zIndex)) &&
    !createsStackingContext(scrimStyle);
  if (inFlowBackground) {
    return false;
  }
  // eslint-disable-next-line no-bitwise
  return !!(under.compareDocumentPosition(over) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function scrimsOver(element: HTMLElement, scrims: Scrim[], counted: Set<HTMLElement>): Rgba[] {
  const rect = element.getBoundingClientRect();
  // Coverage is a fraction, not a yes/no. Requiring the layer to *contain* the
  // target let a veil inside a `position: sticky` wrapper — offset by the sticky
  // `top`, so eight pixels short of the text's box — measure at 13.20:1 on text
  // no human can read. Half the glyph area under an opaque layer is illegible
  // enough to report; less than that is the partial-overlap case the docs still
  // disclaim, because compositing it would mis-state the colour of the visible
  // half.
  const covers = (other: DOMRect): boolean => {
    const width = Math.min(rect.right, other.right) - Math.max(rect.left, other.left);
    const height = Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top);
    if (width <= 0 || height <= 0) {
      return false;
    }
    const area = rect.width * rect.height;
    return area <= 0 || (width * height) / area >= 0.5;
  };

  return scrims
    .filter(
      (scrim) =>
        scrim.element !== element &&
        !scrim.element.contains(element) &&
        !element.contains(scrim.element) &&
        covers(scrim.rect) &&
        !counted.has(scrim.element) &&
        paintsAbove(scrim.element, element)
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
  /** The element painting the artwork, which is where a review must be declared. */
  artwork?: HTMLElement;
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
        artwork: node,
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
  artwork?: HTMLElement;
} {
  const { layers, over, opacity, unmeasurable, artwork } = backgroundLayers(element, scrims);
  const beneath = layers.reduceRight((below, above) => composite(above, below), CANVAS);
  return { colour: applyOver(beneath, over), beneath, over, opacity, unmeasurable, artwork };
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
export function reviewed(artwork: HTMLElement | undefined): string | null {
  // On the element painting the artwork, not on any ancestor: `closest()` let a
  // single `data-contrast-reviewed="lgtm"` on <body> exempt a whole page of
  // gradients. And the value must cite a ratio, so the trail says what was
  // checked rather than that somebody once typed a character.
  const declared = artwork?.getAttribute('data-contrast-reviewed')?.trim();
  return declared && /\d+(\.\d+)?\s*:\s*1/.test(declared) ? declared : null;
}

export function contrastRatio(
  element: HTMLElement,
  scrims: Scrim[] = collectScrims(element.ownerDocument)
): Measurement {
  const { colour: background, beneath, over, opacity, unmeasurable, artwork } = paintedBackground(
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
      reviewedAs: reviewed(artwork) ?? undefined,
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
  const { colour: background, beneath, over, opacity, unmeasurable, artwork } = paintedBackground(
    host,
    scrims
  );
  if (unmeasurable) {
    return {
      ratio: 0,
      unmeasurable,
      reviewedAs: reviewed(artwork) ?? undefined,
      detail: `UNMEASURABLE (${unmeasurable})`,
    };
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
  //
  // Content *below the fold* is deliberately NOT excluded. It was, and the same
  // 1.01:1 node passed at `top: 2212` and failed at `top: 400` — a gate whose
  // coverage depends on page height is a gate nobody can reason about. Scrolling
  // does not change a computed colour, so it does not need to be scrolled to.
  const offScreen = rect.right <= 0 || rect.bottom <= 0;
  return rect.width > 1 && rect.height > 1 && !offScreen && !clipsAway(style);
}

/**
 * The clipping idioms that hide content from sighted users, evaluated as CSS
 * evaluates them rather than as a string match.
 *
 * Three separate wrongs came out of pattern-matching this. `inset(45–50` false-
 * failed `inset(100%)`, the current `sr-only` recipe. Then "first percentage
 * >= 45" called `inset(45%)` on a 300x28 box hidden when a 10% band of it is
 * painted, and called `inset(0 0 100% 0)` — clipped to nothing — visible. And
 * the legacy `clip` property only applies to absolutely positioned elements, so
 * honouring `clip: rect(0,0,0,0)` on a static element hid painted text.
 *
 * The shorthand is expanded and the axes are summed instead: content survives
 * only if the insets leave both a horizontal and a vertical band.
 */
function clipsAway(style: CSSStyleDeclaration): boolean {
  const path = style.clipPath || '';
  const inset = /inset\(([^)]*)\)/.exec(path);
  if (inset) {
    // Percentages and zero only: `inset(4px)` cannot be resolved without the box,
    // and guessing is how `inset(0 0 100% 0)` — clipped to nothing — read as
    // visible, because only the first value was ever looked at. The optional
    // `round <radius>` tail is part of the grammar and belongs to the corners,
    // not the insets: parsing it as a side made `inset(50% round 4px)` — hidden
    // content, valid CSS — unparseable, and so reported.
    const sides = inset[1]
      .split(/\s+round\s+/)[0]
      .trim()
      .split(/\s+/)
      .map((part) => (/^0(px|%|)$/.test(part) ? 0 : part.endsWith('%') ? parseFloat(part) : NaN));
    if (sides.length && sides.every((side) => !Number.isNaN(side))) {
      const [top, right = top, bottom = top, left = right] = sides;
      if (top + bottom >= 100 || left + right >= 100) {
        return true;
      }
    }
  }
  if (/circle\(\s*0(px|%)?[\s)]/.test(path)) {
    return true;
  }
  const legacy = (style as unknown as { clip?: string }).clip || '';
  return (
    (style.position === 'absolute' || style.position === 'fixed') &&
    /rect\(\s*0(px)?[\s,]+0(px)?[\s,]+0(px)?[\s,]+0(px)?\s*\)/.test(legacy)
  );
}

/**
 * The text of a control as a *sighted* user reads it. The icon exemption used
 * `textContent`, which includes an `sr-only` label — so an icon-only button
 * labelled exactly the way accessibility guidance recommends was classified as
 * "has a text label" and its glyph was never measured.
 */
function visibleText(control: HTMLElement): string {
  let text = '';
  control.querySelectorAll<HTMLElement>('*').forEach((node) => {
    if (!visible(node)) {
      return;
    }
    text += Array.from(node.childNodes)
      .filter((child) => child.nodeType === 3)
      .map((child) => child.textContent ?? '')
      .join(' ');
  });
  text += Array.from(control.childNodes)
    .filter((child) => child.nodeType === 3)
    .map((child) => child.textContent ?? '')
    .join(' ');
  return text.trim();
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

const CONTROL_CHROME = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  '[tabindex]',
  '[role=button]',
  '[role=link]',
  '[role=checkbox]',
  '[role=radio]',
  '[role=switch]',
  '[role=menuitem]',
  '[role=option]',
  '[role=tab]',
  '[role=combobox]',
  '[role=slider]',
  '[role=spinbutton]',
  'mat-select',
  'mat-checkbox',
  'mat-radio-button',
  'mat-slide-toggle',
  'mat-datepicker-toggle',
  'mat-chip',
  'mat-paginator',
  'mat-option',
  'mat-expansion-panel-header',
  '.mat-select-trigger',
  '.mat-sort-header',
  '.mat-tab-label',
  '.mat-tooltip',
].join(', ');

/**
 * Whether a painted mark plausibly *means* something, which is what WCAG 1.4.11
 * is about: a graphic needed to understand the content or operate a control.
 *
 * "Small, borderless, paints borders" is not that test. Widening the shape rule
 * without this one reported an empty `<td>` and an empty 60px box carrying the
 * design system's own 12%-alpha divider token at 1.32:1 — nothing is wrong with
 * either, and a gate that fires on ordinary table and layout chrome in CI is a
 * gate people learn to ignore. So a mark counts when it is part of a control, or
 * when it is named or named-after the thing it indicates; a divider is neither.
 *
 * The disclosed cost: an unnamed, unclassed status mark sitting loose in content
 * is out of scope here. Naming it is also what a screen reader needs, so the
 * shape of that gap is "it is undetectable to assistive technology too", not
 * "the sweep is blind to defects a sighted user sees".
 */
function indicative(element: HTMLElement): boolean {
  return (
    !!element.closest(CONTROL_CHROME) ||
    element.hasAttribute('aria-label') ||
    element.hasAttribute('title') ||
    /badge|dot|status|indicator|icon|caret|arrow|chevron|tick|check|marker/i.test(
      element.className || ''
    )
  );
}

/** The painted border colours of an element, ignoring zero-width sides. */
function borderPaints(style: CSSStyleDeclaration): Rgba[] {
  // Width matters as much as colour: a zero-width side still reports a computed
  // `currentColor`, and counting those made every triangle look like a
  // four-sided box and skipped it.
  return (['Top', 'Right', 'Bottom', 'Left'] as const)
    .filter((side) => parseFloat(style[`border${side}Width`]) > 0)
    .map((side) => parseColour(style[`border${side}Color`]))
    .filter((colour) => colour.a > 0);
}

/**
 * The surface a painted mark sits *on*, chosen by geometry rather than by tree
 * position.
 *
 * A tooltip arrow is the same colour as the tooltip because it is a tail of that
 * surface: it hangs outside its parent's box and is painted over whatever is
 * behind the tooltip, so measuring it against its parent scored 1.00:1 and filed
 * a false defect on correct UI. A caret recoloured to match the control it sits
 * inside is the real thing this rule is for, and the difference between the two
 * is containment.
 */
function hostSurface(indicator: HTMLElement): HTMLElement | null {
  const parent = indicator.parentElement;
  if (!parent) {
    return null;
  }
  const mark = indicator.getBoundingClientRect();
  const box = parent.getBoundingClientRect();
  const inside =
    mark.left >= box.left - 0.5 &&
    mark.right <= box.right + 0.5 &&
    mark.top >= box.top - 0.5 &&
    mark.bottom <= box.bottom + 0.5;
  return inside ? parent : parent.parentElement ?? parent;
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
  // Content behind an open modal is dimmed on purpose and inert; reporting it
  // would fail correct UI every time a dialog is swept. Outside that state
  // `aria-hidden` is still measured, because it is still painted.
  //
  // The *presence* of a `.cdk-overlay-backdrop` is not that state. A stray 0x0,
  // `opacity: 0` backdrop with no overlay behind it armed this rule globally and
  // hid a real 1.0:1 defect in every `aria-hidden` subtree on the page: one
  // leftover node, and the sweep switches itself off.
  //
  // Nor is "a visible pane with some text in it": a 2x2 pane containing a full
  // stop passed that test and switched the gate off just as effectively. What
  // makes a page inert is a *modal* — the thing `MatDialog` marks with a dialog
  // role and `aria-modal`, and the same thing that puts `aria-hidden` on the
  // siblings this rule then trusts. A select panel or a menu is not modal and
  // does not get to silence anything.
  //
  // Semantics alone are not that state either: a 2x2 pane with a `role="dialog"`
  // inside it silenced the gate exactly as the full stop had. A modal is a thing
  // on the screen, so the dialog has to be painted at a size a dialog is — the
  // smallest one in this app is two orders of magnitude past this floor, and the
  // point of the floor is that a probe cannot fake it invisibly.
  const modal = Array.from(
    doc.querySelectorAll<HTMLElement>('.cdk-overlay-container .cdk-overlay-pane')
  ).some((pane) => {
    if (!visible(pane) || !(pane.textContent ?? '').trim()) {
      return false;
    }
    const dialog = pane.querySelector<HTMLElement>(
      '[role=dialog], [role=alertdialog], [aria-modal=true], mat-dialog-container, .mat-dialog-container'
    );
    if (!dialog) {
      return false;
    }
    const box = dialog.getBoundingClientRect();
    return box.width >= 64 && box.height >= 64;
  });
  const inert = (element: HTMLElement): boolean =>
    modal && !element.closest('.cdk-overlay-container') && !!element.closest('[aria-hidden=true]');

  // WCAG 1.4.11: a graphical object needed to understand the content clears 3:1.
  // An icon-only control is that by definition — you cannot press what you
  // cannot see — so every painted SVG shape is measured, not a list of the ones
  // someone remembered. Icons that merely decorate a text label are exempt, and
  // that is the only exemption.
  doc.body.querySelectorAll<SVGElement>('svg').forEach((svg) => {
    const control = svg.parentElement?.closest<HTMLElement>(
      'button, a, [role=button], [role=link], [role=menuitem], [role=tab]'
    );
    const labelled = !!control && visibleText(control).length > 0;
    const host = svg.parentElement as HTMLElement | null;
    if (labelled || !host || !visible(host) || exempt(host) || inert(host)) {
      return;
    }
    const { ratio, detail, unmeasurable, reviewedAs } = glyphRatio(svg, scrims);
    if (unmeasurable && reviewedAs) {
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

  // Not every icon is an `svg`. Material paints the select caret as a CSS
  // triangle — a 0x0 box with coloured borders — so `glyphRatio()` cannot see it
  // by construction, and "the caret is covered" was a false claim for a round.
  // This is the general shape of that trick, not a selector for one component.
  doc.body.querySelectorAll<HTMLElement>('*').forEach((element) => {
    if (!visible(element) || exempt(element) || inert(element)) {
      return;
    }
    // A mark is not always the element's own box. Material draws several of these
    // in `::before`/`::after`, which `getComputedStyle(el)` cannot see at all, so
    // a pseudo-element caret was invisible to the gate by construction.
    const surfaces: { style: CSSStyleDeclaration; label: string }[] = [
      { style: getComputedStyle(element), label: '' },
      ...(['::before', '::after'] as const)
        .map((pseudo) => ({ style: getComputedStyle(element, pseudo), label: pseudo }))
        .filter(({ style }) => {
          const content = style.content || 'none';
          return content !== 'none' && content !== 'normal';
        }),
    ];
    surfaces.forEach(({ style, label }) => measureMark(element, style, label));
  });

  function measureMark(element: HTMLElement, style: CSSStyleDeclaration, label: string): void {
    const paints = borderPaints(style);
    // Shape-agnostic on purpose. The first version required a 0x0 box with
    // exactly one painted side, which is *one* way to draw a caret: a rotated
    // two-border chevron, an L-shaped corner mark and a two-tone triangle all
    // have boxes and two painted sides, and all three walked past the gate. Nor
    // is a four-sided box exempt — that rule was there to skip elements whose
    // borders all reported `currentColor` at zero width, which `borderPaints()`
    // now filters properly — and 24px was too small a ceiling to catch a 32px
    // mark. What identifies a mark is that it paints borders and nothing else.
    //
    // The pseudo-element's own box is the one to size-check, not its host's: the
    // host is an ordinary control and is usually larger than any ceiling.
    const [width, height] = label
      ? [parseFloat(style.width) || 0, parseFloat(style.height) || 0]
      : [element.clientWidth, element.clientHeight];
    const glyphish =
      paints.length > 0 &&
      indicative(element) &&
      (!!label || !element.children.length) &&
      (!!label || !(element.textContent ?? '').trim()) &&
      parseColour(style.backgroundColor).a === 0 &&
      width <= 64 &&
      height <= 64;
    if (!glyphish) {
      return;
    }
    const host = label ? element : hostSurface(element);
    if (!host) {
      return;
    }
    const { colour: background, beneath, over, opacity, unmeasurable, artwork } = paintedBackground(
      host,
      scrims
    );
    if (unmeasurable) {
      if (!reviewed(artwork)) {
        findings.push({
          where: `${describe(element)}${label} (css indicator)`,
          text: 'css-painted indicator',
          required: 3,
          ratio: 0,
          detail: `UNMEASURABLE (${unmeasurable})`,
        });
      }
      return;
    }
    // A shape is legible if *any* of the colours it paints with is: a two-tone
    // triangle with one visible half is visible. Reporting the worst side turned
    // ordinary two-colour marks into defects.
    const painted = paints.map((colour) =>
      applyOver(composite({ ...colour, a: colour.a * opacity }, beneath), over)
    );
    const ratios = painted.map((colour) => ratioOf(colour, background));
    const best = Math.max(...ratios);
    if (best + 0.005 < 3) {
      findings.push({
        where: `${describe(element)}${label} (css indicator)`,
        text: 'css-painted indicator',
        required: 3,
        ratio: best,
        detail: `border ${round(painted[ratios.indexOf(best)])} on ${round(background)}`,
      });
    }
  }

  doc.body.querySelectorAll<HTMLElement>('*').forEach((element) => {
    const own = Array.from(element.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => (node.textContent ?? '').trim())
      .join(' ')
      .trim();

    if (!own || !visible(element) || exempt(element) || inert(element)) {
      return;
    }

    const required = requiredRatio(element);
    const { ratio, detail, unmeasurable, reviewedAs } = contrastRatio(element, scrims);
    if (unmeasurable && reviewedAs) {
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
