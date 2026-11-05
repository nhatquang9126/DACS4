import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Eye,
  BookOpen,
  Video,
  Globe,
  Code,
  Clock,
  ExternalLink,
  AlertCircle,
  X,
} from 'lucide-react';
import DataTable, { Column } from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import MaterialEditorModal, { MaterialFormData, MaterialType } from '../components/MaterialEditorModal';
import Breadcrumb from '../components/Breadcrumb';
import { useToast } from '../components/Toast';


export interface MaterialItem {
  id: number;
  topic_id: number;
  topic_title: string;
  course_id: number;
  course_code: string;
  course_name: string;
  title: string;
  type: MaterialType;
  content: string;
  file_url?: string | null;
  reading_time?: number | null;
  order_index: number;
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

interface MaterialsPageProps {
  apiBaseUrl?: string;
  authToken?: string;
  initialCourseId?: number | null;
  initialTopicId?: number | null;
  onNavigateToCourses?: () => void;
  onNavigateToTopics?: (courseId?: number) => void;
}

export default function MaterialsPage({
  apiBaseUrl = '/api',
  authToken,
  initialCourseId,
  initialTopicId,
  onNavigateToCourses,
  onNavigateToTopics,
}: MaterialsPageProps) {
  const { showSuccess, showError } = useToast();

  // Data States
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [filterTopics, setFilterTopics] = useState<TopicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cascading Filter States
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>(initialCourseId || '');
  const [selectedTopicId, setSelectedTopicId] = useState<number | ''>(initialTopicId || '');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');

  // Material Editor Modal
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);

  // Preview Drawer Modal
  const [previewMaterial, setPreviewMaterial] = useState<MaterialItem | null>(null);

  // Confirm Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<MaterialItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Headers helper
  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  }, [authToken]);

  // Fetch danh sách Course options cho Dropdown
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
        console.error('Lỗi lấy courses options:', err);
      }
    };
    fetchCoursesOptions();
  }, [apiBaseUrl, authHeaders]);

  // Khi selectedCourseId thay đổi, gọi API lấy danh sách topics thuộc course đó cho filter
  useEffect(() => {
    if (!selectedCourseId) {
      setFilterTopics([]);
      setSelectedTopicId('');
      return;
    }

    const fetchTopicsForFilter = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/admin/topics-by-course/${selectedCourseId}`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setFilterTopics(data);
        }
      } catch (err) {
        console.error('Lỗi lấy topics filter:', err);
      }
    };
    fetchTopicsForFilter();
  }, [selectedCourseId, apiBaseUrl, authHeaders]);

  // Fetch Materials
  const fetchMaterials = useCallback(async () => {
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
      if (selectedType !== 'ALL') params.append('type', selectedType);

      const res = await fetch(`${apiBaseUrl}/admin/materials?${params.toString()}`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Lỗi máy chủ: ${res.status}`);
      }

      const json = await res.json();
      setMaterials(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalRecords(json.pagination?.totalRecords || 0);
    } catch (err: any) {
      console.error('Lỗi tải danh sách tài liệu:', err);
      setError(err.message || 'Không thể tải danh sách tài liệu');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, page, limit, search, selectedCourseId, selectedTopicId, selectedType]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Mở modal tạo mới bài học
  const handleOpenCreateModal = () => {
    setEditingMaterial(null);
    setEditorModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (material: MaterialItem) => {
    setEditingMaterial(material);
    setEditorModalOpen(true);
  };

  // Lưu tài liệu (create hoặc update) qua MaterialEditorModal
  const handleSaveMaterial = async (formData: MaterialFormData) => {
    const url = formData.id
      ? `${apiBaseUrl}/admin/materials/${formData.id}`
      : `${apiBaseUrl}/admin/materials`;
    const method = formData.id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Lỗi khi lưu tài liệu');
    }

    setEditorModalOpen(false);
    showSuccess(
      formData.id ? 'Cập nhật thành công' : 'Đăng tài liệu thành công',
      `Tài liệu "${formData.title}" đã được lưu.`
    );
    fetchMaterials();
  };

  // Xác nhận Xóa Material
  const handleConfirmDelete = async () => {
    if (!deletingMaterial) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`${apiBaseUrl}/admin/materials/${deletingMaterial.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Lỗi khi xóa tài liệu');
      }

      setDeleteModalOpen(false);
      showSuccess('Đã xóa tài liệu', `Tài liệu "${deletingMaterial.title}" đã được xóa.`);
      setDeletingMaterial(null);
      fetchMaterials();
    } catch (err: any) {
      showError('Không thể xóa tài liệu', err.message || 'Lỗi khi xóa tài liệu');
    } finally {
      setIsDeleting(false);
    }
  };

  // Columns bảng
  const columns: Column<MaterialItem>[] = [
    {
      key: 'order_index',
      header: 'Thứ tự',
      width: '75px',
      render: (item) => (
        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          #{item.order_index}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Tiêu đề tài liệu / bài đọc',
      render: (item) => (
        <div>
          <span className="font-semibold text-gray-900 block">{item.title}</span>
          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
            <span className="flex items-center">
              <Clock className="w-3 h-3 mr-1 text-gray-400" />
              ~{item.reading_time ?? 5} phút đọc
            </span>
            {item.file_url && (
              <a
                href={item.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center"
              >
                <ExternalLink className="w-3 h-3 mr-0.5" />
                Đính kèm
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Phân loại',
      width: '150px',
      render: (item) => {
        const configs = {
          READING: {
            label: 'Bài đọc',
            icon: BookOpen,
            className: 'bg-blue-50 text-blue-700 border-blue-200',
          },
          VIDEO: {
            label: 'Video',
            icon: Video,
            className: 'bg-rose-50 text-rose-700 border-rose-200',
          },
          DOCUMENT_URL: {
            label: 'Tài liệu',
            icon: Globe,
            className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          },
          CODE_SNIPPET: {
            label: 'Code mẫu',
            icon: Code,
            className: 'bg-purple-50 text-purple-700 border-purple-200',
          },
        }[item.type] || {
          label: item.type,
          icon: FileText,
          className: 'bg-gray-100 text-gray-700 border-gray-200',
        };

        const IconComponent = configs.icon;

        return (
          <span
            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border ${configs.className}`}
          >
            <IconComponent className="w-3.5 h-3.5 mr-1" />
            {configs.label}
          </span>
        );
      },
    },
    {
      key: 'topic_title',
      header: 'Chủ đề & Môn học',
      width: '240px',
      render: (item) => (
        <div className="text-xs">
          <span className="font-semibold text-gray-800 block">{item.topic_title}</span>
          <span className="text-gray-400 font-mono">[{item.course_code}] {item.course_name}</span>
        </div>
      ),
    },
  ];

  const currentCourse = courses.find((c) => c.id === selectedCourseId);
  const currentTopic = filterTopics.find((t) => t.id === selectedTopicId);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Môn học', onClick: onNavigateToCourses },
          ...(currentCourse ? [{ label: currentCourse.name, onClick: () => onNavigateToTopics?.(currentCourse.id) }] : []),
          ...(currentTopic ? [{ label: currentTopic.title }] : []),
          { label: 'Tài liệu học tập (Materials)' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>Quản lý Tài liệu & Bài giảng</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Biên soạn nội dung lý thuyết với Markdown, quản lý video giảng dạy và liên kết tài liệu theo từng chủ đề
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Soạn Tài liệu mới
        </button>
      </div>

      {/* Cascading Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search */}
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Tìm theo tiêu đề hoặc nội dung..."
            className="w-full"
          />

          {/* Cascading Dropdown 1: Chọn Môn học */}
          <div>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : '';
                setSelectedCourseId(val);
                setSelectedTopicId('');
                setPage(1);
              }}
              className="w-full text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Tất cả Môn học --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cascading Dropdown 2: Chọn Chủ đề (Topic) - Bị disabled nếu chưa chọn môn */}
          <div>
            <select
              value={selectedTopicId}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : '';
                setSelectedTopicId(val);
                setPage(1);
              }}
              disabled={!selectedCourseId}
              className="w-full text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {!selectedCourseId ? (
                <option value="">-- Chọn môn học trước --</option>
              ) : filterTopics.length === 0 ? (
                <option value="">Chưa có chủ đề nào</option>
              ) : (
                <>
                  <option value="">-- Tất cả Chủ đề --</option>
                  {filterTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.order_index} - {t.title}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Filter Phân loại (Type) */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả phân loại</option>
              <option value="READING">📖 Bài đọc (READING)</option>
              <option value="VIDEO">🎥 Video bài giảng (VIDEO)</option>
              <option value="DOCUMENT_URL">🌐 Tài liệu tham khảo</option>
              <option value="CODE_SNIPPET">💻 Code mẫu thực hành</option>
            </select>
          </div>
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
      <DataTable<MaterialItem>
        columns={columns}
        data={materials}
        loading={loading}
        emptyMessage="Không có tài liệu nào phù hợp với bộ lọc."
        keyExtractor={(item) => item.id}
        actions={(item) => (
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setPreviewMaterial(item)}
              title="Xem trước nội dung"
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenEditModal(item)}
              title="Chỉnh sửa tài liệu"
              className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setDeletingMaterial(item);
                setDeleteModalOpen(true);
              }}
              title="Xóa tài liệu"
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

      {/* Material Editor Modal với Cascading dropdown và Markdown Editor Split/Tabs */}
      <MaterialEditorModal
        isOpen={editorModalOpen}
        initialData={
          editingMaterial
            ? {
                id: editingMaterial.id,
                course_id: editingMaterial.course_id,
                topic_id: editingMaterial.topic_id,
                title: editingMaterial.title,
                type: editingMaterial.type,
                content: editingMaterial.content,
                file_url: editingMaterial.file_url,
                reading_time: editingMaterial.reading_time,
                order_index: editingMaterial.order_index,
              }
            : null
        }
        initialCourseId={selectedCourseId ? Number(selectedCourseId) : undefined}
        initialTopicId={selectedTopicId ? Number(selectedTopicId) : undefined}
        courses={courses}
        apiBaseUrl={apiBaseUrl}
        authToken={authToken}
        onSave={handleSaveMaterial}
        onClose={() => setEditorModalOpen(false)}
      />

      {/* Preview Material Drawer / Modal */}
      {previewMaterial && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 mr-2">
                  {previewMaterial.type}
                </span>
                <h3 className="font-bold text-gray-900 text-lg inline">
                  {previewMaterial.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMaterial(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center space-x-3 text-xs text-gray-500 border-b pb-3">
                <span>Chủ đề: <strong>{previewMaterial.topic_title}</strong></span>
                <span>•</span>
                <span>Môn: <strong>{previewMaterial.course_name}</strong></span>
                <span>•</span>
                <span>Thời lượng: <strong>~{previewMaterial.reading_time ?? 5} phút</strong></span>
              </div>

              {previewMaterial.file_url && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs flex items-center justify-between">
                  <span className="text-blue-800 font-medium truncate">
                    Liên kết đính kèm: {previewMaterial.file_url}
                  </span>
                  <a
                    href={previewMaterial.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-bold hover:underline ml-2 whitespace-nowrap"
                  >
                    Mở liên kết ↗
                  </a>
                </div>
              )}

              <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
                {previewMaterial.content}
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewMaterial(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        title="Xóa Tài liệu Học tập"
        itemTitle={deletingMaterial ? deletingMaterial.title : ''}
        warningMessage="Tài liệu này sẽ bị xóa hoàn toàn khỏi chương trình giảng dạy của chủ đề liên quan."
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}

