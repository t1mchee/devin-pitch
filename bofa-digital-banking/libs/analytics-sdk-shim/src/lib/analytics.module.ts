import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TrackViewDirective } from './track-view.directive';

@NgModule({
  imports: [CommonModule],
  declarations: [TrackViewDirective],
  exports: [TrackViewDirective],
})
export class AnalyticsSdkShimModule {}
