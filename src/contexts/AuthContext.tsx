import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { readJson } from '@/lib/storage';
import type { AuthAdmin, AuthStaff, AuthUser, AuthVendor } from '@/types';
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
  staff: AuthStaff | null;
  role: AuthRole | null;
  isAuthenticated: boolean;
  loading: boolean;
  // Vendor type booleans
  vendorIsHotel: boolean;
  vendorIsClub: boolean;
  vendorIsRestaurant: boolean;
  // Role booleans
  isAdmin: boolean;
  isUser: boolean;
  isVendor: boolean;
  isStaff: boolean;
  setUser: (user: AuthUser | null) => void;
  setVendor: (vendor: AuthVendor | null) => void;
  setAdmin: (admin: AuthAdmin | null) => void;
  setStaff: (staff: AuthStaff | null) => void;
  logout: (role?: AuthRole) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [vendor, setVendorState] = useState<AuthVendor | null>(null);
  const [admin, setAdminState] = useState<AuthAdmin | null>(null);
  const [staff, setStaffState] = useState<AuthStaff | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate the session from storage on mount.
  useEffect(() => {
    setUserState(readJson<AuthUser | null>(AUTH_STORAGE_KEYS.user, null));
    setVendorState(readJson<AuthVendor | null>(AUTH_STORAGE_KEYS.vendor, null));
    setAdminState(readJson<AuthAdmin | null>(AUTH_STORAGE_KEYS.admin, null));
    setStaffState(readJson<AuthStaff | null>(AUTH_STORAGE_KEYS.staff, null));
    setLoading(false);
  }, []);

  /** Clears every other role's in-memory + persisted session. */
  const clearOtherRoles = useCallback((keep: AuthRole) => {
    if (keep !== 'user') {
      setUserState(null);
      localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    }
    if (keep !== 'vendor') {
      setVendorState(null);
      localStorage.removeItem(AUTH_STORAGE_KEYS.vendor);
    }
    if (keep !== 'admin') {
      setAdminState(null);
      localStorage.removeItem(AUTH_STORAGE_KEYS.admin);
    }
    if (keep !== 'staff') {
      setStaffState(null);
      localStorage.removeItem(AUTH_STORAGE_KEYS.staff);
    }
  }, []);

  const setUser = useCallback(
    (next: AuthUser | null) => {
      setUserState(next);
      clearOtherRoles('user');
      if (next) localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(next));
      else localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    },
    [clearOtherRoles]
  );

  const setVendor = useCallback(
    (next: AuthVendor | null) => {
      setVendorState(next);
      clearOtherRoles('vendor');
      if (next) localStorage.setItem(AUTH_STORAGE_KEYS.vendor, JSON.stringify(next));
      else localStorage.removeItem(AUTH_STORAGE_KEYS.vendor);
    },
    [clearOtherRoles]
  );

  const setAdmin = useCallback(
    (next: AuthAdmin | null) => {
      setAdminState(next);
      clearOtherRoles('admin');
      if (next) localStorage.setItem(AUTH_STORAGE_KEYS.admin, JSON.stringify(next));
      else localStorage.removeItem(AUTH_STORAGE_KEYS.admin);
    },
    [clearOtherRoles]
  );

  const setStaff = useCallback(
    (next: AuthStaff | null) => {
      setStaffState(next);
      clearOtherRoles('staff');
      if (next) localStorage.setItem(AUTH_STORAGE_KEYS.staff, JSON.stringify(next));
      else localStorage.removeItem(AUTH_STORAGE_KEYS.staff);
    },
    [clearOtherRoles]
  );

  const role = useMemo<AuthRole | null>(
    () => (user ? 'user' : vendor ? 'vendor' : admin ? 'admin' : staff ? 'staff' : null),
    [user, vendor, admin, staff]
  );

  const logout = useCallback(
    (targetRole?: AuthRole) => {
      const resolved = targetRole ?? role;
      setUserState(null);
      setVendorState(null);
      setAdminState(null);
      setStaffState(null);
      clearAuthStorage(targetRole);
      if (typeof window !== 'undefined' && resolved) {
        window.location.href = loginPathForRole(resolved);
      }
    },
    [role]
  );

  const value = useMemo<AuthContextValue>(
    () => {
      const vendorType = vendor?.type || vendor?.vendorType || vendor?.businessType || '';
      const normalizedType = String(vendorType).toLowerCase();
      return {
        user,
        vendor,
        admin,
        staff,
        role,
        isAuthenticated: Boolean(user || vendor || admin || staff),
        loading,
        vendorIsHotel: normalizedType === 'hotel',
        vendorIsClub: normalizedType === 'club',
        vendorIsRestaurant: normalizedType === 'restaurant',
        isAdmin: Boolean(admin),
        isUser: Boolean(user),
        isVendor: Boolean(vendor),
        isStaff: Boolean(staff),
        setUser,
        setVendor,
        setAdmin,
        setStaff,
        logout,
      };
    },
    [user, vendor, admin, staff, role, loading, setUser, setVendor, setAdmin, setStaff, logout]
  );

  console.log("=============================================== AuthContext value Start ==================================================================");
  console.log(value);
  console.log("=============================================== AuthContext value End ====================================================================");

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
