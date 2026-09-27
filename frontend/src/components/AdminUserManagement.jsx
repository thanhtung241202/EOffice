// src/components/AdminUserManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, UserPlus, Lock, Unlock, 
  Trash2, RotateCcw, Edit2, Search, Filter, 
  ShieldCheck, X, Check, Briefcase, Mail
} from 'lucide-react';

const API_USERS = 'http://localhost:5000/api/users';

const DEPARTMENTS = [
  'Ban Giám đốc',
  'Phòng IT',
  'Kế toán',
  'Ban Kiểm toán',
  'Hành chính Nhân sự',
  'Kinh doanh'
];

export default function AdminUserManagement({ currentAdminId }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'organization'
  const [users, setUsers] = useState([]);
  const [orgData, setOrgData] = useState({ departments: [], members: [] });
  const [loading, setLoading] = useState(false);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal Thêm/Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Phòng IT',
    job_title: '',
    is_admin: false
  });

  const fetchUsers = async () => {
    if (!currentAdminId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedDept !== 'ALL') params.append('department', selectedDept);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);

      const res = await fetch(`${API_USERS}?${params.toString()}`, {
        headers: {
          'x-user-id': currentAdminId
        }
      });
      const json = await res.json();
      if (res.ok) {
        setUsers(json.data || []);
      } else {
        console.error('[Fetch Users Error]:', json.error);
        setUsers([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgStructure = async () => {
    if (!currentAdminId) return;
    try {
      const res = await fetch(`${API_USERS}/organization`, {
        headers: {
          'x-user-id': currentAdminId
        }
      });
      const json = await res.json();
      if (res.ok) {
        setOrgData(json.data || { departments: [], members: [] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchOrgStructure();
    }
  }, [activeTab, search, selectedDept, selectedStatus, currentAdminId]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        department: user.department,
        job_title: user.job_title,
        is_admin: Boolean(user.is_admin)
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        department: 'Phòng IT',
        job_title: '',
        is_admin: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Cập nhật thông tin nhân viên
        const res = await fetch(`${API_USERS}/${editingUser.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': currentAdminId
          },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
      } else {
        // Tạo nhân viên mới
        const res = await fetch(API_USERS, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': currentAdminId
          },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await fetch(`${API_USERS}/${user.id}/toggle-active`, {
        method: 'PATCH',
        headers: {
          'x-user-id': currentAdminId
        }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleSoftDelete = async (user) => {
    if (!window.confirm(`Bạn có chắc chắn muốn vô hiệu hóa và xóa mềm nhân sự ${user.name}?`)) return;
    try {
      const res = await fetch(`${API_USERS}/${user.id}`, {
        method: 'DELETE',
        headers: { 
          'x-user-id': currentAdminId 
        }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestore = async (user) => {
    try {
      const res = await fetch(`${API_USERS}/${user.id}/restore`, {
        method: 'PATCH',
        headers: {
          'x-user-id': currentAdminId
        }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Lỗi khôi phục tài khoản');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      {/* Title Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-200">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Quản trị Hệ thống & Cơ cấu Tổ chức</h1>
          <p className="text-xs text-gray-500 mt-0.5">Quản lý nhân sự, phân cấp chức danh và phân bổ phòng ban</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'users' ? 'bg-red-600 text-white shadow-xs' : 'bg-white border text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Danh sách Nhân sự</span>
          </button>
          <button
            onClick={() => setActiveTab('organization')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'organization' ? 'bg-red-600 text-white shadow-xs' : 'bg-white border text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Cơ cấu Phòng ban</span>
          </button>
          {activeTab === 'users' && (
            <button
              onClick={() => handleOpenModal()}
              className="ml-2 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 shadow-xs transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm nhân sự</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: QUẢN LÝ NHÂN SỰ & XÓA MỀM */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Bộ lọc */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm tên, email, chức danh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Phòng ban:
              </span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white"
              >
                <option value="ALL">Tất cả phòng ban</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Trạng thái:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED">Đang bị khóa</option>
                <option value="DELETED">Đã xóa mềm</option>
              </select>
            </div>
          </div>

          {/* Bảng nhân sự */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="p-3.5">Họ và tên</th>
                    <th className="p-3.5">Phòng ban</th>
                    <th className="p-3.5">Chức danh</th>
                    <th className="p-3.5">Vai trò</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-400">Đang tải dữ liệu...</td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-400">Không tìm thấy nhân sự phù hợp.</td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isDeleted = Boolean(u.deleted_at);
                      return (
                        <tr key={u.id} className={`hover:bg-gray-50/60 transition ${isDeleted ? 'bg-rose-50/30' : ''}`}>
                          <td className="p-3.5">
                            <div className="font-bold text-gray-800 flex items-center gap-1.5">
                              {u.name}
                              {Boolean(u.is_admin) && (
                                <ShieldCheck className="w-3.5 h-3.5 text-red-600" title="Quản trị viên" />
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" /> {u.email}
                            </div>
                          </td>
                          <td className="p-3.5 font-medium text-gray-700">{u.department}</td>
                          <td className="p-3.5 text-gray-600">{u.job_title}</td>
                          <td className="p-3.5">
                            {Boolean(u.is_admin) ? (
                              <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">Admin</span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">Nhân viên</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {isDeleted ? (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">Đã xóa mềm</span>
                            ) : u.is_active ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded">Hoạt động</span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded">Đã khóa</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            {isDeleted ? (
                              <button
                                onClick={() => handleRestore(u)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Khôi phục tài khoản"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOpenModal(u)}
                                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                                  title="Chỉnh sửa thông tin"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleActive(u)}
                                  className={`p-1.5 rounded ${u.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                  title={u.is_active ? 'Khóa đăng nhập' : 'Kích hoạt lại'}
                                >
                                  {u.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleSoftDelete(u)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                                  title="Xóa mềm"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CƠ CẤU PHÒNG BAN & HIERARCHY */}
      {activeTab === 'organization' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orgData.departments.map((dept) => {
            const deptMembers = orgData.members.filter((m) => m.department === dept.department && !m.deleted_at);
            return (
              <div key={dept.department} className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-red-50 text-red-600">
                      <Building2 className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">{dept.department}</h3>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {dept.active_members} nhân sự đang hoạt động
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {dept.total_members} người
                  </span>
                </div>

                {/* Danh sách thành viên trong phòng ban */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cấu trúc nhân sự:</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {deptMembers.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                        <div className="truncate mr-2">
                          <p className="font-semibold text-gray-800 truncate">{m.name}</p>
                          <span className="text-[10px] text-gray-400">{m.job_title}</span>
                        </div>
                        {Boolean(m.is_admin) && (
                          <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">Admin</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL THÊM / SỬA NHÂN SỰ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-sm text-gray-800">
                {editingUser ? 'Cập nhật thông tin nhân sự' : 'Thêm nhân sự mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Minh Trí"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  disabled={Boolean(editingUser)}
                  placeholder="name@eoffice.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 ${
                    editingUser ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Phòng ban *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg bg-white"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Chức danh *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Chuyên viên..."
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAdminCheckbox"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <label htmlFor="isAdminCheckbox" className="font-semibold text-gray-700 cursor-pointer">
                  Cấp quyền Quản trị viên hệ thống (Admin)
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow-xs"
                >
                  {editingUser ? 'Lưu thay đổi' : 'Tạo nhân sự'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}