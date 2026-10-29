import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
View,
Text,
StyleSheet,
ScrollView,
TouchableOpacity,
ActivityIndicator,
Alert,
FlatList,
RefreshControl,
Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
User,
LogOut,
Play,
Square,
Clock,
Award,
BookOpen,
CheckCircle2,
Calendar,
History,
Shield,
ChevronRight,
} from 'lucide-react-native';
import { COLORS, SIZES, TYPOGRAPHY } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import axiosClient from '../../src/api/axiosClient';
import { LearningStatistics, StudySession } from '../../src/types';

export default function ProfileScreen() {
const router = useRouter();
const { user, logout } = useAuth();

// Quản lý trạng thái Thống kê & Lịch sử
const [stats, setStats] = useState<LearningStatistics | null>(null);
const [history, setHistory] = useState<StudySession[]>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);

// Quản lý Bộ đếm giờ Học tập (Timer)
const [isTimerRunning, setIsTimerRunning] = useState(false);
const [seconds, setSeconds] = useState(0);
const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
const [startingTimer, setStartingTimer] = useState(false);
const [stoppingTimer, setStoppingTimer] = useState(false);

const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

// Tải dữ liệu Thống kê & Lịch sử phiên học
const fetchProfileData = async () => {
    try {
    const [statsRes, historyRes] = await Promise.allSettled([
        axiosClient.get('/learning/statistics'),
        axiosClient.get('/study-sessions/history'),
    ]);

    if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
    }
    if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value.data || []);
    }
    } catch (error) {
    console.error('Không thể tải dữ liệu thống kê');
    } finally {
    setLoading(false);
    setRefreshing(false);
    }
};

useFocusEffect(
    useCallback(() => {
    fetchProfileData();
    }, [])
);

const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
};

// Logic đếm giờ thời gian thực
useEffect(() => {
    if (isTimerRunning) {
    timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
    }, 1000);
    } else if (timerRef.current) {
    clearInterval(timerRef.current);
    }

    return () => {
    if (timerRef.current) clearInterval(timerRef.current);
    };
}, [isTimerRunning]);

// Bắt đầu phiên bấm giờ
const handleStartSession = async () => {
    try {
    setStartingTimer(true);
    const response = await axiosClient.post('/study-sessions', {
        enrollment_id: null,
        notes: 'Phiên học bấm giờ tự do',
    });
    setActiveSessionId(response.data.id);
    setSeconds(0);
    setIsTimerRunning(true);
    } catch (error: any) {
    Alert.alert('Lỗi', error.response?.data?.message || 'Không thể bắt đầu phiên học');
    } finally {
    setStartingTimer(false);
    }
};

// Kết thúc phiên bấm giờ
const handleStopSession = async () => {
    if (!activeSessionId) return;

    try {
    setStoppingTimer(true);
    setIsTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    await axiosClient.patch(`/study-sessions/${activeSessionId}/finish`, {
        notes: `Đã hoàn thiện phiên học ${Math.round(seconds / 60)} phút`,
    });

    Alert.alert('Hoàn thành phiên học!', `Bạn đã tích lũy thêm ${formatTime(seconds)} thời gian học tập.`);
    setActiveSessionId(null);
    setSeconds(0);
    fetchProfileData(); // Tải lại thống kê mới
    } catch (error: any) {
    Alert.alert('Lỗi', 'Không thể kết thúc phiên học.');
    setIsTimerRunning(true); // Tiếp tục nếu gặp lỗi
    } finally {
    setStoppingTimer(false);
    }
};

const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const handleConfirmLogout = () => {
    Alert.alert('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản không?', [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
};

if (loading && !refreshing) {
    return (
    <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải hồ sơ & thống kê...</Text>
    </View>
    );
}

return (
    <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
    {/* Header Hồ sơ Sinh viên */}
    <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
        <User size={36} color={COLORS.surface} />
        </View>
        <View style={styles.userInfo}>
        <Text style={styles.userName}>{user?.email?.split('@')[0] || 'Sinh viên'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
            <Shield size={12} color={COLORS.primary} />
            <Text style={styles.roleText}>{user?.role || 'STUDENT'}</Text>
        </View>
        </View>
    </View>

    {/* Nút truy cập Cổng Quản trị viên (nếu có role ADMIN) */}
    {user?.role === 'ADMIN' ? (
      <TouchableOpacity
        style={styles.adminBannerBtn}
        onPress={() => router.push('/admin' as any)}
      >
        <View style={styles.adminBannerLeft}>
          <View style={styles.adminIconBox}>
            <Shield size={20} color={COLORS.surface} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.adminBannerTitle}>Cổng Quản trị viên (Admin)</Text>
            <Text style={styles.adminBannerSub}>Quản trị môn học, bài giảng & cảnh báo sinh viên</Text>
          </View>
        </View>
        <ChevronRight size={20} color={COLORS.surface} />
      </TouchableOpacity>
    ) : null}

    {/* Widget Bấm giờ Học tập (Study Session Timer) */}
    <View style={styles.timerCard}>
        <View style={styles.timerCardHeader}>
        <Clock color={COLORS.primary} size={20} />
        <Text style={styles.timerCardTitle}>Phiên bấm giờ học tập (Pomodoro)</Text>
        </View>

        <Text style={styles.timerClock}>{formatTime(seconds)}</Text>

        {!isTimerRunning ? (
        <TouchableOpacity
            style={styles.startBtn}
            onPress={handleStartSession}
            disabled={startingTimer}
        >
            {startingTimer ? (
            <ActivityIndicator color={COLORS.surface} />
            ) : (
            <>
                <Play size={20} color={COLORS.surface} fill={COLORS.surface} />
                <Text style={styles.startBtnText}>Bắt đầu học ngay</Text>
            </>
            )}
        </TouchableOpacity>
        ) : (
        <TouchableOpacity
            style={styles.stopBtn}
            onPress={handleStopSession}
            disabled={stoppingTimer}
        >
            {stoppingTimer ? (
            <ActivityIndicator color={COLORS.surface} />
            ) : (
            <>
                <Square size={20} color={COLORS.surface} fill={COLORS.surface} />
                <Text style={styles.stopBtnText}>Kết thúc phiên học</Text>
            </>
            )}
        </TouchableOpacity>
        )}
    </View>

    {/* Bảng Thống kê Học tập Tổng quan */}
    <Text style={styles.sectionTitle}>Tổng quan thành tích</Text>
    <View style={styles.statsGrid}>
        <View style={styles.statBox}>
        <Clock size={20} color={COLORS.primary} />
        <Text style={styles.statNum}>{stats?.study_sessions.total_study_hours ?? 0}h</Text>
        <Text style={styles.statLabel}>Giờ học tích lũy</Text>
        </View>

        <View style={styles.statBox}>
        <Award size={20} color={COLORS.secondary} />
        <Text style={styles.statNum}>
            {stats?.quizzes.average_score ? stats.quizzes.average_score.toFixed(1) : '0.0'}
        </Text>
        <Text style={styles.statLabel}>Điểm Quiz TB</Text>
        </View>

        <View style={styles.statBox}>
        <CheckCircle2 size={20} color={COLORS.success} />
        <Text style={styles.statNum}>
            {Math.round((stats?.tasks.completion_rate ?? 0) * 100)}%
        </Text>
        <Text style={styles.statLabel}>Tỷ lệ xong Task</Text>
        </View>

        <View style={styles.statBox}>
        <BookOpen size={20} color="#FF9F1C" />
        <Text style={styles.statNum}>{stats?.courses.active_enrollments ?? 0}</Text>
        <Text style={styles.statLabel}>Môn đang học</Text>
        </View>
    </View>

    {/* Lịch sử Các Phiên Học gần đây */}
    <View style={styles.sectionHeaderRow}>
        <History size={18} color={COLORS.text} />
        <Text style={styles.sectionTitle}>Lịch sử phiên học</Text>
    </View>

    {history.length > 0 ? (
        history.slice(0, 5).map((session) => (
        <View key={session.id} style={styles.historyRow}>
            <View style={styles.historyIconBox}>
            <Calendar size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
            <Text style={styles.historyNotes}>{session.notes || 'Phiên học tập'}</Text>
            <Text style={styles.historyDate}>
                {new Date(session.start_time).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                })}
            </Text>
            </View>
            <Text style={styles.historyDuration}>
            {session.duration_minutes ? `${session.duration_minutes} phút` : 'Đang học'}
            </Text>
        </View>
        ))
    ) : (
        <View style={styles.emptyHistory}>
        <Text style={styles.emptyHistoryText}>Chưa có lịch sử phiên học nào.</Text>
        </View>
    )}

    {/* Nút Đăng xuất */}
    <TouchableOpacity style={styles.logoutBtn} onPress={handleConfirmLogout}>
        <LogOut size={20} color={COLORS.error} />
        <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
    </TouchableOpacity>
    </ScrollView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: COLORS.background },
centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
loadingText: { marginTop: SIZES.m, color: COLORS.textSecondary },
content: { padding: SIZES.m, paddingBottom: SIZES.xl },
profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SIZES.m,
},
avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
userInfo: { flex: 1 },
userName: {
fontWeight: '600',
color: COLORS.text, fontSize: 18 },
userEmail: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryLight, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
roleText: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold' },
timerCard: {
    backgroundColor: COLORS.surface,
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.l,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
},
timerCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SIZES.s, alignSelf: 'flex-start' },
timerCardTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
timerClock: { fontSize: 42, fontWeight: 'bold', color: COLORS.primary, marginVertical: SIZES.s, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, width: '100%', height: 48, borderRadius: SIZES.radius },
startBtnText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
stopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.error, width: '100%', height: 48, borderRadius: SIZES.radius },
stopBtnText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
sectionTitle: {fontSize: 20,
fontWeight: '600',
color: COLORS.text, marginBottom: SIZES.m },
sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SIZES.m, marginBottom: SIZES.s },
statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: SIZES.m, gap: '4%' },
statBox: { width: '48%', backgroundColor: COLORS.surface, padding: SIZES.m, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, marginBottom: SIZES.m, alignItems: 'center' },
statNum: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginTop: 4 },
statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
historyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SIZES.m, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, marginBottom: SIZES.s, gap: SIZES.m },
historyIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
historyNotes: { fontSize: 14, fontWeight: '600', color: COLORS.text },
historyDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
historyDuration: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
emptyHistory: { backgroundColor: COLORS.surface, padding: SIZES.m, borderRadius: SIZES.radius, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: SIZES.m },
emptyHistoryText: { color: COLORS.textSecondary, fontSize: 13 },
logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EF233C15', height: 50, borderRadius: SIZES.radius, marginTop: SIZES.m },
logoutBtnText: { color: COLORS.error, fontWeight: 'bold', fontSize: 15 },
adminBannerBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: COLORS.secondary,
  padding: SIZES.m,
  borderRadius: SIZES.radius,
  marginBottom: SIZES.m,
},
adminBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: SIZES.s, flex: 1 },
adminIconBox: {
  width: 38,
  height: 38,
  borderRadius: 19,
  backgroundColor: 'rgba(255,255,255,0.2)',
  justifyContent: 'center',
  alignItems: 'center',
},
adminBannerTitle: { color: COLORS.surface, fontWeight: 'bold', fontSize: 15 },
adminBannerSub: { color: '#F8F9FAEE', fontSize: 11, marginTop: 2 },
});