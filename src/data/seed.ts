import AsyncStorage from '@react-native-async-storage/async-storage';

import { ALL_JOURNEYS_KEY, SEEDED_KEY, saveJourney } from './storage';
import type { Journey } from './types';

const hpJourney: Journey = {
  id: 'journey-hp-001',
  name: 'HP',
  medications: [
    {
      id: 'med-hp-001',
      name: 'Lisinopril',
      dosage: '10mg',
      reminderTimes: ['08:00'],
    },
    {
      id: 'med-hp-002',
      name: 'Atenolol',
      dosage: '25mg',
      reminderTimes: ['08:00', '20:00'],
    },
  ],
  escalationConfig: {
    startGentleSeconds: 60,
    stepSeconds: 180,
    requirePhotoToStop: false,
  },
};

const asthmaJourney: Journey = {
  id: 'journey-asthma-001',
  name: 'Asthma',
  medications: [
    {
      id: 'med-asthma-001',
      name: 'Albuterol',
      dosage: '90mcg/puff',
      reminderTimes: ['08:00', '14:00', '20:00'],
    },
    {
      id: 'med-asthma-002',
      name: 'Fluticasone',
      dosage: '44mcg/puff',
      reminderTimes: ['08:00', '20:00'],
    },
  ],
  escalationConfig: {
    startGentleSeconds: 30,
    stepSeconds: 180,
    requirePhotoToStop: true,
  },
};

export async function seedIfNeeded(): Promise<void> {
  const alreadySeeded = await AsyncStorage.getItem(SEEDED_KEY);
  if (alreadySeeded) return;

  const allJourneys: Journey[] = [hpJourney, asthmaJourney];
  await AsyncStorage.setItem(ALL_JOURNEYS_KEY, JSON.stringify(allJourneys));
  await saveJourney(hpJourney);

  await AsyncStorage.setItem(SEEDED_KEY, '1');
}
