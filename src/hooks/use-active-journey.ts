import { useEffect, useState } from 'react';

import { seedIfNeeded } from '@/data/seed';
import { getActiveJourney, getWeeklyLogs } from '@/data/storage';
import type { DoseLog, Journey } from '@/data/types';

export function useActiveJourney() {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      await seedIfNeeded();
      const [activeJourney, weeklyLogs] = await Promise.all([getActiveJourney(), getWeeklyLogs()]);
      if (!mounted) return;
      setJourney(activeJourney);
      setLogs(weeklyLogs);
      setLoading(false);
    }

    load().catch((error) => {
      console.error(error);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      await seedIfNeeded();
      const [activeJourney, weeklyLogs] = await Promise.all([
        getActiveJourney(),
        getWeeklyLogs(),
      ]);
      setJourney(activeJourney);
      setLogs(weeklyLogs);
    } finally {
      setLoading(false);
    }
  }

  return { journey, logs, loading, refresh };
}
