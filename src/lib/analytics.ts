import { track } from '@vercel/analytics';

type AnalyticsValue = string | number | boolean | null | undefined;

/**
 * Safely track custom CTA actions and interactive events to Vercel Web Analytics.
 * Wrapped in try/catch to ensure website stability is 100% preserved
 * even in the presence of ad-blockers, network drops, or local development.
 */
export function trackCTA(
  eventName: string,
  properties?: Record<string, AnalyticsValue>
): void {
  try {
    if (typeof window !== 'undefined') {
      track(eventName, properties);
    }
  } catch {
    // Fail completely silently so user experience and site performance are never impacted
  }
}
