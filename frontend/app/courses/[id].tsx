import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, FileText, HelpCircle, ChevronRight, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY } from '../../src/constants/theme';
import axiosClient from '../../src/api/axiosClient';
import { Topic } from '../../src/types';

export default function CourseDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const courseId = Number(id);

  const isValidCourseId =
    typeof id === 'string' &&
    id.trim() !== '' &&
    Number.isSafeInteger(courseId) &&
    courseId > 0;

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatingTopicId, setGeneratingTopicId] = useState<number | null>(null);

useEffect(() => {
let active = true;

const fetchTopics = async () => {
    if (!isValidCourseId) {
    setTopics([]);
    setErrorMsg('Mã môn học không hợp lệ');
    setLoading(false);
    return;
    }

    try {
    setLoading(true);
    setErrorMsg('');

    const response = await axiosClient.get(
        `/courses/${courseId}/topics`,
    );

    if (active) {
        setTopics(response.data);
    }
    } catch (error) {
    if (active) {
        setTopics([]);
        setErrorMsg('Không thể tải các chủ đề học tập');
    }
    } finally {
    if (active) {
        setLoading(false);
    }
    }
};

void fetchTopics();

return () => {
    active = false;
};
}, [id]);

  const handleGenerateAiQuiz = async (topicId: number, topicTitle: string) => {
    try {
      setGeneratingTopicId(topicId);
      const response = await axiosClient.post('/tutor/generate-questions', {
        topicId,
        count: 4,
      });

      if (response.data?.quiz_id) {
        Alert.alert(
          'Đã tạo Quiz thành công! ✨',
          `AI vừa biên soạn xong bộ đề trắc nghiệm cho chủ đề "${topicTitle}". Bắt đầu làm bài ngay nhé!`,
          [
            { text: 'Để sau', style: 'cancel' },
            {
              text: 'Làm bài ngay',
              onPress: () => router.push(`/quiz/${response.data.quiz_id}` as any),
            },
          ]
        );
      } else {
        Alert.alert('Thành công', 'Đã sinh câu hỏi ôn tập thành công!');
      }
    } catch (err: any) {
      console.error('Lỗi sinh Quiz AI:', err);
      Alert.alert(
        'Không thể tạo Quiz',
        err?.response?.data?.message || 'Gia sư AI hiện đang bận, vui lòng thử lại sau.'
      );
    } finally {
      setGeneratingTopicId(null);
    }
  };

if (loading) {
    return (
    <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải nội dung khóa học...</Text>
    </View>
    );
}

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết Môn học & Bài tập</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {errorMsg ? (
        <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
        ) : null}

        {topics.map((topic, index) => (
        <View key={topic.id} style={styles.topicCard}>
            <View style={styles.topicHeader}>
            <View style={styles.topicBadge}>
                <Text style={styles.topicBadgeText}>Chủ đề {index + 1}</Text>
            </View>
            <Text style={styles.topicTitle}>{topic.title}</Text>
            {topic.description ? (
                <Text style={styles.topicDesc}>{topic.description}</Text>
            ) : null}
            </View>

            {/* 1. Danh sách Tài liệu */}
            <View style={styles.sectionGroup}>
            <Text style={styles.sectionLabel}>Tài liệu bài học</Text>
            {topic.materials && topic.materials.length > 0 ? (
                topic.materials.map((m) => (
                <TouchableOpacity
                    key={m.id}
                    style={styles.itemRow}
                    onPress={() => router.push(`/materials/${m.id}`)}
                >
                    <FileText size={20} color={COLORS.primary} />
                    <Text style={styles.itemTitle} numberOfLines={1}>
                    {m.title}
                    </Text>
                    <ChevronRight size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
                ))
            ) : (
                <View style={[styles.itemRow, { justifyContent: 'center', opacity: 0.7 }]}>
                <Text style={[styles.quizTime, { fontStyle: 'italic' }]}>Chưa có tài liệu cho chủ đề này</Text>
                </View>
            )}
            </View>

            {/* 2. Danh sách Bài kiểm tra Quiz */}
            <View style={styles.sectionGroup}>
            <Text style={styles.sectionLabel}>Bài kiểm tra đánh giá</Text>
            {topic.quizzes && topic.quizzes.length > 0 ? (
                topic.quizzes.map((q) => (
                <TouchableOpacity
                    key={q.id}
                    style={[styles.itemRow, styles.quizRow]}
                    onPress={() => router.push(`/quiz/${q.id}`)}
                >
                    <HelpCircle size={20} color={COLORS.secondary} />
                    <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                        {q.title}
                    </Text>
                    <Text style={styles.quizTime}>Thời gian: {q.time_limit_minutes} phút</Text>
                    </View>
                    <View style={styles.startQuizBadge}>
                    <Text style={styles.startQuizText}>Làm bài</Text>
                    </View>
                </TouchableOpacity>
                ))
            ) : (
                <View style={[styles.itemRow, { justifyContent: 'center', opacity: 0.7 }]}>
                <Text style={[styles.quizTime, { fontStyle: 'italic' }]}>Chưa có bài kiểm tra cho chủ đề này</Text>
                </View>
            )}
            </View>

            {/* Nút Tạo Quiz ôn tập AI từ bài này */}
            <TouchableOpacity
              style={[
                styles.aiQuizBtn,
                generatingTopicId === topic.id && styles.aiQuizBtnLoading,
              ]}
              onPress={() => handleGenerateAiQuiz(topic.id, topic.title)}
              disabled={generatingTopicId === topic.id}
              activeOpacity={0.8}
            >
              {generatingTopicId === topic.id ? (
                <View style={styles.aiQuizRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.aiQuizBtnText}>AI đang biên soạn đề thi trắc nghiệm...</Text>
                </View>
              ) : (
                <View style={styles.aiQuizRow}>
                  <Sparkles size={16} color="#FFFFFF" />
                  <Text style={styles.aiQuizBtnText}>✨ Tạo Quiz ôn tập AI từ bài này</Text>
                </View>
              )}
            </TouchableOpacity>
        </View>
        ))}

        {topics.length === 0 && !errorMsg ? (
        <View style={styles.emptyContainer}>
            <BookOpen size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Môn học này chưa có chủ đề nào.</Text>
        </View>
        ) : null}
    </ScrollView>
    </View>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: COLORS.background },
centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
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
headerTitle: { fontSize: 20,
fontWeight: '600',
color: COLORS.text, },
content: { padding: SIZES.m, paddingBottom: SIZES.xl },
errorCard: { backgroundColor: '#EF233C15', padding: SIZES.m, borderRadius: SIZES.radius, marginBottom: SIZES.m },
errorText: { color: COLORS.error, textAlign: 'center' },
topicCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.m,
    marginBottom: SIZES.m,
    borderWidth: 1,
    borderColor: COLORS.border,
},
topicHeader: { marginBottom: SIZES.m },
topicBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 6 },
topicBadgeText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
topicTitle: {fontSize: 20,
fontWeight: '600',
color: COLORS.text, marginBottom: 4 },
topicDesc: { fontSize: 13, color: COLORS.textSecondary },
sectionGroup: { marginTop: SIZES.s, paddingTop: SIZES.s, borderTopWidth: 1, borderTopColor: COLORS.border },
sectionLabel: { fontSize: 12, fontWeight: 'bold', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: SIZES.s },
itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.s + 2,
    paddingHorizontal: SIZES.s,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius - 4,
    marginBottom: 6,
    gap: SIZES.s,
},
quizRow: { borderWidth: 1, borderColor: '#7209B730' },
itemTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
quizTime: { fontSize: 12, color: COLORS.textSecondary },
startQuizBadge: { backgroundColor: COLORS.secondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
startQuizText: { color: COLORS.surface, fontSize: 12, fontWeight: 'bold' },
emptyContainer: { alignItems: 'center', marginTop: SIZES.xl, padding: SIZES.xl },
emptyText: { marginTop: SIZES.m, color: COLORS.textSecondary, fontSize: 14 },
aiQuizBtn: {
  marginTop: SIZES.m,
  backgroundColor: COLORS.primary,
  borderRadius: SIZES.radiusBtn,
  paddingVertical: 10,
  paddingHorizontal: SIZES.m,
  alignItems: 'center',
  justifyContent: 'center',
  ...SHADOWS.soft,
},
aiQuizBtnLoading: {
  backgroundColor: '#6366F1',
  opacity: 0.85,
},
aiQuizRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},
aiQuizBtnText: {
  color: '#FFFFFF',
  fontWeight: '700',
  fontSize: 13,
},
});