/**
 * Hand-written types for boa-insight, the internal analytics SDK.
 *
 * The vendor ships an un-typed UMD bundle. These declarations are maintained by
 * the Digital Banking web team and are known to be loose: the event payload is
 * `any` because the schema is owned by the Analytics platform team and changes
 * without notice.
 */
declare module 'boa-insight' {
  export interface InsightConfig {
    appId: string;
    channel: string;
    piiRedaction: boolean;
  }

  export function init(config: InsightConfig): void;
  export function track(eventName: string, payload: any): void;
  export function identify(subjectId: string, traits?: any): void;
  export function flush(): Promise<void>;
}
