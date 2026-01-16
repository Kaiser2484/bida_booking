import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import api from '../../services/api';

const roleColors = {
  customer: 'bg-blue-100 text-blue-800',
  staff: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
};

const roleText = {
  customer: 'Khách hàng',
  staff: 'Nhân viên',
  admin: 'Admin',
};

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      await api.patch(`/users/${userId}/status`, { isActive: ! isActive });
      toast.success(isActive ? 'Đã vô hiệu hóa tài khoản' : 'Đã kích hoạt tài khoản');
      fetchUsers();
    } catch (error) {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const handleChangeRole = async (userId, role) => {
    try {
      await api.patch(`/users/${userId}/role`, { role });
      toast.success('Cập nhật vai trò thành công');
      fetchUsers();
    } catch (error) {
      toast. error('Không thể cập nhật vai trò');
    }
  };

  const filteredUsers = users. filter(
    (user) =>
      user.full_name?. toLowerCase().includes(search.toLowerCase()) ||
      user.email?. toLowerCase().includes(search.toLowerCase()) ||
      user.phone?. includes(search)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        👥 Quản Lý Người Dùng
      </h1>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e. target.value)}
          placeholder="Tìm kiếm theo tên, email hoặc SĐT..."
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold">Người dùng</th>
                  <th className="text-left py-4 px-6 font-semibold">Liên hệ</th>
                  <th className="text-left py-4 px-6 font-semibold">Vai trò</th>
                  <th className="text-left py-4 px-6 font-semibold">Ngày tham gia</th>
                  <th className="text-left py-4 px-6 font-semibold">Trạng thái</th>
                  <th className="text-left py-4 px-6 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                          {user.full_name?. charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-gray-500">ID: {user.id. slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm">{user.email}</p>
                      <p className="text-sm text-gray-500">{user.phone || 'N/A'}</p>
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${roleColors[user.role]}`}
                      >
                        <option value="customer">Khách hàng</option>
                        <option value="staff">Nhân viên</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {dayjs(user.created_at).format('DD/MM/YYYY')}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            :  'bg-red-100 text-red-800'
                        }`}
                      >
                        {user. is_active ? 'Hoạt động' : 'Vô hiệu'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          user.is_active
                            ?  'bg-red-100 hover:bg-red-200 text-red-700'
                            :  'bg-green-100 hover: bg-green-200 text-green-700'
                        }`}
                      >
                        {user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {! loading && filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Không tìm thấy người dùng nào
          </div>
        )}
      </div>
    </div>
  );
}