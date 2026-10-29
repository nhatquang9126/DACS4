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
} from 'lucide-react-native';
import { COLORS, SIZES } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import axiosClient from '../../src/api/axiosClient';
import { LearningStatistics, StudyPlanItem } from '../../src/types';
import { PredictionData } from '../../src/types/dashboard';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [stats, setStats] = useState<LearningStatistics | null>(null);
  const [recommendations, setRecommendations] = useState<StudyPlanItem[]>([]);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDashboardData = async () => {
    try {
      setErrorMsg('');
      const [statsRes, planRes, aiRes] = await Promise.allSettled([
        axiosClient.get('/learning/statistics'),
        axiosClient.get('/study-plans/current'),
        axiosClient.get('/ai/dashboard-analysis'),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
      if (planRes.status === 'fulfilled' && planRes.value.data?.items) {
        setRecommendations(planRes.value.data.items.slice(0, 3));
      }
      if (aiRes.status === 'fulfilled' && aiRes.value.data?.prediction) {
        setPrediction(aiRes.value.data.prediction);
      }
    } catch (error: any) {
      setErrorMsg('Không thể tải toàn bộ dữ liệu bảng điều khiển');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
          bgColor: '#EF233C15',
          borderColor: '#EF233C50',
          icon: <AlertCircle color={COLORS.error} size={22} />,
          desc: 'Mô hình AI phát hiện bạn có nguy cơ trễ tiến độ hoặc điểm thấp. Hãy tập trung hoàn thành các đề xuất dưới đây!',
        };
      case 'MEDIUM':
        return {
          title: 'CẦN CẢI THIỆN',
          color: '#FF9F1C',
          bgColor: '#FF9F1C15',
          borderColor: '#FF9F1C50',
          icon: <AlertTriangle color="#FF9F1C" size={22} />,
          desc: 'Tiến độ học tập của bạn ở mức trung bình. Hãy tăng thêm thời gian ôn tập và nộp bài đúng hạn.',
        };
      default:
        return {
          title: 'AN TOÀN',
          color: COLORS.success,
          bgColor: '#2EC4B615',
          borderColor: '#2EC4B650',
          icon: <ShieldCheck color={COLORS.success} size={22} />,
          desc: 'Chúc mừng! Các chỉ số học tập của bạn đang ở trạng thái tốt. Hãy tiếp tục duy trì phong độ!',
        };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải dữ liệu học tập...</Text>
      </View>
    );
  }

  const riskInfo = prediction ? getRiskInfo(prediction.risk_level) : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Header Sinh Viên */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.greeting}>Xin chào 👋</Text>
          <Text style={styles.userName}>{user?.email?.split('@')[0] || 'Sinh viên'}</Text>
        </View>
        <TouchableOpacity style={styles.aiBadge} onPress={() => router.push('/(tabs)/tutor' as any)}>
          <Bot color={COLORS.surface} size={20} />
          <Text style={styles.aiBadgeText}>Trợ lý AI</Text>
        </TouchableOpacity>
      </View>

      {errorMsg ? (
        <View style={styles.errorCard}>
          <AlertCircle color={COLORS.error} size={20} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* THẺ DỰ ĐOÁN NGUY CƠ TỪ AI MICROSERVICE */}
      {prediction && riskInfo ? (
        <View style={[styles.riskCard, { backgroundColor: riskInfo.bgColor, borderColor: riskInfo.borderColor }]}>
          <View style={styles.riskHeader}>
            <View style={styles.riskTitleRow}>
              {riskInfo.icon}
              <Text style={[styles.riskTitle, { color: riskInfo.color }]}>Dự đoán Nguy cơ Học tập (AI)</Text>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: riskInfo.color }]}>
              <Text style={styles.riskBadgeText}>{riskInfo.title}</Text>
            </View>
          </View>

          <Text style={styles.riskDesc}>{riskInfo.desc}</Text>

          {prediction.recommendations && prediction.recommendations.length > 0 ? (
            <View style={styles.recsBox}>
              <Text style={styles.recsHeader}>Đề xuất hành động tức thời:</Text>
              {prediction.recommendations.slice(0, 2).map((rec) => (
                <View key={rec.id} style={styles.recItem}>
                  <View style={[styles.recDot, { backgroundColor: rec.priority === 1 ? COLORS.error : '#FF9F1C' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recActionText}>{rec.action_text}</Text>
                    <Text style={styles.recReasonText}>{rec.reason}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Lưới 4 Chỉ số Thống kê */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: '#4361EE15' }]}>
            <Clock color={COLORS.primary} size={22} />
          </View>
          <Text style={styles.statValue}>{stats?.study_sessions.total_study_hours ?? 0}h</Text>
          <Text style={styles.statLabel}>Thời gian học</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: '#7209B715' }]}>
            <BookOpen color={COLORS.secondary} size={22} />
          </View>
          <Text style={styles.statValue}>{stats?.courses.active_enrollments ?? 0}</Text>
          <Text style={styles.statLabel}>Môn đăng ký</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: '#2EC4B615' }]}>
            <Award color={COLORS.success} size={22} />
          </View>
          <Text style={styles.statValue}>
            {stats?.quizzes.average_score ? stats.quizzes.average_score.toFixed(1) : '0.0'}
          </Text>
          <Text style={styles.statLabel}>Điểm Quiz TB</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: '#FF9F1C15' }]}>
            <CheckCircle2 color="#FF9F1C" size={22} />
          </View>
          <Text style={styles.statValue}>
            {Math.round((stats?.tasks.completion_rate ?? 0) * 100)}%
          </Text>
          <Text style={styles.statLabel}>Hoàn thành Task</Text>
        </View>
      </View>

      {/* Card Nhanh Gia Sư AI */}
      <TouchableOpacity style={styles.aiBanner} onPress={() => router.push('/(tabs)/tutor' as any)}>
        <View style={styles.aiBannerContent}>
          <View style={styles.aiBannerHeader}>
            <Sparkles color="#FFD166" size={20} />
            <Text style={styles.aiBannerTitle}>Gia sư AI SmartStudy</Text>
          </View>
          <Text style={styles.aiBannerSub}>Gặp vướng mắc bài tập hay code C++? Hỏi Gia sư AI ngay!</Text>
        </View>
        <ArrowRight color={COLORS.surface} size={24} />
      </TouchableOpacity>

      {/* Khuyến nghị & Lộ trình Học tập */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lộ trình đề xuất từ Quiz</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/plan' as any)}>
          <Text style={styles.seeAllText}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      {recommendations.length > 0 ? (
        recommendations.map((item) => {
          const isDone = item.status === 'DONE';
          const isHigh = item.priority === 1;
          const isLow = item.priority === 3;
          return (
            <View key={item.id} style={styles.recommendCard}>
              <View
                style={[
                  styles.recommendTag,
                  isDone
                    ? { backgroundColor: '#2EC4B615' }
                    : isHigh
                    ? { backgroundColor: '#EF233C15' }
                    : isLow
                    ? { backgroundColor: '#2EC4B615' }
                    : { backgroundColor: '#FF9F1C15' },
                ]}
              >
                <Text
                  style={[
                    styles.recommendTagText,
                    isDone
                      ? { color: COLORS.success }
                      : isHigh
                      ? { color: COLORS.error }
                      : isLow
                      ? { color: COLORS.success }
                      : { color: '#FF9F1C' },
                  ]}
                >
                  {isDone
                    ? 'Đã hoàn thành'
                    : isHigh
                    ? 'Ưu tiên cao'
                    : isLow
                    ? 'Củng cố kiến thức'
                    : 'Ưu tiên trung bình'}
                </Text>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SIZES.m, paddingBottom: SIZES.xl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: SIZES.m, color: COLORS.textSecondary, fontSize: 14 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SIZES.m, marginBottom: SIZES.l },
  greeting: { fontSize: 14, color: COLORS.textSecondary },
  userName: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: SIZES.m, paddingVertical: SIZES.s, borderRadius: 20, gap: 6 },
  aiBadgeText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 14 },
  errorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF233C15', padding: SIZES.m, borderRadius: SIZES.radius, marginBottom: SIZES.m, gap: SIZES.s },
  errorText: { color: COLORS.error, fontSize: 14, flex: 1 },

  // AI Risk Card Styles
  riskCard: {
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.l,
    borderWidth: 1,
  },
  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.xs },
  riskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riskTitle: { fontSize: 16, fontWeight: 'bold' },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  riskBadgeText: { color: COLORS.surface, fontSize: 11, fontWeight: 'bold' },
  riskDesc: { fontSize: 13, color: COLORS.text, lineHeight: 19, marginTop: 4, marginBottom: SIZES.s },
  recsBox: { marginTop: SIZES.xs, paddingTop: SIZES.xs, borderTopWidth: 1, borderTopColor: '#00000010' },
  recsHeader: { fontSize: 12, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: 6 },
  recItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  recDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  recActionText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  recReasonText: { fontSize: 11, color: COLORS.textSecondary },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: SIZES.l },
  statCard: { width: '48%', backgroundColor: COLORS.surface, padding: SIZES.m, borderRadius: SIZES.radius, marginBottom: SIZES.m, borderWidth: 1, borderColor: COLORS.border },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.s },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 2 },
  statLabel: { fontSize: 13, color: COLORS.textSecondary },
  aiBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.secondary, borderRadius: SIZES.radius, padding: SIZES.m, marginBottom: SIZES.l },
  aiBannerContent: { flex: 1, marginRight: SIZES.m },
  aiBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  aiBannerTitle: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
  aiBannerSub: { color: '#F8F9FAEE', fontSize: 13 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.m },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  seeAllText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  recommendCard: { backgroundColor: COLORS.surface, padding: SIZES.m, borderRadius: SIZES.radius, marginBottom: SIZES.m, borderWidth: 1, borderColor: COLORS.border },
  recommendTag: { alignSelf: 'flex-start', backgroundColor: '#4361EE15', paddingHorizontal: SIZES.s, paddingVertical: 2, borderRadius: 4, marginBottom: SIZES.xs },
  recommendTagText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
  recommendTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  recommendDesc: { fontSize: 13, color: COLORS.textSecondary },
  emptyCard: { backgroundColor: COLORS.surface, padding: SIZES.l, borderRadius: SIZES.radius, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 14 },
});
