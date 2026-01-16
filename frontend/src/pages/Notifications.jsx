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
  PAYMENT_COMPLETED: '💰',
  PAYMENT_REFUNDED: '💸',
  BOOKING_REMINDER: '⏰',
};

const notificationTitles = {
  USER_REGISTERED: 'Chào mừng! ',
  BOOKING_CREATED: 'Đặt bàn mới',
  BOOKING_CONFIRMED: 'Đặt bàn được xác nhận',
  BOOKING_CANCELLED: 'Đặt bàn đã hủy',
  PAYMENT_COMPLETED: 'Thanh toán thành công',
  PAYMENT_REFUNDED: 'Hoàn tiền thành công',
  BOOKING_REMINDER:  'Nhắc nhở đặt bàn',
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
      const response = await api.get(`/notifications/user/${user. id}`);
      setNotifications(response.data. notifications);
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
    } catch (error) {
      console.error('Mark all read error:', error);
    }
  };

  const unreadCount = notifications. filter((n) => !n.read).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          🔔 Thông Báo
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-green-600 hover: underline text-sm"
          >
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">🔕</div>
          <p className="text-gray-500 text-lg">Bạn chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications. map((notification, index) => (
            <div
              key={notification.id || index}
              className={`bg-white rounded-xl shadow-lg p-4 transition-colors ${
                ! notification.read ?  'border-l-4 border-green-500' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">
                  {notificationIcons[notification. type] || '📬'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-800">
                      {notificationTitles[notification.type] || 'Thông báo'}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {dayjs(notification. timestamp).fromNow()}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {notification.type === 'BOOKING_CREATED' && (
                      <>
                        Đơn đặt bàn #{notification.data?. bookingId?. slice(0, 8)} đã được tạo. {' '}
                        <Link
                          to={`/payment/${notification.data?. bookingId}`}
                          className="text-green-600 hover: underline"
                        >
                          Thanh toán ngay
                        </Link>
                      </>
                    )}
                    {notification.type === 'BOOKING_CONFIRMED' && (
                      <>Đơn đặt bàn #{notification. data?.bookingId?.slice(0, 8)} đã được xác nhận.</>
                    )}
                    {notification.type === 'BOOKING_CANCELLED' && (
                      <>Đơn đặt bàn #{notification.data?.bookingId?.slice(0, 8)} đã bị hủy. </>
                    )}
                    {notification.type === 'PAYMENT_COMPLETED' && (
                      <>Thanh toán cho đơn #{notification. data?.bookingId?.slice(0, 8)} thành công! </>
                    )}
                    {notification. type === 'USER_REGISTERED' && (
                      <>Chào mừng bạn đến với Bida Booking! Hãy đặt bàn đầu tiên của bạn.</>
                    )}
                  </p>
                  {! notification.read && (
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Mới
                    </span>
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