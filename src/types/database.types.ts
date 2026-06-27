export type SessionName = 'morning' | 'noon' | 'afternoon' | 'evening' | 'bedtime';
export type MedicationStatus = 'active' | 'paused' | 'completed';
export type SourceType = 'manual' | 'ocr';
export type FoodInstruction = 'before' | 'after' | 'during' | null;
export type PresetType = 'gentle' | 'balanced' | 'decisive' | null;
export type ConfirmationMethod = 'button' | 'photo' | 'photo_required';
export type SoundMode = 'silent' | 'vibrate' | 'soft' | 'escalating';

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  active_ingredient?: string;
  strength?: string;
  form?: string;
  dosage_amount: number;
  dosage_unit: string;
  food_instruction?: FoodInstruction;
  start_date: string;
  end_date?: string;
  status: MedicationStatus;
  source_type: SourceType;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface JourneyConfig {
  id: string;
  user_id?: string;
  name: string;
  preset_type?: PresetType;
  reminder_offset_minutes: number;
  escalation_intervals: number[];
  confirmation_method: ConfirmationMethod;
  snooze_duration_minutes: number;
  sound_mode: SoundMode;
  max_reminders?: number;
  is_preset: boolean;
  created_at: string;
}

export interface MedicationSchedule {
  id: string;
  medication_id: string;
  session_name: SessionName;
  target_time: string;
  valid_window_start: string;
  valid_window_end: string;
  days_of_week: number[];
  journey_config_id: string;
  active_from: string;
  active_until?: string;
  created_at: string;
  updated_at: string;
  medication?: Medication;
  journey_config?: JourneyConfig;
}
