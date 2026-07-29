#!/usr/bin/env bash
# Captures the raw transcripts behind every oracle number quoted in docs/evidence.
# Run from anywhere. Writes to docs/evidence/oracle-logs/.
#
# Every experiment here is "break one thing, prove the gate notices". The tree is
# restored from a pristine copy before and after each case, so a failed case
# cannot leak into the next one, and each edit is asserted to have applied —
# a log of an experiment that silently never happened is worse than no log.
set -u
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

# 19. host renderer against container baselines -> why the image is digest-pinned
echo "=== host-renderer (not the pinned image) :: $(date -u +%FT%TZ) ===" > "$OUT/host-renderer-drift.log"
npx nx e2e retail-banking-e2e --skip-nx-cache 2>&1 | sed 's/\x1b\[[0-9;]*m//g' >> "$OUT/host-renderer-drift.log"

git -C "$REPO" status --porcelain -- bofa-digital-banking > "$OUT/../oracle-logs-tree-clean.txt"
echo DONE
