import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    todayBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch bookings
      const bookingsRes = await api.get('/bookings');
      const bookings = bookingsRes. data. bookings;
      
      // Fetch payment stats
      const paymentStats = await api.get('/payments/stats');
      
      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayBookings = bookings.filter(b => b.booking_date === today);
      const pendingBookings = bookings.filter(b => b.status === 'pending');
      
      setStats({
        totalBookings: bookings. length,
        pendingBookings: pendingBookings.length,
        totalRevenue: parseFloat(paymentStats.data. stats.total_revenue) || 0,
        todayBookings: todayBookings.length,
      });
      
      setRecentBookings(bookings.slice(0, 10));
    } catch (error) {
      console.error('Fetch dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        📊 Bảng Điều Khiển Admin
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Tổng đặt bàn</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalBookings}</p>
            </div>
            <div className="text-4xl">📋</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Chờ xác nhận</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pendingBookings}</p>
            </div>
            <div className="text-4xl">⏳</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Doanh thu</p>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('vi-VN').format(stats.totalRevenue)}đ
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Đặt bàn hôm nay</p>
              <p className="text-3xl font-bold text-blue-600">{stats.todayBookings}</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/admin/bookings"
          className="bg-green-500 hover: bg-green-600 text-white p-4 rounded-xl text-center font-medium transition-colors"
        >
          📋 Quản lý đặt bàn
        </Link>
        <Link
          to="/admin/tables"
          className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl text-center font-medium transition-colors"
        >
          🎱 Quản lý bàn
        </Link>
        <Link
          to="/admin/users"
          className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-xl text-center font-medium transition-colors"
        >
          👥 Quản lý người dùng
        </Link>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Đặt bàn gần đây
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Khách hàng</th>
                <th className="text-left py-3 px-4">Bàn</th>
                <th className="text-left py-3 px-4">Ngày</th>
                <th className="text-left py-3 px-4">Thời gian</th>
                <th className="text-left py-3 px-4">Trạng thái</th>
                <th className="text-left py-3 px-4">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((booking) => (
                <tr key={booking. id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{booking.user_name}</p>
                      <p className="text-sm text-gray-500">{booking.user_phone}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    Bàn {booking.table_number}
                    <br />
                    <span className="text-sm text-gray-500">{booking.club_name}</span>
                  </td>
                  <td className="py-3 px-4">{booking.booking_date}</td>
                  <td className="py-3 px-4">
                    {booking.start_time} - {booking. end_time}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'pending'
                          ?  'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {booking. status === 'confirmed' ?  'Đã xác nhận' : 
                       booking.status === 'pending' ? 'Chờ xác nhận' : booking.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      to={`/admin/bookings/${booking.id}`}
                      className="text-blue-500 hover:underline"
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}