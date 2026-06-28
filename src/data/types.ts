// Legacy types (kept for backward compatibility during migration)
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
  /** Local calendar date formatted as YYYY-MM-DD. */
  date: string;
  /** ISO 8601 datetime when the user confirmed their medication was packed. */
  confirmedAt: string;
}

// ============================================================================
// NEW: Database-aligned types (Phase 3+)
// ============================================================================

export type Period = 'morning' | 'noon' | 'afternoon' | 'evening' | 'bedtime';

export type DayDoseStatus =
  | 'complete'
  | 'partial'
  | 'late'
  | 'missed'
  | 'future'
  | 'none';

export type JourneyPreset = 'gentle' | 'balanced' | 'assertive' | 'custom';

export type CompletionMethod =
  | 'tap_taken'
  | 'photo'
  | 'photo_and_confirm'
  | 'none';

export type ApplyScope = 'once' | 'from_date' | 'entire_course';

export type SoundMode =
  | 'silent'
  | 'vibrate'
  | 'gentle_sound'
  | 'escalating_sound';

export type JourneyStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export type MedicationStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export type DoseEventStatus = 'pending' | 'taken' | 'skipped' | 'late' | 'missed';

export type NotificationKind = 'reminder' | 'prep' | 'carry' | 'escalation';

export type MaxEscalationLevel = 'low' | 'medium' | 'high';

// Database entities

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface JourneyEntity {
  id: string;
  user_id: string;
  name: string;
  status: JourneyStatus;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  preset: JourneyPreset;
  created_at: string;
  updated_at: string;
}

export interface MedicationEntity {
  id: string;
  journey_id: string;
  user_id: string;
  name: string;
  active_ingredient: string | null;
  dosage: string;
  instructions: string | null;
  icon_url: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  status: MedicationStatus;
  created_at: string;
  updated_at: string;
}

export interface MedicationSchedule {
  id: string;
  medication_id: string;
  journey_id: string;
  user_id: string;
  period: Period;
  target_time: string; // HH:MM:SS
  window_start: string; // HH:MM:SS
  window_end: string; // HH:MM:SS
  days_of_week: number[] | null; // [0-6], null = all days
  created_at: string;
  updated_at: string;
}

export interface JourneySessionConfig {
  id: string;
  journey_id: string;
  schedule_id: string | null;
  user_id: string;
  period: Period;
  target_time: string; // HH:MM:SS
  window_start: string; // HH:MM:SS
  window_end: string; // HH:MM:SS
  reminder_offset_minutes: number;
  escalation_intervals_minutes: number[];
  max_escalation_level: MaxEscalationLevel;
  completion_method: CompletionMethod;
  ask_later_minutes: number;
  sound_mode: SoundMode;
  prep_reminder_enabled: boolean;
  prep_reminder_minutes: number | null;
  carry_reminder_enabled: boolean;
  preset: JourneyPreset;
  created_at: string;
  updated_at: string;
}

export interface ScheduleOverride {
  id: string;
  user_id: string;
  journey_id: string;
  schedule_id: string | null;
  effective_date: string; // YYYY-MM-DD
  scope: ApplyScope;
  period: Period;
  target_time: string; // HH:MM:SS
  window_start: string; // HH:MM:SS
  window_end: string; // HH:MM:SS
  config: Record<string, unknown>; // JSONB
  created_at: string;
  updated_at: string;
}

export interface DoseEvent {
  id: string;
  user_id: string;
  journey_id: string;
  medication_id: string;
  schedule_id: string | null;
  scheduled_for: string; // ISO 8601 timestamp
  action_taken_at: string | null; // ISO 8601 timestamp
  status: DoseEventStatus;
  photo_uri: string | null;
  created_at: string;
}

export interface NotificationSchedule {
  id: string;
  user_id: string;
  journey_id: string;
  schedule_id: string | null;
  notification_identifier: string;
  kind: NotificationKind;
  scheduled_for: string; // ISO 8601 timestamp
  created_at: string;
}

// UI models (computed from database entities)

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  status: DayDoseStatus;
  totalDoses: number;
  takenDoses: number;
  lateDoses: number;
  missedDoses: number;
}

export interface AgendaSession {
  period: Period;
  targetTime: string; // HH:MM
  windowStart: string; // HH:MM
  windowEnd: string; // HH:MM
  medications: {
    id: string;
    name: string;
    dosage: string;
    instructions: string | null;
    iconUrl: string | null;
  }[];
  status: DoseEventStatus;
  config: JourneySessionConfig;
}

export interface DayAgenda {
  date: string; // YYYY-MM-DD
  sessions: AgendaSession[];
}
