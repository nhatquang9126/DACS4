'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Database,
  Cpu,
  Activity,
  Download,
  Bell,
  FileSearch,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  Loader2,
  Clock,
  Shield,
  Layers,
  User,
} from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import Breadcrumb from '@/components/Breadcrumb';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';

interface SystemHealthData {
  timestamp: string;
  overall_status: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
  backend: {
    status: string;
    uptime_seconds: number;
    uptime_formatted: string;
    memory: {
      rss_mb: number;
      heap_used_mb: number;
      heap_total_mb: number;
    };
    cpu_cores: number;
    platform: string;
    node_version: string;
  };
  database: {
    status: string;
    latency_ms: number;
    counts: {
      users: number;
      courses: number;
      materials: number;
      predictions: number;
    };
  };
  ai_service: {
    status: string;
    url: string;
    latency_ms: number | null;
    details?: any;
  };
}

interface AuditLogItem {
  id: number;
  user_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  description: string;
  ip_address: string | null;
  created_at: string;
}

interface NotificationItem {
  id: number;
  title: string;
  content: string;
  type: 'INFO' | 'WARNING' | 'MAINTENANCE' | 'SUCCESS';
  target: 'ALL' | 'STUDENT' | 'ADMIN';
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export default function SystemManagementPage() {
  const { token, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000/api';

  // Active Tab
  const [activeTab, setActiveTab] = useState<'HEALTH' | 'AUDIT' | 'NOTIFICATIONS'>('HEALTH');

  // Health States
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [backingUp, setBackingUp] = useState(false);

  // Audit Log States
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(10);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotalRecords, setAuditTotalRecords] = useState(0);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [notifType, setNotifType] = useState<'INFO' | 'WARNING' | 'MAINTENANCE'>('INFO');
  const [notifTarget, setNotifTarget] = useState<'ALL' | 'STUDENT' | 'ADMIN'>('ALL');
  const [submittingNotif, setSubmittingNotif] = useState(false);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [token]);

  // 1. Nạp System Health
  const fetchHealth = useCallback(async () => {
    try {
      setLoadingHealth(true);
      const res = await fetch(`${apiBaseUrl}/admin/system/health`, { headers: authHeaders() });
      if (res.ok) {
        setHealth(await res.json());
      }
    } catch (err) {
      console.error('Lỗi nạp system health:', err);
    } finally {
      setLoadingHealth(false);
    }
  }, [apiBaseUrl, authHeaders]);

  // 2. Nạp Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const params = new URLSearchParams({
        page: auditPage.toString(),
        limit: auditLimit.toString(),
      });
      if (auditSearch.trim()) params.append('search', auditSearch.trim());
      if (auditActionFilter) params.append('action', auditActionFilter);

      const res = await fetch(`${apiBaseUrl}/admin/audit-logs?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.data || []);
        setAuditTotalPages(data.pagination?.totalPages || 1);
        setAuditTotalRecords(data.pagination?.totalRecords || 0);
      }
    } catch (err) {
      console.error('Lỗi nạp audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, [apiBaseUrl, authHeaders, auditPage, auditLimit, auditSearch, auditActionFilter]);

  // 3. Nạp Notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoadingNotifs(true);
      const res = await fetch(`${apiBaseUrl}/admin/notifications`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch (err) {
      console.error('Lỗi nạp notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  }, [apiBaseUrl, authHeaders]);

  useEffect(() => {
    if (activeTab === 'HEALTH') fetchHealth();
    if (activeTab === 'AUDIT') fetchAuditLogs();
    if (activeTab === 'NOTIFICATIONS') fetchNotifications();
  }, [activeTab, fetchHealth, fetchAuditLogs, fetchNotifications]);

  // Trigger Backup & Download JSON Dump
  const handleTriggerBackup = async () => {
    try {
      setBackingUp(true);
      const res = await fetch(`${apiBaseUrl}/admin/system/backup`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Không thể tạo bản sao lưu');

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartstudy-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess('Tạo bản sao lưu thành công', 'File dữ liệu JSON đã được tải về máy của bạn.');
    } catch (err: any) {
      showError('Lỗi sao lưu', err.message);
    } finally {
      setBackingUp(false);
    }
  };

  // Tạo thông báo mới
  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifContent.trim()) {
      showError('Thiếu dữ liệu', 'Tiêu đề và nội dung thông báo là bắt buộc');
      return;
    }

    try {
      setSubmittingNotif(true);
      const res = await fetch(`${apiBaseUrl}/admin/notifications`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: notifTitle.trim(),
          content: notifContent.trim(),
          type: notifType,
          target: notifTarget,
        }),
      });

      if (!res.ok) throw new Error('Lỗi gửi thông báo');

      showSuccess('Đã tạo thông báo', 'Thông báo hệ thống đã được ghi nhận.');
      setNotifTitle('');
      setNotifContent('');
      fetchNotifications();
    } catch (err: any) {
      showError('Lỗi tạo thông báo', err.message);
    } finally {
      setSubmittingNotif(false);
    }
  };

  // Phát hành thông báo
  const handlePublishNotification = async (id: number) => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/notifications/${id}/publish`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        showSuccess('Đã phát hành', 'Thông báo đã được gửi tới sinh viên.');
        fetchNotifications();
      }
    } catch (err: any) {
      showError('Lỗi', err.message);
    }
  };

  // Xóa thông báo
  const handleDeleteNotification = async (id: number) => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        showSuccess('Đã xóa', 'Thông báo đã được gỡ bỏ.');
        fetchNotifications();
      }
    } catch (err: any) {
      showError('Lỗi', err.message);
    }
  };

  // Cấu hình bảng Audit Log
  const auditColumns: Column<AuditLogItem>[] = [
    {
      key: 'created_at',
      header: 'Thời gian',
      width: '160px',
      render: (item) => (
        <span className="text-xs text-gray-500 font-mono">
          {new Date(item.created_at).toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      key: 'user_email',
      header: 'Người thực hiện',
      render: (item) => (
        <span className="font-semibold text-gray-900 text-xs">
          {item.user_email || 'System / Auto'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Hành động',
      width: '120px',
      render: (item) => {
        const color = item.action.includes('DELETE')
          ? 'bg-rose-100 text-rose-700'
          : item.action.includes('CREATE')
          ? 'bg-emerald-100 text-emerald-700'
          : item.action.includes('LOCK')
          ? 'bg-amber-100 text-amber-700'
          : 'bg-indigo-100 text-indigo-700';
        return <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${color}`}>{item.action}</span>;
      },
    },
    {
      key: 'entity',
      header: 'Thực thể',
      width: '110px',
      render: (item) => (
        <span className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
          {item.entity} {item.entity_id ? `#${item.entity_id}` : ''}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Chi tiết thao tác',
      render: (item) => <span className="text-xs text-gray-700">{item.description}</span>,
    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Tổng quan', href: '/admin/dashboard' },
          { label: 'Quản trị Hệ thống' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Server className="w-7 h-7 text-indigo-600" />
            Quản Trị Hệ Thống & Hạ Tầng
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Giám sát tài nguyên máy chủ, lịch sử Audit Log và quản lý phát hành thông báo toàn trường.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTriggerBackup}
          disabled={backingUp}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
        >
          {backingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>{backingUp ? 'Đang xuất dữ liệu...' : 'Sao Lưu CSDL (Export JSON)'}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('HEALTH')}
          className={`py-3 px-5 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'HEALTH'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Trạng Thái Hạ Tầng (System Health)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('AUDIT')}
          className={`py-3 px-5 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'AUDIT'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Nhật Ký Thao Tác (Audit Log)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('NOTIFICATIONS')}
          className={`py-3 px-5 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'NOTIFICATIONS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Thông Báo Hệ Thống
        </button>
      </div>

      {/* TAB 1: SYSTEM HEALTH DASHBOARD */}
      {activeTab === 'HEALTH' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Node.js Backend Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Server className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  HEALTHY
                </span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Node.js Express Server</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Node {health?.backend.node_version} &bull; {health?.backend.platform}
                </p>
              </div>
              <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Thời gian chạy (Uptime):</span>
                  <span className="font-mono font-bold text-gray-800">{health?.backend.uptime_formatted || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bộ nhớ Heap sử dụng:</span>
                  <span className="font-mono font-bold text-gray-800">{health?.backend.memory.heap_used_mb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bộ nhớ RSS:</span>
                  <span className="font-mono font-bold text-gray-800">{health?.backend.memory.rss_mb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Số CPU Cores:</span>
                  <span className="font-mono font-bold text-gray-800">{health?.backend.cpu_cores} Cores</span>
                </div>
              </div>
            </div>

            {/* 2. Database Server Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Database className="w-6 h-6" />
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    health?.database.status === 'CONNECTED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      health?.database.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  ></span>
                  {health?.database.status || 'CONNECTED'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Relational Database</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Độ trễ Ping: {health?.database.latency_ms}ms
                </p>
              </div>
              <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tổng tài khoản (Users):</span>
                  <span className="font-mono font-bold text-gray-800">{health?.database.counts.users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tổng khóa học (Courses):</span>
                  <span className="font-mono font-bold text-gray-800">{health?.database.counts.courses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tổng bài học (Materials):</span>
                  <span className="font-mono font-bold text-gray-800">{health?.database.counts.materials}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lượt dự báo ML (Predictions):</span>
                  <span className="font-mono font-bold text-gray-800">{health?.database.counts.predictions}</span>
                </div>
              </div>
            </div>

            {/* 3. Python AI Engine Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Cpu className="w-6 h-6" />
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    health?.ai_service.status === 'ONLINE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      health?.ai_service.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  ></span>
                  {health?.ai_service.status || 'OFFLINE'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Python FastAPI AI Engine</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {health?.ai_service.url || 'http://localhost:8000'}
                </p>
              </div>
              <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Độ trễ phản hồi (ms):</span>
                  <span className="font-mono font-bold text-gray-800">
                    {health?.ai_service.latency_ms !== null ? `${health?.ai_service.latency_ms}ms` : 'Không xác định'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mô hình Random Forest:</span>
                  <span className="font-mono font-bold text-emerald-600">Sẵn sàng (Trained)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">LLM Chat Model:</span>
                  <span className="font-mono font-bold text-gray-800">Groq / OpenAI API</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-72">
              <SearchBar
                value={auditSearch}
                onChange={(val) => {
                  setAuditSearch(val);
                  setAuditPage(1);
                }}
                placeholder="Tìm theo email, thực thể, ghi chú..."
              />
            </div>

            <select
              value={auditActionFilter}
              onChange={(e) => {
                setAuditActionFilter(e.target.value);
                setAuditPage(1);
              }}
              className="text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">-- Tất cả hành động --</option>
              <option value="CREATE">CREATE (Tạo mới)</option>
              <option value="UPDATE">UPDATE (Cập nhật)</option>
              <option value="DELETE">DELETE (Xóa)</option>
              <option value="LOCK">LOCK (Khóa)</option>
            </select>
          </div>

          <DataTable
            columns={auditColumns}
            data={auditLogs}
            loading={loadingAudit}
            emptyMessage="Chưa có nhật ký hoạt động nào được ghi nhận."
            keyExtractor={(item) => item.id}
          />

          <Pagination
            currentPage={auditPage}
            totalPages={auditTotalPages}
            totalRecords={auditTotalRecords}
            pageSize={auditLimit}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={(p) => setAuditPage(p)}
            onPageSizeChange={(sz) => {
              setAuditLimit(sz);
              setAuditPage(1);
            }}
          />
        </div>
      )}

      {/* TAB 3: SYSTEM NOTIFICATIONS */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Soạn thảo Thông báo */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              Soạn Thông Báo Hệ Thống
            </h3>
            <p className="text-xs text-gray-500">Phát tin tức hoặc cảnh báo bảo trì tới ứng dụng học viên</p>

            <form onSubmit={handleCreateNotification} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tiêu đề</label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="VD: Bảo trì hệ thống SmartStudy AI..."
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Loại thông báo</label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value as any)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="INFO">Tin tức chung (INFO)</option>
                  <option value="WARNING">Cảnh báo quan trọng (WARNING)</option>
                  <option value="MAINTENANCE">Thông báo bảo trì (MAINTENANCE)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Đối tượng nhận</label>
                <select
                  value={notifTarget}
                  onChange={(e) => setNotifTarget(e.target.value as any)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="ALL">Tất cả người dùng (ALL)</option>
                  <option value="STUDENT">Toàn bộ sinh viên (STUDENT)</option>
                  <option value="ADMIN">Chỉ Quản trị viên (ADMIN)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nội dung chi tiết</label>
                <textarea
                  rows={4}
                  required
                  value={notifContent}
                  onChange={(e) => setNotifContent(e.target.value)}
                  placeholder="Nhập nội dung thông báo gửi tới người dùng..."
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingNotif}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {submittingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Gửi Thông Báo Hệ Thống</span>
              </button>
            </form>
          </div>

          {/* Danh sách Thông báo đã tạo */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Danh Sách Thông Báo Đã Tạo ({notifications.length})</h3>

            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">{n.title}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            n.type === 'MAINTENANCE'
                              ? 'bg-rose-100 text-rose-700'
                              : n.type === 'WARNING'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {n.type}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">Gửi tới: {n.target}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{n.content}</p>
                      <p className="text-[11px] text-gray-400">
                        Tạo lúc: {new Date(n.created_at).toLocaleString('vi-VN')} {n.created_by ? `bởi ${n.created_by}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!n.is_published ? (
                        <button
                          type="button"
                          onClick={() => handlePublishNotification(n.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          Phát hành
                        </button>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg">
                          Đã phát hành
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteNotification(n.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa thông báo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-gray-400">Chưa có thông báo nào được tạo.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

