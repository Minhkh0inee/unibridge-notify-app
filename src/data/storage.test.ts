import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

import {
  getActiveJourney,
  getTodayCarryLog,
  getWeeklyLogs,
  logDose,
  saveCarryLog,
  saveJourney,
} from './storage';
import type { CarryLog, DoseLog, Journey } from './types';

const sampleMedication = {
  id: 'med-1',
  name: 'Amoxicillin',
  dosage: '500mg',
  reminderTimes: ['08:00', '13:00', '20:00'],
};

const sampleJourney: Journey = {
  id: 'journey-1',
  name: 'HP Treatment',
  medications: [sampleMedication],
  escalationConfig: {
    startGentleSeconds: 60,
    stepSeconds: 180,
    requirePhotoToStop: true,
  },
};

describe('storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('saveJourney + getActiveJourney', () => {
    it('saves and retrieves the active journey', async () => {
      await saveJourney(sampleJourney);
      const result = await getActiveJourney();
      expect(result).toEqual(sampleJourney);
    });

    it('returns null when no journey has been saved', async () => {
      const result = await getActiveJourney();
      expect(result).toBeNull();
    });

    it('overwrites the previous journey when saved again', async () => {
      await saveJourney(sampleJourney);
      const updated: Journey = { ...sampleJourney, name: 'Asthma Treatment' };
      await saveJourney(updated);
      const result = await getActiveJourney();
      expect(result?.name).toBe('Asthma Treatment');
    });
  });

  describe('logDose + getWeeklyLogs', () => {
    it('returns an empty array when no doses have been logged', async () => {
      const results = await getWeeklyLogs();
      expect(results).toEqual([]);
    });

    it('logged dose appears in weekly logs', async () => {
      const log: DoseLog = {
        medicationId: 'med-1',
        scheduledTime: '08:00',
        actionTakenAt: new Date().toISOString(),
        status: 'taken',
      };
      await logDose(log);
      const results = await getWeeklyLogs();
      expect(results).toContainEqual(log);
    });

    it('dose older than 7 days is excluded from weekly logs', async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const oldLog: DoseLog = {
        medicationId: 'med-1',
        scheduledTime: '08:00',
        actionTakenAt: eightDaysAgo,
        status: 'taken',
      };
      await logDose(oldLog);
      const results = await getWeeklyLogs();
      expect(results).not.toContainEqual(oldLog);
    });

    it('preserves all DoseLog fields exactly', async () => {
      const log: DoseLog = {
        medicationId: 'med-1',
        scheduledTime: '13:00',
        actionTakenAt: new Date().toISOString(),
        status: 'taken',
        photoUri: 'file://path/to/photo.jpg',
      };
      await logDose(log);
      const results = await getWeeklyLogs();
      expect(results[0]).toEqual(log);
    });

    it('multiple doses within the 7-day window all appear', async () => {
      const logs: DoseLog[] = [
        {
          medicationId: 'med-1',
          scheduledTime: '08:00',
          actionTakenAt: new Date().toISOString(),
          status: 'taken',
        },
        {
          medicationId: 'med-1',
          scheduledTime: '13:00',
          actionTakenAt: new Date().toISOString(),
          status: 'ignored',
        },
        {
          medicationId: 'med-1',
          scheduledTime: '20:00',
          actionTakenAt: new Date().toISOString(),
          status: 'taken',
        },
      ];
      for (const log of logs) {
        await logDose(log);
      }
      const results = await getWeeklyLogs();
      expect(results).toHaveLength(3);
    });

    it('mixes of in-window and out-of-window doses — only recent ones returned', async () => {
      const recent: DoseLog = {
        medicationId: 'med-1',
        scheduledTime: '08:00',
        actionTakenAt: new Date().toISOString(),
        status: 'taken',
      };
      const old: DoseLog = {
        medicationId: 'med-1',
        scheduledTime: '08:00',
        actionTakenAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'taken',
      };
      await logDose(recent);
      await logDose(old);
      const results = await getWeeklyLogs();
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(recent);
    });
  });

  describe('saveCarryLog + getTodayCarryLog', () => {
    it('returns null when no carry log exists for today', async () => {
      const result = await getTodayCarryLog();
      expect(result).toBeNull();
    });

    it('saves and retrieves today carry log', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const log: CarryLog = { date: today, confirmedAt: new Date().toISOString() };
      await saveCarryLog(log);
      const result = await getTodayCarryLog();
      expect(result).toEqual(log);
    });

    it('does not return a carry log from a different day', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const log: CarryLog = { date: yesterday, confirmedAt: new Date().toISOString() };
      await saveCarryLog(log);
      const result = await getTodayCarryLog();
      expect(result).toBeNull();
    });
  });
});
