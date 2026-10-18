/**
 * lib/notifications.ts
 * ---------------------
 * Centralized, theme-aware notification system powered by Sonner.
 *
 * Capabilities:
 * - Smart deduplication (prevents spamming duplicate toasts within 2.5s window)
 * - Safe error translation from ApiError, Error, string, or unknown
 * - Actionable notifications (Retry buttons, dismiss)
 * - Severity levels: success, error, warning, info
 * - Diagnostic reference IDs for troubleshooting without leaking technical details
 */

import { toast } from '@/components/ui/sonner';
import { ApiError } from './apiClient';

interface ActionOption {
  label: string;
  onClick: () => void;
}

export interface NotificationOptions {
  description?: string;
  duration?: number;
  id?: string | number;
  action?: ActionOption;
  retry?: () => void;
}

// Deduplication cache: tracks recent messages and their timestamps
const recentMessages = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 2500;

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const lastTime = recentMessages.get(key);
  if (lastTime && now - lastTime < DEDUPLICATION_WINDOW_MS) {
    return true;
  }
  recentMessages.set(key, now);

  // Periodic cleanup of stale cache items
  if (recentMessages.size > 50) {
    for (const [k, time] of recentMessages.entries()) {
      if (now - time > DEDUPLICATION_WINDOW_MS * 2) {
        recentMessages.delete(k);
      }
    }
  }
  return false;
}

/**
 * Extracts a concise title, informative description, and optional request ID from any error.
 */
function extractErrorInfo(error: unknown, fallbackMessage = 'An unexpected error occurred.'): {
  title: string;
  description?: string;
  requestId?: string;
} {
  if (error instanceof ApiError) {
    let title = error.message;
    let description: string | undefined = undefined;

    if (error.isNetworkError) {
      title = 'Network Connection Issue';
      description = 'Could not reach the server. Please check your internet connection.';
    } else if (error.isTimeout) {
      title = 'Request Timed Out';
      description = 'The server is taking too long to respond. Please try again in a few moments.';
    } else if (error.isAuthError) {
      title = 'Authentication Error';
      description = error.message || 'Please log in again to continue.';
    } else if (error.isNotFound) {
      title = 'Not Found';
      description = error.message || 'The requested resource could not be found.';
    } else if (error.isRateLimited) {
      title = 'Too Many Requests';
      description = 'You have exceeded the request limit. Please wait a moment before trying again.';
    } else if (error.isServerError) {
      title = 'Server Error';
      description = 'We encountered an internal error. Please try again later.';
    }

    if (error.requestId) {
      description = description
        ? `${description} (Ref: ${error.requestId})`
        : `Ref ID: ${error.requestId}`;
    }

    return { title, description, requestId: error.requestId };
  }

  if (error instanceof Error) {
    return { title: error.message || fallbackMessage };
  }

  if (typeof error === 'string') {
    return { title: error };
  }

  return { title: fallbackMessage };
}

export const notify = {
  /**
   * Display a user-friendly error notification with optional retry capability.
   */
  error(error: unknown, options: NotificationOptions = {}): string | number | undefined {
    const { title, description: extractedDesc } = extractErrorInfo(error);
    const description = options.description || extractedDesc;

    const dedupKey = `error:${title}:${description || ''}`;
    if (isDuplicate(dedupKey)) {
      return undefined;
    }

    const action = options.retry
      ? {
          label: 'Retry',
          onClick: options.retry,
        }
      : options.action;

    return toast.error(title, {
      description,
      duration: options.duration ?? (action ? 8000 : 5000),
      id: options.id,
      action,
    });
  },

  /**
   * Display a success notification.
   */
  success(message: string, options: NotificationOptions = {}): string | number | undefined {
    const dedupKey = `success:${message}:${options.description || ''}`;
    if (isDuplicate(dedupKey)) {
      return undefined;
    }

    return toast.success(message, {
      description: options.description,
      duration: options.duration ?? 4000,
      id: options.id,
      action: options.action,
    });
  },

  /**
   * Display an informational notification.
   */
  info(message: string, options: NotificationOptions = {}): string | number | undefined {
    const dedupKey = `info:${message}:${options.description || ''}`;
    if (isDuplicate(dedupKey)) {
      return undefined;
    }

    return toast.info(message, {
      description: options.description,
      duration: options.duration ?? 4000,
      id: options.id,
      action: options.action,
    });
  },

  /**
   * Display a warning notification.
   */
  warning(message: string, options: NotificationOptions = {}): string | number | undefined {
    const dedupKey = `warning:${message}:${options.description || ''}`;
    if (isDuplicate(dedupKey)) {
      return undefined;
    }

    return toast.warning(message, {
      description: options.description,
      duration: options.duration ?? 5000,
      id: options.id,
      action: options.action,
    });
  },

  /**
   * Dismiss a specific toast or all active toasts.
   */
  dismiss(id?: string | number): void {
    toast.dismiss(id);
  },
};
