import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    // Celebration confetti
    confetti({
      particleCount: 100,
      spread:  70,
      origin: { y:  0.6 },
    });
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          Thanh toán thành công!
        </h1>
        <p className="text-gray-600 mb-6">
          Đơn đặt bàn <strong>#{bookingId?. slice(0, 8)}</strong> của bạn đã được xác nhận. 
        </p>
        <p className="text-gray-500 mb-8">
          Chúng tôi đã gửi email xác nhận đến địa chỉ email của bạn.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to="/my-bookings"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Xem lịch sử đặt bàn
          </Link>
          <Link
            to="/"
            className="text-green-600 hover:underline"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}