import React, { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  ListOrdered,
  Clock,
  Layers,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  FileQuestion,
  Check,
} from 'lucide-react';
import DataTable, { Column } from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import ConfirmDeleteModal, { CascadeDetail } from '../components/ConfirmDeleteModal';
import Breadcrumb from '../components/Breadcrumb';
import { useToast } from '../components/Toast';

export interface QuizItem {
  id: number;
  topic_id: number;
  topic_title: string;
  course_id: number;
  course_code: string;
  course_name: string;
  title: string;
  description?: string | null;
  time_limit_minutes: number;
  created_at: string;
  questions_count: number;
  attempts_count: number;
}

export interface QuestionItem {
  id: number;
  quiz_id: number;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation?: string | null;
  skill_tag: string;
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

interface QuizzesPageProps {
  apiBaseUrl?: string;
  authToken?: string;
  initialCourseId?: number | null;
  initialTopicId?: number | null;
  onNavigateToCourses?: () => void;
  onNavigateToTopics?: (courseId?: number) => void;
}

export default function QuizzesPage({
  apiBaseUrl = '/api',
  authToken,
  initialCourseId,
  initialTopicId,
  onNavigateToCourses,
  onNavigateToTopics,
}: QuizzesPageProps) {
  const { showSuccess, showError } = useToast();

  // Quizzes Data States
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [filterTopics, setFilterTopics] = useState<TopicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cascading Filters
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>(initialCourseId || '');
  const [selectedTopicId, setSelectedTopicId] = useState<number | ''>(initialTopicId || '');

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');

  // Modal Thêm / Sửa Quiz
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<QuizItem | null>(null);
  const [quizCourseId, setQuizCourseId] = useState<number | ''>('');
  const [quizTopicId, setQuizTopicId] = useState<number | ''>('');
  const [modalTopics, setModalTopics] = useState<TopicOption[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState('15');
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizError, setQuizError] = useState('');

  // Modal Xóa Quiz kèm Cascade Warning
  const [deleteQuizModalOpen, setDeleteQuizModalOpen] = useState(false);
  const [deletingQuiz, setDeletingQuiz] = useState<QuizItem | null>(null);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const [cascadeWarning, setCascadeWarning] = useState('');
  const [cascadeDetails, setCascadeDetails] = useState<CascadeDetail[]>([]);
  const [isDeletingQuiz, setIsDeletingQuiz] = useState(false);

  // Drawer Quản lý Câu hỏi trong Quiz (Questions Drawer)
  const [activeQuizForQuestions, setActiveQuizForQuestions] = useState<QuizItem | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Modal Thêm / Sửa Question
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [qText, setQText] = useState('');
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  const [qSkillTag, setQSkillTag] = useState('');
  const [qSubmitting, setQSubmitting] = useState(false);
  const [qError, setQError] = useState('');

  // Headers helper
  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  }, [authToken]);

  // Fetch Courses options
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

  // Fetch Topics cho Filter khi selectedCourseId thay đổi
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
        console.error('Lỗi tải topics filter:', err);
      }
    };
    fetchTopicsForFilter();
  }, [selectedCourseId, apiBaseUrl, authHeaders]);

  // Fetch Topics cho Modal khi quizCourseId thay đổi
  useEffect(() => {
    if (!quizCourseId) {
      setModalTopics([]);
      setQuizTopicId('');
      return;
    }

    const fetchTopicsForModal = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/admin/topics-by-course/${quizCourseId}`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setModalTopics(data);
          if (editingQuiz?.topic_id && data.some((t: TopicOption) => t.id === editingQuiz.topic_id)) {
            setQuizTopicId(editingQuiz.topic_id);
          } else if (data.length > 0 && !quizTopicId) {
            setQuizTopicId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Lỗi tải topics modal:', err);
      }
    };
    fetchTopicsForModal();
  }, [quizCourseId, apiBaseUrl, authHeaders, editingQuiz]);

  // Fetch Quizzes
  const fetchQuizzes = useCallback(async () => {
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

      const res = await fetch(`${apiBaseUrl}/admin/quizzes?${params.toString()}`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Lỗi máy chủ: ${res.status}`);
      }

      const json = await res.json();
      setQuizzes(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalRecords(json.pagination?.totalRecords || 0);
    } catch (err: any) {
      console.error('Lỗi tải danh sách quiz:', err);
      setError(err.message || 'Không thể tải danh sách bài kiểm tra');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, page, limit, search, selectedCourseId, selectedTopicId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // Mở modal tạo mới Quiz
  const handleOpenCreateQuiz = () => {
    setEditingQuiz(null);
    setQuizCourseId(selectedCourseId || (courses.length > 0 ? courses[0].id : ''));
    setQuizTopicId(selectedTopicId || '');
    setQuizTitle('');
    setQuizDesc('');
    setQuizTimeLimit('15');
    setQuizError('');
    setIsQuizModalOpen(true);
  };

  // Mở modal sửa Quiz
  const handleOpenEditQuiz = (quiz: QuizItem) => {
    setEditingQuiz(quiz);
    setQuizCourseId(quiz.course_id);
    setQuizTopicId(quiz.topic_id);
    setQuizTitle(quiz.title);
    setQuizDesc(quiz.description || '');
    setQuizTimeLimit(quiz.time_limit_minutes.toString());
    setQuizError('');
    setIsQuizModalOpen(true);
  };

  // Lưu Quiz
  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTopicId) {
      setQuizError('Vui lòng chọn môn học và chủ đề liên kết');
      return;
    }
    if (!quizTitle.trim()) {
      setQuizError('Tiêu đề bài kiểm tra không được để trống');
      return;
    }

    try {
      setQuizSubmitting(true);
      setQuizError('');

      const bodyData = {
        topic_id: Number(quizTopicId),
        title: quizTitle.trim(),
        description: quizDesc.trim() || null,
        time_limit_minutes: parseInt(quizTimeLimit, 10) || 15,
      };

      const url = editingQuiz
        ? `${apiBaseUrl}/admin/quizzes/${editingQuiz.id}`
        : `${apiBaseUrl}/admin/quizzes`;
      const method = editingQuiz ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Lỗi khi lưu bài kiểm tra');
      }

      setIsQuizModalOpen(false);
      showSuccess(editingQuiz ? 'Cập nhật thành công' : 'Tạo Quiz thành công', `Bài kiểm tra "${bodyData.title}" đã được lưu.`);
      fetchQuizzes();
    } catch (err: any) {
      setQuizError(err.message || 'Không thể lưu bài kiểm tra');
    } finally {
      setQuizSubmitting(false);
    }
  };

  // Mở modal xóa Quiz kèm Cascade Info
  const handleOpenDeleteQuiz = async (quiz: QuizItem) => {
    setDeletingQuiz(quiz);
    setDeleteQuizModalOpen(true);
    setCascadeWarning('');
    setCascadeDetails([]);

    try {
      setCascadeLoading(true);
      const res = await fetch(`${apiBaseUrl}/admin/quizzes/${quiz.id}/cascade-info`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const info = await res.json();
        setCascadeWarning(info.warning_message);
        setCascadeDetails([
          { label: 'Câu hỏi trắc nghiệm', count: info.questions_count },
          { label: 'Lượt làm bài học viên', count: info.attempts_count },
        ]);
      }
    } catch (err) {
      console.error('Lỗi lấy cascade info quiz:', err);
    } finally {
      setCascadeLoading(false);
    }
  };

  // Xác nhận Xóa Quiz
  const handleConfirmDeleteQuiz = async () => {
    if (!deletingQuiz) return;

    try {
      setIsDeletingQuiz(true);
      const res = await fetch(`${apiBaseUrl}/admin/quizzes/${deletingQuiz.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Xóa bài kiểm tra không thành công');
      }

      setDeleteQuizModalOpen(false);
      showSuccess('Đã xóa Quiz', `Bài kiểm tra "${deletingQuiz.title}" đã được xóa.`);
      setDeletingQuiz(null);
      fetchQuizzes();
    } catch (err: any) {
      showError('Không thể xóa bài kiểm tra', err.message);
    } finally {
      setIsDeletingQuiz(false);
    }
  };

  // ==========================================
  // QUẢN LÝ CÂU HỎI TRONG QUIZ (QUESTIONS DRAWER)
  // ==========================================

  const fetchQuestionsOfQuiz = async (quizId: number) => {
    try {
      setLoadingQuestions(true);
      const res = await fetch(`${apiBaseUrl}/admin/quizzes/${quizId}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Lỗi tải câu hỏi quiz:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleOpenQuestionsDrawer = (quiz: QuizItem) => {
    setActiveQuizForQuestions(quiz);
    fetchQuestionsOfQuiz(quiz.id);
  };

  // Mở modal thêm câu hỏi mới
  const handleOpenCreateQuestion = () => {
    setEditingQuestion(null);
    setQText('');
    setQOptA('');
    setQOptB('');
    setQOptC('');
    setQOptD('');
    setQCorrectIndex(0);
    setQExplanation('');
    setQSkillTag('');
    setQError('');
    setIsQuestionModalOpen(true);
  };

  // Mở modal sửa câu hỏi
  const handleOpenEditQuestion = (q: QuestionItem) => {
    setEditingQuestion(q);
    setQText(q.question_text);
    setQOptA(q.options[0] || '');
    setQOptB(q.options[1] || '');
    setQOptC(q.options[2] || '');
    setQOptD(q.options[3] || '');
    setQCorrectIndex(q.correct_option_index);
    setQExplanation(q.explanation || '');
    setQSkillTag(q.skill_tag);
    setQError('');
    setIsQuestionModalOpen(true);
  };

  // Lưu câu hỏi (create hoặc update)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuizForQuestions) return;

    if (!qText.trim()) {
      setQError('Nội dung câu hỏi không được để trống');
      return;
    }
    const opts = [qOptA.trim(), qOptB.trim(), qOptC.trim(), qOptD.trim()].filter(Boolean);
    if (opts.length < 2) {
      setQError('Phải nhập ít nhất 2 đáp án lựa chọn');
      return;
    }
    if (qCorrectIndex >= opts.length) {
      setQError('Chỉ số đáp án đúng vượt quá số lượng đáp án đã nhập');
      return;
    }

    try {
      setQSubmitting(true);
      setQError('');

      const bodyData = {
        quiz_id: activeQuizForQuestions.id,
        question_text: qText.trim(),
        options: opts,
        correct_option_index: qCorrectIndex,
        explanation: qExplanation.trim() || null,
        skill_tag: qSkillTag.trim() || 'kien_thuc_chung',
      };

      const url = editingQuestion
        ? `${apiBaseUrl}/admin/questions/${editingQuestion.id}`
        : `${apiBaseUrl}/admin/questions`;
      const method = editingQuestion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Lỗi khi lưu câu hỏi');
      }

      setIsQuestionModalOpen(false);
      showSuccess(editingQuestion ? 'Cập nhật câu hỏi' : 'Đã thêm câu hỏi mới', 'Nội dung câu hỏi và đáp án đã được lưu.');
      fetchQuestionsOfQuiz(activeQuizForQuestions.id);
      fetchQuizzes();
    } catch (err: any) {
      setQError(err.message || 'Không thể lưu câu hỏi');
    } finally {
      setQSubmitting(false);
    }
  };

  // Xóa câu hỏi
  const handleDeleteQuestion = async (qId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return;
    if (!activeQuizForQuestions) return;

    try {
      const res = await fetch(`${apiBaseUrl}/admin/questions/${qId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        showSuccess('Đã xóa câu hỏi', 'Câu hỏi trắc nghiệm đã được xóa khỏi đề.');
        fetchQuestionsOfQuiz(activeQuizForQuestions.id);
        fetchQuizzes();
      }
    } catch (err) {
      console.error('Lỗi xóa câu hỏi:', err);
    }
  };

  // Columns Quiz Table
  const columns: Column<QuizItem>[] = [
    {
      key: 'title',
      header: 'Tiêu đề Quiz',
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
    {
      key: 'time_limit_minutes',
      header: 'Thời gian',
      width: '110px',
      render: (item) => (
        <div className="flex items-center space-x-1 text-xs text-gray-700">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>{item.time_limit_minutes} phút</span>
        </div>
      ),
    },
    {
      key: 'questions_count',
      header: 'Số câu hỏi',
      width: '110px',
      render: (item) => (
        <span className="font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
          {item.questions_count} câu
        </span>
      ),
    },
    {
      key: 'attempts_count',
      header: 'Lượt làm bài',
      width: '110px',
      render: (item) => (
        <span className="text-xs text-gray-600 font-medium">
          {item.attempts_count} lượt
        </span>
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
          { label: 'Bài kiểm tra (Quizzes)' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <HelpCircle className="w-6 h-6 text-indigo-600" />
            <span>Quản lý Bài kiểm tra & Bộ câu hỏi</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Thiết kế bài đánh giá năng lực, soạn câu hỏi trắc nghiệm đa lựa chọn và gắn nhãn kỹ năng (skill_tag)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateQuiz}
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Tạo Quiz mới
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Tìm theo tiêu đề quiz..."
            className="w-full"
          />

          {/* Cascading Filter Môn học */}
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

          {/* Cascading Filter Chủ đề */}
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
      <DataTable<QuizItem>
        columns={columns}
        data={quizzes}
        loading={loading}
        emptyMessage="Không có bài kiểm tra nào phù hợp."
        keyExtractor={(item) => item.id}
        actions={(item) => (
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => handleOpenQuestionsDrawer(item)}
              title="Quản lý câu hỏi trong bài quiz"
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors"
            >
              <ListOrdered className="w-3.5 h-3.5 mr-1" />
              Câu hỏi ({item.questions_count})
            </button>
            <button
              type="button"
              onClick={() => handleOpenEditQuiz(item)}
              title="Chỉnh sửa quiz"
              className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenDeleteQuiz(item)}
              title="Xóa quiz"
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

      {/* Modal Thêm / Chỉnh sửa Quiz */}
      {isQuizModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">
                {editingQuiz ? 'Cập nhật Bài Kiểm Tra' : 'Tạo Bài Kiểm Tra Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsQuizModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  1. Môn học <span className="text-red-500">*</span>
                </label>
                <select
                  value={quizCourseId}
                  onChange={(e) => {
                    const cId = e.target.value ? Number(e.target.value) : '';
                    setQuizCourseId(cId);
                    setQuizTopicId('');
                  }}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Chọn Môn học --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  2. Chủ đề (Topic) <span className="text-red-500">*</span>
                </label>
                <select
                  value={quizTopicId}
                  onChange={(e) => setQuizTopicId(e.target.value ? Number(e.target.value) : '')}
                  disabled={!quizCourseId}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  required
                >
                  {!quizCourseId ? (
                    <option value="">-- Vui lòng chọn môn học trước --</option>
                  ) : modalTopics.length === 0 ? (
                    <option value="">Chưa có chủ đề nào</option>
                  ) : (
                    <>
                      <option value="">-- Chọn Chủ đề --</option>
                      {modalTopics.map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.order_index} - {t.title}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tiêu đề bài kiểm tra <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="VD: Kiểm tra kiến thức Con trỏ & Cấp phát bộ nhớ"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Thời lượng làm bài (phút)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={quizTimeLimit}
                    onChange={(e) => setQuizTimeLimit(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mô tả hướng dẫn làm bài
                </label>
                <textarea
                  value={quizDesc}
                  onChange={(e) => setQuizDesc(e.target.value)}
                  rows={2}
                  placeholder="Hướng dẫn cho học viên trước khi bắt đầu bấm giờ..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {quizError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg font-medium">
                  {quizError}
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsQuizModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={quizSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center"
                >
                  {quizSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingQuiz ? 'Lưu thay đổi' : 'Tạo bài kiểm tra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer Quản lý Câu hỏi trong Quiz */}
      {activeQuizForQuestions && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-3 sm:p-6"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                  Ngân hàng câu hỏi
                </span>
                <h3 className="font-bold text-gray-900 text-lg">
                  {activeQuizForQuestions.title}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleOpenCreateQuestion}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Thêm câu hỏi
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQuizForQuestions(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingQuestions ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-500">
                  <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                  <span className="text-sm font-medium">Đang tải câu hỏi...</span>
                </div>
              ) : questions.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-3">
                  <FileQuestion className="w-10 h-10 mx-auto opacity-50" />
                  <p className="text-sm">Chưa có câu hỏi nào trong đề quiz này.</p>
                  <button
                    type="button"
                    onClick={handleOpenCreateQuestion}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
                  >
                    + Soạn câu hỏi đầu tiên
                  </button>
                </div>
              ) : (
                questions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors bg-white shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2.5">
                        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          Câu {qIdx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-snug">
                            {q.question_text}
                          </p>
                          <span className="inline-block mt-1 text-xs font-mono font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Tag: #{q.skill_tag}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestion(q)}
                          title="Sửa câu hỏi"
                          className="p-1.5 text-gray-500 hover:text-indigo-600 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          title="Xóa câu hỏi"
                          className="p-1.5 text-red-500 hover:text-red-700 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = optIdx === q.correct_option_index;
                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-lg border flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-gray-50 border-gray-200 text-gray-700'
                            }`}
                          >
                            <span>
                              <strong>{String.fromCharCode(65 + optIdx)}.</strong> {opt}
                            </span>
                            {isCorrect && (
                              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">
                                Đúng
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="p-2.5 bg-amber-50/70 border-l-2 border-amber-400 text-xs text-amber-900 rounded-r">
                        <strong>Giải thích:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3.5 bg-gray-50 border-t flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Tổng số: <strong>{questions.length}</strong> câu hỏi
              </span>
              <button
                type="button"
                onClick={() => setActiveQuizForQuestions(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm / Sửa Question */}
      {isQuestionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">
                {editingQuestion ? 'Chỉnh sửa Câu hỏi' : 'Soạn Câu hỏi Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nội dung câu hỏi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                  rows={2}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  required
                />
              </div>

              {/* 4 Lựa chọn đáp án A, B, C, D */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Các lựa chọn đáp án (tối thiểu 2) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {[
                    { label: 'A', val: qOptA, set: setQOptA, idx: 0 },
                    { label: 'B', val: qOptB, set: setQOptB, idx: 1 },
                    { label: 'C', val: qOptC, set: setQOptC, idx: 2 },
                    { label: 'D', val: qOptD, set: setQOptD, idx: 3 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`optRadio-${item.label}`}
                        name="correctOptionRadio"
                        checked={qCorrectIndex === item.idx}
                        onChange={() => setQCorrectIndex(item.idx)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor={`optRadio-${item.label}`} className="font-bold w-5 text-gray-700">
                        {item.label}:
                      </label>
                      <input
                        type="text"
                        value={item.val}
                        onChange={(e) => item.set(e.target.value)}
                        placeholder={`Nội dung đáp án ${item.label}`}
                        className={`flex-1 px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 ${
                          qCorrectIndex === item.idx
                            ? 'border-emerald-500 bg-emerald-50/30'
                            : 'border-gray-300'
                        }`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 italic">
                  * Nhấp vào nút tròn radio bên cạnh để chọn đáp án đúng.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Thẻ kỹ năng (skill_tag) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={qSkillTag}
                    onChange={(e) => setQSkillTag(e.target.value)}
                    placeholder="VD: khai_bao_con_tro, heap_memory"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Giải thích đáp án chi tiết
                </label>
                <textarea
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="Giải thích lý do tại sao đáp án này đúng để hỗ trợ học viên..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {qError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg font-medium">
                  {qError}
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={qSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center"
                >
                  {qSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Lưu câu hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xóa Quiz kèm Cascade Warning */}
      <ConfirmDeleteModal
        isOpen={deleteQuizModalOpen}
        title="Xóa Bài Kiểm Tra"
        itemTitle={deletingQuiz ? deletingQuiz.title : ''}
        warningMessage={cascadeWarning}
        cascadeDetails={cascadeDetails}
        isLoading={isDeletingQuiz || cascadeLoading}
        onConfirm={handleConfirmDeleteQuiz}
        onClose={() => setDeleteQuizModalOpen(false)}
      />
    </div>
  );
}

