import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Layers,
  RotateCw,
  Plus,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Calendar,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY } from '../src/constants/theme';
import axiosClient from '../src/api/axiosClient';
import { Flashcard, Course } from '../src/types';

export default function FlashcardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'DUE' | 'ALL'>('DUE');

  // Trạng thái thẻ đang học
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Modal tạo thẻ mới
  const [modalVisible, setModalVisible] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');

  // Animation lật thẻ
  const flipAnim = useRef(new Animated.Value(0)).current;

  const fetchCards = async (mode: 'DUE' | 'ALL' = viewMode) => {
    try {
      setLoading(true);
      const endpoint = mode === 'DUE' ? '/flashcards/due' : '/flashcards';
      const [cardsRes, coursesRes] = await Promise.allSettled([
        axiosClient.get(endpoint),
        axiosClient.get('/courses/catalog'),
      ]);

      if (cardsRes.status === 'fulfilled') {
        setCards(cardsRes.value.data || []);
      }
      if (coursesRes.status === 'fulfilled') {
        setCourses(coursesRes.value.data || []);
      }
      setCurrentIndex(0);
      setIsFlipped(false);
      flipAnim.setValue(0);
    } catch (error) {
      console.error('Lỗi khi tải Flashcards:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách thẻ ôn tập.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCards(viewMode);
    }, [viewMode])
  );

  const flipCard = () => {
    if (isFlipped) {
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setIsFlipped(false));
    } else {
      Animated.timing(flipAnim, {
        toValue: 180,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setIsFlipped(true));
    }
  };

  const handleReview = async (quality: number) => {
    const currentCard = cards[currentIndex];
    if (!currentCard || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await axiosClient.post(`/flashcards/${currentCard.id}/review`, { quality });

      // Lật lại mặt trước cho thẻ tiếp theo
      flipAnim.setValue(0);
      setIsFlipped(false);

      if (currentIndex < cards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Đã học hết các thẻ trong đợt này
        setCurrentIndex(cards.length);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể lưu đánh giá thẻ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCard = async () => {
    if (!newFront.trim() || !newBack.trim()) {
      setFormError('Vui lòng nhập đầy đủ câu hỏi và câu trả lời.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');
      await axiosClient.post('/flashcards', {
        front: newFront.trim(),
        back: newBack.trim(),
        course_id: selectedCourseId,
      });

      setModalVisible(false);
      setNewFront('');
      setNewBack('');
      setSelectedCourseId(null);
      Alert.alert('Thành công', 'Đã tạo thẻ Flashcard mới!');
      fetchCards(viewMode);
    } catch (error: any) {
      setFormError(error?.response?.data?.message || 'Không thể tạo thẻ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const currentCard = cards[currentIndex];
  const isFinished = cards.length > 0 && currentIndex >= cards.length;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang chuẩn bị bộ thẻ ôn tập...</Text>
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
        <Text style={styles.headerTitle}>Ôn tập Flashcards (SM-2)</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Tạo thẻ</Text>
        </TouchableOpacity>
      </View>

      {/* Mode Switcher Tabs */}
      <View style={styles.modeTabsWrapper}>
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'DUE' && styles.modeTabActive]}
            onPress={() => setViewMode('DUE')}
            activeOpacity={0.8}
          >
            <Calendar size={15} color={viewMode === 'DUE' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.modeTabText, viewMode === 'DUE' && styles.modeTabTextActive]}>
              Cần ôn hôm nay
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'ALL' && styles.modeTabActive]}
            onPress={() => setViewMode('ALL')}
            activeOpacity={0.8}
          >
            <Layers size={15} color={viewMode === 'ALL' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.modeTabText, viewMode === 'ALL' && styles.modeTabTextActive]}>
              Toàn bộ kho thẻ
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Study Area */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <CheckCircle2 size={44} color={COLORS.success} />
            </View>
            <Text style={styles.emptyTitle}>
              {viewMode === 'DUE'
                ? 'Tuyệt vời! Bạn không còn thẻ nào cần ôn hôm nay'
                : 'Chưa có thẻ Flashcard nào'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {viewMode === 'DUE'
                ? 'Thuật toán SuperMemo-2 đã tự động giãn cách lịch ôn. Hãy quay lại vào ngày mai hoặc bấm "Tạo thẻ" để bổ sung kiến thức.'
                : 'Bắt đầu tạo các thẻ ghi nhớ đầu tiên cho các môn học để kích hoạt thuật toán lặp lại ngắt quãng.'}
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Tạo thẻ Flashcard mới</Text>
            </TouchableOpacity>
          </View>
        ) : isFinished ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Sparkles size={44} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Hoàn thành buổi ôn tập!</Text>
            <Text style={styles.emptySubtitle}>
              Bạn vừa ôn luyện xong {cards.length} thẻ theo thuật toán SM-2. Các khoảng giãn cách (intervals) đã được cập nhật tối ưu theo trí nhớ của bạn.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setCurrentIndex(0);
                setIsFlipped(false);
                flipAnim.setValue(0);
              }}
              activeOpacity={0.8}
            >
              <RotateCw size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Ôn lại một lượt</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.studyCardContainer}>
            {/* Progress Header */}
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                Thẻ {currentIndex + 1} / {cards.length}
              </Text>
              {currentCard?.course ? (
                <View style={styles.courseTag}>
                  <BookOpen size={12} color={COLORS.primary} />
                  <Text style={styles.courseTagText}>{currentCard.course.code}</Text>
                </View>
              ) : null}
            </View>

            {/* Interactive Flip Card */}
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={flipCard}
              style={styles.cardTouchArea}
            >
              {/* Mặt trước: Câu hỏi */}
              <Animated.View
                style={[
                  styles.cardSurface,
                  styles.cardFront,
                  {
                    transform: [{ rotateY: frontInterpolate }],
                    backfaceVisibility: 'hidden',
                  },
                ]}
              >
                <View style={styles.cardHeaderBadge}>
                  <Text style={styles.cardHeaderBadgeText}>MẶT TRƯỚC (CÂU HỎI / KHÁI NIỆM)</Text>
                </View>
                <Text style={styles.cardContentText}>{currentCard?.front}</Text>
                <View style={styles.flipHintRow}>
                  <RotateCw size={14} color={COLORS.textSecondary} />
                  <Text style={styles.flipHintText}>Chạm vào thẻ để xem đáp án</Text>
                </View>
              </Animated.View>

              {/* Mặt sau: Câu trả lời */}
              <Animated.View
                style={[
                  styles.cardSurface,
                  styles.cardBack,
                  {
                    transform: [{ rotateY: backInterpolate }],
                    backfaceVisibility: 'hidden',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  },
                ]}
              >
                <View style={[styles.cardHeaderBadge, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[styles.cardHeaderBadgeText, { color: COLORS.success }]}>
                    MẶT SAU (ĐÁP ÁN & GIẢI THÍCH)
                  </Text>
                </View>
                <Text style={[styles.cardContentText, { color: '#065F46' }]}>
                  {currentCard?.back}
                </Text>
                <View style={styles.flipHintRow}>
                  <CheckCircle2 size={14} color={COLORS.success} />
                  <Text style={[styles.flipHintText, { color: COLORS.success }]}>
                    Hãy tự đánh giá độ nhớ bên dưới
                  </Text>
                </View>
              </Animated.View>
            </TouchableOpacity>

            {/* SM-2 Rating Scale Buttons */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingSectionTitle}>
                {isFlipped ? 'Đánh giá mức độ nhớ của bạn (Thuật toán SM-2):' : 'Lật thẻ xem đáp án để chấm điểm:'}
              </Text>

              <View style={styles.ratingButtonsRow}>
                {[
                  { q: 1, label: 'Quên hẳn', color: '#EF4444', desc: 'Học lại' },
                  { q: 2, label: 'Nhớ sai', color: '#F97316', desc: 'Sai sót' },
                  { q: 3, label: 'Khó khăn', color: '#F59E0B', desc: 'Đạt' },
                  { q: 4, label: 'Nhớ tốt', color: '#3B82F6', desc: 'Tốt' },
                  { q: 5, label: 'Rất dễ', color: '#10B981', desc: 'Hoàn hảo' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.q}
                    style={[
                      styles.ratingBtn,
                      { borderColor: item.color },
                      !isFlipped && styles.ratingBtnDisabled,
                    ]}
                    onPress={() => handleReview(item.q)}
                    disabled={!isFlipped || isSubmitting}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.ratingBtnNumber, { color: item.color }]}>
                      {item.q}
                    </Text>
                    <Text style={[styles.ratingBtnLabel, { color: item.color }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal Tạo Thẻ Mới */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo thẻ Flashcard mới</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {formError ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Môn học liên kết (Tùy chọn)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseSelectScroll}>
              <TouchableOpacity
                style={[
                  styles.courseChip,
                  selectedCourseId === null && styles.courseChipSelected,
                ]}
                onPress={() => setSelectedCourseId(null)}
              >
                <Text style={[styles.courseChipText, selectedCourseId === null && styles.courseChipTextSelected]}>
                  Không chọn môn
                </Text>
              </TouchableOpacity>
              {courses.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.courseChip,
                    selectedCourseId === c.id && styles.courseChipSelected,
                  ]}
                  onPress={() => setSelectedCourseId(c.id)}
                >
                  <Text style={[styles.courseChipText, selectedCourseId === c.id && styles.courseChipTextSelected]}>
                    {c.code} - {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Mặt trước (Khái niệm / Câu hỏi) *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="VD: Cấu trúc dữ liệu Tree (Cây) là gì?"
              placeholderTextColor={COLORS.textSecondary}
              value={newFront}
              onChangeText={setNewFront}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Mặt sau (Định nghĩa / Đáp án chi tiết) *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { minHeight: 90 }]}
              placeholder="VD: Là cấu trúc dữ liệu phân cấp bao gồm các nút (nodes) kết nối với nhau bởi các cạnh (edges)..."
              placeholderTextColor={COLORS.textSecondary}
              value={newBack}
              onChangeText={setNewBack}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleCreateCard}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Lưu thẻ Flashcard</Text>
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
    paddingTop: SIZES.m,
    paddingBottom: SIZES.m,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: SIZES.radiusBtn,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modeTabsWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SIZES.l,
    paddingVertical: SIZES.s + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: SIZES.radius,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: SIZES.radius - 2,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.soft,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  modeTabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  content: {
    padding: SIZES.l,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.xxl,
    paddingHorizontal: SIZES.m,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.l,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: SIZES.xl,
    maxWidth: 320,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: SIZES.radiusBtn,
    gap: 8,
    ...SHADOWS.soft,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  studyCardContainer: {
    width: '100%',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.m,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  courseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  courseTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardTouchArea: {
    minHeight: 280,
    position: 'relative',
    marginBottom: SIZES.xl,
  },
  cardSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: SIZES.radiusCard,
    padding: SIZES.l,
    minHeight: 280,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },
  cardFront: {
    backgroundColor: '#FFFFFF',
  },
  cardBack: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  cardHeaderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  cardContentText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 28,
    textAlign: 'center',
    marginVertical: SIZES.l,
  },
  flipHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  flipHintText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  ratingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: SIZES.radiusCard,
    padding: SIZES.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  ratingSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.m,
    textAlign: 'center',
  },
  ratingButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  ratingBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  ratingBtnDisabled: {
    opacity: 0.35,
  },
  ratingBtnNumber: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  ratingBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SIZES.l,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.m,
    paddingBottom: SIZES.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: SIZES.s,
  },
  courseSelectScroll: {
    flexDirection: 'row',
    marginBottom: SIZES.s,
  },
  courseChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  courseChipSelected: {
    backgroundColor: COLORS.primary,
  },
  courseChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  courseChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: SIZES.s,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: SIZES.l,
    marginBottom: SIZES.s,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

