// src/components/CreateSubmissionModal.jsx
import React, { useState, useRef } from 'react';
import { X, Paperclip, FileText, Trash2, BookmarkCheck, Send } from 'lucide-react';

export default function CreateSubmissionModal({ isOpen, onClose, onSubmit, usersList = [] }) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Tuyển dụng - Nhân sự - Đào tạo');
  const [priority, setPriority] = useState('NORMAL');
  const [confidentiality, setConfidentiality] = useState('NORMAL');
  const [attachments, setAttachments] = useState([]);

  const fileInputRef = useRef(null);

  // Chuỗi duyệt mẫu (Bước 1: Trưởng phòng/Kế toán, Bước 2: Giám đốc)
  const [steps, setSteps] = useState([
    { approver_id: 'CCFBF940-472B-4830-BC0F-A973A8ACC403', step_role: 'REVIEWER' },
    { approver_id: 'F702E2F8-37CE-40BA-828D-D3F27C82B73A', step_role: 'APPROVER' }
  ]);

  // Xử lý khi chọn file từ máy
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    if (attachments.length + selectedFiles.length > 5) {
      alert('Bạn chỉ có thể đính kèm tối đa 5 tài liệu.');
      return;
    }

    setAttachments((prev) => [...prev, ...selectedFiles]);
    e.target.value = '';
  };

  // Xóa file khỏi danh sách tạm
  const handleRemoveFile = (indexToRemove) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Định dạng dung lượng file
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Xử lý nộp form: targetStatus = 'DRAFT' (Lưu nháp) hoặc 'IN_PROGRESS' (Gửi duyệt)
  const handleAction = (targetStatus) => {
    if (!title.trim() || !content.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      category,
      priority,
      confidentiality,
      status: targetStatus, // Gửi cờ DRAFT hoặc IN_PROGRESS
      steps,
      attachments
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">Tạo tờ trình mới</h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleAction('IN_PROGRESS'); }} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tiêu đề tờ trình *</label>
            <input 
              type="text" 
              required 
              placeholder="VD: Trình phê duyệt giải trình công việc..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Loại tờ trình</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option>Tuyển dụng - Nhân sự - Đào tạo</option>
                <option>Đề xuất mua sắm</option>
                <option>Tài chính - Kế toán</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Độ ưu tiên</label>
              <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option value="NORMAL">Bình thường</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Độ mật</label>
              <select 
                value={confidentiality} 
                onChange={(e) => setConfidentiality(e.target.value)}
                className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option value="NORMAL">Bình thường</option>
                <option value="CONFIDENTIAL">Mật</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nội dung tờ trình *</label>
            <textarea 
              rows={4} 
              required
              placeholder="Kính gửi cấp có thẩm quyền phê duyệt nội dung..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-xs p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Khu vực tải tài liệu đính kèm */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700">Tài liệu đính kèm (PDF, DOCX, Ảnh...)</label>
              <span className="text-[11px] text-gray-400">Tối đa 5 tệp (mỗi tệp &le; 25MB)</span>
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
              className="w-full py-2.5 px-3 border border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 text-xs text-gray-600 hover:border-red-500 hover:text-red-600 hover:bg-red-50/20 transition cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
              <span>Nhấp để tải lên tệp tin từ máy tính</span>
            </button>

            {attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                    <div className="flex items-center gap-2 truncate max-w-[85%]">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate font-medium text-gray-700">{file.name}</span>
                      <span className="text-[11px] text-gray-400 shrink-0">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thiết lập người duyệt */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-800 mb-2">Quy trình duyệt (2 bước chuẩn):</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <span className="font-bold text-red-600">Bước 1:</span>
                <span className="text-gray-800 font-medium">Trần Thị B</span>
                <span className="text-gray-500">(Kế toán Soát xét - Kế toán)</span>
                <span className="ml-auto text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 font-medium">Soát xét</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <span className="font-bold text-red-600">Bước 2:</span>
                <span className="text-gray-800 font-medium">Lê Văn C</span>
                <span className="text-gray-500">(Tổng Giám đốc - Ban Giám đốc)</span>
                <span className="ml-auto text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 font-medium">Phê duyệt</span>
              </div>
            </div>
          </div>

          {/* Chân Modal: Nút Hủy, Nút Lưu bản nháp, Nút Tạo và gửi trình */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Hủy
            </button>

            {/* NÚT LƯU BẢN NHÁP */}
            <button 
              type="button" 
              onClick={() => handleAction('DRAFT')}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <BookmarkCheck className="w-4 h-4 text-gray-600" />
              <span>Lưu bản nháp</span>
            </button>

            {/* NÚT TẠO VÀ GỬI TRÌNH */}
            <button 
              type="submit" 
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Tạo và gửi trình</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}