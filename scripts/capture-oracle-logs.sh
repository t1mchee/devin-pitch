#!/usr/bin/env bash
# Captures the raw transcripts behind every oracle number quoted in docs/evidence.
# Run from bofa-digital-banking. Writes to docs/evidence/oracle-logs/.
set -u
cd /home/ubuntu/repos/devin-pitch/bofa-digital-banking
OUT=/home/ubuntu/repos/devin-pitch/docs/evidence/oracle-logs
mkdir -p "$OUT"
OVR=libs/ui-core/src/lib/theming/_overrides.scss
PROBES=apps/retail-banking-e2e/src/support/override-probes.ts
cp "$OVR" /tmp/_overrides.orig

run() { echo "=== $1 :: $(date -u +%FT%TZ) ==="; npm run visual 2>&1 | sed 's/\x1b\[[0-9;]*m//g'; }

# 1-3. repeat runs on the pinned renderer, unmodified tree -> the noise floor
for i in 1 2 3; do run "repeat-run-$i" > "$OUT/noise-repeat-$i.log"; done

# 4. fault injection: a brand-colour regression a ratio budget would wave through
python3 - <<'EOF'
p='libs/ui-core/src/lib/theming/_overrides.scss'
s=open(p).read().replace('$boa-slate-900','$boa-red-600',1)
open(p,'w').write(s)
EOF
run "fault-injection-header-colour" > "$OUT/fault-injection-colour.log"
cp /tmp/_overrides.orig "$OVR"

# 5-9. delete-the-rule: does each probe actually fail without the CSS it claims to protect?
delete_block() { python3 - "$1" <<'EOF'
import sys
p='libs/ui-core/src/lib/theming/_overrides.scss'
s=open(p).read()
block=sys.argv[1]
assert block in s, block
open(p,'w').write(s.replace(block,'',1))
EOF
}

declare -A CASES
CASES[ov05d]='  .mat-row:nth-child(even) {
    background: bofa.$boa-slate-50;
  }
'
CASES[ov07]='  .mat-option.mat-active {
    background: rgba(bofa.$boa-red-600, 0.08);
  }
'
CASES[ov08]='  .mat-option.mat-selected:not(.mat-option-disabled) {
    color: bofa.$boa-red-600;
  }
'
for k in ov05d ov07 ov08; do
  cp /tmp/_overrides.orig "$OVR"
  if delete_block "${CASES[$k]}"; then
    run "delete-rule-$k" > "$OUT/delete-rule-$k.log"
  else
    echo "block not found for $k" > "$OUT/delete-rule-$k.log"
  fi
done
cp /tmp/_overrides.orig "$OVR"

# 10. host renderer against container baselines -> why the image is digest-pinned
echo "=== host-renderer (not the pinned image) :: $(date -u +%FT%TZ) ===" > "$OUT/host-renderer-drift.log"
npx nx e2e retail-banking-e2e --skip-nx-cache 2>&1 | sed 's/\x1b\[[0-9;]*m//g' >> "$OUT/host-renderer-drift.log"

git -C /home/ubuntu/repos/devin-pitch status --porcelain -- bofa-digital-banking > "$OUT/../oracle-logs-tree-clean.txt"
echo DONE
