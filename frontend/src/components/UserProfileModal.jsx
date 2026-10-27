// src/components/UserProfileModal.jsx
import React from 'react';
import { X } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose, user, onLogout }) {
  if (!isOpen || !user) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profileModalTitle"
      className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4"
    >
      <div className="bg-white w-full max-w-sm border border-stone-300 divide-y divide-stone-200">
        <header className="px-5 py-4 border-t-2 border-t-red-700 flex items-center justify-between">
          <h2 id="profileModalTitle" className="text-sm font-semibold text-stone-900">
            Hồ sơ tài khoản
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            aria-label="Đóng cửa sổ"
          >
            <X size={16} />
          </button>
        </header>

        <section aria-label="Thông tin nhân sự" className="p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 bg-stone-900 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                {user.name?.slice(0, 1) || 'U'}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-stone-900 text-sm truncate">
                  {user.name}
                </h3>
                <p className="text-[11px] text-stone-500 truncate mt-0.5">
                  {user.job_title}
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 border shrink-0 ${
                user.is_admin
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-stone-300 bg-stone-100 text-stone-700'
              }`}
            >
              {user.is_admin ? 'Admin' : 'Nhân viên'}
            </span>
          </div>

          <dl className="divide-y divide-stone-100">
            <div className="py-2.5 flex items-baseline justify-between gap-2">
              <dt className="text-stone-500 shrink-0">Email công vụ</dt>
              <dd className="font-medium text-stone-900 truncate font-mono text-[11px] text-right">
                {user.email || '—'}
              </dd>
            </div>

            <div className="py-2.5 flex items-baseline justify-between gap-2">
              <dt className="text-stone-500 shrink-0">Phòng ban</dt>
              <dd className="font-medium text-stone-900 text-right truncate">
                {user.department || '—'}
              </dd>
            </div>

            <div className="py-2.5 flex items-baseline justify-between gap-2">
              <dt className="text-stone-500 shrink-0">Vị trí đảm nhiệm</dt>
              <dd className="font-medium text-stone-900 text-right truncate">
                {user.job_title || '—'}
              </dd>
            </div>

            <div className="py-2.5 flex items-baseline justify-between gap-2">
              <dt className="text-stone-500 shrink-0">Mã định danh</dt>
              <dd className="font-mono text-[11px] text-stone-600 truncate select-all text-right">
                {user.id}
              </dd>
            </div>
          </dl>
        </section>

        <footer className="px-5 py-3.5 bg-stone-50/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-300 hover:bg-stone-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-1.5 text-xs font-medium text-red-700 hover:text-red-800 bg-white border border-red-300 hover:bg-red-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-700"
          >
            Đăng xuất
          </button>
        </footer>
      </div>
    </div>
  );
}