import { Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';

export default function ProtectedRoute() {
  const { isAuthenticated, token } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Đợi Zustand persist hydrate xong
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    // Kiểm tra nếu đã hydrate sẵn
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Hiển thị loading khi đang hydrate
  if (!isHydrated) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}