import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';

import {
  getMedicationNotificationData,
  SNOOZE_REMINDER_ACTION,
  snoozeMedicationNotificationAsync,
} from './notifications';
import { publishReminderIntent } from './reminder-intent';

function redirectFromNotification(notification: Notifications.Notification): void {
  const data = getMedicationNotificationData(notification);
  if (!data) return;

  publishReminderIntent({
    medicationId: data.medicationId,
    scheduledTime: data.scheduledTime,
    notificationId: notification.request.identifier,
  });

  router.replace('/');
}

async function handleNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<void> {
  try {
    if (response.actionIdentifier === SNOOZE_REMINDER_ACTION) {
      await snoozeMedicationNotificationAsync(response.notification);
      router.replace('/');
      Alert.alert('Reminder snoozed', 'We will remind you again in 5 minutes.');
      return;
    }

    redirectFromNotification(response.notification);
  } catch (error) {
    if (__DEV__) {
      console.warn('Unable to handle medication notification action', error);
    }
    redirectFromNotification(response.notification);
  } finally {
    Notifications.clearLastNotificationResponse();
  }
}

export function useNotificationObserver(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handledResponses = new Set<string>();
    const handleOnce = (response: Notifications.NotificationResponse) => {
      const notification = response.notification;
      const responseKey = [
        notification.request.identifier,
        notification.date,
        response.actionIdentifier,
      ].join(':');
      if (handledResponses.has(responseKey)) return;

      handledResponses.add(responseKey);
      void handleNotificationResponse(response);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleOnce);

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      handleOnce(lastResponse);
    }

    return () => subscription.remove();
  }, []);
}
