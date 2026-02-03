import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import api from '../services/api';

export default function Home() {
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState({ bookings: 0, notifications: 0 });
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchUserStats();
    }
  }, [isAuthenticated, user]);

  const fetchUserStats = async () => {
    try {
      const [bookingsRes, notifRes] = await Promise.all([
        api.get(`/bookings/user/${user.id}`),
        api.get(`/notifications/user/${user.id}/unread-count`),
      ]);
      setStats({
        bookings: bookingsRes.data.bookings?.length || 0,
        notifications: notifRes.data.unreadCount || 0,
      });
      setRecentBookings(bookingsRes.data.bookings?.slice(0, 3) || []);
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  // Logged in user view
  if (isAuthenticated && user) {
    return (
      <div className="min-h-[80vh]">
        {/* Welcome Section */}
        <section className="bg-gradient-to-br from-green-600 to-green-800 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  Chào mừng, {user.full_name || user.fullName}! 👋
                </h1>
                <p className="text-lg text-green-100">
                  Sẵn sàng cho trận bida hôm nay?
                </p>
              </div>
              <Link
                to="/tables"
                className="mt-4 md:mt-0 bg-white text-green-700 hover:bg-green-50 px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
              >
                🎱 Đặt bàn ngay
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="py-8 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/my-bookings" className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-2">📅</div>
                <div className="text-2xl font-bold text-gray-800">{stats.bookings}</div>
                <div className="text-gray-600">Lượt đặt bàn</div>
              </Link>
              <Link to="/notifications" className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-2">🔔</div>
                <div className="text-2xl font-bold text-gray-800">{stats.notifications}</div>
                <div className="text-gray-600">Thông báo mới</div>
              </Link>
              <Link to="/tables" className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-2">🎱</div>
                <div className="text-lg font-bold text-gray-800">Xem bàn</div>
                <div className="text-gray-600">Trống</div>
              </Link>
              <Link to="/profile" className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-2">👤</div>
                <div className="text-lg font-bold text-gray-800">Hồ sơ</div>
                <div className="text-gray-600">Cá nhân</div>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">⚡ Thao tác nhanh</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Link
                to="/tables"
                className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
              >
                <div className="text-3xl mb-3">🎱</div>
                <h3 className="text-xl font-bold mb-1">Đặt bàn mới</h3>
                <p className="text-green-100">Chọn bàn và thời gian phù hợp</p>
              </Link>
              <Link
                to="/my-bookings"
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
              >
                <div className="text-3xl mb-3">📋</div>
                <h3 className="text-xl font-bold mb-1">Lịch sử đặt bàn</h3>
                <p className="text-blue-100">Xem và quản lý các đơn đặt</p>
              </Link>
              <Link
                to="/notifications"
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-6 hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg"
              >
                <div className="text-3xl mb-3">🔔</div>
                <h3 className="text-xl font-bold mb-1">Thông báo</h3>
                <p className="text-purple-100">Cập nhật trạng thái đơn đặt</p>
              </Link>
            </div>
          </div>
        </section>

        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <section className="py-8 bg-gray-50">
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">📅 Đặt bàn gần đây</h2>
                <Link to="/my-bookings" className="text-green-600 hover:text-green-700 font-medium">
                  Xem tất cả →
                </Link>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg">Bàn {booking.table_number}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                        }`}>
                        {booking.status === 'confirmed' ? 'Đã xác nhận' :
                          booking.status === 'pending' ? 'Chờ xác nhận' :
                            booking.status === 'completed' ? 'Hoàn thành' :
                              booking.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-1">📍 {booking.club_name}</p>
                    <p className="text-gray-600 text-sm mb-1">📆 {new Date(booking.booking_date).toLocaleDateString('vi-VN')}</p>
                    <p className="text-gray-600 text-sm">⏰ {booking.start_time} - {booking.end_time}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    );
  }

  // Guest view
  return (
    <div className="min-h-[80vh]">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-600 to-green-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            🎱 Bida Booking
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-green-100">
            Đặt bàn bida online - Nhanh chóng, tiện lợi
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link
              to="/tables"
              className="bg-white text-green-700 hover:bg-green-50 px-8 py-4 rounded-xl font-bold text-lg transition-colors"
            >
              Xem danh sách bàn
            </Link>
            <Link
              to="/register"
              className="bg-green-500 hover:bg-green-400 border-2 border-white px-8 py-4 rounded-xl font-bold text-lg transition-colors"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Tại sao chọn chúng tôi?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Đặt bàn nhanh</h3>
              <p className="text-gray-600">
                Chỉ cần vài click để đặt bàn, xác nhận tức thì
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Theo dõi real-time</h3>
              <p className="text-gray-600">
                Cập nhật trạng thái bàn theo thời gian thực
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-5xl mb-4">💳</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Thanh toán dễ dàng</h3>
              <p className="text-gray-600">
                Hỗ trợ nhiều phương thức thanh toán
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-green-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Sẵn sàng chơi bida?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Đặt bàn ngay hôm nay và nhận ưu đãi đặc biệt!
          </p>
          <Link
            to="/tables"
            className="inline-block bg-white text-green-700 hover:bg-green-50 px-8 py-4 rounded-xl font-bold text-lg transition-colors"
          >
            Đặt bàn ngay →
          </Link>
        </div>
      </section>
    </div>
  );
}
