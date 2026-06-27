import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface MedicationPillProps {
  name: string;
  dosage: string;
  size?: 'small' | 'medium';
}

export function MedicationPill({ name, dosage, size = 'medium' }: MedicationPillProps) {
  const theme = useTheme();
  const isSmall = size === 'small';

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <Text
        style={[
          styles.name,
          { color: theme.text },
          isSmall && styles.nameSmall
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text
        style={[
          styles.dosage,
          { color: theme.subtext },
          isSmall && styles.dosageSmall
        ]}
      >
        {dosage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
  },
  nameSmall: {
    fontSize: 12,
  },
  dosage: {
    fontSize: 12,
  },
  dosageSmall: {
    fontSize: 10,
  },
});
