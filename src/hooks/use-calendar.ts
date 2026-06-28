import { useEffect, useState } from 'react';

import type { CalendarDay, DayAgenda } from '@/data/types';
import { ensureAnonymousSession } from '@/lib/auth';
import {
  getActiveJourneys,
  ensureDemoJourneyForCurrentUser,
  getMedicationsByJourney,
  getSchedulesByJourney,
  getSessionConfigsByJourney,
  getDoseEventsByDateRange,
} from '@/data/supabase-storage';
import { generateCalendarMonth, generateDayAgenda } from '@/data/calendar';

interface UseCalendarResult {
  month: CalendarDay[];
  agenda: DayAgenda | null;
  selectedDate: string;
  loading: boolean;
  error: string | null;
  setSelectedDate: (date: string) => void;
  goToNextMonth: () => void;
  goToPrevMonth: () => void;
  refresh: () => Promise<void>;
}

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

export function useCalendar(initialDate?: string): UseCalendarResult {
  const [selectedDate, setSelectedDate] = useState(
    initialDate ?? toDateKey(new Date())
  );
  const [month, setMonth] = useState<CalendarDay[]>([]);
  const [agenda, setAgenda] = useState<DayAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentDate = parseDateKey(selectedDate);
  const year = currentDate.getFullYear();
  const monthNum = currentDate.getMonth() + 1; // 1-12

  async function loadCalendarData() {
    setLoading(true);
    setError(null);

    try {
      const session = await ensureAnonymousSession();
      if (!session.success || !session.userId) {
        throw new Error(session.error ?? 'Không thể tạo phiên người dùng.');
      }

      await ensureDemoJourneyForCurrentUser(session.userId);

      // Get active journey
      const journeys = await getActiveJourneys();
      if (journeys.length === 0) {
        setMonth([]);
        setAgenda(null);
        setLoading(false);
        return;
      }

      const journey = journeys[0];

      // Fetch all data for the month
      const firstDay = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const lastDay = `${year}-${String(monthNum).padStart(2, '0')}-${new Date(year, monthNum, 0).getDate()}`;

      const [medications, schedules, sessionConfigs, doseEvents] = await Promise.all([
        getMedicationsByJourney(journey.id),
        getSchedulesByJourney(journey.id),
        getSessionConfigsByJourney(journey.id),
        getDoseEventsByDateRange(journey.id, firstDay, lastDay),
      ]);

      // Generate calendar month
      const calendarDays = generateCalendarMonth(year, monthNum, schedules, doseEvents);
      setMonth(calendarDays);

      // Generate agenda for selected date
      const dayAgenda = generateDayAgenda(
        selectedDate,
        medications,
        schedules,
        sessionConfigs,
        doseEvents
      );
      setAgenda(dayAgenda);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalendarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  function goToNextMonth() {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setSelectedDate(toDateKey(next));
  }

  function goToPrevMonth() {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setSelectedDate(toDateKey(prev));
  }

  async function refresh() {
    await loadCalendarData();
  }

  return {
    month,
    agenda,
    selectedDate,
    loading,
    error,
    setSelectedDate,
    goToNextMonth,
    goToPrevMonth,
    refresh,
  };
}
