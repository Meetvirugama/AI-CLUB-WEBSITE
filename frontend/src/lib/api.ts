/**
 * Centralized API endpoint helper utility.
 * Handles DEV vs PROD environments cleanly and supports custom VITE_API_URL configuration.
 */

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  if (import.meta.env.DEV) {
    // Rely on Vite proxy (see vite.config.ts) for local development
    return normalizedPath;
  }

  const prodHost = import.meta.env.VITE_API_URL || '';
  return `${prodHost}${normalizedPath}`;
}

export function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...extra,
  };
}
