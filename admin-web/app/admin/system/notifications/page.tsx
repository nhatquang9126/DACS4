'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCheck,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  UserPlus,
  Lock,
  Unlock,
  ShieldAlert,
  Info,
  Clock,
  Send,
  ExternalLink,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import DataTable, { Column } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { useToast } from '@/components/Toast';
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
  is_published: boolean;
  published_at?: string | null;
  created_by?: string | null;
  created_at: string;
}

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả phân loại' },
  { value: 'INFO', label: 'Thông tin (INFO)' },
  { value: 'WARNING', label: 'Cảnh báo (WARNING)' },
  { value: 'ERROR', label: 'Lỗi hệ thống (ERROR)' },
  { value: 'SUCCESS', label: 'Thành công (SUCCESS)' },
  { value: 'USER_REGISTER', label: 'Người dùng mới đăng ký' },
  { value: 'USER_LOCKED', label: 'Tài khoản bị khóa' },
  { value: 'USER_UNLOCKED', label: 'Tài khoản được mở khóa' },
  { value: 'SERVICE_ALERT', label: 'Sự cố dịch vụ / AI Microservice' },
];

const READ_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'false', label: 'Chưa đọc' },
  { value: 'true', label: 'Đã đọc' },
];

export default function SystemNotificationsPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedReadStatus, setSelectedReadStatus] = useState('all');

  // Modal Thêm / Soạn thông báo
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'INFO',
    target: 'ADMIN',
    link_url: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal Xóa
  const [deletingItem, setDeletingItem] = useState<NotificationItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (selectedType !== 'ALL') params.type = selectedType;
      if (selectedReadStatus !== 'all') params.isRead = selectedReadStatus;

      const res = await notificationsApi.list(params);
      if (res.data?.success || Array.isArray(res.data?.data)) {
        setNotifications(res.data.data || []);
        if (res.data.unreadCount !== undefined) {
          setUnreadCount(res.data.unreadCount);
        }
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalRecords(res.data.pagination.totalRecords || 0);
        }
      }
    } catch (err: any) {
      console.error('Lỗi tải thông báo hệ thống:', err);
      showError('Không thể nạp thông báo', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedType, selectedReadStatus, showError]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchNotifications();
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      showSuccess('Đã đánh dấu thông báo là đã đọc');
    } catch (err: any) {
      showError('Thao tác thất bại', err.response?.data?.message || err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      showSuccess('Đã đánh dấu toàn bộ thông báo là đã đọc');
    } catch (err: any) {
      showError('Thao tác thất bại', err.response?.data?.message || err.message);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showError('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }

    try {
      setSubmitting(true);
      await notificationsApi.create(formData);
      showSuccess('Tạo thông báo thành công');
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        content: '',
        type: 'INFO',
        target: 'ADMIN',
        link_url: '',
      });
      fetchNotifications();
    } catch (err: any) {
      showError('Không thể tạo thông báo', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      setDeleting(true);
      await notificationsApi.delete(deletingItem.id);
      showSuccess('Đã xóa thông báo thành công');
      setDeletingItem(null);
      fetchNotifications();
    } catch (err: any) {
      showError('Không thể xóa thông báo', err.response?.data?.message || err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await notificationsApi.publish(id);
      showSuccess('Đã phát hành thông báo tới học viên toàn hệ thống');
      fetchNotifications();
    } catch (err: any) {
      showError('Không thể phát hành thông báo', err.response?.data?.message || err.message);
    }
  };

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

  const formatFullDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'USER_REGISTER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserPlus className="w-3 h-3" />
            <span>Học viên mới</span>
          </span>
        );
      case 'USER_LOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Lock className="w-3 h-3" />
            <span>Khóa tài khoản</span>
          </span>
        );
      case 'USER_UNLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <Unlock className="w-3 h-3" />
            <span>Mở khóa</span>
          </span>
        );
      case 'ERROR':
      case 'SERVICE_ALERT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <ShieldAlert className="w-3 h-3" />
            <span>Sự cố hệ thống</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            <span>Cảnh báo</span>
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Thành công</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Info className="w-3 h-3" />
            <span>Thông tin</span>
          </span>
        );
    }
  };

  const columns: Column<NotificationItem>[] = [
    {
      key: 'is_read',
      header: 'Trạng thái',
      render: (row) => (
        <div className="flex items-center gap-2">
          {!row.is_read ? (
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" title="Chưa đọc" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 shrink-0" title="Đã đọc" />
          )}
          <span className={cn('text-xs font-medium', !row.is_read ? 'text-red-600 font-bold' : 'text-gray-400')}>
            {!row.is_read ? 'Chưa đọc' : 'Đã đọc'}
          </span>
        </div>
      ),
      className: 'w-28',
    },
    {
      key: 'type',
      header: 'Phân loại',
      render: (row) => renderTypeBadge(row.type),
      className: 'w-44',
    },
    {
      key: 'title',
      header: 'Tiêu đề & Nội dung',
      render: (row) => (
        <div className="space-y-1 max-w-lg">
          <div className="flex items-center gap-2">
            <h4
              className={cn(
                'text-sm truncate',
                !row.is_read ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
              )}
            >
              {row.title}
            </h4>
            {row.link_url && (
              <button
                type="button"
                onClick={() => {
                  if (!row.is_read) handleMarkAsRead(row.id);
                  router.push(row.link_url!);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 bg-indigo-50 px-2 py-0.5 rounded font-medium"
              >
                <span>Xem trang</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
            {row.content}
          </p>
        </div>
      ),
    },
    {
      key: 'target',
      header: 'Đối tượng',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
          {row.target === 'ADMIN' ? 'Ban Quản Trị' : row.target === 'STUDENT' ? 'Học viên' : 'Toàn bộ'}
        </span>
      ),
      className: 'w-32',
    },
    {
      key: 'created_at',
      header: 'Thời gian',
      render: (row) => (
        <div className="flex flex-col text-xs text-gray-600">
          <span className="font-semibold text-gray-800">{formatRelativeTime(row.created_at)}</span>
          <span className="text-[11px] text-gray-400 font-mono">{formatFullDate(row.created_at)}</span>
        </div>
      ),
      className: 'w-36',
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {!row.is_read && (
            <button
              type="button"
              onClick={() => handleMarkAsRead(row.id)}
              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Đánh dấu đã đọc"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {row.target === 'ALL' && !row.is_published && (
            <button
              type="button"
              onClick={() => handlePublish(row.id)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Phát hành cho học viên"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeletingItem(row)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Xóa thông báo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-28 text-right',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Tiêu đề */}
      <div>
        <Breadcrumb
          items={[
            { label: 'Tổng quan', href: '/admin/dashboard' },
            { label: 'Hệ thống', href: '/admin/system' },
            { label: 'Thông báo hệ thống' },
          ]}
        />
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-indigo-600" />
              <span>Thông báo hệ thống</span>
              {unreadCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 bg-red-100 text-red-600 rounded-full border border-red-200">
                  {unreadCount} chưa đọc
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Trung tâm tiếp nhận sự kiện học viên, sự cố hệ thống và phát thông báo quản trị.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Đã đọc tất cả</span>
              </button>
            )}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Soạn thông báo</span>
            </button>
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="p-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs disabled:opacity-50"
              title="Làm mới"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin text-indigo-600')} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề hoặc nội dung thông báo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedReadStatus}
              onChange={(e) => {
                setSelectedReadStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {READ_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Lọc
            </button>
            {(search || selectedType !== 'ALL' || selectedReadStatus !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedType('ALL');
                  setSelectedReadStatus('all');
                  setPage(1);
                }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Đặt lại
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={notifications}
          loading={loading}
          keyExtractor={(row) => row.id}
          emptyMessage="Không có thông báo nào phù hợp với bộ lọc."
        />
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={limit}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => {
              setLimit(s);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Modal Soạn Thông Báo Mới */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                <span>Soạn thông báo mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Tiêu đề thông báo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lịch bảo trì cụm máy chủ AI..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Nội dung chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Nhập nội dung đầy đủ của thông báo..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Phân loại</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="INFO">Thông tin (INFO)</option>
                    <option value="WARNING">Cảnh báo (WARNING)</option>
                    <option value="ERROR">Sự cố (ERROR)</option>
                    <option value="SUCCESS">Thành công (SUCCESS)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Đối tượng nhận</label>
                  <select
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ADMIN">Chỉ Ban Quản Trị</option>
                    <option value="STUDENT">Toàn bộ Học viên</option>
                    <option value="ALL">Tất cả người dùng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Đường dẫn liên kết nhanh (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: /admin/users hoặc /admin/content/courses"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Tạo thông báo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xóa Thông Báo */}
      <ConfirmDeleteModal
        isOpen={!!deletingItem}
        title="Xác nhận xóa thông báo"
        itemTitle={deletingItem?.title || ''}
        warningMessage="Hành động này sẽ xóa thông báo vĩnh viễn khỏi hệ thống quản trị."
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingItem(null)}
      />
    </div>
  );
}
