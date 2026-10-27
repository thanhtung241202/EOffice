// src/components/AdminUserManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { authFetch } from '../App';

const API_USERS = 'http://localhost:5000/api/users';
const DEPARTMENTS = [
  'Ban Giám đốc',
  'Phòng IT',
  'Kế toán',
  'Ban Kiểm toán',
  'Hành chính Nhân sự',
  'Kinh doanh'
];

function UserStatusBadge({ user }) {
  if (user.deleted_at) {
    return (
      <span className="text-[10px] font-medium text-stone-600 bg-stone-100 px-1.5 py-0.5 border border-stone-200">
        Đã xóa mềm
      </span>
    );
  }
  if (user.is_active) {
    return (
      <span className="text-[10px] font-medium text-stone-800 bg-stone-50 px-1.5 py-0.5 border border-stone-300">
        Hoạt động
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 border border-red-200">
      Đã khóa
    </span>
  );
}

export default function AdminUserManagement() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [orgData, setOrgData] = useState({ departments: [], members: [] });
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Phòng IT',
    job_title: '',
    is_admin: false
  });

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedDept !== 'ALL') params.append('department', selectedDept);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);

      const res = await authFetch(`${API_USERS}?${params.toString()}`);
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
  }, [search, selectedDept, selectedStatus]);

  const fetchOrgStructure = useCallback(async () => {
    try {
      const res = await authFetch(`${API_USERS}/organization`);
      const json = await res.json();
      if (res.ok) {
        setOrgData(json.data || { departments: [], members: [] });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchOrgStructure();
    }
  }, [activeTab, fetchUsers, fetchOrgStructure]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        department: user.department,
        job_title: user.job_title,
        is_admin: Boolean(user.is_admin)
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
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
      const method = editingUser ? 'PUT' : 'POST';
      const endpoint = editingUser ? `${API_USERS}/${editingUser.id}` : API_USERS;

      const res = await authFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await authFetch(`${API_USERS}/${user.id}/toggle-active`, {
        method: 'PATCH'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleSoftDelete = async (user) => {
    if (!window.confirm(`Xác nhận vô hiệu hóa và xóa mềm nhân sự ${user.name}?`)) return;
    try {
      const res = await authFetch(`${API_USERS}/${user.id}`, {
        method: 'DELETE'
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
      const res = await authFetch(`${API_USERS}/${user.id}/restore`, {
        method: 'PATCH'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Lỗi khôi phục tài khoản');
    }
  };

  const handleOpenResetModal = (user) => {
    setResettingUser(user);
    setResetPassword('');
    setConfirmPassword('');
    setResetError('');
    setIsResetModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetError('');

    if (resetPassword.length < 6) {
      setResetError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (resetPassword !== confirmPassword) {
      setResetError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await authFetch(`${API_USERS}/${resettingUser.id}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPassword })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Đặt lại mật khẩu thất bại.');

      alert(`Đã đặt lại mật khẩu cho tài khoản ${resettingUser.email}.`);
      setIsResetModalOpen(false);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <section className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-stone-200">
        <div>
          <h1 className="text-lg font-semibold text-stone-900 tracking-tight">
            Quản trị hệ thống & cơ cấu tổ chức
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Quản lý tài khoản cán bộ nhân sự, phân cấp chức danh và danh mục phòng ban
          </p>
        </div>

        <div className="flex items-center gap-2">
          <nav aria-label="Chuyển chế độ xem" className="flex border border-stone-200 bg-stone-100 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
                activeTab === 'users'
                  ? 'bg-white text-stone-900 shadow-none'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Danh sách nhân sự
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('organization')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
                activeTab === 'organization'
                  ? 'bg-white text-stone-900 shadow-none'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Cơ cấu phòng ban
            </button>
          </nav>

          {activeTab === 'users' && (
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white text-xs font-medium tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 shrink-0"
            >
              <Plus size={14} />
              <span>Thêm nhân sự</span>
            </button>
          )}
        </div>
      </header>

      {activeTab === 'users' && (
        <div className="space-y-4">
          <section
            aria-label="Bộ lọc tìm kiếm nhân sự"
            className="bg-white border border-stone-200 p-3 flex flex-wrap items-center gap-3"
          >
            <div className="relative flex-1 min-w-[240px]">
              <Search
                size={14}
                className="text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                type="search"
                placeholder="Tìm theo tên, email, chức danh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-1.5 border border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="deptFilter" className="text-xs text-stone-500 whitespace-nowrap">
                Phòng ban:
              </label>
              <select
                id="deptFilter"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs border border-stone-200 bg-white text-stone-900 px-2.5 py-1.5 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
              >
                <option value="ALL">Tất cả</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="statusFilter" className="text-xs text-stone-500 whitespace-nowrap">
                Trạng thái:
              </label>
              <select
                id="statusFilter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs border border-stone-200 bg-white text-stone-900 px-2.5 py-1.5 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="LOCKED">Đã khóa</option>
                <option value="DELETED">Đã xóa mềm</option>
              </select>
            </div>
          </section>

          <div className="border border-stone-200 bg-white overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 uppercase tracking-wider font-medium text-[11px]">
                  <th scope="col" className="p-3">Họ và tên</th>
                  <th scope="col" className="p-3">Phòng ban</th>
                  <th scope="col" className="p-3">Chức danh</th>
                  <th scope="col" className="p-3">Vai trò</th>
                  <th scope="col" className="p-3">Trạng thái</th>
                  <th scope="col" className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-stone-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={15} className="animate-spin text-red-700" />
                        <span>Đang tải dữ liệu nhân sự...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-stone-500">
                      Không tìm thấy nhân sự phù hợp.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isDeleted = Boolean(u.deleted_at);
                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-stone-50 transition-colors duration-150 ${
                          isDeleted ? 'bg-stone-50/50 opacity-70' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="font-medium text-stone-900">
                            {u.name}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                            {u.email}
                          </div>
                        </td>
                        <td className="p-3 text-stone-700">{u.department}</td>
                        <td className="p-3 text-stone-600">{u.job_title}</td>
                        <td className="p-3">
                          {Boolean(u.is_admin) ? (
                            <span className="text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 uppercase">
                              Admin
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-500">Nhân viên</span>
                          )}
                        </td>
                        <td className="p-3">
                          <UserStatusBadge user={u} />
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            {isDeleted ? (
                              <button
                                type="button"
                                onClick={() => handleRestore(u)}
                                className="text-stone-700 hover:text-stone-900 underline text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                              >
                                Khôi phục
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenResetModal(u)}
                                  className="text-stone-600 hover:text-stone-900 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                                >
                                  Đổi MK
                                </button>
                                <span className="text-stone-300" aria-hidden="true">|</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenModal(u)}
                                  className="text-stone-600 hover:text-stone-900 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                                >
                                  Sửa
                                </button>
                                <span className="text-stone-300" aria-hidden="true">|</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(u)}
                                  className="text-stone-600 hover:text-stone-900 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                                >
                                  {u.is_active ? 'Khóa' : 'Mở'}
                                </button>
                                <span className="text-stone-300" aria-hidden="true">|</span>
                                <button
                                  type="button"
                                  onClick={() => handleSoftDelete(u)}
                                  className="text-red-700 hover:text-red-800 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-700"
                                >
                                  Xóa
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'organization' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orgData.departments.map((dept) => {
            const deptMembers = orgData.members.filter(
              (m) => m.department === dept.department && !m.deleted_at
            );

            return (
              <article
                key={dept.department}
                className="bg-white border border-stone-200 divide-y divide-stone-200"
              >
                <header className="p-4 flex items-baseline justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-900">
                      {dept.department}
                    </h2>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {dept.active_members} cán bộ đang hoạt động
                    </p>
                  </div>
                  <span className="font-mono text-xs font-medium text-stone-600">
                    {dept.total_members} người
                  </span>
                </header>

                <div className="p-4 space-y-2">
                  <span className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                    Danh sách thành viên
                  </span>
                  <ul className="divide-y divide-stone-100 max-h-56 overflow-y-auto">
                    {deptMembers.length === 0 ? (
                      <li className="py-2 text-[11px] text-stone-400">
                        Chưa có thành viên nào
                      </li>
                    ) : (
                      deptMembers.map((m) => (
                        <li
                          key={m.id}
                          className="py-2 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-medium text-stone-900 truncate">
                              {m.name}
                            </p>
                            <p className="text-[11px] text-stone-500 truncate">
                              {m.job_title}
                            </p>
                          </div>
                          {Boolean(m.is_admin) && (
                            <span className="text-[9px] font-medium text-red-700 border border-red-200 bg-red-50 px-1 uppercase shrink-0">
                              Admin
                            </span>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="userModalTitle"
          className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4"
        >
          <div className="bg-white w-full max-w-md border border-stone-300 divide-y divide-stone-200">
            <header className="px-5 py-4 flex items-center justify-between border-t-2 border-t-red-700">
              <h3 id="userModalTitle" className="font-semibold text-sm text-stone-900">
                {editingUser ? 'Cập nhật thông tin nhân sự' : 'Thêm nhân sự mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                aria-label="Đóng cửa sổ"
              >
                <X size={16} />
              </button>
            </header>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label htmlFor="nameInput" className="block font-medium text-stone-700">
                  Họ và tên *
                </label>
                <input
                  id="nameInput"
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Minh Trí"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="emailInput" className="block font-medium text-stone-700">
                  Email công vụ *
                </label>
                <input
                  id="emailInput"
                  type="email"
                  required
                  disabled={Boolean(editingUser)}
                  placeholder="name@eoffice.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border border-stone-300 text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150 ${
                    editingUser ? 'bg-stone-100 text-stone-500 cursor-not-allowed' : 'bg-white'
                  }`}
                />
              </div>

              {!editingUser && (
                <div className="space-y-1">
                  <label htmlFor="passwordInput" className="block font-medium text-stone-700">
                    Mật khẩu khởi tạo
                  </label>
                  <input
                    id="passwordInput"
                    type="password"
                    placeholder="Mặc định là 123456 nếu để trống"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="deptInput" className="block font-medium text-stone-700">
                    Phòng ban *
                  </label>
                  <select
                    id="deptInput"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-2.5 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="jobTitleInput" className="block font-medium text-stone-700">
                    Chức danh *
                  </label>
                  <input
                    id="jobTitleInput"
                    type="text"
                    required
                    placeholder="VD: Chuyên viên"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
                  />
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAdminCheckbox"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="border-stone-300 text-red-700 focus:ring-red-700 w-4 h-4"
                />
                <label htmlFor="isAdminCheckbox" className="font-medium text-stone-700 cursor-pointer select-none">
                  Cấp quyền Quản trị viên (Admin)
                </label>
              </div>

              <footer className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-700 text-white hover:bg-red-800 active:bg-red-900 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
                >
                  {editingUser ? 'Lưu thay đổi' : 'Tạo nhân sự'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {isResetModalOpen && resettingUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="resetModalTitle"
          className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4"
        >
          <div className="bg-white w-full max-w-sm border border-stone-300 divide-y divide-stone-200">
            <header className="px-5 py-4 flex items-center justify-between border-t-2 border-t-red-700">
              <h3 id="resetModalTitle" className="font-semibold text-sm text-stone-900">
                Đặt lại mật khẩu
              </h3>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                aria-label="Đóng cửa sổ"
              >
                <X size={16} />
              </button>
            </header>

            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-stone-50 border border-stone-200">
                <p className="font-medium text-stone-900">{resettingUser.name}</p>
                <p className="text-[11px] text-stone-500 font-mono mt-0.5">{resettingUser.email}</p>
              </div>

              {resetError && (
                <div
                  role="alert"
                  className="p-2.5 bg-red-50 border-l-2 border-red-700 text-red-900 text-[11px]"
                >
                  {resetError}
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="newPasswordInput" className="block font-medium text-stone-700">
                  Mật khẩu mới *
                </label>
                <input
                  id="newPasswordInput"
                  type="password"
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="confirmPasswordInput" className="block font-medium text-stone-700">
                  Xác nhận mật khẩu mới *
                </label>
                <input
                  id="confirmPasswordInput"
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
                />
              </div>

              <footer className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={resetLoading}
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 bg-red-700 text-white hover:bg-red-800 active:bg-red-900 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:bg-stone-300 disabled:cursor-not-allowed"
                >
                  {resetLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}