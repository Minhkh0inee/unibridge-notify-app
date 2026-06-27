import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { JourneyConfig } from '@/types/database.types';

interface JourneyPresetCardProps {
  preset: JourneyConfig;
  isSelected: boolean;
  onSelect: () => void;
}

export function JourneyPresetCard({ preset, isSelected, onSelect }: JourneyPresetCardProps) {
  const theme = useTheme();

  const getDescription = () => {
    const intervals = preset.escalation_intervals;
    const reminderCount = intervals.length + 1;
    const confirmMethod = preset.confirmation_method === 'button'
      ? 'Bấm nút'
      : preset.confirmation_method === 'photo'
      ? 'Chụp ảnh (tuỳ chọn)'
      : 'Chụp ảnh bắt buộc';

    return `${reminderCount} lần nhắc • ${confirmMethod}`;
  };

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        },
        isSelected && { backgroundColor: theme.colors.primary + '20' },
        pressed && styles.pressed,
      ]}
    >
      {isSelected && (
        <View style={[styles.checkmark, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}

      <Text style={[styles.title, { color: theme.colors.text }]}>
        {preset.name}
      </Text>

      <Text style={[styles.description, { color: theme.colors.subtext }]}>
        {getDescription()}
      </Text>

      {preset.escalation_intervals.length > 0 && (
        <Text style={[styles.intervals, { color: theme.colors.subtext }]}>
          Nhắc lại sau: {preset.escalation_intervals.join(', ')} phút
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 2,
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative',
  },
  pressed: {
    opacity: 0.7,
  },
  checkmark: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  description: {
    fontSize: 14,
    marginBottom: Spacing.one,
  },
  intervals: {
    fontSize: 12,
  },
});
