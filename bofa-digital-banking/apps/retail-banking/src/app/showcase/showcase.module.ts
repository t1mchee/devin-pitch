import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { UiCoreModule } from '@bofa/ui-core';

import { ShowcaseComponent } from './showcase.component';
import { ShowcaseIndexComponent } from './showcase-index.component';

const ROUTES: Routes = [
  { path: '', component: ShowcaseIndexComponent },
  { path: ':component', component: ShowcaseComponent },
];

/**
 * Lazy-loaded so the production route table — which does not reference this
 * module — emits no chunk for it. The showcase is a test surface, not a
 * customer-facing feature.
 */
@NgModule({
  declarations: [ShowcaseComponent, ShowcaseIndexComponent],
  imports: [CommonModule, ReactiveFormsModule, UiCoreModule, RouterModule.forChild(ROUTES)],
})
export class ShowcaseModule {}
