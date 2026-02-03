import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
    duration: 2, // hours
    notes: '',
  });

  // Duration options
  const durationOptions = [
    { value: 1, label: '1 giờ' },
    { value: 1.5, label: '1 giờ 30 phút' },
    { value: 2, label: '2 giờ' },
    { value: 2.5, label: '2 giờ 30 phút' },
    { value: 3, label: '3 giờ' },
    { value: 4, label: '4 giờ' },
    { value: 5, label: '5 giờ' },
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để đặt bàn');
      navigate('/login');
      return;
    }
    fetchTable();
  }, [tableId, isAuthenticated]);

  const fetchTable = async () => {
    try {
      const response = await api.get(`/tables/${tableId}`);
      setTable(response.data.table);
    } catch (error) {
      console.error('Error fetching table:', error);
      toast.error('Không tìm thấy bàn');
      navigate('/tables');
    } finally {
      setLoading(false);
    }
  };

  // Calculate end time based on start + duration
  const getEndTime = () => {
    const start = dayjs(`2000-01-01 ${formData.startTime}`);
    const end = start.add(formData.duration, 'hour');
    return end.format('HH:mm');
  };

  const calculateTotal = () => {
    if (!table) return 0;
    return formData.duration * parseFloat(table.price_per_hour);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    if (dayjs(formData.bookingDate).isBefore(dayjs(), 'day')) {
      toast.error('Không thể đặt bàn cho ngày trong quá khứ');
      return;
    }

    if (formData.duration < 1) {
      toast.error('Thời gian thuê tối thiểu là 1 giờ');
      return;
    }

    const endTime = getEndTime();

    try {
      setSubmitting(true);

      const response = await api.post('/bookings', {
        userId: user.id,
        tableId,
        bookingDate: formData.bookingDate,
        startTime: formData.startTime,
        endTime: endTime,
        notes: formData.notes,
      });

      toast.success('Đặt bàn thành công! Chuyển đến thanh toán...');
      navigate(`/payment/${response.data.booking.id}`);
    } catch (error) {
      const message = error.response?.data?.error || 'Đặt bàn thất bại';
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
    <div className="min-h-[80vh]">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-green-600 to-green-800 text-white py-8">
        <div className="container mx-auto px-4">
          <Link to="/tables" className="inline-flex items-center gap-2 text-green-100 hover:text-white mb-4 transition-colors">
            ← Quay lại danh sách bàn
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            🎱 Đặt Bàn {table?.table_number}
          </h1>
          <p className="text-green-100">
            {table?.type_name} • {table?.club_name}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Table Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 border-l-green-500">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span> Thông tin bàn
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 block text-xs mb-1">Bàn số</span>
              <span className="font-semibold text-lg">{table.table_number}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 block text-xs mb-1">Loại bàn</span>
              <span className="font-semibold">{table.type_name}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 block text-xs mb-1">Câu lạc bộ</span>
              <span className="font-semibold">{table.club_name}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 block text-xs mb-1">Giá</span>
              <span className="font-semibold text-green-600">
                {new Intl.NumberFormat('vi-VN').format(table.price_per_hour)}đ/giờ
              </span>
            </div>
            <div className="col-span-2 bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 block text-xs mb-1">Địa chỉ</span>
              <span className="font-medium">{table.address}</span>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📅</span> Thông tin đặt bàn
          </h2>

          <div className="space-y-5">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày đặt
              </label>
              <input
                type="date"
                value={formData.bookingDate}
                min={dayjs().format('YYYY-MM-DD')}
                onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giờ bắt đầu
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thời gian thuê
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, duration: Math.max(0.5, formData.duration - 0.5) })}
                    className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl transition-colors flex items-center justify-center"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-3xl font-bold text-green-600">{formData.duration}</div>
                    <div className="text-sm text-gray-500">giờ</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, duration: Math.min(12, formData.duration + 0.5) })}
                    className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* End Time Display */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-2">
                  <span className="text-xl">🕐</span>
                  Thời gian kết thúc (dự kiến)
                </span>
                <span className="font-bold text-blue-600 text-lg">
                  {getEndTime()}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú (tùy chọn)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ví dụ: Cần dọn bàn trước 15 phút..."
              />
            </div>

            {/* Total */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-600 block text-sm">Tổng tiền (dự kiến)</span>
                  <span className="text-xs text-gray-500">Dựa trên thời gian đã chọn</span>
                </div>
                <span className="font-bold text-green-600 text-2xl">
                  {new Intl.NumberFormat('vi-VN').format(calculateTotal())}đ
                </span>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg text-lg"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Đang xử lý...
                </span>
              ) : (
                '✓ Xác nhận đặt bàn'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
