import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  no_show: 'bg-gray-100 text-gray-800',
};

const statusText = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành',
  no_show: 'Không đến',
};

const filterTabs = [
  { key: 'all', label: 'Tất cả', icon: '📋' },
  { key: 'pending', label: 'Chờ xác nhận', icon: '⏳' },
  { key: 'confirmed', label: 'Đã xác nhận', icon: '✅' },
  { key: 'completed', label: 'Hoàn thành', icon: '🎉' },
  { key: 'cancelled', label: 'Đã hủy', icon: '❌' },
];

export default function MyBookings() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập');
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [isAuthenticated, filter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get(`/bookings/user/${user.id}`, { params });
      setBookings(response.data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Không thể tải danh sách đặt bàn');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đặt bàn này?')) return;

    try {
      await api.patch(`/bookings/${bookingId}/cancel`, {
        reason: 'Khách hàng tự hủy',
      });
      toast.success('Hủy đặt bàn thành công');
      fetchBookings();
    } catch (error) {
      const message = error.response?.data?.error || 'Hủy đặt bàn thất bại';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-[80vh]">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                📋 Lịch Sử Đặt Bàn
              </h1>
              <p className="text-blue-100">
                Quản lý tất cả đơn đặt bàn của bạn
              </p>
            </div>
            <Link
              to="/tables"
              className="mt-4 md:mt-0 bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold transition-colors shadow-lg"
            >
              + Đặt bàn mới
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-2 mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${filter === tab.key
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Chưa có đơn đặt bàn nào</h3>
            <p className="text-gray-500 mb-6">Hãy đặt bàn đầu tiên của bạn ngay!</p>
            <Link
              to="/tables"
              className="inline-block bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg"
            >
              🎱 Xem danh sách bàn
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-l-4 border-l-blue-500"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Booking Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-gray-800">
                        🎱 Bàn {booking.table_number}
                      </h3>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-600">{booking.table_type}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[booking.status]}`}>
                        {statusText[booking.status]}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <p className="text-gray-600">
                        📍 {booking.club_name}
                      </p>
                      <p className="text-gray-600">
                        📅 {dayjs(booking.start_time).format('DD/MM/YYYY')}
                      </p>
                      <p className="text-gray-600">
                        ⏰ {dayjs(booking.start_time).format('HH:mm')} - {dayjs(booking.end_time).format('HH:mm')}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <p className="text-lg font-semibold text-green-600">
                        💰 {new Intl.NumberFormat('vi-VN').format(booking.total_price || 0)}đ
                      </p>
                      {booking.notes && (
                        <p className="text-sm text-gray-500">
                          📝 {booking.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {(booking.status === 'pending' || booking.status === 'confirmed') && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors font-medium"
                      >
                        ❌ Hủy đặt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
