'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  UserPlus,
  Lock,
  Unlock,
  Info,
  CheckCircle2,
  Trash2,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { notificationsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: number;
  title: string;
  content: string;
  type: string;
  target: string;
  link_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export default function AdminHeader() {
  const { user } = useAuth();
  const router = useRouter();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lấy số lượng thông báo chưa đọc
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsApi.unreadCount();
      if (res.data?.success) {
        setUnreadCount(res.data.count ?? 0);
      }
    } catch {
      // Bỏ qua lỗi ngầm
    }
  }, []);

  // Nạp 6 thông báo mới nhất khi mở dropdown
  const fetchLatestNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.list({ page: 1, limit: 6 });
      if (res.data?.success || Array.isArray(res.data?.data)) {
        setNotifications(res.data.data || []);
        if (res.data.unreadCount !== undefined) {
          setUnreadCount(res.data.unreadCount);
        }
      }
    } catch {
      // Bỏ qua lỗi
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling cập nhật số lượng thông báo mới mỗi 30 giây
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Click ra ngoài để đóng dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchLatestNotifications();
    }
  };

  const handleMarkAsRead = async (id: number, linkUrl?: string | null) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (linkUrl) {
        setIsOpen(false);
        router.push(linkUrl);
      }
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Lỗi đánh dấu tất cả đã đọc:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Helper tính thời gian tương đối
  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) return 'Vừa xong';
      if (diffMinutes < 60) return `${diffMinutes} phút trước`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ngày trước`;
    } catch {
      return '';
    }
  };

  // Icon theo loại thông báo
  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'USER_REGISTER':
        return <UserPlus className="w-4 h-4 text-emerald-600" />;
      case 'USER_LOCKED':
        return <Lock className="w-4 h-4 text-amber-600" />;
      case 'USER_UNLOCKED':
        return <Unlock className="w-4 h-4 text-emerald-600" />;
      case 'ERROR':
      case 'SERVICE_ALERT':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Info className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between shadow-xs">
      {/* Bên trái: Trạng thái hệ thống */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Hệ thống trực tuyến</span>
        </div>
      </div>

      {/* Bên phải: Chuông thông báo + Profile Admin */}
      <div className="flex items-center gap-4">
        {/* Dropdown Chuông thông báo */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleToggle}
            type="button"
            className={cn(
              'relative p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-hidden',
              isOpen && 'bg-gray-100 text-indigo-600'
            )}
            title="Thông báo hệ thống"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Popover danh sách thông báo */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">Thông báo hệ thống</span>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markingAll}
                    type="button"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Đã đọc hết</span>
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {loading ? (
                  <div className="py-8 flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                    <span className="text-xs">Đang tải thông báo...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    Chưa có thông báo nào trong hệ thống
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleMarkAsRead(item.id, item.link_url)}
                      className={cn(
                        'p-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors cursor-pointer text-left',
                        !item.is_read && 'bg-indigo-50/40'
                      )}
                    >
                      <div className="mt-0.5 shrink-0 p-1.5 bg-gray-100 rounded-lg">
                        {renderNotificationIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p
                            className={cn(
                              'text-xs font-semibold truncate',
                              item.is_read ? 'text-gray-700' : 'text-indigo-950 font-bold'
                            )}
                          >
                            {item.title}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
                <Link
                  href="/admin/system/notifications"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 py-1"
                >
                  <span>Xem tất cả thông báo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Thông tin Quản trị viên */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-gray-800 truncate max-w-[140px]">
              {user?.email}
            </p>
            <span className="inline-block text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

