import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { connectSocket, onTableStatusChange, offTableStatusChange } from '../services/socket';

const statusColors = {
  available: 'bg-green-500',
  occupied:  'bg-red-500',
  reserved: 'bg-yellow-500',
  maintenance: 'bg-gray-500',
};

const statusText = {
  available: 'Trống',
  occupied:  'Đang sử dụng',
  reserved:  'Đã đặt',
  maintenance: 'Bảo trì',
};

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubs();
    fetchTables();
    
    // Connect to socket for real-time updates
    connectSocket();
    
    onTableStatusChange((data) => {
      setTables((prev) =>
        prev.map((table) =>
          table.id === data.tableId
            ? { ... table, status: data.status }
            : table
        )
      );
    });

    return () => {
      offTableStatusChange();
    };
  }, [selectedClub]);

  const fetchClubs = async () => {
    try {
      const response = await api.get('/clubs');
      setClubs(response.data.clubs);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const params = selectedClub ? { clubId: selectedClub } : {};
      const response = await api.get('/tables', { params });
      setTables(response.data.tables);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        🎱 Danh Sách Bàn Bida
      </h1>

      {/* Filter by Club */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chọn câu lạc bộ:
        </label>
        <select
          value={selectedClub}
          onChange={(e) => setSelectedClub(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus: border-transparent"
        >
          <option value="">Tất cả câu lạc bộ</option>
          {clubs. map((club) => (
            <option key={club.id} value={club. id}>
              {club.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-4 mb-6">
        {Object. entries(statusText).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-4 h-4 rounded-full ${statusColors[key]}`}></span>
            <span className="text-sm text-gray-600">{value}</span>
          </div>
        ))}
      </div>

      {/* Tables Grid */}
      {loading ?  (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className={`h-2 ${statusColors[table.status]}`}></div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-800">
                    Bàn {table.table_number}
                  </h3>
                  <span className="text-xs text-gray-500">Tầng {table.floor}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{table.type_name}</p>
                <p className="text-sm text-green-600 font-semibold mb-3">
                  {new Intl.NumberFormat('vi-VN').format(table.price_per_hour)}đ/giờ
                </p>
                <p className="text-xs text-gray-500 mb-3">{table.club_name}</p>
                
                {table.status === 'available' ?  (
                  <Link
                    to={`/booking/${table.id}`}
                    className="block w-full text-center bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors"
                  >
                    Đặt bàn
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 py-2 rounded-lg cursor-not-allowed"
                  >
                    {statusText[table.status]}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {! loading && tables.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Không có bàn nào trong câu lạc bộ này
        </div>
      )}
    </div>
  );
}