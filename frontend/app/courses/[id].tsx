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
import {
  ArrowLeft,
  BookOpen,
  FileText,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Video,
  Code2,
  Clock,
  ExternalLink,
  GraduationCap,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY } from '../../src/constants/theme';
import axiosClient from '../../src/api/axiosClient';
import { Topic, Course } from '../../src/types';
import DifficultyBadge from '../../src/components/DifficultyBadge';

const getMaterialTypeMeta = (type?: string, contentType?: string) => {
  const t = (type || contentType || 'READING').toUpperCase();
  if (t === 'VIDEO' || t === 'VIDEO_URL') {
    return {
      label: 'Video',
      icon: Video,
      color: '#E11D48',
      bgColor: '#FFE4E6',
      badgeText: '🎥 Video',
    };
  }
  if (t === 'DOCUMENT_URL' || t === 'PDF' || t === 'SLIDE') {
    return {
      label: 'Slide PDF',
      icon: FileText,
      color: '#D97706',
      bgColor: '#FEF3C7',
      badgeText: '📄 Slide PDF',
    };
  }
  if (t === 'CODE_SNIPPET' || t === 'CODE') {
    return {
      label: 'Code mẫu',
      icon: Code2,
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      badgeText: '💻 Code',
    };
  }
  return {
    label: 'Bài đọc',
    icon: BookOpen,
    color: '#4F46E5',
    bgColor: '#EEF2FF',
    badgeText: '📖 Bài đọc',
  };
};

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

  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatingTopicId, setGeneratingTopicId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const fetchCourseData = async () => {
      if (!isValidCourseId) {
        setTopics([]);
        setErrorMsg('Mã môn học không hợp lệ');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMsg('');

        // Thử lấy thông tin chi tiết môn học kèm topics và materials
        try {
          const detailRes = await axiosClient.get(`/courses/${courseId}`);
          if (active && detailRes.data) {
            setCourse(detailRes.data);
            if (Array.isArray(detailRes.data.topics)) {
              setTopics(detailRes.data.topics);
              setLoading(false);
              return;
            }
          }
        } catch (detailErr) {
          // Fallback sang endpoint topics nếu endpoint trên chưa hỗ trợ
        }

        const response = await axiosClient.get(`/courses/${courseId}/topics`);
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

    void fetchCourseData();

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
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {course?.name || 'Chi tiết Môn học'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Môn học & Độ khó */}
        {course ? (
          <View style={styles.courseBanner}>
            <View style={styles.courseBannerHeader}>
              <View style={styles.courseCodeBadge}>
                <Text style={styles.courseCodeText}>{course.code}</Text>
              </View>
              <DifficultyBadge difficulty={course.difficulty} credits={course.credits} />
            </View>
            <Text style={styles.courseBannerTitle}>{course.name}</Text>
            <Text style={styles.courseBannerSub}>
              {topics.length} chủ đề học tập • {topics.reduce((acc, t) => acc + (t.materials?.length || 0), 0)} tài liệu
            </Text>
          </View>
        ) : null}

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

            {/* 1. Danh sách Tài liệu học tập phong phú */}
            <View style={styles.sectionGroup}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Tài liệu bài học</Text>
                <Text style={styles.sectionCount}>
                  {topic.materials?.length || 0} bài
                </Text>
              </View>

              {topic.materials && topic.materials.length > 0 ? (
                topic.materials.map((m) => {
                  const meta = getMaterialTypeMeta(m.type, m.content_type);
                  const IconComp = meta.icon;
                  const readingTime = m.reading_time || m.readingTime || 5;

                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={styles.materialCardRow}
                      onPress={() => router.push(`/materials/${m.id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.materialIconCircle, { backgroundColor: meta.bgColor }]}>
                        <IconComp size={18} color={meta.color} />
                      </View>

                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.materialTitle} numberOfLines={1}>
                          {m.title}
                        </Text>
                        <View style={styles.materialMetaRow}>
                          <View style={[styles.typeBadgePill, { backgroundColor: meta.bgColor }]}>
                            <Text style={[styles.typeBadgeText, { color: meta.color }]}>
                              {meta.badgeText}
                            </Text>
                          </View>
                          <View style={styles.timeMeta}>
                            <Clock size={11} color={COLORS.textSecondary} />
                            <Text style={styles.timeMetaText}>{readingTime} phút đọc</Text>
                          </View>
                          {m.file_url || m.fileUrl ? (
                            <View style={styles.attachMeta}>
                              <ExternalLink size={11} color="#6366F1" />
                              <Text style={styles.attachMetaText}>Đính kèm</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      <ChevronRight size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={[styles.itemRow, { justifyContent: 'center', opacity: 0.7 }]}>
                  <Text style={[styles.quizTime, { fontStyle: 'italic' }]}>
                    Chưa có tài liệu cho chủ đề này
                  </Text>
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
courseBanner: {
  backgroundColor: COLORS.surface,
  borderRadius: SIZES.radius,
  padding: SIZES.m,
  marginBottom: SIZES.m,
  borderWidth: 1,
  borderColor: COLORS.border,
  ...SHADOWS.soft,
},
courseBannerHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
courseCodeBadge: {
  backgroundColor: COLORS.primaryLight,
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 6,
},
courseCodeText: {
  color: COLORS.primary,
  fontWeight: '700',
  fontSize: 12,
},
courseBannerTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: COLORS.text,
  marginBottom: 4,
},
courseBannerSub: {
  fontSize: 12,
  color: COLORS.textSecondary,
},
sectionGroup: { marginTop: SIZES.s, paddingTop: SIZES.s, borderTopWidth: 1, borderTopColor: COLORS.border },
sectionHeaderRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: SIZES.s,
},
sectionLabel: { fontSize: 12, fontWeight: 'bold', color: COLORS.textSecondary, textTransform: 'uppercase' },
sectionCount: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
materialCardRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 10,
  paddingHorizontal: 10,
  backgroundColor: '#F8FAFC',
  borderRadius: 10,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
materialIconCircle: {
  width: 34,
  height: 34,
  borderRadius: 17,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 10,
},
materialTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: COLORS.text,
  marginBottom: 4,
},
materialMetaRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
},
typeBadgePill: {
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
},
typeBadgeText: {
  fontSize: 10.5,
  fontWeight: '700',
},
timeMeta: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 3,
},
timeMetaText: {
  fontSize: 11,
  color: COLORS.textSecondary,
  fontWeight: '500',
},
attachMeta: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 2,
  backgroundColor: '#EEF2FF',
  paddingHorizontal: 5,
  paddingVertical: 1,
  borderRadius: 4,
},
attachMetaText: {
  fontSize: 10,
  color: '#6366F1',
  fontWeight: '600',
},
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