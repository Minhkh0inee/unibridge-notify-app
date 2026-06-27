import { supabase } from '@/lib/supabase';
import type { MedicationSchedule } from '@/types/database.types';

export const schedulesService = {
  async getAll(): Promise<MedicationSchedule[]> {
    const { data, error } = await supabase
      .from('medication_schedules')
      .select(`
        *,
        medication:medications(*),
        journey_config:journey_configs(*)
      `);

    if (error) throw error;
    return data || [];
  },

  async updateJourneyConfig(scheduleId: string, journeyConfigId: string): Promise<void> {
    const { error } = await supabase
      .from('medication_schedules')
      .update({
        journey_config_id: journeyConfigId,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId);

    if (error) throw error;
  },

  async bulkUpdateJourneyConfig(scheduleIds: string[], journeyConfigId: string): Promise<void> {
    const { error } = await supabase
      .from('medication_schedules')
      .update({
        journey_config_id: journeyConfigId,
        updated_at: new Date().toISOString()
      })
      .in('id', scheduleIds);

    if (error) throw error;
  },
};
