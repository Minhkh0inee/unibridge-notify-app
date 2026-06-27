import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { journeysService } from '@/services/journeys.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { JourneyConfig } from '@/types/database.types';

interface JourneyConfigsContextValue {
  journeyConfigs: JourneyConfig[];
  presets: JourneyConfig[];
  customConfigs: JourneyConfig[];
  isLoading: boolean;
  error: Error | null;
  createConfig: (config: Omit<JourneyConfig, 'id' | 'created_at'>) => Promise<JourneyConfig>;
  updateConfig: (id: string, updates: Partial<JourneyConfig>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const JourneyConfigsContext = createContext<JourneyConfigsContextValue | undefined>(undefined);

export function JourneyConfigsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [journeyConfigs, setJourneyConfigs] = useState<JourneyConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const presets = useMemo(() => journeyConfigs.filter(c => c.is_preset), [journeyConfigs]);
  const customConfigs = useMemo(() => journeyConfigs.filter(c => !c.is_preset), [journeyConfigs]);

  const fetchConfigs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await journeysService.getAll();
      setJourneyConfigs(data);
    } catch (err) {
      console.error('JourneyConfigsContext fetchConfigs error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();

    if (!user) return;

    const channel = supabase
      .channel('journey-configs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journey_configs',
        },
        () => {
          fetchConfigs();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const createConfig = async (config: Omit<JourneyConfig, 'id' | 'created_at'>) => {
    const newConfig = await journeysService.create(config);
    await fetchConfigs();
    return newConfig;
  };

  const updateConfig = async (id: string, updates: Partial<JourneyConfig>) => {
    await journeysService.update(id, updates);
    await fetchConfigs();
  };

  const deleteConfig = async (id: string) => {
    await journeysService.delete(id);
    await fetchConfigs();
  };

  return (
    <JourneyConfigsContext.Provider
      value={{
        journeyConfigs,
        presets,
        customConfigs,
        isLoading,
        error,
        createConfig,
        updateConfig,
        deleteConfig,
        refetch: fetchConfigs
      }}
    >
      {children}
    </JourneyConfigsContext.Provider>
  );
}

export function useJourneyConfigs() {
  const context = useContext(JourneyConfigsContext);
  if (context === undefined) {
    throw new Error('useJourneyConfigs must be used within a JourneyConfigsProvider');
  }
  return context;
}
