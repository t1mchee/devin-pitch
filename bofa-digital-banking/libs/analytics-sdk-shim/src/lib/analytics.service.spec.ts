import { TestBed } from '@angular/core/testing';

import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalyticsService);
  });

  it('queues events and drains them once', () => {
    service.track('page_view', { view: 'accounts' });
    service.track('cta_click', { id: 'transfer' });

    const first = service.drain();
    expect(first.map((e) => e.name)).toEqual(['page_view', 'cta_click']);
    expect(service.drain()).toEqual([]);
  });
});
