import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { DailyAgenda } from '@/components/calendar/DailyAgenda';
import { SessionDetailSheet } from '@/components/calendar/SessionDetailSheet';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BottomTabInset } from '@/constants/theme';
import type { SessionName, MedicationSchedule } from '@/types/database.types';

export default function CalendarScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionName | null>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<MedicationSchedule[]>([]);

  const handleSessionPress = (session: SessionName, schedules: MedicationSchedule[]) => {
    setSelectedSession(session);
    setSelectedSchedules(schedules);
    setSheetVisible(true);
  };

  const handleEditJourney = () => {
    setSheetVisible(false);
    // Navigate to journey editor with session context
    router.push({
      pathname: '/journey-editor',
      params: {
        session: selectedSession,
        scheduleIds: selectedSchedules.map(s => s.id).join(','),
      },
    });
  };

  if (authLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={styles.messageText}>
          Đang kết nối...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CalendarGrid
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        <View style={styles.divider} />

        <DailyAgenda
          date={selectedDate}
          onSessionPress={handleSessionPress}
        />
      </SafeAreaView>

      {selectedSession && (
        <SessionDetailSheet
          visible={sheetVisible}
          session={selectedSession}
          schedules={selectedSchedules}
          onClose={() => setSheetVisible(false)}
          onEditJourney={handleEditJourney}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingBottom: BottomTabInset,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2D9C8',
    marginVertical: Spacing.two,
  },
});
