import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  GraduationCap,
  Award,
  BookOpen,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
} from 'lucide-react-native';
import { COLORS, SIZES } from '../../src/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axiosClient from '../../src/api/axiosClient';
import { Enrollment } from '../../src/types';

export default function GradesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchGrades = async () => {
    try {
      setErrorMsg('');
      const res = await axiosClient.get('/courses/my-courses');
      setEnrollments(res.data || []);
    } catch (err: any) {
      setErrorMsg('Không thể tải bảng điểm môn học. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGrades();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchGrades();
  };

  // Tính toán tổng quan: GPA tạm tính (trọng số theo số tín chỉ)
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
    if (score >= 5.0) return '#FF9F1C';
    return COLORS.error;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tổng hợp bảng điểm học tập...</Text>
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
        <Text style={styles.headerTitle}>Bảng điểm môn học</Text>
        <View style={{ width: 32 }} />
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

        {/* Thẻ Thống kê Tổng quan (GPA & Tín chỉ) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryTitleRow}>
              <GraduationCap size={22} color={COLORS.primary} />
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
        <Text style={styles.sectionTitle}>Chi tiết điểm thành phần</Text>

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

                  {/* Điểm Trung Bình Môn */}
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
                    <Text style={styles.progressLabel}>Tiến độ cột điểm (Trọng số đã nhập)</Text>
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

                {/* Bảng Các Cột Điểm Thành Phần */}
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
                          <Text style={[styles.tableColScore, { color: gcColor, fontWeight: hasScore ? 'bold' : 'normal' }]}>
                            {hasScore ? gc.score!.toFixed(1) : 'Chưa nhập'}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noComponentsText}>
                      Chưa có cấu hình cột điểm thành phần cho môn này.
                    </Text>
                  )}
                </View>

                {/* Ghi chú minh bạch */}
                {summary?.note ? (
                  <View style={styles.noteRow}>
                    <Info size={13} color={COLORS.textSecondary} />
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
              Bạn chưa đăng ký môn học nào. Hãy vào tab "Môn học" để đăng ký môn vào học kỳ này.
            </Text>
          </View>
        )}
      </ScrollView>
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

  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.surface,
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.l,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  gpaBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#4361EE15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gpaBadgeLabel: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '500',
  },
  gpaBadgeValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.s,
  },
  summaryBox: {
    alignItems: 'center',
  },
  summaryBoxValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summaryBoxLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.m,
  },

  // Course Grade Card
  courseGradeCard: {
    backgroundColor: COLORS.surface,
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.m,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: '#7209B715',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeTagText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  creditText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  semesterText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  courseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scoreBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    minWidth: 70,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreSub: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Progress Bar
  progressContainer: {
    marginVertical: SIZES.s,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  progressPct: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },

  // Table
  gradeComponentsBox: {
    marginTop: SIZES.xs,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SIZES.s,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderTitle: {
    fontSize: 11,
    fontWeight: 'bold',
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
});

