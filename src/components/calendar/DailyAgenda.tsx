import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useSchedules } from '@/contexts/SchedulesContext';
import { Spacing } from '@/constants/theme';
import { SESSION_ORDER } from '@/constants/sessions';
import { SessionCard } from './SessionCard';
import type { SessionName, MedicationSchedule } from '@/types/database.types';

interface DailyAgendaProps {
  date: Date;
  onSessionPress: (session: SessionName, schedules: MedicationSchedule[]) => void;
}

export function DailyAgenda({ date, onSessionPress }: DailyAgendaProps) {
  const theme = useTheme();
  const { getSchedulesForDate } = useSchedules();

  const schedulesForDate = useMemo(
    () => getSchedulesForDate(date),
    [date, getSchedulesForDate]
  );

  const schedulesBySession = useMemo(() => {
    const grouped: Record<SessionName, MedicationSchedule[]> = {
      morning: [],
      noon: [],
      afternoon: [],
      evening: [],
      bedtime: [],
    };

    schedulesForDate.forEach((schedule) => {
      grouped[schedule.session_name].push(schedule);
    });

    return grouped;
  }, [schedulesForDate]);

  const hasAnySchedules = schedulesForDate.length > 0;

  if (!hasAnySchedules) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.subtext }]}>
          Không có lịch uống thuốc hôm nay
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {SESSION_ORDER.map((session) => {
        const schedules = schedulesBySession[session];
        if (schedules.length === 0) return null;

        return (
          <SessionCard
            key={session}
            session={session}
            schedules={schedules}
            onPress={() => onSessionPress(session, schedules)}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
