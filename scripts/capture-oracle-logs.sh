#!/usr/bin/env bash
# Captures the raw transcripts behind every oracle number quoted in docs/evidence.
# Run from anywhere. Writes to docs/evidence/oracle-logs/.
#
# Every experiment here is "break one thing, prove the gate notices". The tree is
# restored from a pristine copy before and after each case, so a failed case
# cannot leak into the next one.
set -u
REPO=/home/ubuntu/repos/devin-pitch
cd "$REPO/bofa-digital-banking"
OUT="$REPO/docs/evidence/oracle-logs"
mkdir -p "$OUT"

OVR=libs/ui-core/src/lib/theming/_overrides.scss
THEME=libs/ui-core/src/lib/theming/bofa-theme.scss
SPEC=apps/retail-banking-e2e/src/e2e/override-contract.cy.ts
cp "$OVR" /tmp/_overrides.orig
cp "$THEME" /tmp/_theme.orig
cp "$SPEC" /tmp/_spec.orig

restore() {
  cp /tmp/_overrides.orig "$OVR"
  cp /tmp/_theme.orig "$THEME"
  cp /tmp/_spec.orig "$SPEC"
}

run() { echo "=== $1 :: $(date -u +%FT%TZ) ==="; npm run visual 2>&1 | sed 's/\x1b\[[0-9;]*m//g'; }

# Deletes an exact block from a file, or aborts loudly rather than capturing a
# log of an experiment that never happened.
patch_out() {
  python3 - "$1" "$2" <<'EOF'
import sys
path, block = sys.argv[1], sys.argv[2]
s = open(path).read()
assert block in s, f'block not found in {path}: {block[:60]!r}'
open(path, 'w').write(s.replace(block, '', 1))
EOF
}

# 1-3. repeat runs on the pinned renderer, unmodified tree -> the noise floor
for i in 1 2 3; do restore; run "repeat-run-$i" > "$OUT/noise-repeat-$i.log"; done

# 4. fault injection: a brand-colour regression a ratio budget would wave through
restore
python3 - <<'EOF'
p = 'libs/ui-core/src/lib/theming/_overrides.scss'
s = open(p).read().replace('$boa-slate-900', '$boa-red-600', 1)
open(p, 'w').write(s)
EOF
run "fault-injection-header-colour" > "$OUT/fault-injection-colour.log"

# 5-12. delete-the-rule: does each gate actually fail without the code it protects?
case_file() { case "$1" in theme) echo "$THEME";; spec) echo "$SPEC";; *) echo "$OVR";; esac; }

declare -A CASES FILES
FILES[ov05d]=ovr
CASES[ov05d]='  .mat-row:nth-child(even) {
    background: bofa.$boa-slate-50;
  }
'
FILES[ov07]=ovr
CASES[ov07]='  .mat-option.mat-active {
    background: rgba(bofa.$boa-red-600, 0.08);
  }
'
FILES[ov08]=ovr
CASES[ov08]='  .mat-option.mat-selected:not(.mat-option-disabled) {
    color: bofa.$boa-red-600;
  }
'
FILES[ov18]=ovr
CASES[ov18]='  .mat-tab-header {
    border-bottom-width: 0;
  }
'
# The dark zebra value: the defect the dark block itself once certified as correct.
FILES[dark-zebra]=ovr
CASES[dark-zebra]='  .bofa-theme-dark & .mat-row:nth-child(even) {
    background: bofa.$boa-slate-750;
  }
'
# The disabled *value* colour and the error colour: both were AA failures in the
# LIGHT theme, i.e. in the shipping one.
FILES[ov01c]=ovr
CASES[ov01c]='  &.mat-form-field-disabled .mat-input-element {
    color: bofa.$boa-slate-600;
  }
'
FILES[ov01d]=ovr
CASES[ov01d]='  .mat-error {
    color: bofa.$boa-danger-600;
  }
'
# The dark ink bar tint: a non-text state indicator at 2.24:1 without it.
FILES[dark-inkbar]=ovr
CASES[dark-inkbar]='  .bofa-theme-dark &.mat-primary .mat-ink-bar {
    background-color: bofa.$boa-red-300;
  }
'
# The dark page surface itself: the two declarations whose absence made five
# controls render white-on-white while every probe stayed green.
FILES[dark-surface]=theme
CASES[dark-surface]='  background: map.get(map.get($boa-dark-theme, background), background);
  color: map.get(map.get($boa-dark-theme, foreground), text);
'
# And the oracle: put back the alpha-blind parse and prove its own tests catch it.
FILES[oracle-alpha]=spec
CASES[oracle-alpha]='  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };'

for k in ov05d ov07 ov08 ov18 dark-zebra ov01c ov01d dark-inkbar dark-surface oracle-alpha; do
  restore
  target=$(case_file "${FILES[$k]}")
  if [ "$k" = oracle-alpha ]; then
    python3 - <<'EOF'
p = 'apps/retail-banking-e2e/src/e2e/override-contract.cy.ts'
s = open(p).read()
old = '  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };'
new = '  return { r: parts[0], g: parts[1], b: parts[2], a: 1 }; // ALPHA-BLIND, deliberately'
assert old in s
open(p, 'w').write(s.replace(old, new, 1))
EOF
    run "regress-oracle-alpha-blind" > "$OUT/delete-rule-$k.log"
  elif patch_out "$target" "${CASES[$k]}"; then
    run "delete-rule-$k" > "$OUT/delete-rule-$k.log"
  else
    echo "block not found for $k — experiment NOT run" > "$OUT/delete-rule-$k.log"
  fi
done
restore

# 13. host renderer against container baselines -> why the image is digest-pinned
echo "=== host-renderer (not the pinned image) :: $(date -u +%FT%TZ) ===" > "$OUT/host-renderer-drift.log"
npx nx e2e retail-banking-e2e --skip-nx-cache 2>&1 | sed 's/\x1b\[[0-9;]*m//g' >> "$OUT/host-renderer-drift.log"

git -C "$REPO" status --porcelain -- bofa-digital-banking > "$OUT/../oracle-logs-tree-clean.txt"
echo DONE
