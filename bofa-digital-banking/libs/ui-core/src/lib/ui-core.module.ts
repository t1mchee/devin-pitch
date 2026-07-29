import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { BofaAutocompleteComponent } from './components/bofa-autocomplete/bofa-autocomplete.component';
import { BofaButtonComponent } from './components/bofa-button/bofa-button.component';
import { BofaChipsComponent } from './components/bofa-chips/bofa-chips.component';
import { BofaCurrencyInputComponent } from './components/bofa-currency-input/bofa-currency-input.component';
import { BofaDatepickerComponent } from './components/bofa-datepicker/bofa-datepicker.component';
import { BofaDialogComponent } from './components/bofa-dialog/bofa-dialog.component';
import { BofaFormFieldComponent } from './components/bofa-form-field/bofa-form-field.component';
import { BofaPaginatorComponent } from './components/bofa-paginator/bofa-paginator.component';
import { BofaSelectComponent } from './components/bofa-select/bofa-select.component';
import { BofaSlideToggleComponent } from './components/bofa-slide-toggle/bofa-slide-toggle.component';
import { BofaTableComponent } from './components/bofa-table/bofa-table.component';
import { BofaTabsComponent } from './components/bofa-tabs/bofa-tabs.component';
import { BofaResponsiveGridComponent } from './layout/bofa-responsive-grid/bofa-responsive-grid.component';

const COMPONENTS = [
  BofaAutocompleteComponent,
  BofaButtonComponent,
  BofaChipsComponent,
  BofaCurrencyInputComponent,
  BofaDatepickerComponent,
  BofaDialogComponent,
  BofaFormFieldComponent,
  BofaPaginatorComponent,
  BofaSelectComponent,
  BofaSlideToggleComponent,
  BofaTableComponent,
  BofaTabsComponent,
  BofaResponsiveGridComponent,
];

const MATERIAL = [
  MatAutocompleteModule,
  MatButtonModule,
  MatChipsModule,
  MatDatepickerModule,
  MatDialogModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatNativeDateModule,
  MatPaginatorModule,
  MatSelectModule,
  MatSlideToggleModule,
  MatSortModule,
  MatTableModule,
  MatTabsModule,
];

/**
 * The single entry point for the BoA design system.
 *
 * Consuming applications import this module and nothing from `@angular/material`
 * directly. That rule is what makes a Material major upgrade a change in one
 * library rather than a change in every application.
 */
@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FlexLayoutModule, ...MATERIAL],
  declarations: [...COMPONENTS],
  exports: [...COMPONENTS, ReactiveFormsModule],
  entryComponents: [BofaDialogComponent],
})
export class UiCoreModule {}
