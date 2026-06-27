import AsyncStorage from '@react-native-async-storage/async-storage';

import { ALL_JOURNEYS_KEY, SEEDED_KEY, saveJourney } from './storage';
import type { Journey } from './types';

const formatDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

const hpJourney: Journey = {
  id: 'journey-hp-001',
  name: 'HP',
  medications: [
    {
      id: 'med-hp-001',
      name: 'Lisinopril',
      activeIngredient: 'Lisinopril USP',
      dosage: '10mg',
      form: 'Viên nén',
      quantityPerDose: 1,
      instruction: 'after_meal',
      reminderTimes: ['08:00'],
      startDate: formatDate(fiveDaysAgo),
      endDate: formatDate(fiveDaysFromNow),
      doctorOrClinic: 'Bác sĩ Minh - Bệnh viện Bạch Mai',
      notes: 'Uống với một ly nước lọc đầy sau bữa ăn sáng.',
      dataSource: 'manual',
      status: 'active',
    },
    {
      id: 'med-hp-002',
      name: 'Atenolol',
      activeIngredient: 'Atenolol',
      dosage: '25mg',
      form: 'Viên nén',
      quantityPerDose: 1,
      instruction: 'before_meal',
      reminderTimes: ['08:00', '20:00'],
      startDate: formatDate(fiveDaysAgo),
      endDate: formatDate(tenDaysFromNow),
      doctorOrClinic: 'Bác sĩ Minh - Bệnh viện Bạch Mai',
      notes: 'Uống trước ăn 30 phút. Tránh uống nước bưởi.',
      dataSource: 'manual',
      status: 'active',
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
      name: 'Albuterol Inhaler',
      activeIngredient: 'Albuterol Sulfate',
      dosage: '90mcg/puff',
      form: 'Bình xịt',
      quantityPerDose: '2 nhát xịt',
      instruction: 'none',
      reminderTimes: ['08:00', '14:00', '20:00'],
      startDate: formatDate(yesterday),
      endDate: formatDate(fiveDaysFromNow),
      doctorOrClinic: 'Bệnh viện Tai Mũi Họng',
      notes: 'Xịt hít khi thấy khó thở hoặc theo lịch cố định.',
      dataSource: 'ocr',
      status: 'active',
    },
    {
      id: 'med-asthma-002',
      name: 'Fluticasone',
      activeIngredient: 'Fluticasone Propionate',
      dosage: '44mcg/puff',
      form: 'Bình xịt',
      quantityPerDose: '1 nhát xịt',
      instruction: 'none',
      reminderTimes: ['08:00', '20:00'],
      startDate: formatDate(yesterday),
      endDate: formatDate(tenDaysFromNow),
      doctorOrClinic: 'Bệnh viện Tai Mũi Họng',
      notes: 'Súc miệng sạch bằng nước ấm sau khi xịt để tránh nấm miệng.',
      dataSource: 'ocr',
      status: 'active',
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
  if (alreadySeeded === 'seeded_v2') return;

  const allJourneys: Journey[] = [hpJourney, asthmaJourney];
  await AsyncStorage.setItem(ALL_JOURNEYS_KEY, JSON.stringify(allJourneys));
  await saveJourney(hpJourney);

  await AsyncStorage.setItem(SEEDED_KEY, 'seeded_v2');
}
