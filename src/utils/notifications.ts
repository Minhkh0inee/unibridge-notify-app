import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Medication } from '@/data/types';

// Helper to format instruction code to Vietnamese
function getInstructionLabel(instruction?: string): string {
  switch (instruction) {
    case 'before_meal':
      return 'Trước ăn';
    case 'after_meal':
      return 'Sau ăn';
    case 'during_meal':
      return 'Trong khi ăn';
    case 'none':
    default:
      return 'Không xác định';
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.error('Error requesting notification permission:', e);
    return false;
  }
}

export async function scheduleMedicationNotifications(medication: Medication): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    // 1. Cancel existing notifications for this medication
    await cancelMedicationNotifications(medication.id);

    // 2. Do not schedule if paused or ended
    if (medication.status === 'paused' || medication.status === 'ended') {
      return;
    }

    // 3. Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    // 4. Schedule recurring daily notifications
    for (const time of medication.reminderTimes || []) {
      const [hour, minute] = time.split(':').map(Number);
      
      const body = `Liều dùng: ${medication.quantityPerDose || 1} ${medication.form || 'liều'} - ${medication.dosage}. ${
        medication.instruction && medication.instruction !== 'none'
          ? `Hướng dẫn: ${getInstructionLabel(medication.instruction)}`
          : ''
      }`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Đến giờ uống thuốc: ${medication.name}`,
          body,
          data: { medicationId: medication.id, scheduledTime: time },
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        } as any,
        identifier: `${medication.id}_${time}`,
      });
    }
  } catch (e) {
    console.error(`Error scheduling notifications for ${medication.name}:`, e);
  }
}

export async function cancelMedicationNotifications(medicationId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.identifier.startsWith(`${medicationId}_`)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (e) {
    console.error(`Error cancelling notifications for ${medicationId}:`, e);
  }
}
