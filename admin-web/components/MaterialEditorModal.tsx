'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Eye,
  Edit3,
  Columns,
  Maximize2,
  Minimize2,
  Bold,
  Italic,
  Heading,
  Code,
  List,
  Link as LinkIcon,
  AlertCircle,
  FileText,
  Video,
  Globe,
  Loader2,
  Save,
} from 'lucide-react';

export type MaterialType = 'READING' | 'VIDEO' | 'DOCUMENT_URL' | 'CODE_SNIPPET';

export interface MaterialFormData {
  id?: number;
  course_id?: number;
  topic_id: number;
  title: string;
  type: MaterialType;
  content: string;
  file_url?: string | null;
  reading_time?: number | null;
  order_index?: number;
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

interface MaterialEditorModalProps {
  isOpen: boolean;
  initialData?: Partial<MaterialFormData> | null;
  initialCourseId?: number;
  initialTopicId?: number;
  courses: CourseOption[];
  apiBaseUrl?: string;
  authToken?: string;
  onSave: (data: MaterialFormData) => Promise<void>;
  onClose: () => void;
}

export default function MaterialEditorModal({
  isOpen,
  initialData,
  initialCourseId,
  initialTopicId,
  courses,
  apiBaseUrl = '/api',
  authToken,
  onSave,
  onClose,
}: MaterialEditorModalProps) {
  // Cascading Dropdown States
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>(initialCourseId || '');
  const [selectedTopicId, setSelectedTopicId] = useState<number | ''>(initialTopicId || '');
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MaterialType>('READING');
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [readingTime, setReadingTime] = useState<number>(5);
  const [orderIndex, setOrderIndex] = useState<number>(0);

  // Editor Display Mode: 'split' | 'tabs'
  const [viewMode, setViewMode] = useState<'split' | 'tabs'>('split');
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch topics khi selectedCourseId thay đổi (Cascading Dropdown)
  useEffect(() => {
    if (!selectedCourseId) {
      setTopics([]);
      setSelectedTopicId('');
      return;
    }

    const fetchTopicsForCourse = async () => {
      try {
        setLoadingTopics(true);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const res = await fetch(`${apiBaseUrl}/admin/topics-by-course/${selectedCourseId}`, {
          headers,
        });
        if (res.ok) {
          const data: TopicOption[] = await res.json();
          setTopics(data);
          // Giữ topicId ban đầu nếu thuộc course này, ngược lại reset
          if (initialData?.topic_id && data.some((t) => t.id === initialData.topic_id)) {
            setSelectedTopicId(initialData.topic_id);
          } else if (data.length > 0 && !selectedTopicId) {
            setSelectedTopicId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Lỗi tải topics theo course:', err);
      } finally {
        setLoadingTopics(false);
      }
    };

    fetchTopicsForCourse();
  }, [selectedCourseId, apiBaseUrl, authToken]);

  // Khởi tạo form data khi modal mở hoặc initialData thay đổi
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setType(initialData.type || 'READING');
        setContent(initialData.content || '');
        setFileUrl(initialData.file_url || '');
        setReadingTime(initialData.reading_time ?? 5);
        setOrderIndex(initialData.order_index ?? 0);
        if (initialData.course_id) {
          setSelectedCourseId(initialData.course_id);
        }
        if (initialData.topic_id) {
          setSelectedTopicId(initialData.topic_id);
        }
      } else {
        // Tạo mới
        setTitle('');
        setType('READING');
        setContent(
          '# Giới thiệu bài học\n\nNội dung lý thuyết bắt đầu tại đây...\n\n### Ví dụ minh họa:\n```typescript\nfunction helloWorld(): string {\n  return "SmartStudy AI";\n}\n```\n\n> [!NOTE]\n> Lưu ý ghi nhớ kiến thức trọng tâm.'
        );
        setFileUrl('');
        setReadingTime(5);
        setOrderIndex(0);
        if (initialCourseId) setSelectedCourseId(initialCourseId);
        if (initialTopicId) setSelectedTopicId(initialTopicId);
      }
      setErrorMessage('');
    }
  }, [isOpen, initialData, initialCourseId, initialTopicId]);

  // Toolbar Helpers
  const insertSnippet = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = document.getElementById('markdown-textarea') as HTMLTextAreaElement | null;
    if (!textarea) {
      setContent((prev) => prev + prefix + defaultText + suffix);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selected = current.substring(start, end) || defaultText;
    const nextValue = current.substring(0, start) + prefix + selected + suffix + current.substring(end);

    setContent(nextValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) {
      setErrorMessage('Vui lòng chọn môn học và chủ đề bài học');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Tiêu đề tài liệu không được để trống');
      return;
    }
    if (!content.trim()) {
      setErrorMessage('Nội dung tài liệu không được để trống');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onSave({
        id: initialData?.id,
        course_id: selectedCourseId ? Number(selectedCourseId) : undefined,
        topic_id: Number(selectedTopicId),
        title: title.trim(),
        type,
        content: content.trim(),
        file_url: fileUrl.trim() || null,
        reading_time: Number(readingTime) || 5,
        order_index: Number(orderIndex) || 0,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể lưu tài liệu học tập');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render HTML preview đơn giản, an toàn cho Markdown
  const renderedPreview = useMemo(() => {
    if (!content) return '<p class="text-gray-400 italic">Nội dung xem trước sẽ hiển thị tại đây...</p>';

    let html = content
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-gray-900 mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-5 mb-2 pb-1 border-b">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold text-indigo-700 mt-6 mb-3">$1</h1>')
      .replace(/^\> \[!NOTE\]\s*(.*$)/gim, '<div class="p-3 my-2 bg-blue-50 border-l-4 border-blue-500 text-blue-900 text-sm rounded-r"><strong>Lưu ý:</strong> $1</div>')
      .replace(/^\> \[!TIP\]\s*(.*$)/gim, '<div class="p-3 my-2 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900 text-sm rounded-r"><strong>Mẹo:</strong> $1</div>')
      .replace(/^\> \[!WARNING\]\s*(.*$)/gim, '<div class="p-3 my-2 bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-sm rounded-r"><strong>Cảnh báo:</strong> $1</div>')
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 pl-4 py-1 my-2 text-gray-600 italic">$1</blockquote>')
      .replace(/```([a-z]*)\n([\s\S]*?)```/gim, '<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg my-3 overflow-x-auto text-xs font-mono"><code>$2</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
      .replace(/\*\*([^*]+)\*\*/gim, '<strong class="font-bold text-gray-900">$1</strong>')
      .replace(/\*([^*]+)\*/gim, '<em class="italic">$1</em>')
      .replace(/^\- (.*$)/gim, '<li class="ml-5 list-disc text-gray-700 my-1">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-5 list-decimal text-gray-700 my-1">$1</li>')
      .replace(/\n\n/gim, '<p class="my-3 text-gray-800 leading-relaxed"></p>');

    return html;
  }, [content]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-2 sm:p-4"
    >
      <div
        className={`relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'max-w-5xl w-full h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/75">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {initialData?.id ? 'Chỉnh sửa Tài liệu Học tập' : 'Biên soạn Tài liệu Học tập Mới'}
              </h2>
              <p className="text-xs text-gray-500">
                Hỗ trợ định dạng Markdown thời gian thực với phân loại bài giảng đa phương tiện
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Metadata Section (Cascading Dropdowns & Details) */}
          <div className="p-5 border-b border-gray-200 bg-white grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            {/* Cascading Dropdown 1: Môn học (Course) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                1. Môn học <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  const cId = e.target.value ? Number(e.target.value) : '';
                  setSelectedCourseId(cId);
                  setSelectedTopicId('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Chọn Môn học --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cascading Dropdown 2: Chủ đề (Topic) - Bị disabled nếu chưa chọn Course */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                2. Chủ đề (Topic) <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value ? Number(e.target.value) : '')}
                disabled={!selectedCourseId || loadingTopics}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {!selectedCourseId ? (
                  <option value="">-- Vui lòng chọn môn học trước --</option>
                ) : loadingTopics ? (
                  <option value="">Đang tải danh sách chủ đề...</option>
                ) : topics.length === 0 ? (
                  <option value="">Chưa có chủ đề nào trong môn này</option>
                ) : (
                  <>
                    <option value="">-- Chọn Chủ đề --</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.order_index} - {t.title}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Phân loại tài liệu (Type) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Phân loại bài học
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MaterialType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="READING">📖 Bài đọc lý thuyết (READING)</option>
                <option value="VIDEO">🎥 Video bài giảng (VIDEO)</option>
                <option value="DOCUMENT_URL">🌐 Tài liệu tham khảo (DOCUMENT_URL)</option>
                <option value="CODE_SNIPPET">💻 Code mẫu thực hành (CODE_SNIPPET)</option>
              </select>
            </div>

            {/* Thời lượng đọc ước tính & Thứ tự */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Đọc (phút)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={readingTime}
                  onChange={(e) => setReadingTime(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Thứ tự bài
                </label>
                <input
                  type="number"
                  min="0"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Tiêu đề tài liệu */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tiêu đề tài liệu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Cấp phát bộ nhớ Heap và Con trỏ thông minh"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* URL tài liệu / video */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                URL đính kèm (tùy chọn)
              </label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://youtu.be/... hoặc link tài liệu"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Markdown Editor Toolbar & Mode Switcher */}
          <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
            {/* Quick Formatting Buttons */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => insertSnippet('**', '**', 'chữ đậm')}
                className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-200 rounded"
                title="In đậm (Bold)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('*', '*', 'chữ nghiêng')}
                className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-200 rounded"
                title="In nghiêng (Italic)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('## ', '', 'Tiêu đề')}
                className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-200 rounded"
                title="Tiêu đề (Heading 2)"
              >
                <Heading className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('```typescript\n', '\n```', '// Mã nguồn')}
                className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-200 rounded"
                title="Khối code (Code block)"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('- ', '', 'Mục danh sách')}
                className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-200 rounded"
                title="Danh sách gạch đầu dòng"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('[', '](https://example.com)', 'Tên đường dẫn')}
                className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-200 rounded"
                title="Chèn liên kết (Link)"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('> [!NOTE]\n> ', '', 'Ghi chú quan trọng')}
                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold"
                title="Hộp chú thích (Callout Note)"
              >
                [NOTE]
              </button>
            </div>

            {/* View Mode Toggle: Split View vs Tabs */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-gray-200 p-0.5 rounded-lg text-xs font-medium text-gray-700">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`flex items-center px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === 'split' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : ''
                  }`}
                >
                  <Columns className="w-3.5 h-3.5 mr-1" />
                  Split View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('tabs')}
                  className={`flex items-center px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === 'tabs' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : ''
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Chế độ Tabs
                </button>
              </div>

              {viewMode === 'tabs' && (
                <div className="flex items-center space-x-1 border-l border-gray-300 pl-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('write')}
                    className={`px-2.5 py-1 text-xs rounded font-medium ${
                      activeTab === 'write' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Soạn thảo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-2.5 py-1 text-xs rounded font-medium ${
                      activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Xem trước
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Editor Workspace (Split or Tabs) */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 relative">
            {/* Left: Markdown Input */}
            <div
              className={`h-full flex flex-col p-4 border-r border-gray-200 overflow-hidden ${
                viewMode === 'tabs' && activeTab !== 'write' ? 'hidden' : 'block'
              } ${viewMode === 'tabs' ? 'md:col-span-2' : ''}`}
            >
              <textarea
                id="markdown-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung bài đọc bằng cú pháp Markdown..."
                className="w-full h-full p-3 font-mono text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white leading-relaxed"
              />
            </div>

            {/* Right: Live Preview */}
            <div
              className={`h-full flex flex-col p-4 overflow-y-auto bg-white ${
                viewMode === 'tabs' && activeTab !== 'preview' ? 'hidden' : 'block'
              } ${viewMode === 'tabs' ? 'md:col-span-2' : ''}`}
            >
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between pb-1 border-b border-gray-100">
                <span>Xem trước thời gian thực (Live Preview)</span>
                <span className="text-indigo-600 font-medium lowercase">~{readingTime} phút đọc</span>
              </div>
              <div
                className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-sans"
                dangerouslySetInnerHTML={{ __html: renderedPreview }}
              />
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="px-6 py-2.5 bg-red-50 border-t border-red-200 flex items-center space-x-2 text-xs font-medium text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {content.length} ký tự | {content.split(/\s+/).filter(Boolean).length} từ
            </span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Xuất bản bài học
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


