'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  FileText,
  HelpCircle,
  AlertCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import ConfirmDeleteModal, { CascadeDetail } from '@/components/ConfirmDeleteModal';
import Breadcrumb from '@/components/Breadcrumb';
import { useToast } from '@/components/Toast';


export interface TopicItem {
  id: number;
  course_id: number;
  course_code: string;
  course_name: string;
  title: string;
  description?: string | null;
  order_index: number;
  created_at: string;
  materials_count: number;
  quizzes_count: number;
}

interface CourseOption {
  id: number;
  code: string;
  name: string;
}

interface TopicsPageProps {
  apiBaseUrl?: string;
  authToken?: string;
  initialCourseId?: number | null;
  onNavigateToCourses?: () => void;
  onNavigateToMaterials?: (topicId: number) => void;
  onQuickAddMaterial?: (courseId: number, topicId: number, topicTitle: string) => void;
  onQuickAddQuiz?: (courseId: number, topicId: number, topicTitle: string) => void;
}

export default function TopicsPage({
  apiBaseUrl = '/api',
  authToken,
  initialCourseId,
  onNavigateToCourses,
  onQuickAddMaterial,
  onQuickAddQuiz,
}: TopicsPageProps) {
  const { showSuccess, showError } = useToast();

  // Data States
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>(initialCourseId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination & Search States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');

  // Modal Thêm / Sửa Topic
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicItem | null>(null);
  const [formCourseId, setFormCourseId] = useState<number | ''>('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrderIndex, setFormOrderIndex] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Modal Xóa kèm Cascade Warning
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingTopic, setDeletingTopic] = useState<TopicItem | null>(null);
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

  // Fetch danh sách môn học cho dropdown
  useEffect(() => {
    const fetchCoursesOptions = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/admin/courses/options`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
        }
      } catch (err) {
        console.error('Lỗi lấy danh sách môn học options:', err);
      }
    };
    fetchCoursesOptions();
  }, [apiBaseUrl, authHeaders]);

  // Cập nhật selectedCourseId khi prop initialCourseId thay đổi
  useEffect(() => {
    if (initialCourseId !== undefined) {
      setSelectedCourseId(initialCourseId || '');
      setPage(1);
    }
  }, [initialCourseId]);

  // Fetch Topics
  const fetchTopics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.append('search', search.trim());
      if (selectedCourseId) params.append('courseId', selectedCourseId.toString());

      const res = await fetch(`${apiBaseUrl}/admin/topics?${params.toString()}`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Lỗi máy chủ: ${res.status}`);
      }

      const json = await res.json();
      setTopics(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalRecords(json.pagination?.totalRecords || 0);
    } catch (err: any) {
      console.error('Lỗi tải danh sách chủ đề:', err);
      setError(err.message || 'Không thể tải danh sách chủ đề');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, page, limit, search, selectedCourseId]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setEditingTopic(null);
    setFormCourseId(selectedCourseId || (courses.length > 0 ? courses[0].id : ''));
    setFormTitle('');
    setFormDescription('');
    setFormOrderIndex('0');
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (topic: TopicItem) => {
    setEditingTopic(topic);
    setFormCourseId(topic.course_id);
    setFormTitle(topic.title);
    setFormDescription(topic.description || '');
    setFormOrderIndex(topic.order_index.toString());
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Lưu Topic (POST / PUT)
  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourseId) {
      setFormError('Vui lòng chọn môn học liên kết');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('Tiêu đề chủ đề không được để trống');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      const bodyData = {
        course_id: Number(formCourseId),
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        order_index: parseInt(formOrderIndex, 10) || 0,
      };

      const url = editingTopic
        ? `${apiBaseUrl}/admin/topics/${editingTopic.id}`
        : `${apiBaseUrl}/admin/topics`;
      const method = editingTopic ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `Lỗi lưu chủ đề: ${res.status}`);
      }

      setIsEditModalOpen(false);
      showSuccess(
        editingTopic ? 'Cập nhật thành công' : 'Tạo chủ đề thành công',
        `Chủ đề "${bodyData.title}" đã được lưu.`
      );
      fetchTopics();
    } catch (err: any) {
      setFormError(err.message || 'Có lỗi xảy ra khi lưu chủ đề');
      showError('Lưu chủ đề thất bại', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mở modal xóa với Cascade Info
  const handleOpenDeleteModal = async (topic: TopicItem) => {
    setDeletingTopic(topic);
    setDeleteModalOpen(true);
    setCascadeWarning('');
    setCascadeDetails([]);

    try {
      setCascadeLoading(true);
      const res = await fetch(`${apiBaseUrl}/admin/topics/${topic.id}/cascade-info`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const info = await res.json();
        setCascadeWarning(info.warning_message);
        setCascadeDetails([
          { label: 'Tài liệu học tập', count: info.materials_count },
          { label: 'Bài kiểm tra', count: info.quizzes_count },
          { label: 'Câu hỏi trắc nghiệm', count: info.questions_count },
        ]);
      }
    } catch (err) {
      console.error('Lỗi lấy cascade info chủ đề:', err);
    } finally {
      setCascadeLoading(false);
    }
  };

  // Xác nhận Xóa Topic
  const handleConfirmDelete = async () => {
    if (!deletingTopic) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`${apiBaseUrl}/admin/topics/${deletingTopic.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Xóa chủ đề không thành công');
      }

      setDeleteModalOpen(false);
      showSuccess(
        'Đã xóa chủ đề',
        `Chủ đề "${deletingTopic.title}" đã được xóa vĩnh viễn.`
      );
      setDeletingTopic(null);
      fetchTopics();
    } catch (err: any) {
      showError('Xóa chủ đề thất bại', err.message || 'Lỗi khi xóa chủ đề');
    } finally {
      setIsDeleting(false);
    }
  };

  // Columns cấu hình bảng
  const columns: Column<TopicItem>[] = [
    {
      key: 'order_index',
      header: 'Thứ tự',
      width: '80px',
      render: (item) => (
        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          #{item.order_index}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Tiêu đề chủ đề',
      render: (item) => (
        <div>
          <span className="font-semibold text-gray-900 block">{item.title}</span>
          {item.description && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'course_name',
      header: 'Môn học liên kết',
      width: '220px',
      render: (item) => (
        <div className="text-xs">
          <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 mr-1.5">
            {item.course_code}
          </span>
          <span className="text-gray-700 font-medium">{item.course_name}</span>
        </div>
      ),
    },
    {
      key: 'materials_count',
      header: 'Tài liệu',
      width: '110px',
      render: (item) => (
        <div className="flex items-center space-x-1 text-gray-600 text-xs">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-semibold text-gray-800">{item.materials_count}</span>
          <span className="text-gray-400">bài</span>
        </div>
      ),
    },
    {
      key: 'quizzes_count',
      header: 'Bài Quiz',
      width: '110px',
      render: (item) => (
        <div className="flex items-center space-x-1 text-gray-600 text-xs">
          <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
          <span className="font-semibold text-gray-800">{item.quizzes_count}</span>
          <span className="text-gray-400">đề</span>
        </div>
      ),
    },
  ];

  const currentCourseName = courses.find((c) => c.id === selectedCourseId)?.name;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation Phân Cấp */}
      <Breadcrumb
        items={[
          { label: 'Môn học', onClick: onNavigateToCourses },
          ...(currentCourseName
            ? [{ label: currentCourseName }]
            : []),
          { label: 'Quản lý Chủ đề (Topics)' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            <span>Danh mục Chủ đề học tập</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Phân bổ cây kiến thức theo môn học, sắp xếp thứ tự học và gán tài liệu / bài kiểm tra
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Thêm Chủ đề mới
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
          placeholder="Tìm theo tên hoặc mô tả chủ đề..."
          className="w-full sm:w-80"
        />

        {/* Cascading Filter Môn học */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label htmlFor="courseSelectFilter" className="text-xs font-semibold text-gray-500 whitespace-nowrap">
            Lọc theo Môn học:
          </label>
          <select
            id="courseSelectFilter"
            value={selectedCourseId}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : '';
              setSelectedCourseId(val);
              setPage(1);
            }}
            className="text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs"
          >
            <option value="">-- Tất cả các môn học --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.code}] {c.name}
              </option>
            ))}
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
      <DataTable<TopicItem>
        columns={columns}
        data={topics}
        loading={loading}
        emptyMessage="Không có chủ đề nào phù hợp."
        keyExtractor={(item) => item.id}
        actions={(item) => (
          <div className="flex items-center space-x-1">
            {/* Quick Action: Thêm tài liệu nhanh */}
            {onQuickAddMaterial && (
              <button
                type="button"
                onClick={() => onQuickAddMaterial(item.course_id, item.id, item.title)}
                title="Tạo bài học mới cho chủ đề này"
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
              >
                <FileText className="w-3 h-3 mr-1" />
                + Bài học
              </button>
            )}

            {/* Quick Action: Tạo Quiz nhanh */}
            {onQuickAddQuiz && (
              <button
                type="button"
                onClick={() => onQuickAddQuiz(item.course_id, item.id, item.title)}
                title="Tạo bài kiểm tra mới cho chủ đề này"
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 transition-colors"
              >
                <HelpCircle className="w-3 h-3 mr-1" />
                + Quiz
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenEditModal(item)}
              title="Chỉnh sửa chủ đề"
              className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenDeleteModal(item)}
              title="Xóa chủ đề"
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

      {/* Modal Thêm / Chỉnh sửa Topic */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">
                {editingTopic ? 'Cập nhật Chủ đề' : 'Thêm Chủ đề Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Môn học liên kết <span className="text-red-500">*</span>
                </label>
                <select
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(Number(e.target.value))}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Chọn môn học --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tiêu đề chủ đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="VD: Con trỏ và Cấp phát bộ nhớ động"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mô tả ngắn
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả mục tiêu và nội dung chính của chủ đề này..."
                  rows={3}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Thứ tự hiển thị (Order Index)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formOrderIndex}
                  onChange={(e) => setFormOrderIndex(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
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
                  {editingTopic ? 'Lưu thay đổi' : 'Tạo chủ đề'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xóa an toàn kèm Cascade Warning */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        title="Xóa Chủ đề"
        itemTitle={deletingTopic ? deletingTopic.title : ''}
        warningMessage={cascadeWarning}
        cascadeDetails={cascadeDetails}
        isLoading={isDeleting || cascadeLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}


