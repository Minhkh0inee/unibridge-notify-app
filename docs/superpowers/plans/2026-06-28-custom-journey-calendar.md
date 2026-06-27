# Custom Journey and Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a calendar view showing medication schedules by session, with customizable notification journey configurations (escalation, confirmation methods, timing).

**Architecture:** Session-based data model with Supabase backend. Medications link to schedules (morning/noon/afternoon/evening/bedtime sessions), each schedule references a journey config (preset or custom). React Context provides state management with real-time subscriptions. UI layers: CalendarGrid → DailyAgenda → SessionCard → Journey Editor.

**Tech Stack:** Expo SDK 56, React Native, TypeScript, Supabase (PostgreSQL + real-time), expo-router, React Context

## Global Constraints

- Expo SDK version: 56.x
- React: 19.2.3
- React Native: 0.85.3
- TypeScript: 6.0.3
- All database times stored as local time (time type, not timestamptz)
- Vietnamese language for user-facing strings
- Minimum touch target: 44x44px
- Font sizes: 16px minimum for body text, 18-22px for important info
- Follow existing theme system in `src/constants/theme.ts`
- Use path alias `@/*` for `src/*` imports
- Follow PRD tone: supportive, not judgmental

---

## Task 1: Install Dependencies and Setup Supabase Client

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Create: `src/lib/supabase.ts`

**Interfaces:**
- Consumes: None
- Produces: `supabase` client instance exported from `src/lib/supabase.ts`

- [ ] **Step 1: Install Supabase dependencies**

Run:
```bash
npm install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

Expected: Dependencies added to package.json

- [ ] **Step 2: Create environment variable template**

Create `.env.example`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Create Supabase client singleton**

Create `src/lib/supabase.ts`:
```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/supabase.ts
git commit -m "feat: add Supabase client setup

Install @supabase/supabase-js and configure client singleton
with AsyncStorage for auth persistence.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Interfaces:**
- Consumes: Supabase project URL (manual setup required)
- Produces: Three tables (`medications`, `journey_configs`, `medication_schedules`) with RLS policies

- [ ] **Step 1: Create migrations directory**

Run:
```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write database migration SQL**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- medications table
CREATE TABLE medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  active_ingredient text,
  strength text,
  form text,
  dosage_amount numeric NOT NULL,
  dosage_unit text NOT NULL,
  food_instruction text,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  source_type text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'completed')),
  CONSTRAINT valid_source CHECK (source_type IN ('manual', 'ocr')),
  CONSTRAINT valid_food CHECK (food_instruction IS NULL OR food_instruction IN ('before', 'after', 'during')),
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_medications_user_id ON medications(user_id);
CREATE INDEX idx_medications_status ON medications(status);

-- journey_configs table
CREATE TABLE journey_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  preset_type text,
  reminder_offset_minutes integer NOT NULL DEFAULT 0,
  escalation_intervals jsonb NOT NULL DEFAULT '[]',
  confirmation_method text NOT NULL DEFAULT 'button',
  snooze_duration_minutes integer NOT NULL DEFAULT 10,
  sound_mode text NOT NULL DEFAULT 'soft',
  max_reminders integer,
  is_preset boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_preset CHECK (preset_type IS NULL OR preset_type IN ('gentle', 'balanced', 'decisive')),
  CONSTRAINT valid_confirmation CHECK (confirmation_method IN ('button', 'photo', 'photo_required')),
  CONSTRAINT valid_sound CHECK (sound_mode IN ('silent', 'vibrate', 'soft', 'escalating')),
  CONSTRAINT valid_offset CHECK (reminder_offset_minutes >= 0),
  CONSTRAINT valid_snooze CHECK (snooze_duration_minutes > 0)
);

CREATE INDEX idx_journey_configs_user_id ON journey_configs(user_id);
CREATE INDEX idx_journey_configs_preset ON journey_configs(is_preset);

-- medication_schedules table
CREATE TABLE medication_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  session_name text NOT NULL,
  target_time time NOT NULL,
  valid_window_start time NOT NULL,
  valid_window_end time NOT NULL,
  days_of_week jsonb NOT NULL DEFAULT '[1,2,3,4,5,6,7]',
  journey_config_id uuid NOT NULL REFERENCES journey_configs(id),
  active_from date NOT NULL,
  active_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_session CHECK (session_name IN ('morning', 'noon', 'afternoon', 'evening', 'bedtime')),
  CONSTRAINT valid_window CHECK (valid_window_end > valid_window_start),
  CONSTRAINT valid_active_dates CHECK (active_until IS NULL OR active_until >= active_from)
);

CREATE INDEX idx_schedules_medication_id ON medication_schedules(medication_id);
CREATE INDEX idx_schedules_journey_config_id ON medication_schedules(journey_config_id);
CREATE INDEX idx_schedules_session ON medication_schedules(session_name);
CREATE INDEX idx_schedules_dates ON medication_schedules(active_from, active_until);

-- Enable RLS
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medications
CREATE POLICY "Users can view their own medications"
  ON medications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medications"
  ON medications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medications"
  ON medications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medications"
  ON medications FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for journey_configs
CREATE POLICY "Users can view their own configs and presets"
  ON journey_configs FOR SELECT
  USING (auth.uid() = user_id OR is_preset = true);

CREATE POLICY "Users can insert their own configs"
  ON journey_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_preset = false);

CREATE POLICY "Users can update their own configs"
  ON journey_configs FOR UPDATE
  USING (auth.uid() = user_id AND is_preset = false);

CREATE POLICY "Users can delete their own configs"
  ON journey_configs FOR DELETE
  USING (auth.uid() = user_id AND is_preset = false);

-- RLS Policies for medication_schedules
CREATE POLICY "Users can view schedules for their medications"
  ON medication_schedules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM medications
    WHERE medications.id = medication_schedules.medication_id
    AND medications.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert schedules for their medications"
  ON medication_schedules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM medications
    WHERE medications.id = medication_schedules.medication_id
    AND medications.user_id = auth.uid()
  ));

CREATE POLICY "Users can update schedules for their medications"
  ON medication_schedules FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM medications
    WHERE medications.id = medication_schedules.medication_id
    AND medications.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete schedules for their medications"
  ON medication_schedules FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM medications
    WHERE medications.id = medication_schedules.medication_id
    AND medications.user_id = auth.uid()
  ));

-- Seed journey presets
INSERT INTO journey_configs (id, user_id, name, preset_type, reminder_offset_minutes, escalation_intervals, confirmation_method, sound_mode, max_reminders, is_preset)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'Nhẹ nhàng',
    'gentle',
    0,
    '[15]'::jsonb,
    'button',
    'soft',
    2,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    NULL,
    'Cân bằng',
    'balanced',
    0,
    '[10, 5]'::jsonb,
    'photo',
    'soft',
    3,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    NULL,
    'Quyết liệt',
    'decisive',
    0,
    '[10, 5, 3, 3, 3]'::jsonb,
    'photo_required',
    'escalating',
    NULL,
    true
  );
```

- [ ] **Step 3: Apply migration to Supabase**

Manual step: Go to Supabase Dashboard → SQL Editor → paste the migration SQL → Run

Expected: Tables created, policies enabled, presets seeded

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add database schema for Feature 4

Create medications, journey_configs, and medication_schedules tables
with RLS policies and journey presets.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Define TypeScript Types

**Files:**
- Create: `src/types/database.types.ts`

**Interfaces:**
- Consumes: None
- Produces: Type definitions matching database schema

- [ ] **Step 1: Create types file**

Create `src/types/database.types.ts`:
```typescript
export type SessionName = 'morning' | 'noon' | 'afternoon' | 'evening' | 'bedtime';
export type MedicationStatus = 'active' | 'paused' | 'completed';
export type SourceType = 'manual' | 'ocr';
export type FoodInstruction = 'before' | 'after' | 'during' | null;
export type PresetType = 'gentle' | 'balanced' | 'decisive' | null;
export type ConfirmationMethod = 'button' | 'photo' | 'photo_required';
export type SoundMode = 'silent' | 'vibrate' | 'soft' | 'escalating';

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  active_ingredient?: string;
  strength?: string;
  form?: string;
  dosage_amount: number;
  dosage_unit: string;
  food_instruction?: FoodInstruction;
  start_date: string;
  end_date?: string;
  status: MedicationStatus;
  source_type: SourceType;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface JourneyConfig {
  id: string;
  user_id?: string;
  name: string;
  preset_type?: PresetType;
  reminder_offset_minutes: number;
  escalation_intervals: number[];
  confirmation_method: ConfirmationMethod;
  snooze_duration_minutes: number;
  sound_mode: SoundMode;
  max_reminders?: number;
  is_preset: boolean;
  created_at: string;
}

export interface MedicationSchedule {
  id: string;
  medication_id: string;
  session_name: SessionName;
  target_time: string;
  valid_window_start: string;
  valid_window_end: string;
  days_of_week: number[];
  journey_config_id: string;
  active_from: string;
  active_until?: string;
  created_at: string;
  updated_at: string;
  medication?: Medication;
  journey_config?: JourneyConfig;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/database.types.ts
git commit -m "feat: add TypeScript types for database models

Define Medication, JourneyConfig, and MedicationSchedule interfaces.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Build Service Layer - Medications

**Files:**
- Create: `src/services/medications.service.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`, `Medication` from `src/types/database.types.ts`
- Produces: `medicationsService` object with methods `getAll()`, `getById(id)`

- [ ] **Step 1: Create medications service**

Create `src/services/medications.service.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/services/medications.service.ts
git commit -m "feat: add medications service layer

Implement getAll and getById methods with Supabase queries.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Build Service Layer - Journey Configs

**Files:**
- Create: `src/services/journeys.service.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`, `JourneyConfig` from `src/types/database.types.ts`
- Produces: `journeysService` object with methods `getAll()`, `create(config)`, `update(id, updates)`, `delete(id)`

- [ ] **Step 1: Create journeys service**

Create `src/services/journeys.service.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/services/journeys.service.ts
git commit -m "feat: add journey configs service layer

Implement CRUD operations with in-use check for delete.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Build Service Layer - Schedules

**Files:**
- Create: `src/services/schedules.service.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`, `MedicationSchedule` from `src/types/database.types.ts`
- Produces: `schedulesService` object with methods `getAll()`, `updateJourneyConfig(scheduleId, journeyConfigId)`, `bulkUpdateJourneyConfig(scheduleIds, journeyConfigId)`

- [ ] **Step 1: Create schedules service**

Create `src/services/schedules.service.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/services/schedules.service.ts
git commit -m "feat: add schedules service layer

Implement query with joins and journey config update operations.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---


## Task 7: Create Auth Context

**Files:**
- Create: `src/contexts/AuthContext.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`
- Produces: `AuthContext` with `user` state, `session` state, `signInAnonymously()`, `signOut()`

- [ ] **Step 1: Create auth context file**

Create `src/contexts/AuthContext.tsx`:
```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAnonymously = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signInAnonymously, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat: add auth context with anonymous sign-in

Implement auth state management and session handling.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Summary

This plan implements Feature 4 (Custom Journey and Calendar) in 7 foundational tasks covering:
- Supabase setup and database schema
- TypeScript types and service layer
- Auth and data contexts with real-time subscriptions

**Next phase (UI components) will be added in a follow-up plan to keep task size manageable.**

**Current Status:** Ready for execution through Task 7. After completing these foundational tasks, we'll create a second plan for the UI layer (calendar components, screens, navigation).

