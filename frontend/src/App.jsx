// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SubmissionTable from './components/SubmissionTable';
import SubmissionDetail from './components/SubmissionDetail';
import CreateSubmissionModal from './components/CreateSubmissionModal';
import UserProfileModal from './components/UserProfileModal';
import AdminUserManagement from './components/AdminUserManagement';
import LoginPage from './components/LoginPage';

const API_BASE = 'http://localhost:5000/api';

export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('eoffice_token');
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 || response.status === 403) {
    const errorJson = await response.clone().json().catch(() => ({}));
    if (errorJson?.error?.includes('hết hạn') || errorJson?.error?.includes('đăng nhập')) {
      localStorage.removeItem('eoffice_token');
      localStorage.removeItem('eoffice_user');
      window.location.reload();
    }
  }

  return response;
};

function SubmissionsListPage({ endpoint, onOpenCreateModal }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getPageMeta = () => {
    switch (endpoint) {
      case 'pending':
        return {
          emptyNotice: 'Hiện tại bạn không có hồ sơ nào đang chờ duyệt từ các phòng ban khác.'
        };
      case 'my-submissions':
        return {
          emptyNotice: 'Bạn chưa tạo hồ sơ đề xuất nào. Bấm nút tạo để bắt đầu khởi tạo tờ trình.'
        };
      case 'processed':
        return {
          emptyNotice: 'Bạn chưa thực hiện thao tác xử lý trên bất kỳ hồ sơ nào.'
        };
      case 'approved':
        return {
          emptyNotice: 'Chưa có tờ trình nào được ký duyệt hoàn tất trong hệ thống.'
        };
      case 'shared':
        return {
          emptyNotice: 'Chưa có hồ sơ nào được chia sẻ tới tài khoản của bạn.'
        };
      default:
        return {
          emptyNotice: 'Không tìm thấy dữ liệu hồ sơ phù hợp.'
        };
    }
  };

  const meta = getPageMeta();

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/submissions/${endpoint}`);
      const json = await res.json();
      let list = [];
      if (Array.isArray(json)) list = json;
      else if (json?.data?.data && Array.isArray(json.data.data)) list = json.data.data;
      else if (json?.data && Array.isArray(json.data)) list = json.data;
      setSubmissions(list.map((item) => ({ ...item, id: item.id || item.submission_id })));
    } catch (err) {
      console.error('[Fetch List Error]:', err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-stone-500 gap-2">
        <Loader2 size={20} className="animate-spin text-red-700" />
        <span className="text-xs font-medium">Đang tải danh sách hồ sơ...</span>
      </div>
    );
  }

  return (
    <section className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      {submissions.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <article className="lg:col-span-2 border border-stone-200 bg-white p-12 flex flex-col items-center justify-center text-center">
            <h2 className="text-sm font-semibold text-stone-900">
              Không có hồ sơ nào cần xử lý
            </h2>
            <p className="text-xs text-stone-500 mt-1 max-w-sm leading-relaxed">
              {meta.emptyNotice}
            </p>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="mt-5 px-4 py-2 border border-stone-300 hover:border-red-700 hover:text-red-700 text-xs font-medium text-stone-800 transition-colors duration-150 bg-white"
            >
              Khởi tạo hồ sơ mới
            </button>
          </article>

          <aside className="border border-stone-200 bg-white divide-y divide-stone-200">
            <h2 className="px-5 py-3.5 text-xs font-semibold text-stone-900 uppercase tracking-wider">
              Hướng dẫn quy trình
            </h2>
            <ol className="p-5 space-y-4 text-xs text-stone-600 list-decimal list-inside leading-relaxed">
              <li>
                <strong className="font-semibold text-stone-900">Khởi tạo & Gửi duyệt</strong>
                <p className="mt-0.5 text-stone-500 pl-4">
                  Chọn phòng ban tiếp nhận, phân định thứ tự các cấp phê duyệt và đính kèm hồ sơ.
                </p>
              </li>
              <li>
                <strong className="font-semibold text-stone-900">Duyệt tuần tự</strong>
                <p className="mt-0.5 text-stone-500 pl-4">
                  Hồ sơ chuyển tiếp tự động theo đúng các cấp lãnh đạo đã thiết lập trên luồng.
                </p>
              </li>
              <li>
                <strong className="font-semibold text-stone-900">Trả về hoặc Từ chối</strong>
                <p className="mt-0.5 text-stone-500 pl-4">
                  Cấp duyệt có thể yêu cầu hiệu chỉnh nội dung hoặc bác bỏ tờ trình kèm ý kiến chỉ đạo.
                </p>
              </li>
            </ol>
          </aside>
        </div>
      ) : (
        <SubmissionTable
          submissions={submissions}
          onSelectSubmission={(id) => navigate(`/submissions/${id}`)}
          onOpenCreateModal={onOpenCreateModal}
        />
      )}
    </section>
  );
}

function SubmissionDetailPageWrapper({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detailData, setDetailData] = useState(null);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/submissions/${id}`);
      const json = await res.json();
      setDetailData(json);
    } catch (err) {
      console.error('[Fetch Detail Error]:', err);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchDetail();
  }, [id, fetchDetail]);

  const handleAction = async (actionType, comment) => {
    try {
      const res = await authFetch(`${API_BASE}/submissions/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, comment })
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Thao tác thành công.');
        fetchDetail();
      } else {
        alert(json.error || 'Thao tác thất bại.');
      }
    } catch (err) {
      alert('Lỗi kết nối: ' + err.message);
    }
  };

  const handleResubmit = async (updatePayload) => {
    try {
      if (updatePayload.new_attachments && updatePayload.new_attachments.length > 0) {
        const attachFormData = new FormData();
        updatePayload.new_attachments.forEach((file) => {
          attachFormData.append('files', file);
        });
        await authFetch(`${API_BASE}/submissions/${id}/attachments`, {
          method: 'POST',
          body: attachFormData
        });
      }

      const { new_attachments, ...resubmitData } = updatePayload;
      const res = await authFetch(`${API_BASE}/submissions/${id}/resubmit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resubmitData)
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Đã gửi trình lại hồ sơ.');
        fetchDetail();
      } else {
        alert(json.error || 'Lỗi khi gửi trình lại.');
      }
    } catch (err) {
      alert('Lỗi kết nối: ' + err.message);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await authFetch(`${API_BASE}/submissions/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Đã xoá tờ trình.');
        navigate('/submissions/my-submissions');
      } else {
        alert(json.error || 'Không thể xoá tờ trình.');
      }
    } catch (err) {
      alert('Lỗi kết nối khi xoá: ' + err.message);
    }
  };

  const handleShareEmail = async ({ recipientEmail, message }) => {
    try {
      const res = await authFetch(`${API_BASE}/submissions/${id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: recipientEmail, message })
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Đã chia sẻ thành công.');
      } else {
        alert(json.error || 'Chia sẻ thất bại.');
      }
    } catch (err) {
      alert('Lỗi kết nối khi chia sẻ: ' + err.message);
    }
  };

  return (
    <SubmissionDetail
      detailData={detailData}
      onBack={() => navigate(-1)}
      onApprove={(cmt) => handleAction('APPROVE', cmt)}
      onReturn={(cmt) => handleAction('RETURN', cmt)}
      onReject={(cmt) => handleAction('REJECT', cmt)}
      onResubmit={handleResubmit}
      onDelete={handleDelete}
      onShareEmail={handleShareEmail}
      currentUserId={currentUser?.id}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('eoffice_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [pendingCount, setPendingCount] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('eoffice_token');
    localStorage.removeItem('eoffice_user');
    setCurrentUser(null);
    setIsProfileOpen(false);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchUsers = async () => {
      try {
        const res = await authFetch(`${API_BASE}/users?status=ACTIVE`);
        const json = await res.json();
        if (res.ok && Array.isArray(json.data) && json.data.length > 0) {
          setAvailableUsers(json.data);
        } else {
          setAvailableUsers([]);
        }
      } catch (err) {
        console.error('[Fetch Users Error]:', err);
        setAvailableUsers([]);
      }
    };
    fetchUsers();
  }, [currentUser]);

  const fetchPendingBadge = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await authFetch(`${API_BASE}/submissions/pending`);
      const json = await res.json();
      let badgeCount = 0;
      if (Array.isArray(json)) {
        badgeCount = json.length;
      } else if (json?.data?.data && Array.isArray(json.data.data)) {
        badgeCount = json.data.data.length;
      } else if (json?.data && Array.isArray(json.data)) {
        badgeCount = json.data.length;
      }
      setPendingCount(badgeCount);
    } catch (err) {
      console.error('[Fetch Badge Error]:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchPendingBadge();
  }, [fetchPendingBadge, location.pathname]);

  const handleCreateSubmission = async (payload) => {
    try {
      const { attachments = [], status = 'IN_PROGRESS', ...submissionData } = payload;
      const isDraft = status === 'DRAFT';

      const res = await authFetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...submissionData, status })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Lỗi khi tạo tờ trình.');
        return;
      }

      const createdId =
        typeof data.submission_id === 'object'
          ? data.submission_id.submission_id
          : data.submission_id;

      if (attachments && attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach((file) => {
          formData.append('files', file);
        });

        const uploadRes = await authFetch(`${API_BASE}/submissions/${createdId}/attachments`, {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          console.error('[Upload Attachments Error]:', uploadErr);
          alert('Tải tập tin đính kèm thất bại: ' + (uploadErr.error || ''));
        }
      }

      setIsCreateOpen(false);
      navigate('/submissions/my-submissions');
      const docCode = data.document_code ? `#${data.document_code}` : '';
      alert(
        isDraft
          ? `Đã lưu bản nháp ${docCode}.`
          : `Khởi tạo và gửi trình hồ sơ ${docCode} thành công.`
      );
    } catch (err) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    }
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900 antialiased overflow-hidden">
      <Sidebar
        pendingCount={pendingCount}
        isAdmin={Boolean(currentUser.is_admin)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          currentUser={currentUser}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/submissions/pending" replace />} />
            <Route
              path="/submissions/pending"
              element={
                <SubmissionsListPage
                  endpoint="pending"
                  onOpenCreateModal={() => setIsCreateOpen(true)}
                />
              }
            />
            <Route
              path="/submissions/my-submissions"
              element={
                <SubmissionsListPage
                  endpoint="my-submissions"
                  onOpenCreateModal={() => setIsCreateOpen(true)}
                />
              }
            />
            <Route
              path="/submissions/processed"
              element={
                <SubmissionsListPage
                  endpoint="processed"
                  onOpenCreateModal={() => setIsCreateOpen(true)}
                />
              }
            />
            <Route
              path="/submissions/approved"
              element={
                <SubmissionsListPage
                  endpoint="approved"
                  onOpenCreateModal={() => setIsCreateOpen(true)}
                />
              }
            />
            <Route
              path="/submissions/shared"
              element={
                <SubmissionsListPage
                  endpoint="shared"
                  onOpenCreateModal={() => setIsCreateOpen(true)}
                />
              }
            />
            <Route
              path="/submissions/:id"
              element={<SubmissionDetailPageWrapper currentUser={currentUser} />}
            />
            <Route
              path="/admin/users"
              element={
                currentUser.is_admin ? (
                  <AdminUserManagement currentAdminId={currentUser.id} />
                ) : (
                  <Navigate to="/submissions/pending" replace />
                )
              }
            />
          </Routes>
        </main>
      </div>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={currentUser}
        onLogout={handleLogout}
      />

      <CreateSubmissionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmission}
        usersList={availableUsers}
        currentUserId={currentUser.id}
      />
    </div>
  );
}