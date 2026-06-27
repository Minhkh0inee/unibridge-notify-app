import AsyncStorage from '@react-native-async-storage/async-storage';

import { sevenDaysAgo } from '@/utils/date';

import type { DoseLog, Journey } from './types';

export const JOURNEY_KEY = 'active_journey';
export const ALL_JOURNEYS_KEY = 'all_journeys';
export const DOSE_LOGS_KEY = 'dose_logs';
export const SEEDED_KEY = 'seeded_v1';

export async function saveJourney(journey: Journey): Promise<void> {
  await AsyncStorage.setItem(JOURNEY_KEY, JSON.stringify(journey));
}

export async function getActiveJourney(): Promise<Journey | null> {
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
