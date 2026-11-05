import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Layers,
  Users,
  Award,
  AlertCircle,
  ExternalLink,
  Loader2,
  Check,
} from 'lucide-react';
import DataTable, { Column } from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import ConfirmDeleteModal, { CascadeDetail } from '../components/ConfirmDeleteModal';
import Breadcrumb from '../components/Breadcrumb';
import { useToast } from '../components/Toast';


export interface CourseItem {
  id: number;
  code: string;
  name: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  credits: number;
  topics_count: number;
  enrollments_count: number;
}

interface CoursesPageProps {
  apiBaseUrl?: string;
  authToken?: string;
  onNavigateToTopics?: (courseId: number, courseName: string) => void;
}

export default function CoursesPage({
  apiBaseUrl = '/api',
  authToken,
  onNavigateToTopics,
}: CoursesPageProps) {
  const { showSuccess, showError } = useToast();

  // Data States
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');

  // Modal Thêm / Sửa
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
  const [formCredits, setFormCredits] = useState('3');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Modal Xóa an toàn kèm Cascade Warning
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState<CourseItem | null>(null);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const [cascadeWarning, setCascadeWarning] = useState('');
  const [cascadeDetails, setCascadeDetails] = useState<CascadeDetail[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Headers helper
  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  }, [authToken]);

  // Fetch Danh sách Courses
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.append('search', search.trim());
      if (difficultyFilter !== 'ALL') params.append('difficulty', difficultyFilter);

      const res = await fetch(`${apiBaseUrl}/admin/courses?${params.toString()}`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Lỗi máy chủ: ${res.status}`);
      }

      const json = await res.json();
      setCourses(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalRecords(json.pagination?.totalRecords || 0);
    } catch (err: any) {
      console.error('Lỗi tải danh sách môn học:', err);
      setError(err.message || 'Không thể tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, page, limit, search, difficultyFilter]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setEditingCourse(null);
    setFormCode('');
    setFormName('');
    setFormDifficulty('BEGINNER');
    setFormCredits('3');
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (course: CourseItem) => {
    setEditingCourse(course);
    setFormCode(course.code);
    setFormName(course.name);
    setFormDifficulty(course.difficulty);
    setFormCredits(course.credits ? course.credits.toString() : '3');
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Lưu Môn học (POST hoặc PUT)
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      setFormError('Mã môn học và tên môn học không được để trống');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      const bodyData = {
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        difficulty: formDifficulty,
        credits: parseInt(formCredits, 10) || 3,
      };

      const url = editingCourse
        ? `${apiBaseUrl}/admin/courses/${editingCourse.id}`
        : `${apiBaseUrl}/admin/courses`;
      const method = editingCourse ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `Lỗi lưu môn học: ${res.status}`);
      }

      setIsEditModalOpen(false);
      showSuccess(
        editingCourse ? 'Cập nhật thành công' : 'Tạo môn học thành công',
        `Môn học "${bodyData.name}" (${bodyData.code}) đã được lưu vào hệ thống.`
      );
      fetchCourses();
    } catch (err: any) {
      setFormError(err.message || 'Có lỗi xảy ra khi lưu môn học');
      showError('Lưu môn học thất bại', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mở modal xóa: Fetch cascade impact trước
  const handleOpenDeleteModal = async (course: CourseItem) => {
    setDeletingCourse(course);
    setDeleteModalOpen(true);
    setCascadeWarning('');
    setCascadeDetails([]);

    try {
      setCascadeLoading(true);
      const res = await fetch(`${apiBaseUrl}/admin/courses/${course.id}/cascade-info`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const info = await res.json();
        setCascadeWarning(info.warning_message);
        setCascadeDetails([
          { label: 'Chủ đề bài học', count: info.topics_count },
          { label: 'Tài liệu học tập', count: info.materials_count },
          { label: 'Bài kiểm tra', count: info.quizzes_count },
          { label: 'Câu hỏi trắc nghiệm', count: info.questions_count },
          { label: 'Sinh viên ghi danh', count: info.enrollments_count },
        ]);
      }
    } catch (err) {
      console.error('Lỗi lấy cascade info môn học:', err);
    } finally {
      setCascadeLoading(false);
    }
  };

  // Xác nhận Xóa Course
  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`${apiBaseUrl}/admin/courses/${deletingCourse.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Xóa môn học không thành công');
      }

      setDeleteModalOpen(false);
      showSuccess(
        'Đã xóa môn học',
        `Môn học "${deletingCourse.name}" và toàn bộ dữ liệu liên quan đã được xóa vĩnh viễn.`
      );
      setDeletingCourse(null);
      fetchCourses();
    } catch (err: any) {
      showError('Xóa môn học thất bại', err.message || 'Lỗi khi xóa môn học');
    } finally {
      setIsDeleting(false);
    }
  };

  // Cấu hình bảng dữ liệu DataTable
  const columns: Column<CourseItem>[] = [
    {
      key: 'code',
      header: 'Mã môn',
      width: '120px',
      render: (item) => (
        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Tên môn học',
      render: (item) => (
        <div>
          <span className="font-semibold text-gray-900 block">{item.name}</span>
          <span className="text-xs text-gray-400">Số tín chỉ: {item.credits ?? 3} tín chỉ</span>
        </div>
      ),
    },
    {
      key: 'difficulty',
      header: 'Độ khó',
      width: '130px',
      render: (item) => {
        const styles = {
          BEGINNER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          INTERMEDIATE: 'bg-amber-50 text-amber-700 border-amber-200',
          ADVANCED: 'bg-rose-50 text-rose-700 border-rose-200',
        }[item.difficulty] || 'bg-gray-100 text-gray-700';

        const labels = {
          BEGINNER: 'Cơ bản',
          INTERMEDIATE: 'Trung cấp',
          ADVANCED: 'Nâng cao',
        }[item.difficulty] || item.difficulty;

        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles}`}>
            {labels}
          </span>
        );
      },
    },
    {
      key: 'topics_count',
      header: 'Chủ đề',
      width: '110px',
      render: (item) => (
        <div className="flex items-center space-x-1 text-gray-600">
          <Layers className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-800">{item.topics_count}</span>
          <span className="text-xs text-gray-400">chủ đề</span>
        </div>
      ),
    },
    {
      key: 'enrollments_count',
      header: 'Học viên',
      width: '110px',
      render: (item) => (
        <div className="flex items-center space-x-1 text-gray-600">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-800">{item.enrollments_count}</span>
          <span className="text-xs text-gray-400">người</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={[{ label: 'Quản lý Môn học (Courses)' }]} />

      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <span>Danh mục Môn học</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Quản lý cây chương trình đào tạo, thiết lập độ khó và điều hướng tới các chủ đề chuyên sâu
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Thêm Môn học mới
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Tìm theo mã hoặc tên môn học..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label htmlFor="difficultySelect" className="text-xs font-medium text-gray-500 whitespace-nowrap">
            Độ khó:
          </label>
          <select
            id="difficultySelect"
            value={difficultyFilter}
            onChange={(e) => {
              setDifficultyFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tất cả mức độ</option>
            <option value="BEGINNER">Cơ bản (Beginner)</option>
            <option value="INTERMEDIATE">Trung cấp (Intermediate)</option>
            <option value="ADVANCED">Nâng cao (Advanced)</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table */}
      <DataTable<CourseItem>
        columns={columns}
        data={courses}
        loading={loading}
        emptyMessage="Không tìm thấy môn học nào khớp với điều kiện tìm kiếm."
        keyExtractor={(item) => item.id}
        actions={(item) => (
          <div className="flex items-center space-x-1">
            {onNavigateToTopics && (
              <button
                type="button"
                onClick={() => onNavigateToTopics(item.id, item.name)}
                title="Xem danh sách chủ đề"
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Layers className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleOpenEditModal(item)}
              title="Chỉnh sửa môn học"
              className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenDeleteModal(item)}
              title="Xóa môn học"
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={limit}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(s) => setLimit(s)}
      />

      {/* Modal Thêm / Chỉnh sửa Course */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">
                {editingCourse ? 'Cập nhật Môn học' : 'Thêm Môn học Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã môn học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="VD: CS102, AI301, WEB204"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tên môn học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Cấu trúc Dữ liệu và Giải thuật"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Độ khó
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="BEGINNER">Cơ bản (Beginner)</option>
                    <option value="INTERMEDIATE">Trung cấp (Intermediate)</option>
                    <option value="ADVANCED">Nâng cao (Advanced)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Số tín chỉ
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formCredits}
                    onChange={(e) => setFormCredits(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg font-medium">
                  {formError}
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingCourse ? 'Lưu thay đổi' : 'Tạo môn học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xóa an toàn kèm cảnh báo Cascade */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        title="Xóa Môn học"
        itemTitle={deletingCourse ? `[${deletingCourse.code}] ${deletingCourse.name}` : ''}
        warningMessage={cascadeWarning}
        cascadeDetails={cascadeDetails}
        isLoading={isDeleting || cascadeLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}

