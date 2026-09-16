// Centralized localStorage token management.
// The app historically used four different keys: token, auth_token,
// vendor-token, vendor_token. This module standardizes access.

const USER_TOKEN_KEY = 'token';
const VENDOR_TOKEN_KEY = 'vendor_token';
// Staff sessions use a body-carried, rotating refresh token (unlike the
// vendor/admin cookie flow), so it lives in its own slot.
const STAFF_REFRESH_TOKEN_KEY = 'staff_refresh_token';

export const storageKeys = {
  userToken: USER_TOKEN_KEY,
  vendorToken: VENDOR_TOKEN_KEY,
  staffRefreshToken: STAFF_REFRESH_TOKEN_KEY,
} as const;

export function getToken(): string | null {
  return (
    localStorage.getItem(USER_TOKEN_KEY) ||
    localStorage.getItem(VENDOR_TOKEN_KEY) ||
    localStorage.getItem('vendor-token')
  );
}

export function setToken(token: string, isVendor = false): void {
  const key = isVendor ? VENDOR_TOKEN_KEY : USER_TOKEN_KEY;
  localStorage.setItem(key, token);
}

export function getStaffRefreshToken(): string | null {
  return localStorage.getItem(STAFF_REFRESH_TOKEN_KEY);
}

export function setStaffRefreshToken(token: string | null): void {
  if (token) localStorage.setItem(STAFF_REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(STAFF_REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(VENDOR_TOKEN_KEY);
  localStorage.removeItem(STAFF_REFRESH_TOKEN_KEY);
  localStorage.removeItem('auth_token');
  localStorage.removeItem('vendor-token');
  localStorage.removeItem('vendor_token');
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
