import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function Profile() {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.full_name || user.fullName || '',
        phone: user.phone || '',
      }));
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await api.patch('/users/profile', {
        fullName: formData. fullName,
        phone: formData. phone,
      });
      toast.success('Cập nhật thông tin thành công!');
    } catch (error) {
      toast. error('Không thể cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData. confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    
    try {
      setLoading(true);
      await api.patch('/users/change-password', {
        currentPassword: formData.currentPassword,
        newPassword:  formData.newPassword,
      });
      toast.success('Đổi mật khẩu thành công!');
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword:  '',
        confirmPassword: '',
      }));
    } catch (error) {
      const message = error.response?.data?.error || 'Không thể đổi mật khẩu';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        👤 Thông Tin Cá Nhân
      </h1>

      {/* Profile Info */}
      <form onSubmit={handleUpdateProfile} className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Thông tin cơ bản
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ và tên
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e. target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus: border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target. value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus: ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
          </button>
        </div>
      </form>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Đổi mật khẩu
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              value={formData. currentPassword}
              onChange={(e) => setFormData({ ... formData, currentPassword: e.target. value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus: ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e. target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover: bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>

      {/* Account Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Tài khoản
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Vai trò</p>
              <p className="text-sm text-gray-500">{user?.role || 'customer'}</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {user?.role === 'admin' ?  'Quản trị viên' : 
               user?.role === 'staff' ? 'Nhân viên' :  'Khách hàng'}
            </span>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Ngày tham gia</p>
              <p className="text-sm text-gray-500">
                {new Date(user?.created_at).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>

          <hr className="my-4" />
          
          <button
            onClick={logout}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}