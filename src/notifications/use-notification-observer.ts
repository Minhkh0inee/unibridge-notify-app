import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { getMedicationNotificationData } from './notifications';

function redirectFromNotification(notification: Notifications.Notification): void {
  const data = getMedicationNotificationData(notification);
  if (!data) return;

  router.replace({
    pathname: '/',
    params: {
      reminderMedicationId: data.medicationId,
      reminderScheduledTime: data.scheduledTime,
      notificationId: notification.request.identifier,
    },
  });
}

export function useNotificationObserver(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      redirectFromNotification(lastResponse.notification);
      Notifications.clearLastNotificationResponse();
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      redirectFromNotification(response.notification);
      Notifications.clearLastNotificationResponse();
    });

    return () => subscription.remove();
  }, []);
}
