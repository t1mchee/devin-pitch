import { Injectable } from '@angular/core';

export type InsightPayload = any;

/**
 * Adapter over the internal analytics SDK.
 *
 * The `any` payload is deliberate and matches the vendor typing. Tightening it
 * requires the Analytics platform team to publish a schema; until then this is
 * the boundary where looseness is contained.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private queue: Array<{ name: string; payload: InsightPayload }> = [];

  track(name: string, payload: InsightPayload): void {
    this.queue.push({ name, payload });
  }

  drain(): Array<{ name: string; payload: InsightPayload }> {
    const out = this.queue;
    this.queue = [];
    return out;
  }
}
