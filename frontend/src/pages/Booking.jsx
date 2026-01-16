import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function Booking() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    bookingDate: dayjs().format('YYYY-MM-DD'),
    startTime: '08:00',
    endTime: '10:00',
    notes: '',
  });

  useEffect(() => {
    if (! isAuthenticated) {
      toast.error('Vui lòng đăng nhập để đặt bàn');
      navigate('/login');
      return;
    }
    fetchTable();
  }, [tableId, isAuthenticated]);

  const fetchTable = async () => {
    try {
      const response = await api. get(`/tables/${tableId}`);
      setTable(response.data. table);
    } catch (error) {
      console.error('Error fetching table:', error);
      toast.error('Không tìm thấy bàn');
      navigate('/tables');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!table) return 0;
    const start = dayjs(`2000-01-01 ${formData.startTime}`);
    const end = dayjs(`2000-01-01 ${formData.endTime}`);
    const hours = end.diff(start, 'hour', true);
    return Math.max(0, hours * parseFloat(table.price_per_hour));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    const start = dayjs(`2000-01-01 ${formData. startTime}`);
    const end = dayjs(`2000-01-01 ${formData.endTime}`);
    
    if (end.isBefore(start) || end.isSame(start)) {
      toast. error('Giờ kết thúc phải sau giờ bắt đầu');
      return;
    }

    if (dayjs(formData.bookingDate).isBefore(dayjs(), 'day')) {
      toast.error('Không thể đặt bàn cho ngày trong quá khứ');
      return;
    }

    try {
      setSubmitting(true);
      
      await api.post('/bookings', {
        userId: user.id,
        tableId,
        bookingDate: formData.bookingDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        notes: formData.notes,
      });

      toast.success('Đặt bàn thành công!');
      navigate('/my-bookings');
    } catch (error) {
      const message = error.response?. data?.error || 'Đặt bàn thất bại';
      toast.error(message);
    } finally {
      setSubmitting(false);
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
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        📝 Đặt Bàn Bida
      </h1>

      {/* Table Info */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Thông tin bàn
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Bàn số:</span>
            <span className="ml-2 font-semibold">{table.table_number}</span>
          </div>
          <div>
            <span className="text-gray-500">Loại bàn: </span>
            <span className="ml-2 font-semibold">{table.type_name}</span>
          </div>
          <div>
            <span className="text-gray-500">Câu lạc bộ:</span>
            <span className="ml-2 font-semibold">{table.club_name}</span>
          </div>
          <div>
            <span className="text-gray-500">Giá: </span>
            <span className="ml-2 font-semibold text-green-600">
              {new Intl.NumberFormat('vi-VN').format(table.price_per_hour)}đ/giờ
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Địa chỉ:</span>
            <span className="ml-2">{table.address}</span>
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Thông tin đặt bàn
        </h2>

        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngày đặt
            </label>
            <input
              type="date"
              value={formData.bookingDate}
              min={dayjs().format('YYYY-MM-DD')}
              onChange={(e) => setFormData({ ...formData, bookingDate: e. target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giờ bắt đầu
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime:  e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus: ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giờ kết thúc
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime:  e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus: ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú (tùy chọn)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target. value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus: ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Yêu cầu đặc biệt..."
            />
          </div>

          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center text-lg">
              <span className="font-medium text-gray-700">Tổng tiền (dự kiến):</span>
              <span className="font-bold text-green-600 text-xl">
                {new Intl.NumberFormat('vi-VN').format(calculateTotal())}đ
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Đang xử lý...
              </span>
            ) : (
              'Xác nhận đặt bàn'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}