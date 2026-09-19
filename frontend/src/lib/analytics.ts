/**
 * analytics.ts
 * ------------
 * Lightweight first-party analytics tracker.
 *
 * How it works:
 *  1. On first load a random visitor_id is persisted in localStorage.
 *  2. A new session_id is generated per browser tab (sessionStorage).
 *  3. trackEvent() fires POST /api/analytics/track — fire-and-forget.
 *  4. endSession() fires POST /api/analytics/session-end on beforeunload.
 *  5. Page time is tracked via Page Visibility API and sent in PAGE_VIEW meta.
 */

import { getApiUrl } from './api';

// ─── IDs ──────────────────────────────────────────────────────────────────────

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getVisitorId(): string {
  let id = localStorage.getItem('_aclub_vid');
  if (!id) { id = uuid(); localStorage.setItem('_aclub_vid', id); }
  return id;
}

function getSessionId(): string {
  let id = sessionStorage.getItem('_aclub_sid');
  if (!id) { id = uuid(); sessionStorage.setItem('_aclub_sid', id); }
  return id;
}

// ─── Device detection ─────────────────────────────────────────────────────────

function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/'))    return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  return 'Other';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (/windows/i.test(ua))         return 'Windows';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/android/i.test(ua))         return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/linux/i.test(ua))           return 'Linux';
  return 'Other';
}

// ─── State ────────────────────────────────────────────────────────────────────

let _sessionStarted = false;
let _sessionStart = Date.now();
let _pageStart = Date.now();
let _currentPage = '';

// ─── Core send ────────────────────────────────────────────────────────────────

interface TrackPayload {
  visitor_id:   string;
  session_id:   string;
  event_type:   string;
  page?:        string;
  meta?:        Record<string, unknown>;
  device_type?: string;
  browser?:     string;
  os?:          string;
  screen_width?: number;
}

function send(payload: TrackPayload): void {
  const url = getApiUrl('/api/analytics/track');
  // Use sendBeacon when available (works on page unload)
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
  } else {
    fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {/* silently swallow */});
  }
}

function sendSessionEnd(durationSec: number): void {
  const body = JSON.stringify({
    session_id:   getSessionId(),
    duration_sec: durationSec,
  });
  const url = getApiUrl('/api/analytics/session-end');
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
  } else {
    fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Track any named event.
 *
 * Example:
 *   trackEvent('PAGE_VIEW', { page: '/events' });
 *   trackEvent('CHATBOT_OPEN');
 *   trackEvent('REGISTRATION_COMPLETED', { eventId: 42 });
 */
export function trackEvent(
  eventType: string,
  meta?: Record<string, unknown>,
  page?: string,
): void {
  try {
    const payload: TrackPayload = {
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      event_type: eventType,
      page:       page ?? _currentPage,
      meta,
    };

    // Include device info on the first event of the session
    if (!_sessionStarted) {
      _sessionStarted = true;
      _sessionStart   = Date.now();
      payload.device_type  = getDeviceType();
      payload.browser      = getBrowser();
      payload.os           = getOS();
      payload.screen_width = window.screen.width;
    }

    send(payload);
  } catch {
    // Never throw — analytics must never break the app
  }
}

/**
 * Track a PAGE_VIEW and record the time spent on the previous page.
 * Call this on every route change.
 */
export function trackPageView(pathname: string): void {
  // Send duration for the page we're leaving
  if (_currentPage && _currentPage !== pathname) {
    const durationSec = (Date.now() - _pageStart) / 1000;
    trackEvent('PAGE_VIEW', { duration_sec: durationSec }, _currentPage);
  }

  _currentPage = pathname;
  _pageStart   = Date.now();

  // Track the new page (no duration yet)
  trackEvent('PAGE_VIEW', undefined, pathname);
}

/**
 * Call once on app mount. Sets up beforeunload handler for session duration.
 */
export function startSession(): void {
  _sessionStart = Date.now();

  const onUnload = () => {
    const durationSec = (Date.now() - _sessionStart) / 1000;
    sendSessionEnd(durationSec);
  };

  window.addEventListener('beforeunload', onUnload);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onUnload();
  });
}
