export interface ReminderIntent {
  medicationId: string;
  scheduledTime: string;
  notificationId: string;
}

type ReminderIntentListener = (intent: ReminderIntent) => void;

let pendingIntent: ReminderIntent | null = null;
const listeners = new Set<ReminderIntentListener>();

export function publishReminderIntent(intent: ReminderIntent): void {
  pendingIntent = intent;
  listeners.forEach((listener) => listener(intent));
}

export function getPendingReminderIntent(): ReminderIntent | null {
  return pendingIntent;
}

export function clearPendingReminderIntent(notificationId: string): void {
  if (pendingIntent?.notificationId === notificationId) {
    pendingIntent = null;
  }
}

export function subscribeToReminderIntents(listener: ReminderIntentListener): () => void {
  listeners.add(listener);

  if (pendingIntent) {
    listener(pendingIntent);
  }

  return () => {
    listeners.delete(listener);
  };
}
