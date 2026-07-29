/**
 * Computed-style probes: one per intent expressed in `_overrides.scss`.
 *
 * Why this exists, when a pixel oracle already does. A screenshot proves the
 * surface looks the same; it cannot prove *why*. Three failure modes from the
 * control run against an external design system
 * (docs/evidence/CONTROL-external-design-system.md) got past a pixel diff:
 *
 *   1. an override rewritten onto a selector that matches nothing, where the
 *      library default happens to equal the brand value — invisible in the
 *      light theme, wrong in the dark one;
 *   2. one selector in a comma-separated list left unmigrated;
 *   3. a correctly renamed selector that then loses the specificity battle to
 *      Material's own rule.
 *
 * All three are visible the moment you ask the running app for the computed
 * value of the property the override exists to control. That is what this file
 * does: it turns each OV-nn *intent* into an assertion about the rendered DOM,
 * independent of which Material internal currently carries it.
 *
 * When Material moves an internal, the probe's `target` is expected to change —
 * that edit is the migration work, and it is reviewable. The `expect` values are
 * NOT expected to change: they are the contract. Changing one is changing what
 * the customer sees.
 */
export interface OverrideProbe {
  /** The override this asserts, as numbered in `_overrides.scss`. */
  ov: string;
  /** The intent in one line — what a reviewer has to preserve. */
  intent: string;
  /** Showcase route to render. */
  component: string;
  /** Optional overlay to open before probing. */
  open?: 'select' | 'datepicker' | 'autocomplete' | 'dialog';
  /** Optional interaction before probing. */
  act?: 'focus-keyboard';
  /** Element carrying the styled property today. */
  target: string;
  /** Computed properties and the values the intent requires. */
  expect: Record<string, string>;
}

const RED_600 = 'rgb(200, 16, 46)';
const BLUE_500 = 'rgb(1, 33, 105)';
const SLATE_50 = 'rgb(246, 247, 249)';
const SLATE_100 = 'rgb(236, 238, 242)';
const SLATE_300 = 'rgb(199, 204, 214)';
const SLATE_600 = 'rgb(93, 102, 115)';
const SLATE_900 = 'rgb(18, 22, 29)';
const SUCCESS_600 = 'rgb(11, 122, 59)';

export const OVERRIDE_PROBES: OverrideProbe[] = [
  {
    ov: 'OV-01',
    intent: 'Disabled field label stays legible (WCAG AA) against the slate palette',
    component: 'form-field',
    target: '[data-variant=disabled] .mat-form-field-label',
    expect: { color: SLATE_600 },
  },
  {
    ov: 'OV-01b',
    intent: 'Field underline uses the BoA slate rule, not the Material default',
    component: 'form-field',
    target: '[data-variant=default] .mat-form-field-underline',
    expect: { 'background-color': SLATE_300 },
  },
  {
    ov: 'OV-02',
    intent: 'Error text sits on a 20px line box so field height never jumps on validation',
    component: 'form-field',
    target: '[data-variant=error] .mat-form-field-subscript-wrapper',
    expect: { 'line-height': '20px', 'min-height': '20px', 'margin-top': '6px' },
  },
  {
    ov: 'OV-03',
    intent: 'Primary button is brand red with 8px optical icon/label spacing',
    component: 'button',
    target: '[data-variant=default] .mat-button-wrapper',
    expect: { gap: '8px', 'letter-spacing': '0.28px', display: 'inline-flex' },
  },
  {
    ov: 'OV-04',
    intent: 'Keyboard focus ring is visible on white and on slate-50',
    component: 'button',
    act: 'focus-keyboard',
    target: '[data-variant=default] button.cdk-keyboard-focused .mat-button-focus-overlay',
    expect: { 'outline-color': BLUE_500, 'outline-width': '2px', 'outline-style': 'solid' },
  },
  {
    ov: 'OV-05',
    intent: 'Statement rows keep fixed heights so 50 rows paginate predictably in print',
    component: 'table',
    target: '.bofa-table .mat-row',
    expect: { height: '40px' },
  },
  {
    ov: 'OV-05b',
    intent: 'Currency figures use tabular numerals and right-align on the decimal',
    component: 'table',
    target: '.bofa-table .mat-cell.bofa-cell--numeric',
    expect: { 'font-variant-numeric': 'tabular-nums', 'text-align': 'right' },
  },
  {
    ov: 'OV-05c',
    intent: 'Header cells carry the slate-900 brand weight, not the Material grey',
    component: 'table',
    target: '.bofa-table .mat-header-cell',
    expect: { color: SLATE_900, 'font-weight': '600' },
  },
  {
    ov: 'OV-05d',
    intent: 'Zebra striping on even rows for statement scanability',
    component: 'table',
    target: '.bofa-table .mat-row:nth-child(even)',
    expect: { 'background-color': SLATE_50 },
  },
  {
    ov: 'OV-06',
    intent: 'Sort arrow is dimmed until hover so it does not read as an active filter',
    component: 'table',
    target: '.bofa-table .mat-sort-header-arrow',
    expect: { opacity: '0.35' },
  },
  {
    ov: 'OV-08',
    intent: 'Selected option is brand red, not accent navy (navy reads as a link here)',
    component: 'select',
    open: 'select',
    target: '.bofa-select-panel .mat-option.mat-selected',
    expect: { color: RED_600 },
  },
  {
    ov: 'OV-09',
    intent: 'Consent toggle is unambiguous at arm’s length on a tablet',
    component: 'slide-toggle',
    target: '[data-variant=default] .mat-slide-toggle-bar',
    expect: { width: '40px', height: '16px' },
  },
  {
    ov: 'OV-09b',
    intent: 'A granted consent reads green, not brand red',
    component: 'slide-toggle',
    target: '[data-variant=default] .mat-checked .mat-slide-toggle-thumb',
    expect: { 'background-color': SUCCESS_600 },
  },
  {
    ov: 'OV-10',
    intent: 'Section ink bar is legible on a 4K branch display',
    component: 'tabs',
    target: '.bofa-tabs:not(.bofa-legacy-shell) .mat-ink-bar',
    expect: { height: '3px', 'background-color': RED_600 },
  },
  {
    ov: 'OV-11',
    intent: 'Category chips keep a 28px rhythm inside the filter drawer',
    component: 'chips',
    target: '[data-variant=default] .mat-chip.mat-standard-chip',
    expect: { height: '28px', 'border-radius': '14px', 'background-color': SLATE_100 },
  },
  {
    ov: 'OV-12',
    intent: 'Step-up dialog matches the mobile MFA modal: tight padding, squared corners',
    component: 'dialog',
    open: 'dialog',
    target: '.mat-dialog-container',
    expect: { padding: '20px 24px', 'border-radius': '4px' },
  },
  {
    ov: 'OV-12b',
    intent: 'A short confirmation body never acquires an inner scrollbar',
    component: 'dialog',
    open: 'dialog',
    target: '.mat-dialog-container .mat-dialog-content',
    expect: { overflow: 'visible', margin: '0px', padding: '0px' },
  },
  {
    ov: 'OV-13',
    intent: 'Selected day is brand red; today is outlined, not a second filled circle',
    component: 'datepicker',
    open: 'datepicker',
    target: '.mat-calendar-body-selected',
    expect: { 'background-color': RED_600, color: 'rgb(255, 255, 255)' },
  },
  {
    ov: 'OV-14',
    intent: 'Range label stays on screen on a 1280px branch terminal',
    component: 'paginator',
    target: '.bofa-paginator .mat-paginator-range-label',
    expect: { margin: '0px 16px', 'font-variant-numeric': 'tabular-nums' },
  },
  {
    ov: 'OV-15',
    intent: 'Payee panel never covers the Confirmation of Payee copy',
    component: 'autocomplete',
    open: 'autocomplete',
    target: '.bofa-autocomplete-panel',
    expect: { 'max-height': '224px' },
  },
  {
    ov: 'OV-16',
    intent: 'Amount entry right-aligns on tabular numerals',
    component: 'currency-input',
    target: '[data-variant=default] .mat-input-element',
    expect: { 'text-align': 'right', 'font-variant-numeric': 'tabular-nums' },
  },
  {
    ov: 'OV-17',
    intent: 'Compact density is materially shorter than the default field',
    component: 'form-field',
    target: '[data-variant=compact] .mat-form-field-infix',
    expect: { 'padding-top': '6.4px', 'padding-bottom': '6.4px' },
  },
];
