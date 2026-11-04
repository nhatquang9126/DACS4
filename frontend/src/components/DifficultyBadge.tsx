import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | string;

interface DifficultyBadgeProps {
  difficulty?: DifficultyLevel;
  credits?: number | null;
  size?: 'small' | 'medium';
}

export const getDifficultyInfo = (
  difficulty?: DifficultyLevel,
  credits?: number | null
) => {
  const norm = (difficulty || '').toUpperCase();
  if (norm === 'BEGINNER' || norm === 'BASIC' || norm === 'CƠ BẢN') {
    return {
      label: 'Cơ bản ⭐',
      level: 'BEGINNER',
      bgColor: '#ECFDF5',
      textColor: '#059669',
      borderColor: '#A7F3D0',
    };
  }
  if (norm === 'ADVANCED' || norm === 'NÂNG CAO') {
    return {
      label: 'Nâng cao ⭐⭐⭐',
      level: 'ADVANCED',
      bgColor: '#FEF2F2',
      textColor: '#DC2626',
      borderColor: '#FECACA',
    };
  }
  if (norm === 'INTERMEDIATE' || norm === 'TRUNG CẤP') {
    return {
      label: 'Trung cấp ⭐⭐',
      level: 'INTERMEDIATE',
      bgColor: '#FFFBEB',
      textColor: '#D97706',
      borderColor: '#FDE68A',
    };
  }

  // Fallback map từ số tín chỉ nếu có
  if (credits !== undefined && credits !== null) {
    if (credits <= 2) {
      return {
        label: 'Cơ bản ⭐',
        level: 'BEGINNER',
        bgColor: '#ECFDF5',
        textColor: '#059669',
        borderColor: '#A7F3D0',
      };
    }
    if (credits >= 4) {
      return {
        label: 'Nâng cao ⭐⭐⭐',
        level: 'ADVANCED',
        bgColor: '#FEF2F2',
        textColor: '#DC2626',
        borderColor: '#FECACA',
      };
    }
    return {
      label: 'Trung cấp ⭐⭐',
      level: 'INTERMEDIATE',
      bgColor: '#FFFBEB',
      textColor: '#D97706',
      borderColor: '#FDE68A',
    };
  }

  // Default
  return {
    label: 'Cơ bản ⭐',
    level: 'BEGINNER',
    bgColor: '#ECFDF5',
    textColor: '#059669',
    borderColor: '#A7F3D0',
  };
};

export default function DifficultyBadge({
  difficulty,
  credits,
  size = 'small',
}: DifficultyBadgeProps) {
  const info = getDifficultyInfo(difficulty, credits);

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: info.bgColor,
          borderColor: info.borderColor,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 3 : 5,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: info.textColor,
            fontSize: isSmall ? 11 : 13,
          },
        ]}
      >
        {info.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

