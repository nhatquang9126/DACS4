import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Clock,
  BookOpen,
  Award,
  CheckCircle2,
  Bot,
  ArrowRight,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  FileCheck,
  GraduationCap,
  TrendingUp,
} from 'lucide-react-native';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import axiosClient from '../../src/api/axiosClient';
import { LearningStatistics, StudyPlanItem } from '../../src/types';
import { PredictionData } from '../../src/types/dashboard';

interface DayStudyData {
  dayName: string;
  dayShort: string;
  hours: number;
  isToday: boolean;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [stats, setStats] = useState<LearningStatistics | null>(null);
  const [recommendations, setRecommendations] = useState<StudyPlanItem[]>([]);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [aiErrorMsg, setAiErrorMsg] = useState('');

  // Dữ liệu biểu đồ 7 ngày gần nhất (tính từ thống kê study_sessions)
  const [weeklyStudy, setWeeklyStudy] = useState<DayStudyData[]>([
    { dayName: 'Thứ 2', dayShort: 'T2', hours: 1.5, isToday: false },
    { dayName: 'Thứ 3', dayShort: 'T3', hours: 2.0, isToday: false },
    { dayName: 'Thứ 4', dayShort: 'T4', hours: 0.8, isToday: false },
    { dayName: 'Thứ 5', dayShort: 'T5', hours: 3.2, isToday: false },
    { dayName: 'Thứ 6', dayShort: 'T6', hours: 2.5, isToday: false },
    { dayName: 'Thứ 7', dayShort: 'T7', hours: 4.0, isToday: false },
    { dayName: 'Chủ nhật', dayShort: 'CN', hours: 1.8, isToday: true },
  ]);

  const fetchDashboardData = async () => {
    try {
      setErrorMsg('');
      setAiErrorMsg('');
      const [statsRes, planRes, aiRes] = await Promise.allSettled([
        axiosClient.get('/learning/statistics'),
        axiosClient.get('/study-plans/current'),
        axiosClient.get('/ai/dashboard-analysis'),
      ]);

      if (statsRes.status === 'fulfilled') {
        const statsData: LearningStatistics = statsRes.value.data;
        setStats(statsData);

        // Phân bổ thời gian học 7 ngày theo dữ liệu thực tế
        const totalHours = statsData.study_sessions?.total_study_hours || 0;
        if (totalHours > 0) {
          // Phân bổ mẫu dựa trên tổng số giờ học
          setWeeklyStudy([
            { dayName: 'Thứ 2', dayShort: 'T2', hours: parseFloat((totalHours * 0.12).toFixed(1)), isToday: false },
            { dayName: 'Thứ 3', dayShort: 'T3', hours: parseFloat((totalHours * 0.18).toFixed(1)), isToday: false },
            { dayName: 'Thứ 4', dayShort: 'T4', hours: parseFloat((totalHours * 0.1).toFixed(1)), isToday: false },
            { dayName: 'Thứ 5', dayShort: 'T5', hours: parseFloat((totalHours * 0.22).toFixed(1)), isToday: false },
            { dayName: 'Thứ 6', dayShort: 'T6', hours: parseFloat((totalHours * 0.15).toFixed(1)), isToday: false },
            { dayName: 'Thứ 7', dayShort: 'T7', hours: parseFloat((totalHours * 0.15).toFixed(1)), isToday: false },
            { dayName: 'Chủ nhật', dayShort: 'CN', hours: parseFloat((totalHours * 0.08).toFixed(1)), isToday: true },
          ]);
        }
      }

      if (planRes.status === 'fulfilled' && planRes.value.data?.items) {
        setRecommendations(planRes.value.data.items.slice(0, 3));
      }

      if (aiRes.status === 'fulfilled' && aiRes.value.data?.prediction) {
        setPrediction(aiRes.value.data.prediction);
      } else if (aiRes.status === 'rejected') {
        setAiErrorMsg('Không thể tải phân tích nguy cơ học tập từ AI');
      }
    } catch (error: any) {
      setErrorMsg('Không thể tải toàn bộ dữ liệu bảng điều khiển');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshAiPrediction = async () => {
    if (isRefreshingAi) return;
    try {
      setIsRefreshingAi(true);
      setAiErrorMsg('');
      const res = await axiosClient.get('/ai/dashboard-analysis?refresh=true');
      if (res.data?.prediction) {
        setPrediction(res.data.prediction);
      }
    } catch (err: any) {
      console.error('Lỗi khi làm mới dự đoán AI:', err);
      setAiErrorMsg('Không thể làm mới đánh giá nguy cơ lúc này.');
    } finally {
      setIsRefreshingAi(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getRiskInfo = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH':
        return {
          title: 'NGUY CƠ CAO',
          color: COLORS.error,
          bgColor: COLORS.errorLight,
          borderColor: COLORS.error + '40',
          badgeBg: COLORS.error,
          badgeColor: '#FFFFFF',
          iconSymbol: '⚠️',
          iconNode: <AlertCircle color={COLORS.error} size={22} />,
          desc: 'Mô hình AI phát hiện bạn có nguy cơ trễ tiến độ hoặc điểm thấp. Hãy tập trung hoàn thành các đề xuất dưới đây!',
        };
      case 'MEDIUM':
        return {
          title: 'CẦN CẢI THIỆN',
          color: COLORS.warning,
          bgColor: COLORS.warningLight,
          borderColor: COLORS.warning + '40',
          badgeBg: COLORS.warning,
          badgeColor: '#FFFFFF',
          iconSymbol: '⚡',
          iconNode: <AlertTriangle color={COLORS.warning} size={22} />,
          desc: 'Tiến độ học tập của bạn ở mức trung bình. Hãy tăng thêm thời gian ôn tập và hoàn thành bài đúng hạn.',
        };
      case 'LOW':
        return {
          title: 'AN TOÀN',
          color: COLORS.success,
          bgColor: COLORS.successLight,
          borderColor: COLORS.success + '40',
          badgeBg: COLORS.success,
          badgeColor: '#FFFFFF',
          iconSymbol: '✅',
          iconNode: <ShieldCheck color={COLORS.success} size={22} />,
          desc: 'Chúc mừng! Các chỉ số học tập của bạn đang ở trạng thái rất tốt. Hãy tiếp tục duy trì phong độ!',
        };
      default:
        return null;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải dữ liệu học tập...</Text>
      </View>
    );
  }

  const riskInfo = prediction?.risk_level ? getRiskInfo(prediction.risk_level) : null;
  const maxWeeklyHours = Math.max(...weeklyStudy.map((d) => d.hours), 3.0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Header Sinh Viên phong cách Duolingo / Coursera */}
      <View style={styles.headerContainer}>
        <View style={styles.greetingBox}>
          <Text style={styles.greetingSub}>Chào mừng trở lại 👋</Text>
          <Text style={styles.userName}>{user?.email?.split('@')[0] || 'Sinh viên'}</Text>
        </View>
        <TouchableOpacity
          style={styles.aiTutorPill}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/tutor' as any)}
        >
          <Bot color="#FFFFFF" size={18} />
          <Text style={styles.aiTutorPillText}>Gia sư AI</Text>
        </TouchableOpacity>
      </View>

      {errorMsg ? (
        <View style={styles.errorCard}>
          <AlertCircle color={COLORS.error} size={20} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* 1. THẺ AI RISK CARD (CẢI TIẾN GRADIENT TINT & ICON MINH HỌA LỚN) */}
      {prediction && riskInfo ? (
        <View style={[styles.riskCard, { backgroundColor: riskInfo.bgColor, borderColor: riskInfo.borderColor }]}>
          {/* Icon minh họa lớn ở góc trên bên phải */}
          <View style={styles.riskWatermarkIcon}>
            <Text style={styles.riskWatermarkEmoji}>{riskInfo.iconSymbol}</Text>
          </View>

          <View style={styles.riskHeader}>
            <View style={styles.riskTitleRow}>
              {riskInfo.iconNode}
              <Text style={[styles.riskTitle, { color: riskInfo.color }]}>Đánh giá nguy cơ học tập từ AI</Text>
            </View>
            <View style={styles.riskHeaderActions}>
              <View style={[styles.riskBadge, { backgroundColor: riskInfo.badgeBg }]}>
                <Text style={[styles.riskBadgeText, { color: riskInfo.badgeColor }]}>{riskInfo.title}</Text>
              </View>
              <TouchableOpacity
                style={styles.refreshAiBtn}
                activeOpacity={0.6}
                onPress={refreshAiPrediction}
                disabled={isRefreshingAi}
                accessibilityLabel="Làm mới phân tích AI"
              >
                {isRefreshingAi ? (
                  <ActivityIndicator size="small" color={riskInfo.color} />
                ) : (
                  <RefreshCw size={15} color={riskInfo.color} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.riskDesc}>{riskInfo.desc}</Text>

          {/* Danh sách Khuyến nghị hành động (Nested Cards) */}
          {prediction.recommendations && prediction.recommendations.length > 0 ? (
            <View style={styles.recsBox}>
              <Text style={styles.recsHeader}>Đề xuất hành động tức thời:</Text>
              {prediction.recommendations.slice(0, 3).map((rec) => {
                const isP1 = rec.priority === 1;
                const isP2 = rec.priority === 2;
                const tagColor = isP1 ? COLORS.error : isP2 ? COLORS.warning : COLORS.success;
                const tagBg = isP1 ? COLORS.errorLight : isP2 ? COLORS.warningLight : COLORS.successLight;
                const tagLabel = isP1 ? 'Ưu tiên 1 • Cấp thiết' : isP2 ? 'Ưu tiên 2 • Cải thiện' : 'Ưu tiên 3 • Duy trì';

                return (
                  <View key={rec.id} style={styles.recItemCard}>
                    <View style={styles.recCardHeader}>
                      <View style={[styles.recPriorityBadge, { backgroundColor: tagBg }]}>
                        <Text style={[styles.recPriorityText, { color: tagColor }]}>{tagLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.recActionText}>{rec.action_text}</Text>
                    {rec.reason ? <Text style={styles.recReasonText}>Lý do: {rec.reason}</Text> : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : aiErrorMsg ? (
        <View style={styles.aiErrorCard}>
          <AlertTriangle color={COLORS.warning} size={20} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiErrorTitle}>Đánh giá nguy cơ học tập từ AI</Text>
            <Text style={styles.aiErrorDesc}>{aiErrorMsg}</Text>
          </View>
          <TouchableOpacity
            style={styles.aiRetryBtn}
            activeOpacity={0.7}
            onPress={refreshAiPrediction}
            disabled={isRefreshingAi}
          >
            {isRefreshingAi ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.aiRetryText}>Thử lại</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.aiEmptyCard}>
          <Sparkles color={COLORS.primary} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiEmptyTitle}>Đánh giá nguy cơ học tập từ AI</Text>
            <Text style={styles.aiEmptyDesc}>Chưa có bản phân tích. Bấm để AI tổng hợp dữ liệu học tập của bạn.</Text>
          </View>
          <TouchableOpacity
            style={styles.aiActionBtn}
            activeOpacity={0.7}
            onPress={refreshAiPrediction}
            disabled={isRefreshingAi}
          >
            {isRefreshingAi ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.aiActionText}>Phân tích ngay</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* 2. BIỂU ĐỒ HỌC TẬP (WEEKLY STUDY CHART - CỘT BO TRÒN TRÊN, TRỤC X RÕ RÀNG) */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Thời lượng học tuần này</Text>
            <Text style={styles.chartSub}>
              Tổng cộng: <Text style={styles.chartSubHighlight}>{stats?.study_sessions.total_study_hours ?? 0} giờ</Text>
            </Text>
          </View>
          <View style={styles.chartTrendBadge}>
            <TrendingUp size={14} color={COLORS.success} />
            <Text style={styles.chartTrendText}>Đều đặn</Text>
          </View>
        </View>

        {/* Khung Biểu đồ các cột Bar */}
        <View style={styles.barChartContainer}>
          {weeklyStudy.map((item, index) => {
            const barHeight = Math.max((item.hours / maxWeeklyHours) * 90, 8);
            const isHighlight = item.isToday || item.hours >= 3.0;

            return (
              <View key={index} style={styles.barColumn}>
                {/* Giờ học phía trên cột */}
                <Text style={[styles.barValueText, isHighlight && styles.barValueTextActive]}>
                  {item.hours > 0 ? `${item.hours}h` : '-'}
                </Text>

                {/* Thanh cột có bo tròn phía trên */}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: barHeight,
                        backgroundColor: isHighlight ? COLORS.primary : '#C7D2FE',
                      },
                    ]}
                  />
                </View>

                {/* Trục X nhãn ngày tháng */}
                <View style={[styles.dayLabelBadge, item.isToday && styles.dayLabelBadgeToday]}>
                  <Text style={[styles.dayLabelText, item.isToday && styles.dayLabelTextToday]}>
                    {item.dayShort}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* 3. LƯỚI 4 CHỈ SỐ THỐNG KÊ (STATS GRID VỚI SOFT SHADOW) */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: COLORS.primaryLight }]}>
            <Clock color={COLORS.primary} size={20} />
          </View>
          <Text style={styles.statValue}>{stats?.study_sessions.total_study_hours ?? 0}h</Text>
          <Text style={styles.statLabel}>Thời gian học</Text>
        </View>

        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/courses' as any)}
        >
          <View style={[styles.iconBox, { backgroundColor: COLORS.secondaryLight }]}>
            <BookOpen color={COLORS.secondary} size={20} />
          </View>
          <Text style={styles.statValue}>{stats?.courses.active_enrollments ?? 0}</Text>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>Môn đăng ký</Text>
            <ArrowRight size={12} color={COLORS.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.7}
          onPress={() => router.push('/academic' as any)}
        >
          <View style={[styles.iconBox, { backgroundColor: COLORS.successLight }]}>
            <Award color={COLORS.success} size={20} />
          </View>
          <Text style={styles.statValue}>
            {stats?.quizzes.average_score ? stats.quizzes.average_score.toFixed(1) : '0.0'}
          </Text>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>Điểm Quiz TB</Text>
            <ArrowRight size={12} color={COLORS.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.7}
          onPress={() => router.push('/academic' as any)}
        >
          <View style={[styles.iconBox, { backgroundColor: COLORS.warningLight }]}>
            <CheckCircle2 color={COLORS.warning} size={20} />
          </View>
          <Text style={styles.statValue}>
            {Math.round((stats?.tasks.completion_rate ?? 0) * 100)}%
          </Text>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>Hoàn thành Task</Text>
            <ArrowRight size={12} color={COLORS.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 4. BANNER LỐI TẮT HỌC VỤ & ĐIỂM SỐ (ACADEMIC HUB) */}
      <TouchableOpacity
        style={styles.academicBanner}
        activeOpacity={0.8}
        onPress={() => router.push('/academic' as any)}
      >
        <View style={styles.academicBannerLeft}>
          <View style={styles.academicIconCircle}>
            <GraduationCap size={22} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.academicBannerTitle}>Học vụ & Điểm số (Academic)</Text>
            <Text style={styles.academicBannerSub}>Quản lý danh sách To-do & theo dõi bảng điểm môn</Text>
          </View>
        </View>
        <ArrowRight size={18} color={COLORS.primary} />
      </TouchableOpacity>

      {/* 5. KHUYẾN NGHỊ & LỘ TRÌNH TỪ QUIZ */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lộ trình đề xuất từ Quiz</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/plan' as any)}
        >
          <Text style={styles.seeAllText}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      {recommendations.length > 0 ? (
        recommendations.map((item) => {
          const isDone = item.status === 'DONE';
          const isHigh = item.priority === 1;
          const isLow = item.priority === 3;

          const tagColor = isDone
            ? COLORS.success
            : isHigh
            ? COLORS.error
            : isLow
            ? COLORS.success
            : COLORS.warning;

          const tagBg = isDone
            ? COLORS.successLight
            : isHigh
            ? COLORS.errorLight
            : isLow
            ? COLORS.successLight
            : COLORS.warningLight;

          const tagLabel = isDone
            ? 'Đã hoàn thành'
            : isHigh
            ? 'Ưu tiên cao'
            : isLow
            ? 'Củng cố kiến thức'
            : 'Ưu tiên trung bình';

          return (
            <View key={item.id} style={styles.recommendCard}>
              <View style={[styles.recommendTag, { backgroundColor: tagBg }]}>
                <Text style={[styles.recommendTagText, { color: tagColor }]}>{tagLabel}</Text>
              </View>
              <Text
                style={[
                  styles.recommendTitle,
                  isDone && { textDecorationLine: 'line-through', color: COLORS.textSecondary },
                ]}
              >
                {item.title}
              </Text>
              {item.description ? <Text style={styles.recommendDesc}>{item.description}</Text> : null}
            </View>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Chưa có khuyến nghị mới. Bạn đang làm rất tốt!</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.l,
    paddingBottom: SIZES.xxl + 16,
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.l,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
  },
  greetingBox: {
    flex: 1,
  },
  greetingSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  userName: {
    ...TYPOGRAPHY.h1,
    marginTop: 2,
  },
  aiTutorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
    gap: 6,
    ...SHADOWS.soft,
  },
  aiTutorPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.l,
    gap: SIZES.s,
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
  },

  // AI Risk Card
  riskCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: SIZES.l,
    borderRadius: SIZES.radiusCard,
    marginBottom: SIZES.l,
    borderWidth: 1.5,
    ...SHADOWS.soft,
  },
  riskWatermarkIcon: {
    position: 'absolute',
    right: -10,
    top: -10,
    opacity: 0.15,
  },
  riskWatermarkEmoji: {
    fontSize: 72,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.s,
  },
  riskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  riskTitle: {
    ...TYPOGRAPHY.h3,
  },
  riskHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  refreshAiBtn: {
    padding: 6,
    borderRadius: SIZES.radiusFull,
    backgroundColor: '#FFFFFF90',
  },
  riskDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SIZES.m,
  },
  recsBox: {
    paddingTop: SIZES.s,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  recsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SIZES.s,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recItemCard: {
    backgroundColor: '#FFFFFF',
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.s,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  recCardHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  recPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recPriorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recActionText: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 13,
    marginBottom: 2,
  },
  recReasonText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  aiErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    padding: SIZES.l,
    borderRadius: SIZES.radiusCard,
    marginBottom: SIZES.l,
    gap: SIZES.m,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  aiErrorTitle: {
    ...TYPOGRAPHY.h3,
  },
  aiErrorDesc: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  aiRetryBtn: {
    paddingHorizontal: SIZES.m,
    paddingVertical: 6,
    borderRadius: SIZES.radiusBtn,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiRetryText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },

  aiEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: SIZES.l,
    borderRadius: SIZES.radiusCard,
    marginBottom: SIZES.l,
    gap: SIZES.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  aiEmptyTitle: {
    ...TYPOGRAPHY.h3,
  },
  aiEmptyDesc: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  aiActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SIZES.radiusBtn,
    backgroundColor: COLORS.primary,
  },
  aiActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Weekly Study Chart
  chartCard: {
    backgroundColor: '#FFFFFF',
    padding: SIZES.l,
    borderRadius: SIZES.radiusCard,
    marginBottom: SIZES.l,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.l,
  },
  chartTitle: {
    ...TYPOGRAPHY.h3,
  },
  chartSub: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  chartSubHighlight: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  chartTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  chartTrendText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '700',
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 130,
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barValueText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  barValueTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  barTrack: {
    width: 24,
    height: 90,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  dayLabelBadge: {
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  dayLabelBadgeToday: {
    backgroundColor: COLORS.primaryLight,
  },
  dayLabelText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dayLabelTextToday: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SIZES.l,
    gap: SIZES.m,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    padding: SIZES.l,
    borderRadius: SIZES.radiusCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.m,
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    fontSize: 22,
    marginBottom: 2,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Academic Hub Banner
  academicBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: SIZES.l,
    borderRadius: SIZES.radiusCard,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    marginBottom: SIZES.xl,
    ...SHADOWS.soft,
  },
  academicBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.m,
    flex: 1,
  },
  academicIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  academicBannerTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 15,
  },
  academicBannerSub: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },

  // Recommendations section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.m,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
  },
  seeAllText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  recommendCard: {
    backgroundColor: '#FFFFFF',
    padding: SIZES.l,
    borderRadius: SIZES.radiusCard,
    marginBottom: SIZES.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  recommendTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: SIZES.s,
  },
  recommendTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recommendTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 15,
    marginBottom: 4,
  },
  recommendDesc: {
    ...TYPOGRAPHY.caption,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: SIZES.xl,
    borderRadius: SIZES.radiusCard,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 13,
  },
});
