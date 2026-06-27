# Custom Journey and Calendar Implementation Plan - Phase 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build UI layer for calendar view, daily agenda, session management, and journey configuration screens.

**Architecture:** React Native components using existing theme system. State managed via Context hooks from Phase 1. Calendar displays schedules grouped by sessions, with bottom sheets for journey editing.

**Tech Stack:** Expo SDK 56, React Native, TypeScript, expo-router, React Context (from Phase 1)

**Prerequisites:** Phase 1 must be complete (database, services, auth context implemented).

## Global Constraints

- Expo SDK version: 56.x
- React: 19.2.3
- React Native: 0.85.3
- TypeScript: 6.0.3
- Vietnamese language for user-facing strings
- Minimum touch target: 44x44px
- Font sizes: 16px minimum for body text, 18-22px for important info
- Follow existing theme system in `src/constants/theme.ts`
- Use path alias `@/*` for `src/*` imports
- Follow PRD tone: supportive, not judgmental

---

## Task 1: Create Medications Context

**Files:**
- Create: `src/contexts/MedicationsContext.tsx`

**Interfaces:**
- Consumes: `medicationsService` from `src/services/medications.service.ts`, `useAuth()` from `src/contexts/AuthContext.tsx`, `supabase` from `src/lib/supabase.ts`
- Produces: `MedicationsContext` with `medications: Medication[]`, `isLoading: boolean`, `error: Error | null`, `refetch: () => Promise<void>`

- [ ] **Step 1: Create medications context file**

Create `src/contexts/MedicationsContext.tsx`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/MedicationsContext.tsx
git commit -m "feat: add medications context with real-time sync

Implement medications state management and Supabase real-time subscriptions.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create Schedules Context

**Files:**
- Create: `src/contexts/SchedulesContext.tsx`

**Interfaces:**
- Consumes: `schedulesService` from `src/services/schedules.service.ts`, `useAuth()` from `src/contexts/AuthContext.tsx`, `supabase` from `src/lib/supabase.ts`
- Produces: `SchedulesContext` with `schedules: MedicationSchedule[]`, `isLoading: boolean`, `error: Error | null`, `getSchedulesForDate(date: Date): MedicationSchedule[]`, `updateScheduleJourney(scheduleId: string, journeyConfigId: string): Promise<void>`, `refetch: () => Promise<void>`

- [ ] **Step 1: Create schedules context file**

Create `src/contexts/SchedulesContext.tsx`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/SchedulesContext.tsx
git commit -m "feat: add schedules context with date filtering

Implement schedules state with getSchedulesForDate helper.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Create Journey Configs Context

**Files:**
- Create: `src/contexts/JourneyConfigsContext.tsx`

**Interfaces:**
- Consumes: `journeysService` from `src/services/journeys.service.ts`, `useAuth()` from `src/contexts/AuthContext.tsx`, `supabase` from `src/lib/supabase.ts`
- Produces: `JourneyConfigsContext` with `journeyConfigs: JourneyConfig[]`, `presets: JourneyConfig[]`, `customConfigs: JourneyConfig[]`, `isLoading: boolean`, `error: Error | null`, `createConfig()`, `updateConfig()`, `deleteConfig()`, `refetch()`

- [ ] **Step 1: Create journey configs context file**

Create `src/contexts/JourneyConfigsContext.tsx`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/JourneyConfigsContext.tsx
git commit -m "feat: add journey configs context with CRUD ops

Implement journey configs state with presets/custom separation.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Wrap App with Context Providers

**Files:**
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: All context providers from Tasks 1-3
- Produces: App wrapped with AuthProvider → MedicationsProvider → SchedulesProvider → JourneyConfigsProvider

- [ ] **Step 1: Update root layout to include providers**

Modify `src/app/_layout.tsx`:
```typescript
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider } from '@/contexts/AuthContext';
import { MedicationsProvider } from '@/contexts/MedicationsContext';
import { SchedulesProvider } from '@/contexts/SchedulesContext';
import { JourneyConfigsProvider } from '@/contexts/JourneyConfigsContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <MedicationsProvider>
          <SchedulesProvider>
            <JourneyConfigsProvider>
              <AnimatedSplashOverlay />
              <AppTabs />
            </JourneyConfigsProvider>
          </SchedulesProvider>
        </MedicationsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "feat: wrap app with context providers

Add auth, medications, schedules, and journey configs providers.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Summary

**Phase 2 Progress:** Tasks 1-4 complete the state management layer. Next tasks (5+) will build UI components.

**Remaining for Phase 2:**
- Calendar UI components (CalendarGrid, DayCell, SessionCard, etc.)
- Calendar screen
- Journey editor screen
- Navigation integration

**Note:** Due to plan size, Phase 2 will be split into two parts:
- **Phase 2A** (this plan): State management contexts and provider setup
- **Phase 2B** (next plan): UI components, screens, and navigation

