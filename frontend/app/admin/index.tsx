import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Users,
  BookOpen,
  AlertTriangle,
  Plus,
  CheckCircle,
  FileText,
  HelpCircle,
  X,
  Shield,
  Search,
} from 'lucide-react-native';
import { COLORS, SIZES } from '../../src/constants/theme';
import axiosClient from '../../src/api/axiosClient';

interface StudentItem {
  id: number;
  email: string;
  created_at: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  last_prediction_date: string | null;
  quiz_attempts_count: number;
  tasks_count: number;
  sessions_count: number;
}

interface AnalyticsData {
  total_students: number;
  total_courses: number;
  total_quizzes: number;
  total_quiz_attempts: number;
  risk_distribution: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

export default function AdminScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'MONITOR' | 'CONTENT'>('MONITOR');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State cho Thêm Môn học
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCredits, setCourseCredits] = useState('3');
  const [savingCourse, setSavingCourse] = useState(false);

  // Modal State cho Soạn Câu hỏi trắc nghiệm
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [quizIdInput, setQuizIdInput] = useState('1');
  const [questionText, setQuestionText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [skillTag, setSkillTag] = useState('');
  const [savingQuestion, setSavingQuestion] = useState(false);

  const fetchAdminData = useCallback(async () => {
    try {
      const [analyticsRes, studentsRes] = await Promise.allSettled([
        axiosClient.get('/admin/analytics'),
        axiosClient.get('/admin/students'),
      ]);

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data);
      }
      if (studentsRes.status === 'fulfilled') {
        setStudents(studentsRes.value.data);
      }
    } catch (error) {
      console.error('Lỗi nạp dữ liệu admin:', error);
      Alert.alert('Lỗi', 'Không thể nạp dữ liệu quản trị viên.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  const handleCreateCourse = async () => {
    if (!courseCode.trim() || !courseName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ mã môn và tên môn.');
      return;
    }
    const creditsNum = parseInt(courseCredits, 10);
    if (isNaN(creditsNum) || creditsNum <= 0) {
      Alert.alert('Lỗi', 'Số tín chỉ phải là số nguyên dương.');
      return;
    }

    try {
      setSavingCourse(true);
      await axiosClient.post('/admin/courses', {
        code: courseCode.trim().toUpperCase(),
        name: courseName.trim(),
        credits: creditsNum,
      });

      Alert.alert('Thành công', `Đã tạo môn học [${courseCode.toUpperCase()}] thành công!`);
      setCourseModalVisible(false);
      setCourseCode('');
      setCourseName('');
      fetchAdminData();
    } catch (error: any) {
      Alert.alert('Lỗi tạo môn', error.response?.data?.message || 'Không thể tạo môn học.');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleCreateQuestion = async () => {
    if (!questionText.trim() || !optA.trim() || !optB.trim() || !skillTag.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập câu hỏi, ít nhất 2 đáp án A/B và thẻ kỹ năng (skill_tag).');
      return;
    }
    const quizIdNum = parseInt(quizIdInput, 10);
    if (isNaN(quizIdNum) || quizIdNum <= 0) {
      Alert.alert('Lỗi', 'Mã bài kiểm tra (Quiz ID) không hợp lệ.');
      return;
    }

    const options = [optA.trim(), optB.trim()];
    if (optC.trim()) options.push(optC.trim());
    if (optD.trim()) options.push(optD.trim());

    if (correctIndex >= options.length) {
      Alert.alert('Lỗi', 'Đáp án đúng không hợp lệ với số lượng lựa chọn đã nhập.');
      return;
    }

    try {
      setSavingQuestion(true);
      await axiosClient.post('/admin/questions', {
        quiz_id: quizIdNum,
        question_text: questionText.trim(),
        options,
        correct_option_index: correctIndex,
        explanation: explanation.trim() || null,
        skill_tag: skillTag.trim().toLowerCase().replace(/\s+/g, '_'),
      });

      Alert.alert('Thành công', 'Đã lưu câu hỏi trắc nghiệm vào ngân hàng đề thi!');
      setQuestionModalVisible(false);
      setQuestionText('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setExplanation('');
      setSkillTag('');
    } catch (error: any) {
      Alert.alert('Lỗi soạn câu hỏi', error.response?.data?.message || 'Không thể lưu câu hỏi.');
    } finally {
      setSavingQuestion(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesRisk = filterRisk === 'ALL' || s.risk_level === filterRisk;
    const matchesSearch = s.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return COLORS.error;
      case 'MEDIUM':
        return '#FF9F1C';
      default:
        return COLORS.success;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải trung tâm quản trị...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Shield size={20} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Trung tâm Quản trị</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Điều hướng Admin */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'MONITOR' && styles.tabBtnActive]}
          onPress={() => setActiveTab('MONITOR')}
        >
          <AlertTriangle size={18} color={activeTab === 'MONITOR' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'MONITOR' && styles.tabTextActive]}>Giám sát Nguy cơ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'CONTENT' && styles.tabBtnActive]}
          onPress={() => setActiveTab('CONTENT')}
        >
          <BookOpen size={18} color={activeTab === 'CONTENT' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'CONTENT' && styles.tabTextActive]}>Quản trị Nội dung</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {activeTab === 'MONITOR' ? (
          <>
            {/* Thống kê Tổng quan Hệ thống */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Users size={20} color={COLORS.primary} />
                <Text style={styles.statNum}>{analytics?.total_students ?? 0}</Text>
                <Text style={styles.statLabel}>Sinh viên</Text>
              </View>

              <View style={[styles.statBox, { borderColor: COLORS.error }]}>
                <AlertTriangle size={20} color={COLORS.error} />
                <Text style={[styles.statNum, { color: COLORS.error }]}>
                  {analytics?.risk_distribution.HIGH ?? 0}
                </Text>
                <Text style={styles.statLabel}>Nguy cơ Cao</Text>
              </View>

              <View style={[styles.statBox, { borderColor: '#FF9F1C' }]}>
                <Text style={[styles.statNum, { color: '#FF9F1C' }]}>
                  {analytics?.risk_distribution.MEDIUM ?? 0}
                </Text>
                <Text style={styles.statLabel}>Trung bình</Text>
              </View>

              <View style={[styles.statBox, { borderColor: COLORS.success }]}>
                <CheckCircle size={20} color={COLORS.success} />
                <Text style={[styles.statNum, { color: COLORS.success }]}>
                  {analytics?.risk_distribution.LOW ?? 0}
                </Text>
                <Text style={styles.statLabel}>An toàn</Text>
              </View>
            </View>

            {/* Ô tìm kiếm & Bộ lọc Nguy cơ */}
            <View style={styles.filterSection}>
              <View style={styles.searchBox}>
                <Search size={18} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm sinh viên theo email..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View style={styles.filterBadges}>
                {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.filterBtn, filterRisk === r && styles.filterBtnActive]}
                    onPress={() => setFilterRisk(r)}
                  >
                    <Text style={[styles.filterBtnText, filterRisk === r && styles.filterBtnTextActive]}>
                      {r === 'ALL' ? 'Tất cả' : r === 'HIGH' ? 'Nguy cơ cao' : r === 'MEDIUM' ? 'Cần chú ý' : 'An toàn'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Danh sách Sinh viên Giám sát */}
            <Text style={styles.sectionTitle}>Danh sách Giám sát Cảnh báo sớm ({filteredStudents.length})</Text>

            {filteredStudents.map((s) => {
              const riskColor = getRiskColor(s.risk_level);
              return (
                <View key={s.id} style={styles.studentCard}>
                  <View style={styles.studentCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentEmail}>{s.email}</Text>
                      <Text style={styles.studentMeta}>Đã làm {s.quiz_attempts_count} bài quiz • {s.sessions_count} phiên học</Text>
                    </View>
                    <View style={[styles.riskTag, { backgroundColor: riskColor + '20', borderColor: riskColor }]}>
                      <Text style={[styles.riskTagText, { color: riskColor }]}>
                        {s.risk_level === 'HIGH' ? 'NGUY CƠ CAO' : s.risk_level === 'MEDIUM' ? 'TRUNG BÌNH' : 'AN TOÀN'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {filteredStudents.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Không tìm thấy sinh viên nào phù hợp bộ lọc.</Text>
              </View>
            ) : null}
          </>
        ) : (
          /* TAB 2: QUẢN TRỊ NỘI DUNG */
          <View style={styles.contentActions}>
            <Text style={styles.sectionTitle}>Công cụ Soạn thảo Giáo trình</Text>
            <Text style={styles.sectionSub}>Tự tạo môn học, tài liệu và ngân hàng câu hỏi gắn thẻ kỹ năng trực tiếp.</Text>

            <TouchableOpacity style={styles.actionCard} onPress={() => setCourseModalVisible(true)}>
              <View style={[styles.actionIconBox, { backgroundColor: COLORS.primaryLight }]}>
                <BookOpen size={24} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Thêm Môn học mới</Text>
                <Text style={styles.actionCardDesc}>Nhập mã môn, tên môn và số tín chỉ đào tạo.</Text>
              </View>
              <Plus size={20} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => setQuestionModalVisible(true)}>
              <View style={[styles.actionIconBox, { backgroundColor: '#7209B715' }]}>
                <HelpCircle size={24} color={COLORS.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Soạn Câu hỏi Quiz & Gắn Skill Tag</Text>
                <Text style={styles.actionCardDesc}>Tạo câu hỏi trắc nghiệm, 4 đáp án và gán thẻ kỹ năng phân tích năng lực.</Text>
              </View>
              <Plus size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal Tạo Môn học */}
      <Modal visible={courseModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo Môn học mới</Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Mã môn học (VD: INT2204)"
              value={courseCode}
              onChangeText={setCourseCode}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Tên môn học (VD: Lập trình C++ Nâng cao)"
              value={courseName}
              onChangeText={setCourseName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Số tín chỉ (VD: 3)"
              keyboardType="numeric"
              value={courseCredits}
              onChangeText={setCourseCredits}
            />

            <TouchableOpacity style={styles.submitModalBtn} onPress={handleCreateCourse} disabled={savingCourse}>
              {savingCourse ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <Text style={styles.submitModalBtnText}>Lưu Môn học</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Soạn Câu hỏi trắc nghiệm */}
      <Modal visible={questionModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Soạn Câu hỏi Trắc nghiệm</Text>
                <TouchableOpacity onPress={() => setQuestionModalVisible(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Quiz ID (Mặc định: 1)"
                keyboardType="numeric"
                value={quizIdInput}
                onChangeText={setQuizIdInput}
              />
              <TextInput
                style={[styles.modalInput, { height: 70 }]}
                placeholder="Nội dung câu hỏi..."
                multiline
                value={questionText}
                onChangeText={setQuestionText}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Đáp án A (Lựa chọn 0)"
                value={optA}
                onChangeText={setOptA}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Đáp án B (Lựa chọn 1)"
                value={optB}
                onChangeText={setOptB}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Đáp án C (Tùy chọn)"
                value={optC}
                onChangeText={setOptC}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Đáp án D (Tùy chọn)"
                value={optD}
                onChangeText={setOptD}
              />

              <Text style={styles.inputLabel}>Chọn đáp án đúng:</Text>
              <View style={styles.radioRow}>
                {['A (0)', 'B (1)', 'C (2)', 'D (3)'].map((label, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.radioBtn, correctIndex === idx && styles.radioBtnActive]}
                    onPress={() => setCorrectIndex(idx)}
                  >
                    <Text style={[styles.radioText, correctIndex === idx && styles.radioTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Thẻ kỹ năng (VD: khai_bao_con_tro, danh_sach_don)"
                value={skillTag}
                onChangeText={setSkillTag}
                autoCapitalize="none"
              />

              <TextInput
                style={[styles.modalInput, { height: 60 }]}
                placeholder="Lời giải thích vì sao đáp án đúng..."
                multiline
                value={explanation}
                onChangeText={setExplanation}
              />

              <TouchableOpacity style={styles.submitModalBtn} onPress={handleCreateQuestion} disabled={savingQuestion}>
                {savingQuestion ? (
                  <ActivityIndicator color={COLORS.surface} />
                ) : (
                  <Text style={styles.submitModalBtnText}>Lưu vào Ngân hàng Đề thi</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SIZES.m, color: COLORS.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.m,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.m,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.m,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  content: { padding: SIZES.m, paddingBottom: SIZES.xl },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SIZES.m, gap: 6 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SIZES.s,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNum: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  filterSection: { marginBottom: SIZES.m },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 44,
    gap: 8,
    marginBottom: SIZES.s,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  filterBadges: { flexDirection: 'row', gap: 6 },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterBtnText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  filterBtnTextActive: { color: COLORS.surface, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: SIZES.s },
  sectionSub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SIZES.m },
  studentCard: {
    backgroundColor: COLORS.surface,
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  studentCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  studentEmail: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
  studentMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  riskTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  riskTagText: { fontSize: 10, fontWeight: 'bold' },
  emptyCard: { backgroundColor: COLORS.surface, padding: SIZES.l, borderRadius: SIZES.radius, alignItems: 'center' },
  emptyText: { color: COLORS.textSecondary, fontSize: 13 },
  contentActions: { gap: SIZES.m },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SIZES.m,
  },
  actionIconBox: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionCardTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  actionCardDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SIZES.m },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center' },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: SIZES.m },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.m },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  modalInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.m,
    paddingVertical: 8,
    marginBottom: SIZES.s,
    fontSize: 14,
    color: COLORS.text,
  },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: 4 },
  radioRow: { flexDirection: 'row', gap: 6, marginBottom: SIZES.s },
  radioBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  radioBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  radioText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  radioTextActive: { color: COLORS.surface, fontWeight: 'bold' },
  submitModalBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.m,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: SIZES.s,
  },
  submitModalBtnText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 15 },
});

