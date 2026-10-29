import React, { useState, useCallback } from 'react';
import {
View,
Text,
StyleSheet,
FlatList,
TouchableOpacity,
ActivityIndicator,
RefreshControl,
Modal,
Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BookOpen, ChevronRight, Award, Plus, X, Check, AlertCircle, GraduationCap } from 'lucide-react-native';
import { COLORS, SIZES, TYPOGRAPHY } from '../../src/constants/theme';
import axiosClient from '../../src/api/axiosClient';
import { Enrollment, Course } from '../../src/types';

export default function CoursesScreen() {
const router = useRouter();

const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
const [catalog, setCatalog] = useState<Course[]>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [errorMsg, setErrorMsg] = useState('');

// Modal Đăng ký môn
const [modalVisible, setModalVisible] = useState(false);
const [enrollingId, setEnrollingId] = useState<number | null>(null);

const fetchMyEnrollments = async () => {
    try {
    setErrorMsg('');
    const response = await axiosClient.get('/courses/my-courses');
    setEnrollments(response.data);
    } catch (error: any) {
    setErrorMsg('Không thể tải danh sách môn học đã đăng ký');
    } finally {
    setLoading(false);
    setRefreshing(false);
    }
};

const openEnrollModal = async () => {
    setModalVisible(true);
    try {
    const response = await axiosClient.get('/courses/catalog');
    setCatalog(response.data);
    } catch (error: any) {
    Alert.alert('Lỗi', 'Không thể tải danh mục môn học');
    }
};

const handleEnroll = async (courseId: number) => {
    try {
    setEnrollingId(courseId);
    await axiosClient.post('/courses/enroll', {
    course_id: courseId,
    semester: 'HK1-2026',
    });

    Alert.alert('Thành công', 'Đã đăng ký môn học thành công!');
    setModalVisible(false);
    fetchMyEnrollments();
    } catch (error: any) {
    Alert.alert('Lỗi đăng ký', error.response?.data?.message || 'Không thể đăng ký môn học.');
    } finally {
    setEnrollingId(null);
    }
};

useFocusEffect(
    useCallback(() => {
    fetchMyEnrollments();
    }, [])
);

const renderCourseItem = ({ item }: { item: Enrollment }) => {
    const avgScore = item.summary?.currentAverageScore;

    return (
    <TouchableOpacity
        style={styles.courseCard}
        onPress={() => router.push(`/courses/${item.course.id}`)}
        activeOpacity={0.7}
    >
        <View style={styles.cardHeader}>
        <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{item.course.code}</Text>
        </View>
        <Text style={styles.semesterText}>{item.semester}</Text>
        </View>

        <Text style={styles.courseName}>{item.course.name}</Text>

        {/* Điểm trung bình môn tính bằng trọng số */}
        {avgScore !== undefined && avgScore !== null ? (
        <View style={styles.scoreBadgeBox}>
            <Text style={styles.scoreLabel}>ĐTB tạm tính:</Text>
            <Text style={styles.scoreValue}>{avgScore.toFixed(2)}</Text>
        </View>
        ) : null}

        <View style={styles.cardFooter}>
        <View style={styles.creditInfo}>
            <Award size={16} color={COLORS.textSecondary} />
            <Text style={styles.creditText}>{item.course.credits} Tín chỉ</Text>
        </View>
        <View style={styles.actionBtn}>
            <Text style={styles.actionText}>Vào bài học</Text>
            <ChevronRight size={18} color={COLORS.primary} />
        </View>
        </View>
    </TouchableOpacity>
    );
};

if (loading && !refreshing) {
    return (
    <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách môn học...</Text>
    </View>
    );
}

return (
    <View style={styles.container}>
    {/* Screen Header + Action Button */}
    <View style={styles.screenHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={styles.screenTitle}>Môn học của tôi</Text>
        <Text style={styles.screenSub}>Quản lý khóa học & theo dõi tiến độ</Text>
        </View>

        <View style={styles.headerBtnGroup}>
          <TouchableOpacity style={styles.gradesBtn} onPress={() => router.push('/grades' as any)}>
            <GraduationCap size={16} color={COLORS.primary} />
            <Text style={styles.gradesBtnText}>Bảng điểm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addCourseBtn} onPress={openEnrollModal}>
            <Plus size={16} color={COLORS.surface} />
            <Text style={styles.addCourseText}>Đăng ký môn</Text>
          </TouchableOpacity>
        </View>
    </View>

    {errorMsg ? (
        <View style={styles.errorCard}>
        <AlertCircle color={COLORS.error} size={20} />
        <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
    ) : null}

    <FlatList
        data={enrollments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCourseItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMyEnrollments(); }} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
        <View style={styles.emptyCard}>
            <BookOpen size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>Chưa có môn học nào</Text>
            <Text style={styles.emptyDesc}>
            Bấm nút "Đăng ký môn" ở góc trên để chọn môn học trong học kỳ này.
            </Text>
        </View>
        }
    />

    {/* Modal Danh mục Môn học để Đăng ký */}
    <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Danh mục Môn học</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={COLORS.text} />
            </TouchableOpacity>
            </View>

            <FlatList
            data={catalog}
            keyExtractor={(c) => c.id.toString()}
            renderItem={({ item }) => {
                const isEnrolled = enrollments.some((e) => e.course.id === item.id);
                return (
                <View style={styles.catalogItem}>
                    <View style={{ flex: 1 }}>
                    <Text style={styles.catalogCode}>{item.code}</Text>
                    <Text style={styles.catalogName}>{item.name}</Text>
                    <Text style={styles.catalogCredits}>{item.credits} tín chỉ</Text>
                    </View>

                    {isEnrolled ? (
                    <View style={styles.enrolledBadge}>
                        <Check size={14} color={COLORS.success} />
                        <Text style={styles.enrolledText}>Đã học</Text>
                    </View>
                    ) : (
                    <TouchableOpacity
                        style={styles.enrollBtn}
                        onPress={() => handleEnroll(item.id)}
                        disabled={enrollingId === item.id}
                    >
                        {enrollingId === item.id ? (
                        <ActivityIndicator size="small" color={COLORS.surface} />
                        ) : (
                        <Text style={styles.enrollBtnText}>Đăng ký</Text>
                        )}
                    </TouchableOpacity>
                    )}
                </View>
                );
            }}
            />
        </View>
        </View>
    </Modal>
    </View>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: COLORS.background },
centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
loadingText: { marginTop: SIZES.m, color: COLORS.textSecondary, fontSize: 14 },
screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SIZES.m, paddingTop: SIZES.l, paddingBottom: SIZES.m },
screenTitle: {  fontSize: 24, fontWeight: '700', color: COLORS.text },
screenSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
headerBtnGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
gradesBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryLight, paddingHorizontal: SIZES.s, paddingVertical: 8, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.primary + '30' },
gradesBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
addCourseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: SIZES.s, paddingVertical: 8, borderRadius: SIZES.radius },
addCourseText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 12 },
listContent: { padding: SIZES.m, paddingBottom: SIZES.xl },
courseCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: SIZES.m, marginBottom: SIZES.m, borderWidth: 1, borderColor: COLORS.border },
cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.s },
codeBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
codeText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
semesterText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
courseName: {fontSize: 20,fontWeight: '600',color: COLORS.text, marginBottom: SIZES.s },
scoreBadgeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2EC4B615', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: SIZES.m },
scoreLabel: { fontSize: 12, color: COLORS.textSecondary },
scoreValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.success },
cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: SIZES.s, borderTopWidth: 1, borderTopColor: COLORS.border },
creditInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
creditText: { fontSize: 13, color: COLORS.textSecondary },
actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
actionText: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
errorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF233C15', padding: SIZES.m, marginHorizontal: SIZES.m, borderRadius: SIZES.radius, gap: SIZES.s },
errorText: { color: COLORS.error, fontSize: 14, flex: 1 },
emptyCard: { backgroundColor: COLORS.surface, padding: SIZES.xl, borderRadius: SIZES.radius, alignItems: 'center', marginTop: SIZES.xl, borderWidth: 1, borderColor: COLORS.border },
emptyTitle: {fontSize: 20,fontWeight: '600',color: COLORS.text, marginTop: SIZES.m, marginBottom: SIZES.xs },
emptyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SIZES.m, maxHeight: '80%' },
modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.m, paddingBottom: SIZES.s, borderBottomWidth: 1, borderBottomColor: COLORS.border },
modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
},
catalogItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SIZES.m, borderBottomWidth: 1, borderBottomColor: COLORS.border },
catalogCode: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
catalogName: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 2 },
catalogCredits: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
enrolledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2EC4B615', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
enrolledText: { color: COLORS.success, fontSize: 12, fontWeight: 'bold' },
enrollBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SIZES.m, paddingVertical: 8, borderRadius: SIZES.radius },
enrollBtnText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 13 },
});