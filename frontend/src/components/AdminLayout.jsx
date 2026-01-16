import { Link, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function AdminLayout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { path: '/admin', label: '📊 Dashboard', exact: true },
    { path: '/admin/bookings', label: '📋 Đặt bàn' },
    { path: '/admin/tables', label: '🎱 Bàn bida' },
    { path: '/admin/users', label: '👥 Người dùng' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location. pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white fixed h-full">
        <div className="p-6">
          <Link to="/admin" className="text-2xl font-bold text-green-400">
            🎱 Bida Admin
          </Link>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-6 py-3 transition-colors ${
                isActive(item. path, item.exact)
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
          <div className="mb-4">
            <p className="text-sm text-gray-400">Đăng nhập với</p>
            <p className="font-medium">{user?.full_name || user?.fullName}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/"
              className="flex-1 text-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              Trang chủ
            </Link>
            <button
              onClick={logout}
              className="flex-1 px-3 py-2 bg-red-600 hover: bg-red-700 rounded text-sm transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <Outlet />
      </main>
    </div>
  );
}