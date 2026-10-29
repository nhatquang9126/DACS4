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
import { ArrowLeft, Clock, CheckCircle, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react-native';
import { COLORS, SIZES, TYPOGRAPHY } from '../../src/constants/theme';
import axiosClient from '../../src/api/axiosClient';
import { QuizDetail } from '../../src/types';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizScreen() {
const { id } = useLocalSearchParams<{ id: string }>();
const router = useRouter();

const [quiz, setQuiz] = useState<QuizDetail | null>(null);
const [currentIndex, setCurrentIndex] = useState(0);
const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
const [timeLeft, setTimeLeft] = useState<number>(0);
const [loading, setLoading] = useState(true);
const [submitting, setSubmitting] = useState(false);
const [errorMsg, setErrorMsg] = useState('');

useEffect(() => {
    console.log('QUIZ SCREEN ĐÃ MỞ');
    console.log('Quiz ID:', id);
}, [id]);

useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
    setTimeLeft((prev) => {
        if (prev <= 1) {
        clearInterval(timer);
        handleAutoSubmit();
        return 0;
        }
        return prev - 1;
    });
    }, 1000);

    return () => clearInterval(timer);
}, [timeLeft]);

const fetchQuiz = async () => {
    try {
    setLoading(true);
    setErrorMsg('');
    const response = await axiosClient.get(`/quizzes/${id}/questions`);
    console.log('QUIZ API RESPONSE:', JSON.stringify(response.data, null, 2));
    setQuiz(response.data);
    if (response.data.time_limit_minutes) {
        setTimeLeft(response.data.time_limit_minutes * 60);
    }
    } catch (error: any) {
    setErrorMsg('Không thể tải dữ liệu bài kiểm tra');
    } finally {
    setLoading(false);
    }
};

useEffect(() => {
  if (id) {
    fetchQuiz();
  }
}, [id]);

const handleSelectOption = (questionId: number, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
    ...prev,
    [questionId]: optionIndex,
    }));
};

// Hàm parse an toàn cả Chuỗi JSON và Mảng
const parseOptions = (optionsRaw: any): string[] => {
    if (!optionsRaw) return [];
    if (Array.isArray(optionsRaw)) return optionsRaw;
    if (typeof optionsRaw === 'string') {
    try {
        const parsed = JSON.parse(optionsRaw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
    }
    return [];
};

const handleAutoSubmit = () => {
    Alert.alert('Hết giờ!', 'Thời gian làm bài đã hết. Hệ thống sẽ tự động nộp bài của bạn.', [
    { text: 'Đồng ý', onPress: () => submitQuiz() },
    ]);
};

const confirmSubmit = () => {
    const totalQ = quiz?.questions.length || 0;
    const answeredCount = Object.keys(selectedAnswers).length;

    Alert.alert(
    'Xác nhận nộp bài',
    `Bạn đã làm ${answeredCount}/${totalQ} câu hỏi. Bạn có chắc chắn muốn nộp bài không?`,
    [
        { text: 'Làm tiếp', style: 'cancel' },
        { text: 'Nộp bài', onPress: () => submitQuiz() },
    ]
    );
};

const submitQuiz = async () => {
    if (!quiz || submitting) return;

    try {
    setSubmitting(true);
    const payload = {
        answers: quiz.questions.map((q) => ({
        question_id: q.id,
        selected_option_index: selectedAnswers[q.id] ?? -1,
        })),
    };

    const response = await axiosClient.post(`/quizzes/${id}/submit`, payload);

        console.log('Kết quả API nộp bài:', response.data);

        const attemptId = response.data.attempt_id;

        if (attemptId == null) {
        Alert.alert(
            'Lỗi',
            'Không tìm thấy ID lượt làm bài. Vui lòng kiểm tra phản hồi từ Backend.'
        );
        return;
        }

        router.replace(`/quiz/result/${attemptId}`);
    } catch (error: any) {
    Alert.alert('Lỗi nộp bài', error.response?.data?.message || 'Có lỗi xảy ra khi gửi bài làm.');
    } finally {
    setSubmitting(false);
    }
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

if (loading) {
    return (
    <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải câu hỏi kiểm tra...</Text>
    </View>
    );
}

if (errorMsg || !quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
    <View style={styles.centerContainer}>
        <AlertCircle size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{errorMsg || 'Không tìm thấy câu hỏi cho bài kiểm tra này.'}</Text>
        <TouchableOpacity style={styles.backBtnAction} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
    </View>
    );
}

const currentQuestion = quiz.questions[currentIndex];
const optionsList = parseOptions(currentQuestion.options);
const isSelected = selectedAnswers[currentQuestion.id];

return (
    <View style={styles.container}>
    {/* Top Header */}
    <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={submitting}>
        <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
        {quiz.title}
        </Text>
        <View style={styles.timerBadge}>
        <Clock size={16} color={COLORS.error} />
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
    </View>

    {/* Progress Bar */}
    <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
        <View
            style={[
            styles.progressBar,
            { width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` },
            ]}
        />
        </View>
        <Text style={styles.progressText}>
        Câu {currentIndex + 1}/{quiz.questions.length}
        </Text>
    </View>

    <ScrollView contentContainerStyle={styles.content}>
        {/* Câu hỏi */}
        <View style={styles.questionCard}>
        <View style={styles.tagBadge}>
            <Text style={styles.tagText}>Thẻ: {currentQuestion.skill_tag}</Text>
        </View>
        <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
        </View>

        {/* Danh sách Đáp án A B C D */}
        <View style={styles.optionsContainer}>
        {optionsList.map((optText, idx) => {
            const checked = isSelected === idx;
            const label = OPTION_LABELS[idx] || `${idx + 1}`;
            return (
            <TouchableOpacity
                key={idx}
                style={[styles.optionCard, checked && styles.optionCardSelected]}
                onPress={() => handleSelectOption(currentQuestion.id, idx)}
                activeOpacity={0.8}
            >
                {/* Khung nhãn A, B, C, D */}
                <View style={[styles.labelBadge, checked && styles.labelBadgeSelected]}>
                <Text style={[styles.labelText, checked && styles.labelTextSelected]}>
                    {label}
                </Text>
                </View>

                {/* Nội dung đáp án */}
                <Text style={[styles.optionText, checked && styles.optionTextSelected]}>
                {optText}
                </Text>
            </TouchableOpacity>
            );
        })}
        </View>
    </ScrollView>

    {/* Footer Điều hướng */}
    <View style={styles.footer}>
        <TouchableOpacity
        style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
        disabled={currentIndex === 0}
        onPress={() => setCurrentIndex((prev) => prev - 1)}
        >
        <ChevronLeft size={20} color={currentIndex === 0 ? COLORS.textSecondary : COLORS.text} />
        <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>
            Câu trước
        </Text>
        </TouchableOpacity>

        {currentIndex < quiz.questions.length - 1 ? (
        <TouchableOpacity
            style={[styles.navBtn, styles.nextBtn]}
            onPress={() => setCurrentIndex((prev) => prev + 1)}
        >
            <Text style={styles.nextBtnText}>Câu tiếp</Text>
            <ChevronRight size={20} color={COLORS.surface} />
        </TouchableOpacity>
        ) : (
        <TouchableOpacity
            style={[styles.navBtn, styles.submitBtn]}
            onPress={confirmSubmit}
            disabled={submitting}
        >
            {submitting ? (
            <ActivityIndicator color={COLORS.surface} />
            ) : (
            <>
                <CheckCircle size={20} color={COLORS.surface} />
                <Text style={styles.submitBtnText}>Nộp bài</Text>
            </>
            )}
        </TouchableOpacity>
        )}
    </View>
    </View>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: COLORS.background },
centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: SIZES.m },
loadingText: { marginTop: SIZES.m, color: COLORS.textSecondary },
errorText: { color: COLORS.error, marginTop: SIZES.m, textAlign: 'center', fontSize: 16 },
backBtnAction: { marginTop: SIZES.l, backgroundColor: COLORS.primary, paddingHorizontal: SIZES.l, paddingVertical: SIZES.s, borderRadius: SIZES.radius },
backBtnText: { color: COLORS.surface, fontWeight: 'bold' },
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
headerTitle: { fontSize: 20,
fontWeight: '600',
color: COLORS.text, flex: 1, marginHorizontal: SIZES.s },
timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF233C15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
timerText: { color: COLORS.error, fontWeight: 'bold', fontSize: 13 },
progressContainer: { paddingHorizontal: SIZES.m, paddingTop: SIZES.m, backgroundColor: COLORS.surface },
progressTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
progressBar: { height: '100%', backgroundColor: COLORS.primary },
progressText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, textAlign: 'right', fontWeight: '500' },
content: { padding: SIZES.m, paddingBottom: SIZES.xl },
questionCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: SIZES.m, marginBottom: SIZES.m, borderWidth: 1, borderColor: COLORS.border },
tagBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: SIZES.s },
tagText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
questionText: { fontSize: 20,
fontWeight: '600',
color: COLORS.text, lineHeight: 26 },
optionsContainer: { gap: SIZES.s },
optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SIZES.m,
},
optionCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
labelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
},
labelBadgeSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
},
labelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
},
labelTextSelected: {
    color: COLORS.surface,
},
optionText: { flex: 1, fontSize: 15, color: COLORS.text, lineHeight: 22 },
optionTextSelected: { color: COLORS.primary, fontWeight: '600' },
footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SIZES.m,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
},
navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SIZES.m, paddingVertical: SIZES.s + 2, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border },
navBtnDisabled: { opacity: 0.5 },
navBtnText: { color: COLORS.text, fontWeight: '600' },
navBtnTextDisabled: { color: COLORS.textSecondary },
nextBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
nextBtnText: { color: COLORS.surface, fontWeight: 'bold' },
submitBtn: { backgroundColor: COLORS.success, borderColor: COLORS.success, gap: 6 },
submitBtnText: { color: COLORS.surface, fontWeight: 'bold' },
});