import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Journey, Medication } from '@/data/types';

const MEDICATION_CHANNEL_ID = 'medication-reminders';
const MEDICATION_CATEGORY_ID = 'medicationReminder';
const SCHEDULED_IDS_KEY = 'medication_notification_ids_v1';

export const MEDICATION_NOTIFICATION_TYPE = 'medication-reminder';
export const OPEN_REMINDER_ACTION = 'OPEN_REMINDER';
export const SNOOZE_REMINDER_ACTION = 'SNOOZE_REMINDER';

export interface MedicationNotificationData extends Record<string, unknown> {
  type: typeof MEDICATION_NOTIFICATION_TYPE;
  medicationId: string;
  scheduledTime: string;
}

export interface TestNotificationResult {
  identifier: string;
  scheduledFor: Date;
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  });
}

async function ensureAndroidChannelAsync(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(MEDICATION_CHANNEL_ID, {
    name: 'Medication reminders',
    description: 'Reminders for scheduled medication doses',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 150, 500],
    lightColor: '#E53E3E',
    sound: 'default',
  });
}

async function ensureMedicationCategoryAsync(): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.setNotificationCategoryAsync(
    MEDICATION_CATEGORY_ID,
    [
      {
        identifier: OPEN_REMINDER_ACTION,
        buttonTitle: 'Open Reminder',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: SNOOZE_REMINDER_ACTION,
        buttonTitle: 'Remind in 5 min',
        options: {
          opensAppToForeground: true,
        },
      },
    ],
    {
      previewPlaceholder: 'Medication reminder',
      categorySummaryFormat: '%u medication reminders',
      showTitle: true,
      showSubtitle: true,
    }
  );
}

export async function requestNotificationPermissionsAsync(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  await Promise.all([ensureAndroidChannelAsync(), ensureMedicationCategoryAsync()]);

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });

  return requested.granted;
}

function parseReminderTime(value: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function notificationContent(
  medication: Medication,
  scheduledTime: string
): Notifications.NotificationContentInput {
  const data: MedicationNotificationData = {
    type: MEDICATION_NOTIFICATION_TYPE,
    medicationId: medication.id,
    scheduledTime,
  };

  return {
    title: '💊 Time for your medicine',
    subtitle: `${medication.name} · ${scheduledTime}`,
    body: `Take ${medication.dosage}. Open this reminder to confirm your dose.`,
    data,
    sound: 'default',
    categoryIdentifier: MEDICATION_CATEGORY_ID,
    interruptionLevel: 'active',
    priority: Notifications.AndroidNotificationPriority.MAX,
  };
}

async function cancelPreviousMedicationNotificationsAsync(): Promise<void> {
  const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
  if (!raw) return;

  let identifiers: string[] = [];
  try {
    identifiers = JSON.parse(raw) as string[];
  } catch {
    // A malformed cache should not prevent notifications from being rescheduled.
  }

  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {})
    )
  );
  await AsyncStorage.removeItem(SCHEDULED_IDS_KEY);
}

export async function scheduleJourneyNotificationsAsync(journey: Journey): Promise<string[]> {
  const granted = await requestNotificationPermissionsAsync();
  if (!granted) return [];

  await cancelPreviousMedicationNotificationsAsync();

  const identifiers: string[] = [];
  for (const medication of journey.medications) {
    for (const scheduledTime of medication.reminderTimes) {
      const time = parseReminderTime(scheduledTime);
      if (!time) {
        if (__DEV__) {
          console.warn(`Skipping invalid medication reminder time: ${scheduledTime}`);
        }
        continue;
      }

      try {
        const identifier = await Notifications.scheduleNotificationAsync({
          content: notificationContent(medication, scheduledTime),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: time.hour,
            minute: time.minute,
            channelId: MEDICATION_CHANNEL_ID,
          },
        });
        identifiers.push(identifier);
      } catch (error) {
        if (__DEV__) {
          console.warn('Unable to schedule medication notification', error);
        }
      }
    }
  }

  await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(identifiers));
  return identifiers;
}

export async function scheduleTestNotificationAsync(
  medication: Medication,
  scheduledTime: string
): Promise<TestNotificationResult> {
  const granted = await requestNotificationPermissionsAsync();
  if (!granted) {
    throw new Error(
      'Notification permission is disabled. Enable it in the device Settings, then try again.'
    );
  }

  const scheduledFor = new Date(Date.now() + 10_000);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: notificationContent(medication, scheduledTime),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: scheduledFor,
      channelId: MEDICATION_CHANNEL_ID,
    },
  });

  const pending = await Notifications.getAllScheduledNotificationsAsync();
  if (!pending.some((notification) => notification.identifier === identifier)) {
    throw new Error('The operating system did not keep the scheduled notification.');
  }

  return { identifier, scheduledFor };
}

export async function scheduleTestCarryNotificationAsync(): Promise<Date> {
  const granted = await requestNotificationPermissionsAsync();
  if (!granted) {
    throw new Error(
      'Notification permission is disabled. Enable it in device Settings, then try again.'
    );
  }

  const scheduledFor = new Date(Date.now() + 10_000);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎒 Bag check!',
      body: "Don't forget to pack your meds before you head out today.",
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: scheduledFor,
      channelId: MEDICATION_CHANNEL_ID,
    },
  });
  return scheduledFor;
}

const CARRY_EVENING_ID = 'carry-evening';
const CARRY_MORNING_ID = 'carry-morning';

export async function scheduleCarryReminders(): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await requestNotificationPermissionsAsync();
  if (!granted) return;

  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(CARRY_EVENING_ID).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(CARRY_MORNING_ID).catch(() => {}),
  ]);

  await Promise.all([
    Notifications.scheduleNotificationAsync({
      identifier: CARRY_EVENING_ID,
      content: {
        title: '🌙 Prep for tomorrow',
        body: "Pack your midday meds into your bag tonight so you don't forget!",
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
        channelId: MEDICATION_CHANNEL_ID,
      },
    }),
    Notifications.scheduleNotificationAsync({
      identifier: CARRY_MORNING_ID,
      content: {
        title: '☀️ Bag check!',
        body: "Don't forget to pack your meds before you head out today.",
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 7,
        minute: 0,
        channelId: MEDICATION_CHANNEL_ID,
      },
    }),
  ]);
}

export async function snoozeMedicationNotificationAsync(
  notification: Notifications.Notification,
  seconds = 5 * 60
): Promise<string> {
  const data = getMedicationNotificationData(notification);
  if (!data) {
    throw new Error('The notification does not contain medication reminder data.');
  }

  const content = notification.request.content;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      subtitle: content.subtitle,
      body: content.body,
      data,
      sound: 'default',
      categoryIdentifier: MEDICATION_CATEGORY_ID,
      interruptionLevel: 'active',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: MEDICATION_CHANNEL_ID,
    },
  });
}

export function getMedicationNotificationData(
  notification: Notifications.Notification
): MedicationNotificationData | null {
  const data = notification.request.content.data;
  if (
    data?.type !== MEDICATION_NOTIFICATION_TYPE ||
    typeof data.medicationId !== 'string' ||
    typeof data.scheduledTime !== 'string'
  ) {
    return null;
  }

  return {
    type: MEDICATION_NOTIFICATION_TYPE,
    medicationId: data.medicationId,
    scheduledTime: data.scheduledTime,
  };
}
