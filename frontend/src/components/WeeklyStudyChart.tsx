import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { TrendingUp, Clock, RefreshCw } from 'lucide-react-native';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import axiosClient from '../api/axiosClient';
import { WeeklyStudyTimeResponse, WeeklyStudyDay } from '../types';

interface WeeklyStudyChartProps {
  onDataLoaded?: (data: WeeklyStudyTimeResponse) => void;
  refreshTrigger?: number;
}

export default function WeeklyStudyChart({
  onDataLoaded,
  refreshTrigger = 0,
}: WeeklyStudyChartProps) {
  const [data, setData] = useState<WeeklyStudyTimeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchWeeklyData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axiosClient.get('/analytics/weekly-study-time');
      const studyData: WeeklyStudyTimeResponse = res.data;
      setData(studyData);
      if (onDataLoaded) {
        onDataLoaded(studyData);
      }
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu biểu đồ tuần:', err);
      setError('Không thể tải dữ liệu thời gian học thực tế');
    } finally {
      setLoading(false);
    }
  }, [onDataLoaded]);

  useEffect(() => {
    fetchWeeklyData();
  }, [fetchWeeklyData, refreshTrigger]);

  const maxMinutes = data?.maxDailyMinutes && data.maxDailyMinutes > 0 ? data.maxDailyMinutes : 60;
  const days: WeeklyStudyDay[] = data?.days || [];

  return (
    <View style={styles.chartCard}>
      {/* Header Biểu đồ */}
      <View style={styles.chartHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.chartTitle}>Thời lượng học 7 ngày gần nhất</Text>
          <Text style={styles.chartSub}>
            Tổng cộng:{' '}
            <Text style={styles.chartSubHighlight}>
              {data ? `${data.totalWeeklyHours} giờ` : '...'}
            </Text>
            {data && data.averageDailyMinutes > 0 ? (
              <Text style={styles.chartAvgText}>
                {' '}(TB ~{data.averageDailyMinutes}p/ngày)
              </Text>
            ) : null}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshIconBtn}
          onPress={fetchWeeklyData}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <View style={styles.chartTrendBadge}>
              <TrendingUp size={13} color={COLORS.success} />
              <Text style={styles.chartTrendText}>Thực tế</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Nội dung Biểu đồ */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchWeeklyData}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !data ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tổng hợp phiên học thực tế...</Text>
        </View>
      ) : (
        <View style={styles.barChartContainer}>
          {days.map((item, index) => {
            // Chiều cao cột: tối đa 95px, tối thiểu 8px để vẫn nhìn thấy chân cột
            const barHeight =
              item.minutes > 0
                ? Math.max(Math.round((item.minutes / maxMinutes) * 90), 12)
                : 6;

            // Cột có thời gian học cao nhất sẽ được highlight nổi bật
            const isHighlight = item.isHighest && item.minutes > 0;

            return (
              <View key={`${item.date}-${index}`} style={styles.barColumn}>
                {/* Thời gian học trên đỉnh cột: e.g. 45p, 1h 15p */}
                <View style={styles.valueContainer}>
                  <Text
                    style={[
                      styles.barValueText,
                      isHighlight && styles.barValueTextHighlight,
                      item.isToday && styles.barValueTextToday,
                    ]}
                    numberOfLines={1}
                  >
                    {item.minutes > 0 ? item.formattedTime : '-'}
                  </Text>
                </View>

                {/* Khung rãnh cột */}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: barHeight,
                        backgroundColor: isHighlight
                          ? COLORS.primary
                          : item.minutes > 0
                          ? '#818CF8'
                          : '#E2E8F0',
                      },
                    ]}
                  />
                </View>

                {/* Trục X nhãn ngày trong tuần (T2, T3... CN) */}
                <View
                  style={[
                    styles.dayLabelBadge,
                    item.isToday && styles.dayLabelBadgeToday,
                    isHighlight && !item.isToday && styles.dayLabelBadgePeak,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabelText,
                      item.isToday && styles.dayLabelTextToday,
                      isHighlight && !item.isToday && styles.dayLabelTextPeak,
                    ]}
                  >
                    {item.dayShort}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Chú thích màu sắc */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>Học nhiều nhất</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#818CF8' }]} />
          <Text style={styles.legendText}>Có học</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E2E8F0' }]} />
          <Text style={styles.legendText}>Chưa học</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusCard,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.soft,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  chartSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  chartSubHighlight: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  chartAvgText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  refreshIconBtn: {
    padding: 4,
  },
  chartTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  chartTrendText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingBottom: 4,
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  valueContainer: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  barValueText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  barValueTextHighlight: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  barValueTextToday: {
    color: COLORS.primaryHover,
  },
  barTrack: {
    width: 22,
    height: 95,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  dayLabelBadge: {
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  dayLabelBadgeToday: {
    backgroundColor: COLORS.primaryLight,
  },
  dayLabelBadgePeak: {
    backgroundColor: '#EEF2FF',
  },
  dayLabelText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  dayLabelTextToday: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  dayLabelTextPeak: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  loadingBox: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  errorBox: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
