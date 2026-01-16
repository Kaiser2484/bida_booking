import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function MyBookings() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      toast. error('Vui lòng đăng nhập');
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [isAuthenticated, filter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ?  { status: filter } : {};
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
    if (! confirm('Bạn có chắc chắn muốn hủy đặt bàn này?')) return;

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        📋 Lịch Sử Đặt Bàn
      </h1>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target. value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus: ring-green-500"
        >
          <option value="all">Tất cả</option>
          <option value="pending">Chờ xác nhận</option>
          <option value="confirmed">Đã xác nhận</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <p className="text-gray-500 text-lg">Bạn chưa có đơn đặt bàn nào</p>
          <button
            onClick={() => navigate('/tables')}
            className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg"
          >
            Đặt bàn ngay
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-xl shadow-lg p-6 hover: shadow-xl transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Booking Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">
                      Bàn {booking. table_number} - {booking.table_type}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[booking.status]}`}>
                      {statusText[booking.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    📍 {booking.club_name}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    📅 {dayjs(booking.booking_date).format('DD/MM/YYYY')} | 
                    ⏰ {booking.start_time} - {booking.end_time}
                  </p>
                  <p className="text-sm font-semibold text-green-600">
                    💰 {new Intl.NumberFormat('vi-VN').format(booking.total_amount)}đ
                  </p>
                  {booking.notes && (
                    <p className="text-sm text-gray-500 mt-2">
                      📝 {booking. notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="px-4 py-2 bg-red-500 hover: bg-red-600 text-white rounded-lg text-sm transition-colors"
                    >
                      Hủy đặt
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}