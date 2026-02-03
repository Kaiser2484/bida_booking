import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../services/api';

export default function Layout() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s

      const handleRefresh = () => fetchUnreadCount();
      window.addEventListener('refreshNotifications', handleRefresh);

      return () => {
        clearInterval(interval);
        window.removeEventListener('refreshNotifications', handleRefresh);
      };
    }
  }, [isAuthenticated, user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get(`/notifications/user/${user.id}/unread-count`);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      if (error.response?.status === 401) {
        setUnreadCount(0);
      } else {
        console.error('Fetch unread count error:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="text-2xl font-bold text-green-600">
              🎱 Bida Booking
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/tables"
                className={`transition-colors ${location.pathname === '/tables'
                    ? 'text-green-600 font-medium'
                    : 'text-gray-600 hover:text-green-600'
                  }`}
              >
                Danh sách bàn
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/my-bookings"
                    className={`transition-colors ${location.pathname === '/my-bookings'
                        ? 'text-green-600 font-medium'
                        : 'text-gray-600 hover: text-green-600'
                      }`}
                  >
                    Lịch sử đặt bàn
                  </Link>

                  <Link
                    to="/notifications"
                    className="relative text-gray-600 hover:text-green-600 transition-colors"
                  >
                    🔔
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>

                  <div className="flex items-center gap-4">
                    <Link
                      to="/profile"
                      className="text-gray-700 hover:text-green-600 transition-colors"
                    >
                      👤 <span className="hidden lg:inline">{user?.full_name || user?.fullName}</span>
                    </Link>

                    {(user?.role === 'admin' || user?.role === 'staff') && (
                      <Link
                        to="/admin"
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                      >
                        Admin
                      </Link>
                    )}

                    <button
                      onClick={logout}
                      className="bg-red-500 hover: bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    className="text-green-600 hover: text-green-700 px-4 py-2 transition-colors"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-600"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col gap-4">
                <Link
                  to="/tables"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-600 hover:text-green-600"
                >
                  Danh sách bàn
                </Link>
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/my-bookings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-gray-600 hover: text-green-600"
                    >
                      Lịch sử đặt bàn
                    </Link>
                    <Link
                      to="/notifications"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-gray-600 hover:text-green-600 flex items-center gap-2"
                    >
                      Thông báo
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-gray-600 hover: text-green-600"
                    >
                      Thông tin cá nhân
                    </Link>
                    {(user?.role === 'admin' || user?.role === 'staff') && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-purple-600 hover: text-purple-700"
                      >
                        Trang Admin
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="text-left text-red-600 hover:text-red-700"
                    >
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-green-600"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-green-600"
                    >
                      Đăng ký
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md: grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold text-green-400 mb-4">🎱 Bida Booking</h3>
              <p className="text-gray-400">
                Hệ thống đặt bàn bida trực tuyến - Nhanh chóng, tiện lợi, dễ sử dụng.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Liên kết</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/tables" className="hover:text-green-400">Danh sách bàn</Link></li>
                <li><Link to="/register" className="hover: text-green-400">Đăng ký</Link></li>
                <li><Link to="/login" className="hover: text-green-400">Đăng nhập</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Liên hệ</h4>
              <ul className="space-y-2 text-gray-400">
                <li>📧 support@bidabooking.com</li>
                <li>📞 0901 234 567</li>
                <li>📍 TP. Hà Nội, Việt Nam</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>© 2026 Bida Booking. Made with ❤️ by Kaiser2484</p>
          </div>
        </div>
      </footer>
    </div>
  );
}