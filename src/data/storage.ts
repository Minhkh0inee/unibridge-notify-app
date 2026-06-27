import AsyncStorage from '@react-native-async-storage/async-storage';

import { sevenDaysAgo } from '@/utils/date';

import type { DoseLog, Journey, Medication } from './types';

export const JOURNEY_KEY = 'active_journey';
export const ALL_JOURNEYS_KEY = 'all_journeys';
export const DOSE_LOGS_KEY = 'dose_logs';
export const SEEDED_KEY = 'seeded_v2';

export async function saveJourney(journey: Journey): Promise<void> {
  await AsyncStorage.setItem(JOURNEY_KEY, JSON.stringify(journey));
}

export async function getActiveJourney(): Promise<Journey | null> {
  const raw = await AsyncStorage.getItem(JOURNEY_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as Journey;
}

export async function updateMedicationInActiveJourney(updatedMed: Medication): Promise<void> {
  const journey = await getActiveJourney();
  if (!journey) return;
  journey.medications = journey.medications.map((m) =>
    m.id === updatedMed.id ? updatedMed : m
  );
  await saveJourney(journey);
}

export async function deleteMedicationFromActiveJourney(medId: string): Promise<void> {
  const journey = await getActiveJourney();
  if (!journey) return;
  journey.medications = journey.medications.filter((m) => m.id !== medId);
  await saveJourney(journey);
}

export async function addMedicationToActiveJourney(newMed: Medication): Promise<void> {
  const journey = await getActiveJourney();
  if (!journey) return;
  journey.medications.push(newMed);
  await saveJourney(journey);
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

export async function readDoseLogs(): Promise<DoseLog[]> {
  const raw = await AsyncStorage.getItem(DOSE_LOGS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as DoseLog[];
}
