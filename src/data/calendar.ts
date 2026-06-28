import type {
  Period,
  DayDoseStatus,
  CalendarDay,
  AgendaSession,
  DayAgenda,
  MedicationEntity,
  MedicationSchedule,
  JourneySessionConfig,
  DoseEvent,
} from './types';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function makeFallbackConfig(period: Period, schedule: MedicationSchedule): JourneySessionConfig {
  return {
    id: `fallback-${period}`,
    journey_id: schedule.journey_id,
    schedule_id: period === 'bedtime' ? null : schedule.id,
    user_id: schedule.user_id,
    period,
    target_time: period === 'bedtime' ? '22:30:00' : schedule.target_time,
    window_start: period === 'bedtime' ? '21:00:00' : schedule.window_start,
    window_end: period === 'bedtime' ? '23:59:00' : schedule.window_end,
    reminder_offset_minutes: 0,
    escalation_intervals_minutes: period === 'bedtime' ? [] : [15, 10, 5],
    max_escalation_level: 'medium',
    completion_method: 'tap_taken',
    ask_later_minutes: 10,
    sound_mode: 'gentle_sound',
    prep_reminder_enabled: false,
    prep_reminder_minutes: null,
    carry_reminder_enabled: period === 'bedtime',
    preset: 'balanced',
    created_at: '',
    updated_at: '',
  };
}

/**
 * Compute calendar day status from dose events
 */
export function computeDayStatus(
  totalDoses: number,
  takenDoses: number,
  lateDoses: number,
  missedDoses: number,
  isFuture: boolean,
  isPast: boolean,
  eventCount: number
): DayDoseStatus {
  if (totalDoses === 0) return 'none';
  if (isFuture) return 'future';

  // If we have explicit missed events in the database, show as missed
  if (missedDoses > 0) return 'missed';

  // If we have explicit late events, show as late
  if (lateDoses > 0) return 'late';

  // All scheduled doses were taken
  if (takenDoses === totalDoses) return 'complete';

  // Some doses taken, others not
  if (takenDoses > 0) return 'partial';

  // No events recorded for this past day - could mean not tracked yet
  // Show as 'none' to indicate no data rather than assuming missed
  if (eventCount === 0) {
    return 'none';
  }

  // Some events exist but not complete
  return 'partial';
}

/**
 * Generate calendar days for a month with dose status
 */
export function generateCalendarMonth(
  year: number,
  month: number, // 1-12
  schedules: MedicationSchedule[],
  doseEvents: DoseEvent[]
): CalendarDay[] {
  const days: CalendarDay[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayKey = toDateKey(new Date());

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayDate = parseDateKey(date);
    const isFuture = date > todayKey;
    const isPast = date < todayKey;

    // Count scheduled doses for this day
    const dayOfWeek = dayDate.getDay(); // 0 = Sunday
    const scheduledForDay = schedules.filter(
      (s) =>
        !s.days_of_week || s.days_of_week.length === 0 || s.days_of_week.includes(dayOfWeek)
    );
    const totalDoses = scheduledForDay.length;

    // Count actual events
    const eventsForDay = doseEvents.filter((e) => e.scheduled_for.startsWith(date));
    const takenDoses = eventsForDay.filter((e) => e.status === 'taken').length;
    const lateDoses = eventsForDay.filter((e) => e.status === 'late').length;
    const missedDoses = eventsForDay.filter((e) => e.status === 'missed').length;

    const status = computeDayStatus(
      totalDoses,
      takenDoses,
      lateDoses,
      missedDoses,
      isFuture,
      isPast,
      eventsForDay.length
    );

    days.push({
      date,
      status,
      totalDoses,
      takenDoses,
      lateDoses,
      missedDoses,
    });
  }

  return days;
}

/**
 * Generate agenda for a specific date
 */
export function generateDayAgenda(
  date: string, // YYYY-MM-DD
  medications: MedicationEntity[],
  schedules: MedicationSchedule[],
  sessionConfigs: JourneySessionConfig[],
  doseEvents: DoseEvent[]
): DayAgenda {
  // Group schedules by period
  const schedulesByPeriod = new Map<Period, MedicationSchedule[]>();

  const dateObj = parseDateKey(date);
  const dayOfWeek = dateObj.getDay();
  const tomorrow = addDays(dateObj, 1);
  const tomorrowDayOfWeek = tomorrow.getDay();

  schedules.forEach((schedule) => {
    // Check if schedule applies to this day of week
    if (
      schedule.days_of_week &&
      schedule.days_of_week.length > 0 &&
      !schedule.days_of_week.includes(dayOfWeek)
    ) {
      return; // Skip this schedule for this day
    }

    const existing = schedulesByPeriod.get(schedule.period) ?? [];
    existing.push(schedule);
    schedulesByPeriod.set(schedule.period, existing);
  });

  // Build sessions
  const sessions: AgendaSession[] = [];
  const periods: Period[] = ['morning', 'noon', 'afternoon', 'evening'];

  periods.forEach((period) => {
    const periodSchedules = schedulesByPeriod.get(period);
    if (!periodSchedules || periodSchedules.length === 0) return;

    // Find session config for this period. If config sync is missing, fall back to
    // the first schedule so medications still appear in the agenda.
    const config: JourneySessionConfig =
      sessionConfigs.find((c) => c.period === period) ??
      makeFallbackConfig(period, periodSchedules[0]);

    // Get medications for this period
    const periodMedications = periodSchedules
      .map((schedule) => {
        const med = medications.find((m) => m.id === schedule.medication_id);
        if (!med) return null;
        return {
          id: med.id,
          name: med.name,
          dosage: med.dosage,
          instructions: med.instructions,
          iconUrl: med.icon_url,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    // Determine session status from dose events
    const sessionEvents = doseEvents.filter((e) => {
      const eventDate = e.scheduled_for.split('T')[0];
      if (eventDate !== date) return false;

      // Match by period schedule IDs
      return periodSchedules.some((s) => s.id === e.schedule_id);
    });

    let status: DoseEvent['status'] = 'pending';
    if (sessionEvents.length > 0) {
      const allTaken = sessionEvents.every((e) => e.status === 'taken');
      const anyLate = sessionEvents.some((e) => e.status === 'late');
      const anyMissed = sessionEvents.some((e) => e.status === 'missed');

      if (allTaken) status = 'taken';
      else if (anyMissed) status = 'missed';
      else if (anyLate) status = 'late';
      else if (sessionEvents.length < periodSchedules.length) {
        // Some medications recorded, others not - show as partial (pending)
        status = 'pending';
      }
    }
    // No events recorded - keep as pending instead of assuming missed

    sessions.push({
      period,
      targetTime: config.target_time.substring(0, 5), // HH:MM:SS -> HH:MM
      windowStart: config.window_start.substring(0, 5),
      windowEnd: config.window_end.substring(0, 5),
      medications: periodMedications,
      status,
      config,
    });
  });

  const tomorrowSchedules = schedules.filter(
    (schedule) =>
      !schedule.days_of_week ||
      schedule.days_of_week.length === 0 ||
      schedule.days_of_week.includes(tomorrowDayOfWeek)
  );

  if (tomorrowSchedules.length > 0) {
    const firstSchedule = tomorrowSchedules[0];
    const config =
      sessionConfigs.find((item) => item.period === 'bedtime') ??
      makeFallbackConfig('bedtime', firstSchedule);
    const bringMedications = new Map<
      string,
      { id: string; name: string; dosage: string; instructions: string | null; iconUrl: string | null }
    >();

    tomorrowSchedules.forEach((schedule) => {
      const med = medications.find((item) => item.id === schedule.medication_id);
      if (!med || bringMedications.has(med.id)) return;

      bringMedications.set(med.id, {
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        instructions: med.instructions,
        iconUrl: med.icon_url,
      });
    });

    if (bringMedications.size > 0) {
      sessions.push({
        period: 'bedtime',
        targetTime: config.target_time.substring(0, 5),
        windowStart: config.window_start.substring(0, 5),
        windowEnd: config.window_end.substring(0, 5),
        medications: Array.from(bringMedications.values()),
        status: 'pending',
        config,
      });
    }
  }

  return {
    date,
    sessions: sessions.sort((a, b) => a.targetTime.localeCompare(b.targetTime)),
  };
}

/**
 * Get Vietnamese period label
 */
export function getPeriodLabel(period: Period): string {
  const labels: Record<Period, string> = {
    morning: 'Sáng',
    noon: 'Trưa',
    afternoon: 'Chiều',
    evening: 'Tối',
    bedtime: 'Trước khi ngủ',
  };
  return labels[period];
}

/**
 * Format time HH:MM to readable Vietnamese format
 */
export function formatTime(time: string): string {
  return time; // Could add "giờ" suffix if needed
}
