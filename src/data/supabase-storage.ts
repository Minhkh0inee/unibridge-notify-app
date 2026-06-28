import { supabase } from '@/lib/supabase';
import type {
  JourneyEntity,
  MedicationEntity,
  MedicationSchedule,
  JourneySessionConfig,
  ScheduleOverride,
  DoseEvent,
  NotificationSchedule,
  DoseEventStatus,
  Profile,
} from './types';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function createSampleDoseEvents(
  userId: string,
  journeyId: string,
  medications: MedicationEntity[],
  schedules: MedicationSchedule[]
): Promise<void> {
  const today = new Date();

  // Find some schedules to create events for
  const morningSchedule = schedules.find(s => s.period === 'morning');
  const noonSchedule = schedules.find(s => s.period === 'noon');
  const eveningSchedule = schedules.find(s => s.period === 'evening');

  const doseEvents = [];

  // Create 4 sample events over the past 4 days
  if (morningSchedule) {
    const med = medications.find(m => m.id === morningSchedule.medication_id);
    if (med) {
      const date = toDateKey(addDays(today, -4));
      doseEvents.push({
        user_id: userId,
        journey_id: journeyId,
        medication_id: med.id,
        schedule_id: morningSchedule.id,
        scheduled_for: `${date}T08:00:00`,
        action_taken_at: `${date}T08:05:00`,
        status: 'taken',
      });

      const date2 = toDateKey(addDays(today, -1));
      doseEvents.push({
        user_id: userId,
        journey_id: journeyId,
        medication_id: med.id,
        schedule_id: morningSchedule.id,
        scheduled_for: `${date2}T08:00:00`,
        action_taken_at: `${date2}T08:03:00`,
        status: 'taken',
      });
    }
  }

  if (noonSchedule) {
    const med = medications.find(m => m.id === noonSchedule.medication_id);
    if (med) {
      const date = toDateKey(addDays(today, -3));
      doseEvents.push({
        user_id: userId,
        journey_id: journeyId,
        medication_id: med.id,
        schedule_id: noonSchedule.id,
        scheduled_for: `${date}T12:00:00`,
        action_taken_at: `${date}T12:45:00`,
        status: 'late',
      });
    }
  }

  if (eveningSchedule) {
    const med = medications.find(m => m.id === eveningSchedule.medication_id);
    if (med) {
      const date = toDateKey(addDays(today, -2));
      doseEvents.push({
        user_id: userId,
        journey_id: journeyId,
        medication_id: med.id,
        schedule_id: eveningSchedule.id,
        scheduled_for: `${date}T20:00:00`,
        action_taken_at: null,
        status: 'missed',
      });
    }
  }

  if (doseEvents.length > 0) {
    const { error } = await supabase.from('dose_events').insert(doseEvents);
    if (error) {
      console.error('Failed to create sample dose events:', error);
    } else {
      console.log(`Created ${doseEvents.length} sample dose events`);
    }
  }
}

// ============================================================================
// Journeys
// ============================================================================

export async function getActiveJourneys(): Promise<JourneyEntity[]> {
  const { data, error } = await supabase
    .from('journeys')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch journeys:', error);
    return [];
  }

  return data ?? [];
}

/**
 * Create a small realistic demo journey for a newly-created anonymous user.
 * This is intentionally user-scoped so RLS keeps the demo data private.
 */
export async function ensureDemoJourneyForCurrentUser(userId: string): Promise<boolean> {
  const existing = await getActiveJourneys();
  for (const journey of existing) {
    const [medications, schedules] = await Promise.all([
      getMedicationsByJourney(journey.id),
      getSchedulesByJourney(journey.id),
    ]);

    if (medications.length > 0 && schedules.length > 0) {
      // Check if dose events exist - if not, create them
      const { data: events } = await supabase
        .from('dose_events')
        .select('id')
        .eq('journey_id', journey.id)
        .limit(1);

      if (events && events.length > 0) {
        return true; // Already has data including dose events
      }

      // Has journey but no dose events - create sample events
      console.log('Creating sample dose events for existing journey...');
      await createSampleDoseEvents(userId, journey.id, medications, schedules);
      return true;
    }
  }

  const today = new Date();
  const startDate = toDateKey(addDays(today, -7));

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: getRandomVietnameseDisplayName() });

  if (profileError) {
    console.error('Failed to create demo profile:', profileError);
    return false;
  }

  const { data: journey, error: journeyError } = await supabase
    .from('journeys')
    .insert({
      user_id: userId,
      name: 'HP',
      status: 'active',
      start_date: startDate,
      preset: 'balanced',
    })
    .select('*')
    .single<JourneyEntity>();

  if (journeyError || !journey) {
    console.error('Failed to create demo journey:', journeyError);
    return false;
  }

  const { data: medications, error: medicationError } = await supabase
    .from('medications')
    .insert([
      {
        journey_id: journey.id,
        user_id: userId,
        name: 'Lisinopril',
        dosage: '10mg',
        instructions: 'Sau ăn',
        start_date: startDate,
        status: 'active',
      },
      {
        journey_id: journey.id,
        user_id: userId,
        name: 'Atenolol',
        dosage: '25mg',
        instructions: 'Uống với nước',
        start_date: startDate,
        status: 'active',
      },
      {
        journey_id: journey.id,
        user_id: userId,
        name: 'Vitamin C',
        dosage: '1 viên',
        instructions: 'Sau ăn trưa',
        start_date: startDate,
        status: 'active',
      },
    ])
    .select('*');

  if (medicationError || !medications) {
    console.error('Failed to create demo medications:', medicationError);
    return false;
  }

  const lisinopril = medications.find((med) => med.name === 'Lisinopril');
  const atenolol = medications.find((med) => med.name === 'Atenolol');
  const vitaminC = medications.find((med) => med.name === 'Vitamin C');

  if (!lisinopril || !atenolol || !vitaminC) {
    console.error('Failed to resolve demo medication IDs.');
    return false;
  }

  const { data: schedules, error: scheduleError } = await supabase
    .from('medication_schedules')
    .insert([
      {
        medication_id: lisinopril.id,
        journey_id: journey.id,
        user_id: userId,
        period: 'morning',
        target_time: '08:00',
        window_start: '06:00',
        window_end: '10:00',
      },
      {
        medication_id: atenolol.id,
        journey_id: journey.id,
        user_id: userId,
        period: 'morning',
        target_time: '08:00',
        window_start: '06:00',
        window_end: '10:00',
      },
      {
        medication_id: vitaminC.id,
        journey_id: journey.id,
        user_id: userId,
        period: 'noon',
        target_time: '12:00',
        window_start: '11:00',
        window_end: '14:00',
      },
      {
        medication_id: atenolol.id,
        journey_id: journey.id,
        user_id: userId,
        period: 'evening',
        target_time: '20:00',
        window_start: '18:00',
        window_end: '21:30',
      },
    ])
    .select('*');

  if (scheduleError || !schedules) {
    console.error('Failed to create demo schedules:', scheduleError);
    return false;
  }

  const { error: configError } = await supabase.from('journey_session_configs').insert([
    {
      journey_id: journey.id,
      user_id: userId,
      period: 'morning',
      target_time: '08:00',
      window_start: '06:00',
      window_end: '10:00',
      reminder_offset_minutes: 0,
      escalation_intervals_minutes: [15, 10, 5],
      max_escalation_level: 'medium',
      completion_method: 'tap_taken',
      ask_later_minutes: 10,
      sound_mode: 'gentle_sound',
      preset: 'balanced',
      prep_reminder_enabled: true,
      prep_reminder_minutes: 15,
      carry_reminder_enabled: false,
    },
    {
      journey_id: journey.id,
      user_id: userId,
      period: 'noon',
      target_time: '12:00',
      window_start: '11:00',
      window_end: '14:00',
      reminder_offset_minutes: 0,
      escalation_intervals_minutes: [15, 10, 5],
      max_escalation_level: 'medium',
      completion_method: 'tap_taken',
      ask_later_minutes: 10,
      sound_mode: 'gentle_sound',
      preset: 'balanced',
      prep_reminder_enabled: false,
      prep_reminder_minutes: null,
      carry_reminder_enabled: false,
    },
    {
      journey_id: journey.id,
      user_id: userId,
      period: 'evening',
      target_time: '20:00',
      window_start: '18:00',
      window_end: '21:30',
      reminder_offset_minutes: 0,
      escalation_intervals_minutes: [10, 5, 3],
      max_escalation_level: 'high',
      completion_method: 'photo',
      ask_later_minutes: 5,
      sound_mode: 'escalating_sound',
      preset: 'assertive',
      prep_reminder_enabled: false,
      prep_reminder_minutes: null,
      carry_reminder_enabled: true,
    },
  ]);

  if (configError) {
    console.error('Failed to create demo session configs:', configError);
    return false;
  }

  const morningSchedule = schedules.find(
    (schedule) => schedule.medication_id === lisinopril.id && schedule.period === 'morning'
  );
  const noonSchedule = schedules.find((schedule) => schedule.period === 'noon');
  const eveningSchedule = schedules.find((schedule) => schedule.period === 'evening');

  const doseEvents = [
    {
      dateOffset: -4,
      medicationId: lisinopril.id,
      scheduleId: morningSchedule?.id,
      time: '08:00',
      actionTime: '08:05',
      status: 'taken',
    },
    {
      dateOffset: -3,
      medicationId: vitaminC.id,
      scheduleId: noonSchedule?.id,
      time: '12:00',
      actionTime: '12:45',
      status: 'late',
    },
    {
      dateOffset: -2,
      medicationId: atenolol.id,
      scheduleId: eveningSchedule?.id,
      time: '20:00',
      actionTime: null,
      status: 'missed',
    },
    {
      dateOffset: -1,
      medicationId: lisinopril.id,
      scheduleId: morningSchedule?.id,
      time: '08:00',
      actionTime: '08:03',
      status: 'taken',
    },
  ]
    .filter((event) => event.scheduleId)
    .map((event) => {
      const date = toDateKey(addDays(today, event.dateOffset));
      return {
        user_id: userId,
        journey_id: journey.id,
        medication_id: event.medicationId,
        schedule_id: event.scheduleId,
        scheduled_for: `${date}T${event.time}:00`,
        action_taken_at: event.actionTime ? `${date}T${event.actionTime}:00` : null,
        status: event.status,
      };
    });

  if (doseEvents.length > 0) {
    const { error: doseEventError } = await supabase.from('dose_events').insert(doseEvents);

    if (doseEventError) {
      console.error('Failed to create demo dose events:', doseEventError);
      return false;
    }
  }

  return true;
}

function getRandomVietnameseDisplayName(): string {
  const familyNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đỗ', 'Hồ', 'Đặng'];
  const middleNames = ['Văn', 'Thị', 'Hoàng', 'Ngọc', 'Phương', 'Tuấn', 'Minh', 'Thu', 'Quỳnh', 'Bảo'];
  const givenNames = ['An', 'Bình', 'Cường', 'Dũng', 'Giang', 'Hà', 'Hiếu', 'Hương', 'Khánh', 'Lan', 'Linh', 'Minh', 'Ngọc', 'Phúc', 'Quỳnh', 'Thảo', 'Tiến', 'Trang', 'Tú', 'Vân'];

  const familyName = familyNames[Math.floor(Math.random() * familyNames.length)];
  const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
  const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];

  return `${familyName} ${middleName} ${givenName}`;
}

export async function getJourneyById(id: string): Promise<JourneyEntity | null> {
  const { data, error } = await supabase
    .from('journeys')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch journey:', error);
    return null;
  }

  return data;
}

// ============================================================================
// Medications
// ============================================================================

export async function getMedicationsByJourney(
  journeyId: string
): Promise<MedicationEntity[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('journey_id', journeyId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch medications:', error);
    return [];
  }

  return data ?? [];
}

export async function createDoseMedicationsWithSchedules(input: {
  userId: string;
  journeyId: string;
  medications: {
    name: string;
    dosage: string;
    instructions: string | null;
  }[];
  schedules: {
    period: MedicationSchedule['period'];
    targetTime: string;
    windowStart: string;
    windowEnd: string;
  }[];
}): Promise<MedicationEntity[]> {
  const startDate = toDateKey(new Date());
  const { data: medications, error: medicationError } = await supabase
    .from('medications')
    .insert(input.medications.map((medication) => ({
      journey_id: input.journeyId,
      user_id: input.userId,
      name: medication.name,
      dosage: medication.dosage,
      instructions: medication.instructions,
      start_date: startDate,
      status: 'active',
    })))
    .select('*');

  if (medicationError || !medications?.length) {
    throw new Error(medicationError?.message ?? 'Không thể tạo các thuốc trong liều.');
  }

  const { error: schedulesError } = await supabase
    .from('medication_schedules')
    .insert(
      medications.flatMap((medication) =>
        input.schedules.map((schedule) => ({
          medication_id: medication.id,
          journey_id: input.journeyId,
          user_id: input.userId,
          period: schedule.period,
          target_time: schedule.targetTime,
          window_start: schedule.windowStart,
          window_end: schedule.windowEnd,
        }))
      )
    );

  if (schedulesError) {
    await supabase
      .from('medications')
      .delete()
      .in('id', medications.map((medication) => medication.id));
    throw new Error(schedulesError.message);
  }

  return medications;
}

// ============================================================================
// Medication Schedules
// ============================================================================

export async function getSchedulesByJourney(
  journeyId: string
): Promise<MedicationSchedule[]> {
  const { data, error } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('journey_id', journeyId)
    .order('target_time', { ascending: true });

  if (error) {
    console.error('Failed to fetch schedules:', error);
    return [];
  }

  return data ?? [];
}

export async function getSchedulesByMedication(
  medicationId: string
): Promise<MedicationSchedule[]> {
  const { data, error } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('medication_id', medicationId)
    .order('target_time', { ascending: true });

  if (error) {
    console.error('Failed to fetch medication schedules:', error);
    return [];
  }

  return data ?? [];
}

// ============================================================================
// Journey Session Configs
// ============================================================================

export async function getSessionConfigsByJourney(
  journeyId: string
): Promise<JourneySessionConfig[]> {
  const { data, error } = await supabase
    .from('journey_session_configs')
    .select('*')
    .eq('journey_id', journeyId)
    .order('target_time', { ascending: true });

  if (error) {
    console.error('Failed to fetch session configs:', error);
    return [];
  }

  return data ?? [];
}

export async function saveSessionConfigTimes(
  config: JourneySessionConfig,
  times: {
    targetTime: string;
    windowStart: string;
    windowEnd: string;
  }
): Promise<JourneySessionConfig | null> {
  const payload = {
    journey_id: config.journey_id,
    schedule_id: config.schedule_id,
    user_id: config.user_id,
    period: config.period,
    target_time: times.targetTime,
    window_start: times.windowStart,
    window_end: times.windowEnd,
    reminder_offset_minutes: config.reminder_offset_minutes,
    escalation_intervals_minutes: config.escalation_intervals_minutes,
    max_escalation_level: config.max_escalation_level,
    completion_method: config.completion_method,
    ask_later_minutes: config.ask_later_minutes,
    sound_mode: config.sound_mode,
    prep_reminder_enabled: config.prep_reminder_enabled,
    prep_reminder_minutes: config.prep_reminder_minutes,
    carry_reminder_enabled: config.carry_reminder_enabled,
    preset: config.preset,
  };

  const query = config.id.startsWith('fallback-')
    ? supabase.from('journey_session_configs').insert(payload)
    : supabase.from('journey_session_configs').update(payload).eq('id', config.id);

  const { data, error } = await query.select('*').single<JourneySessionConfig>();

  if (error) {
    console.error('Failed to save session config times:', error);
    return null;
  }

  return data;
}

// ============================================================================
// Schedule Overrides
// ============================================================================

export async function getOverridesForDate(
  journeyId: string,
  date: string // YYYY-MM-DD
): Promise<ScheduleOverride[]> {
  const { data, error } = await supabase
    .from('schedule_overrides')
    .select('*')
    .eq('journey_id', journeyId)
    .lte('effective_date', date)
    .order('effective_date', { ascending: false });

  if (error) {
    console.error('Failed to fetch overrides:', error);
    return [];
  }

  return data ?? [];
}

// ============================================================================
// Dose Events
// ============================================================================

export async function getDoseEventsByDateRange(
  journeyId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<DoseEvent[]> {
  const startTimestamp = `${startDate}T00:00:00Z`;
  const endTimestamp = `${endDate}T23:59:59Z`;

  const { data, error } = await supabase
    .from('dose_events')
    .select('*')
    .eq('journey_id', journeyId)
    .gte('scheduled_for', startTimestamp)
    .lte('scheduled_for', endTimestamp)
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('Failed to fetch dose events:', error);
    return [];
  }

  return data ?? [];
}

export async function getDoseEventsForDate(
  journeyId: string,
  date: string // YYYY-MM-DD
): Promise<DoseEvent[]> {
  return getDoseEventsByDateRange(journeyId, date, date);
}

export async function createDoseEvent(
  event: Omit<DoseEvent, 'id' | 'created_at'>
): Promise<DoseEvent | null> {
  const { data, error } = await supabase
    .from('dose_events')
    .insert(event)
    .select()
    .single();

  if (error) {
    console.error('Failed to create dose event:', error);
    return null;
  }

  return data;
}

export async function updateDoseEvent(
  id: string,
  updates: {
    action_taken_at?: string;
    status?: DoseEventStatus;
    photo_uri?: string;
  }
): Promise<DoseEvent | null> {
  const { data, error } = await supabase
    .from('dose_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update dose event:', error);
    return null;
  }

  return data;
}

// ============================================================================
// Notification Schedules
// ============================================================================

export async function getNotificationSchedules(
  journeyId: string
): Promise<NotificationSchedule[]> {
  const { data, error } = await supabase
    .from('notification_schedules')
    .select('*')
    .eq('journey_id', journeyId)
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('Failed to fetch notification schedules:', error);
    return [];
  }

  return data ?? [];
}

export async function createNotificationSchedule(
  schedule: Omit<NotificationSchedule, 'id' | 'created_at'>
): Promise<NotificationSchedule | null> {
  const { data, error } = await supabase
    .from('notification_schedules')
    .insert(schedule)
    .select()
    .single();

  if (error) {
    console.error('Failed to create notification schedule:', error);
    return null;
  }

  return data;
}

export async function deleteNotificationSchedules(
  journeyId: string,
  scheduleId?: string
): Promise<boolean> {
  let query = supabase
    .from('notification_schedules')
    .delete()
    .eq('journey_id', journeyId);

  if (scheduleId) {
    query = query.eq('schedule_id', scheduleId);
  }

  const { error } = await query;

  if (error) {
    console.error('Failed to delete notification schedules:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Helper: Get current user ID
// ============================================================================

export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }

  return data ?? null;
}
