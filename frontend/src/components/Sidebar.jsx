// src/components/Sidebar.jsx
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Inbox, FileText, CheckCircle2, CheckCheck, Share2, 
  ChevronDown, ChevronRight, FileSpreadsheet, Globe, ChevronLeft
} from 'lucide-react';

export default function Sidebar({ pendingCount = 0 }) {
  const [openApproval, setOpenApproval] = useState(true);
  const location = useLocation();

  const menuItems = [
    { 
      path: '/submissions/pending', 
      label: 'Tờ trình cần xử lý', 
      icon: Inbox, 
      badge: pendingCount 
    },
    { 
      path: '/submissions/my-submissions', 
      label: 'Tờ trình của tôi', 
      icon: FileText 
    },
    { 
      path: '/submissions/processed', 
      label: 'Tờ trình đã xử lý', 
      icon: CheckCircle2 
    },
    { 
      path: '/submissions/approved', 
      label: 'Tờ trình đã phê duyệt', 
      icon: CheckCheck 
    },
    { 
      path: '/submissions/shared', 
      label: 'Tờ trình được chia sẻ', 
      icon: Share2 
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm">
            VSF
          </div>
          <span className="font-bold text-lg text-gray-800 tracking-tight">eOffice</span>
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-50">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Menu Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        <div>
          <button 
            onClick={() => setOpenApproval(!openApproval)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg group transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded bg-red-50 text-red-600">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <span>Quản lý phê duyệt</span>
            </div>
            {openApproval ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>

          {openApproval && (
            <div className="mt-1 ml-4 pl-2 border-l border-gray-100 space-y-0.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                      isActive 
                        ? 'bg-red-50 text-red-700 font-semibold shadow-xs' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-red-600' : 'text-gray-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        {/* Các module phụ */}
        <div className="pt-3 border-t border-gray-100">
          <button className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-gray-300"></span>
              <span>Lấy số văn bản</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-gray-300"></span>
              <span>Quản lý hợp đồng</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Footer Language */}
      <div className="p-3 border-t border-gray-100">
        <button className="flex items-center gap-2 text-xs font-medium text-gray-600 px-2 py-1.5 rounded-md hover:bg-gray-50 w-full">
          <Globe className="w-4 h-4 text-red-600" />
          <span>Tiếng Việt</span>
        </button>
      </div>
    </aside>
  );
}