import React, { createContext, useContext, useEffect, useState } from 'react';
import { medicationsService } from '@/services/medications.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Medication } from '@/types/database.types';

interface MedicationsContextValue {
  medications: Medication[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const MedicationsContext = createContext<MedicationsContextValue | undefined>(undefined);

export function MedicationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMedications = async () => {
    if (!user) {
      setMedications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await medicationsService.getAll();
      setMedications(data);
    } catch (err) {
      console.error('MedicationsContext fetchMedications error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();

    if (!user) return;

    const channel = supabase
      .channel('medications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchMedications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return (
    <MedicationsContext.Provider value={{ medications, isLoading, error, refetch: fetchMedications }}>
      {children}
    </MedicationsContext.Provider>
  );
}

export function useMedications() {
  const context = useContext(MedicationsContext);
  if (context === undefined) {
    throw new Error('useMedications must be used within a MedicationsProvider');
  }
  return context;
}
