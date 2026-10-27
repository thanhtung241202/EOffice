// src/components/ResetPasswordModal.jsx
import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { authFetch } from '../App';

export default function ResetPasswordModal({ isOpen, onClose, user, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setLoading(true);
      const res = await authFetch(`http://localhost:5000/api/users/${user.id}/reset-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đặt lại mật khẩu thất bại.');
      }

      if (onSuccess) {
        onSuccess(user);
      }
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resetModalHeading"
      className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4"
    >
      <div className="bg-white w-full max-w-sm border border-stone-300 divide-y divide-stone-200">
        <header className="px-5 py-4 border-t-2 border-t-red-700 flex items-center justify-between">
          <h2 id="resetModalHeading" className="text-sm font-semibold text-stone-900">
            Đặt lại mật khẩu nhân viên
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-700 p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            aria-label="Đóng cửa sổ"
          >
            <X size={16} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-stone-50 border border-stone-200">
            <span className="block font-medium text-stone-900">{user.name}</span>
            <span className="block text-[11px] text-stone-500 font-mono mt-0.5">{user.email}</span>
          </div>

          {error && (
            <div
              role="alert"
              className="p-2.5 bg-red-50 border-l-2 border-red-700 text-red-900 text-[11px] leading-relaxed"
            >
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="newPassword"
              className="block font-medium text-stone-700"
            >
              Mật khẩu mới *
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Tối thiểu 6 ký tự"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="confirmPassword"
              className="block font-medium text-stone-700"
            >
              Xác nhận mật khẩu mới *
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
            />
          </div>

          <footer className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleClose}
              className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-medium flex items-center justify-center gap-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <span>Cập nhật mật khẩu</span>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}