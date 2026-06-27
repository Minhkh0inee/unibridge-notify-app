export type DoseStatus = 'taken' | 'ignored' | 'pending';

export interface EscalationConfig {
  startGentleSeconds: number;
  /** Interval between escalation steps; defaults to 180 */
  stepSeconds: number;
  requirePhotoToStop: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  /** ISO 24h clock strings e.g. ["08:00", "20:00"] */
  reminderTimes: string[];
}

export interface Journey {
  id: string;
  name: string;
  medications: Medication[];
  escalationConfig: EscalationConfig;
}

export interface DoseLog {
  medicationId: string;
  /** "HH:MM" matching a Medication.reminderTimes entry */
  scheduledTime: string;
  /** ISO 8601 datetime when the user acted */
  actionTakenAt: string;
  photoUri?: string;
  status: DoseStatus;
}

export interface CarryLog {
  date: string; // "YYYY-MM-DD"
  confirmedAt: string; // ISO 8601
}
