import api from '@/lib/axios';
import type { ApiEnvelope, PaginatedResponse } from '@/types';

// Add custom property to axios request config for the refresh-retry flag.
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

// Centralized, typed helper for the repetitive try/catch error logging seen in
// the service classes. Returns the thrown error so callers can re-throw.
export function logApiError(scope: string, operation: string, error: unknown): never {
  const e = error as {
    response?: { status?: number; data?: unknown; headers?: unknown };
    request?: unknown;
    message?: string;
  };

  if (e?.response) {
    console.error(`[${scope}] ${operation} failed`, {
      status: e.response.status,
      data: e.response.data,
      headers: e.response.headers,
    });
  } else if (e?.request) {
    console.error(`[${scope}] ${operation} no response received`, e.request);
  } else {
    console.error(`[${scope}] ${operation} error`, e?.message);
  }
  throw error;
}

// Mock/deprecated module kept for reference only. See:
// agentrecommendations/ts-inventory-dead-duplicates.md
export type { ApiEnvelope, PaginatedResponse };
export default api;
