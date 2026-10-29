import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Award, CheckCircle, XCircle, Target, ArrowRight, RotateCcw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, TYPOGRAPHY } from '../../../src/constants/theme';
import axiosClient from '../../../src/api/axiosClient';
import { QuizAttemptResult, SkillBreakdownItem } from '../../../src/types';

export default function QuizResultScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
const router = useRouter();

const [attempt, setAttempt] = useState<QuizAttemptResult | null>(null);
const [loading, setLoading] = useState(true);
const [errorMsg, setErrorMsg] = useState('');

useEffect(() => {
if (!id || Array.isArray(id)) {
    setErrorMsg('Không tìm thấy mã lượt làm bài');
    setLoading(false);
    return;
}

fetchAttemptResult();
}, [id]);

const fetchAttemptResult = async () => {
if (!id || Array.isArray(id)) return;

try {
    setLoading(true);
    setErrorMsg('');

    const response = await axiosClient.get(`/quiz-attempts/${id}`);
    setAttempt(response.data);
} catch (error: any) {
    setErrorMsg(
    error.response?.data?.message || 'Không thể tải kết quả kiểm tra'
    );
} finally {
    setLoading(false);
}
};

const parseSkillBreakdown = (raw: string | Record<string, SkillBreakdownItem>): Record<string, SkillBreakdownItem> => {
    if (typeof raw === 'object' && raw !== null) return raw;
    try {
    return JSON.parse(raw);
    } catch {
    return {};
    }
};

if (loading) {
    return (
    <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tổng hợp điểm số và phân tích kỹ năng...</Text>
    </View>
    );
}

if (errorMsg || !attempt) {
    return (
    <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMsg || 'Không tìm thấy kết quả'}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.primaryBtnText}>Về trang chủ</Text>
        </TouchableOpacity>
    </View>
    );
}

const skillData = parseSkillBreakdown(attempt.skill_breakdown);
const isPassed = attempt.score >= 5.0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, SIZES.m),
          paddingBottom: Math.max(insets.bottom, 16) + 32,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
    {/* Card Thống kê Điểm số Lớn */}
    <View style={[styles.scoreCard, isPassed ? styles.scoreCardPass : styles.scoreCardFail]}>
        <Award size={48} color={isPassed ? COLORS.success : COLORS.error} />
        <Text style={styles.scoreText}>{attempt.score.toFixed(1)} / 10</Text>
        <Text style={styles.scoreLabel}>
        {isPassed ? 'Chúc mừng! Bạn đã đạt yêu cầu' : 'Cần cố gắng hơn ở lượt sau!'}
        </Text>

        <View style={styles.statsRow}>
        <View style={styles.statBox}>
            <CheckCircle size={20} color={COLORS.success} />
            <Text style={styles.statValue}>{attempt.correct_answers_count}</Text>
            <Text style={styles.statLabel}>Câu đúng</Text>
        </View>
        <View style={styles.dividerVertical} />
        <View style={styles.statBox}>
            <XCircle size={20} color={COLORS.error} />
            <Text style={styles.statValue}>{attempt.total_questions - attempt.correct_answers_count}</Text>
            <Text style={styles.statLabel}>Câu sai</Text>
        </View>
        </View>
    </View>

    {/* Phân tích Kỹ năng Chi tiết (skill_breakdown) */}
    <View style={styles.sectionHeader}>
        <Target size={20} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Phân tích kỹ năng (Skill Breakdown)</Text>
    </View>

    <View style={styles.skillsContainer}>
        {Object.keys(skillData).length > 0 ? (
        Object.entries(skillData).map(([tag, stat]) => {
            const pct = Math.round(stat.percentage);
            const isGood = pct >= 70;
            return (
            <View key={tag} style={styles.skillItemCard}>
                <View style={styles.skillItemHeader}>
                <Text style={styles.skillTagTitle}>{tag}</Text>
                <Text style={[styles.skillPctText, { color: isGood ? COLORS.success : COLORS.error }]}>
                    {pct}% ({stat.correct}/{stat.total})
                </Text>
                </View>

                {/* Progress Bar Kỹ năng */}
                <View style={styles.skillTrack}>
                <View
                    style={[
                    styles.skillBar,
                    {
                        width: `${pct}%`,
                        backgroundColor: isGood ? COLORS.success : COLORS.error,
                    },
                    ]}
                />
                </View>
            </View>
            );
        })
        ) : (
        <Text style={styles.emptyText}>Chưa có dữ liệu phân tích chi tiết cho bài học này.</Text>
        )}
    </View>

    {/* Các Nút Thao tác Tiếp theo */}
    <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.planBtn} onPress={() => router.push('/(tabs)/plan')}>
        <Text style={styles.planBtnText}>Xem Lộ trình đề xuất từ AI</Text>
        <ArrowRight size={20} color={COLORS.surface} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)')}>
        <RotateCcw size={18} color={COLORS.text} />
        <Text style={styles.homeBtnText}>Quay về Trang chủ</Text>
        </TouchableOpacity>
    </View>
    </ScrollView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: COLORS.background },
centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: SIZES.m },
loadingText: { marginTop: SIZES.m, color: COLORS.textSecondary },
errorText: { color: COLORS.error, fontSize: 16, marginBottom: SIZES.m },
content: { padding: SIZES.m, paddingBottom: SIZES.xl },
scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.l,
    alignItems: 'center',
    marginBottom: SIZES.l,
    borderWidth: 1,
    borderColor: COLORS.border,
},
scoreCardPass: { borderColor: COLORS.success, backgroundColor: '#2EC4B60A' },
scoreCardFail: { borderColor: COLORS.error, backgroundColor: '#EF233C0A' },
scoreText: { fontSize: 36, fontWeight: 'bold', color: COLORS.text, marginTop: SIZES.s },
scoreLabel: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, marginBottom: SIZES.m },
statsRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SIZES.m, width: '100%' },
statBox: { flex: 1, alignItems: 'center' },
statValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
statLabel: { fontSize: 12, color: COLORS.textSecondary },
dividerVertical: { width: 1, height: 30, backgroundColor: COLORS.border },
sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SIZES.m },
sectionTitle: {
fontSize: 20,
fontWeight: '600',
color: COLORS.text,
},
skillsContainer: { gap: SIZES.s, marginBottom: SIZES.l },
skillItemCard: { backgroundColor: COLORS.surface, padding: SIZES.m, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border },
skillItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.s },
skillTagTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
skillPctText: { fontSize: 14, fontWeight: 'bold' },
skillTrack: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
skillBar: { height: '100%' },
emptyText: { color: COLORS.textSecondary, textAlign: 'center', padding: SIZES.m },
actionsContainer: { gap: SIZES.m },
planBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SIZES.s, backgroundColor: COLORS.primary, padding: SIZES.m, borderRadius: SIZES.radius },
planBtnText: { color: COLORS.surface, fontSize: 16, fontWeight: 'bold' },
homeBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SIZES.s, backgroundColor: COLORS.surface, padding: SIZES.m, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border },
homeBtnText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
primaryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SIZES.l, paddingVertical: SIZES.s, borderRadius: SIZES.radius },
primaryBtnText: { color: COLORS.surface, fontWeight: 'bold' },
});