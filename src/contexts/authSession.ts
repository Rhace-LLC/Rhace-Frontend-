import { clearTokens } from '@/lib/storage';

export type AuthRole = 'user' | 'vendor' | 'admin';

export const AUTH_STORAGE_KEYS = {
  user: 'auth_user',
  vendor: 'auth_vendor',
  admin: 'auth_admin',
} as const;

export const LOGIN_PATHS: Record<AuthRole, string> = {
  user: '/auth/user/login',
  vendor: '/auth/vendor/login',
  admin: '/auth/admin/login',
};

// Plain (non-React) helper so interceptors/utilities can clear the session.
export function clearAuthStorage(role?: AuthRole): void {
  if (role) {
    localStorage.removeItem(AUTH_STORAGE_KEYS[role]);
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    localStorage.removeItem(AUTH_STORAGE_KEYS.vendor);
    localStorage.removeItem(AUTH_STORAGE_KEYS.admin);
  }
  clearTokens();
}

export function loginPathForRole(role?: AuthRole | null): string {
  return role ? LOGIN_PATHS[role] : LOGIN_PATHS.user;
}
