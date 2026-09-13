import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { readJson } from '@/lib/storage';
import type { AuthAdmin, AuthUser, AuthVendor } from '@/types';
import {
  AUTH_STORAGE_KEYS,
  clearAuthStorage,
  loginPathForRole,
  type AuthRole,
} from './authSession';

export type { AuthRole } from './authSession';

interface AuthContextValue {
  user: AuthUser | null;
  vendor: AuthVendor | null;
  admin: AuthAdmin | null;
  role: AuthRole | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setVendor: (vendor: AuthVendor | null) => void;
  setAdmin: (admin: AuthAdmin | null) => void;
  logout: (role?: AuthRole) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [vendor, setVendorState] = useState<AuthVendor | null>(null);
  const [admin, setAdminState] = useState<AuthAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate the session from storage on mount.
  useEffect(() => {
    setUserState(readJson<AuthUser | null>(AUTH_STORAGE_KEYS.user, null));
    setVendorState(readJson<AuthVendor | null>(AUTH_STORAGE_KEYS.vendor, null));
    setAdminState(readJson<AuthAdmin | null>(AUTH_STORAGE_KEYS.admin, null));
    setLoading(false);
  }, []);

  const setUser = useCallback((next: AuthUser | null) => {
    setUserState(next);
    setVendorState(null);
    setAdminState(null);
    localStorage.removeItem(AUTH_STORAGE_KEYS.vendor);
    localStorage.removeItem(AUTH_STORAGE_KEYS.admin);
    if (next) localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(next));
    else localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  }, []);

  const setVendor = useCallback((next: AuthVendor | null) => {
    setVendorState(next);
    setUserState(null);
    setAdminState(null);
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    localStorage.removeItem(AUTH_STORAGE_KEYS.admin);
    if (next) localStorage.setItem(AUTH_STORAGE_KEYS.vendor, JSON.stringify(next));
    else localStorage.removeItem(AUTH_STORAGE_KEYS.vendor);
  }, []);

  const setAdmin = useCallback((next: AuthAdmin | null) => {
    setAdminState(next);
    setUserState(null);
    setVendorState(null);
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    localStorage.removeItem(AUTH_STORAGE_KEYS.vendor);
    if (next) localStorage.setItem(AUTH_STORAGE_KEYS.admin, JSON.stringify(next));
    else localStorage.removeItem(AUTH_STORAGE_KEYS.admin);
  }, []);

  const role = useMemo<AuthRole | null>(
    () => (user ? 'user' : vendor ? 'vendor' : admin ? 'admin' : null),
    [user, vendor, admin]
  );

  const logout = useCallback(
    (targetRole?: AuthRole) => {
      const resolved = targetRole ?? role;
      setUserState(null);
      setVendorState(null);
      setAdminState(null);
      clearAuthStorage(targetRole);
      if (typeof window !== 'undefined' && resolved) {
        window.location.href = loginPathForRole(resolved);
      }
    },
    [role]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      vendor,
      admin,
      role,
      isAuthenticated: Boolean(user || vendor || admin),
      loading,
      setUser,
      setVendor,
      setAdmin,
      logout,
    }),
    [user, vendor, admin, role, loading, setUser, setVendor, setAdmin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
