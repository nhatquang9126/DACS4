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
import { ArrowLeft, BookOpenCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, TYPOGRAPHY } from '../../src/constants/theme';
import axiosClient from '../../src/api/axiosClient';
import { Material } from '../../src/types';

export default function MaterialReaderScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
const router = useRouter();

const [material, setMaterial] = useState<Material | null>(null);
const [loading, setLoading] = useState(true);
const [errorMsg, setErrorMsg] = useState('');

useEffect(() => {
    fetchMaterial();
}, [id]);

const fetchMaterial = async () => {
    try {
    setLoading(true);
    setErrorMsg('');
    const response = await axiosClient.get(`/materials/${id}`);
    setMaterial(response.data);
    } catch (error: any) {
    setErrorMsg('Không thể tải bài học này');
    } finally {
    setLoading(false);
    }
};

// Trình hiển thị định dạng văn bản / Markdown tối giản
const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
    if (line.startsWith('# ')) {
        return (
        <Text key={idx} style={styles.heading1}>
            {line.replace('# ', '')}
        </Text>
        );
    }
    if (line.startsWith('## ')) {
        return (
        <Text key={idx} style={styles.heading2}>
            {line.replace('## ', '')}
        </Text>
        );
    }
    if (/^(\d+\.\s+|-\s+)/.test(line)) {
        return (
        <View key={idx} style={styles.bulletRow}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.bulletText}>{line.replace(/^(\d+\.\s+|-\s+)/, '')}</Text>
        </View>
        );
    }
    if (line.trim().length === 0) {
        return <View key={idx} style={{ height: 8 }} />;
    }
    return (
        <Text key={idx} style={styles.paragraph}>
        {line}
        </Text>
    );
    });
};

if (loading) {
    return (
    <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang mở nội dung bài học...</Text>
    </View>
    );
}

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Tài liệu học tập
        </Text>
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
        ) : material ? (
            <View style={styles.materialBox}>
                <View style={styles.typeBadge}>
                <BookOpenCheck size={16} color={COLORS.primary} />
                <Text style={styles.typeText}>
                    {material.content_type || 'Tài liệu'}
                </Text>
                </View>

                <Text style={styles.title}>
                {material.title || 'Chưa có tiêu đề'}
                </Text>

                <View style={styles.divider} />

                <View style={styles.body}>
                {renderFormattedContent(material.content ?? '')}
                </View>
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
headerTitle: {
fontSize: 20,
fontWeight: 'bold',
color: COLORS.text,
flex: 1,
textAlign: 'center',
marginHorizontal: SIZES.s,
},
content: { padding: SIZES.m, paddingBottom: SIZES.xl },
errorCard: { backgroundColor: '#EF233C15', padding: SIZES.m, borderRadius: SIZES.radius },
errorText: { color: COLORS.error, textAlign: 'center' },
materialBox: {
    backgroundColor: COLORS.surface,
    padding: SIZES.l,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
},
typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SIZES.s },
typeText: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
title: {
fontSize: 24,
fontWeight: 'bold',
color: COLORS.text,
marginBottom: SIZES.m,
},
divider: { height: 1, backgroundColor: COLORS.border, marginBottom: SIZES.m },
body: { marginTop: SIZES.s },
heading1: {
fontSize: 24,
fontWeight: 'bold',
color: COLORS.primary,
marginTop: SIZES.m,
marginBottom: SIZES.s,
},
heading2: {
fontSize: 20,
fontWeight: '600',
color: COLORS.text,
marginTop: SIZES.s,
marginBottom: SIZES.xs,
},
paragraph: { fontSize: 16, lineHeight: 24, color: COLORS.text, marginBottom: SIZES.s },
bulletRow: { flexDirection: 'row', paddingLeft: SIZES.s, marginBottom: 6, gap: 8 },
bulletPoint: { fontSize: 16, color: COLORS.primary, fontWeight: 'bold' },
bulletText: { flex: 1, fontSize: 15, lineHeight: 22, color: COLORS.text },
});