// src/components/Header.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, X, Loader2 } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

function StatusBadge({ status }) {
  if (status === 'APPROVED') {
    return (
      <span className="text-[10px] font-medium text-stone-700 bg-stone-100 px-1.5 py-0.5 border border-stone-200">
        Đã duyệt
      </span>
    );
  }
  if (status === 'IN_PROGRESS') {
    return (
      <span className="text-[10px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 border border-red-200">
        Đang xử lý
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium text-stone-600 bg-stone-50 px-1.5 py-0.5 border border-stone-200">
      {status}
    </span>
  );
}

export default function Header({
  currentUser,
  onToggleSidebar = () => {},
  onOpenProfile = () => {}
}) {
  // State Tìm kiếm
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  // State Thông báo
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const [loadingNoti, setLoadingNoti] = useState(false);
  const notiRef = useRef(null);

  const navigate = useNavigate();

  // Đóng dropdown khi click ra ngoài vùng hiển thị
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
      if (notiRef.current && !notiRef.current.contains(e.target)) {
        setShowNotiDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lấy dữ liệu thông báo từ API
  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('eoffice_token');
      if (!token) return;

      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) {
        setUnreadNotifications(json.unread_count || 0);
        setNotifications(Array.isArray(json.data) ? json.data : []);
      }
    } catch (err) {
      console.error('[Fetch Notifications Error]:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Tìm kiếm tờ trình
  useEffect(() => {
    const cleanKw = keyword.trim();
    if (!cleanKw) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = localStorage.getItem('eoffice_token');
        const res = await fetch(
          `${API_BASE}/submissions/search?q=${encodeURIComponent(cleanKw)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (res.ok && Array.isArray(json.data)) {
          setSearchResults(json.data);
        } else {
          setSearchResults([]);
        }
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('[Search Header Error]:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [keyword]);

  const handleSelectResult = (submissionId) => {
    setShowSearchDropdown(false);
    setKeyword('');
    navigate(`/submissions/${submissionId}`);
  };

  // Mở popup thông báo & đánh dấu đã đọc
  const handleToggleNotifications = async () => {
    const nextState = !showNotiDropdown;
    setShowNotiDropdown(nextState);

    if (nextState) {
      setLoadingNoti(true);
      await fetchNotifications();
      setLoadingNoti(false);
    }
  };

  const handleSelectNotification = async (noti) => {
    setShowNotiDropdown(false);
    if (!noti.is_read) {
      try {
        const token = localStorage.getItem('eoffice_token');
        await fetch(`${API_BASE}/notifications/${noti.id}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
        setUnreadNotifications((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('[Mark Read Error]:', err);
      }
    }
    if (noti.submission_id) {
      navigate(`/submissions/${noti.submission_id}`);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-stone-200 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 relative z-20">
      {/* 1. NÚT MENU (MOBILE) & Ô TÌM KIẾM */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 -ml-1 text-stone-600 hover:text-stone-900 md:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
          aria-label="Mở menu điều hướng"
        >
          <Menu size={18} />
        </button>

        <div className="relative w-full" ref={searchRef}>
          <Search
            size={15}
            className="text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="search"
            placeholder="Tìm theo số hiệu (#1), tiêu đề, người tạo..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowSearchDropdown(true);
            }}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-stone-50 border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-red-700 focus:bg-white focus:ring-1 focus:ring-red-700 transition-colors duration-150"
          />

          {keyword && (
            <button
              type="button"
              onClick={() => {
                setKeyword('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              aria-label="Xóa nội dung tìm kiếm"
            >
              <X size={13} />
            </button>
          )}

          {showSearchDropdown && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-stone-200 shadow-none max-h-80 overflow-y-auto z-50 divide-y divide-stone-100">
              {isSearching ? (
                <div className="p-3 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
                  <Loader2 size={13} className="animate-spin text-stone-400" />
                  <span>Đang tìm kiếm...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-3 text-center text-xs text-stone-500">
                  Không tìm thấy tờ trình phù hợp
                </div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectResult(item.id)}
                    className="w-full p-3 text-left hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none flex items-center justify-between gap-3 text-xs transition-colors duration-150"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-900 truncate">
                        <span className="font-mono text-red-700 mr-2">
                          #{item.document_code || String(item.id).slice(0, 8)}
                        </span>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-stone-500 truncate mt-0.5">
                        {item.creator_name} &bull; {item.category}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={item.status} />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. CHUÔNG THÔNG BÁO & USER PROFILE */}
      <nav aria-label="Người dùng và thông báo" className="flex items-center gap-2 shrink-0">
        {/* KHỐI NÚT CHUÔNG & DROPDOWN THÔNG BÁO */}
        <div className="relative" ref={notiRef}>
          <button
            type="button"
            onClick={handleToggleNotifications}
            className={`relative p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 transition-colors duration-150 ${
              showNotiDropdown ? 'bg-stone-100 text-stone-900' : ''
            }`}
            aria-label={
              unreadNotifications > 0
                ? `${unreadNotifications} thông báo chưa đọc`
                : 'Thông báo'
            }
          >
            <Bell size={16} />
            {unreadNotifications > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-700"
              />
            )}
          </button>

          {/* POPUP THÔNG BÁO */}
          {showNotiDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-stone-300 divide-y divide-stone-200 z-50">
              <header className="p-3 bg-stone-50 flex items-center justify-between">
                <span className="font-semibold text-xs text-stone-900 tracking-wide uppercase">
                  Thông báo hệ thống
                </span>
                {unreadNotifications > 0 && (
                  <span className="text-[10px] font-mono text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2">
                    {unreadNotifications} mới
                  </span>
                )}
              </header>

              <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                {loadingNoti ? (
                  <div className="p-6 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin text-stone-400" />
                    <span>Đang tải thông báo...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-400">
                    Không có thông báo mới nào.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleSelectNotification(n)}
                      className={`w-full p-3 text-left transition-colors duration-150 hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none flex flex-col gap-1 ${
                        !n.is_read ? 'bg-stone-50/70 border-l-2 border-l-red-700' : ''
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`text-xs truncate ${!n.is_read ? 'font-semibold text-stone-900' : 'font-medium text-stone-700'}`}>
                          {n.title || 'Thông báo hồ sơ'}
                        </span>
                        <time className="text-[10px] text-stone-400 font-mono shrink-0">
                          {n.created_at ? new Date(n.created_at).toLocaleDateString('vi-VN') : ''}
                        </time>
                      </div>
                      <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                        {n.content || n.message}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* THÔNG TIN USER PROFILE */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 pl-3 py-1 border-l border-stone-200 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 text-left transition-colors duration-150"
          title="Xem thông tin cá nhân"
        >
          <span className="w-7 h-7 bg-stone-900 text-white flex items-center justify-center font-medium text-xs shrink-0 select-none">
            {currentUser?.name?.slice(0, 1) || 'U'}
          </span>
          <span className="hidden sm:block text-left leading-tight">
            <span className="block text-xs font-medium text-stone-900">
              {currentUser?.name}
            </span>
            <span className="block text-[11px] text-stone-500">
              {currentUser?.job_title}
            </span>
          </span>
        </button>
      </nav>
    </header>
  );
}