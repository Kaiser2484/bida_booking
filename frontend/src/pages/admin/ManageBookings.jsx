import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import api from '../../services/api';

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
  cancelled:  'Đã hủy',
  completed: 'Hoàn thành',
  no_show: 'Không đến',
};

export default function ManageBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: dayjs().format('YYYY-MM-DD'),
    status: '',
  });

  useEffect(() => {
    fetchBookings();
  }, [filters]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.date) params.date = filters.date;
      if (filters.status) params.status = filters. status;
      
      const response = await api.get('/bookings', { params });
      setBookings(response. data.bookings);
    } catch (error) {
      console.error('Fetch bookings error:', error);
      toast.error('Không thể tải danh sách đặt bàn');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (bookingId) => {
    try {
      await api.patch(`/bookings/${bookingId}/confirm`);
      toast.success('Đã xác nhận đặt bàn');
      fetchBookings();
    } catch (error) {
      toast.error('Không thể xác nhận đặt bàn');
    }
  };

  const handleCancel = async (bookingId) => {
    if (! confirm('Bạn có chắc chắn muốn hủy đặt bàn này?')) return;
    
    try {
      await api.patch(`/bookings/${bookingId}/cancel`, {
        reason: 'Hủy bởi admin',
      });
      toast.success('Đã hủy đặt bàn');
      fetchBookings();
    } catch (error) {
      toast.error('Không thể hủy đặt bàn');
    }
  };

  const handleComplete = async (bookingId) => {
    try {
      await api.patch(`/bookings/${bookingId}/complete`);
      toast.success('Đã hoàn thành đặt bàn');
      fetchBookings();
    } catch (error) {
      toast. error('Không thể cập nhật trạng thái');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        📋 Quản Lý Đặt Bàn
      </h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngày
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ... filters, date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus: ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ date: '', status: '' })}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Không có đặt bàn nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold">Khách hàng</th>
                  <th className="text-left py-4 px-6 font-semibold">Bàn</th>
                  <th className="text-left py-4 px-6 font-semibold">Thời gian</th>
                  <th className="text-left py-4 px-6 font-semibold">Tổng tiền</th>
                  <th className="text-left py-4 px-6 font-semibold">Trạng thái</th>
                  <th className="text-left py-4 px-6 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {bookings. map((booking) => (
                  <tr key={booking. id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium">{booking.user_name || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{booking. user_phone || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium">Bàn {booking.table_number}</p>
                        <p className="text-sm text-gray-500">{booking.table_type}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium">
                          {dayjs(booking.booking_date).format('DD/MM/YYYY')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.start_time} - {booking.end_time}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-green-600">
                        {new Intl.NumberFormat('vi-VN').format(booking.total_amount)}đ
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[booking.status]}`}>
                        {statusText[booking.status]}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleConfirm(booking.id)}
                              className="px-3 py-1 bg-green-500 hover: bg-green-600 text-white rounded text-sm transition-colors"
                            >
                              Xác nhận
                            </button>
                            <button
                              onClick={() => handleCancel(booking.id)}
                              className="px-3 py-1 bg-red-500 hover: bg-red-600 text-white rounded text-sm transition-colors"
                            >
                              Hủy
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => handleComplete(booking.id)}
                            className="px-3 py-1 bg-blue-500 hover: bg-blue-600 text-white rounded text-sm transition-colors"
                          >
                            Hoàn thành
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}