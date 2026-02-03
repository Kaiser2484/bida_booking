import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
    cancelled: 'Đã hủy',
    completed: 'Hoàn thành',
    no_show: 'Không đến',
};

export default function BookingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBookingDetail();
    }, [id]);

    const fetchBookingDetail = async () => {
        try {
            setLoading(true);
            const [bookingRes, paymentRes] = await Promise.all([
                api.get(`/bookings/${id}`),
                api.get(`/payments/booking/${id}`).catch(() => ({ data: { payment: null } })),
            ]);
            setBooking(bookingRes.data.booking);
            setPayment(paymentRes.data.payment);
        } catch (error) {
            console.error('Fetch detail error:', error);
            toast.error('Không thể tải thông tin đơn hàng');
            navigate('/admin/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        try {
            await api.patch(`/bookings/${id}/confirm`, { action: 'confirm' });
            toast.success('Đã xác nhận');
            fetchBookingDetail();
        } catch (error) {
            toast.error('Lỗi xác nhận');
        }
    };

    const handleCancel = async () => {
        if (!confirm('Chắc chắn hủy?')) return;
        try {
            await api.patch(`/bookings/${id}/cancel`, { reason: 'Admin hủy' });
            toast.success('Đã hủy đơn');
            fetchBookingDetail();
        } catch (error) {
            toast.error('Lỗi hủy đơn');
        }
    };

    const handleComplete = async () => {
        if (!confirm('Xác nhận hoàn thành đợt chơi?')) return;
        try {
            await api.patch(`/bookings/${id}/complete`, { action: 'complete' });
            toast.success('Đã hoàn thành');
            fetchBookingDetail();
        } catch (error) {
            toast.error('Lỗi cập nhật');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (!booking) return null;

    return (
        <div className="container mx-auto px-4 py-8">
            <Link to="/admin" className="text-gray-500 hover:text-gray-700 mb-6 inline-flex items-center gap-2">
                ← Quay lại Dashboard
            </Link>

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">
                    Chi tiết đơn đặt bàn #{booking.id}
                </h1>
                <div className="flex gap-2">
                    {/* Action Buttons */}
                    {booking.status === 'pending' && (
                        <>
                            <button
                                onClick={handleConfirm}
                                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                            >
                                Xác nhận
                            </button>
                            <button
                                onClick={handleCancel}
                                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                            >
                                Hủy đơn
                            </button>
                        </>
                    )}
                    {booking.status === 'confirmed' && (
                        <button
                            onClick={handleComplete}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                        >
                            Hoàn thành
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Customer Info */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Thông tin khách hàng</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Họ tên:</span>
                            <span className="font-medium">{booking.user_name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Số điện thoại:</span>
                            <span className="font-medium">{booking.user_phone}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Email:</span>
                            <span className="font-medium">{booking.user_email || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Booking Info */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Thông tin đặt bàn</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Trạng thái:</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[booking.status]}`}>
                                {statusText[booking.status]}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Câu lạc bộ:</span>
                            <span className="font-medium">{booking.club_name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Bàn:</span>
                            <span className="font-medium">Bàn {booking.table_number} ({booking.table_type})</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Thời gian:</span>
                            <span className="font-medium">
                                {dayjs(booking.start_time).format('DD/MM/YYYY')} | {dayjs(booking.start_time).format('HH:mm')} - {dayjs(booking.end_time).format('HH:mm')}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Ghi chú:</span>
                            <span className="font-medium">{booking.notes || 'Không có'}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Info */}
                <div className="bg-white rounded-xl shadow-lg p-6 md:col-span-2">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Thông tin thanh toán</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex justify-between text-lg">
                                <span className="font-bold text-gray-700">Tổng tiền:</span>
                                <span className="font-bold text-green-600 text-xl">
                                    {new Intl.NumberFormat('vi-VN').format(booking.total_price || 0)}đ
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Trạng thái thanh toán:</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${(payment?.status === 'completed' || booking.status === 'confirmed') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {(payment?.status === 'completed' || booking.status === 'confirmed') ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                </span>
                            </div>
                        </div>
                        {payment && (
                            <div className="space-y-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                                <p><strong>Mã giao dịch:</strong> {payment.transaction_id || 'N/A'}</p>
                                <p><strong>Phương thức:</strong> {payment.payment_method}</p>
                                <p><strong>Ngày tạo:</strong> {dayjs(payment.created_at).format('DD/MM/YYYY HH:mm')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
