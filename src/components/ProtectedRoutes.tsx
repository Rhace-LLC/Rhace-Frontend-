// components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { authService } from '@/services/auth.service';
import { setVendor } from '@/redux/slices/authSlice';
import type { RootState, AppDispatch } from '@/redux/store';
import type { AuthVendor } from '@/types';

export default function ProtectedRoute() {
  const dispatch = useDispatch<AppDispatch>();
  const { vendor, admin } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasValidToken, setHasValidToken] = useState(false);

  const vendorData = vendor as (AuthVendor & { isOnboarded?: boolean; vendorType?: string }) | null;

  // Auto-restore vendor from token if Redux empty
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !vendor && !admin) {
      console.log('ProtectedRoute: Token found, fetching vendor profile...');
      // authService.getVendorProfile()
      //   .then((profile) => {
      //     console.log('Profile fetched:', profile);
      //     const vendorData = { ...profile, isOnboarded: profile.isOnboarded ?? true };
      //     dispatch(setVendor(vendorData));
      //     setHasValidToken(true);
      //   })
      //   .catch((err) => {
      //     console.error('Profile fetch failed:', err);
      //     localStorage.removeItem('token');
      //     setHasValidToken(false);
      //   })
      //   .finally(() => {
      //     setIsCheckingAuth(false);
      //   });
    } else {
      setHasValidToken(!!token);
      setIsCheckingAuth(false);
    }
  }, [dispatch, vendor, admin]);

  const isAuthenticated = vendor || admin || hasValidToken;

  const authorized = () => {
    console.log('🔍 ProtectedRoute DEBUG - vendor:', vendor);
    console.log('🔍 Path:', location.pathname);
    const path = location.pathname;

    if (admin) {
      console.log('✅ Admin authorized');
      return path.startsWith('/dashboard/admin');
    }

    if (!vendorData) {
      console.warn('❌ No vendor in state');
      return false;
    }

    // Always allow dashboard if onboarded, flexible type matching
    if (vendorData.isOnboarded !== false) {
      console.log('✅ Vendor onboarded, allowing dashboard access');
      return path.startsWith('/dashboard');
    }

    console.log('Redirecting to onboarding - isOnboarded:', vendorData.isOnboarded);
    return path.startsWith('/auth/vendor/onboarding');
  };
  const isAuthorized = authorized();
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg">Verifying authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (location.pathname.startsWith('/dashboard/admin')) {
      return <Navigate to="/auth/admin/login" replace />;
    }
    return <Navigate to="/auth/vendor/login" replace />;
  }

  if (!isAuthorized) {
    if (admin) {
      return <Navigate to="/dashboard/admin" replace />;
    }
    if (vendorData && !vendorData.isOnboarded) {
      return <Navigate to="/auth/vendor/onboarding" replace />;
    }
    if (vendorData) {
      // Redirect to their correct dashboard if they try to access a wrong one
      return <Navigate to={`/dashboard/${vendorData.vendorType}`} replace />;
    }
    // Fallback if something is wrong
    return <Navigate to="/auth/vendor/login" replace />;
  }

  return <Outlet />;
}