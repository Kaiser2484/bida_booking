import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const statusColors = {
  available: 'bg-green-100 text-green-800',
  occupied: 'bg-red-100 text-red-800',
  reserved: 'bg-yellow-100 text-yellow-800',
  maintenance: 'bg-gray-100 text-gray-800',
};

const statusText = {
  available: 'Trống',
  occupied: 'Đang sử dụng',
  reserved: 'Đã đặt',
  maintenance: 'Bảo trì',
};

export default function ManageTables() {
  const [tables, setTables] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [tableTypes, setTableTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState('');
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({
    clubId: '',
    tableTypeId: '',
    tableNumber: '',
    name: '',
    hourlyRate: '',
    floor: 1,
  });

  useEffect(() => {
    fetchData();
  }, [selectedClub]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tablesRes, clubsRes, typesRes] = await Promise.all([
        api.get('/tables', { params: selectedClub ? { clubId: selectedClub } : {} }),
        api.get('/clubs'),
        api.get('/table-types'),
      ]);

      setTables(tablesRes.data.tables);
      setClubs(clubsRes.data.clubs);
      setTableTypes(typesRes.data.tableTypes);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      clubId: '',
      tableTypeId: '',
      tableNumber: '',
      name: '',
      hourlyRate: '',
      floor: 1,
    });
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();

    try {
      await api.post('/tables', formData);
      toast.success('Tạo bàn thành công!');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Không thể tạo bàn');
    }
  };

  const handleEditClick = (table) => {
    setEditingTable(table);
    setFormData({
      clubId: table.club_id,
      tableTypeId: table.table_type_id,
      tableNumber: table.table_number,
      name: table.name || '',
      hourlyRate: table.hourly_rate || '',
      floor: table.floor || 1,
    });
    setShowEditModal(true);
  };

  const handleUpdateTable = async (e) => {
    e.preventDefault();

    try {
      await api.put(`/tables/${editingTable.id}`, formData);
      toast.success('Cập nhật bàn thành công!');
      setShowEditModal(false);
      setEditingTable(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Không thể cập nhật bàn');
    }
  };

  const handleDeleteTable = async (tableId) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bàn này?')) return;

    try {
      await api.delete(`/tables/${tableId}`);
      toast.success('Xóa bàn thành công!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Không thể xóa bàn');
    }
  };

  const handleUpdateStatus = async (tableId, status) => {
    try {
      await api.patch(`/tables/${tableId}/status`, { status });
      toast.success('Cập nhật trạng thái thành công');
      fetchData();
    } catch (error) {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          🎱 Quản Lý Bàn Bida
        </h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          + Thêm bàn mới
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <label className="font-medium">Lọc theo CLB:</label>
          <select
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">Tất cả</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden"
            >
              <div className={`h-2 ${table.status === 'available' ? 'bg-green-500' :
                  table.status === 'occupied' ? 'bg-red-500' :
                    table.status === 'reserved' ? 'bg-yellow-500' : 'bg-gray-500'
                }`}></div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold">Bàn {table.table_number}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[table.status]}`}>
                    {statusText[table.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{table.type_name}</p>
                <p className="text-sm text-gray-500 mb-1">Tầng {table.floor}</p>
                <p className="text-sm text-green-600 font-medium mb-1">
                  💰 {formatPrice(table.hourly_rate || table.price_per_hour)}đ/giờ
                </p>
                <p className="text-xs text-gray-400 mb-3">{table.club_name}</p>

                {/* Status Select */}
                <select
                  value={table.status}
                  onChange={(e) => handleUpdateStatus(table.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 mb-3"
                >
                  <option value="available">Trống</option>
                  <option value="occupied">Đang sử dụng</option>
                  <option value="reserved">Đã đặt</option>
                  <option value="maintenance">Bảo trì</option>
                </select>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(table)}
                    className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    onClick={() => handleDeleteTable(table.id)}
                    className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Table Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Thêm bàn mới
            </h2>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Câu lạc bộ
                </label>
                <select
                  value={formData.clubId}
                  onChange={(e) => setFormData({ ...formData, clubId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Chọn câu lạc bộ</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại bàn
                </label>
                <select
                  value={formData.tableTypeId}
                  onChange={(e) => setFormData({ ...formData, tableTypeId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Chọn loại bàn</option>
                  {tableTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số bàn
                </label>
                <input
                  type="text"
                  value={formData.tableNumber}
                  onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="VD: 01, A1, B2..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên bàn
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="VD: Bàn VIP 1..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá theo giờ (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="VD: 50000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tầng
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  Tạo bàn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {showEditModal && editingTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Chỉnh sửa bàn {editingTable.table_number}
            </h2>
            <form onSubmit={handleUpdateTable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại bàn
                </label>
                <select
                  value={formData.tableTypeId}
                  onChange={(e) => setFormData({ ...formData, tableTypeId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  {tableTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số bàn
                </label>
                <input
                  type="text"
                  value={formData.tableNumber}
                  onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="VD: 01, A1, B2..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên bàn
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="VD: Bàn VIP 1..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá theo giờ (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="VD: 50000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tầng
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingTable(null); }}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
