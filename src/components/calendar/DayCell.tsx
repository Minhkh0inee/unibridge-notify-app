import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';

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

  // Clear visual hierarchy: selected > today > has schedules > default
  const getBackgroundColor = () => {
    if (isSelected) return theme.accent;
    if (isToday) return theme.accentTint;
    return 'transparent';
  };

  const getTextColor = () => {
    if (isDisabled) return theme.textSecondary;
    if (isSelected) return '#FFFFFF';
    if (isToday) return theme.accent;
    return theme.text;
  };

  const getBorderStyle = () => {
    // Only show border for today if NOT selected
    if (isToday && !isSelected) {
      return {
        borderWidth: 2,
        borderColor: theme.accent,
      };
    }
    return {};
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: getBackgroundColor() },
        getBorderStyle(),
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.dayText,
          { color: getTextColor() },
        ]}
      >
        {day}
      </Text>
      {hasSchedules && !isDisabled && (
        <View style={[styles.indicator, { backgroundColor: isSelected ? '#FFFFFF' : theme.accent }]} />
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
    borderRadius: BorderRadius.small,
    position: 'relative',
  },
  pressed: {
    opacity: 0.7,
  },
  dayText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    bottom: 4,
  },
});
