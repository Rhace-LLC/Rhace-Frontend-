import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Guards the /staff workspace. Requires a staff session (or a token), and
 * redirects to the staff login otherwise.
 */
export default function StaffProtectedRoute() {
  const { staff, loading } = useAuth();
  const location = useLocation();

  // The session hydrates from storage after first render — deciding before
  // `loading` flips would bounce every refresh back to login.
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-gray-50">
        <div className="text-lg">Verifying authentication...</div>
      </div>
    );
  }

  if (!staff) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/auth/staff/login?redirect=${redirect}`} replace />;
  }

  return <Outlet />;
}
