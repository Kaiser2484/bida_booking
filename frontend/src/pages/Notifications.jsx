import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import api from '../services/api';
import useAuthStore from '../store/authStore';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const notificationIcons = {
  USER_REGISTERED: '👋',
  BOOKING_CREATED: '📝',
  BOOKING_CONFIRMED: '✅',
  BOOKING_CANCELLED: '❌',
  BOOKING_COMPLETED: '🎉',
  PAYMENT_COMPLETED: '💰',
  PAYMENT_REFUNDED: '💸',
  BOOKING_REMINDER: '⏰',
};

const notificationColors = {
  USER_REGISTERED: 'border-l-purple-500',
  BOOKING_CREATED: 'border-l-blue-500',
  BOOKING_CONFIRMED: 'border-l-green-500',
  BOOKING_CANCELLED: 'border-l-red-500',
  BOOKING_COMPLETED: 'border-l-indigo-500',
  PAYMENT_COMPLETED: 'border-l-emerald-500',
  PAYMENT_REFUNDED: 'border-l-yellow-500',
  BOOKING_REMINDER: 'border-l-orange-500',
};

const notificationTitles = {
  USER_REGISTERED: 'Chào mừng!',
  BOOKING_CREATED: 'Đặt bàn mới',
  BOOKING_CONFIRMED: 'Đặt bàn được xác nhận',
  BOOKING_CANCELLED: 'Đặt bàn đã hủy',
  BOOKING_COMPLETED: 'Đơn hàng hoàn tất',
  PAYMENT_COMPLETED: 'Thanh toán thành công',
  PAYMENT_REFUNDED: 'Hoàn tiền thành công',
  BOOKING_REMINDER: 'Nhắc nhở đặt bàn',
};

export default function Notifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/notifications/user/${user.id}`);
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch(`/notifications/user/${user.id}/read-all`);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      window.dispatchEvent(new Event('refreshNotifications'));
    } catch (error) {
      console.error('Mark all read error:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-[80vh]">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-orange-500 to-orange-700 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                🔔 Thông Báo
              </h1>
              <p className="text-orange-100">
                {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc` : 'Tất cả thông báo đã được đọc'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="mt-4 md:mt-0 bg-white text-orange-700 hover:bg-orange-50 px-6 py-3 rounded-xl font-bold transition-colors shadow-lg"
              >
                ✓ Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔕</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Chưa có thông báo nào</h3>
            <p className="text-gray-500 mb-6">Các thông báo về đặt bàn, thanh toán sẽ xuất hiện ở đây</p>
            <Link
              to="/tables"
              className="inline-block bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg"
            >
              🎱 Đặt bàn ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification, index) => (
              <div
                key={notification.id || index}
                className={`bg-white rounded-xl shadow-lg p-5 transition-all border-l-4 ${notificationColors[notification.type] || 'border-l-gray-500'
                  } ${!notification.read ? 'ring-2 ring-orange-200' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">
                    {notificationIcons[notification.type] || '📬'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-800 text-lg">
                        {notificationTitles[notification.type] || 'Thông báo'}
                      </h3>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {dayjs(notification.timestamp).fromNow()}
                      </span>
                    </div>
                    <p className="text-gray-600">
                      {notification.type === 'BOOKING_CREATED' && (
                        <>
                          Đơn đặt bàn #{String(notification.data?.bookingId || '').slice(0, 8) || notification.data?.bookingId} đã được tạo.{' '}
                          <Link
                            to={`/payment/${notification.data?.bookingId}`}
                            className="text-orange-600 hover:text-orange-700 font-medium underline"
                          >
                            Thanh toán ngay →
                          </Link>
                        </>
                      )}
                      {notification.type === 'BOOKING_CONFIRMED' && (
                        <>Đơn đặt bàn #{notification.data?.bookingId} đã được xác nhận. Hẹn gặp bạn! 🎱</>
                      )}
                      {notification.type === 'BOOKING_CANCELLED' && (
                        <>Đơn đặt bàn #{notification.data?.bookingId} đã bị hủy.</>
                      )}
                      {notification.type === 'BOOKING_COMPLETED' && (
                        <>Đơn đặt bàn #{notification.data?.bookingId} đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ! 🎉</>
                      )}
                      {notification.type === 'PAYMENT_COMPLETED' && (
                        <>Thanh toán cho đơn #{notification.data?.bookingId} thành công! 🎉</>
                      )}
                      {notification.type === 'USER_REGISTERED' && (
                        <>Chào mừng bạn đến với Bida Booking! Hãy đặt bàn đầu tiên của bạn.</>
                      )}
                      {/* Fallback to message from backend if available and no specific type matched above */}
                      {!['BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_COMPLETED', 'PAYMENT_COMPLETED', 'USER_REGISTERED'].includes(notification.type) && notification.message && (
                        <>{notification.message}</>
                      )}
                    </p>
                    {!notification.read && (
                      <span className="inline-block mt-3 px-3 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                        🆕 Mới
                      </span>
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
