import AsyncStorage from '@react-native-async-storage/async-storage';

import { sevenDaysAgo } from '@/utils/date';

import type { CarryLog, DoseLog, Journey } from './types';
import {
  getActiveJourneys,
  getMedicationsByJourney,
  getSchedulesByJourney,
} from './supabase-storage';

export const JOURNEY_KEY = 'active_journey';
export const ALL_JOURNEYS_KEY = 'all_journeys';
export const DOSE_LOGS_KEY = 'dose_logs';
export const SEEDED_KEY = 'seeded_v1';

// Flag to enable Supabase (set to true once Phase 3 is complete)
const USE_SUPABASE = false;

export async function saveJourney(journey: Journey): Promise<void> {
  await AsyncStorage.setItem(JOURNEY_KEY, JSON.stringify(journey));
}

export async function getActiveJourney(): Promise<Journey | null> {
  if (USE_SUPABASE) {
    // New: Fetch from Supabase
    const journeys = await getActiveJourneys();
    if (journeys.length === 0) return null;

    const journey = journeys[0];
    const medications = await getMedicationsByJourney(journey.id);
    const schedules = await getSchedulesByJourney(journey.id);

    // Convert to legacy Journey format
    return {
      id: journey.id,
      name: journey.name,
      medications: medications.map((med) => {
        const medSchedules = schedules.filter(
          (s) => s.medication_id === med.id
        );
        return {
          id: med.id,
          name: med.name,
          dosage: med.dosage,
          reminderTimes: medSchedules.map((s) =>
            s.target_time.substring(0, 5)
          ), // HH:MM:SS -> HH:MM
        };
      }),
      escalationConfig: {
        startGentleSeconds: 60,
        stepSeconds: 180,
        requirePhotoToStop: false,
      },
    };
  }

  // Legacy: Read from AsyncStorage
  const raw = await AsyncStorage.getItem(JOURNEY_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as Journey;
}

export async function logDose(log: DoseLog): Promise<void> {
  const logs = await readDoseLogs();
  logs.push(log);
  await AsyncStorage.setItem(DOSE_LOGS_KEY, JSON.stringify(logs));
}

export async function getWeeklyLogs(): Promise<DoseLog[]> {
  const logs = await readDoseLogs();
  const cutoff = sevenDaysAgo();
  return logs.filter((log) => new Date(log.actionTakenAt) >= cutoff);
}

async function readDoseLogs(): Promise<DoseLog[]> {
  const raw = await AsyncStorage.getItem(DOSE_LOGS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as DoseLog[];
}

const CARRY_LOGS_KEY = 'carry_logs';

export async function saveCarryLog(log: CarryLog): Promise<void> {
  const logs = await readCarryLogs();
  logs.push(log);
  await AsyncStorage.setItem(CARRY_LOGS_KEY, JSON.stringify(logs));
}

export async function getTodayCarryLog(): Promise<CarryLog | null> {
  const today = new Date().toISOString().slice(0, 10);
  const logs = await readCarryLogs();
  return logs.find((log) => log.date === today) ?? null;
}

async function readCarryLogs(): Promise<CarryLog[]> {
  const raw = await AsyncStorage.getItem(CARRY_LOGS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as CarryLog[];
}
