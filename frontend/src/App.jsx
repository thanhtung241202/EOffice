// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SubmissionTable from './components/SubmissionTable';
import SubmissionDetail from './components/SubmissionDetail';
import CreateSubmissionModal from './components/CreateSubmissionModal';

// Tách base URL gốc thành /api để linh hoạt gọi các route khác nhau
const API_BASE = 'http://localhost:5000/api';

const SYSTEM_USERS = [
  {
    id: '6D880264-200B-48B9-A246-B45A52AC9C90',
    name: 'Nguyễn Văn A',
    email: 'it.creator@eoffice.vn',
    department: 'Phòng IT',
    job_title: 'Kỹ sư Phần mềm',
    roleTag: 'Người tạo'
  },
  {
    id: 'CCFBF940-472B-4830-BC0F-A973A8ACC403',
    name: 'Trần Thị B',
    email: 'acc.reviewer@eoffice.vn',
    department: 'Kế toán',
    job_title: 'Kế toán Soát xét',
    roleTag: 'Soát xét (Bước 1)'
  },
  {
    id: 'F702E2F8-37CE-40BA-828D-D3F27C82B73A',
    name: 'Lê Văn C',
    email: 'ceo.approver@eoffice.vn',
    department: 'Ban Giám đốc',
    job_title: 'Tổng Giám đốc (CEO)',
    roleTag: 'Phê duyệt (Bước 2)'
  },
  {
    id: '1C54B93B-090F-4B81-9F1E-A9FE888F4FD7',
    name: 'Hoàng Văn D',
    email: 'audit.viewer@eoffice.vn',
    department: 'Ban Kiểm toán',
    job_title: 'Kiểm toán viên Nội bộ',
    roleTag: 'Theo dõi / CC'
  },
  {
    id: 'C52C6B21-FC39-4333-8434-9ED18FD89147',
    name: 'Quản Trị Viên',
    email: 'admin.system@eoffice.vn',
    department: 'Hệ thống',
    job_title: 'System Administrator',
    roleTag: 'Quản trị'
  }
];

// Component trang danh sách bảng tờ trình
function SubmissionsListPage({ endpoint, currentUser, onOpenCreateModal }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/submissions/${endpoint}`, {
        headers: { 'x-user-id': currentUser.id }
      });
      const json = await res.json();
      
      let list = [];
      if (Array.isArray(json)) {
        list = json;
      } else if (json?.data?.data && Array.isArray(json.data.data)) {
        list = json.data.data;
      } else if (json?.data && Array.isArray(json.data)) {
        list = json.data;
      }

      const normalizedList = list.map(item => ({
        ...item,
        id: item.id || item.submission_id 
      }));

      setSubmissions(normalizedList);
    } catch (err) {
      console.error('[Fetch List Error]:', err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchList();
    }
  }, [endpoint, currentUser.id]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 font-medium text-sm animate-pulse">
        Đang tải dữ liệu...
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="m-6 p-10 bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center text-center shadow-xs">
        <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <p className="text-gray-600 text-sm font-bold">Không có tờ trình nào trong mục này.</p>
        <p className="text-gray-400 text-xs mt-1.5">
          {endpoint === 'pending' 
            ? 'Bạn hiện không có hồ sơ nào đang chờ duyệt đến từ các đồng nghiệp.' 
            : endpoint === 'approved'
            ? 'Chưa có tờ trình nào được hoàn tất phê duyệt trong hệ thống.'
            : endpoint === 'processed'
            ? 'Bạn chưa có hồ sơ nào đã hoàn tất xử lý.'
            : 'Chưa có dữ liệu để hiển thị.'}
        </p>
      </div>
    );
  }

  return (
    <SubmissionTable
      submissions={submissions}
      onSelectSubmission={(id) => navigate(`/submissions/${id}`)}
      onOpenCreateModal={onOpenCreateModal}
    />
  );
}

// Component xem chi tiết tờ trình kèm các hành động
function SubmissionDetailPageWrapper({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detailData, setDetailData] = useState(null);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`${API_BASE}/submissions/${id}`, {
        headers: { 'x-user-id': currentUser.id }
      });
      const json = await res.json();
      setDetailData(json);
    } catch (err) {
      console.error('[Fetch Detail Error]:', err);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id, currentUser]);

  const handleAction = async (actionType, comment) => {
    try {
      const res = await fetch(`${API_BASE}/submissions/${id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ action: actionType, comment })
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Thao tác thành công!');
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
      // 1. Tải lên tệp đính kèm mới nếu có chọn thêm
      if (updatePayload.new_attachments && updatePayload.new_attachments.length > 0) {
        const attachFormData = new FormData();
        updatePayload.new_attachments.forEach((file) => {
          attachFormData.append('files', file);
        });

        await fetch(`${API_BASE}/submissions/${id}/attachments`, {
          method: 'POST',
          headers: {
            'x-user-id': currentUser.id
          },
          body: attachFormData
        });
      }

      // 2. Gửi request resubmit nội dung
      const { new_attachments, ...resubmitData } = updatePayload;
      const res = await fetch(`${API_BASE}/submissions/${id}/resubmit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify(resubmitData)
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Đã chỉnh sửa và gửi trình lại hồ sơ!');
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
      const res = await fetch(`${API_BASE}/submissions/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id
        }
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Đã xoá tờ trình thành công!');
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
      const res = await fetch(`${API_BASE}/submissions/${id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ recipient_email: recipientEmail, message })
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Đã chia sẻ thành công!');
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
      currentUserId={currentUser.id}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(SYSTEM_USERS[0]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const getCurrentTab = () => {
    if (location.pathname.includes('/submissions/my-submissions')) return 'my_submissions';
    if (location.pathname.includes('/submissions/processed')) return 'processed';
    if (location.pathname.includes('/submissions/approved')) return 'approved';
    if (location.pathname.includes('/submissions/shared')) return 'shared';
    return 'pending';
  };

  const currentTab = getCurrentTab();

  const fetchPendingBadge = async () => {
    try {
      const res = await fetch(`${API_BASE}/submissions/pending`, {
        headers: { 'x-user-id': currentUser.id }
      });
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
  };

  useEffect(() => {
    fetchPendingBadge();
  }, [currentUser, location.pathname]);

  // =========================================================================
  // XỬ LÝ TẠO TỜ TRÌNH VÀ TỰ ĐỘNG GỬI FILE QUA FORMDATA
  // =========================================================================
  const handleCreateSubmission = async (payload) => {
    try {
      // 1. Tách attachments ra riêng để không bị chuỗi hóa JSON hỏng
      const { attachments = [], ...submissionData } = payload;

      const submissionPayload = {
        ...submissionData,
        steps: [
          { approver_id: 'CCFBF940-472B-4830-BC0F-A973A8ACC403', step_role: 'REVIEWER' },
          { approver_id: 'F702E2F8-37CE-40BA-828D-D3F27C82B73A', step_role: 'APPROVER' }
        ]
      };

      // Tạo bản ghi tờ trình trước
      const res = await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify(submissionPayload)
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Lỗi khi tạo tờ trình.');
        return;
      }

      // Lấy ID tờ trình vừa tạo
      const createdId = typeof data.submission_id === 'object' 
        ? data.submission_id.submission_id 
        : data.submission_id;

      // 2. Nếu có chọn file: Đẩy lên API attachments
      if (attachments && attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach((file) => {
          formData.append('files', file);
        });

        const uploadRes = await fetch(`${API_BASE}/submissions/${createdId}/attachments`, {
          method: 'POST',
          headers: {
            'x-user-id': currentUser.id
          },
          body: formData
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          console.error('[Upload Attachments Error]:', uploadErr);
          alert('Tờ trình đã tạo nhưng tải file thất bại: ' + (uploadErr.error || ''));
        }
      }

      setIsCreateOpen(false);
      navigate('/submissions/my-submissions');
      alert('Khởi tạo và gửi trình hồ sơ thành công!');
    } catch (err) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans antialiased text-gray-900">
      <Sidebar pendingCount={pendingCount} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentUser={currentUser} />

        <div className="bg-amber-50/90 border-b border-amber-200 px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-amber-800">Tài khoản đang đăng nhập:</span>
            <span className="font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded">
              {currentUser.name}
            </span>
            <span className="text-gray-500">
              ({currentUser.job_title} - {currentUser.department})
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-amber-800 font-medium whitespace-nowrap">Đổi người dùng:</span>
            {SYSTEM_USERS.map((user) => {
              const isSelected = currentUser.id === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => setCurrentUser(user)}
                  className={`px-2.5 py-1 rounded text-xs transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-red-600 text-white font-bold shadow-xs'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-amber-100/50'
                  }`}
                >
                  {user.name} ({user.roleTag})
                </button>
              );
            })}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/submissions/pending" replace />} />
            
            <Route
              path="/submissions/pending"
              element={
                <SubmissionsListPage
                  endpoint="pending"
                  currentUser={currentUser}
                  onOpenCreateModal={() => setIsCreateOpen(true)}
                />
              }
            />
            
            <Route
              path="/submissions/my-submissions"
              element={
                <SubmissionsListPage
                  endpoint="my-submissions"
                  currentUser={currentUser}
                  onOpenCreateModal={() => setIsCreateOpen(true)}
                />
              }
            />
            
            <Route
              path="/submissions/processed"
              element={
                <SubmissionsListPage
                  endpoint="processed"
                  currentUser={currentUser}
                  onOpenCreateModal={() => setIsCreateOpen(true)}
                />
              }
            />

            {/* ROUTE MỚI: TỜ TRÌNH ĐÃ PHÊ DUYỆT */}
            <Route
              path="/submissions/approved"
              element={
                <SubmissionsListPage
                  endpoint="approved"
                  currentUser={currentUser}
                  onOpenCreateModal={() => setIsCreateOpen(true)}
                />
              }
            />

            <Route
              path="/submissions/shared"
              element={
                <SubmissionsListPage
                  endpoint="shared"
                  currentUser={currentUser}
                  onOpenCreateModal={() => setIsCreateOpen(true)}
                />
              }
            />

            <Route
              path="/submissions/:id"
              element={<SubmissionDetailPageWrapper currentUser={currentUser} />}
            />
          </Routes>
        </main>
      </div>

      <CreateSubmissionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmission}
      />
    </div>
  );
}