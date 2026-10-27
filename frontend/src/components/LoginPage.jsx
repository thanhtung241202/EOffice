import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || result.error || 'Đăng nhập không thành công.');
      }

      const authData = result.data || result;

      localStorage.setItem('eoffice_token', authData.token);
      localStorage.setItem('eoffice_user', JSON.stringify(authData.user));

      onLoginSuccess(authData.user);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100 flex items-center justify-center p-6 text-stone-900 font-sans">
      <article className="w-full max-w-sm bg-white border border-stone-200 divide-y divide-stone-200 shadow-sm">
        <header className="px-6 py-6 space-y-1 border-t-2 border-t-red-700">
          <div className="text-xs font-semibold tracking-wider uppercase text-red-700">
            VSF Portal
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-stone-900">
            Hệ thống eOffice
          </h1>
          <p className="text-xs text-stone-500 leading-normal">
            Quản lý và phê duyệt tờ trình điện tử
          </p>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 text-xs bg-red-50 border-l-2 border-red-700 text-red-900 leading-relaxed flex items-start gap-2"
            >
              <AlertCircle size={15} className="text-red-700 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-medium text-stone-700"
            >
              Email công vụ
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@eoffice.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-stone-700"
            >
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-colors duration-150"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2 px-4 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white text-xs font-medium tracking-wide flex items-center justify-center gap-2 transition-colors duration-150 disabled:bg-stone-300 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>

        <footer className="px-6 py-4 bg-stone-50">
          <p className="text-[11px] text-stone-500 text-center leading-relaxed">
            Tài khoản nội bộ được phân quyền bởi Quản trị viên
          </p>
        </footer>
      </article>
    </main>
  );
}