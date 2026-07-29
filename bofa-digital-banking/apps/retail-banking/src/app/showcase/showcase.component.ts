import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { BofaTransactionRow } from '@bofa/ui-core';

import { SAMPLE_ROWS } from '../state/transactions.effects';

export const SHOWCASE_COMPONENTS = [
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
] as const;

export type ShowcaseComponentName = typeof SHOWCASE_COMPONENTS[number];

/**
 * Deterministic render surface for the visual regression suite.
 *
 * Every component is rendered in its default and disabled states, plus an error
 * state where one applies. Nothing here is random or time dependent: the date
 * is fixed and the data set is a constant, because a flaky baseline is worse
 * than no baseline.
 */
@Component({
  selector: 'bofa-showcase',
  templateUrl: './showcase.component.html',
  styleUrls: ['./showcase.component.scss'],
})
export class ShowcaseComponent implements OnInit, OnDestroy {
  private readonly destroyed$ = new Subject<void>();

  component: ShowcaseComponentName = 'button';
  readonly all = SHOWCASE_COMPONENTS;
  readonly rows: BofaTransactionRow[] = SAMPLE_ROWS;

  readonly accounts = [
    { value: 'chk-4410', label: 'Advantage Plus Banking ••4410' },
    { value: 'sav-8821', label: 'Advantage Savings ••8821' },
  ];

  readonly enabled = new FormControl('Jane Q. Customer');
  readonly disabled = new FormControl({ value: 'Locked value', disabled: true });
  readonly errored = new FormControl('');
  readonly toggleOn = new FormControl(true);
  readonly toggleOff = new FormControl({ value: false, disabled: true });
  readonly fixedDate = new FormControl(new Date(2024, 0, 15));
  readonly fixedDateDisabled = new FormControl({ value: new Date(2024, 0, 15), disabled: true });

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    this.errored.markAsTouched();
    this.errored.setErrors({ required: true });

    this.route.paramMap
      .pipe(
        map((params) => (params.get('component') || 'button') as ShowcaseComponentName),
        takeUntil(this.destroyed$)
      )
      .subscribe((component) => (this.component = component));
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
