import { clearTokens } from '@/lib/storage';

export type AuthRole = 'user' | 'vendor' | 'admin' | 'staff';

export const AUTH_STORAGE_KEYS = {
  user: 'auth_user',
  vendor: 'auth_vendor',
  admin: 'auth_admin',
  staff: 'auth_staff',
} as const;

export const LOGIN_PATHS: Record<AuthRole, string> = {
  user: '/auth/user/login',
  vendor: '/auth/vendor/login',
  admin: '/auth/admin/login',
  staff: '/auth/staff/login',
};

// Plain (non-React) helper so interceptors/utilities can clear the session.
export function clearAuthStorage(role?: AuthRole): void {
  if (role) {
    localStorage.removeItem(AUTH_STORAGE_KEYS[role]);
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    localStorage.removeItem(AUTH_STORAGE_KEYS.vendor);
    localStorage.removeItem(AUTH_STORAGE_KEYS.admin);
    localStorage.removeItem(AUTH_STORAGE_KEYS.staff);
  }
  clearTokens();
}

export function loginPathForRole(role?: AuthRole | null): string {
  return role ? LOGIN_PATHS[role] : LOGIN_PATHS.user;
}
