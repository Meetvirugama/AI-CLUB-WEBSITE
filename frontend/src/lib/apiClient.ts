/**
 * lib/apiClient.ts
 * ----------------
 * Centralized, production-grade API client for the frontend application.
 *
 * Features:
 * - Uniform ApiError class with typed status codes, request IDs, and field errors
 * - Prevents [object Object] formatting when FastAPI returns 422 error arrays
 * - Configurable request timeout with AbortController
 * - Automatic X-Request-ID generation and correlation propagation
 * - Helper predicates (isNetworkError, isTimeout, isAuthError, isServerError, etc.)
 * - Field-level error dictionary mapping helper
 */

import { getApiUrl } from './api';

export interface FieldErrorItem {
  field?: string;
  message: string;
}

export interface ApiErrorResponseData {
  success?: boolean;
  message?: string;
  detail?: string | Array<{ loc?: (string | number)[]; msg?: string; type?: string }> | Record<string, any>;
  code?: string;
  errors?: FieldErrorItem[];
  request_id?: string;
}

/**
 * Extracts a human-readable string and structured field errors from any API error payload.
 * Fully guards against '[object Object]' or unhandled array payloads.
 */
function parseApiErrorPayload(status: number, data: any): {
  message: string;
  code: string;
  errors?: FieldErrorItem[];
} {
  let message = 'An unexpected error occurred. Please try again.';
  let code = `HTTP_${status}`;
  const errors: FieldErrorItem[] = [];

  if (!data) {
    if (status === 404) message = 'The requested resource was not found.';
    else if (status === 401) message = 'Your session has expired or authentication is required.';
    else if (status === 403) message = 'You do not have permission to access this resource.';
    else if (status === 429) message = 'Too many requests. Please wait a moment and try again.';
    else if (status >= 500) message = 'The server encountered an error. Please try again shortly.';
    return { message, code, errors };
  }

  // Handle plain text responses (e.g. 502 Bad Gateway from reverse proxy)
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      message = status >= 500
        ? 'Service temporarily unavailable. Please try again in a few moments.'
        : `Request failed with status ${status}.`;
    } else if (trimmed) {
      message = trimmed;
    }
    return { message, code, errors };
  }

  // Handle structured JSON
  if (typeof data === 'object') {
    if (typeof data.code === 'string' && data.code.trim()) {
      code = data.code;
    }

    // 1. Explicit errors list (standard contract)
    if (Array.isArray(data.errors)) {
      for (const item of data.errors) {
        if (item && typeof item === 'object') {
          errors.push({
            field: typeof item.field === 'string' ? item.field : undefined,
            message: typeof item.message === 'string' ? item.message : JSON.stringify(item),
          });
        }
      }
    }

    // 2. detail field handling (FastAPI default vs string)
    if (Array.isArray(data.detail)) {
      for (const item of data.detail) {
        if (item && typeof item === 'object') {
          const loc = Array.isArray(item.loc) ? item.loc.filter((p: any) => p !== 'body').join('.') : undefined;
          const msg = typeof item.msg === 'string' ? item.msg : 'Invalid field';
          errors.push({ field: loc || undefined, message: msg });
        }
      }
      if (errors.length > 0) {
        const first = errors[0];
        message = first.field ? `${first.field}: ${first.message}` : first.message;
      } else {
        message = 'Please correct the highlighted errors in the form.';
      }
    } else if (typeof data.detail === 'string' && data.detail.trim()) {
      message = data.detail;
    } else if (typeof data.message === 'string' && data.message.trim()) {
      message = data.message;
    } else if (typeof data.detail === 'object' && data.detail !== null) {
      message = data.detail.message || JSON.stringify(data.detail);
    }
  }

  return { message, code, errors: errors.length > 0 ? errors : undefined };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly errors?: FieldErrorItem[];
  readonly data: any;

  constructor(status: number, message: string, options: {
    code?: string;
    requestId?: string;
    errors?: FieldErrorItem[];
    data?: any;
  } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options.code || (status === 0 ? 'NETWORK_ERROR' : `HTTP_${status}`);
    this.requestId = options.requestId;
    this.errors = options.errors;
    this.data = options.data;
  }

  get isNetworkError(): boolean {
    return this.status === 0 || this.code === 'NETWORK_ERROR';
  }

  get isTimeout(): boolean {
    return this.code === 'TIMEOUT' || this.code === 'GATEWAY_TIMEOUT' || this.status === 504;
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403 || this.code === 'UNAUTHORIZED' || this.code === 'FORBIDDEN';
  }

  get isNotFound(): boolean {
    return this.status === 404 || this.code === 'NOT_FOUND';
  }

  get isConflict(): boolean {
    return this.status === 409 || this.code === 'CONFLICT';
  }

  get isRateLimited(): boolean {
    return this.status === 429 || this.code === 'RATE_LIMIT_EXCEEDED';
  }

  get isValidationError(): boolean {
    return this.status === 422 || this.code === 'VALIDATION_ERROR';
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Helper to turn structured errors into a convenient key-value map for form inputs.
   */
  getFieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    if (this.errors) {
      for (const err of this.errors) {
        if (err.field) {
          map[err.field] = err.message;
        }
      }
    }
    return map;
  }
}

export interface RequestOptions extends RequestInit {
  data?: any;
  timeout?: number; // In milliseconds, default 15000
}

/**
 * Generate a client correlation ID if one is not provided.
 */
function createCorrelationId(): string {
  return `req-${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = getApiUrl(path);
  const timeoutMs = options.timeout ?? 15000;

  const headers = new Headers(options.headers);
  if (options.data && !(options.data instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Ensure request correlation header is attached
  if (!headers.has('X-Request-ID')) {
    headers.set('X-Request-ID', createCorrelationId());
  }

  // Setup abort controller for timeout and cancellation
  const controller = new AbortController();
  const callerSignal = options.signal;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      controller.abort(new DOMException('Request timed out. Please check your internet connection.', 'TimeoutError'));
    }, timeoutMs);
  }

  // Forward caller's signal to controller
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      callerSignal.addEventListener('abort', () => controller.abort());
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
    signal: controller.signal,
    credentials: 'include', // Automatically include cookies
  };

  if (options.data) {
    if (options.data instanceof FormData) {
      config.body = options.data;
    } else {
      config.body = JSON.stringify(options.data);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);

    if (error?.name === 'TimeoutError' || error?.message?.includes('timed out')) {
      throw new ApiError(504, 'The request took too long to complete. Please check your connection and try again.', {
        code: 'TIMEOUT',
      });
    }

    if (error?.name === 'AbortError') {
      throw new ApiError(0, 'Request was cancelled.', { code: 'CANCELLED' });
    }

    // Network disconnection or DNS failure
    throw new ApiError(
      0,
      'Unable to connect to the server. Please check your internet connection and try again.',
      { code: 'NETWORK_ERROR' }
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  // Extract response headers (like X-Request-ID)
  const requestId = response.headers.get('X-Request-ID') || undefined;

  // Attempt to parse response body
  let responseData: any = null;
  const contentType = response.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
  } catch (parseErr) {
    responseData = null;
  }

  if (!response.ok) {
    const { message, code, errors } = parseApiErrorPayload(response.status, responseData);
    const resolvedReqId = (responseData && typeof responseData === 'object' && responseData.request_id) || requestId;

    throw new ApiError(response.status, message, {
      code,
      requestId: resolvedReqId,
      errors,
      data: responseData,
    });
  }

  return responseData as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, data?: any, options?: RequestOptions) => request<T>(path, { ...options, method: 'POST', data }),
  put: <T>(path: string, data?: any, options?: RequestOptions) => request<T>(path, { ...options, method: 'PUT', data }),
  patch: <T>(path: string, data?: any, options?: RequestOptions) => request<T>(path, { ...options, method: 'PATCH', data }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};
