import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function AdminRoute() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?. role !== 'admin' && user?.role !== 'staff') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}