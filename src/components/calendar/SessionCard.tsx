import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { SESSION_COLORS, SESSION_LABELS } from '@/constants/sessions';
import { MedicationPill } from './MedicationPill';
import type { SessionName, MedicationSchedule } from '@/types/database.types';

interface SessionCardProps {
  session: SessionName;
  schedules: MedicationSchedule[];
  onPress: () => void;
}

export function SessionCard({ session, schedules, onPress }: SessionCardProps) {
  const theme = useTheme();
  const sessionColor = SESSION_COLORS[session];
  const sessionLabel = SESSION_LABELS[session];

  if (schedules.length === 0) return null;

  const targetTime = schedules[0]?.target_time || '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.colors.card, borderLeftColor: sessionColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.sessionBadge}>
          <Text style={[styles.sessionLabel, { color: sessionColor }]}>
            {sessionLabel}
          </Text>
        </View>
        <Text style={[styles.time, { color: theme.colors.text }]}>
          {targetTime}
        </Text>
      </View>

      <View style={styles.medications}>
        {schedules.map((schedule) => (
          <MedicationPill
            key={schedule.id}
            name={schedule.medication?.name || ''}
            dosage={`${schedule.medication?.dosage_amount} ${schedule.medication?.dosage_unit}`}
            size="small"
          />
        ))}
      </View>

      {schedules[0]?.journey_config && (
        <Text style={[styles.journeyLabel, { color: theme.colors.subtext }]}>
          {schedules[0].journey_config.name}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  sessionBadge: {
    flex: 1,
  },
  sessionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    fontSize: 18,
    fontWeight: '700',
  },
  medications: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  journeyLabel: {
    fontSize: 12,
    marginTop: Spacing.one,
  },
});
