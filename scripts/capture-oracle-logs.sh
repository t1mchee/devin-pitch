#!/usr/bin/env bash
# Captures the raw transcripts behind every oracle number quoted in docs/evidence.
# Run from anywhere. Writes to docs/evidence/oracle-logs/.
#
# Every experiment here is "break one thing, prove the gate notices". The tree is
# restored from a pristine copy before and after each case, so a failed case
# cannot leak into the next one, and each edit is asserted to have applied —
# a log of an experiment that silently never happened is worse than no log.
set -u
# One run at a time. Two copies of this script patch the same four files, so a
# second one silently shifts every log by an experiment: `delete-rule-ov08.log`
# came back holding OV-18's failures, which is a plausible-looking transcript of
# an experiment that never happened. That is the worst failure mode available to
# an evidence script, so it is a lock rather than a warning.
exec 9> /tmp/oracle-capture.lock
if ! flock -n 9; then
  echo "another capture is already running (/tmp/oracle-capture.lock)" >&2
  exit 1
fi
REPO=/home/ubuntu/repos/devin-pitch
cd "$REPO/bofa-digital-banking"
OUT="$REPO/docs/evidence/oracle-logs"
mkdir -p "$OUT"

FILES=(
  libs/ui-core/src/lib/theming/_overrides.scss
  libs/ui-core/src/lib/theming/bofa-theme.scss
  apps/retail-banking-e2e/src/support/contrast.ts
  apps/retail-banking/src/app/app.component.ts
)

for f in "${FILES[@]}"; do cp "$f" "/tmp/oracle-$(basename "$f").orig"; done
# The end-of-run leak check compares against the tree as it was *before* the run,
# not against HEAD: capturing evidence for a change that is still uncommitted is
# the normal case, and comparing to HEAD reported those edits as a leak.
git -C "$REPO" status --porcelain -- bofa-digital-banking > /tmp/oracle-tree-before.txt
restore() { for f in "${FILES[@]}"; do cp "/tmp/oracle-$(basename "$f").orig" "$f"; done; }

run() { echo "=== $1 :: $(date -u +%FT%TZ) ==="; npm run visual 2>&1 | sed 's/\x1b\[[0-9;]*m//g'; }

# Applies one exact replacement, or exits non-zero rather than capturing a log of
# an experiment that never happened.
patch() {
  python3 - "$1" "$2" "$3" <<'EOF'
import sys
path, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(path).read()
if old not in s:
    sys.stderr.write(f'block not found in {path}: {old[:70]!r}\n')
    sys.exit(1)
open(path, 'w').write(s.replace(old, new, 1))
EOF
}

experiment() { # name file old new
  restore
  if patch "$2" "$3" "$4"; then
    run "$1" > "$OUT/$1.log"
  else
    echo "block not found — experiment NOT run" > "$OUT/$1.log"
  fi
}

OVR=libs/ui-core/src/lib/theming/_overrides.scss
THEME=libs/ui-core/src/lib/theming/bofa-theme.scss
CONTRAST=apps/retail-banking-e2e/src/support/contrast.ts
ROOT=apps/retail-banking/src/app/app.component.ts

# 1-3. repeat runs on the pinned renderer, unmodified tree -> the noise floor
for i in 1 2 3; do restore; run "repeat-run-$i" > "$OUT/noise-repeat-$i.log"; done

# 4. fault injection: a brand-colour regression a ratio budget would wave through
experiment fault-injection-colour "$OVR" '$boa-slate-900' '$boa-red-600'

# 5-12. delete-the-rule: does each gate actually fail without the code it protects?
experiment delete-rule-ov05d "$OVR" '  .mat-row:nth-child(even) {
    background: bofa.$boa-slate-50;
  }
' ''
experiment delete-rule-ov07 "$OVR" '  .mat-option.mat-active {
    background: rgba(bofa.$boa-red-600, 0.08);
  }
' ''
experiment delete-rule-ov08 "$OVR" '  .mat-option.mat-selected:not(.mat-option-disabled) {
    color: bofa.$boa-red-600;
  }
' ''
experiment delete-rule-ov18 "$OVR" '  .mat-tab-header {
    border-bottom-width: 0;
  }
' ''
# The dark zebra value: the defect the dark block itself once certified as correct.
experiment delete-rule-dark-zebra "$OVR" '  .bofa-theme-dark & .mat-row:nth-child(even) {
    background: bofa.$boa-slate-750;
  }
' ''
# The disabled *value* colour and the error colour: both were AA failures in the
# LIGHT theme, i.e. in the shipping one.
experiment delete-rule-ov01c "$OVR" '  &.mat-form-field-disabled .mat-input-element {
    color: bofa.$boa-slate-600;
  }
' ''
experiment delete-rule-ov01d "$OVR" '  .mat-error {
    color: bofa.$boa-danger-600;
  }
' ''
# OV-01f: the invalid label and its required marker in the LIGHT theme, found by
# the legibility sweep on its first run. Deleting it must fail the sweep, not the
# fourteen-selector list — that is the whole claim being evidenced.
experiment delete-rule-ov01f "$OVR" '  &.mat-form-field-invalid .mat-form-field-label,
  &.mat-form-field-invalid .mat-form-field-label .mat-form-field-required-marker {
    color: bofa.$boa-danger-600;
  }
' ''
# The dark ink bar tint: a non-text state indicator at 2.24:1 without it.
experiment delete-rule-dark-inkbar "$OVR" '  .bofa-theme-dark &.mat-primary .mat-ink-bar {
    background-color: bofa.$boa-red-300;
  }
' ''
# The dark page surface itself: the two declarations whose absence made five
# controls render white-on-white while every probe stayed green.
experiment delete-rule-dark-surface "$THEME" '  background: map.get(map.get($boa-dark-theme, background), background);
  color: map.get(map.get($boa-dark-theme, foreground), text);
' ''
# And one layer up: the application root painting opaque white over the themed
# page. This is the round-7 defect. It is the interesting case in this file
# because the *component* probes and every snapshot stay green — only the sweep
# over /accounts, /__showcase and /sign-in can see it.
experiment regress-root-surface "$ROOT" 'background: var(--bofa-surface);' 'background: #fff;'

# 13-15. the oracle's own failure modes, put back one at a time.
experiment regress-oracle-alpha-blind "$CONTRAST" \
  '  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };' \
  '  return { r: parts[0], g: parts[1], b: parts[2], a: 1 }; // ALPHA-BLIND, deliberately'
experiment regress-oracle-opacity-blind "$CONTRAST" \
  '  const foreground = applyOver(
    composite({ ...declared, a: declared.a * opacity }, beneath),
    over
  );' \
  '  const foreground = applyOver(composite(declared, beneath), over); // OPACITY-BLIND'
experiment regress-oracle-gradient-blind "$CONTRAST" \
  '  const image = style.backgroundImage;
  return !!image && image !== '"'"'none'"'"';' \
  '  return false; // GRADIENT-BLIND, deliberately'

# 16-17. the two round-8 false passes, put back one at a time. Both were the same
# shape of mistake — a special case where a general rule belonged — and both let
# an *invisible* render pass, so a transcript of the gate failing without them is
# the only evidence that the generalisation is load-bearing.
experiment regress-oracle-glyph-blind "$CONTRAST" \
  "  doc.body.querySelectorAll<SVGElement>('svg').forEach((svg) => {" \
  '  ([] as SVGElement[]).forEach((svg) => { // GLYPH-BLIND, deliberately'
experiment regress-oracle-scrim-blind "$CONTRAST" \
  '  return scrims
    .filter(' \
  '  return ([] as Scrim[]) // SCRIM-BLIND, deliberately
    .filter('

# 18. and the product fault the glyph sweep exists to catch: the paginator arrows
# recoloured to the surface they sit on. No text node changes, no snapshot budget
# is threatened, and the control you page a statement with becomes invisible.
experiment fault-injection-glyph "$OVR" '  .mat-paginator-range-label {' '  .mat-paginator-navigation-next svg,
  .mat-paginator-navigation-previous svg {
    fill: #fff; // FAULT INJECTION: invisible arrows on the white paginator
  }

  .mat-paginator-range-label {'
restore

# 19-22. the round-9 approximations, each restored to the version a single CSS
# declaration defeated. Every one of these was a green gate over a defect (or a
# red gate over correct code) that a reviewer found by hand.
experiment regress-oracle-zorder-blind "$CONTRAST" \
  '  const [above, below] = [branchLevel(over, scrim), branchLevel(under, element)];' \
  '  // Z-ORDER-BLIND, deliberately: both levels forced equal, so document order decides
  const [above, below] = [branchLevel(over, scrim) * 0, branchLevel(under, element) * 0];'
experiment regress-oracle-fold-blind "$CONTRAST" \
  '  const offScreen = rect.right <= 0 || rect.bottom <= 0;' \
  '  const view = element.ownerDocument.defaultView; // FOLD-BLIND, deliberately
  const offScreen =
    rect.right <= 0 ||
    rect.bottom <= 0 ||
    (!!view && (rect.left >= view.innerWidth || rect.top >= view.innerHeight));'
experiment regress-oracle-sronly-blind "$CONTRAST" \
  '    const labelled = !!control && visibleText(control).length > 0;' \
  '    const labelled = !!control && (control.textContent ?? "").trim().length > 0; // SR-ONLY-BLIND'
experiment regress-oracle-review-blanket "$CONTRAST" \
  "  const declared = artwork?.getAttribute('data-contrast-reviewed')?.trim();
  return declared && /\\d+(\\.\\d+)?\\s*:\\s*1/.test(declared) ? declared : null;" \
  "  const declared = artwork
    ?.closest<HTMLElement>('[data-contrast-reviewed]')
    ?.getAttribute('data-contrast-reviewed')
    ?.trim(); // REVIEW-BLANKET, deliberately
  return declared || null;"

# 23-26. the round-10 approximations. Same family again: a model that a single
# declaration defeats, in both the false-pass and the false-failure direction.
#
# The stacking model read the maximum z-index over the ancestor chain, so a scrim
# inside a `transform`ed wrapper claimed a level the browser never gives it.
experiment regress-oracle-stacking-blind "$CONTRAST" \
  '  for (const node of path) {
    const style = getComputedStyle(node);
    const z = Number(style.zIndex);
    if (!Number.isNaN(z)) {
      return z;
    }
    if (createsStackingContext(style)) {
      return 0;
    }
  }
  return 0;' \
  '  // STACKING-BLIND, deliberately: the largest z-index anywhere on the chain,
  // as though a stacking context did not contain it.
  return path.reduce((level, node) => {
    const z = Number(getComputedStyle(node).zIndex);
    return Number.isNaN(z) ? level : Math.max(level, z);
  }, 0);'
# The modal rule, in both of the forms that armed it too easily. `MODAL` below is
# the current source; the two experiments revert it to the round-9 version (any
# backdrop element at all) and to the round-10 version (any visible pane with a
# character of text in it — satisfied by a 2x2 pane containing a full stop).
MODAL="  const modal = Array.from(
    doc.querySelectorAll<HTMLElement>('.cdk-overlay-container .cdk-overlay-pane')
  ).some(
    (pane) =>
      visible(pane) &&
      (pane.textContent ?? '').trim().length > 0 &&
      !!pane.querySelector(
        '[role=dialog], [role=alertdialog], [aria-modal=true], mat-dialog-container, .mat-dialog-container'
      )
  );"
experiment regress-oracle-backdrop-armed "$CONTRAST" "$MODAL" \
  "  const modal = !!doc.querySelector('.cdk-overlay-backdrop'); // BACKDROP-ARMED"
experiment regress-oracle-modal-textonly "$CONTRAST" "$MODAL" \
  "  const modal = Array.from( // MODAL-TEXTONLY, deliberately
    doc.querySelectorAll<HTMLElement>('.cdk-overlay-container .cdk-overlay-pane')
  ).some((pane) => visible(pane) && (pane.textContent ?? '').trim().length > 0);"

# The indicator rule, likewise: the round-9 form recognised exactly one way of
# drawing a caret, and the round-10 form still excluded a four-sided box, a 32px
# mark and anything drawn in a pseudo-element.
GLYPHISH='    const [width, height] = label
      ? [parseFloat(style.width) || 0, parseFloat(style.height) || 0]
      : [element.clientWidth, element.clientHeight];
    const glyphish =
      paints.length > 0 &&
      (!!label || !element.children.length) &&
      (!!label || !(element.textContent ?? '"'"''"'"').trim()) &&
      parseColour(style.backgroundColor).a === 0 &&
      width <= 64 &&
      height <= 64;'
experiment regress-oracle-indicator-narrow "$CONTRAST" "$GLYPHISH" \
  '    // INDICATOR-NARROW, deliberately: a 0x0 box with exactly one painted side
    const [width, height] = [element.clientWidth, element.clientHeight];
    const glyphish = paints.length === 1 && width === 0 && height === 0;'
experiment regress-oracle-indicator-r10 "$CONTRAST" "$GLYPHISH" \
  '    // INDICATOR-R10, deliberately: fewer than four sides, 24px, own box only
    const [width, height] = [element.clientWidth, element.clientHeight];
    const glyphish =
      paints.length > 0 &&
      paints.length < 4 &&
      !element.children.length &&
      !(element.textContent ?? '"'"''"'"').trim() &&
      parseColour(style.backgroundColor).a === 0 &&
      width <= 24 &&
      height <= 24;'

# And "clipped away", in both of the forms that got it wrong: a literal string
# match (which false-failed the current sr-only recipe) and "first percentage
# >= 45" (which hid a painted band and showed a box clipped to nothing).
INSET='    const sides = inset[1]
      .trim()
      .split(/\s+/)
      .map((part) => (/^0(px|%|)$/.test(part) ? 0 : part.endsWith('"'"'%'"'"') ? parseFloat(part) : NaN));
    if (sides.length && sides.every((side) => !Number.isNaN(side))) {
      const [top, right = top, bottom = top, left = right] = sides;
      if (top + bottom >= 100 || left + right >= 100) {
        return true;
      }
    }'
experiment regress-oracle-clip-literal "$CONTRAST" "$INSET" \
  '    // CLIP-LITERAL, deliberately: a string match on one spelling of the recipe
    if (inset && /inset\(\s*(4[5-9]|50)/.test(path)) {
      return true;
    }'
experiment regress-oracle-clip-firstvalue "$CONTRAST" "$INSET" \
  '    const first = /(-?\d+(?:\.\d+)?)%/.exec(inset[1]); // CLIP-FIRSTVALUE
    if (first && parseFloat(first[1]) >= 45) {
      return true;
    }'

# Coverage as a yes/no: the layer had to contain the whole box, so a veil eight
# pixels short of the text measured the text as legible.
experiment regress-oracle-cover-contains "$CONTRAST" \
  '  const covers = (other: DOMRect): boolean => {
    const width = Math.min(rect.right, other.right) - Math.max(rect.left, other.left);
    const height = Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top);
    if (width <= 0 || height <= 0) {
      return false;
    }
    const area = rect.width * rect.height;
    return area <= 0 || (width * height) / area >= 0.5;
  };' \
  '  const covers = (other: DOMRect): boolean => // COVER-CONTAINS, deliberately
    other.left <= rect.left &&
    other.right >= rect.right &&
    other.top <= rect.top &&
    other.bottom >= rect.bottom;'

# The last experiment leaves the tree patched: restore before anything else runs,
# or the deliberately-broken helper gets captured — and committed. It has.
restore

# 27. host renderer against container baselines -> why the image is digest-pinned.
# Result is font-dependent and this file is overwritten every capture:
# `host-renderer-drift-prefonts.log` is the same command on the same commit before an
# apt install put Liberation/DejaVu on this host, and is deliberately never re-captured.
echo "=== host-renderer (not the pinned image) :: $(date -u +%FT%TZ) ===" > "$OUT/host-renderer-drift.log"
# Cypress 10.11's Electron segfaults on this box without a real X server, which
# looks exactly like a product failure in the log. `xvfb-run` is the difference
# between evidence and a crash report.
xvfb-run -a --server-args="-screen 0 1280x1024x24" \
  npx nx e2e retail-banking-e2e --skip-nx-cache 2>&1 |
  sed 's/\x1b\[[0-9;]*m//g' >> "$OUT/host-renderer-drift.log"

diff <(cat /tmp/oracle-tree-before.txt) \
  <(git -C "$REPO" status --porcelain -- bofa-digital-banking) \
  > "$OUT/../oracle-logs-tree-clean.txt"
# Not decoration: a missing `restore` once left a deliberately-broken helper in
# the tree, and it was committed. The evidence run now says so out loud.
if [ -s "$OUT/../oracle-logs-tree-clean.txt" ]; then
  echo "TREE NOT RESTORED — an experiment leaked into the working tree:"
  cat "$OUT/../oracle-logs-tree-clean.txt"
  exit 1
fi
echo DONE
