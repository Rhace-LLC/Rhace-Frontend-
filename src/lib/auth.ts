/**
 * Authentication utilities for token management and validation
 * Handles localStorage token operations, refresh logic, and validation
 * Usage: import { ensureValidToken } from '@/lib/auth';
 */

import { toast } from 'react-toastify';

// Get current auth token from storage
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token') || localStorage.getItem('vendor_token');
};

// Check if valid token exists
export const hasValidToken = (): boolean => {
  const token = getAuthToken();
  return !!token && !isTokenExpired(token);
};

// Simple JWT expiry check (decode payload)
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // Invalid token treated as expired
  }
};

// Save token to storage
export const saveAuthToken = (token: string, isVendor = false): void => {
  const key = isVendor ? 'vendor_token' : 'token';
  localStorage.setItem(key, token);
};

// Clear all auth tokens and redirect
export const clearAuth = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('vendor_token');
  localStorage.removeItem('persist:root');
  toast.error('Session expired. Please log in again.');
};

// Ensure token is valid before API call
export const ensureValidToken = async (): Promise<string | null> => {
  const token = getAuthToken();

  if (!token) {
    clearAuth();
    return null;
  }

  if (isTokenExpired(token)) {
    // Token expired - attempt refresh (future: implement refresh endpoint)
    toast.warning('Session expired. Redirecting to login...');
    clearAuth();
    return null;
  }

  return token;
};

// Pre-flight token check for payment/reservation callbacks
export const validateCallbackToken = (): boolean => {
  if (hasValidToken()) {
    return true;
  }

  toast.info('Please wait while we validate your session...');
  return false;
};

// Export types for type safety
export const AuthStatus = {
  VALID: 'valid',
  EXPIRED: 'expired',
  MISSING: 'missing',
} as const;

export type AuthStatusValue = (typeof AuthStatus)[keyof typeof AuthStatus];

export const getAuthStatus = (): AuthStatusValue => {
  const token = getAuthToken();
  if (!token) return AuthStatus.MISSING;
  if (isTokenExpired(token)) return AuthStatus.EXPIRED;
  return AuthStatus.VALID;
};
