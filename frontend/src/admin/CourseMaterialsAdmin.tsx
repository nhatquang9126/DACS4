import React, { useState, useEffect, useMemo } from 'react';

export type MaterialType = 'READING' | 'VIDEO' | 'DOCUMENT_URL' | 'CODE_SNIPPET';

export interface Material {
  id: number;
  topic_id: number;
  topicId?: number;
  title: string;
  type: MaterialType;
  content: string;
  file_url?: string | null;
  fileUrl?: string | null;
  reading_time?: number | null;
  readingTime?: number | null;
  order_index?: number;
  orderIndex?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Topic {
  id: number;
  course_id: number;
  title: string;
  description?: string | null;
  order_index: number;
  materials?: Material[];
}

export interface Course {
  id: number;
  code: string;
  name: string;
  difficulty?: string;
  topics?: Topic[];
}

interface CourseMaterialsAdminProps {
  courseId: number;
  apiBaseUrl?: string;
  authToken?: string;
  onRefresh?: () => void;
}

export default function CourseMaterialsAdmin({
  courseId,
  apiBaseUrl = '/api',
  authToken,
  onRefresh,
}: CourseMaterialsAdminProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formType, setFormType] = useState<MaterialType>('READING');
  const [formContent, setFormContent] = useState<string>('');
  const [formFileUrl, setFormFileUrl] = useState<string>('');
  const [formReadingTime, setFormReadingTime] = useState<number>(5);
  const [formOrderIndex, setFormOrderIndex] = useState<number>(0);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Delete State
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const authHeaders = useMemo(() => {
    return {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    };
  }, [authToken]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${apiBaseUrl}/courses/${courseId}`, {
        headers: authHeaders,
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      setCourse(data);
      setTopics(data.topics || []);
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu môn học:', err);
      setError('Không thể tải dữ liệu môn học và danh sách tài liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  // Mở modal thêm tài liệu mới cho 1 topic
  const handleOpenCreateModal = (topicId: number) => {
    setEditingMaterial(null);
    setSelectedTopicId(topicId);
    setFormTitle('');
    setFormType('READING');
    setFormContent(
      `### 🎯 1. Tóm tắt trọng tâm\n(Nêu 1-2 câu tóm lược vấn đề cốt lõi)\n\n### 📋 2. Hướng dẫn chi tiết & Code mẫu\n- Bước 1: Khởi tạo dữ liệu\n\`\`\`typescript\nconst example = "SmartStudy AI";\nconsole.log(example);\n\`\`\`\n\n### 💡 3. Ghi nhớ & Câu hỏi ôn tập\n> **Lưu ý quan trọng**: Kiểm tra kỹ các trường hợp biên trước khi áp dụng.`
    );
    setFormFileUrl('');
    setFormReadingTime(5);
    setFormOrderIndex(0);
    setEditorTab('write');
    setFormError('');
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa tài liệu
  const handleOpenEditModal = (material: Material, topicId: number) => {
    setEditingMaterial(material);
    setSelectedTopicId(topicId);
    setFormTitle(material.title);
    setFormType(material.type || 'READING');
    setFormContent(material.content || '');
    setFormFileUrl(material.file_url || material.fileUrl || '');
    setFormReadingTime(material.reading_time || material.readingTime || 5);
    setFormOrderIndex(material.order_index ?? material.orderIndex ?? 0);
    setEditorTab('write');
    setFormError('');
    setIsModalOpen(true);
  };

  // Lưu tài liệu (Create hoặc Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập tiêu đề tài liệu');
      return;
    }
    if (!formContent.trim()) {
      setFormError('Vui lòng nhập nội dung tài liệu');
      return;
    }
    if (!selectedTopicId) {
      setFormError('Chưa chọn chủ đề');
      return;
    }

    try {
      setIsSaving(true);
      setFormError('');

      const payload = {
        topic_id: selectedTopicId,
        topicId: selectedTopicId,
        title: formTitle.trim(),
        type: formType,
        content: formContent,
        file_url: formFileUrl.trim() || null,
        fileUrl: formFileUrl.trim() || null,
        reading_time: Number(formReadingTime) || 5,
        readingTime: Number(formReadingTime) || 5,
        order_index: Number(formOrderIndex) || 0,
        orderIndex: Number(formOrderIndex) || 0,
      };

      let res: Response;
      if (editingMaterial) {
        // Update: PUT /api/admin/materials/:id
        res = await fetch(`${apiBaseUrl}/admin/materials/${editingMaterial.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      } else {
        // Create: POST /api/admin/materials
        res = await fetch(`${apiBaseUrl}/admin/materials`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Lỗi lưu tài liệu trên máy chủ');
      }

      setIsModalOpen(false);
      fetchCourseData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Lỗi khi lưu tài liệu:', err);
      setFormError(err.message || 'Không thể lưu tài liệu');
    } finally {
      setIsSaving(false);
    }
  };

  // Xóa tài liệu
  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu này không? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      setDeletingId(id);
      const res = await fetch(`${apiBaseUrl}/admin/materials/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      fetchCourseData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert('Không thể xóa tài liệu: ' + (err.message || 'Lỗi máy chủ'));
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeBadge = (type: MaterialType) => {
    switch (type) {
      case 'VIDEO':
        return { label: '🎥 Video bài giảng', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'DOCUMENT_URL':
        return { label: '📄 Slide PDF', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'CODE_SNIPPET':
        return { label: '💻 Code mẫu', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'READING':
      default:
        return { label: '📖 Bài đọc', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
  };

  // Toolbar chèn Markdown
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('markdown-editor-input') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formContent.substring(start, end);
    const newText =
      formContent.substring(0, start) +
      prefix +
      (selectedText || 'nội dung') +
      suffix +
      formContent.substring(end);

    setFormContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  if (loading && !course) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
        <span>Đang tải danh sách tài liệu...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header Quản lý Môn học */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                {course?.code || `COURSE #${courseId}`}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                Độ khó: {course?.difficulty || 'Cơ bản'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{course?.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Quản lý các chủ đề và tài liệu bài học (Reading, Video, Slide PDF, Code snippet)
            </p>
          </div>
          <button
            onClick={fetchCourseData}
            className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Làm mới
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      ) : null}

      {/* Danh sách Topics & Materials */}
      <div className="space-y-6">
        {topics.map((topic, topicIdx) => (
          <div
            key={topic.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            {/* Topic Header Bar */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Chủ đề {topicIdx + 1}
                  </span>
                  <h2 className="text-lg font-bold text-gray-900">{topic.title}</h2>
                </div>
                {topic.description ? (
                  <p className="text-xs text-gray-500 mt-1">{topic.description}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => handleOpenCreateModal(topic.id)}
                className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-sm"
              >
                + Thêm tài liệu mới
              </button>
            </div>

            {/* Danh sách Material trong Topic */}
            <div className="p-6">
              {topic.materials && topic.materials.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {topic.materials.map((mat) => {
                    const badge = getTypeBadge(mat.type);
                    return (
                      <div
                        key={mat.id}
                        className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 -mx-6 px-6 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold border ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              ⏱️ {mat.reading_time || mat.readingTime || 5} phút đọc
                            </span>
                            {mat.file_url || mat.fileUrl ? (
                              <a
                                href={mat.file_url || mat.fileUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                Link đính kèm ↗
                              </a>
                            ) : null}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {mat.title}
                          </h3>
                        </div>

                        {/* Action Buttons: Sửa & Xóa */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(mat, topic.id)}
                            className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === mat.id}
                            onClick={() => handleDelete(mat.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-md transition"
                          >
                            {deletingId === mat.id ? 'Đang xóa...' : 'Xóa'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Chủ đề này chưa có tài liệu nào. Bấm "+ Thêm tài liệu mới" để biên soạn.
                </div>
              )}
            </div>
          </div>
        ))}

        {topics.length === 0 && !loading ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-200">
            Môn học này chưa có chủ đề nào. Hãy tạo chủ đề trước khi thêm tài liệu.
          </div>
        ) : null}
      </div>

      {/* MODAL SOẠN THẢO & CẬP NHẬT TÀI LIỆU CÓ LIVE PREVIEW */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">
                {editingMaterial ? '✏️ Chỉnh sửa Tài liệu học tập' : '📝 Thêm Tài liệu mới'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError ? (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {formError}
                </div>
              ) : null}

              {/* Dòng 1: Tiêu đề & Loại tài liệu */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tiêu đề bài học / tài liệu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="VD: Tổng quan về Cấu trúc Dữ liệu Cây (Binary Trees)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Loại tài liệu
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as MaterialType)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="READING">📖 Bài đọc lý thuyết</option>
                    <option value="VIDEO">🎥 Video bài giảng</option>
                    <option value="DOCUMENT_URL">📄 Slide PDF / Tài liệu</option>
                    <option value="CODE_SNIPPET">💻 Code mẫu thực hành</option>
                  </select>
                </div>
              </div>

              {/* Dòng 2: Thời gian đọc dự kiến & Link đính kèm */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Thời gian đọc dự kiến (phút)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={formReadingTime}
                    onChange={(e) => setFormReadingTime(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Link tệp PDF, Slide hoặc Video URL (Tùy chọn)
                  </label>
                  <input
                    type="url"
                    value={formFileUrl}
                    onChange={(e) => setFormFileUrl(e.target.value)}
                    placeholder="https://example.com/slides/lesson-01.pdf hoặc link video YouTube"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Trình soạn thảo Markdown với Live Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">
                    Nội dung bài học (Hỗ trợ Markdown) <span className="text-red-500">*</span>
                  </label>

                  {/* Tabs Soạn thảo & Xem trước */}
                  <div className="flex rounded-lg border border-gray-300 bg-gray-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditorTab('write')}
                      className={`px-3 py-1 font-medium rounded-md transition ${
                        editorTab === 'write'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Soạn thảo (Write)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('preview')}
                      className={`px-3 py-1 font-medium rounded-md transition ${
                        editorTab === 'preview'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Xem trước (Live Preview)
                    </button>
                  </div>
                </div>

                {/* Markdown Toolbar */}
                {editorTab === 'write' ? (
                  <div className="flex items-center gap-1.5 p-2 bg-gray-50 border border-b-0 border-gray-300 rounded-t-lg flex-wrap text-xs">
                    <button
                      type="button"
                      onClick={() => insertMarkdown('**', '**')}
                      className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 font-bold"
                      title="In đậm"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown('*', '*')}
                      className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 italic"
                      title="In nghiêng"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown('### ')}
                      className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 font-semibold"
                      title="Tiêu đề H3"
                    >
                      H3
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown('- ')}
                      className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100"
                      title="Gạch đầu dòng"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown('> ')}
                      className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100"
                      title="Trích dẫn Callout"
                    >
                      " Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown('```typescript\n', '\n```')}
                      className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 font-mono"
                      title="Code Block"
                    >
                      &lt;/&gt; Code
                    </button>
                  </div>
                ) : null}

                {/* Editor textarea vs Preview Container */}
                {editorTab === 'write' ? (
                  <textarea
                    id="markdown-editor-input"
                    rows={12}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Nhập nội dung bài đọc bằng định dạng Markdown chuẩn..."
                    className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-b-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <div className="w-full min-h-[280px] max-h-[360px] overflow-y-auto p-4 border border-gray-300 rounded-lg bg-gray-50 prose prose-sm max-w-none">
                    {/* Live Preview Render */}
                    <div className="space-y-3 text-sm text-gray-800">
                      {formContent.split('\n').map((line, i) => {
                        if (line.startsWith('### ')) {
                          return (
                            <h3 key={i} className="text-base font-bold text-indigo-900 mt-2">
                              {line.replace('### ', '')}
                            </h3>
                          );
                        }
                        if (line.startsWith('## ')) {
                          return (
                            <h2 key={i} className="text-lg font-bold text-gray-900 mt-3">
                              {line.replace('## ', '')}
                            </h2>
                          );
                        }
                        if (line.startsWith('# ')) {
                          return (
                            <h1 key={i} className="text-xl font-extrabold text-gray-900 mt-4">
                              {line.replace('# ', '')}
                            </h1>
                          );
                        }
                        if (line.startsWith('> ')) {
                          return (
                            <blockquote
                              key={i}
                              className="border-l-4 border-indigo-500 bg-indigo-50/50 p-2 text-gray-700 italic rounded-r"
                            >
                              {line.replace('> ', '')}
                            </blockquote>
                          );
                        }
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          return (
                            <li key={i} className="ml-4 list-disc text-gray-700">
                              {line.replace(/^[-*]\s+/, '')}
                            </li>
                          );
                        }
                        if (line.startsWith('```')) {
                          return (
                            <div
                              key={i}
                              className="bg-slate-900 text-slate-100 text-xs font-mono p-2 rounded"
                            >
                              {line}
                            </div>
                          );
                        }
                        return line.trim() ? (
                          <p key={i} className="text-gray-800 leading-relaxed">
                            {line}
                          </p>
                        ) : (
                          <div key={i} className="h-1" />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Đang lưu...' : editingMaterial ? 'Lưu thay đổi' : 'Tạo tài liệu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

