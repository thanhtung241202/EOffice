// src/components/SubmissionTable.jsx
import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';

const CATEGORIES = [
  'Tuyển dụng - Nhân sự - Đào tạo',
  'Đề xuất mua sắm',
  'Tài chính - Kế toán',
  'Kỹ thuật - CNTT'
];

const ITEMS_PER_PAGE = 10;

function StatusBadge({ status }) {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="text-[11px] font-medium text-stone-700 bg-stone-100 px-2 py-0.5 border border-stone-300 whitespace-nowrap">
          Đã phê duyệt
        </span>
      );
    case 'IN_PROGRESS':
    case 'PASSED':
      return (
        <span className="text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 border border-red-200 whitespace-nowrap">
          Đang xử lý
        </span>
      );
    case 'RETURNED':
      return (
        <span className="text-[11px] font-medium text-stone-800 bg-stone-100 px-2 py-0.5 border border-stone-300 whitespace-nowrap">
          Trả về
        </span>
      );
    case 'REJECTED':
      return (
        <span className="text-[11px] font-medium text-red-800 bg-red-100 px-2 py-0.5 border border-red-300 whitespace-nowrap">
          Từ chối
        </span>
      );
    case 'DRAFT':
    default:
      return (
        <span className="text-[11px] font-medium text-stone-600 bg-stone-50 px-2 py-0.5 border border-stone-200 whitespace-nowrap">
          {status === 'DRAFT' ? 'Bản nháp' : status || '—'}
        </span>
      );
  }
}

export default function SubmissionTable({ 
  submissions = [], 
  onSelectSubmission, 
  onOpenCreateModal 
}) {
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Lọc dữ liệu theo danh mục
  const filteredSubmissions = useMemo(() => {
    if (filterCategory === 'ALL') return submissions;
    return submissions.filter((item) => item.category === filterCategory);
  }, [submissions, filterCategory]);

  // Tính toán số trang
  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE) || 1;

  // Cắt mảng theo trang hiện tại (derived state)
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubmissions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSubmissions, currentPage]);

  const handleCategoryChange = (e) => {
    setFilterCategory(e.target.value);
    setCurrentPage(1); // Reset về trang 1 khi đổi bộ lọc
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Tạo mảng số trang hiển thị (hạn chế tràn khi có quá nhiều trang)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      {/* 1. THANH ĐIỀU HƯỚNG & BỘ LỌC PHẲNG */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 border border-stone-200">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 tracking-tight">
            Danh sách tờ trình
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Tổng số {filteredSubmissions.length} hồ sơ theo bộ lọc hiện tại
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label htmlFor="filterCategorySelect" className="text-xs text-stone-500">
              Danh mục:
            </label>
            <select
              id="filterCategorySelect"
              value={filterCategory}
              onChange={handleCategoryChange}
              className="text-xs border border-stone-300 bg-white text-stone-800 px-2.5 py-1.5 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
            >
              <option value="ALL">Tất cả danh mục</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white text-xs font-medium tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 shrink-0 ml-auto sm:ml-0"
          >
            <Plus size={14} />
            <span>Tạo tờ trình mới</span>
          </button>
        </div>
      </header>

      {/* 2. BẢNG DỮ LIỆU */}
      <div className="w-full bg-white border border-stone-200 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left border-collapse text-xs">
          <thead>
            <tr className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-semibold text-stone-600 uppercase tracking-wider">
              <th scope="col" className="py-3 px-4 w-28">Số hiệu</th>
              <th scope="col" className="py-3 px-4 min-w-[240px]">Tiêu đề tờ trình</th>
              <th scope="col" className="py-3 px-4 w-44">Danh mục</th>
              <th scope="col" className="py-3 px-4 w-36">Người tạo</th>
              <th scope="col" className="py-3 px-4 w-32">Ngày lập</th>
              <th scope="col" className="py-3 px-4 w-32 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-sans">
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-stone-400">
                  Không tìm thấy hồ sơ nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              paginatedSubmissions.map((item) => {
                const currentStatus = item.status || item.submission_status;
                const docCode = item.document_code 
                  ? `#${item.document_code}` 
                  : `#${String(item.id).slice(0, 8)}`;

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectSubmission(item.id)}
                    className="hover:bg-stone-50 cursor-pointer transition-colors duration-150 group"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-red-700 whitespace-nowrap">
                      {docCode}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900 group-hover:text-red-700 transition-colors line-clamp-1">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2">
                        {item.total_steps > 0 && (
                          <span>
                            Tiến độ: Bước {item.current_step_order || 0}/{item.total_steps}
                          </span>
                        )}
                        {item.priority === 'URGENT' && (
                          <span className="text-red-700 font-medium">
                            &bull; Khẩn cấp
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-stone-600 truncate max-w-[170px]" title={item.category}>
                      {item.category}
                    </td>

                    <td className="py-3 px-4 text-stone-800 whitespace-nowrap">
                      {item.creator_name || 'Hệ thống'}
                    </td>

                    <td className="py-3 px-4 text-stone-500 whitespace-nowrap font-mono text-[11px]">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <StatusBadge status={currentStatus} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* 3. KHỐI ĐIỀU HƯỚNG PHÂN TRANG (PAGINATION) */}
        {filteredSubmissions.length > ITEMS_PER_PAGE && (
          <footer className="px-4 py-3 bg-stone-50/50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
            <div>
              Hiển thị{' '}
              <span className="font-medium text-stone-800">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{' '}
              -{' '}
              <span className="font-medium text-stone-800">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredSubmissions.length)}
              </span>{' '}
              trên tổng số{' '}
              <span className="font-medium text-stone-800">
                {filteredSubmissions.length}
              </span>{' '}
              hồ sơ
            </div>

            <nav aria-label="Phân trang danh sách" className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-2.5 py-1 border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              >
                Trước
              </button>

              {getPageNumbers().map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePageChange(num)}
                  className={`min-w-[28px] h-7 px-2 border text-xs font-mono transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
                    currentPage === num
                      ? 'border-red-700 bg-red-700 text-white font-semibold'
                      : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-2.5 py-1 border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              >
                Sau
              </button>
            </nav>
          </footer>
        )}
      </div>
    </div>
  );
}