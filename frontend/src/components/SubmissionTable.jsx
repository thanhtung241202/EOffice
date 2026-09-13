// src/components/SubmissionTable.jsx
import React, { useState } from 'react';
import { Search, Download, Plus, Calendar } from 'lucide-react';

export default function SubmissionTable({ submissions = [], onSelectSubmission, onOpenCreateModal }) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const safeList = Array.isArray(submissions) ? submissions : [];

  // Tự động nhận diện tab "Được chia sẻ" nếu có trường shared_by_name
  const isSharedTab = safeList.some(item => item.shared_by_name !== undefined);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-medium border border-emerald-200">Đã phê duyệt</span>;
      case 'IN_PROGRESS':
        return <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-medium border border-amber-200">Đang xử lý</span>;
      case 'RETURNED':
        return <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-medium border border-blue-200">Trả về</span>;
      case 'REJECTED':
        return <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs font-medium border border-rose-200">Từ chối</span>;
      default:
        return <span className="text-gray-600 bg-gray-50 px-2 py-0.5 rounded text-xs font-medium border border-gray-200">Dự thảo</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'URGENT') return <span className="text-rose-600 font-medium">Khẩn cấp</span>;
    return <span className="text-emerald-600 font-medium">Bình thường</span>;
  };

  return (
    <div className="p-6 bg-gray-50/50 min-h-[calc(100vh-64px)] space-y-4">
      <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px]">
            <input 
              type="text"
              placeholder="Nhập Tiêu đề..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="py-1.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-md text-gray-600 focus:outline-none"
          >
            <option value="ALL">Chọn trạng thái</option>
            <option value="IN_PROGRESS">Đang xử lý</option>
            <option value="APPROVED">Đã phê duyệt</option>
            <option value="RETURNED">Đã trả về</option>
            <option value="REJECTED">Từ chối</option>
          </select>
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-md text-xs text-gray-500">
            <span>Thời gian...</span>
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <button className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" />
            <span>Xuất dữ liệu</span>
          </button>
          <button 
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm mới</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input type="checkbox" className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                </th>
                <th className="p-3.5 min-w-[320px]">Tiêu đề</th>
                <th className="p-3.5">Mã số</th>
                <th className="p-3.5">Độ ưu tiên</th>
                <th className="p-3.5">Trạng thái</th>
                {isSharedTab && <th className="p-3.5">Người chia sẻ</th>}
                <th className="p-3.5">Loại tờ trình</th>
                {isSharedTab ? <th className="p-3.5">Ngày chia sẻ</th> : <th className="p-3.5">Ngày trình</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {safeList.length === 0 ? (
                <tr>
                  <td colSpan={isSharedTab ? "8" : "7"} className="p-8 text-center text-gray-400 text-xs">
                    Không tìm thấy dữ liệu tờ trình.
                  </td>
                </tr>
              ) : (
                safeList.map((item, index) => {
                  const rawId = item?.submission_id ?? item?.id ?? '';
                  const subId = typeof rawId === 'string' ? rawId : String(rawId);
                  
                  const displayCode = item?.document_code 
                    ? item.document_code 
                    : (subId.length >= 5 ? `#${subId.slice(0, 5)}` : `#${index + 1}`);

                  // Lấy ngày hiển thị tùy thuộc vào tab
                  const dateVal = isSharedTab ? item?.shared_at : (item?.submission_created_at || item?.created_at);
                  let displayDate = '-';
                  if (dateVal) {
                    try {
                      displayDate = new Date(dateVal).toLocaleDateString('vi-VN');
                    } catch (e) {
                      displayDate = '-';
                    }
                  }

                  return (
                    <tr 
                      key={subId || index} 
                      className="hover:bg-red-50/30 transition-colors cursor-pointer"
                      onClick={() => subId && onSelectSubmission(subId)}
                    >
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                      </td>
                      <td className="p-3.5 font-medium text-blue-700 hover:underline">
                        {item?.title || 'Không có tiêu đề'}
                      </td>
                      <td className="p-3.5 text-gray-500 font-mono">
                        {displayCode}
                      </td>
                      <td className="p-3.5">
                        {getPriorityBadge(item?.priority)}
                      </td>
                      <td className="p-3.5">
                        {getStatusBadge(item?.status || 'IN_PROGRESS')}
                      </td>
                      {isSharedTab && (
                        <td className="p-3.5 font-medium text-purple-700">
                          {item?.shared_by_name || 'Hệ thống'}
                        </td>
                      )}
                      <td className="p-3.5 text-gray-600">
                        {item?.category || 'Phê duyệt khác'}
                      </td>
                      <td className="p-3.5 text-gray-500">
                        {displayDate}
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
  );
}