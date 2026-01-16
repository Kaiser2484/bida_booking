import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import api from '../services/api';

export default function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('vnpay');

  useEffect(() => {
    fetchBookingAndPayment();
  }, [bookingId]);

  const fetchBookingAndPayment = async () => {
    try {
      setLoading(true);
      
      const [bookingRes, paymentRes] = await Promise.all([
        api. get(`/bookings/${bookingId}`),
        api.get(`/payments/booking/${bookingId}`),
      ]);
      
      setBooking(bookingRes.data. booking);
      setPayment(paymentRes.data.payment);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Không thể tải thông tin đơn đặt bàn');
      navigate('/my-bookings');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setProcessing(true);
      
      if (paymentMethod === 'vnpay' || paymentMethod === 'momo') {
        // Create VNPay/MoMo payment URL
        const response = await api.post('/payments/create-vnpay-url', {
          bookingId,
          amount: booking.total_amount,
          bankCode: '',
          language: 'vn',
        });
        
        // For demo, use mock success URL
        // In production, redirect to response.data.paymentUrl
        window.location.href = response.data.mockSuccessUrl;
      } else {
        // Cash payment - redirect to success
        toast.success('Vui lòng thanh toán tại quầy khi đến! ');
        navigate('/my-bookings');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Không thể xử lý thanh toán');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (payment?. payment_status === 'completed') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg text-center">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            Đã thanh toán
          </h1>
          <p className="text-gray-600 mb-6">
            Đơn đặt bàn này đã được thanh toán thành công. 
          </p>
          <button
            onClick={() => navigate('/my-bookings')}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Xem lịch sử đặt bàn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        💳 Thanh Toán
      </h1>

      {/* Booking Summary */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Thông tin đặt bàn
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Mã đặt bàn: </span>
            <span className="font-medium">#{bookingId?. slice(0, 8)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Bàn:</span>
            <span className="font-medium">
              Bàn {booking?. table_number} - {booking?.table_type}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Câu lạc bộ:</span>
            <span className="font-medium">{booking?.club_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Ngày:</span>
            <span className="font-medium">
              {dayjs(booking?.booking_date).format('DD/MM/YYYY')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Thời gian:</span>
            <span className="font-medium">
              {booking?.start_time} - {booking?.end_time}
            </span>
          </div>
          <hr className="my-4" />
          <div className="flex justify-between text-lg">
            <span className="font-bold">Tổng tiền:</span>
            <span className="font-bold text-green-600">
              {new Intl.NumberFormat('vi-VN').format(booking?.total_amount)}đ
            </span>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Phương thức thanh toán
        </h2>
        <div className="space-y-3">
          <label
            className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              paymentMethod === 'vnpay'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="vnpay"
              checked={paymentMethod === 'vnpay'}
              onChange={(e) => setPaymentMethod(e. target.value)}
              className="w-5 h-5 text-green-500"
            />
            <div className="flex-1">
              <p className="font-medium">VNPay</p>
              <p className="text-sm text-gray-500">
                Thanh toán qua VNPay (ATM, Visa, MasterCard)
              </p>
            </div>
            <span className="text-2xl">💳</span>
          </label>

          <label
            className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              paymentMethod === 'momo'
                ? 'border-green-500 bg-green-50'
                :  'border-gray-200 hover: border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="momo"
              checked={paymentMethod === 'momo'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-5 h-5 text-green-500"
            />
            <div className="flex-1">
              <p className="font-medium">MoMo</p>
              <p className="text-sm text-gray-500">
                Thanh toán qua ví MoMo
              </p>
            </div>
            <span className="text-2xl">📱</span>
          </label>

          <label
            className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              paymentMethod === 'cash'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-5 h-5 text-green-500"
            />
            <div className="flex-1">
              <p className="font-medium">Tiền mặt</p>
              <p className="text-sm text-gray-500">
                Thanh toán khi đến câu lạc bộ
              </p>
            </div>
            <span className="text-2xl">💵</span>
          </label>
        </div>
      </div>

      {/* Pay Button */}
      <button
        onClick={handlePayment}
        disabled={processing}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl text-lg transition-colors"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Đang xử lý... 
          </span>
        ) : paymentMethod === 'cash' ? (
          'Xác nhận đặt bàn'
        ) : (
          `Thanh toán ${new Intl.NumberFormat('vi-VN').format(booking?.total_amount)}đ`
        )}
      </button>
    </div>
  );
}