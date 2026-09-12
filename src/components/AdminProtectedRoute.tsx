import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminProtectedRoute() {
  const { admin } = useAuth();
  const location = useLocation();

  // Check if user is authenticated as admin and has a valid token
  const token = localStorage.getItem('token');
  if (!admin || !token) {
    // Redirect to admin login with return URL
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/admin/login?redirect=${returnUrl}`} replace />;
  }

  return <Outlet />;
}
