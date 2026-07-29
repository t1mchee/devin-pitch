import { Directive, Input, OnInit } from '@angular/core';

import { AnalyticsService, InsightPayload } from './analytics.service';

/**
 * Fires a page-view event.
 *
 * `viewPayload` is initialised in its field declaration while also being an
 * `@Input`. Under `useDefineForClassFields` (TypeScript 5 / ES2022 targets,
 * which Angular moves to during this upgrade) field declarations are defined
 * rather than assigned, which changes when this initialiser runs relative to
 * input binding.
 */
@Directive({
  selector: '[bofaTrackView]',
})
export class TrackViewDirective implements OnInit {
  @Input('bofaTrackView') viewName = 'unknown-view';
  @Input() viewPayload: InsightPayload = { channel: 'web', pii: false };

  constructor(private readonly analytics: AnalyticsService) {}

  ngOnInit(): void {
    this.analytics.track('page_view', { view: this.viewName, ...this.viewPayload });
  }
}
