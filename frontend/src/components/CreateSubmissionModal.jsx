import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

export default function CreateSubmissionModal({ isOpen, onClose, onSubmit, usersList = [] }) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Tuyển dụng - Nhân sự - Đào tạo');
  const [priority, setPriority] = useState('NORMAL');
  const [confidentiality, setConfidentiality] = useState('NORMAL');
  
  // Chuỗi duyệt mẫu (Bước 1: Trưởng phòng, Bước 2: Giám đốc)
  const [steps, setSteps] = useState([
    { approver_id: '22222222-2222-2222-2222-222222222222', step_role: 'REVIEWER' },
    { approver_id: '33333333-3333-3333-3333-333333333333', step_role: 'APPROVER' }
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !content) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }
    onSubmit({
      title,
      content,
      category,
      priority,
      confidentiality,
      steps
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">Tạo tờ trình phê duyệt mới</h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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
                className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg"
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
                className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg"
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
                className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg"
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

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Hủy
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
            >
              Tạo và gửi trình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}