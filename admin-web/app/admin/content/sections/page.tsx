'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  FileText,
  AlertCircle,
  Loader2,
  Save,
  X,
  ChevronRight,
  Filter,
} from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import ConfirmDeleteModal, { CascadeDetail } from '@/components/ConfirmDeleteModal';
import Breadcrumb from '@/components/Breadcrumb';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';

export interface SectionItem {
  id: number;
  topic_id: number;
  topic_title: string;
  course_id: number;
  course_code: string;
  course_name: string;
  title: string;
  description?: string | null;
  order_index: number;
  materials_count: number;
  created_at: string;
  updated_at: string;
}

interface CourseOption {
  id: number;
  code: string;
  name: string;
}

interface TopicOption {
  id: number;
  course_id: number;
  title: string;
  order_index: number;
}

export default function SectionsPage() {
  const { token } = useAuth();
  const { showSuccess, showError } = useToast();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000/api';

  // Dữ liệu danh sách & trạng thái nạp
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bộ lọc Cascading: Chọn Môn ➔ Chọn Chủ đề
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [selectedTopicId, setSelectedTopicId] = useState<number | ''>('');

  // Phân trang & Tìm kiếm
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');

  // Modal Thêm / Sửa Phần học
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [modalCourseId, setModalCourseId] = useState<number | ''>('');
  const [modalTopicId, setModalTopicId] = useState<number | ''>('');
  const [modalTopics, setModalTopics] = useState<TopicOption[]>([]);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrderIndex, setFormOrderIndex] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Modal Xóa Phần học kèm Cảnh báo Cascade
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingSection, setDeletingSection] = useState<SectionItem | null>(null);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const [cascadeWarning, setCascadeWarning] = useState('');
  const [cascadeDetails, setCascadeDetails] = useState<CascadeDetail[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Headers helper
  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [token]);

  // 1. Tải danh sách Môn học cho Cascading Filter
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/admin/courses/options`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
        }
      } catch (err) {
        console.error('Lỗi nạp options môn học:', err);
      }
    };
    fetchCourses();
  }, [apiBaseUrl, authHeaders]);

  // 2. Tải Chủ đề khi chọn Môn học ở bộ lọc chính
  useEffect(() => {
    if (!selectedCourseId) {
      setTopics([]);
      setSelectedTopicId('');
      return;
    }
    const fetchTopics = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/admin/topics-by-course/${selectedCourseId}`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setTopics(data);
        }
      } catch (err) {
        console.error('Lỗi nạp topics theo môn:', err);
      }
    };
    fetchTopics();
  }, [selectedCourseId, apiBaseUrl, authHeaders]);

  // 3. Tải Chủ đề cho Modal Thêm/Sửa khi chọn Course trong Modal
  useEffect(() => {
    if (!modalCourseId) {
      setModalTopics([]);
      setModalTopicId('');
      return;
    }
    const fetchModalTopics = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/admin/topics-by-course/${modalCourseId}`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setModalTopics(data);
          if (editingSection && editingSection.course_id === modalCourseId) {
            setModalTopicId(editingSection.topic_id);
          } else if (data.length > 0) {
            setModalTopicId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Lỗi nạp modal topics:', err);
      }
    };
    fetchModalTopics();
  }, [modalCourseId, apiBaseUrl, authHeaders, editingSection]);

  // 4. Tải danh sách Phần học (Sections)
  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.append('search', search.trim());
      if (selectedCourseId) params.append('courseId', selectedCourseId.toString());
      if (selectedTopicId) params.append('topicId', selectedTopicId.toString());

      const res = await fetch(`${apiBaseUrl}/admin/sections?${params.toString()}`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const resData = await res.json();
      setSections(resData.data || []);
      setTotalPages(resData.pagination?.totalPages || 1);
      setTotalRecords(resData.pagination?.totalRecords || 0);
    } catch (err: any) {
      setError(err.message || 'Không thể nạp danh sách phần học');
      showError('Lỗi tải dữ liệu', 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, page, limit, search, selectedCourseId, selectedTopicId, showError]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // Mở modal Thêm phần học
  const handleOpenAddModal = () => {
    setEditingSection(null);
    setModalCourseId(selectedCourseId || (courses.length > 0 ? courses[0].id : ''));
    setModalTopicId(selectedTopicId || '');
    setFormTitle('');
    setFormDescription('');
    setFormOrderIndex('');
    setFormError('');
    setModalOpen(true);
  };

  // Mở modal Sửa phần học
  const handleOpenEditModal = (item: SectionItem) => {
    setEditingSection(item);
    setModalCourseId(item.course_id);
    setModalTopicId(item.topic_id);
    setFormTitle(item.title);
    setFormDescription(item.description || '');
    setFormOrderIndex(item.order_index);
    setFormError('');
    setModalOpen(true);
  };

  // Lưu Thêm / Sửa Phần học
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTopicId) {
      setFormError('Vui lòng chọn chủ đề cho phần học');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('Tiêu đề phần học không được để trống');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const payload: any = {
        topic_id: Number(modalTopicId),
        title: formTitle.trim(),
        description: formDescription.trim() || null,
      };
      if (formOrderIndex !== '' && formOrderIndex !== null) {
        payload.order_index = Number(formOrderIndex);
      }

      const url = editingSection
        ? `${apiBaseUrl}/admin/sections/${editingSection.id}`
        : `${apiBaseUrl}/admin/sections`;
      const method = editingSection ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Lỗi lưu phần học');
      }

      showSuccess(
        editingSection ? 'Cập nhật thành công' : 'Thêm mới thành công',
        `Phần học "${formTitle.trim()}" đã được lưu.`
      );
      setModalOpen(false);
      fetchSections();
    } catch (err: any) {
      setFormError(err.message || 'Không thể lưu phần học');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal Xóa an toàn kèm Cascade Warning
  const handleOpenDeleteModal = async (item: SectionItem) => {
    setDeletingSection(item);
    setDeleteModalOpen(true);
    setCascadeLoading(true);
    setCascadeWarning('');
    setCascadeDetails([]);

    try {
      const res = await fetch(`${apiBaseUrl}/admin/sections/${item.id}/cascade-info`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const info = await res.json();
        setCascadeWarning(info.warning_message);
        setCascadeDetails([
          { label: 'Tài liệu học tập liên quan', count: info.materials_count },
        ]);
      }
    } catch (err) {
      console.error('Lỗi tính toán cascade info:', err);
    } finally {
      setCascadeLoading(false);
    }
  };

  // Xác nhận Xóa Phần học
  const handleConfirmDelete = async () => {
    if (!deletingSection) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`${apiBaseUrl}/admin/sections/${deletingSection.id}?force=true`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Không thể xóa phần học');
      }

      showSuccess('Đã xóa phần học', `Phần học "${deletingSection.title}" đã được xóa.`);
      setDeleteModalOpen(false);
      setDeletingSection(null);
      fetchSections();
    } catch (err: any) {
      showError('Xóa thất bại', err.message || 'Lỗi khi xóa phần học');
    } finally {
      setIsDeleting(false);
    }
  };

  // Cấu hình các cột bảng dữ liệu DataTable
  const columns: Column<SectionItem>[] = [
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
      header: 'Tên phần học (Section)',
      render: (item) => (
        <div>
          <span className="font-semibold text-gray-900 block">{item.title}</span>
          {item.description ? (
            <span className="text-xs text-gray-400 line-clamp-1">{item.description}</span>
          ) : (
            <span className="text-xs text-gray-400 italic">Chưa có mô tả</span>
          )}
        </div>
      ),
    },
    {
      key: 'topic_title',
      header: 'Thuộc Chủ đề / Môn học',
      render: (item) => (
        <div>
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 block w-max">
            {item.topic_title}
          </span>
          <span className="text-xs text-gray-400 mt-0.5 block">
            [{item.course_code}] {item.course_name}
          </span>
        </div>
      ),
    },
    {
      key: 'materials_count',
      header: 'Số tài liệu',
      width: '130px',
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <FileText className="w-3.5 h-3.5" />
          {item.materials_count} bài
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Cập nhật',
      width: '140px',
      render: (item) => (
        <span className="text-xs text-gray-500">
          {new Date(item.updated_at).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Tổng quan', href: '/admin/dashboard' },
          { label: 'Quản lý Nội dung', href: '/admin/content/courses' },
          { label: 'Phần học (Sections)' },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600" />
            Quản Lý Phần Học (Sections)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tầng module trung gian kết nối giữa <strong>Chủ đề (Topic)</strong> và <strong>Tài liệu học tập (Material)</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Phần Học Mới</span>
        </button>
      </div>

      {/* Cascading Filter Bar: Chọn Môn ➔ Chọn Chủ đề ➔ Tìm kiếm */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Dropdown Môn học */}
        <div className="md:col-span-4">
          <label className="block text-xs font-bold text-gray-600 uppercase mb-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600" /> 1. Lọc Môn học
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value ? Number(e.target.value) : '');
              setPage(1);
            }}
            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Tất cả môn học --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
            ))}
          </select>
        </div>

        {/* Dropdown Chủ đề (Cascading) */}
        <div className="md:col-span-4">
          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
            2. Lọc Chủ đề
          </label>
          <select
            value={selectedTopicId}
            disabled={!selectedCourseId}
            onChange={(e) => {
              setSelectedTopicId(e.target.value ? Number(e.target.value) : '');
              setPage(1);
            }}
            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
          >
            <option value="">-- Tất cả chủ đề --</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>#{t.order_index} - {t.title}</option>
            ))}
          </select>
        </div>

        {/* Input Tìm kiếm Debounced */}
        <div className="md:col-span-4">
          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
            3. Tìm kiếm từ khóa
          </label>
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Tìm theo tên phần học..."
          />
        </div>
      </div>

      {/* Bảng Dữ Liệu Sections */}
      <DataTable
        columns={columns}
        data={sections}
        loading={loading}
        emptyMessage="Chưa có phần học nào phù hợp với bộ lọc đã chọn."
        keyExtractor={(item) => item.id}
        actions={(item) => (
          <div className="flex items-center gap-1.5 justify-end">
            <button
              type="button"
              onClick={() => handleOpenEditModal(item)}
              title="Chỉnh sửa phần học"
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenDeleteModal(item)}
              title="Xóa phần học"
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {/* Điều Hướng Phân Trang Chuẩn */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={limit}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(sz) => {
          setLimit(sz);
          setPage(1);
        }}
      />

      {/* Modal Thêm / Chỉnh Sửa Phần Học */}
      {modalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-base">
                {editingSection ? 'Chỉnh Sửa Phần Học' : 'Thêm Phần Học Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Chọn Môn học */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Môn học</label>
                <select
                  value={modalCourseId}
                  onChange={(e) => setModalCourseId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Chọn môn học --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Chọn Chủ đề tương ứng */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Chủ đề (Topic)</label>
                <select
                  value={modalTopicId}
                  disabled={!modalCourseId}
                  onChange={(e) => setModalTopicId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- Chọn chủ đề --</option>
                  {modalTopics.map((t) => (
                    <option key={t.id} value={t.id}>#{t.order_index} - {t.title}</option>
                  ))}
                </select>
              </div>

              {/* Tên Phần học */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tiêu đề phần học</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="VD: Phần 1: Khái niệm cơ bản & Cài đặt môi trường..."
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Thứ tự sắp xếp */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Thứ tự hiển thị (orderIndex)
                  <span className="text-gray-400 font-normal lowercase ml-1">(để trống sẽ tự động xếp cuối)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formOrderIndex}
                  onChange={(e) => setFormOrderIndex(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Tự động tăng dần"
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Mô tả chi tiết */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mô tả tóm tắt</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả mục tiêu của phần học này..."
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{submitting ? 'Đang lưu...' : 'Lưu phần học'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xóa Phần học an toàn */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        title="Xóa Phần Học"
        itemTitle={deletingSection ? deletingSection.title : ''}
        warningMessage={cascadeWarning}
        cascadeDetails={cascadeDetails}
        isLoading={cascadeLoading || isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}

