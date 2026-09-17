import { track } from '@vercel/analytics';
import { supabase } from '@/lib/supabase';

type AnalyticsValue = string | number | boolean | null | undefined;

/**
 * Get or create an anonymous, temporary session ID to aggregate user actions.
 * Stored only in sessionStorage (no persistent tracking cookies).
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = sessionStorage.getItem('layo_session_id');
    if (!sid) {
      sid = 's_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      sessionStorage.setItem('layo_session_id', sid);
    }
    return sid;
  } catch {
    return '';
  }
}

/**
 * Safely track custom CTA actions and interactive events.
 * Logs to both Vercel Web Analytics and your Supabase database asynchronously.
 * Completely fail-safe — never throws or blocks UI interaction.
 */
export function trackCTA(
  eventName: string,
  properties?: Record<string, AnalyticsValue>
): void {
  try {
    if (typeof window !== 'undefined') {
      // 1. Send to Vercel Web Analytics
      try {
        track(eventName, properties);
      } catch {
        // Vercel track error fallback
      }

      // 2. Non-blocking asynchronous insert to Supabase
      const pagePath = window.location.pathname;
      const sessionId = getSessionId();

      (async () => {
        try {
          await supabase
            .from('website_events')
            .insert({
              event_name: eventName,
              event_type: 'cta_click',
              page_path: pagePath,
              properties: properties || {},
              session_id: sessionId,
            });
        } catch {
          // Fail silently if table not yet created
        }
      })();
    }
  } catch {
    // Fail silently
  }
}

/**
 * Safely track page views into Supabase.
 */
export function trackPageView(path?: string): void {
  try {
    if (typeof window !== 'undefined') {
      const pagePath = path || window.location.pathname;
      const sessionId = getSessionId();

      (async () => {
        try {
          await supabase
            .from('website_events')
            .insert({
              event_name: 'page_view',
              event_type: 'page_view',
              page_path: pagePath,
              properties: {
                referrer: document.referrer ? new URL(document.referrer, window.location.origin).hostname : 'direct',
                screen_width: window.innerWidth,
              },
              session_id: sessionId,
            });
        } catch {
          // Fail silently if table not yet created
        }
      })();
    }
  } catch {
    // Fail silently
  }
}
