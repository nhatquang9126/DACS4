
import React, { useState, useCallback } from 'react';
import {
View,
Text,
StyleSheet,
ScrollView,
TouchableOpacity,
ActivityIndicator,
RefreshControl,
Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
Target,
CheckCircle2,
Clock,
AlertTriangle,
ArrowRight,
Sparkles,
BookOpen,
RefreshCw,
} from 'lucide-react-native';
import { COLORS, SIZES } from '../../src/constants/theme';
import axiosClient from '../../src/api/axiosClient';
import { StudyPlanItem } from '../../src/types';

export default function StudyPlanScreen() {
const router = useRouter();

const [items, setItems] = useState<StudyPlanItem[]>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [errorMsg, setErrorMsg] = useState('');
const [updatingIds, setUpdatingIds] = useState<number[]>([]);

const fetchStudyPlan = useCallback(async (isRefresh = false) => {
    try {
    if (isRefresh) {
        setRefreshing(true);
    } else {
        setLoading(true);
    }

    setErrorMsg('');

    const response = await axiosClient.get('/study-plans/current');

    // Hỗ trợ cả API trả về { items: [...] } hoặc trả về mảng.
    const planItems = Array.isArray(response.data)
        ? response.data
        : response.data?.items;

    if (Array.isArray(planItems)) {
        setItems(planItems);
    } else {
        setItems([]);
    }
    } catch (error: any) {
    console.error(
        'Lỗi tải lộ trình học:',
        error?.response?.data ?? error?.message ?? error
    );

    setErrorMsg(
        error?.response?.data?.message ??
        'Không thể tải lộ trình học tập. Vui lòng thử lại.'
    );
    } finally {
    setLoading(false);
    setRefreshing(false);
    }
}, []);

useFocusEffect(
    useCallback(() => {
    fetchStudyPlan();
    }, [fetchStudyPlan])
);

const onRefresh = () => {
    fetchStudyPlan(true);
};

const handleUpdateStatus = async (
    itemId: number,
    currentStatus: string
) => {
    if (updatingIds.includes(itemId)) return;

    const nextStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
    const oldItems = items;

    setUpdatingIds((prev) => [...prev, itemId]);

    // Cập nhật giao diện trước để thao tác nhanh hơn.
    setItems((prev) =>
    prev.map((item) =>
        item.id === itemId
        ? { ...item, status: nextStatus }
        : item
    )
    );

    try {
    await axiosClient.patch(
        `/study-plans/items/${itemId}/status`,
        { status: nextStatus }
    );
    } catch (error: any) {
    console.error(
        'Lỗi cập nhật trạng thái nhiệm vụ:',
        error?.response?.data ?? error?.message ?? error
    );

    setItems(oldItems);

    Alert.alert(
        'Lỗi',
        error?.response?.data?.message ??
        'Không thể cập nhật trạng thái nhiệm vụ.'
    );
    } finally {
    setUpdatingIds((prev) => prev.filter((id) => id !== itemId));
    }
};

const handleNavigateReference = (item: StudyPlanItem) => {
console.log('ACTION TYPE:', item.action_type);
console.log('REFERENCE ID:', item.reference_id);

if (!item.reference_id) {
    Alert.alert('Thông báo', 'Nhiệm vụ chưa có liên kết.');
    return;
}

switch (item.action_type) {
    case 'PRACTICE_QUIZ':
    router.push(`/quiz/${item.reference_id}` as any);
    break;

    case 'REVIEW_THEORY':
    router.push(`/materials/${item.reference_id}` as any);
    break;

    default:
    Alert.alert(
        'Thông báo',
        `Loại nhiệm vụ không hợp lệ: ${item.action_type}`
    );
}
};

if (loading && !refreshing) {
    return (
    <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
        Đang tải lộ trình học tập...
        </Text>
    </View>
    );
}

return (
    <View style={styles.container}>
    <View style={styles.header}>
        <View style={styles.headerTitleRow}>
        <Target color={COLORS.primary} size={28} />
        <Text style={styles.screenTitle}>
            Lộ trình cá nhân hóa
        </Text>
        </View>

        <Text style={styles.screenSub}>
        Nhiệm vụ được đề xuất dựa trên tiến độ và kỹ năng học tập của bạn.
        </Text>
    </View>

    <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
        <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
        />
        }
    >
        {errorMsg ? (
        <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMsg}</Text>

            <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchStudyPlan()}
            >
            <RefreshCw size={16} color={COLORS.primary} />
            <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
        </View>
        ) : null}

        {items.length > 0 ? (
        items.map((item) => {
            const isDone = item.status === 'DONE';
            const isHighPriority = item.priority === 1;
            const isUpdating = updatingIds.includes(item.id);

            return (
            <View
                key={item.id}
                style={[
                styles.planCard,
                isDone && styles.planCardDone,
                ]}
            >
                <View style={styles.cardHeader}>
                <TouchableOpacity
                    style={styles.checkboxTouch}
                    onPress={() =>
                    handleUpdateStatus(item.id, item.status)
                    }
                    disabled={isUpdating}
                    accessibilityLabel={
                    isDone
                        ? 'Đánh dấu chưa hoàn thành'
                        : 'Đánh dấu hoàn thành'
                    }
                >
                    {isUpdating ? (
                    <ActivityIndicator
                        size="small"
                        color={COLORS.primary}
                    />
                    ) : isDone ? (
                    <CheckCircle2
                        size={24}
                        color={COLORS.success}
                    />
                    ) : (
                    <Clock
                        size={24}
                        color={COLORS.textSecondary}
                    />
                    )}
                </TouchableOpacity>

                <View style={styles.cardInfo}>
                    <View style={styles.badgeRow}>
                    <View
                        style={[
                        styles.priorityBadge,
                        isHighPriority
                            ? styles.badgeHigh
                            : item.priority === 3
                            ? styles.badgeLow
                            : styles.badgeMedium,
                        ]}
                    >
                        {isHighPriority && (
                        <AlertTriangle
                            size={12}
                            color={COLORS.error}
                        />
                        )}

                        <Text
                        style={[
                            styles.priorityText,
                            isHighPriority
                            ? styles.textHigh
                            : item.priority === 3
                            ? styles.textLow
                            : styles.textMedium,
                        ]}
                        >
                        {isHighPriority
                            ? 'Ưu tiên cao'
                            : item.priority === 3
                            ? 'Củng cố kiến thức'
                            : 'Ưu tiên trung bình'}
                        </Text>
                    </View>

                    <View style={styles.actionBadge}>
                        <Text style={styles.actionBadgeText}>
                        {item.action_type === 'PRACTICE_QUIZ'
                            ? 'Luyện tập Quiz'
                            : item.action_type === 'REVIEW_THEORY'
                            ? 'Ôn tập lý thuyết'
                            : item.action_type}
                        </Text>
                    </View>
                    </View>

                    <Text
                    style={[
                        styles.itemTitle,
                        isDone && styles.textLineThrough,
                    ]}
                    >
                    {item.title}
                    </Text>

                    {item.description ? (
                    <Text
                        style={[
                        styles.itemDesc,
                        isDone && styles.textLineThrough,
                        ]}
                    >
                        {item.description}
                    </Text>
                    ) : null}

                    <Text
                    style={[
                        styles.statusText,
                        isDone && styles.statusDone,
                    ]}
                    >
                    {isDone ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                    </Text>
                </View>
                </View>

                <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleNavigateReference(item)}
                >
                <Text style={styles.actionBtnText}>
                    Thực hiện ngay
                </Text>
                <ArrowRight
                    size={16}
                    color={COLORS.primary}
                />
                </TouchableOpacity>
            </View>
            );
        })
        ) : !errorMsg ? (
        <View style={styles.emptyCard}>
            <Sparkles size={48} color={COLORS.secondary} />

            <Text style={styles.emptyTitle}>
            Chưa có lộ trình học tập
            </Text>

            <Text style={styles.emptyDesc}>
            Hãy hoàn thành các bài kiểm tra để hệ thống xác định
            kỹ năng cần cải thiện và đề xuất lộ trình phù hợp.
            </Text>

            <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => router.push('/(tabs)/courses' as any)}
            >
            <BookOpen size={18} color={COLORS.surface} />
            <Text style={styles.emptyActionText}>
                Khám phá khóa học
            </Text>
            </TouchableOpacity>

            <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchStudyPlan()}
            >
            <RefreshCw size={16} color={COLORS.primary} />
            <Text style={styles.retryText}>Tải lại lộ trình</Text>
            </TouchableOpacity>
        </View>
        ) : null}
    </ScrollView>
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
},
header: {
    paddingHorizontal: SIZES.m,
    paddingTop: SIZES.l,
    paddingBottom: SIZES.m,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
},
headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.s,
},
screenTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    flexShrink: 1,
},
screenSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 19,
},
content: {
    padding: SIZES.m,
    paddingBottom: SIZES.xl,
    flexGrow: 1,
},
errorCard: {
    backgroundColor: '#EF233C15',
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.m,
},
errorText: {
    color: COLORS.error,
    textAlign: 'center',
    lineHeight: 20,
},
retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: SIZES.s,
    marginTop: SIZES.s,
},
retryText: {
    color: COLORS.primary,
    fontWeight: '600',
},
planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.m,
    marginBottom: SIZES.m,
    borderWidth: 1,
    borderColor: COLORS.border,
},
planCardDone: {
    opacity: 0.7,
},
cardHeader: {
    flexDirection: 'row',
    gap: SIZES.m,
    alignItems: 'flex-start',
},
checkboxTouch: {
    paddingTop: 2,
    minWidth: 26,
    minHeight: 30,
    alignItems: 'center',
},
cardInfo: {
    flex: 1,
},
badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
},
priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
},
badgeHigh: {
    backgroundColor: '#EF233C15',
},
badgeMedium: {
    backgroundColor: '#FF9F1C15',
},
badgeLow: {
    backgroundColor: '#2EC4B615',
},
priorityText: {
    fontSize: 11,
    fontWeight: 'bold',
},
textHigh: {
    color: COLORS.error,
},
textMedium: {
    color: '#FF9F1C',
},
textLow: {
    color: COLORS.success,
},
actionBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
},
actionBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
},
itemTitle: {
    fontWeight: '600',
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 4,
},
itemDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
},
textLineThrough: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
},
statusText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
},
statusDone: {
    color: COLORS.success,
    fontWeight: '600',
},
actionBtn: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: SIZES.m,
    paddingTop: SIZES.s,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
},
actionBtnText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 13,
},
emptyCard: {
    backgroundColor: COLORS.surface,
    padding: SIZES.xl,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: SIZES.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
},
emptyTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SIZES.m,
    marginBottom: SIZES.xs,
    textAlign: 'center',
},
emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
},
emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.m,
    paddingVertical: SIZES.s,
    borderRadius: SIZES.radius,
    marginTop: SIZES.m,
},
emptyActionText: {
    color: COLORS.surface,
    fontWeight: '600',
},
});
