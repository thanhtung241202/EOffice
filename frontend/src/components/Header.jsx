// src/components/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, CheckCheck, Clock, CheckCircle2, 
  RotateCcw, XCircle, Share2, Search, User
} from 'lucide-react';

const NOTIF_API = 'http://localhost:5000/api/notifications';

export default function Header({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
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

  // Tự động load lại mỗi khi đổi user và polling nhẹ mỗi 10s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Click ra ngoài để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. Click vào 1 thông báo: Đánh dấu đã đọc và mở chi tiết tờ trình
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

  // 3. Đánh dấu tất cả là đã đọc
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
      {/* Ô tìm kiếm nhanh */}
      <div className="flex items-center gap-3 w-80 sm:w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Tìm kiếm số hiệu, tiêu đề tờ trình..."
            className="w-full text-xs pl-9 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
          />
        </div>
      </div>

      {/* Cụm Quả chuông & Avatar User */}
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