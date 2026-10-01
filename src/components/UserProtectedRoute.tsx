import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function UserProtectedRoute() {
  const { user, loading } = useAuth();

  const isAuthenticated = user;

  // The session hydrates from storage after first render — deciding before
  // `loading` flips would bounce every refresh back to login.
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-gray-50">
        <div className="text-lg">Verifying authentication...</div>
      </div>
    );
  }

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
