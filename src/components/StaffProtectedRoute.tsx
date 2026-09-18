import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Guards the /staff workspace. Requires a staff session (or a token), and
 * redirects to the staff login otherwise.
 */
export default function StaffProtectedRoute() {
  const { staff } = useAuth();
  const location = useLocation();

  if (!staff) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/auth/staff/login?redirect=${redirect}`} replace />;
  }

  return <Outlet />;
}
