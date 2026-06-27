import * as Device from 'expo-device';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { EscalatingReminder } from '@/components/escalating-reminder';
import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Primary, Spacing } from '@/constants/theme';
import { seedIfNeeded } from '@/data/seed';
import { getActiveJourney } from '@/data/storage';
import type { Journey, Medication } from '@/data/types';
import { scheduleTestNotificationAsync } from '@/notifications/notifications';
import {
  clearPendingReminderIntent,
  getPendingReminderIntent,
  subscribeToReminderIntents,
  type ReminderIntent,
} from '@/notifications/reminder-intent';

interface ReminderTarget {
  medication: Medication;
  scheduledTime: string;
}

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [reminderIntent, setReminderIntent] = useState<ReminderIntent | null>(() =>
    getPendingReminderIntent()
  );
  const [reminderTarget, setReminderTarget] = useState<ReminderTarget | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [isSchedulingTest, setIsSchedulingTest] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadJourney() {
      await seedIfNeeded();
      const activeJourney = await getActiveJourney();
      if (mounted) {
        setJourney(activeJourney);
      }
    }

    loadJourney().catch(console.error);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return subscribeToReminderIntents(setReminderIntent);
  }, []);

  useEffect(() => {
    if (!journey || !reminderIntent) return;

    const medication = journey.medications.find(
      (item) => item.id === reminderIntent.medicationId
    );
    if (!medication) {
      if (__DEV__) {
        console.warn(
          `Medication from notification was not found: ${reminderIntent.medicationId}`
        );
      }
      clearPendingReminderIntent(reminderIntent.notificationId);
      setReminderIntent(null);
      return;
    }

    setReminderTarget({ medication, scheduledTime: reminderIntent.scheduledTime });
    setShowReminder(true);
    clearPendingReminderIntent(reminderIntent.notificationId);
    setReminderIntent(null);
  }, [journey, reminderIntent]);

  function openManualReminder() {
    const medication = journey?.medications[0];
    const scheduledTime = medication?.reminderTimes[0];
    if (!medication || !scheduledTime) return;

    setReminderTarget({ medication, scheduledTime });
    setShowReminder(true);
  }

  function dismissReminder() {
    setShowReminder(false);
    setReminderTarget(null);
  }

  async function scheduleTenSecondTest() {
    const medication = journey?.medications[0];
    const scheduledTime = medication?.reminderTimes[0];
    if (!medication || !scheduledTime || isSchedulingTest) return;

    setIsSchedulingTest(true);
    setNotificationStatus(null);
    try {
      const result = await scheduleTestNotificationAsync(medication, scheduledTime);
      setNotificationStatus('Scheduled — notification will fire in 10 seconds.');
      Alert.alert(
        'Notification scheduled',
        `It will fire at ${result.scheduledFor.toLocaleTimeString()}. Put the app in the background. Press and hold the notification to see its actions.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to schedule notification.';
      setNotificationStatus(message);
      Alert.alert('Unable to schedule notification', message);
    } finally {
      setIsSchedulingTest(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      {journey && reminderTarget && (
        <EscalatingReminder
          visible={showReminder}
          medication={reminderTarget.medication}
          scheduledTime={reminderTarget.scheduledTime}
          escalationConfig={journey.escalationConfig}
          onDismiss={dismissReminder}
        />
      )}
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Welcome to&nbsp;Expo
          </ThemedText>
        </ThemedView>

        <ThemedText type="code" style={styles.code}>
          get started
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.stepContainer}>
          <HintRow
            title="Try editing"
            hint={<ThemedText type="code">src/app/index.tsx</ThemedText>}
          />
          <HintRow title="Dev tools" hint={getDevMenuHint()} />
          <HintRow
            title="Fresh start"
            hint={<ThemedText type="code">npm run reset-project</ThemedText>}
          />
        </ThemedView>

        {journey && (
          <>
            <Pressable onPress={openManualReminder} style={styles.testButton}>
              <ThemedText type="smallBold" style={styles.testButtonText}>
                Test Reminder Modal
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={scheduleTenSecondTest}
              disabled={isSchedulingTest}
              style={[
                styles.testButton,
                styles.notificationButton,
                isSchedulingTest && styles.buttonDisabled,
              ]}>
              <ThemedText type="smallBold" style={styles.testButtonText}>
                {isSchedulingTest ? 'Scheduling…' : 'Test Notification in 10 Seconds'}
              </ThemedText>
            </Pressable>

            {notificationStatus && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.statusText}>
                {notificationStatus}
              </ThemedText>
            )}
          </>
        )}

        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  code: {
    textTransform: 'uppercase',
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  testButton: {
    backgroundColor: Primary,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
  },
  notificationButton: {
    backgroundColor: '#E53E3E',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  statusText: {
    textAlign: 'center',
  },
});
