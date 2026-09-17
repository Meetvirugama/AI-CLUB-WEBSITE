import { getApiUrl } from './api';

export class ApiError extends Error {
  status: number;
  data: any;
  
  constructor(status: number, message: string, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  data?: any;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = getApiUrl(path);
  
  const headers = new Headers(options.headers);
  if (options.data && !(options.data instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Automatically include HttpOnly cookies
  };

  if (options.data) {
    if (options.data instanceof FormData) {
      config.body = options.data;
      // Let browser set Content-Type for FormData
    } else {
      config.body = JSON.stringify(options.data);
    }
  }

  try {
    const response = await fetch(url, config);
    
    // Attempt to parse JSON response
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage = typeof responseData === 'object' && responseData !== null && 'detail' in responseData
        ? responseData.detail
        : typeof responseData === 'object' && responseData !== null && 'message' in responseData
          ? responseData.message
          : 'An unexpected error occurred';
      
      throw new ApiError(response.status, errorMessage, responseData);
    }

    return responseData as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle network errors (e.g., when API is down)
    throw new ApiError(0, error instanceof Error ? error.message : 'Network error');
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, data?: any, options?: RequestOptions) => request<T>(path, { ...options, method: 'POST', data }),
  put: <T>(path: string, data?: any, options?: RequestOptions) => request<T>(path, { ...options, method: 'PUT', data }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};
