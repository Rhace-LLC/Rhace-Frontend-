import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { AuthUser } from '@/types';

export default function UserProtectedRoute() {
  const user = useSelector(
    (state: { auth: { user?: AuthUser | null } }) => state.auth.user
  );

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
