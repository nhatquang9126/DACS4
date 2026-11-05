import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  FileText,
  HelpCircle,
  Users,
  LogOut,
  Shield,
  Activity,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import CoursesPage from './pages/CoursesPage';
import TopicsPage from './pages/TopicsPage';
import MaterialsPage from './pages/MaterialsPage';
import UsersPage from './pages/UsersPage';
import QuizzesPage from './pages/QuizzesPage';
import { ToastProvider } from './components/Toast';


export type AdminTab = 'OVERVIEW' | 'COURSES' | 'TOPICS' | 'MATERIALS' | 'QUIZZES' | 'USERS';

interface AnalyticsData {
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

interface AdminDashboardProps {
  apiBaseUrl?: string;
  authToken?: string;
  currentUser?: {
    id: number;
    email: string;
    role: string;
  };
  onLogout?: () => void;
}

export default function AdminDashboard({
  apiBaseUrl = 'http://localhost:3000/api',
  authToken,
  currentUser = { id: 1, email: 'admin@gmail.com', role: 'ADMIN' },
  onLogout,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Cascading Context Filters
  const [contextCourseId, setContextCourseId] = useState<number | null>(null);
  const [contextTopicId, setContextTopicId] = useState<number | null>(null);

  // Đồng bộ hash URL để hỗ trợ reload trang không mất tab
  useEffect(() => {
    const hash = window.location.hash.replace('#', '').toUpperCase() as AdminTab;
    if (['OVERVIEW', 'COURSES', 'TOPICS', 'MATERIALS', 'QUIZZES', 'USERS'].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    window.location.hash = tab.toLowerCase();
  };

  // Fetch Analytics cho trang Overview
  useEffect(() => {
    if (activeTab === 'OVERVIEW') {
      const fetchAnalytics = async () => {
        try {
          setLoadingAnalytics(true);
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

          const res = await fetch(`${apiBaseUrl}/admin/analytics`, { headers });
          if (res.ok) {
            const data = await res.json();
            setAnalytics(data);
          }
        } catch (err) {
          console.error('Lỗi lấy thống kê tổng quan:', err);
        } finally {
          setLoadingAnalytics(false);
        }
      };

      fetchAnalytics();
    }
  }, [activeTab, apiBaseUrl, authToken]);

  // Điều hướng phân cấp Course -> Topics
  const handleNavigateToTopics = (courseId: number) => {
    setContextCourseId(courseId);
    handleTabChange('TOPICS');
  };

  // Quick Action từ Topics -> Materials
  const handleQuickAddMaterial = (courseId: number, topicId: number) => {
    setContextCourseId(courseId);
    setContextTopicId(topicId);
    handleTabChange('MATERIALS');
  };

  // Quick Action từ Topics -> Quizzes
  const handleQuickAddQuiz = (courseId: number, topicId: number) => {
    setContextCourseId(courseId);
    setContextTopicId(topicId);
    handleTabChange('QUIZZES');
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-gray-900 tracking-tight">
                  SmartStudy
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  ADMIN 2.0
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">Bảng điều khiển Quản trị Trung tâm</p>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2.5 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <Shield className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="font-semibold text-gray-800 block">{currentUser.email}</span>
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                  {currentUser.role}
                </span>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Đăng xuất"
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
          <nav className="bg-white rounded-2xl border border-gray-200 p-3 shadow-sm space-y-1">
            <button
              type="button"
              onClick={() => handleTabChange('OVERVIEW')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === 'OVERVIEW'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <LayoutDashboard className="w-4 h-4" />
                <span>Tổng quan</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${activeTab === 'OVERVIEW' ? 'opacity-80' : 'opacity-30'}`} />
            </button>

            <div className="pt-2 pb-1 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Cây Đào Tạo & Nội Dung
            </div>

            <button
              type="button"
              onClick={() => handleTabChange('COURSES')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === 'COURSES'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="w-4 h-4" />
                <span>Môn học (Courses)</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${activeTab === 'COURSES' ? 'opacity-80' : 'opacity-30'}`} />
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('TOPICS')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === 'TOPICS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Layers className="w-4 h-4" />
                <span>Chủ đề (Topics)</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${activeTab === 'TOPICS' ? 'opacity-80' : 'opacity-30'}`} />
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('MATERIALS')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === 'MATERIALS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-4 h-4" />
                <span>Tài liệu (Materials)</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${activeTab === 'MATERIALS' ? 'opacity-80' : 'opacity-30'}`} />
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('QUIZZES')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === 'QUIZZES'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <HelpCircle className="w-4 h-4" />
                <span>Bài Quiz & Câu hỏi</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${activeTab === 'QUIZZES' ? 'opacity-80' : 'opacity-30'}`} />
            </button>

            <div className="pt-2 pb-1 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Người Dùng & Phân Quyền
            </div>

            <button
              type="button"
              onClick={() => handleTabChange('USERS')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === 'USERS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4" />
                <span>Người dùng & Học viên</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${activeTab === 'USERS' ? 'opacity-80' : 'opacity-30'}`} />
            </button>
          </nav>

          {/* Hierarchical Quick Info Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-4 text-xs space-y-2">
            <div className="flex items-center space-x-1.5 font-bold text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Cấu trúc Dữ liệu Phân Cấp</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Môn học (Course) ➔ Chủ đề (Topic) ➔ Bài học & Bài kiểm tra (Material / Quiz).
            </p>
            <div className="pt-2 border-t border-indigo-200/60 font-medium text-indigo-700">
              ✓ Ràng buộc toàn vẹn khi Xóa (Cascade Deletion Safety)
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Welcome Banner */}
              <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-2xl shadow-sm">
                <h2 className="text-xl font-extrabold">Chào mừng Quản trị viên SmartStudy AI</h2>
                <p className="text-xs text-indigo-100 mt-1 max-w-xl">
                  Theo dõi hoạt động học tập toàn diện, phát hiện sớm học viên có nguy cơ bỏ cuộc bằng AI và quản lý nội dung số chất lượng cao.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-xs font-semibold uppercase">Tổng Học viên</span>
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    {analytics?.total_students ?? '—'}
                  </div>
                  <p className="text-[11px] text-gray-400">Tài khoản sinh viên đăng ký</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-xs font-semibold uppercase">Môn học & Chủ đề</span>
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    {analytics ? `${analytics.total_courses} / ${analytics.total_topics}` : '—'}
                  </div>
                  <p className="text-[11px] text-gray-400">Môn học / Chủ đề bài học</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-xs font-semibold uppercase">Tài liệu học tập</span>
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    {analytics?.total_materials ?? '—'}
                  </div>
                  <p className="text-[11px] text-gray-400">Bài đọc, Video & Code snippet</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-xs font-semibold uppercase">Lượt làm bài Quiz</span>
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    {analytics?.total_quiz_attempts ?? '—'}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Từ {analytics?.total_quizzes ?? 0} đề ({analytics?.total_questions ?? 0} câu)
                  </p>
                </div>
              </div>

              {/* AI Risk Distribution Overview */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base flex items-center space-x-2">
                      <Activity className="w-5 h-5 text-rose-600" />
                      <span>Phân bố Nguy cơ Học tập từ Mô hình AI</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Đánh giá dựa trên tiến độ bài tập, điểm số trắc nghiệm và thời gian học thực tế
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabChange('USERS')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Xem chi tiết học viên →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-rose-700 font-bold text-xs uppercase">
                      <span>Nguy cơ Cao (High Risk)</span>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-3xl font-black text-rose-700">
                      {analytics?.risk_distribution.HIGH ?? 0}
                    </div>
                    <p className="text-[11px] text-rose-600">Cần trợ giảng hoặc AI Tutor can thiệp ngay</p>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-amber-700 font-bold text-xs uppercase">
                      <span>Trung bình (Medium)</span>
                      <Activity className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-3xl font-black text-amber-700">
                      {analytics?.risk_distribution.MEDIUM ?? 0}
                    </div>
                    <p className="text-[11px] text-amber-600">Đang có dấu hiệu chậm tiến độ học</p>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-emerald-700 font-bold text-xs uppercase">
                      <span>An toàn (Low Risk)</span>
                      <Shield className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-3xl font-black text-emerald-700">
                      {analytics?.risk_distribution.LOW ?? 0}
                    </div>
                    <p className="text-[11px] text-emerald-600">Tiến độ và phong độ học tập tốt</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'COURSES' && (
            <CoursesPage
              apiBaseUrl={apiBaseUrl}
              authToken={authToken}
              onNavigateToTopics={handleNavigateToTopics}
            />
          )}

          {activeTab === 'TOPICS' && (
            <TopicsPage
              apiBaseUrl={apiBaseUrl}
              authToken={authToken}
              initialCourseId={contextCourseId}
              onNavigateToCourses={() => handleTabChange('COURSES')}
              onQuickAddMaterial={handleQuickAddMaterial}
              onQuickAddQuiz={handleQuickAddQuiz}
            />
          )}

          {activeTab === 'MATERIALS' && (
            <MaterialsPage
              apiBaseUrl={apiBaseUrl}
              authToken={authToken}
              initialCourseId={contextCourseId}
              initialTopicId={contextTopicId}
              onNavigateToCourses={() => handleTabChange('COURSES')}
              onNavigateToTopics={(cId) => {
                if (cId) setContextCourseId(cId);
                handleTabChange('TOPICS');
              }}
            />
          )}

          {activeTab === 'QUIZZES' && (
            <QuizzesPage
              apiBaseUrl={apiBaseUrl}
              authToken={authToken}
              initialCourseId={contextCourseId}
              initialTopicId={contextTopicId}
              onNavigateToCourses={() => handleTabChange('COURSES')}
              onNavigateToTopics={(cId) => {
                if (cId) setContextCourseId(cId);
                handleTabChange('TOPICS');
              }}
            />
          )}

          {activeTab === 'USERS' && (
            <UsersPage
              apiBaseUrl={apiBaseUrl}
              authToken={authToken}
              currentUserId={currentUser.id}
            />
          )}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}

