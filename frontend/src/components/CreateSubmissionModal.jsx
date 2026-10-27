// src/components/CreateSubmissionModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Search } from 'lucide-react';

const removeVietnameseTones = (str = '') => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

const CATEGORIES = [
  'Tuyển dụng - Nhân sự - Đào tạo',
  'Đề xuất mua sắm',
  'Tài chính - Kế toán',
  'Kỹ thuật - CNTT'
];

function ApproverSearchSelect({ users = [], selectedId, onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedUser = users.find((u) => u.id === selectedId);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cleanSearch = removeVietnameseTones(searchTerm.trim());

  const filteredUsers = users
    .filter((u) => {
      if (!cleanSearch) return true;
      const name = removeVietnameseTones(u.name || '');
      const job = removeVietnameseTones(u.job_title || '');
      const dept = removeVietnameseTones(u.department || '');
      const email = (u.email || '').toLowerCase();

      return (
        name.includes(cleanSearch) ||
        job.includes(cleanSearch) ||
        dept.includes(cleanSearch) ||
        email.includes(cleanSearch)
      );
    })
    .slice(0, 10);

  return (
    <div className="relative w-full" ref={containerRef}>
      {selectedUser ? (
        <div className="flex items-center justify-between p-2 bg-stone-50 border border-stone-300">
          <div className="min-w-0 pr-2">
            <span className="font-medium text-stone-900 text-xs">
              {selectedUser.name}
            </span>
            <span className="text-[11px] text-stone-500 block truncate">
              {selectedUser.job_title} &bull; {selectedUser.department}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect('');
              setSearchTerm('');
              setIsOpen(true);
            }}
            className="p-1 text-stone-400 hover:text-red-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 shrink-0"
            aria-label="Thay đổi người duyệt"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            size={14}
            className="text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="search"
            placeholder="Tìm tên, chức danh, phòng ban..."
            value={searchTerm}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            className="w-full pl-8 pr-3 py-1.5 border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 text-xs transition-colors duration-150"
          />
        </div>
      )}

      {isOpen && !selectedUser && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-stone-300 max-h-52 overflow-y-auto z-50 divide-y divide-stone-100 shadow-none">
          {filteredUsers.length === 0 ? (
            <div className="p-3 text-center text-stone-500 text-[11px]">
              Không tìm thấy nhân sự phù hợp
            </div>
          ) : (
            filteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onSelect(u.id);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-full p-2.5 hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none flex items-center justify-between text-xs text-left transition-colors duration-150"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-medium text-stone-900 truncate">{u.name}</p>
                  <p className="text-[11px] text-stone-500 truncate">
                    {u.job_title} &bull; {u.department}
                  </p>
                </div>
                <span className="text-[10px] text-stone-400 font-mono shrink-0 hidden sm:inline">
                  {u.email}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function CreateSubmissionModal({
  isOpen,
  onClose,
  onSubmit,
  usersList = [],
  currentUserId
}) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState('NORMAL');
  const [confidentiality, setConfidentiality] = useState('NORMAL');
  const [attachments, setAttachments] = useState([]);

  const assignableUsers = usersList.filter(
    (u) => u.id !== currentUserId && !u.deleted_at
  );

  const [steps, setSteps] = useState([
    { approver_id: '', step_role: 'REVIEWER' }
  ]);

  const fileInputRef = useRef(null);

  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      { approver_id: '', step_role: 'APPROVER' }
    ]);
  };

  const handleRemoveStep = (indexToRemove) => {
    if (steps.length <= 1) {
      alert('Quy trình duyệt cần có tối thiểu 1 người xử lý.');
      return;
    }
    setSteps((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleStepChange = (index, field, value) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    if (attachments.length + selectedFiles.length > 5) {
      alert('Chỉ được đính kèm tối đa 5 tài liệu.');
      return;
    }

    setAttachments((prev) => [...prev, ...selectedFiles]);
    e.target.value = '';
  };

  const handleRemoveFile = (indexToRemove) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleAction = (targetStatus) => {
    if (!title.trim() || !content.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung tờ trình.');
      return;
    }

    if (targetStatus === 'IN_PROGRESS') {
      const hasEmpty = steps.some((s) => !s.approver_id);
      if (hasEmpty) {
        alert('Vui lòng phân công đầy đủ người duyệt cho tất cả các bước.');
        return;
      }
    }

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      category,
      priority,
      confidentiality,
      status: targetStatus,
      steps,
      attachments
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="createModalTitle"
      className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-white w-full max-w-2xl border border-stone-300 divide-y divide-stone-200 my-auto flex flex-col max-h-[92vh]">
        <header className="px-6 py-4 flex items-center justify-between border-t-2 border-t-red-700 shrink-0">
          <div>
            <h2 id="createModalTitle" className="text-sm sm:text-base font-semibold text-stone-900">
              Khởi tạo tờ trình điện tử
            </h2>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Số hiệu hồ sơ sẽ được hệ thống cấp tự động theo thứ tự
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            aria-label="Đóng biểu mẫu"
          >
            <X size={16} />
          </button>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAction('IN_PROGRESS');
          }}
          className="p-6 space-y-5 overflow-y-auto text-xs flex-1"
        >
          <div className="space-y-1">
            <label htmlFor="submissionTitle" className="block font-medium text-stone-700">
              Tiêu đề tờ trình *
            </label>
            <input
              id="submissionTitle"
              type="text"
              required
              placeholder="VD: Trình phê duyệt kế hoạch chi phí quý..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="submissionCategory" className="block font-medium text-stone-700">
                Loại tờ trình
              </label>
              <select
                id="submissionCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="submissionPriority" className="block font-medium text-stone-700">
                Độ ưu tiên
              </label>
              <select
                id="submissionPriority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-2.5 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
              >
                <option value="NORMAL">Bình thường</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="submissionConfidentiality" className="block font-medium text-stone-700">
                Độ mật
              </label>
              <select
                id="submissionConfidentiality"
                value={confidentiality}
                onChange={(e) => setConfidentiality(e.target.value)}
                className="w-full px-2.5 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
              >
                <option value="NORMAL">Bình thường</option>
                <option value="CONFIDENTIAL">Mật</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="submissionContent" className="block font-medium text-stone-700">
              Nội dung tờ trình *
            </label>
            <textarea
              id="submissionContent"
              rows={4}
              required
              placeholder="Kính gửi cấp có thẩm quyền phê duyệt nội dung..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150 leading-relaxed"
            />
          </div>

          <section aria-label="Tài liệu đính kèm" className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-stone-700">Hồ sơ, tài liệu đính kèm</span>
              <span className="text-[11px] text-stone-500">Tối đa 5 tệp (&le; 25MB)</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 border border-stone-300 border-dashed bg-stone-50/50 hover:bg-stone-50 text-stone-600 hover:text-stone-900 text-xs text-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            >
              Chọn tệp tin đính kèm từ thiết bị
            </button>

            {attachments.length > 0 && (
              <ul className="divide-y divide-stone-200 border border-stone-200">
                {attachments.map((file, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 flex items-center justify-between text-xs bg-white"
                  >
                    <div className="min-w-0 pr-3">
                      <span className="font-medium text-stone-800 truncate block">
                        {file.name}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-stone-400 hover:text-red-700 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    >
                      Xóa
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Luồng phê duyệt" className="space-y-3 pt-3 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-stone-900 block">
                  Quy trình duyệt hồ sơ ({steps.length} bước)
                </span>
                <span className="text-[11px] text-stone-500">
                  Phân công người thẩm định và phê duyệt theo thứ tự thực hiện
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddStep}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-stone-700 bg-white border border-stone-300 hover:border-red-700 hover:text-red-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 shrink-0"
              >
                <Plus size={12} />
                <span>Thêm bước</span>
              </button>
            </div>

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3.5 border border-stone-200 bg-white space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="text-[11px] font-semibold text-stone-700 uppercase tracking-wider">
                      Cấp duyệt {idx + 1}
                    </span>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="text-stone-400 hover:text-red-700 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                      >
                        Bỏ bước này
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-stone-600">
                        Cán bộ tiếp nhận *
                      </label>
                      <ApproverSearchSelect
                        users={assignableUsers}
                        selectedId={step.approver_id}
                        onSelect={(id) => handleStepChange(idx, 'approver_id', id)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={`stepRole_${idx}`} className="block text-[11px] font-medium text-stone-600">
                        Thẩm quyền / Vai trò
                      </label>
                      <select
                        id={`stepRole_${idx}`}
                        value={step.step_role}
                        onChange={(e) => handleStepChange(idx, 'step_role', e.target.value)}
                        className="w-full px-2.5 py-2 border border-stone-300 bg-white text-stone-900 text-xs focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                      >
                        <option value="REVIEWER">Soát xét / Thẩm định chuyên môn</option>
                        <option value="APPROVER">Ký duyệt / Ban hành quyết định</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer className="pt-4 border-t border-stone-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => handleAction('DRAFT')}
              className="px-4 py-2 border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            >
              Lưu bản nháp
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            >
              Gửi trình duyệt
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}