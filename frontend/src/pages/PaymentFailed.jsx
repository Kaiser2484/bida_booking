import { Link, useSearchParams } from 'react-router-dom';

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Thanh toán thất bại
        </h1>
        <p className="text-gray-600 mb-6">
          Rất tiếc, thanh toán cho đơn đặt bàn của bạn không thành công.
        </p>
        <p className="text-gray-500 mb-8">
          Vui lòng thử lại hoặc chọn phương thức thanh toán khác.
        </p>
        <div className="flex flex-col gap-3">
          {bookingId && (
            <Link
              to={`/payment/${bookingId}`}
              className="bg-green-500 hover: bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Thử thanh toán lại
            </Link>
          )}
          <Link
            to="/my-bookings"
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Xem đơn đặt bàn
          </Link>
          <Link
            to="/"
            className="text-green-600 hover: underline"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}