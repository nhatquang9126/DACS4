import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  Video,
  FileText,
  Code2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Share2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY } from '../../src/constants/theme';
import axiosClient from '../../src/api/axiosClient';
import { Material } from '../../src/types';
import MarkdownRenderer from '../../src/components/MarkdownRenderer';

const getMaterialTypeMeta = (type?: string, contentType?: string) => {
  const t = (type || contentType || 'READING').toUpperCase();
  if (t === 'VIDEO' || t === 'VIDEO_URL') {
    return {
      label: 'Video bài giảng',
      icon: Video,
      color: '#E11D48',
      bgColor: '#FFE4E6',
      badgeText: '🎥 Video bài giảng',
    };
  }
  if (t === 'DOCUMENT_URL' || t === 'PDF' || t === 'SLIDE') {
    return {
      label: 'Tài liệu / Slide PDF',
      icon: FileText,
      color: '#D97706',
      bgColor: '#FEF3C7',
      badgeText: '📄 Slide PDF',
    };
  }
  if (t === 'CODE_SNIPPET' || t === 'CODE') {
    return {
      label: 'Code mẫu thực hành',
      icon: Code2,
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      badgeText: '💻 Code Snippet',
    };
  }
  return {
    label: 'Bài đọc lý thuyết',
    icon: BookOpen,
    color: '#4F46E5',
    bgColor: '#EEF2FF',
    badgeText: '📖 Bài đọc lý thuyết',
  };
};

export default function MaterialReaderScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  useEffect(() => {
    fetchMaterial();
  }, [id]);

  const fetchMaterial = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const response = await axiosClient.get(`/materials/${id}`);
      setMaterial(response.data);
      setReadingProgress(0);
    } catch (error: any) {
      setErrorMsg(error?.response?.data?.message || 'Không thể tải bài học này');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const totalScrollable = contentSize.height - layoutMeasurement.height;
    if (totalScrollable > 0) {
      const progress = Math.min(
        100,
        Math.max(0, Math.round((contentOffset.y / totalScrollable) * 100))
      );
      setReadingProgress(progress);
    }
  };

  const handleOpenAttachment = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Không thể mở liên kết', `Địa chỉ ${url} không hợp lệ hoặc không có ứng dụng hỗ trợ.`);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể mở liên kết đính kèm.');
    }
  };

  const handleGenerateAiQuiz = async () => {
    if (!material?.topic_id) {
      Alert.alert('Lỗi', 'Không xác định được chủ đề của bài đọc này.');
      return;
    }

    try {
      setGeneratingQuiz(true);
      const response = await axiosClient.post('/tutor/generate-questions', {
        topicId: material.topic_id,
        count: 4,
      });

      if (response.data?.quiz_id) {
        Alert.alert(
          'Đã tạo Quiz thành công! ✨',
          `AI vừa biên soạn xong bài trắc nghiệm nhanh dựa trên chủ đề "${material.title}". Bạn có muốn làm bài ngay không?`,
          [
            { text: 'Để sau', style: 'cancel' },
            {
              text: 'Làm bài ngay',
              onPress: () => router.push(`/quiz/${response.data.quiz_id}` as any),
            },
          ]
        );
      } else {
        Alert.alert('Thành công', 'Đã khởi tạo câu hỏi ôn tập thành công!');
      }
    } catch (err: any) {
      console.error('Lỗi sinh Quiz AI:', err);
      Alert.alert(
        'Không thể tạo Quiz',
        err?.response?.data?.message || 'Gia sư AI hiện đang bận, vui lòng thử lại sau.'
      );
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const meta = getMaterialTypeMeta(material?.type, material?.content_type);
  const IconComp = meta.icon;
  const readingTime = material?.reading_time || material?.readingTime || 5;
  const nextMaterial = material?.next_material || material?.nextMaterial;
  const courseInfo = material?.topic?.course;
  const topicTitle = material?.topic?.title;
  const attachedFileUrl = material?.file_url || material?.fileUrl;

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang mở nội dung bài học...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Sticky Header với Tiến độ đọc */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {material?.title || 'Bài đọc'}
          </Text>
          <Text style={styles.progressText}>
            {readingProgress >= 95 ? '✅ Đã hoàn thành' : `Tiến độ đọc: ${readingProgress}%`}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.badgeProgressCircle}>
            <Text style={styles.badgeProgressNumber}>{readingProgress}%</Text>
          </View>
        </View>
      </View>

      {/* Thanh tiến độ đọc (Progress Bar chuyển màu) */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.max(5, readingProgress)}%`,
              backgroundColor: readingProgress >= 95 ? COLORS.success : COLORS.primary,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={32}
      >
        {errorMsg ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : material ? (
          <View style={styles.articleContainer}>
            {/* Breadcrumb Môn học & Chủ đề */}
            <View style={styles.breadcrumbRow}>
              {courseInfo ? (
                <Text style={styles.breadcrumbText} numberOfLines={1}>
                  {courseInfo.code} • {courseInfo.name}
                </Text>
              ) : null}
              {topicTitle ? (
                <Text style={styles.breadcrumbSub} numberOfLines={1}>
                  Chủ đề: {topicTitle}
                </Text>
              ) : null}
            </View>

            {/* Tiêu đề bài học */}
            <Text style={styles.articleTitle}>{material.title}</Text>

            {/* Metadata Bar */}
            <View style={styles.metadataBar}>
              <View style={[styles.typeBadge, { backgroundColor: meta.bgColor }]}>
                <IconComp size={14} color={meta.color} />
                <Text style={[styles.typeBadgeText, { color: meta.color }]}>
                  {meta.badgeText}
                </Text>
              </View>

              <View style={styles.timeBadge}>
                <Clock size={13} color={COLORS.textSecondary} />
                <Text style={styles.timeBadgeText}>⏱️ {readingTime} phút đọc</Text>
              </View>
            </View>

            {/* Card Đính kèm Slide/Video nếu có */}
            {attachedFileUrl ? (
              <TouchableOpacity
                style={styles.attachmentCard}
                onPress={() => handleOpenAttachment(attachedFileUrl)}
                activeOpacity={0.8}
              >
                <View style={styles.attachmentIconBox}>
                  <ExternalLink size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attachmentTitle}>Tài liệu đính kèm / Slide bài giảng</Text>
                  <Text style={styles.attachmentSub} numberOfLines={1}>
                    {attachedFileUrl}
                  </Text>
                </View>
                <ChevronRight size={18} color={COLORS.primary} />
              </TouchableOpacity>
            ) : null}

            <View style={styles.divider} />

            {/* Nội dung Markdown bài giảng hoàn chỉnh */}
            <View style={styles.markdownWrapper}>
              <MarkdownRenderer content={material.content || 'Nội dung bài học đang được cập nhật.'} />
            </View>

            {/* Bottom Section: Chuyển nhanh & Tạo Quiz AI */}
            <View style={styles.footerSection}>
              <View style={styles.completionBanner}>
                <CheckCircle2 size={24} color={COLORS.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.completionTitle}>Đã hoàn thành bài đọc!</Text>
                  <Text style={styles.completionSub}>
                    Hãy tự kiểm tra kiến thức vừa học hoặc tiếp tục sang bài mới.
                  </Text>
                </View>
              </View>

              {/* Nút Tạo Quiz AI từ bài đọc này */}
              <TouchableOpacity
                style={[styles.aiQuizBtn, generatingQuiz && styles.aiQuizBtnLoading]}
                onPress={handleGenerateAiQuiz}
                disabled={generatingQuiz}
                activeOpacity={0.8}
              >
                {generatingQuiz ? (
                  <View style={styles.btnRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.btnText}>AI đang biên soạn đề thi từ bài này...</Text>
                  </View>
                ) : (
                  <View style={styles.btnRow}>
                    <Sparkles size={18} color="#FFFFFF" />
                    <Text style={styles.btnText}>✨ Tạo Quiz ôn tập AI từ bài đọc này</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Nút Chuyển nhanh Bài tiếp theo */}
              {nextMaterial ? (
                <TouchableOpacity
                  style={styles.nextMaterialBtn}
                  onPress={() => router.push(`/materials/${nextMaterial.id}`)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextMaterialLabel}>BÀI TIẾP THEO</Text>
                    <Text style={styles.nextMaterialTitle} numberOfLines={1}>
                      {nextMaterial.title}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={COLORS.primary} />
                </TouchableOpacity>
              ) : null}

              {/* Nút Quay lại môn học */}
              <TouchableOpacity
                style={styles.backCourseBtn}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Text style={styles.backCourseText}>Quay lại danh sách môn học</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitleBox: {
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeProgressCircle: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeProgressNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: '#F1F5F9',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
  },
  articleContainer: {
    width: '100%',
  },
  breadcrumbRow: {
    marginBottom: 10,
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breadcrumbSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  articleTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 30,
    marginBottom: 12,
  },
  metadataBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 10,
  },
  attachmentIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  attachmentSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  markdownWrapper: {
    width: '100%',
    marginVertical: 8,
  },
  footerSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 14,
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 12,
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  completionSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  aiQuizBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  aiQuizBtnLoading: {
    backgroundColor: '#6366F1',
    opacity: 0.85,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextMaterialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    justifyContent: 'space-between',
  },
  nextMaterialLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  nextMaterialTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  backCourseBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  backCourseText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
