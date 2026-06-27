import React, { createContext, useContext, useEffect, useState } from 'react';
import { schedulesService } from '@/services/schedules.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { MedicationSchedule } from '@/types/database.types';

interface SchedulesContextValue {
  schedules: MedicationSchedule[];
  isLoading: boolean;
  error: Error | null;
  getSchedulesForDate: (date: Date) => MedicationSchedule[];
  updateScheduleJourney: (scheduleId: string, journeyConfigId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const SchedulesContext = createContext<SchedulesContextValue | undefined>(undefined);

export function SchedulesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSchedules = async () => {
    if (!user) {
      setSchedules([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await schedulesService.getAll();
      setSchedules(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();

    if (!user) return;

    const channel = supabase
      .channel('schedules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medication_schedules',
        },
        () => {
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const getSchedulesForDate = (date: Date): MedicationSchedule[] => {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    return schedules.filter(schedule => {
      const activeFrom = schedule.active_from;
      const activeUntil = schedule.active_until;

      if (dateStr < activeFrom) return false;
      if (activeUntil && dateStr > activeUntil) return false;

      return schedule.days_of_week.includes(dayOfWeek);
    });
  };

  const updateScheduleJourney = async (scheduleId: string, journeyConfigId: string) => {
    await schedulesService.updateJourneyConfig(scheduleId, journeyConfigId);
    await fetchSchedules();
  };

  return (
    <SchedulesContext.Provider
      value={{
        schedules,
        isLoading,
        error,
        getSchedulesForDate,
        updateScheduleJourney,
        refetch: fetchSchedules
      }}
    >
      {children}
    </SchedulesContext.Provider>
  );
}

export function useSchedules() {
  const context = useContext(SchedulesContext);
  if (context === undefined) {
    throw new Error('useSchedules must be used within a SchedulesProvider');
  }
  return context;
}
