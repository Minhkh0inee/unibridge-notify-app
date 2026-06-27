import { supabase } from '@/lib/supabase';
import type { JourneyConfig } from '@/types/database.types';

export const journeysService = {
  async getAll(): Promise<JourneyConfig[]> {
    const { data, error } = await supabase
      .from('journey_configs')
      .select('*')
      .order('is_preset', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(config: Omit<JourneyConfig, 'id' | 'created_at'>): Promise<JourneyConfig> {
    const { data, error } = await supabase
      .from('journey_configs')
      .insert(config)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<JourneyConfig>): Promise<void> {
    const { error } = await supabase
      .from('journey_configs')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { data: schedules } = await supabase
      .from('medication_schedules')
      .select('id')
      .eq('journey_config_id', id)
      .limit(1);

    if (schedules && schedules.length > 0) {
      throw new Error('Không thể xoá cấu hình đang được sử dụng');
    }

    const { error } = await supabase
      .from('journey_configs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
