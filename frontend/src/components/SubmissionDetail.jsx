import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, CheckCircle2, Clock, 
  Send, RotateCcw, XCircle, UploadCloud, 
  Settings, MessageSquare, AlertTriangle, Edit3, Trash2,
  Share2, X, Paperclip, FileText, Download, Loader2
} from 'lucide-react';

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

  // Trạng thái tải file (downloading)
  const [downloadingId, setDownloadingId] = useState(null);

  const [approverComment, setApproverComment] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // State cho Modal Chia sẻ
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    if (submission) {
      setEditTitle(submission.title || '');
      setEditContent(submission.content || '');
      setEditCategory(submission.category || 'Tuyển dụng - Nhân sự - Đào tạo');
      setEditPriority(submission.priority || 'NORMAL');
      setEditConfidentiality(submission.confidentiality || 'NORMAL');
      setResubmitComment('');
      setNewAttachments([]);
    }
  }, [submission]);

  // Kiểm tra quyền hạn của người xem
  const isCreator = submission?.created_by_id?.toLowerCase() === currentUserId?.toLowerCase();
  const isReturned = submission?.status === 'RETURNED';
  const canEditAndResubmit = isCreator && isReturned;

  // Điều kiện được phép xoá
  const canDelete = isCreator && (
    isReturned || 
    (submission?.status === 'IN_PROGRESS' && submission?.current_step_order === 1)
  );

  const lastComment = comments.length > 0 ? comments[comments.length - 1] : null;

  const activeStep = approval_steps.find(s => s.step_order === submission?.current_step_order);
  const isMyTurnToApprove = 
    submission?.status === 'IN_PROGRESS' &&
    activeStep?.approver_id?.toLowerCase() === currentUserId?.toLowerCase() && 
    activeStep?.status === 'PENDING';

  // Format kích thước file
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
        headers: {
          'x-user-id': currentUserId
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tải file');
      
      // Mở đường dẫn signed URL của Supabase trong tab mới
      if (data.download_url) {
        window.open(data.download_url, '_blank');
      } else {
        alert('Không tìm thấy đường dẫn tải về.');
      }
    } catch (err) {
      console.error('[Download Attachment Error]:', err);
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
      alert('Vui lòng nhập nội dung giải trình / phản hồi yêu cầu chỉnh sửa trước khi gửi trình lại.');
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
      new_attachments: newAttachments // File mới đính kèm thêm
    });
    setSubmittingAction(false);
  };

  const handleDeleteClick = async () => {
    const isConfirmed = window.confirm('Bạn có chắc chắn muốn xoá tờ trình này không?');
    if (!isConfirmed) return;
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
    if (!shareEmail.trim()) return alert('Vui lòng nhập email người nhận.');
    onShareEmail({ recipientEmail: shareEmail, message: shareMessage });
    setIsShareModalOpen(false);
    setShareEmail('');
    setShareMessage('');
  };

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)] p-6 relative">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-200">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-2">
          {canDelete && (
            <button 
              onClick={handleDeleteClick}
              disabled={submittingAction}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Xoá tờ trình</span>
            </button>
          )}

          {canEditAndResubmit && (
            <button 
              onClick={handleResubmit}
              disabled={submittingAction}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-md transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingAction ? 'Đang gửi...' : 'Lưu & Gửi trình lại'}</span>
            </button>
          )}

          {isMyTurnToApprove && (
            <>
              <button 
                onClick={() => handleApproverAction('APPROVE')}
                disabled={submittingAction}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-md transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Phê duyệt</span>
              </button>
              <button 
                onClick={() => handleApproverAction('RETURN')}
                disabled={submittingAction}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Trả về</span>
              </button>
              <button 
                onClick={() => handleApproverAction('REJECT')}
                disabled={submittingAction}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-md transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Từ chối</span>
              </button>
            </>
          )}

          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Chia sẻ</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Đẩy lên dataroom</span>
          </button>
        </div>
      </div>

      {isReturned && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 text-amber-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-amber-950 flex items-center gap-2 mb-1">
              <span>HỒ SƠ ĐÃ BỊ TRẢ VỀ YÊU CẦU CHỈNH SỬA</span>
              {canEditAndResubmit && (
                <span className="bg-amber-200 text-amber-900 font-semibold px-2 py-0.5 rounded text-[10px]">
                  Bạn có quyền chỉnh sửa & nộp lại
                </span>
              )}
            </div>
            {lastComment && (
              <p className="mt-1 text-amber-900 font-medium">
                Ý kiến từ <span className="font-bold">{lastComment.author_name}</span>: 
                <span className="italic"> "{lastComment.content}"</span>
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-600 font-bold text-base font-mono">
                  {submission?.document_code || `#${String(submission?.id || '').slice(0, 8)}`}
                </span>
                {submission?.status === 'APPROVED' && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded text-xs font-medium">Đã phê duyệt</span>
                )}
                {submission?.status === 'IN_PROGRESS' && (
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded text-xs font-medium">Đang xử lý</span>
                )}
                {submission?.status === 'RETURNED' && (
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded text-xs font-medium">Đã trả về</span>
                )}
                {submission?.status === 'REJECTED' && (
                  <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded text-xs font-medium">Từ chối</span>
                )}
              </div>

              {canEditAndResubmit ? (
                <div>
                  <label className="block text-[11px] font-bold text-red-600 mb-1 flex items-center gap-1">
                    <Edit3 className="w-3.5 h-3.5" />
                    Chỉnh sửa Tiêu đề:
                  </label>
                  <input 
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-sm font-bold text-gray-900 p-2.5 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50/20"
                  />
                </div>
              ) : (
                <h2 className="text-base font-bold text-gray-900 leading-snug">
                  {submission?.title}
                </h2>
              )}
            </div>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Loại tờ trình *</label>
              {canEditAndResubmit ? (
                <select 
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option>Tuyển dụng - Nhân sự - Đào tạo</option>
                  <option>Đề xuất mua sắm</option>
                  <option>Giải trình công việc</option>
                </select>
              ) : (
                <input 
                  disabled 
                  value={submission?.category || 'Tuyển dụng - Nhân sự - Đào tạo'} 
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700" 
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Độ ưu tiên</label>
              {canEditAndResubmit ? (
                <select 
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="NORMAL">Bình thường</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              ) : (
                <input 
                  disabled 
                  value={submission?.priority === 'URGENT' ? 'Khẩn cấp' : 'Bình thường'} 
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700" 
                />
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Nội dung tờ trình *</label>
            {canEditAndResubmit ? (
              <textarea 
                rows={8}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Bổ sung, chỉnh sửa lại toàn bộ nội dung..."
                className="w-full text-xs p-3.5 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50/20 font-sans leading-relaxed"
              />
            ) : (
              <div className="bg-slate-50/60 p-4 rounded-lg border border-slate-200/70 text-gray-800 text-xs leading-relaxed space-y-3 whitespace-pre-line font-sans">
                {submission?.content}
              </div>
            )}
          </div>

 
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-red-600" />
                <span>Tài liệu đính kèm ({attachments.length})</span>
              </label>
              {canEditAndResubmit && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
                >
                  + Thêm tài liệu mới
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition"
                  >
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-medium text-gray-800 truncate" title={file.file_name}>
                          {file.file_name}
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {formatFileSize(file.file_size)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={downloadingId === file.id}
                      onClick={() => handleDownloadAttachment(file.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded border border-transparent hover:border-gray-200 transition shrink-0"
                      title="Tải / Mở tệp tin"
                    >
                      {downloadingId === file.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Không có tài liệu đính kèm.</p>
            )}

            {/* Danh sách tệp người dùng vừa chọn thêm (khi đang resubmit) */}
            {newAttachments.length > 0 && (
              <div className="mt-3 space-y-1.5 bg-red-50/20 p-2.5 rounded-lg border border-red-200/50">
                <span className="text-[11px] font-bold text-red-700">Tệp bổ sung sẽ tải lên khi nộp lại:</span>
                {newAttachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-white border border-gray-200 rounded text-xs">
                    <div className="flex items-center gap-1.5 truncate max-w-[85%]">
                      <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate text-gray-700">{file.name}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewFile(idx)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canEditAndResubmit && (
            <div className="pt-3 border-t border-gray-100 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
              <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                <span>Nội dung giải trình / Phản hồi yêu cầu chỉnh sửa <span className="text-red-600">*</span>:</span>
              </label>
              <textarea 
                rows={3}
                required
                value={resubmitComment}
                onChange={(e) => setResubmitComment(e.target.value)}
                className="w-full text-xs p-2.5 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
          )}

          {isMyTurnToApprove && (
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-red-600" />
                <span>Ý kiến xử lý / Lý do (Bắt buộc khi Trả về hoặc Từ chối):</span>
              </label>
              <textarea 
                rows={3}
                value={approverComment}
                onChange={(e) => setApproverComment(e.target.value)}
                className="w-full text-xs p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          )}

          {comments.length > 0 && (
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h3 className="text-xs font-bold text-gray-700">Lịch sử ý kiến & Trao đổi:</h3>
              <div className="space-y-2.5">
                {comments.map((c) => (
                  <div key={c.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                    <div className="flex items-center justify-between font-semibold text-gray-800 mb-1">
                      <span>{c.author_name} ({c.author_job_title || 'Thành viên'})</span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        {c.created_at ? new Date(c.created_at).toLocaleString('vi-VN') : ''}
                      </span>
                    </div>
                    <div className="text-gray-600 whitespace-pre-wrap">{c.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">Luồng quy trình</h3>
            <span className="text-xs text-gray-400 font-medium">
              Bước {submission?.current_step_order || 1}/{submission?.total_steps || 1}
            </span>
          </div>

          <div className="space-y-4 relative">
            {approval_steps.map((step, idx) => {
              const isPassed = step.status === 'PASSED';
              const isPending = step.status === 'PENDING';
              const isRejected = step.status === 'REJECTED';
              const isStepReturned = step.status === 'RETURNED';

              return (
                <div 
                  key={step.id || idx} 
                  className={`p-3.5 rounded-xl border transition-all ${
                    isPending ? 'border-amber-300 bg-amber-50/40 shadow-xs' 
                      : isPassed ? 'border-emerald-200 bg-emerald-50/20' 
                      : isStepReturned ? 'border-blue-300 bg-blue-50/30'
                      : isRejected ? 'border-rose-200 bg-rose-50/20' 
                      : 'border-gray-200 bg-gray-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {isPassed && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {isPending && <Clock className="w-4 h-4 text-amber-500 animate-pulse" />}
                      {isStepReturned && <RotateCcw className="w-4 h-4 text-blue-600" />}
                      {isRejected && <XCircle className="w-4 h-4 text-rose-600" />}
                      <span className="text-xs font-bold text-gray-800">
                        {step.step_role === 'APPROVER' ? 'Ký duyệt tờ trình' : 'Soát xét chuyên môn'}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-gray-500 bg-white border border-gray-200">
                      Bước {step.step_order}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 mt-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {step.approver_name ? step.approver_name.slice(0, 1) : 'U'}
                    </div>
                    <div className="text-left overflow-hidden">
                      <div className="text-xs font-bold text-gray-800 truncate">{step.approver_name}</div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {step.approver_job_title} - {step.approver_department}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Trạng thái:</span>
                    {isPassed && <span className="font-semibold text-emerald-600">Đã hoàn thành</span>}
                    {isPending && <span className="font-semibold text-amber-600">Đang chờ xử lý</span>}
                    {step.status === 'WAITING' && <span className="text-gray-400">Chưa đến lượt</span>}
                    {isStepReturned && <span className="font-semibold text-blue-600">Đã trả về</span>}
                    {isRejected && <span className="font-semibold text-rose-600">Đã từ chối</span>}
                  </div>
                  {step.action_date && (
                    <div className="text-[10px] text-gray-400 text-right mt-1">
                      {new Date(step.action_date).toLocaleString('vi-VN')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <Share2 className="w-4 h-4 text-purple-600" />
                Chia sẻ tờ trình
              </h3>
              <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleShareSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Email người nhận <span className="text-red-500">*</span>
                </label>
                <input 
                  type="email"
                  required
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Ví dụ: audit.viewer@eoffice.vn"
                  className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Lời nhắn (Tùy chọn)
                </label>
                <textarea 
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Nhập lời nhắn sẽ hiển thị trong thông báo..."
                  rows={3}
                  className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium text-sm"
                >
                  Gửi chia sẻ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}