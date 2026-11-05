'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSearch,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Eye,
  CheckCircle2,
  XCircle,
  Shield,
  User,
  Clock,
  Layers,
  Globe,
  Monitor,
  X,
  ChevronRight,
  Database,
  ArrowUpDown,
} from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import DataTable, { Column } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import { useToast } from '@/components/Toast';
import { auditLogsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AuditLogItem {
  id: number;
  user_id: number | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
  old_data?: string | null;
  new_data?: string | null;
}

const ACTION_OPTIONS = [
  { value: 'ALL', label: 'Tất cả hành động' },
  { value: 'LOGIN', label: 'Đăng nhập (LOGIN)' },
  { value: 'LOGOUT', label: 'Đăng xuất (LOGOUT)' },
  { value: 'CREATE', label: 'Tạo mới (CREATE)' },
  { value: 'UPDATE', label: 'Cập nhật (UPDATE)' },
  { value: 'DELETE', label: 'Xóa (DELETE)' },
  { value: 'LOCK', label: 'Khóa tài khoản (LOCK)' },
  { value: 'UNLOCK', label: 'Mở khóa (UNLOCK)' },
  { value: 'ROLE_CHANGE', label: 'Đổi vai trò (ROLE_CHANGE)' },
  { value: 'CONFIG_UPDATE', label: 'Cấu hình (CONFIG_UPDATE)' },
  { value: 'BACKUP', label: 'Sao lưu CSDL (BACKUP)' },
  { value: 'PUBLISH', label: 'Phát hành (PUBLISH)' },
];

const ENTITY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả đối tượng' },
  { value: 'Auth', label: 'Xác thực / Phiên đăng nhập' },
  { value: 'User', label: 'Người dùng (User)' },
  { value: 'Course', label: 'Môn học (Course)' },
  { value: 'Topic', label: 'Chủ đề (Topic)' },
  { value: 'TopicSection', label: 'Phần học (Section)' },
  { value: 'Material', label: 'Tài liệu (Material)' },
  { value: 'Quiz', label: 'Bài kiểm tra (Quiz)' },
  { value: 'AIConfig', label: 'Cấu hình AI' },
  { value: 'SystemNotification', label: 'Thông báo hệ thống' },
  { value: 'System', label: 'Hạ tầng hệ thống' },
];

export default function AuditLogsPage() {
  const { showError } = useToast();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log for Details Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (selectedAction !== 'ALL') params.action = selectedAction;
      if (selectedEntity !== 'ALL') params.entity = selectedEntity;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await auditLogsApi.list(params);
      if (res.data?.success || Array.isArray(res.data?.data)) {
        setLogs(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalRecords(res.data.pagination.totalRecords || 0);
        }
      }
    } catch (err: any) {
      console.error('Lỗi tải nhật ký hoạt động:', err);
      showError('Không thể nạp nhật ký hoạt động', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedAction, selectedEntity, startDate, endDate, showError]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedAction('ALL');
    setSelectedEntity('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const renderActionBadge = (action: string) => {
    let colorClasses = 'bg-gray-100 text-gray-700 border-gray-200';
    switch (action) {
      case 'CREATE':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'UPDATE':
      case 'ROLE_CHANGE':
      case 'CONFIG_UPDATE':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'DELETE':
      case 'LOCK':
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      case 'UNLOCK':
        colorClasses = 'bg-teal-50 text-teal-700 border-teal-200';
        break;
      case 'LOGIN':
        colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        break;
      case 'LOGOUT':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'BACKUP':
        colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
        break;
    }
    return (
      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold border', colorClasses)}>
        {action}
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'SUCCESS') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Thành công</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-rose-600 font-medium text-xs">
        <XCircle className="w-3.5 h-3.5" />
        <span>Thất bại</span>
      </span>
    );
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'created_at',
      header: 'Thời gian',
      render: (row) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-700 font-medium">{formatDateTime(row.created_at)}</span>
        </div>
      ),
      className: 'w-44',
    },
    {
      key: 'user_email',
      header: 'Người thực hiện',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 text-xs truncate max-w-[200px]" title={row.user_email || 'Hệ thống'}>
            {row.user_email || 'Hệ thống'}
          </span>
          {row.user_role && (
            <span className="text-[10px] text-gray-500 font-medium">{row.user_role}</span>
          )}
        </div>
      ),
      className: 'w-48',
    },
    {
      key: 'action',
      header: 'Hành động',
      render: (row) => renderActionBadge(row.action),
      className: 'w-36',
    },
    {
      key: 'entity',
      header: 'Đối tượng',
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-gray-800 font-medium">
          <Layers className="w-3.5 h-3.5 text-gray-400" />
          <span>{row.entity}</span>
          {row.entity_id && (
            <span className="text-gray-400 text-[11px] font-mono">#{row.entity_id}</span>
          )}
        </div>
      ),
      className: 'w-40',
    },
    {
      key: 'description',
      header: 'Nội dung mô tả',
      render: (row) => (
        <p className="text-xs text-gray-700 line-clamp-2 max-w-md" title={row.description}>
          {row.description}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'IP & Trạng thái',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-mono text-gray-500">{row.ip_address || '127.0.0.1'}</span>
          {renderStatusBadge(row.status)}
        </div>
      ),
      className: 'w-32',
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedLog(row)}
          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
          title="Xem chi tiết snapshot dữ liệu"
        >
          <Eye className="w-4 h-4" />
          <span>Chi tiết</span>
        </button>
      ),
      className: 'w-24 text-right',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <Breadcrumb
          items={[
            { label: 'Tổng quan', href: '/admin/dashboard' },
            { label: 'Hệ thống', href: '/admin/system' },
            { label: 'Nhật ký hoạt động' },
          ]}
        />
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileSearch className="w-6 h-6 text-indigo-600" />
              <span>Nhật ký hoạt động hệ thống</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Theo dõi và kiểm toán toàn bộ thay đổi dữ liệu, hành vi đăng nhập và vận hành quản trị.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin text-indigo-600')} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Ô tìm kiếm */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tìm theo email, nội dung hoặc IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Lọc hành động */}
          <div className="md:col-span-3">
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc đối tượng */}
          <div className="md:col-span-3">
            <select
              value={selectedEntity}
              onChange={(e) => {
                setSelectedEntity(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nút lọc */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Lọc
            </button>
            {(search || selectedAction !== 'ALL' || selectedEntity !== 'ALL' || startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
                title="Xóa bộ lọc"
              >
                Đặt lại
              </button>
            )}
          </div>
        </form>

        {/* Lọc ngày tháng */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
          <span className="flex items-center gap-1 font-semibold text-gray-700">
            <Calendar className="w-3.5 h-3.5" />
            <span>Khoảng thời gian:</span>
          </span>
          <div className="flex items-center gap-2">
            <span>Từ ngày</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>Đến ngày</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <span className="ml-auto text-gray-400">
            Tìm thấy <strong className="text-gray-700">{totalRecords}</strong> bản ghi
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          keyExtractor={(row) => row.id}
          emptyMessage="Không tìm thấy nhật ký hoạt động nào phù hợp với bộ lọc."
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

      {/* Modal Chi Tiết Nhật Ký */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 text-base">
                  Chi tiết nhật ký hoạt động #{selectedLog.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Thông tin chung */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                <div>
                  <span className="text-gray-500 block mb-0.5">Người thực hiện</span>
                  <strong className="text-gray-800 break-all">{selectedLog.user_email || 'Hệ thống'}</strong>
                  <span className="text-gray-400 block mt-0.5">{selectedLog.user_role || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Hành động</span>
                  <div>{renderActionBadge(selectedLog.action)}</div>
                  <span className="text-gray-500 block mt-1">Đối tượng: <strong>{selectedLog.entity}</strong></span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Thời gian</span>
                  <span className="text-gray-800 font-medium">{formatDateTime(selectedLog.created_at)}</span>
                  <div className="mt-1">{renderStatusBadge(selectedLog.status)}</div>
                </div>
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-gray-200/60">
                  <span className="text-gray-500 block mb-0.5">Địa chỉ IP & Trình duyệt</span>
                  <span className="font-mono text-gray-700 mr-2">{selectedLog.ip_address || '127.0.0.1'}</span>
                  <span className="text-gray-400 font-mono text-[11px] break-all">{selectedLog.user_agent || 'Unknown Agent'}</span>
                </div>
              </div>

              {/* Mô tả */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Mô tả hành vi:</label>
                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-950 leading-relaxed font-medium">
                  {selectedLog.description}
                </div>
              </div>

              {/* Snapshot Dữ liệu (Old Data / New Data) */}
              <div className="space-y-4">
                {selectedLog.old_data && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Dữ liệu trước khi sửa (Old Snapshot):
                    </label>
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.old_data), null, 2);
                        } catch {
                          return selectedLog.old_data;
                        }
                      })()}
                    </pre>
                  </div>
                )}

                {selectedLog.new_data && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Dữ liệu sau khi thay đổi (New Snapshot):
                    </label>
                    <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.new_data), null, 2);
                        } catch {
                          return selectedLog.new_data;
                        }
                      })()}
                    </pre>
                  </div>
                )}

                {!selectedLog.old_data && !selectedLog.new_data && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs text-gray-400">
                    Bản ghi này không có dữ liệu thay đổi cấu trúc đính kèm.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-medium transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
