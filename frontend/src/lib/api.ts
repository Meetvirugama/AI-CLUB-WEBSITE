/**
 * Centralized API endpoint helper utility.
 * Handles DEV vs PROD environments cleanly and supports custom VITE_API_URL configuration.
 */

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Always use relative URLs — both in dev (Vite proxy) and prod (Vercel proxy rewrite).
  // This keeps cookies same-site (vercel.app → vercel.app) instead of cross-site
  // (vercel.app → onrender.com), which is the only reliable way cookies work across
  // all browsers, including those that block third-party/cross-site cookies.
  return normalizedPath;
}

export function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...extra,
  };
}
