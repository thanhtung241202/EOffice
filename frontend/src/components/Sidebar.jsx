// src/components/Sidebar.jsx
import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

const MENU_ITEMS = [
  {
    path: '/submissions/pending',
    label: 'Tờ trình cần xử lý',
    badgeKey: 'pending'
  },
  {
    path: '/submissions/my-submissions',
    label: 'Tờ trình của tôi'
  },
  {
    path: '/submissions/processed',
    label: 'Tờ trình đã xử lý'
  },
  {
    path: '/submissions/approved',
    label: 'Tờ trình đã phê duyệt'
  },
  {
    path: '/submissions/shared',
    label: 'Tờ trình được chia sẻ'
  }
];

export default function Sidebar({
  pendingCount = 0,
  isAdmin = false,
  isOpen = false,
  onClose = () => {}
}) {
  const [openApproval, setOpenApproval] = useState(true);

  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Lớp nền mờ trên màn hình mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/40 z-40 md:hidden transition-opacity duration-150"
          aria-hidden="true"
        />
      )}

      {/* Khung Sidebar chính */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-stone-200 flex flex-col h-screen select-none shrink-0 transition-transform duration-200 ease-in-out
          md:static md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header thương hiệu: Bấm vào chuyển hướng về trang chủ */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-stone-200 shrink-0">
          <Link
            to="/"
            onClick={handleLinkClick}
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 p-1 -ml-1 transition-opacity hover:opacity-85"
            title="Về trang chủ EOffice"
          >
            {/* Logo vuông màu đỏ */}
            <span className="w-7 h-7 bg-red-700 text-white flex items-center justify-center font-bold text-xs shrink-0 select-none">
              A
            </span>

            {/* Cụm tên ứng dụng căn trái tuyệt đối */}
            <div className="flex flex-col items-start justify-center min-w-0 text-left">
              <span className="font-semibold text-sm text-stone-900 tracking-tight leading-none text-left">
                EOffice
              </span>
              <span className="text-[10px] text-stone-500 uppercase tracking-wider font-medium leading-none mt-1 text-left">
                ABC Company
              </span>
            </div>
          </Link>

          {/* Nút đóng sidebar trên thiết bị di động */}
          <button
            type="button"
            onClick={onClose}
            className="md:hidden text-stone-500 hover:text-stone-900 p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            aria-label="Đóng thanh điều hướng"
          >
            <X size={16} />
          </button>
        </header>

        {/* Danh mục menu điều hướng */}
        <nav aria-label="Điều hướng chính" className="flex-1 overflow-y-auto p-3 space-y-4">
          <section className="space-y-1">
            <button
              type="button"
              onClick={() => setOpenApproval(!openApproval)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 uppercase tracking-wider transition-colors duration-150"
            >
              <span>Quản lý phê duyệt</span>
              {openApproval ? (
                <ChevronDown size={14} className="text-stone-400" />
              ) : (
                <ChevronRight size={14} className="text-stone-400" />
              )}
            </button>

            {openApproval && (
              <ul className="space-y-0.5 border-l border-stone-200 ml-2.5 pl-2">
                {MENU_ITEMS.map((item) => {
                  const badge = item.badgeKey === 'pending' ? pendingCount : 0;

                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={handleLinkClick}
                        className={({ isActive }) =>
                          `group relative flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
                            isActive
                              ? 'bg-stone-100 text-red-700 font-semibold border-l-2 border-red-700 -ml-[9px] pl-[15px]'
                              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50 font-normal'
                          }`
                        }
                      >
                        <span className="truncate">{item.label}</span>
                        {badge > 0 && (
                          <span className="bg-red-700 text-white text-[10px] font-semibold px-1.5 py-0.2 shrink-0">
                            {badge}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Phân hệ Quản trị hệ thống (Chỉ hiển thị cho tài khoản Admin) */}
          {isAdmin && (
            <section className="pt-3 border-t border-stone-200 space-y-1">
              <header className="px-2.5 pb-1 text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                Quản trị hệ thống
              </header>
              <ul className="space-y-0.5">
                <li>
                  <NavLink
                    to="/admin/users"
                    onClick={handleLinkClick}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
                        isActive
                          ? 'bg-stone-100 text-red-700 font-semibold border-l-2 border-red-700'
                          : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50 font-normal'
                      }`
                    }
                  >
                    <span className="truncate">Quản lý người dùng</span>
                    <span className="text-[9px] border border-stone-300 text-stone-600 font-medium px-1 py-0.2 uppercase shrink-0">
                      Admin
                    </span>
                  </NavLink>
                </li>
              </ul>
            </section>
          )}
        </nav>

        {/* Footer Sidebar */}
        <footer className="p-3 border-t border-stone-200 shrink-0">
          <div className="flex items-center justify-between px-2.5 py-1 text-xs text-stone-500">
            <span>Ngôn ngữ</span>
            <span className="font-medium text-stone-800">Tiếng Việt</span>
          </div>
        </footer>
      </aside>
    </>
  );
}