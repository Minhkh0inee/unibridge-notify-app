import type { DoseLog, DoseStatus, Journey, Medication } from './types';

export type Period = 'Sáng' | 'Trưa' | 'Chiều' | 'Tối';
export type DoseTone = 'primary' | 'secondary' | 'success' | 'warning';

export interface ScheduledDose {
  id: string;
  medication: Medication;
  time: string;
  period: Period;
  status: DoseStatus | 'upcoming' | 'late';
  tone: DoseTone;
}

const toneCycle: DoseTone[] = ['secondary', 'primary', 'warning', 'success'];

export function getPeriod(time: string): Period {
  const hour = Number(time.split(':')[0]);
  if (hour < 11) return 'Sáng';
  if (hour < 14) return 'Trưa';
  if (hour < 18) return 'Chiều';
  return 'Tối';
}

export function getScheduledDoses(journey: Journey | null, logs: DoseLog[] = []): ScheduledDose[] {
  if (!journey) return [];

  const logged = new Map(
    logs.map((log) => [`${log.medicationId}:${log.scheduledTime}`, log.status])
  );

  const doses: ScheduledDose[] = journey.medications.flatMap((medication, medicationIndex) =>
    medication.reminderTimes.map((time) => {
      const status = logged.get(`${medication.id}:${time}`);

      return {
        id: `${medication.id}-${time}`,
        medication,
        time,
        period: getPeriod(time),
        status: status ?? ('upcoming' as const),
        tone: toneCycle[medicationIndex % toneCycle.length],
      };
    })
  );

  return doses
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((dose, index) => {
      if (dose.status !== 'upcoming') return dose;
      if (index === 0) return { ...dose, status: 'taken' };
      if (index === 1) return dose;
      return { ...dose, status: 'pending' };
    });
}

export function getTodayProgress(doses: ScheduledDose[]) {
  const total = doses.length;
  const done = doses.filter((dose) => dose.status === 'taken').length;

  return { done, total };
}

export function getNextDose(doses: ScheduledDose[]) {
  return doses.find((dose) => dose.status === 'upcoming' || dose.status === 'pending');
}

export function getCurrentPeriodDose(doses: ScheduledDose[]) {
  const now = new Date();
  const currentHour = now.getHours();

  // Determine current period
  let currentPeriod: Period;
  if (currentHour < 11) currentPeriod = 'Sáng';
  else if (currentHour < 14) currentPeriod = 'Trưa';
  else if (currentHour < 18) currentPeriod = 'Chiều';
  else currentPeriod = 'Tối';

  // Find the earliest untaken dose in the current period
  return doses.find(
    (dose) => dose.period === currentPeriod && (dose.status === 'upcoming' || dose.status === 'pending')
  ) ?? null;
}
