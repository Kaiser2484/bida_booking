import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-[80vh]">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-600 to-green-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            🎱 Bida Booking
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-green-100">
            Đặt bàn bida online - Nhanh chóng, tiện lợi
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link
              to="/tables"
              className="bg-white text-green-700 hover:bg-green-50 px-8 py-4 rounded-xl font-bold text-lg transition-colors"
            >
              Xem danh sách bàn
            </Link>
            <Link
              to="/register"
              className="bg-green-500 hover:bg-green-400 border-2 border-white px-8 py-4 rounded-xl font-bold text-lg transition-colors"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Tại sao chọn chúng tôi? 
          </h2>
          <div className="grid md: grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Đặt bàn nhanh</h3>
              <p className="text-gray-600">
                Chỉ cần vài click để đặt bàn, xác nhận tức thì
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Theo dõi real-time</h3>
              <p className="text-gray-600">
                Cập nhật trạng thái bàn theo thời gian thực
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-5xl mb-4">💳</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Thanh toán dễ dàng</h3>
              <p className="text-gray-600">
                Hỗ trợ nhiều phương thức thanh toán
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-green-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Sẵn sàng chơi bida? 
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Đặt bàn ngay hôm nay và nhận ưu đãi đặc biệt! 
          </p>
          <Link
            to="/tables"
            className="inline-block bg-white text-green-700 hover:bg-green-50 px-8 py-4 rounded-xl font-bold text-lg transition-colors"
          >
            Đặt bàn ngay →
          </Link>
        </div>
      </section>
    </div>
  );
}