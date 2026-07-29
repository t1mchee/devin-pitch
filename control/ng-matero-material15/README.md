# control/ng-matero-material15

Artefacts for the control experiment described in
[`docs/evidence/CONTROL-external-design-system.md`](../../docs/evidence/CONTROL-external-design-system.md).

Target: [ng-matero/ng-matero](https://github.com/ng-matero/ng-matero) @ `v14.3.0` (MIT).
Nothing here was pushed upstream; no upstream PR was opened.

```
patches/0001-ng-matero-14.3.0-to-angular-material-15.patch   full migration diff (package-lock.json excluded)
patches/diffstat.txt                                          68 files, +260 / -225
logs/baseline-*.log                                           clean-clone build / test / lint, before any change
logs/mig-*.log                                                every ng update / schematic / build / test / lint run
logs/final-*.log                                              post-migration gates
evidence/pixel-diffs.md                                       per-route pixel counts, 1440x900
evidence/probes-v{14,15}.json                                 rendered-DOM selector census, 17 routes
evidence/runtime-measurements-*.json                          getComputedStyle before / after schematic / after fixes
evidence/topmenu-*.json                                       top-nav layout measurements
evidence/screenshots/                                         v14 vs v15 for the routes discussed in the report
```

## Reproducing

```bash
git clone https://github.com/ng-matero/ng-matero && cd ng-matero
git checkout v14.3.0
nvm use 16.20.2
npm ci
export CHROME_BIN=<path to a real chrome binary>   # `ng test` cannot start otherwise
git apply ../patches/0001-ng-matero-14.3.0-to-angular-material-15.patch
npm install                                        # regenerates package-lock.json
npx ng build --configuration production && npm run test:ci
```
