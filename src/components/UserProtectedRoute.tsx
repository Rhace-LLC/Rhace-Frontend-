import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function UserProtectedRoute() {
  const { user } = useAuth();

  const isAuthenticated = user;

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/auth/user/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
