import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminProtectedRoute() {
  const { admin, loading } = useAuth();
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

  // Check if user is authenticated as admin and has a valid token
  const token = localStorage.getItem('token');
  if (!admin || !token) {
    // Redirect to admin login with return URL
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/admin/login?redirect=${returnUrl}`} replace />;
  }

  return <Outlet />;
}
