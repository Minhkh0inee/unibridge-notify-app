# Feature 04 Implementation Plan: Custom Journey and Calendar

## Context

Feature 04 replaces the current mock calendar and journey UI with real medication schedule data from Supabase. The goal is to let users view their medication journey by date, inspect each session, customize reminder behavior, and persist changes safely.

The current implementation is mostly local/mock-driven:

- `src/app/explore.tsx` hardcodes the month, selected day, current day, and calendar dose markers.
- `src/data/seed.ts` seeds sample journeys into AsyncStorage.
- `src/data/storage.ts` stores journey and dose logs locally.
- `src/data/schedule.ts` computes today's doses from simple `reminderTimes`, but it is not date-aware and does not support per-session configuration or overrides.

## Important Platform Notes

- `AGENTS.md` requires reading Expo SDK 56 docs before writing implementation code.
- The app is currently on Expo SDK 54 in `package.json`, so implementation should start by deciding whether to upgrade to SDK 56 or explicitly pause until the runtime mismatch is resolved.
- Supabase keys in Expo must be public-safe. Use the publishable key when available; the current `.env` contains `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Never expose a Supabase `service_role` or secret key in the Expo app.
- Every table exposed through the Supabase Data API should have RLS enabled and explicit policies.

## Product Requirements Covered

Feature 04 acceptance criteria:

- Users can view medication schedules by day.
- Selecting a day shows the correct sessions.
- Selecting a session shows the correct medications.
- Users can edit the time and journey configuration for each session.
- Changes apply only after saving.
- Users can choose whether a change applies to:
  - only this occurrence,
  - from this date forward,
  - the entire treatment course.
- The app cancels old notifications and creates new notifications after schedule changes.

## Recommended Data Types

Use PRD-aligned types instead of the current narrow mock types.

```ts
export type Period =
  | 'morning'
  | 'noon'
  | 'afternoon'
  | 'evening'
  | 'bedtime';

export type DayDoseStatus =
  | 'complete'
  | 'partial'
  | 'late'
  | 'missed'
  | 'future'
  | 'none';

export type JourneyPreset =
  | 'gentle'
  | 'balanced'
  | 'assertive'
  | 'custom';

export type CompletionMethod =
  | 'tap_taken'
  | 'photo'
  | 'photo_and_confirm'
  | 'none';

export type ApplyScope =
  | 'once'
  | 'from_date'
  | 'entire_course';

export type SoundMode =
  | 'silent'
  | 'vibrate'
  | 'gentle_sound'
  | 'escalating_sound';
```

## Supabase Schema Plan

Create the schema through Supabase migrations once the app data model is finalized.

### `profiles`

Stores app-level user profile data.

- `id uuid primary key references auth.users(id)`
- `display_name text`
- `created_at timestamptz`
- `updated_at timestamptz`

### `journeys`

Represents a medication journey or treatment course.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `status text not null`
- `start_date date not null`
- `end_date date`
- `preset text not null default 'balanced'`
- `created_at timestamptz`
- `updated_at timestamptz`

### `medications`

Stores medication details.

- `id uuid primary key`
- `journey_id uuid not null references journeys(id)`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `active_ingredient text`
- `dosage text not null`
- `instructions text`
- `icon_url text`
- `start_date date not null`
- `end_date date`
- `status text not null`
- `created_at timestamptz`
- `updated_at timestamptz`

### `medication_schedules`

Defines the default recurring sessions for each medication.

- `id uuid primary key`
- `medication_id uuid not null references medications(id)`
- `journey_id uuid not null references journeys(id)`
- `user_id uuid not null references auth.users(id)`
- `period text not null`
- `target_time time not null`
- `window_start time not null`
- `window_end time not null`
- `days_of_week int[]`
- `created_at timestamptz`
- `updated_at timestamptz`

### `journey_session_configs`

Stores default or session-specific reminder behavior.

- `id uuid primary key`
- `journey_id uuid not null references journeys(id)`
- `schedule_id uuid references medication_schedules(id)`
- `user_id uuid not null references auth.users(id)`
- `period text not null`
- `target_time time not null`
- `window_start time not null`
- `window_end time not null`
- `reminder_offset_minutes int not null default 0`
- `escalation_intervals_minutes int[] not null`
- `max_escalation_level text not null`
- `completion_method text not null`
- `ask_later_minutes int not null default 10`
- `sound_mode text not null default 'gentle_sound'`
- `prep_reminder_enabled boolean not null default false`
- `prep_reminder_minutes int`
- `carry_reminder_enabled boolean not null default false`
- `preset text not null default 'balanced'`
- `created_at timestamptz`
- `updated_at timestamptz`

### `schedule_overrides`

Captures user edits and their apply scope.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `journey_id uuid not null references journeys(id)`
- `schedule_id uuid references medication_schedules(id)`
- `effective_date date not null`
- `scope text not null`
- `period text not null`
- `target_time time not null`
- `window_start time not null`
- `window_end time not null`
- `config jsonb not null`
- `created_at timestamptz`
- `updated_at timestamptz`

### `dose_events`

Stores actual user behavior.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `journey_id uuid not null references journeys(id)`
- `medication_id uuid not null references medications(id)`
- `schedule_id uuid references medication_schedules(id)`
- `scheduled_for timestamptz not null`
- `action_taken_at timestamptz`
- `status text not null`
- `photo_uri text`
- `created_at timestamptz`

### `notification_schedules`

Stores local notification metadata so old reminders can be cancelled after edits.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `journey_id uuid not null references journeys(id)`
- `schedule_id uuid references medication_schedules(id)`
- `notification_identifier text not null`
- `kind text not null`
- `scheduled_for timestamptz not null`
- `created_at timestamptz`

## RLS Policy Shape

Enable RLS on every public table.

Use ownership policies based on `auth.uid()`, for example:

```sql
create policy "Users can read their own journeys"
on public.journeys
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own journeys"
on public.journeys
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own journeys"
on public.journeys
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

Repeat the same ownership shape for user-owned tables. Avoid using `auth.role()` in policies.

## Serverless Architecture

Use Supabase as the serverless backend.

- Expo app:
  - Reads/writes user-owned journey, medication, schedule, override, and dose event data through `supabase-js`.
  - Schedules device-local notifications through `expo-notifications`.
  - Cancels and recreates local notifications after schedule changes.
- Supabase Postgres:
  - Source of truth for journeys, schedules, session config, overrides, and dose events.
- Supabase Edge Functions:
  - Reserve for logic that must not live in the client, such as future AI suggestions, OCR normalization, weekly recap generation, or protected batch work.
  - Do not rely on Edge Functions to schedule local device notifications directly.

## Implementation Phases

### Phase 1: Runtime and Supabase Setup

1. Confirm whether the project should upgrade from Expo SDK 54 to SDK 56.
2. Install and pin Supabase client packages.
3. Create `src/lib/supabase.ts`.
4. Configure auth session persistence with AsyncStorage.
5. Add typed environment validation for `EXPO_PUBLIC_SUPABASE_URL` and the public key.
6. Choose the MVP auth path:
   - email auth for real user ownership, or
   - anonymous auth if the MVP needs minimal friction.

### Phase 2: Database and Seed Data

1. Create Supabase migrations for the tables above.
2. Enable RLS and add ownership policies.
3. Seed one realistic demo journey from the current HP/Asthma mocks.
4. Verify select/insert/update access as an authenticated user.
5. Add a migration checklist to avoid relying on local AsyncStorage mock state.

### Phase 3: Data Layer Rewrite

1. Expand `src/data/types.ts` to match the PRD and database.
2. Replace mock-first calls in `src/data/storage.ts` with Supabase repositories.
3. Keep AsyncStorage only for local notification identifiers, pending intents, and offline-friendly cache.
4. Rewrite `src/data/schedule.ts` so it accepts:
   - selected date,
   - medications,
   - schedules,
   - session configs,
   - overrides,
   - dose events.
5. Return a stable UI model for calendar days and agenda sessions.

### Phase 4: Calendar Screen

Refactor `src/app/explore.tsx`:

1. Generate the month or week from real dates.
2. Remove hardcoded `Tháng 6, 2026`, `selectedDay = 27`, and fake day markers.
3. Calculate day status from `dose_events`.
4. Add non-color-only indicators:
   - check icon for complete,
   - half/progress marker for partial,
   - clock/warning icon for late,
   - muted or missed icon for missed.
5. Show agenda sessions for:
   - Sáng,
   - Trưa,
   - Chiều,
   - Tối,
   - Trước khi ngủ.
6. Include target time, medication list, status, and an edit action for each session.

### Phase 5: Session Details Editor

Replace the current informational bottom sheet with a real editor:

1. Show medications for the selected period.
2. Show target time and valid window.
3. Add journey preset selector:
   - Nhẹ nhàng,
   - Cân bằng,
   - Quyết liệt,
   - Tuỳ chỉnh.
4. Add reminder start selector:
   - đúng giờ,
   - trước 5 phút,
   - trước 15 phút,
   - trước 30 phút,
   - tuỳ chỉnh.
5. Add escalation interval controls.
6. Add max escalation level.
7. Add completion method selector.
8. Add ask-me-later duration.
9. Add sound and vibration mode.
10. Add prep and carry reminder toggles.
11. Add apply scope selector:
   - Chỉ lần này,
   - Từ ngày này trở đi,
   - Toàn bộ liệu trình.
12. Disable save until there are unsaved changes.

### Phase 6: Save Flow and Notifications

On save:

1. Validate the target time belongs to the selected valid window.
2. Persist a `schedule_overrides` row or update the default config based on apply scope.
3. Refresh the selected date and calendar data from Supabase.
4. Cancel old local notifications for the affected schedule.
5. Create new local notifications with `expo-notifications`.
6. Persist new notification identifiers.
7. Show a supportive success message.

### Phase 7: UI Alignment

Keep the screen aligned with the PRD:

- Mobile-first.
- Clear medication, dose, time, and next action.
- No color-only status communication.
- Minimum touch target of 44 x 44px.
- Primary buttons at least 48px high.
- Friendly but not childish copy.
- No judgmental missed-dose messaging.
- Use mascot sparingly so it does not obscure medication details.

## Verification Checklist

Manual checks:

- Selecting different dates updates the agenda.
- A date with no medications shows an empty state.
- A completed day shows complete status.
- A partially completed day shows partial status.
- Late and missed events are distinguishable without relying only on color.
- Opening a session shows exactly the medications for that period.
- Saving does not happen until the user taps save.
- Each apply scope creates the expected database result.
- Old notifications are cancelled after schedule changes.
- New notifications are scheduled at the updated times.

Technical checks:

- `npm run lint`
- TypeScript check if available.
- Supabase RLS read/write verification.
- Supabase advisors after database changes.
- iOS notification smoke test.
- Android notification smoke test.

## Suggested File Targets

- `src/lib/supabase.ts`
- `src/data/types.ts`
- `src/data/storage.ts`
- `src/data/schedule.ts`
- `src/hooks/use-active-journey.ts`
- `src/app/explore.tsx`
- `src/notifications/notifications.ts`
- `supabase/migrations/*`

## Reference Links

- Expo SDK 56 docs: https://docs.expo.dev/versions/v56.0.0/
- Expo Notifications SDK 56: https://docs.expo.dev/versions/v56.0.0/sdk/notifications/
- Supabase with Expo React Native: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase changelog: https://supabase.com/changelog
