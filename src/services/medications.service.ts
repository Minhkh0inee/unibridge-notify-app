import { supabase } from '@/lib/supabase';
import type { Medication } from '@/types/database.types';

export const medicationsService = {
  async getAll(): Promise<Medication[]> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Medication | null> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },
};
