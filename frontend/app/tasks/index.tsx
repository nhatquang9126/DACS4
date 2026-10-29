import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  BookOpen,
  Filter,
  X,
} from 'lucide-react-native';
import { COLORS, SIZES } from '../../src/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axiosClient from '../../src/api/axiosClient';
import { Task, Enrollment } from '../../src/types';

type FilterStatus = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('ALL');

  // Modal tạo task
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);
  const [dueDays, setDueDays] = useState<number>(3); // Mặc định hạn sau 3 ngày
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Trạng thái đang update status của task id nào
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setErrorMsg('');
      const [tasksRes, enrollmentsRes] = await Promise.allSettled([
        axiosClient.get('/tasks'),
        axiosClient.get('/courses/my-courses'),
      ]);

      if (tasksRes.status === 'fulfilled') {
        setTasks(tasksRes.value.data || []);
      } else {
        setErrorMsg('Không thể tải danh sách nhiệm vụ');
      }

      if (enrollmentsRes.status === 'fulfilled') {
        const enrolls: Enrollment[] = enrollmentsRes.value.data || [];
        setEnrollments(enrolls);
        if (enrolls.length > 0 && !selectedEnrollmentId) {
          setSelectedEnrollmentId(enrolls[0].id);
        }
      }
    } catch (err: any) {
      setErrorMsg('Lỗi kết nối khi tải dữ liệu nhiệm vụ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleUpdateStatus = async (taskId: number, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    if (updatingTaskId) return;
    try {
      setUpdatingTaskId(taskId);
      const res = await axiosClient.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật trạng thái nhiệm vụ');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleCreateTask = async () => {
    if (!newTitle.trim()) {
      setFormError('Vui lòng nhập tiêu đề nhiệm vụ');
      return;
    }
    if (!selectedEnrollmentId) {
      setFormError('Vui lòng chọn môn học');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      // Tính dueDate ISO string
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

      // Gắn kèm thông tin enrollment để hiển thị tên môn
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
    if (filter === 'ALL') return true;
    return task.status === filter;
  });

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (status === 'DONE') {
      return { label: 'Hoàn thành', color: COLORS.success, bg: '#2EC4B615' };
    }
    if (isOverdue) {
      return { label: 'Quá hạn', color: COLORS.error, bg: '#EF233C15' };
    }
    if (status === 'IN_PROGRESS') {
      return { label: 'Đang làm', color: COLORS.primary, bg: '#4361EE15' };
    }
    return { label: 'Cần làm', color: '#FF9F1C', bg: '#FF9F1C15' };
  };

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

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách nhiệm vụ...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhiệm vụ & Deadline</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
          <Plus size={20} color={COLORS.surface} />
          <Text style={styles.addBtnText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs Bộ lọc Trạng thái */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.filterTabText, filter === 'ALL' && styles.filterTabTextActive]}>
            Tất cả ({tasks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'TODO' && styles.filterTabActive]}
          onPress={() => setFilter('TODO')}
        >
          <Text style={[styles.filterTabText, filter === 'TODO' && styles.filterTabTextActive]}>
            Cần làm ({tasks.filter((t) => t.status === 'TODO').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'IN_PROGRESS' && styles.filterTabActive]}
          onPress={() => setFilter('IN_PROGRESS')}
        >
          <Text style={[styles.filterTabText, filter === 'IN_PROGRESS' && styles.filterTabTextActive]}>
            Đang làm ({tasks.filter((t) => t.status === 'IN_PROGRESS').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'DONE' && styles.filterTabActive]}
          onPress={() => setFilter('DONE')}
        >
          <Text style={[styles.filterTabText, filter === 'DONE' && styles.filterTabTextActive]}>
            Xong ({tasks.filter((t) => t.status === 'DONE').length})
          </Text>
        </TouchableOpacity>
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

        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const isDone = task.status === 'DONE';
            const isOverdue = !isDone && new Date(task.due_date) < new Date();
            const badge = getStatusBadge(task.status, isOverdue);
            const isUpdating = updatingTaskId === task.id;

            return (
              <View key={task.id} style={[styles.taskCard, isDone && styles.taskCardDone]}>
                <View style={styles.cardTopRow}>
                  {/* Badge Môn học */}
                  <View style={styles.courseTag}>
                    <BookOpen size={12} color={COLORS.secondary} />
                    <Text style={styles.courseTagText}>
                      {task.enrollment?.course?.code || 'Môn học'}
                    </Text>
                  </View>

                  {/* Badge Trạng thái */}
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>

                {/* Tiêu đề & Mô tả */}
                <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>{task.title}</Text>
                {task.description ? (
                  <Text style={styles.taskDesc} numberOfLines={3}>
                    {task.description}
                  </Text>
                ) : null}

                {/* Hạn nộp & Các nút hành động */}
                <View style={styles.cardBottomRow}>
                  <View style={styles.dueRow}>
                    <Calendar size={14} color={isOverdue ? COLORS.error : COLORS.textSecondary} />
                    <Text style={[styles.dueText, isOverdue && { color: COLORS.error, fontWeight: 'bold' }]}>
                      Hạn: {formatDate(task.due_date)}
                    </Text>
                  </View>

                  {/* Nút chuyển trạng thái nhanh */}
                  <View style={styles.actionRow}>
                    {isUpdating ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : task.status === 'TODO' ? (
                      <>
                        <TouchableOpacity
                          style={styles.btnSecondary}
                          onPress={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                        >
                          <Text style={styles.btnSecondaryText}>Bắt đầu làm</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.btnPrimary}
                          onPress={() => handleUpdateStatus(task.id, 'DONE')}
                        >
                          <CheckCircle2 size={14} color={COLORS.surface} />
                          <Text style={styles.btnPrimaryText}>Xong</Text>
                        </TouchableOpacity>
                      </>
                    ) : task.status === 'IN_PROGRESS' ? (
                      <TouchableOpacity
                        style={styles.btnPrimary}
                        onPress={() => handleUpdateStatus(task.id, 'DONE')}
                      >
                        <CheckCircle2 size={14} color={COLORS.surface} />
                        <Text style={styles.btnPrimaryText}>Đánh dấu xong</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.btnUndo}
                        onPress={() => handleUpdateStatus(task.id, 'TODO')}
                      >
                        <Text style={styles.btnUndoText}>Làm lại</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <CheckCircle2 size={40} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>Không có nhiệm vụ nào</Text>
            <Text style={styles.emptyDesc}>
              {filter === 'ALL'
                ? 'Bạn chưa có nhiệm vụ nào. Bấm nút "+ Thêm" ở trên để tạo nhiệm vụ ôn tập hoặc đồ án.'
                : `Không có nhiệm vụ nào ở trạng thái "${filter}".`}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal Thêm Nhiệm Vụ Mới */}
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
              onPress={handleCreateTask}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={COLORS.surface} />
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
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: SIZES.m, color: COLORS.textSecondary, fontSize: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.m,
    paddingTop: SIZES.l,
    paddingBottom: SIZES.m,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 13 },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.m,
    paddingBottom: SIZES.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  content: { padding: SIZES.m, paddingBottom: SIZES.xl },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF233C15',
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.m,
    gap: SIZES.s,
  },
  errorText: { color: COLORS.error, fontSize: 13, flex: 1 },
  taskCard: {
    backgroundColor: COLORS.surface,
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.m,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taskCardDone: {
    opacity: 0.75,
    backgroundColor: '#FAFAFA',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  courseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7209B715',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  courseTagText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  taskDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SIZES.s,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.xs,
    paddingTop: SIZES.xs,
    borderTopWidth: 1,
    borderTopColor: '#00000008',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnPrimaryText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnSecondary: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnSecondaryText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnUndo: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnUndoText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: SIZES.xl,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: SIZES.l,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SIZES.s,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000050',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SIZES.l,
    paddingBottom: SIZES.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.m,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  formErrorBox: {
    backgroundColor: '#EF233C15',
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
    borderRadius: 8,
    paddingHorizontal: SIZES.m,
    paddingVertical: 8,
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
    paddingVertical: 6,
    borderRadius: 8,
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
    color: COLORS.surface,
    fontWeight: 'bold',
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
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dueDayChipSelected: {
    backgroundColor: '#4361EE20',
    borderColor: COLORS.primary,
  },
  dueDayText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dueDayTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: {
    color: COLORS.surface,
    fontSize: 15,
    fontWeight: 'bold',
  },
});

