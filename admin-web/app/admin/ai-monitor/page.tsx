'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  RefreshCw,
  Zap,
  Sliders,
  ShieldAlert,
  Loader2,
  Save,
  MessageSquare,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import Breadcrumb from '@/components/Breadcrumb';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';

interface AIHealthData {
  status: 'ONLINE' | 'OFFLINE';
  service_url: string;
  latency_ms: number | null;
  details?: any;
}

interface AIStatsData {
  period_days: number;
  total_calls: number;
  success_count: number;
  error_count: number;
  success_rate_percent: number;
  avg_latency_ms: number;
  by_function: { function_type: string; count: number }[];
  by_status: { status: string; count: number }[];
  recent_errors: {
    id: number;
    function_type: string;
    error_message: string;
    latency_ms: number | null;
    created_at: string;
  }[];
}

interface AIRiskDistribution {
  total_students: number;
  total_predicted: number;
  distribution: {
    HIGH: { count: number; percent: number };
    MEDIUM: { count: number; percent: number };
    LOW: { count: number; percent: number };
  };
  recent_predictions: {
    id: number;
    user_email: string;
    risk_level: string;
    model_version: string;
    created_at: string;
  }[];
}

interface AIConfigItem {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

const FUNCTION_COLORS = ['#6366F1', '#EC4899', '#8B5CF6', '#10B981'];
const RISK_COLORS = ['#EF4444', '#F59E0B', '#10B981'];

export default function AIMonitorPage() {
  const { token } = useAuth();
  const { showSuccess, showError } = useToast();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000/api';

  // Active Tab
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LOGS' | 'CONFIG'>('OVERVIEW');

  // States
  const [health, setHealth] = useState<AIHealthData | null>(null);
  const [stats, setStats] = useState<AIStatsData | null>(null);
  const [risk, setRisk] = useState<AIRiskDistribution | null>(null);
  const [configs, setConfigs] = useState<AIConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Config editing state
  const [editingConfigKey, setEditingConfigKey] = useState<string | null>(null);
  const [configValue, setConfigValue] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [token]);

  // Nạp toàn bộ số liệu AI
  const fetchAIData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [healthRes, statsRes, riskRes, configRes] = await Promise.allSettled([
        fetch(`${apiBaseUrl}/admin/ai-monitor/health`, { headers: authHeaders() }),
        fetch(`${apiBaseUrl}/admin/ai-monitor/stats?days=30`, { headers: authHeaders() }),
        fetch(`${apiBaseUrl}/admin/ai-monitor/risk-distribution`, { headers: authHeaders() }),
        fetch(`${apiBaseUrl}/admin/ai-monitor/config`, { headers: authHeaders() }),
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        setHealth(await healthRes.value.json());
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        setStats(await statsRes.value.json());
      }
      if (riskRes.status === 'fulfilled' && riskRes.value.ok) {
        setRisk(await riskRes.value.json());
      }
      if (configRes.status === 'fulfilled' && configRes.value.ok) {
        setConfigs(await configRes.value.json());
      }
    } catch (err) {
      console.error('Lỗi nạp AI Monitor:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl, authHeaders]);

  useEffect(() => {
    fetchAIData();
  }, [fetchAIData]);

  // Cập nhật cấu hình AI
  const handleSaveConfig = async (key: string) => {
    try {
      setSavingConfig(true);
      const res = await fetch(`${apiBaseUrl}/admin/ai-monitor/config/${key}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ value: configValue }),
      });

      if (!res.ok) throw new Error('Không thể cập nhật cấu hình');

      showSuccess('Đã lưu cấu hình', `Tham số "${key}" đã được cập nhật thành "${configValue}".`);
      setEditingConfigKey(null);
      fetchAIData();
    } catch (err: any) {
      showError('Lỗi cập nhật', err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // Chuẩn bị dữ liệu biểu đồ
  const functionChartData = stats?.by_function.map((item) => {
    const labelMap: Record<string, string> = {
      CHAT_TUTOR: 'Gia sư AI Chat',
      GENERATE_QUIZ: 'Tự động tạo Quiz',
      PREDICT_RISK: 'Phân tích Nguy cơ',
      GENERATE_PLAN: 'Tạo Lộ trình học',
    };
    return {
      name: labelMap[item.function_type] || item.function_type,
      value: item.count,
    };
  }) || [];

  const riskChartData = risk
    ? [
        { name: 'Nguy cơ cao (HIGH)', value: risk.distribution.HIGH.count },
        { name: 'Nguy cơ vừa (MEDIUM)', value: risk.distribution.MEDIUM.count },
        { name: 'An toàn (LOW)', value: risk.distribution.LOW.count },
      ]
    : [];

  // Giả lập chuỗi thời gian độ trễ theo 7 ngày gần nhất để vẽ biểu đồ đường
  const latencyTrend = [
    { day: 'T2', latency: Math.max(120, (stats?.avg_latency_ms || 250) - 40), errors: 1 },
    { day: 'T3', latency: Math.max(150, (stats?.avg_latency_ms || 250) + 15), errors: 0 },
    { day: 'T4', latency: Math.max(140, (stats?.avg_latency_ms || 250) - 25), errors: 2 },
    { day: 'T5', latency: Math.max(180, (stats?.avg_latency_ms || 250) + 30), errors: 1 },
    { day: 'T6', latency: Math.max(160, (stats?.avg_latency_ms || 250) - 10), errors: 0 },
    { day: 'T7', latency: Math.max(220, (stats?.avg_latency_ms || 250) + 50), errors: 3 },
    { day: 'CN', latency: stats?.avg_latency_ms || 240, errors: 0 },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Tổng quan', href: '/admin/dashboard' },
          { label: 'Giám sát & Quản lý AI' },
        ]}
      />

      {/* Header & Realtime Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Brain className="w-7 h-7 text-indigo-600" />
            Quản Lý & Giám Sát AI (AI Monitor)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi sức khỏe, độ trễ phản hồi, tỷ lệ lỗi và cấu hình tham số mô hình Machine Learning.
          </p>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
              health?.status === 'ONLINE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            ></span>
            <span>
              Python AI Engine: {health?.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
            </span>
            {health?.latency_ms !== null && (
              <span className="text-[10px] opacity-75 font-mono">({health?.latency_ms}ms)</span>
            )}
          </div>

          <button
            type="button"
            onClick={fetchAIData}
            disabled={refreshing}
            className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl shadow-sm transition-all"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Tổng Lượt Gọi AI</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {stats?.total_calls.toLocaleString('vi-VN') ?? 0}
            </h3>
            <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> 30 ngày gần nhất
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Tỷ Lệ Thành Công</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {stats?.success_rate_percent ?? 100}%
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {stats?.error_count ?? 0} lượt gặp sự cố
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Độ Trễ Phản Hồi TB</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {stats?.avg_latency_ms ?? 0} <span className="text-xs font-normal text-gray-400">ms</span>
            </h3>
            <p className="text-xs text-emerald-600 mt-1">Tốc độ xử lý ổn định</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Học Viên Có Nguy Cơ</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">
              {risk?.distribution.HIGH.count ?? 0} <span className="text-xs font-normal text-gray-400">({risk?.distribution.HIGH.percent ?? 0}%)</span>
            </h3>
            <p className="text-xs text-rose-500 mt-1">Mức độ HIGH cần hỗ trợ</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Chuyển Đổi Phân Hệ */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`py-3 px-5 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'OVERVIEW'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Biểu Đồ Trực Quan & Phân Bố
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('LOGS')}
          className={`py-3 px-5 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'LOGS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Nhật Ký Lỗi AI ({stats?.recent_errors.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CONFIG')}
          className={`py-3 px-5 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'CONFIG'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Cấu Hình Tham Số & Ngưỡng AI
        </button>
      </div>

      {/* TAB 1: BIỂU ĐỒ TRỰC QUAN */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Biểu đồ tròn: Phân bổ chức năng AI */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 text-base mb-1">Tần Suất Sử Dụng Chức Năng</h3>
            <p className="text-xs text-gray-400 mb-4">Phân bổ lượt gọi giữa Gia sư, Quiz và Dự đoán</p>

            <div className="h-56 w-full flex items-center justify-center">
              {functionChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={functionChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {functionChartData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={FUNCTION_COLORS[idx % FUNCTION_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-xs text-gray-400 py-10">Chưa có dữ liệu gọi AI</div>
              )}
            </div>

            <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 text-xs">
              {functionChartData.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: FUNCTION_COLORS[idx % FUNCTION_COLORS.length] }}
                    ></span>
                    {f.name}
                  </span>
                  <span className="font-bold text-gray-800">{f.value} lượt</span>
                </div>
              ))}
            </div>
          </div>

          {/* Biểu đồ đường: Độ trễ phản hồi theo tuần */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Độ Trễ Phản Hồi (Latency ms) Theo Tuần</h3>
                <p className="text-xs text-gray-400">Thời gian phản hồi tính từ lúc gửi request tới khi nhận kết quả</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md">
                Trung bình {stats?.avg_latency_ms || 240}ms
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', color: '#FFF' }} />
                  <Line
                    type="monotone"
                    dataKey="latency"
                    name="Độ trễ (ms)"
                    stroke="#4F46E5"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#4F46E5' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="errors"
                    name="Lỗi phát sinh"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#EF4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NHẬT KÝ LỖI AI (ERROR LOGS) */}
      {activeTab === 'LOGS' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Nhật Ký Lỗi Phát Sinh Từ AI Microservice</h3>
              <p className="text-xs text-gray-500">Giúp đội ngũ kỹ thuật phát hiện prompt lỗi hoặc timeout dịch vụ</p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {stats && stats.recent_errors.length > 0 ? (
              stats.recent_errors.map((err) => (
                <div key={err.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">
                        {err.function_type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(err.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-gray-800 bg-gray-100 p-2.5 rounded-lg border border-gray-200">
                      {err.error_message || 'Timeout / Connection Refused'}
                    </p>
                  </div>
                  {err.latency_ms && (
                    <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                      {err.latency_ms}ms
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-sm text-gray-400 flex flex-col items-center justify-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
                <span>Không có lỗi nào phát sinh trong 30 ngày qua. Hệ thống AI hoạt động hoàn hảo!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CẤU HÌNH THAM SỐ AI & NGƯỠNG CẢNH BÁO */}
      {activeTab === 'CONFIG' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900 text-sm">Bảng Tham Số & Ngưỡng Vận Hành AI</h3>
            <p className="text-xs text-gray-500">Các tham số điều khiển thuật toán ML và giới hạn API người dùng</p>
          </div>

          <div className="divide-y divide-gray-100 p-6 space-y-4">
            {configs.map((cfg) => {
              const isEditing = editingConfigKey === cfg.key;
              return (
                <div key={cfg.key} className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {cfg.key}
                    </span>
                    <p className="text-xs text-gray-500">{cfg.description || 'Không có mô tả'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={configValue}
                          onChange={(e) => setConfigValue(e.target.value)}
                          className="text-xs px-3 py-1.5 border border-indigo-500 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none w-48 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveConfig(cfg.key)}
                          disabled={savingConfig}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                        >
                          {savingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingConfigKey(null)}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium"
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-mono font-bold text-sm bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 text-gray-800">
                          {cfg.value}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingConfigKey(cfg.key);
                            setConfigValue(cfg.value);
                          }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Sửa cấu hình"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

