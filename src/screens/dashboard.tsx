import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EscalatingReminder } from '@/components/escalating-reminder';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, FontSizes, Primary, Spacing } from '@/constants/theme';
import { getActiveJourney, getWeeklyLogs } from '@/data/storage';
import type { DoseLog, Journey, Medication } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

type SlotStatus = 'taken' | 'ignored' | 'missed' | 'pending';

function getDateString(iso: string): string {
  return iso.slice(0, 10);
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function calcDaysWithTaken(logs: DoseLog[]): number {
  const days = new Set(
    logs.filter((l) => l.status === 'taken').map((l) => getDateString(l.actionTakenAt))
  );
  return days.size;
}

function calcStreak(journey: Journey, logs: DoseLog[]): number {
  const totalPerDay = journey.medications.reduce(
    (sum, med) => sum + med.reminderTimes.length,
    0
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const taken = logs.filter(
      (l) => getDateString(l.actionTakenAt) === dateStr && l.status === 'taken'
    ).length;
    if (taken >= totalPerDay) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getSlotStatus(
  medication: Medication,
  reminderTime: string,
  logs: DoseLog[],
  today: string
): SlotStatus {
  const log = logs.find(
    (l) =>
      l.medicationId === medication.id &&
      l.scheduledTime === reminderTime &&
      getDateString(l.actionTakenAt) === today
  );
  if (log) return log.status === 'taken' ? 'taken' : 'ignored';

  const [h, m] = reminderTime.split(':').map(Number);
  const threshold = new Date();
  threshold.setHours(h, m, 0, 0);
  return new Date() > threshold ? 'missed' : 'pending';
}

const STATUS_COLOR: Record<SlotStatus, string> = {
  taken: '#22C55E',
  ignored: '#EF4444',
  missed: '#F97316',
  pending: '#9CA3AF',
};

const STATUS_LABEL: Record<SlotStatus, string> = {
  taken: '✓ Taken',
  ignored: '✗ Ignored',
  missed: 'Missed',
  pending: 'Upcoming',
};

function StatusBadge({ status }: { status: SlotStatus }) {
  return (
    <View style={[badgeStyles.container, { backgroundColor: STATUS_COLOR[status] }]}>
      <ThemedText style={badgeStyles.text}>{STATUS_LABEL[status]}</ThemedText>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  text: {
    color: '#fff',
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});

function MedicationCard({
  medication,
  logs,
  today,
}: {
  medication: Medication;
  logs: DoseLog[];
  today: string;
}) {
  const colors = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText type="smallBold">{medication.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {medication.dosage}
      </ThemedText>
      <View style={styles.timeSlots}>
        {medication.reminderTimes.map((time) => (
          <View key={time} style={styles.timeRow}>
            <ThemedText type="small">{time}</ThemedText>
            <StatusBadge status={getSlotStatus(medication, time, logs, today)} />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useTheme();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        const [activeJourney, weeklyLogs] = await Promise.all([
          getActiveJourney(),
          getWeeklyLogs(),
        ]);
        if (active) {
          setJourney(activeJourney);
          setLogs(weeklyLogs);
          setLoading(false);
        }
      }
      load().catch(console.error);
      return () => {
        active = false;
      };
    }, [])
  );

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={Primary} size="large" />
      </ThemedView>
    );
  }

  if (!journey) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          No active journey. Create one to get started.
        </ThemedText>
        <Pressable style={styles.createBtn} onPress={() => router.push('/create-journey')}>
          <ThemedText type="smallBold" style={styles.createBtnText}>
            + Create Journey
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const today = getTodayString();
  const daysWithTaken = calcDaysWithTaken(logs);
  const streak = calcStreak(journey, logs);
  const totalDosesToday = journey.medications.reduce(
    (sum, med) => sum + med.reminderTimes.length,
    0
  );
  const completedDosesToday = logs.filter(
    (l) => getDateString(l.actionTakenAt) === today && l.status === 'taken'
  ).length;
  const progress = totalDosesToday > 0 ? completedDosesToday / totalDosesToday : 0;
  const mascot =
    progress >= 1 ? '🎉' : progress >= 0.67 ? '💪' : progress >= 0.34 ? '😐' : '😰';

  const testMedication = journey.medications[0];
  const testScheduledTime = testMedication?.reminderTimes[0] ?? '08:00';

  return (
    <ThemedView style={styles.container}>
      {testMedication && (
        <EscalatingReminder
          visible={showReminder}
          medication={testMedication}
          scheduledTime={testScheduledTime}
          escalationConfig={journey.escalationConfig}
          onDismiss={() => setShowReminder(false)}
        />
      )}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: BottomTabInset + Spacing.four },
          ]}>
          {/* Journey header */}
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="subtitle">{journey.name}</ThemedText>
            <View style={styles.statsRow}>
              <ThemedText themeColor="textSecondary">Day {daysWithTaken} / 14</ThemedText>
              <ThemedText>🔥 {streak} days</ThemedText>
            </View>
          </View>

          {/* Kill the bacteria progress */}
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold">{mascot} Kill the Bacteria</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {completedDosesToday} of {totalDosesToday} doses completed today
            </ThemedText>
            <View style={[styles.progressTrack, { backgroundColor: colors.backgroundSelected }]}>
              <View
                style={[
                  styles.progressFill,
                  // eslint-disable-next-line react-native/no-inline-styles
                  { width: `${Math.round(progress * 100)}%`, backgroundColor: Primary },
                ]}
              />
            </View>
          </View>

          {/* Today's medications */}
          <ThemedText type="smallBold" style={styles.sectionLabel}>
            Today's Medications
          </ThemedText>
          {journey.medications.map((medication) => (
            <MedicationCard
              key={medication.id}
              medication={medication}
              logs={logs}
              today={today}
            />
          ))}

          {/* Test button */}
          <Pressable style={styles.testButton} onPress={() => setShowReminder(true)}>
            <ThemedText type="smallBold" style={styles.testButtonText}>
              🔔 Test Reminder
            </ThemedText>
          </Pressable>

          {/* New journey */}
          <Pressable
            style={styles.newJourneyButton}
            onPress={() => router.push('/create-journey')}>
            <ThemedText type="smallBold" style={{ color: Primary }}>
              + New Journey
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.one,
  },
  timeSlots: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  testButton: {
    backgroundColor: Primary,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  testButtonText: {
    color: '#fff',
  },
  newJourneyButton: {
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: Primary,
    alignItems: 'center',
  },
  emptyText: {
    marginBottom: Spacing.three,
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  createBtn: {
    backgroundColor: Primary,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  createBtnText: {
    color: '#fff',
  },
});
