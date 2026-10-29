import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Check,
  Clock,
  AlertCircle,
  Calendar,
  BookOpen,
  Plus,
  X,
  GraduationCap,
  Award,
  Info,
} from 'lucide-react-native';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY } from '../src/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axiosClient from '../src/api/axiosClient';
import { Task, Enrollment } from '../src/types';

type AcademicTab = 'TASKS' | 'GRADES';
type TaskFilter = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE';

export default function AcademicScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Tab chính dạng Segmented Control
  const [activeTab, setActiveTab] = useState<AcademicTab>('TASKS');

  // State Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('ALL');
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  // State Grades & Enrollments
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  // State chung
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal tạo Task
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);
  const [dueDays, setDueDays] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchAcademicData = async () => {
    try {
      setErrorMsg('');
      const [tasksRes, enrollmentsRes] = await Promise.allSettled([
        axiosClient.get('/tasks'),
        axiosClient.get('/courses/my-courses'),
      ]);

      if (tasksRes.status === 'fulfilled') {
        setTasks(tasksRes.value.data || []);
      }
      if (enrollmentsRes.status === 'fulfilled') {
        const enrolls: Enrollment[] = enrollmentsRes.value.data || [];
        setEnrollments(enrolls);
        if (enrolls.length > 0 && !selectedEnrollmentId) {
          setSelectedEnrollmentId(enrolls[0].id);
        }
      }
    } catch (err: any) {
      setErrorMsg('Không thể tải đầy đủ dữ liệu học vụ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAcademicData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAcademicData();
  };

  // Toggle trạng thái Task bằng Checkbox hình tròn
  const handleToggleTaskDone = async (task: Task) => {
    if (updatingTaskId) return;
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';

    try {
      setUpdatingTaskId(task.id);
      await axiosClient.patch(`/tasks/${task.id}/status`, { status: nextStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật trạng thái nhiệm vụ');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Tạo Task mới
  const handleCreateTask = async () => {
    if (!newTitle.trim()) {
      setFormError('Vui lòng nhập tiêu đề nhiệm vụ');
      return;
    }
    if (!selectedEnrollmentId) {
      setFormError('Vui lòng chọn môn học tương ứng');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dueDays);
      targetDate.setHours(23, 59, 59, 0);

      const payload = {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        due_date: targetDate.toISOString(),
        enrollment_id: selectedEnrollmentId,
      };

      const res = await axiosClient.post('/tasks', payload);
      const createdTask: Task = res.data;

      const matchedEnroll = enrollments.find((e) => e.id === selectedEnrollmentId);
      if (matchedEnroll) {
        createdTask.enrollment = matchedEnroll;
      }

      setTasks((prev) => [createdTask, ...prev]);
      setIsModalVisible(false);
      setNewTitle('');
      setNewDesc('');
      setDueDays(3);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Lỗi khi tạo nhiệm vụ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === 'ALL') return true;
    return task.status === taskFilter;
  });

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}/${date.getFullYear()}`;
    } catch {
      return isoString;
    }
  };

  // Tính GPA tích lũy
  let totalCreditsWithGrades = 0;
  let totalWeightedScoreCredits = 0;
  let totalEnrolledCredits = 0;

  enrollments.forEach((e) => {
    const credits = e.course?.credits || 0;
    totalEnrolledCredits += credits;
    if (e.summary?.currentAverageScore !== null && e.summary?.currentAverageScore !== undefined) {
      totalWeightedScoreCredits += e.summary.currentAverageScore * credits;
      totalCreditsWithGrades += credits;
    }
  });

  const overallGpa =
    totalCreditsWithGrades > 0
      ? (totalWeightedScoreCredits / totalCreditsWithGrades).toFixed(2)
      : null;

  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return COLORS.textSecondary;
    if (score >= 8.0) return COLORS.success;
    if (score >= 6.5) return COLORS.primary;
    if (score >= 5.0) return COLORS.warning;
    return COLORS.error;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin học vụ...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Học vụ & Điểm số</Text>
        {activeTab === 'TASKS' ? (
          <TouchableOpacity
            style={styles.headerActionBtn}
            activeOpacity={0.7}
            onPress={() => setIsModalVisible(true)}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.headerActionText}>Thêm</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* SEGMENTED CONTROL CONTAINER (MÀU XÁM NHẠT #E5E7EB, NÚT ACTIVE NỀN TRẮNG ĐỔ BÓNG) */}
      <View style={styles.segmentedWrapper}>
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'TASKS' && styles.segmentBtnActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('TASKS')}
          >
            <CheckCircle2 size={16} color={activeTab === 'TASKS' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.segmentText, activeTab === 'TASKS' && styles.segmentTextActive]}>
              Nhiệm vụ ({tasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'GRADES' && styles.segmentBtnActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('GRADES')}
          >
            <GraduationCap size={16} color={activeTab === 'GRADES' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.segmentText, activeTab === 'GRADES' && styles.segmentTextActive]}>
              Bảng điểm ({enrollments.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {errorMsg ? (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color={COLORS.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* ----------------- TAB 1: DANH SÁCH NHIỆM VỤ (TO-DO) ----------------- */}
        {activeTab === 'TASKS' && (
          <View>
            {/* Bộ lọc con theo trạng thái */}
            <View style={styles.subFilterRow}>
              {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as TaskFilter[]).map((st) => {
                const isActive = taskFilter === st;
                const label =
                  st === 'ALL'
                    ? 'Tất cả'
                    : st === 'TODO'
                    ? 'Cần làm'
                    : st === 'IN_PROGRESS'
                    ? 'Đang làm'
                    : 'Đã xong';

                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.subFilterChip, isActive && styles.subFilterChipActive]}
                    activeOpacity={0.7}
                    onPress={() => setTaskFilter(st)}
                  >
                    <Text style={[styles.subFilterText, isActive && styles.subFilterTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Danh sách các Cards Nhiệm vụ có Checkbox tròn */}
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const isDone = task.status === 'DONE';
                const isOverdue = !isDone && new Date(task.due_date) < new Date();
                const isUpdating = updatingTaskId === task.id;

                return (
                  <View key={task.id} style={[styles.todoCard, isDone && styles.todoCardDone]}>
                    {/* Checkbox hình tròn */}
                    <TouchableOpacity
                      style={[styles.roundCheckbox, isDone && styles.roundCheckboxChecked]}
                      activeOpacity={0.6}
                      disabled={isUpdating}
                      onPress={() => handleToggleTaskDone(task)}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color={isDone ? '#FFFFFF' : COLORS.primary} />
                      ) : isDone ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : null}
                    </TouchableOpacity>

                    {/* Nội dung Task */}
                    <View style={styles.todoContent}>
                      <View style={styles.todoHeaderRow}>
                        <View style={styles.courseTagBadge}>
                          <Text style={styles.courseTagText}>
                            {task.enrollment?.course?.code || 'Môn học'}
                          </Text>
                        </View>
                        {isOverdue ? (
                          <View style={styles.overdueBadge}>
                            <Text style={styles.overdueText}>Quá hạn</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text
                        style={[
                          styles.todoTitle,
                          isDone && styles.todoTitleDone,
                        ]}
                      >
                        {task.title}
                      </Text>

                      {task.description ? (
                        <Text
                          style={[
                            styles.todoDesc,
                            isDone && styles.todoDescDone,
                          ]}
                          numberOfLines={2}
                        >
                          {task.description}
                        </Text>
                      ) : null}

                      {/* Hạn nộp */}
                      <View style={styles.todoFooter}>
                        <View style={styles.dueRow}>
                          <Calendar size={13} color={isOverdue ? COLORS.error : COLORS.textSecondary} />
                          <Text style={[styles.dueText, isOverdue && { color: COLORS.error, fontWeight: '700' }]}>
                            Hạn nộp: {formatDate(task.due_date)}
                          </Text>
                        </View>

                        <Text style={styles.statusIndicatorText}>
                          {isDone ? '● Đã hoàn thành' : task.status === 'IN_PROGRESS' ? '● Đang làm' : '● Cần làm'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <CheckCircle2 size={42} color={COLORS.textSecondary} />
                <Text style={styles.emptyTitle}>Không có nhiệm vụ nào</Text>
                <Text style={styles.emptyDesc}>
                  {taskFilter === 'ALL'
                    ? 'Bạn chưa tạo nhiệm vụ nào. Bấm nút "+ Thêm" ở trên để tạo To-do ôn thi hoặc đồ án.'
                    : `Không có nhiệm vụ nào ở trạng thái này.`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ----------------- TAB 2: BẢNG ĐIỂM MÔN HỌC (GRADES) ----------------- */}
        {activeTab === 'GRADES' && (
          <View>
            {/* Card Thống kê Tổng quan GPA */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleRow}>
                  <Award size={20} color={COLORS.primary} />
                  <Text style={styles.summaryTitle}>Tổng quan thành tích</Text>
                </View>
                <View style={styles.gpaBadge}>
                  <Text style={styles.gpaBadgeLabel}>ĐTB Tích lũy</Text>
                  <Text style={styles.gpaBadgeValue}>{overallGpa ? `${overallGpa} / 10` : 'Chưa có'}</Text>
                </View>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryBoxValue}>{totalEnrolledCredits}</Text>
                  <Text style={styles.summaryBoxLabel}>Tổng số tín chỉ</Text>
                </View>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryBoxValue}>{enrollments.length}</Text>
                  <Text style={styles.summaryBoxLabel}>Môn đang học</Text>
                </View>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryBoxValue}>
                    {enrollments.filter((e) => e.summary?.isFinalScore).length}
                  </Text>
                  <Text style={styles.summaryBoxLabel}>Môn đủ điểm</Text>
                </View>
              </View>
            </View>

            {/* Danh sách Bảng điểm từng Môn học */}
            {enrollments.length > 0 ? (
              enrollments.map((item) => {
                const course = item.course;
                const summary = item.summary;
                const avgScore = summary?.currentAverageScore;
                const isFinal = summary?.isFinalScore;
                const completedRatio = Math.round((summary?.completedWeightRatio || 0) * 100);
                const scoreColor = getScoreColor(avgScore);

                return (
                  <View key={item.id} style={styles.courseGradeCard}>
                    {/* Header Thẻ Môn */}
                    <View style={styles.courseCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.courseBadgeRow}>
                          <View style={styles.codeTag}>
                            <Text style={styles.codeTagText}>{course?.code || 'MÔN'}</Text>
                          </View>
                          <Text style={styles.creditText}>{course?.credits || 0} tín chỉ</Text>
                          <Text style={styles.semesterText}>• {item.semester}</Text>
                        </View>
                        <Text style={styles.courseName}>{course?.name}</Text>
                      </View>

                      {/* Điểm số */}
                      <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
                        <Text style={[styles.scoreValue, { color: scoreColor }]}>
                          {avgScore !== null && avgScore !== undefined ? avgScore.toFixed(1) : '--'}
                        </Text>
                        <Text style={styles.scoreSub}>
                          {isFinal ? 'Điểm chốt' : 'ĐTB tạm tính'}
                        </Text>
                      </View>
                    </View>

                    {/* Thanh tiến độ hoàn thành trọng số điểm */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Trọng số điểm đã nhập</Text>
                        <Text style={styles.progressPct}>{completedRatio}% / 100%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${Math.min(completedRatio, 100)}%`,
                              backgroundColor: isFinal ? COLORS.success : COLORS.primary,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Bảng Các Cột Điểm */}
                    <View style={styles.gradeComponentsBox}>
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableColName, styles.tableHeaderTitle]}>Cột điểm</Text>
                        <Text style={[styles.tableColWeight, styles.tableHeaderTitle]}>Trọng số</Text>
                        <Text style={[styles.tableColScore, styles.tableHeaderTitle]}>Điểm số</Text>
                      </View>

                      {item.gradeComponents && item.gradeComponents.length > 0 ? (
                        item.gradeComponents.map((gc) => {
                          const hasScore = gc.score !== null && gc.score !== undefined;
                          const gcColor = getScoreColor(gc.score);

                          return (
                            <View key={gc.id} style={styles.tableDataRow}>
                              <Text style={styles.tableColName}>{gc.name}</Text>
                              <Text style={styles.tableColWeight}>{Math.round(gc.weight * 100)}%</Text>
                              <Text
                                style={[
                                  styles.tableColScore,
                                  { color: gcColor, fontWeight: hasScore ? '700' : '400' },
                                ]}
                              >
                                {hasScore ? gc.score!.toFixed(1) : 'Chưa nhập'}
                              </Text>
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.noComponentsText}>
                          Chưa có cấu hình cột điểm cho môn này.
                        </Text>
                      )}
                    </View>

                    {summary?.note ? (
                      <View style={styles.noteRow}>
                        <Info size={12} color={COLORS.textSecondary} />
                        <Text style={styles.noteText}>{summary.note}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <BookOpen size={40} color={COLORS.textSecondary} />
                <Text style={styles.emptyTitle}>Chưa có môn học nào</Text>
                <Text style={styles.emptyDesc}>
                  Bạn chưa đăng ký môn học nào. Hãy vào tab "Môn học" để đăng ký khóa học.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal Tạo Nhiệm Vụ Mới */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo nhiệm vụ học tập</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {formError ? (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Tiêu đề nhiệm vụ *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="VD: Làm bài tập lớn Danh sách liên kết"
              placeholderTextColor={COLORS.textSecondary}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.fieldLabel}>Mô tả chi tiết</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Ghi chú thêm về yêu cầu, tài liệu tham khảo..."
              placeholderTextColor={COLORS.textSecondary}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>Gắn với môn học *</Text>
            {enrollments.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.enrollmentPickerRow}>
                {enrollments.map((en) => {
                  const isSelected = selectedEnrollmentId === en.id;
                  return (
                    <TouchableOpacity
                      key={en.id}
                      style={[styles.enrollmentOption, isSelected && styles.enrollmentOptionSelected]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedEnrollmentId(en.id)}
                    >
                      <Text
                        style={[
                          styles.enrollmentOptionText,
                          isSelected && styles.enrollmentOptionTextSelected,
                        ]}
                      >
                        {en.course?.code || `Môn ${en.id}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.noEnrollText}>Bạn chưa đăng ký môn học nào.</Text>
            )}

            <Text style={styles.fieldLabel}>Thời hạn hoàn thành (Deadline)</Text>
            <View style={styles.dueDaysRow}>
              {[1, 3, 7, 14].map((days) => {
                const isSelected = dueDays === days;
                return (
                  <TouchableOpacity
                    key={days}
                    style={[styles.dueDayChip, isSelected && styles.dueDayChipSelected]}
                    activeOpacity={0.7}
                    onPress={() => setDueDays(days)}
                  >
                    <Text style={[styles.dueDayText, isSelected && styles.dueDayTextSelected]}>
                      {days} ngày tới
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
              activeOpacity={0.8}
              onPress={handleCreateTask}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Tạo nhiệm vụ</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.m,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.l,
    paddingTop: Platform.OS === 'ios' ? 12 : SIZES.l,
    paddingBottom: SIZES.m,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 6,
    borderRadius: SIZES.radiusBtn,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radiusBtn,
    gap: 4,
  },
  headerActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // SEGMENTED CONTROL STYLES (CONTAINER XÁM NHẠT #E5E7EB, ACTIVE NỀN TRẮNG ĐỔ BÓNG)
  segmentedWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SIZES.l,
    paddingVertical: SIZES.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: SIZES.radius,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: SIZES.radius - 2,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.soft,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  content: {
    padding: SIZES.l,
    paddingBottom: SIZES.xxl + 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.m,
    gap: SIZES.s,
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
  },

  // Sub Filter Row
  subFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SIZES.m,
  },
  subFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subFilterChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  subFilterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  subFilterTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // TODO CARD VỚI CHECKBOX TRÒN
  todoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: SIZES.l,
    borderRadius: SIZES.radiusCard,
    marginBottom: SIZES.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'flex-start',
    gap: SIZES.m,
    ...SHADOWS.soft,
  },
  todoCardDone: {
    backgroundColor: '#F9FAFB',
    borderColor: COLORS.borderLight,
    opacity: 0.85,
  },
  roundCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  roundCheckboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  todoContent: {
    flex: 1,
  },
  todoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  courseTagBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  courseTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  overdueBadge: {
    backgroundColor: COLORS.errorLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.error,
  },
  todoTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 15,
    marginBottom: 2,
  },
  todoTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
    opacity: 0.6,
  },
  todoDesc: {
    ...TYPOGRAPHY.caption,
    lineHeight: 18,
    marginBottom: 6,
  },
  todoDescDone: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  todoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#00000006',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statusIndicatorText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // SUMMARY CARD (GRADES)
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: SIZES.l,
    borderRadius: SIZES.radiusCard,
    marginBottom: SIZES.l,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.m,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    ...TYPOGRAPHY.h3,
  },
  gpaBadge: {
    alignItems: 'flex-end',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  gpaBadgeLabel: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
  },
  gpaBadgeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.m,
  },
  summaryBox: {
    alignItems: 'center',
  },
  summaryBoxValue: {
    ...TYPOGRAPHY.h2,
  },
  summaryBoxLabel: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },

  // COURSE GRADE CARD
  courseGradeCard: {
    backgroundColor: '#FFFFFF',
    padding: SIZES.l,
    borderRadius: SIZES.radiusCard,
    marginBottom: SIZES.l,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  courseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.s,
  },
  courseBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  codeTag: {
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  creditText: {
    ...TYPOGRAPHY.caption,
  },
  semesterText: {
    ...TYPOGRAPHY.caption,
  },
  courseName: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
  },
  scoreBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    minWidth: 70,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  scoreSub: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    marginVertical: SIZES.s,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    ...TYPOGRAPHY.caption,
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  gradeComponentsBox: {
    marginTop: SIZES.xs,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.m,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#00000006',
  },
  tableColName: {
    flex: 2,
    fontSize: 13,
    color: COLORS.text,
  },
  tableColWeight: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  tableColScore: {
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
  },
  noComponentsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 4,
    textAlign: 'center',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SIZES.s,
  },
  noteText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: SIZES.xl,
    borderRadius: SIZES.radiusCard,
    alignItems: 'center',
    marginTop: SIZES.l,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    marginTop: SIZES.s,
    marginBottom: 4,
  },
  emptyDesc: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SIZES.xl,
    paddingBottom: Platform.OS === 'ios' ? 36 : SIZES.xl,
    ...SHADOWS.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.m,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
  },
  formErrorBox: {
    backgroundColor: COLORS.errorLight,
    padding: SIZES.s,
    borderRadius: 6,
    marginBottom: SIZES.s,
  },
  formErrorText: {
    color: COLORS.error,
    fontSize: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SIZES.s,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusBtn,
    paddingHorizontal: SIZES.m,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  enrollmentPickerRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  enrollmentOption: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: SIZES.radiusBtn,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  enrollmentOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  enrollmentOptionText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  enrollmentOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  noEnrollText: {
    fontSize: 12,
    color: COLORS.error,
    fontStyle: 'italic',
  },
  dueDaysRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SIZES.l,
  },
  dueDayChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: SIZES.radiusBtn,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dueDayChipSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  dueDayText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dueDayTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: SIZES.radiusBtn,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
