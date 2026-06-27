import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Native (iOS/Android) configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      medications: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          active_ingredient: string | null;
          strength: string | null;
          form: string | null;
          dosage_amount: number;
          dosage_unit: string;
          food_instruction: string | null;
          start_date: string;
          end_date: string | null;
          status: 'active' | 'paused' | 'completed';
          source_type: 'manual' | 'ocr';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['medications']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['medications']['Insert']>;
      };
      journey_configs: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          preset_type: 'gentle' | 'balanced' | 'decisive' | null;
          reminder_offset_minutes: number;
          escalation_intervals: number[];
          confirmation_method: 'button' | 'photo' | 'photo_required';
          snooze_duration_minutes: number;
          sound_mode: 'silent' | 'vibrate' | 'soft' | 'escalating';
          max_reminders: number | null;
          is_preset: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['journey_configs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['journey_configs']['Insert']>;
      };
      medication_schedules: {
        Row: {
          id: string;
          medication_id: string;
          session_name: 'morning' | 'noon' | 'afternoon' | 'evening' | 'bedtime';
          target_time: string;
          valid_window_start: string;
          valid_window_end: string;
          days_of_week: number[];
          journey_config_id: string;
          active_from: string;
          active_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['medication_schedules']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['medication_schedules']['Insert']>;
      };
    };
  };
};
