import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('vnpay');
  const [showQR, setShowQR] = useState(false);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchBookingAndPayment();
  }, [bookingId]);

  const fetchBookingAndPayment = async () => {
    try {
      setLoading(true);

      const [bookingRes, paymentRes] = await Promise.all([
        api.get(`/bookings/${bookingId}`),
        api.get(`/payments/booking/${bookingId}`),
      ]);

      setBooking(bookingRes.data.booking);
      setPayment(paymentRes.data.payment);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Không thể tải thông tin đơn đặt bàn');
      navigate('/my-bookings');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = () => {
    setShowQR(true);
  };

  const handleConfirmPayment = async () => {
    try {
      setProcessing(true);

      // Call API to create payment / mock success
      const response = await api.post('/payments/create-vnpay-url', {
        bookingId,
        amount: booking.total_price,
        bankCode: paymentMethod === 'bank' ? 'NCB' : '',
        language: 'vn',
      });

      // Redirect to success URL
      window.location.href = response.data.mockSuccessUrl;
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Không thể xử lý thanh toán');
      setProcessing(false);
    }
  };

  const getQRData = () => {
    const amount = booking?.total_price || 0;
    const content = `BIDA ${bookingId}`;
    const qrUrl = `https://img.vietqr.io/image/MB-0000123456789-compact2.png?amount=${amount}&addInfo=${content}&accountName=BIDA CLUB`;

    if (paymentMethod === 'bank') {
      // VietQR Link
      const bankId = 'MB'; // MBBank
      const accountNo = '0000123456789';
      const template = 'compact2';
      return {
        title: 'Chuyển khoản Ngân hàng',
        img: `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${content}&accountName=BIDA CLUB`,
        instructions: 'Vui lòng mở App Ngân hàng và quét mã VietQR bên dưới.',
        info: [
          { label: 'Ngân hàng', value: 'MB Bank (Quân Đội)' },
          { label: 'Số tài khoản', value: '0000 1234 56789' },
          { label: 'Chủ tài khoản', value: 'BIDA CLUB' },
          { label: 'Số tiền', value: `${new Intl.NumberFormat('vi-VN').format(amount)}đ` },
          { label: 'Nội dung', value: content }
        ]
      };
    } else if (paymentMethod === 'momo') {
      return {
        title: 'Thanh toán MoMo (Demo)',
        img: qrUrl, // Use VietQR as demo
        instructions: 'Mở ứng dụng MoMo (hoặc App Ngân hàng) quét mã để thanh toán Demo.',
        info: [
          { label: 'Ví nhận', value: 'Bida Club Wallet' },
          { label: 'Số điện thoại', value: '0909 123 456' },
          { label: 'Số tiền', value: `${new Intl.NumberFormat('vi-VN').format(amount)}đ` },
          { label: 'Nội dung', value: content }
        ]
      };
    } else {
      return {
        title: 'Thanh toán VNPay (Demo)',
        img: qrUrl, // Use VietQR as demo
        instructions: 'Mở ứng dụng Ngân hàng/VNPay quét mã để thanh toán Demo.',
        info: [
          { label: 'Đơn vị', value: 'VNPay Gateway' },
          { label: 'Mã đơn hàng', value: content },
          { label: 'Số tiền', value: `${new Intl.NumberFormat('vi-VN').format(amount)}đ` }
        ]
      };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (payment?.status === 'completed' || ['confirmed', 'completed'].includes(booking?.status)) {
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

  if (booking?.status === 'cancelled') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg text-center">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Đơn hàng đã hủy
          </h1>
          <p className="text-gray-600 mb-6">
            Đơn đặt bàn này đã bị hủy. Bạn không thể thực hiện thanh toán.
          </p>
          <button
            onClick={() => navigate('/my-bookings')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Quay lại lịch sử đặt bàn
          </button>
        </div>
      </div>
    );
  }

  const qrData = getQRData();

  if (showQR) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <button
            onClick={() => setShowQR(false)}
            className="mb-4 text-gray-500 hover:text-gray-700 flex items-center gap-2"
          >
            ← Quay lại
          </button>
          <h2 className="text-2xl font-bold text-center mb-6">{qrData.title}</h2>

          {paymentMethod !== 'bank' ? (
            <div className="bg-gray-50 p-6 rounded-xl flex flex-col items-center mb-6">
              <img
                src={qrData.img}
                alt="Payment QR"
                className="w-64 h-64 object-contain bg-white rounded-lg shadow-sm mb-4"
              />
              <p className="text-center text-gray-600 text-sm">
                {qrData.instructions}
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 p-6 rounded-xl mb-6 border border-blue-100">
              <p className="text-center text-blue-800 font-medium mb-2">
                Vui lòng chuyển khoản theo thông tin bên dưới
              </p>
              <p className="text-center text-sm text-gray-500">
                Nội dung chuyển khoản chính xác để được xác nhận tự động
              </p>
            </div>
          )}

          <div className="space-y-3 mb-8">
            {qrData.info.map((item, index) => (
              <div key={index} className="flex justify-between border-b border-gray-100 pb-2 last:border-0">
                <span className="text-gray-500">{item.label}</span>
                <span className="font-medium text-right">{item.value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirmPayment}
            disabled={processing}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl text-lg transition-colors"
          >
            {processing ? 'Đang xử lý...' : 'Tôi đã thanh toán'}
          </button>

          <button
            onClick={() => setShowQR(false)}
            disabled={processing}
            className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
          >
            Thay đổi phương thức
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
            <span className="text-gray-500">Mã đặt bàn:</span>
            <span className="font-medium">#{bookingId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Bàn:</span>
            <span className="font-medium">
              Bàn {booking?.table_number} - {booking?.table_type}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Câu lạc bộ:</span>
            <span className="font-medium">{booking?.club_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Ngày:</span>
            <span className="font-medium">
              {dayjs(booking?.start_time).format('DD/MM/YYYY')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Thời gian:</span>
            <span className="font-medium">
              {dayjs(booking?.start_time).format('HH:mm')} - {dayjs(booking?.end_time).format('HH:mm')}
            </span>
          </div>
          <hr className="my-4" />
          <div className="flex justify-between text-lg">
            <span className="font-bold">Tổng tiền:</span>
            <span className="font-bold text-green-600">
              {new Intl.NumberFormat('vi-VN').format(booking?.total_price || 0)}đ
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
            className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${paymentMethod === 'vnpay'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-gray-300'
              }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="vnpay"
              checked={paymentMethod === 'vnpay'}
              onChange={(e) => setPaymentMethod(e.target.value)}
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
            className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${paymentMethod === 'momo'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover: border-gray-300'
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
            className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${paymentMethod === 'bank'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-gray-300'
              }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="bank"
              checked={paymentMethod === 'bank'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-5 h-5 text-green-500"
            />
            <div className="flex-1">
              <p className="font-medium">Chuyển khoản</p>
              <p className="text-sm text-gray-500">
                Chuyển khoản ngân hàng
              </p>
            </div>
            <span className="text-2xl">🏦</span>
          </label>
        </div>
      </div>

      {/* Pay Button */}
      {!(payment?.status === 'completed' || ['confirmed', 'completed'].includes(booking?.status)) ? (
        <button
          onClick={handlePaymentClick}
          disabled={processing}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl text-lg transition-colors"
        >
          Tiếp tục thanh toán
        </button>
      ) : (
        <div className="w-full bg-green-100 text-green-800 font-bold py-4 rounded-xl text-lg text-center border border-green-300">
          ✅ Đã thanh toán thành công
        </div>
      )}
    </div>
  );
}