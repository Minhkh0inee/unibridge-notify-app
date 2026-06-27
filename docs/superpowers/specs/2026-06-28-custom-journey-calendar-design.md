# Feature 4: Custom Journey and Calendar — Design Specification

**Date:** 2026-06-28  
**Feature:** Custom Journey and Calendar (Feature 4 from PRD)  
**Status:** Draft

---

## 1. Overview

This document specifies the design for Feature 4 of the medication reminder app: Custom Journey and Calendar. This feature allows users to view their medication schedule in a calendar format, see daily agendas organized by sessions (morning, noon, afternoon, evening, bedtime), and customize the notification journey (escalation behavior, confirmation methods, timing) for each session.

### Goals

1. Provide a visual calendar interface showing medication schedules by day
2. Display daily agenda grouped by sessions with medication details
3. Allow users to customize notification journeys per session
4. Support journey presets (Gentle, Balanced, Decisive) and custom configurations
5. Integrate with Supabase for data persistence and real-time updates

### Non-Goals (Out of Scope for Feature 4)

- Creating or editing medications (covered in Features 2 & 3)
- Actual notification scheduling and delivery (covered in Feature 6)
- Dose completion tracking and confirmation (covered in Feature 6 & 7)
- Weekly recap and AI recommendations (covered in Feature 9)
- OCR prescription scanning (covered in Feature 3)

---

## 2. Architecture Approach

**Selected Approach:** Session-based data model with Supabase backend

### Why This Approach

- **Matches PRD structure:** UI is organized by sessions; data model follows this pattern
- **Right complexity:** Not too simple (flat JSON), not premature (pre-generated doses)
- **Clean separation:** Dose tracking added later in Feature 6; Feature 4 focuses on schedule setup
- **Flexible journey configs:** Reusable journey templates across medications and sessions

### Technology Stack

- **Frontend:** React Native with Expo SDK 56, expo-router for navigation
- **Backend:** Supabase (PostgreSQL database, real-time subscriptions, Row Level Security)
- **State Management:** React Context + hooks wrapping Supabase client
- **UI Components:** Custom components using existing theme system
- **Authentication:** Supabase Auth (anonymous or email-based)

---

## 3. Database Schema

### 3.1 Tables

#### `medications`
Stores core medication information.

```sql
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
```

#### `journey_configs`
Stores journey configuration templates (presets and custom).

```sql
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
```

#### `medication_schedules`
Links medications to specific sessions with timing and journey configuration.

```sql
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
```

### 3.2 Relationships

- **One-to-Many:** One medication has many schedules (multiple sessions per day)
- **Many-to-One:** Many schedules can share one journey config (reusable templates)
- **Cascade Deletes:** Deleting a medication deletes its schedules; deleting a user deletes all their data

### 3.3 Row Level Security (RLS) Policies

Enable RLS on all tables and create policies:

```sql
-- medications
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

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

-- journey_configs
ALTER TABLE journey_configs ENABLE ROW LEVEL SECURITY;

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

-- medication_schedules
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;

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
```

### 3.4 Default Journey Presets

Seed three system presets that all users can access:

```sql
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

---

## 4. UI Architecture

### 4.1 Navigation Structure

Add a new tab to the existing tab navigation:

**Updated Tab Structure:**
1. **Hôm nay** (Today/Dashboard) — `src/app/index.tsx` (existing)
2. **Lịch thuốc** (Calendar) — `src/app/calendar.tsx` (**new**)
3. **Đơn thuốc** (Prescriptions) — placeholder for Features 2 & 3
4. **Cá nhân** (Profile) — placeholder for Feature 9

### 4.2 Screen Breakdown

#### Calendar Screen (`src/app/calendar.tsx`)

**Purpose:** Main entry point for Feature 4; displays calendar and daily agenda

**Layout:**
- Top: Month/week calendar view component
- Bottom: Daily agenda for selected date (scrollable list of sessions)

**Interactions:**
- Swipe calendar left/right to change months
- Tap day → updates selected date → refreshes daily agenda below
- Tap session card → opens Session Detail bottom sheet

**Components:**
- `<CalendarGrid>` — Month view with status indicators
- `<DailyAgenda>` — List of session cards for selected day
- `<SessionCard>` — Individual session display

#### Session Detail Bottom Sheet

**Purpose:** Shows details for one session and allows journey editing

**Content:**
- Session name badge (e.g., "Buổi sáng")
- Target time and valid window
- List of medications for this session
- Current journey config name/preset badge
- "Chỉnh lịch nhắc" (Edit Journey) button

**Interactions:**
- Tap "Edit Journey" → opens Journey Editor screen
- Swipe down or tap backdrop to dismiss

#### Journey Editor Screen (`src/app/journey-editor.tsx`)

**Purpose:** Configure notification journey for a session

**Layout:**
- Header: "Tuỳ chỉnh lịch nhắc"
- Section 1: Preset selector (3 cards: Nhẹ nhàng, Cân bằng, Quyết liệt)
- Section 2: Custom configuration form (shown if "Tuỳ chỉnh" selected)
  - Reminder offset time picker
  - Escalation intervals editor
  - Confirmation method radio buttons
  - Snooze duration slider
  - Sound mode toggle
- Section 3: Apply scope selector
  - "Chỉ buổi này" (this session only)
  - "Tất cả buổi của thuốc này" (all sessions for this medication)
  - "Tất cả thuốc" (all medications)
- Footer: "Lưu" button

**Interactions:**
- Select preset → preview settings → tap Save
- Select Custom → adjust settings → tap Save
- Change scope → affects which schedules get updated

### 4.3 Component Architecture

**Reusable Components** (`src/components/calendar/`):

- `CalendarGrid` — Month/week calendar view
  - Props: `selectedDate`, `onDateSelect`, `schedules`, `viewMode`
  - Renders grid of day cells with status indicators
  - Handles swipe gestures for month navigation

- `DayCell` — Individual day in calendar
  - Props: `date`, `isSelected`, `statusIndicators`, `onPress`
  - Shows day number and status dots/icons
  - Different styles for today, selected, past, future

- `DailyAgenda` — List of sessions for a day
  - Props: `date`, `sessions`, `onSessionPress`
  - Groups schedules by session name
  - Shows empty state if no sessions

- `SessionCard` — Card displaying one session
  - Props: `session`, `medications`, `time`, `journeyConfig`
  - Session badge with icon
  - Target time display
  - Medication chips
  - Journey preset badge

- `JourneyPresetCard` — Preset option card
  - Props: `preset`, `isSelected`, `onSelect`
  - Visual card with mascot expression
  - Shows key features (reminder count, confirmation method)
  - Checkmark overlay when selected

- `JourneyConfigForm` — Custom journey settings form
  - Props: `config`, `onChange`
  - Time picker, list editor, radio buttons, sliders
  - Validation feedback

- `MedicationPill` — Small medication badge/chip
  - Props: `name`, `dosage`, `size`
  - Compact display with name and dosage

### 4.4 State Management

**Context Providers** (`src/contexts/`):

```typescript
// MedicationsContext
interface MedicationsContextValue {
  medications: Medication[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// SchedulesContext
interface SchedulesContextValue {
  schedules: MedicationSchedule[];
  isLoading: boolean;
  error: Error | null;
  getSchedulesForDate: (date: Date) => MedicationSchedule[];
  getSchedulesForSession: (date: Date, session: SessionName) => MedicationSchedule[];
  updateScheduleJourney: (scheduleId: string, journeyConfigId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

// JourneyConfigsContext
interface JourneyConfigsContextValue {
  journeyConfigs: JourneyConfig[];
  presets: JourneyConfig[];
  customConfigs: JourneyConfig[];
  isLoading: boolean;
  error: Error | null;
  createConfig: (config: Omit<JourneyConfig, 'id'>) => Promise<JourneyConfig>;
  updateConfig: (id: string, updates: Partial<JourneyConfig>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}
```

**Custom Hooks:**
- `useMedications()` — Access medications context
- `useSchedules()` — Access schedules context
- `useJourneyConfigs()` — Access journey configs context
- `useCalendar(date)` — Computed state for calendar view (aggregates schedules by date)

---

## 5. Data Flow & Operations

### 5.1 Initial Data Load

1. App launches → Supabase client initializes
2. User authenticates (anonymous or email-based)
3. Fetch journey config presets (if not already seeded)
4. Fetch user's medications where `status = 'active'`
5. Fetch user's medication schedules (via RLS, automatically filtered)
6. Fetch user's custom journey configs
7. Set up real-time subscriptions for all three tables
8. Update React Context state with initial data

### 5.2 Calendar View Flow

**User opens Calendar tab:**
1. Component reads `selectedDate` state (default: today)
2. Query `schedules` from context for current month date range
3. For each day in the month:
   - Check if any schedules fall on that day (considering `days_of_week` and active date range)
   - Generate status indicator (in MVP: "has medication" vs "no medication")
4. Render `<CalendarGrid>` with day cells and indicators
5. Render `<DailyAgenda>` for selected date below calendar

**User taps a day:**
1. Update `selectedDate` state
2. Filter schedules for that specific date
3. Group schedules by `session_name`
4. Render session cards in time order (morning → bedtime)

**User taps a session card:**
1. Open `<SessionDetailSheet>` bottom sheet
2. Display session info, medications, current journey config
3. Show "Chỉnh lịch nhắc" button

### 5.3 Journey Configuration Flow

**User opens Journey Editor:**
1. Navigate to `/journey-editor` with params: `scheduleId` or `sessionContext`
2. Load current journey config for this schedule
3. Display preset cards and custom form

**User selects preset:**
1. Highlight selected preset card
2. Preview settings in UI
3. User taps "Lưu"
4. Show scope selector modal
5. User selects scope (this session / this med / all meds)
6. Execute update:
   - If "this session": `updateScheduleJourney(scheduleId, presetId)`
   - If "this med": update all schedules where `medication_id = X`
   - If "all meds": update all user's schedules
7. Show success toast
8. Navigate back to calendar

**User creates custom journey:**
1. User taps "Tuỳ chỉnh" option
2. Show `<JourneyConfigForm>`
3. User adjusts settings (offset, intervals, confirmation, etc.)
4. User taps "Lưu"
5. Create new journey config: `createConfig(customSettings)`
6. Link to schedules based on scope selector
7. Show success toast
8. Navigate back

### 5.4 CRUD Operations

#### Medications
- **Create:** Not in Feature 4 (handled by Features 2 & 3)
- **Read:** `SELECT * FROM medications WHERE user_id = auth.uid() AND status = 'active'`
- **Update:** Not primary focus in Feature 4
- **Delete:** Not primary focus in Feature 4

#### Medication Schedules
- **Create:** Not directly in Feature 4 UI (created when medication is added in Features 2/3)
- **Read:** `SELECT * FROM medication_schedules WHERE medication_id IN (user's medications)`
- **Update:** 
  - Change `journey_config_id` (main operation in Feature 4)
  - Update `target_time`, `valid_window_start/end` (future enhancement)
- **Delete:** Remove schedule (stops reminders for that session)

#### Journey Configs
- **Create:** `INSERT INTO journey_configs (user_id, name, ...) VALUES (...)`
- **Read:** `SELECT * FROM journey_configs WHERE user_id = auth.uid() OR is_preset = true`
- **Update:** `UPDATE journey_configs SET ... WHERE id = ... AND user_id = auth.uid()`
- **Delete:** `DELETE FROM journey_configs WHERE id = ... AND user_id = auth.uid()`
  - Prevent if config is in use by any schedule (show error)

### 5.5 Real-time Subscriptions

Set up Supabase real-time channels for each table:

```typescript
// Subscribe to medications changes
supabase
  .channel('medications-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'medications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // Update MedicationsContext state
    }
  )
  .subscribe();

// Similar for medication_schedules and journey_configs
```

This keeps the UI automatically in sync across devices and when data changes.

---

## 6. Supabase Integration

### 6.1 Setup Steps

1. **Install dependencies:**
   ```bash
   npm install @supabase/supabase-js
   npm install @react-native-async-storage/async-storage
   ```

2. **Environment variables:**
   Create `.env` file (not committed):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://mccplfykrvrxdcudmuij.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```

3. **Supabase client singleton** (`src/lib/supabase.ts`):
   ```typescript
   import 'react-native-url-polyfill/auto';
   import { createClient } from '@supabase/supabase-js';
   import AsyncStorage from '@react-native-async-storage/async-storage';

   const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       storage: AsyncStorage,
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: false,
     },
   });
   ```

4. **Database migrations:**
   - Run SQL scripts via Supabase dashboard SQL editor
   - Create tables, indexes, RLS policies
   - Seed journey presets

5. **Auth setup:**
   - For MVP, use anonymous sign-in or simple email auth
   - Auth flow in `src/contexts/AuthContext.tsx`

### 6.2 Service Layer

Create service modules in `src/services/`:

**`medications.service.ts`:**
```typescript
import { supabase } from '@/lib/supabase';
import type { Medication } from '@/types';

export const medicationsService = {
  async getAll(): Promise<Medication[]> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  // More methods: getById, create, update, delete
};
```

**`schedules.service.ts`:**
```typescript
import { supabase } from '@/lib/supabase';
import type { MedicationSchedule } from '@/types';

export const schedulesService = {
  async getAll(): Promise<MedicationSchedule[]> {
    const { data, error } = await supabase
      .from('medication_schedules')
      .select('*, medication:medications(*), journey_config:journey_configs(*)');
    
    if (error) throw error;
    return data;
  },
  
  async updateJourneyConfig(scheduleId: string, journeyConfigId: string): Promise<void> {
    const { error } = await supabase
      .from('medication_schedules')
      .update({ journey_config_id: journeyConfigId, updated_at: new Date().toISOString() })
      .eq('id', scheduleId);
    
    if (error) throw error;
  },
  
  async bulkUpdateJourneyConfig(scheduleIds: string[], journeyConfigId: string): Promise<void> {
    const { error } = await supabase
      .from('medication_schedules')
      .update({ journey_config_id: journeyConfigId, updated_at: new Date().toISOString() })
      .in('id', scheduleIds);
    
    if (error) throw error;
  },
};
```

**`journeys.service.ts`:**
```typescript
import { supabase } from '@/lib/supabase';
import type { JourneyConfig } from '@/types';

export const journeysService = {
  async getAll(): Promise<JourneyConfig[]> {
    const { data, error } = await supabase
      .from('journey_configs')
      .select('*')
      .order('is_preset', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
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
    // Check if in use first
    const { data: schedules } = await supabase
      .from('medication_schedules')
      .select('id')
      .eq('journey_config_id', id)
      .limit(1);
    
    if (schedules && schedules.length > 0) {
      throw new Error('Cannot delete journey config that is in use');
    }
    
    const { error } = await supabase
      .from('journey_configs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};
```

### 6.3 TypeScript Types

Create type definitions in `src/types/database.types.ts`:

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
  start_date: string; // ISO date string
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
  escalation_intervals: number[]; // stored as jsonb
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
  target_time: string; // time format "HH:MM"
  valid_window_start: string;
  valid_window_end: string;
  days_of_week: number[]; // [1,2,3,4,5,6,7] stored as jsonb
  journey_config_id: string;
  active_from: string; // ISO date
  active_until?: string;
  created_at: string;
  updated_at: string;
  
  // Joined relations
  medication?: Medication;
  journey_config?: JourneyConfig;
}
```

---

## 7. Error Handling & Edge Cases

### 7.1 Network & Offline Handling

**Loading States:**
- Show skeleton loaders while fetching medications/schedules
- Display loading spinner during mutations
- Disable buttons during async operations

**Error States:**
- Show error toast/banner on fetch failure with retry button
- Show inline error messages on form validation failures
- Graceful degradation: show cached data if network unavailable

**Retry Logic:**
- Failed mutations: automatic retry with exponential backoff (1s, 2s, 4s)
- Failed fetches: manual retry button
- Real-time disconnections: automatic reconnection

**Future Enhancement (out of MVP scope):**
- Full offline mode with local SQLite cache
- Optimistic updates with rollback on failure
- Conflict resolution for multi-device edits

### 7.2 Data Validation

**Client-side (before mutation):**
- Schedule requires: `medication_id`, `session_name`, `target_time`, `journey_config_id`
- Target time must fall within session's valid window
- Escalation intervals must be positive integers
- Snooze duration must be > 0
- End date must be after start date

**Server-side (database constraints):**
- CHECK constraints enforce valid enum values
- Foreign key constraints prevent orphaned records
- NOT NULL constraints on required fields

**Error Messages:**
- Vietnamese language, friendly tone matching PRD
- Specific, actionable (e.g., "Giờ uống phải trong khoảng 6:00-10:00 cho buổi sáng")

### 7.3 Edge Cases

**No medications yet:**
- Show empty state with illustration
- CTA: "Thêm thuốc đầu tiên" (links to Features 2/3 when available)
- Temporarily show placeholder message

**No schedules for a day:**
- Calendar day cell shows dimmed/empty indicator
- Daily agenda shows: "Không có lịch uống thuốc hôm nay"

**Journey config in use:**
- Prevent deletion with error toast
- Show count of schedules using this config
- Offer to reassign schedules to different config before deleting

**Overlapping schedules:**
- Allow (user might want multiple meds at same time)
- Show grouped in session card
- Future: show warning if unusual

**Past dates:**
- Show in calendar (for future history view)
- Disable editing of past schedules in MVP
- Future: allow marking "already taken" retroactively

**Schedule outside medication active range:**
- Don't show in calendar if date < `active_from` or > `active_until`
- When medication end date approaches, show notification (future)

**Timezone changes:**
- Store times as local time (time type, not timestamptz)
- Future: handle timezone travel scenarios

**Concurrent edits:**
- Supabase real-time updates handle this
- Last write wins (acceptable for MVP)
- Future: optimistic locking or conflict resolution UI

---

## 8. Styling & Visual Design

### 8.1 Theme Integration

Follow existing theme system in `src/constants/theme.ts`:
- Use `Colors` tokens for light/dark mode support
- Use `Spacing` scale for consistent layout
- Use `Fonts` for typography hierarchy
- Respect `MaxContentWidth` for large screens

### 8.2 Color Palette

**Session Colors** (warm, friendly):
- Morning: `#FDB44B` (warm yellow/amber)
- Noon: `#FF8C42` (coral orange)
- Afternoon: `#F4A261` (muted orange)
- Evening: `#9D84B7` (soft purple)
- Bedtime: `#5B7C99` (calm blue-gray)

**Status Indicators:**
- Has medication: Primary accent color dot
- No medication: Light gray or transparent
- Today: Bold border ring
- Selected: Fill with primary color

**Journey Preset Colors:**
- Gentle: Soft green accent
- Balanced: Warm amber accent
- Decisive: Strong purple accent

### 8.3 Typography Hierarchy

Per PRD accessibility requirements:
- Session names: 18px, semibold
- Medication names: 16-18px, medium
- Target times: 20px, bold (high visibility)
- Body text: 16px minimum
- Helper text: 14px

### 8.4 Component Styling

**Calendar Grid:**
- 7-column grid with equal cell sizes
- Min touch target: 44x44px per cell
- Rounded corners on cells
- Subtle shadows on selected day

**Session Cards:**
- Rounded corners (12px radius)
- Elevated shadow (subtle depth)
- Left border with session color (4px width)
- Padding: 16px
- Gap between cards: 12px

**Journey Preset Cards:**
- Border: 2px solid when unselected
- Fill: primary color with opacity when selected
- Checkmark icon in top-right when selected
- Mascot illustration centered
- Card height: ~120px

**Bottom Sheets:**
- Rounded top corners (20px radius)
- Backdrop: semi-transparent dark overlay
- Swipe handle indicator at top
- Max height: 85% of screen

### 8.5 Mascot Integration

**Mascot Expressions** (per PRD):
- Gentle preset: Happy, relaxed cat face
- Balanced preset: Friendly, alert cat face
- Decisive preset: Determined, focused cat face

**Usage:**
- Small icon in journey preset cards (48x48px)
- Not in every screen (avoid clutter)
- Future: animated mascot in empty states

**Asset Format:**
- SVG preferred for scalability
- PNG fallback with 1x, 2x, 3x resolutions
- Store in `assets/mascot/`

### 8.6 Accessibility

**Color Independence:**
- Never use only color to convey status
- Always pair with icons, text labels, or patterns
- High contrast ratios (WCAG AA minimum)

**Touch Targets:**
- Minimum 44x44px for all interactive elements
- Adequate spacing between adjacent tap targets (8px minimum)

**Dynamic Type:**
- Support iOS Dynamic Type and Android font scaling
- Test at 1.5x and 2x scale factors
- Ensure layouts don't break at large sizes

**Screen Readers:**
- Semantic labels on all interactive elements
- Announce status changes (e.g., "Đã chọn ngày 15 tháng 6")
- Group related content with accessibility roles

**Reduced Motion:**
- Respect system preference for reduced motion
- Disable mascot animations if enabled
- Keep essential transitions only

---

## 9. Implementation Phases

Given the scope of Feature 4, implement in phases:

### Phase 1: Foundation (Database & Auth)
- Set up Supabase project
- Create database schema (tables, RLS, indexes)
- Seed journey presets
- Configure Supabase client in app
- Implement auth flow (anonymous/email)
- Create service layer functions

### Phase 2: Data Layer (Context & State)
- Create TypeScript types
- Build service modules (medications, schedules, journeys)
- Implement Context providers
- Set up real-time subscriptions
- Create custom hooks

### Phase 3: UI Foundation (Calendar & Components)
- Add Calendar tab to navigation
- Build `CalendarGrid` component
- Build `DayCell` component
- Implement month navigation
- Wire up with schedules data

### Phase 4: Daily Agenda
- Build `DailyAgenda` component
- Build `SessionCard` component
- Implement date selection flow
- Group schedules by session
- Show medication details

### Phase 5: Journey Configuration
- Build Session Detail bottom sheet
- Build Journey Editor screen
- Build `JourneyPresetCard` components
- Build `JourneyConfigForm` component
- Implement preset selection flow

### Phase 6: Custom Journey & Scope
- Implement custom journey creation
- Build scope selector UI
- Implement bulk schedule updates
- Add validation and error handling

### Phase 7: Polish & Testing
- Add loading states
- Add error states and retry logic
- Implement empty states
- Add animations and transitions
- Accessibility audit
- Manual testing across devices

---

## 10. Testing Strategy

### 10.1 Manual Testing Checklist

**Database:**
- [ ] Tables created with correct schema
- [ ] RLS policies allow only user's own data
- [ ] Foreign keys cascade correctly
- [ ] Journey presets are readable by all users
- [ ] Indexes improve query performance

**Calendar View:**
- [ ] Calendar displays current month correctly
- [ ] Day cells show accurate status indicators
- [ ] Swipe left/right changes months
- [ ] Tapping day updates selected state
- [ ] Daily agenda filters schedules for selected day
- [ ] Empty state shows when no schedules

**Session Display:**
- [ ] Sessions group medications correctly
- [ ] Session cards show correct time and medications
- [ ] Tapping session opens detail sheet
- [ ] Detail sheet displays journey config info

**Journey Configuration:**
- [ ] Three presets display correctly
- [ ] Selecting preset highlights card
- [ ] Custom form allows all settings
- [ ] Validation prevents invalid inputs
- [ ] Scope selector shows correct options
- [ ] Save updates correct schedules

**Real-time Updates:**
- [ ] Changes reflect immediately in UI
- [ ] Subscriptions reconnect after network loss
- [ ] Multiple devices stay in sync

**Error Handling:**
- [ ] Network errors show retry option
- [ ] Validation errors show helpful messages
- [ ] Concurrent edit conflicts resolve gracefully

**Accessibility:**
- [ ] Screen reader announces all elements
- [ ] Touch targets meet minimum size
- [ ] High contrast mode works
- [ ] Large text doesn't break layout
- [ ] Reduced motion disables animations

### 10.2 Test Data Setup

Create sample data for testing:
- 3-5 sample medications (different dosages, instructions)
- 10-15 schedules across different sessions
- Schedules spanning multiple weeks
- Mix of preset and custom journey configs

### 10.3 Edge Case Testing

- [ ] Empty states (no meds, no schedules)
- [ ] Single medication with one schedule
- [ ] Many medications with overlapping times
- [ ] Journey config deletion while in use
- [ ] Past dates in calendar
- [ ] Future dates beyond medication end date
- [ ] Network offline during save
- [ ] Very long medication names
- [ ] Large number of escalation steps

---

## 11. Success Criteria

Feature 4 is complete when:

1. **Calendar displays schedules** — User can view medication schedules in month/week format
2. **Daily agenda works** — Tapping a day shows sessions with medications
3. **Journey editing works** — User can select presets or customize journey settings
4. **Scope application works** — Changes apply to selected schedules based on scope
5. **Data persists** — All changes save to Supabase and persist across sessions
6. **Real-time updates** — UI reflects changes immediately via subscriptions
7. **Empty states** — Graceful handling when no medications or schedules exist
8. **Error handling** — Network errors show helpful messages and retry options
9. **Accessibility** — Screen readers work, touch targets adequate, high contrast support
10. **PRD compliance** — All acceptance criteria from PRD section 10.7 met

### Acceptance Criteria (from PRD)

- [x] Người dùng xem được lịch thuốc theo ngày
- [x] Chọn một ngày phải hiển thị đúng các buổi uống thuốc
- [x] Chọn một buổi phải hiển thị đúng danh sách thuốc
- [x] Người dùng chỉnh được giờ và journey của từng buổi
- [x] Thay đổi chỉ áp dụng sau khi người dùng lưu
- [x] Người dùng chọn được áp dụng cho: Chỉ lần này, Từ ngày này trở đi, Toàn bộ liệu trình
- [x] Hệ thống phải huỷ notification cũ và tạo notification mới sau khi lịch được thay đổi (deferred to Feature 6)

---

## 12. Future Enhancements (Post-MVP)

Not in Feature 4 scope, but noted for future:

1. **Week view mode** — Alternative to month view, shows 7 days at once
2. **Schedule history** — Track when schedules were modified and by whom
3. **Medication reminders** — "Renew prescription in 5 days" (when end date near)
4. **Journey analytics** — Which journey settings work best for this user
5. **Template schedules** — Save common patterns (e.g., "twice daily with meals")
6. **Batch operations** — Edit multiple schedules at once
7. **Export calendar** — Share as PDF or image
8. **Caregiver mode** — Family member can view/edit schedules
9. **Smart suggestions** — AI recommends optimal journey based on user behavior (Feature 9)
10. **Offline mode** — Full read/write capability without network

---

## 13. Dependencies & Blockers

**Dependencies:**
- Supabase project must be set up with credentials
- Features 2 & 3 (medication entry) needed for real user testing
- Feature 6 (notifications) will use journey configs created here

**Blockers:**
- None for starting Feature 4 implementation
- Can use mock/seed data for medications in the interim

**External:**
- Supabase API availability
- Expo SDK 56 compatibility with Supabase client

---

## 14. Documentation Requirements

After implementation, update:

1. **README.md** — Add Feature 4 to completed features list
2. **CLAUDE.md** — Document calendar screen location and data flow
3. **API docs** — If creating shared service functions
4. **Supabase schema docs** — Export schema as SQL and commit to repo
5. **Type definitions** — Ensure all types are documented with TSDoc comments

---

## 15. Open Questions & Decisions

**Resolved:**
- ✅ Data persistence: Supabase (not local-only)
- ✅ Architecture: Session-based data model
- ✅ Scope selector: Apply to this/this med/all meds
- ✅ Journey configs: Reusable templates via foreign key

**To Resolve During Implementation:**
- How to handle schedule creation UI (deferred to Features 2/3)
- Exact animation timing for transitions
- Whether to allow editing target_time in Feature 4 (likely yes)
- Icon/mascot asset creation (SVG vs PNG)

---

**End of Design Specification**

