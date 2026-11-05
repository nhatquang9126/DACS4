'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Layers,
  FileText,
  HelpCircle,
  Clock,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '@/lib/api';

interface AnalyticsStats {
  total_students: number;
  total_users: number;
  total_courses: number;
  total_topics: number;
  total_materials: number;
  total_quizzes: number;
  total_questions: number;
  total_quiz_attempts: number;
  risk_distribution: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

const RISK_COLORS = ['#EF4444', '#F59E0B', '#10B981'];

export default function DashboardPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Mocked/Calculated weekly study trend
  const weeklyData = [
    { name: 'T2', hours: 14.5, quizzes: 32 },
    { name: 'T3', hours: 22.0, quizzes: 45 },
    { name: 'T4', hours: 18.2, quizzes: 39 },
    { name: 'T5', hours: 27.8, quizzes: 58 },
    { name: 'T6', hours: 24.1, quizzes: 51 },
    { name: 'T7', hours: 35.6, quizzes: 82 },
    { name: 'CN', hours: 41.2, quizzes: 95 },
  ];

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/admin/analytics');
        setStats(res.data);
      } catch (err) {
        console.error('Lỗi tải analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const riskData = stats
    ? [
        { name: 'Nguy cơ cao (HIGH)', value: stats.risk_distribution.HIGH },
        { name: 'Nguy cơ vừa (MEDIUM)', value: stats.risk_distribution.MEDIUM },
        { name: 'An toàn (LOW)', value: stats.risk_distribution.LOW },
      ]
    : [];

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Tổng Quan Hệ Thống</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bảng điều khiển giám sát và số liệu học tập thời gian thực SmartStudy AI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Hệ thống ổn định
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Tổng Học Viên</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_students ?? '—'}</h3>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> +12% so với tháng trước
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Môn Học & Chủ Đề</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {stats?.total_courses ?? 0} <span className="text-sm font-normal text-gray-400">/ {stats?.total_topics ?? 0} chủ đề</span>
            </h3>
            <p className="text-xs text-indigo-600 mt-1">Đầy đủ cấu trúc phân cấp</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Tài Liệu Học Tập</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_materials ?? '—'}</h3>
            <p className="text-xs text-gray-400 mt-1">Markdown, Video, Đính kèm</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Lượt Làm Bài Quiz</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_quiz_attempts ?? '—'}</h3>
            <p className="text-xs text-purple-600 mt-1">Ngân hàng: {stats?.total_questions ?? 0} câu hỏi</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <HelpCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Area Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">Hoạt Động Học Tập 7 Ngày Qua</h2>
              <p className="text-xs text-gray-500">Tổng số giờ học và lượt làm bài trắc nghiệm</p>
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-medium">
              Thời gian thực
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', color: '#FFF' }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  name="Giờ học (h)"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHours)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-gray-900">Phân Bố Nguy Cơ Học Tập (AI)</h2>
            <p className="text-xs text-gray-500">Mô hình Random Forest & XGBoost phân loại</p>
          </div>
          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Nguy cơ cao (HIGH)
              </span>
              <span className="font-bold text-red-600">{stats?.risk_distribution.HIGH ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Nguy cơ vừa (MEDIUM)
              </span>
              <span className="font-bold text-amber-600">{stats?.risk_distribution.MEDIUM ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> An toàn (LOW)
              </span>
              <span className="font-bold text-emerald-600">{stats?.risk_distribution.LOW ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

