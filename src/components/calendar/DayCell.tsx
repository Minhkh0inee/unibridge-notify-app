import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface DayCellProps {
  day: number;
  isToday: boolean;
  isSelected: boolean;
  hasSchedules: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

export function DayCell({
  day,
  isToday,
  isSelected,
  hasSchedules,
  isDisabled,
  onPress
}: DayCellProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.container,
        isSelected && { backgroundColor: theme.colors.primary },
        isToday && !isSelected && { borderWidth: 2, borderColor: theme.colors.primary },
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.dayText,
          { color: isDisabled ? theme.colors.subtext : theme.colors.text },
          isSelected && { color: '#FFFFFF' },
        ]}
      >
        {day}
      </Text>
      {hasSchedules && !isDisabled && (
        <View style={[styles.indicator, { backgroundColor: isSelected ? '#FFFFFF' : theme.colors.primary }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Spacing.two,
    position: 'relative',
  },
  pressed: {
    opacity: 0.6,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 6,
  },
});
