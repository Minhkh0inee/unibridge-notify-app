import { useEffect, useState } from 'react';
import { supabase, type Database } from '@/lib/supabase';

type Medication = Database['public']['Tables']['medications']['Row'];
type MedicationSchedule = Database['public']['Tables']['medication_schedules']['Row'];
type JourneyConfig = Database['public']['Tables']['journey_configs']['Row'];

export type MedicationWithSchedules = Medication & {
  schedules: (MedicationSchedule & { journey_config: JourneyConfig })[];
};

export function useMedications() {
  const [medications, setMedications] = useState<MedicationWithSchedules[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMedications();
  }, []);

  async function fetchMedications() {
    try {
      setLoading(true);
      setError(null);

      const { data: medsData, error: medsError } = await supabase
        .from('medications')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (medsError) throw medsError;

      if (!medsData || medsData.length === 0) {
        setMedications([]);
        return;
      }

      // Fetch schedules for these medications
      const medicationIds = medsData.map((m) => m.id);
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('medication_schedules')
        .select('*, journey_config:journey_configs(*)')
        .in('medication_id', medicationIds);

      if (schedulesError) throw schedulesError;

      // Combine medications with their schedules
      const medicationsWithSchedules = medsData.map((med) => ({
        ...med,
        schedules: (schedulesData || [])
          .filter((s) => s.medication_id === med.id)
          .map((s) => ({
            ...s,
            journey_config: Array.isArray(s.journey_config) ? s.journey_config[0] : s.journey_config,
          })),
      }));

      setMedications(medicationsWithSchedules);
    } catch (err) {
      console.error('Error fetching medications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return { medications, loading, error, refetch: fetchMedications };
}
