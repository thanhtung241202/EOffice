// src/components/SubmissionDetail.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, X } from 'lucide-react';

const CATEGORIES = [
  'Tuyển dụng - Nhân sự - Đào tạo',
  'Đề xuất mua sắm',
  'Giải trình công việc',
  'Tài chính - Kế toán',
  'Kỹ thuật - CNTT'
];

function SubmissionStatusBadge({ status }) {
  if (status === 'APPROVED') {
    return (
      <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-300 whitespace-nowrap">
        Đã phê duyệt
      </span>
    );
  }
  if (status === 'IN_PROGRESS') {
    return (
      <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 border border-amber-300 whitespace-nowrap">
        Đang xử lý
      </span>
    );
  }
  if (status === 'RETURNED') {
    return (
      <span className="text-[11px] font-medium text-red-800 bg-red-50 px-2 py-0.5 border border-red-300 whitespace-nowrap">
        Đã trả về
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className="text-[11px] font-medium text-red-900 bg-red-100 px-2 py-0.5 border border-red-300 whitespace-nowrap">
        Từ chối
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-stone-600 bg-stone-50 px-2 py-0.5 border border-stone-200 whitespace-nowrap">
      Bản nháp
    </span>
  );
}

export default function SubmissionDetail({
  detailData,
  onBack,
  onApprove,
  onReturn,
  onReject,
  onResubmit,
  onDelete,
  onShareEmail,
  currentUserId
}) {
  const { submission, approval_steps = [], comments = [], attachments = [] } = detailData || {};

  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPriority, setEditPriority] = useState('NORMAL');
  const [editConfidentiality, setEditConfidentiality] = useState('NORMAL');
  const [resubmitComment, setResubmitComment] = useState('');

  const [newAttachments, setNewAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const [approverComment, setApproverComment] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    if (submission) {
      setEditTitle(submission.title || '');
      setEditContent(submission.content || '');
      setEditCategory(submission.category || CATEGORIES[0]);
      setEditPriority(submission.priority || 'NORMAL');
      setEditConfidentiality(submission.confidentiality || 'NORMAL');
      setResubmitComment('');
      setNewAttachments([]);
    }
  }, [submission]);

  const isCreator = submission?.created_by_id?.toLowerCase() === currentUserId?.toLowerCase();
  const isReturned = submission?.status === 'RETURNED';
  const isRejected = submission?.status === 'REJECTED';
  const isDraft = submission?.status === 'DRAFT';
  const canEditAndResubmit = isCreator && isReturned;
  const canDelete = isCreator && (isDraft || isReturned || isRejected);

  const lastComment = comments.length > 0 ? comments[comments.length - 1] : null;

  const activeStep = approval_steps.find((s) => s.step_order === submission?.current_step_order);
  const isMyTurnToApprove =
    submission?.status === 'IN_PROGRESS' &&
    activeStep?.approver_id?.toLowerCase() === currentUserId?.toLowerCase() &&
    activeStep?.status === 'PENDING';

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownloadAttachment = async (attachmentId) => {
    try {
      setDownloadingId(attachmentId);
      const res = await fetch(`http://localhost:5000/api/attachments/${attachmentId}/download`, {
        headers: { 'x-user-id': currentUserId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi tải tập tin.');
      if (data.download_url) {
        window.open(data.download_url, '_blank');
      } else {
        alert('Không tìm thấy đường dẫn tải về.');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setNewAttachments((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const handleRemoveNewFile = (index) => {
    setNewAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResubmit = async (e) => {
    if (e) e.preventDefault();
    if (!editTitle.trim() || !editContent.trim()) {
      alert('Tiêu đề và nội dung tờ trình không được để trống.');
      return;
    }
    if (!resubmitComment.trim()) {
      alert('Vui lòng nhập nội dung giải trình trước khi gửi trình lại.');
      return;
    }
    setSubmittingAction(true);
    await onResubmit({
      title: editTitle.trim(),
      content: editContent.trim(),
      category: editCategory,
      priority: editPriority,
      confidentiality: editConfidentiality,
      resubmit_comment: resubmitComment.trim(),
      new_attachments: newAttachments
    });
    setSubmittingAction(false);
  };

  const handleDeleteClick = async () => {
    let confirmMessage = 'Xác nhận xóa bản nháp tờ trình này?';
    if (isRejected) {
      confirmMessage = `Tờ trình đã bị cấp trên từ chối.\nÝ kiến: "${lastComment?.content || 'Không có ghi chú'}"\n\nXác nhận xóa hồ sơ khỏi danh sách?`;
    } else if (isReturned) {
      confirmMessage = 'Tờ trình đang ở trạng thái bị trả về. Nếu xóa, hồ sơ sẽ không thể phục hồi để nộp lại. Xác nhận xóa?';
    }

    if (!window.confirm(confirmMessage)) return;

    setSubmittingAction(true);
    await onDelete();
    setSubmittingAction(false);
  };

  const handleApproverAction = async (actionType) => {
    if ((actionType === 'RETURN' || actionType === 'REJECT') && !approverComment.trim()) {
      alert('Vui lòng nhập ý kiến / lý do trước khi thực hiện thao tác.');
      return;
    }
    setSubmittingAction(true);
    if (actionType === 'APPROVE') await onApprove(approverComment.trim());
    if (actionType === 'RETURN') await onReturn(approverComment.trim());
    if (actionType === 'REJECT') await onReject(approverComment.trim());
    setApproverComment('');
    setSubmittingAction(false);
  };

  const handleShareSubmit = (e) => {
    e.preventDefault();
    if (!shareEmail.trim()) {
      alert('Vui lòng nhập email người nhận.');
      return;
    }
    onShareEmail({ recipientEmail: shareEmail, message: shareMessage });
    setIsShareModalOpen(false);
    setShareEmail('');
    setShareMessage('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* THANH THAO TÁC TRÊN ĐẦU */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-300 px-3 py-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
        >
          <ArrowLeft size={14} />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={submittingAction}
              className="px-3 py-1.5 text-xs font-medium text-red-700 hover:text-red-800 bg-white border border-red-300 hover:bg-red-50 disabled:opacity-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-700"
            >
              {isRejected ? 'Xác nhận xóa hồ sơ bị từ chối' : 'Xóa tờ trình'}
            </button>
          )}

          {canEditAndResubmit && (
            <button
              type="button"
              onClick={handleResubmit}
              disabled={submittingAction}
              className="px-4 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 active:bg-red-900 disabled:bg-stone-300 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            >
              {submittingAction ? 'Đang gửi...' : 'Lưu & Gửi trình lại'}
            </button>
          )}

          {isMyTurnToApprove && (
            <>
              <button
                type="button"
                onClick={() => handleApproverAction('APPROVE')}
                disabled={submittingAction}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:bg-stone-300 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              >
                Phê duyệt
              </button>
              <button
                type="button"
                onClick={() => handleApproverAction('RETURN')}
                disabled={submittingAction}
                className="px-3.5 py-1.5 text-xs font-medium text-red-700 hover:text-red-800 bg-white border border-red-300 hover:bg-red-50 disabled:opacity-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-700"
              >
                Trả về
              </button>
              <button
                type="button"
                onClick={() => handleApproverAction('REJECT')}
                disabled={submittingAction}
                className="px-3.5 py-1.5 text-xs font-medium text-red-900 hover:text-white hover:bg-red-800 bg-white border border-red-400 disabled:opacity-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-700"
              >
                Từ chối
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-300 hover:bg-stone-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
          >
            Chia sẻ
          </button>
        </div>
      </header>

      {/* GRID CHÍNH: CHI TIẾT (8 CỘT) - LUỒNG DUYỆT (4 CỘT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI: CHI TIẾT TỜ TRÌNH (RỘNG RÃI, CHIẾM 8 PHẦN) */}
        <article className="lg:col-span-8 bg-white border border-stone-200 divide-y divide-stone-200">
          <header className="p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="text-red-700 font-semibold font-mono text-base">
                {submission?.document_code
                  ? `#${submission.document_code}`
                  : `#${String(submission?.id || '').slice(0, 8)}`}
              </span>
              <SubmissionStatusBadge status={submission?.status} />
            </div>

            {canEditAndResubmit ? (
              <div className="space-y-1">
                <label htmlFor="editTitleInput" className="block text-xs font-medium text-stone-700">
                  Chỉnh sửa tiêu đề *
                </label>
                <input
                  id="editTitleInput"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-sm font-medium text-stone-900 p-2.5 border border-stone-300 bg-white focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
                />
              </div>
            ) : (
              <h1 className="text-base font-semibold text-stone-900 leading-snug">
                {submission?.title}
              </h1>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label htmlFor="editCategorySelect" className="block text-xs font-medium text-stone-600">
                  Loại tờ trình
                </label>
                {canEditAndResubmit ? (
                  <select
                    id="editCategorySelect"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs px-3 py-2 bg-stone-50 border border-stone-200 text-stone-800">
                    {submission?.category || CATEGORIES[0]}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="editPrioritySelect" className="block text-xs font-medium text-stone-600">
                  Độ ưu tiên
                </label>
                {canEditAndResubmit ? (
                  <select
                    id="editPrioritySelect"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                  >
                    <option value="NORMAL">Bình thường</option>
                    <option value="URGENT">Khẩn cấp</option>
                  </select>
                ) : (
                  <div className="text-xs px-3 py-2 bg-stone-50 border border-stone-200 text-stone-800">
                    {submission?.priority === 'URGENT' ? 'Khẩn cấp' : 'Bình thường'}
                  </div>
                )}
              </div>
            </div>
          </header>

          <section aria-label="Nội dung tờ trình" className="p-6 space-y-2">
            <span className="block text-xs font-medium text-stone-700">
              Nội dung văn bản
            </span>
            {canEditAndResubmit ? (
              <textarea
                rows={8}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Hiệu chỉnh nội dung chi tiết..."
                className="w-full text-xs p-3.5 border border-stone-300 bg-white focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 leading-relaxed font-sans"
              />
            ) : (
              <div className="p-4 border border-stone-200 bg-stone-50/40 text-stone-800 text-xs leading-relaxed whitespace-pre-line font-sans">
                {submission?.content}
              </div>
            )}
          </section>

          <section aria-label="Tài liệu đính kèm" className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-700">
                Tài liệu đính kèm ({attachments.length})
              </span>
              {canEditAndResubmit && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium text-red-700 hover:text-red-800 underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-700"
                >
                  Thêm tài liệu mới
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />

            {attachments.length > 0 ? (
              <ul className="divide-y divide-stone-200 border border-stone-200">
                {attachments.map((file) => (
                  <li
                    key={file.id}
                    className="p-3 flex items-center justify-between text-xs bg-white"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-medium text-stone-800 truncate" title={file.file_name}>
                        {file.file_name}
                      </p>
                      <span className="text-[11px] text-stone-500">
                        {formatFileSize(file.file_size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={downloadingId === file.id}
                      onClick={() => handleDownloadAttachment(file.id)}
                      className="text-stone-700 hover:text-stone-900 underline text-xs disabled:opacity-50 shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    >
                      {downloadingId === file.id ? 'Đang tải...' : 'Tải về'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400 italic">Không có tài liệu đính kèm.</p>
            )}

            {newAttachments.length > 0 && (
              <div className="p-3 bg-stone-50 border border-stone-200 space-y-2">
                <span className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider">
                  Tập tin tải thêm (chưa lưu)
                </span>
                <ul className="divide-y divide-stone-200 bg-white border border-stone-200">
                  {newAttachments.map((file, idx) => (
                    <li
                      key={idx}
                      className="p-2 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-stone-800 truncate block">{file.name}</span>
                        <span className="text-[10px] text-stone-400">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewFile(idx)}
                        className="text-stone-500 hover:text-red-700 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                      >
                        Hủy
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {canEditAndResubmit && (
            <section aria-label="Nội dung giải trình" className="p-6 bg-stone-50/60 space-y-2">
              <label htmlFor="resubmitCommentInput" className="block text-xs font-medium text-stone-800">
                Nội dung giải trình / Bổ sung thông tin <span className="text-red-700">*</span>
              </label>
              <textarea
                id="resubmitCommentInput"
                rows={3}
                required
                value={resubmitComment}
                onChange={(e) => setResubmitComment(e.target.value)}
                placeholder="Nêu rõ các nội dung đã được chỉnh sửa theo yêu cầu..."
                className="w-full text-xs p-3 border border-stone-300 bg-white focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
              />
            </section>
          )}

          {isMyTurnToApprove && (
            <section aria-label="Ý kiến xử lý" className="p-6 space-y-2">
              <label htmlFor="approverCommentInput" className="block text-xs font-medium text-stone-800">
                Ý kiến thẩm định / Lý do phê duyệt (bắt buộc khi Trả về hoặc Từ chối)
              </label>
              <textarea
                id="approverCommentInput"
                rows={3}
                value={approverComment}
                onChange={(e) => setApproverComment(e.target.value)}
                placeholder="Ghi nhận chỉ đạo hoặc yêu cầu chỉnh sửa..."
                className="w-full text-xs p-3 border border-stone-300 bg-white focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
              />
            </section>
          )}
        </article>

        {/* CỘT PHẢI: LUỒNG QUY TRÌNH (TINH GỌN, CHIẾM 4 PHẦN) */}
        <aside className="lg:col-span-4 space-y-2.5">
          <header className="pb-1.5 border-b border-stone-200 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-stone-900 tracking-tight">
              Luồng quy trình
            </h2>
            <span className="text-[11px] text-stone-500 font-mono">
              Bước {submission?.current_step_order || 1}/{submission?.total_steps || 1}
            </span>
          </header>

          <ol className="space-y-2.5">
            {approval_steps.map((step, idx) => {
              const isPassed = step.status === 'PASSED';
              const isPending = step.status === 'PENDING';
              const isStepReturned = step.status === 'RETURNED';
              const isStepRejected = step.status === 'REJECTED';

              const borderLeftColor = isPassed
                ? 'border-l-emerald-600'
                : isStepReturned || isStepRejected
                ? 'border-l-red-600'
                : isPending
                ? 'border-l-amber-500'
                : 'border-l-stone-300';

              const headerBg = isPassed
                ? 'bg-emerald-50 text-emerald-950 border-b border-emerald-100'
                : isStepReturned || isStepRejected
                ? 'bg-red-50 text-red-950 border-b border-red-100'
                : isPending
                ? 'bg-amber-50 text-amber-950 border-b border-amber-100'
                : 'bg-stone-50/70 text-stone-600 border-b border-stone-100';

              const stepComments = comments.filter((c) => {
                if (c.step_id && step.id) {
                  return String(c.step_id) === String(step.id);
                }
                return (
                  c.author_id &&
                  step.approver_id &&
                  String(c.author_id).toLowerCase() === String(step.approver_id).toLowerCase()
                );
              });

              return (
                <li
                  key={step.id || idx}
                  className={`bg-white border border-stone-200 border-l-[3px] ${borderLeftColor} divide-y divide-stone-100 text-xs`}
                >
                  {/* Header bước: Tối ưu padding và font size */}
                  <div className={`px-2.5 py-1.5 ${headerBg}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[11px] truncate pr-1">
                        {step.step_role === 'APPROVER' ? 'Ký duyệt tờ trình' : 'Trình & Soát xét'}
                      </span>
                      <span className="font-mono text-[10px] uppercase font-semibold shrink-0">
                        B.{step.step_order}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono mt-0.5 opacity-80 truncate">
                      {step.action_date
                        ? `Xong: ${new Date(step.action_date).toLocaleDateString('vi-VN')}`
                        : isPending
                        ? 'Chờ xử lý'
                        : isStepReturned
                        ? 'Đã trả về'
                        : isStepRejected
                        ? 'Đã từ chối'
                        : 'Chưa thực hiện'}
                    </div>
                  </div>

                  {/* Thông tin nhân sự: Avatar nhỏ hơn, khoảng cách gọn gàng */}
                  <div className="p-2.5 flex items-start gap-2">
                    <span className="w-6 h-6 bg-stone-100 text-stone-700 border border-stone-200 flex items-center justify-center font-semibold text-[10px] shrink-0">
                      {step.approver_name ? step.approver_name.slice(0, 1).toUpperCase() : 'U'}
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="font-semibold text-xs text-stone-900 truncate">
                        {step.approver_name}
                      </p>
                      <p className="text-[10px] text-stone-500 truncate mt-0.5">
                        {step.approver_department
                          ? `${step.approver_department}${step.approver_job_title ? ` · ${step.approver_job_title}` : ''}`
                          : step.approver_job_title || ''}
                      </p>
                    </div>
                  </div>

                  {/* Ý kiến phản hồi lồng trong bước */}
                  {stepComments.length > 0 && (
                    <div className="p-2 bg-stone-50/60 space-y-1.5">
                      {stepComments.map((c) => {
                        const isCommentApproved = isPassed;
                        const isCommentReturned = isStepReturned || isStepRejected;

                        const badgeClass = isCommentApproved
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : isCommentReturned
                          ? 'border-red-300 bg-red-50 text-red-800'
                          : 'border-stone-300 bg-stone-100 text-stone-700';

                        const commentCardBorder = isCommentApproved
                          ? 'border-l-emerald-600'
                          : isCommentReturned
                          ? 'border-l-red-600'
                          : 'border-l-stone-400';

                        const badgeLabel = isCommentApproved
                          ? 'Đồng ý'
                          : isStepReturned
                          ? 'Trả về'
                          : isStepRejected
                          ? 'Từ chối'
                          : 'Ý kiến';

                        return (
                          <div
                            key={c.id}
                            className={`bg-white border border-stone-200 border-l-2 ${commentCardBorder} p-2 space-y-1 text-xs`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-medium text-[11px] text-stone-800 truncate">
                                {c.author_name}
                              </span>
                              <span className={`text-[9px] font-medium px-1 py-0 border ${badgeClass} shrink-0`}>
                                {badgeLabel}
                              </span>
                            </div>

                            <p className="text-[11px] text-stone-700 whitespace-pre-wrap leading-relaxed font-sans">
                              {c.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </aside>
      </div>

      {/* MODAL CHIA SẺ */}
      {isShareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shareModalTitle"
          className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4"
        >
          <div className="bg-white w-full max-w-md border border-stone-300 divide-y divide-stone-200">
            <header className="px-5 py-4 border-t-2 border-t-red-700 flex items-center justify-between">
              <h3 id="shareModalTitle" className="font-semibold text-sm text-stone-900">
                Chia sẻ quyền xem tờ trình
              </h3>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                aria-label="Đóng cửa sổ"
              >
                <X size={16} />
              </button>
            </header>

            <form onSubmit={handleShareSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label htmlFor="shareEmailInput" className="block font-medium text-stone-700">
                  Email người nhận *
                </label>
                <input
                  id="shareEmailInput"
                  type="email"
                  required
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="name@eoffice.vn"
                  className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="shareMessageInput" className="block font-medium text-stone-700">
                  Nội dung ghi chú kèm theo
                </label>
                <textarea
                  id="shareMessageInput"
                  rows={3}
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Ghi chú nội dung cần lưu ý khi chia sẻ..."
                  className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 resize-none transition-colors duration-150"
                />
              </div>

              <footer className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
                >
                  Gửi thông tin
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}