// src/components/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, CheckCheck, Clock, CheckCircle2, 
  RotateCcw, XCircle, Share2, Search, User, Loader2, X, FileText
} from 'lucide-react';

const NOTIF_API = 'http://localhost:5000/api/notifications';
const SEARCH_API = 'http://localhost:5000/api/submissions/search';

export default function Header({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // State cho Tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const navigate = useNavigate();

  // 1. Tải danh sách thông báo theo currentUser
  const fetchNotifications = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(NOTIF_API, {
        headers: { 'x-user-id': currentUser.id }
      });
      const json = await res.json();
      if (res.ok) {
        setNotifications(json.data || []);
        setUnreadCount(json.unread_count || 0);
      }
    } catch (err) {
      console.error('[Notification Fetch Error]:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Click ra ngoài để đóng dropdown thông báo & dropdown tìm kiếm
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Xử lý Tìm kiếm với Debounce 300ms
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsSearchOpen(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${SEARCH_API}?q=${encodeURIComponent(searchQuery.trim())}`, {
          headers: { 'x-user-id': currentUser.id }
        });
        const json = await res.json();
        if (res.ok) {
          setSearchResults(json.data || []);
        }
      } catch (err) {
        console.error('[Search Error]:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser?.id]);

  // Chọn 1 kết quả tìm kiếm
  const handleSelectSearchResult = (id) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(`/submissions/${id}`);
  };

  // Click vào 1 thông báo: Đánh dấu đã đọc và mở chi tiết tờ trình
  const handleItemClick = async (item) => {
    if (!item.is_read) {
      try {
        await fetch(`${NOTIF_API}/${item.id}/read`, {
          method: 'PUT',
          headers: { 'x-user-id': currentUser.id }
        });
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error('[Mark Read Error]:', err);
      }
    }
    setIsOpen(false);
    navigate(`/submissions/${item.submission_id}`);
  };

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${NOTIF_API}/mark-all-read`, {
        method: 'PUT',
        headers: { 'x-user-id': currentUser.id }
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('[Mark All Read Error]:', err);
    }
  };

  // Helper render trạng thái kết quả search
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-1.5 py-0.5 rounded">Đã duyệt</span>;
      case 'IN_PROGRESS':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-1.5 py-0.5 rounded">Đang xử lý</span>;
      case 'RETURNED':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-1.5 py-0.5 rounded">Đã trả về</span>;
      case 'REJECTED':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold px-1.5 py-0.5 rounded">Từ chối</span>;
      default:
        return null;
    }
  };

  // Icon tương ứng theo loại thông báo
  const renderIcon = (type) => {
    switch (type) {
      case 'APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'RETURNED':
        return <RotateCcw className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'SHARED':
        return <Share2 className="w-4 h-4 text-purple-600 shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 relative z-30">
      {/* Ô TÌM KIẾM NHANH */}
      <div className="relative w-80 sm:w-96" ref={searchRef}>
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Tìm theo số hiệu, tiêu đề, người tạo..."
            value={searchQuery}
            onFocus={() => { if (searchResults.length > 0) setIsSearchOpen(true); }}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-8 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
          />
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          ) : searchQuery ? (
            <button 
              type="button" 
              onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        {/* DROPDOWN KẾT QUẢ TÌM KIẾM */}
        {isSearchOpen && (
          <div className="absolute left-0 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-100 max-h-96 overflow-y-auto">
            {searchResults.length === 0 ? (
              !isSearching && (
                <div className="p-4 text-center text-xs text-gray-400">
                  Không tìm thấy tờ trình phù hợp với từ khóa.
                </div>
              )
            ) : (
              <div className="divide-y divide-gray-100">
                <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Kết quả tìm kiếm ({searchResults.length})
                </div>
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSearchResult(item.id)}
                    className="p-3 hover:bg-gray-50 cursor-pointer flex items-start gap-2.5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-red-600 font-mono font-bold text-xs">
                          {item.document_code || `#${String(item.id).slice(0, 8)}`}
                        </span>
                        {renderStatusBadge(item.status)}
                      </div>
                      <p className="text-xs font-semibold text-gray-800 truncate mb-0.5">
                        {item.title}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>Người lập: {item.creator_name}</span>
                        <span>{new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CỤM QUẢ CHUÔNG & AVATAR USER */}
      <div className="flex items-center gap-3">
        {/* DROPDOWN QUẢ CHUÔNG */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Thông báo"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center animate-pulse shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-gray-800">Thông báo</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 font-medium cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Đọc tất cả</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 text-xs">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    Bạn chưa có thông báo nào.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                        item.is_read ? 'hover:bg-gray-50 bg-white' : 'bg-red-50/30 hover:bg-red-50/60'
                      }`}
                    >
                      <div className="mt-0.5">{renderIcon(item.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`truncate text-xs ${item.is_read ? 'font-semibold text-gray-700' : 'font-bold text-gray-900'}`}>
                            {item.title}
                          </p>
                          {!item.is_read && (
                            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                          )}
                        </div>

                        <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                          {item.content}
                        </p>

                        <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-400">
                          {item.action_by_name ? (
                            <span className="flex items-center gap-1 font-medium text-gray-500">
                              <User className="w-2.5 h-2.5" />
                              {item.action_by_name} ({item.action_by_job_title || 'Thành viên'})
                            </span>
                          ) : (
                            <span></span>
                          )}
                          <span>
                            {new Date(item.created_at).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* THÔNG TIN TÀI KHOẢN ĐANG ĐĂNG NHẬP */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0">
            {currentUser?.name ? currentUser.name.slice(0, 1) : 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-gray-800 leading-none truncate max-w-[120px]">
              {currentUser?.name}
            </div>
            <div className="text-[10px] text-gray-400 mt-1 truncate max-w-[120px]">
              {currentUser?.job_title}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}