# Phase 2: Database Migration Guide

## Overview

This guide explains how to apply the Supabase migrations for the Custom Journey and Calendar feature.

## Prerequisites

1. **Supabase Project:** Active Supabase project with credentials in `.env`
2. **Supabase CLI:** Install with `npm install -g supabase` or `brew install supabase/tap/supabase`
3. **Authentication:** Anonymous auth provider enabled in Supabase dashboard (or email auth)

## Migration Files Created

All migrations are in `supabase/migrations/`:

1. `20260628000001_create_profiles_table.sql` - User profiles
2. `20260628000002_create_journeys_table.sql` - Treatment journeys
3. `20260628000003_create_medications_table.sql` - Medications
4. `20260628000004_create_medication_schedules_table.sql` - Recurring schedules
5. `20260628000005_create_journey_session_configs_table.sql` - Session reminder configs
6. `20260628000006_create_schedule_overrides_table.sql` - User overrides
7. `20260628000007_create_dose_events_table.sql` - User actions
8. `20260628000008_create_notification_schedules_table.sql` - Notification tracking
9. `20260628000009_seed_demo_data.sql` - Demo HP/Asthma journeys

## Option 1: Apply via Supabase Dashboard (Recommended for MVP)

### Step 1: Sign in to Supabase Dashboard

Visit https://supabase.com/dashboard and select your project.

### Step 2: Navigate to SQL Editor

Click **SQL Editor** in the left sidebar.

### Step 3: Apply Migrations One by One

Copy and paste each migration file in order:

1. Open `supabase/migrations/20260628000001_create_profiles_table.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run**
5. Verify success message
6. Repeat for migrations 2-8

**Important:** Stop after migration 8. Do NOT run migration 9 (seed data) yet.

### Step 4: Enable Anonymous Auth (if using)

1. Go to **Authentication** → **Providers**
2. Find **Anonymous** provider
3. Toggle **Enabled**
4. Save

### Step 5: Test Authentication

From your project directory:

```bash
node scripts/test-supabase.js
```

Expected output:
```
✅ Connection successful
✅ Anonymous auth successful
   User ID: <uuid>
✅ Phase 1 environment validation complete!
```

### Step 6: Apply Seed Data

After successful auth test:

1. Copy contents of `supabase/migrations/20260628000009_seed_demo_data.sql`
2. Paste into SQL Editor
3. Click **Run**
4. Verify 2 journeys, 5 medications, and sample dose events created

## Option 2: Apply via Supabase CLI

### Step 1: Link Project

```bash
supabase link --project-ref your-project-ref
```

Get your project ref from the Supabase dashboard URL:
`https://supabase.com/dashboard/project/[your-project-ref]`

### Step 2: Apply All Migrations

```bash
supabase db push
```

This applies all migrations in order.

### Step 3: Verify

```bash
supabase db diff --schema public
```

Should show no differences (all migrations applied).

## Verification Checklist

### 1. Table Creation

Run in SQL Editor:

```sql
select table_name 
from information_schema.tables 
where table_schema = 'public'
order by table_name;
```

Expected tables:
- `dose_events`
- `journeys`
- `journey_session_configs`
- `medication_schedules`
- `medications`
- `notification_schedules`
- `profiles`
- `schedule_overrides`

### 2. RLS Enabled

Run in SQL Editor:

```sql
select tablename, rowsecurity 
from pg_tables 
where schemaname = 'public'
order by tablename;
```

All tables should have `rowsecurity = true`.

### 3. RLS Policies

Run in SQL Editor:

```sql
select schemaname, tablename, policyname, cmd 
from pg_policies 
where schemaname = 'public'
order by tablename, policyname;
```

Each table should have policies for authenticated and anonymous users:
- `*_can_read_their_own_*`
- `*_can_insert_their_own_*`
- `*_can_update_their_own_*`
- `*_can_delete_their_own_*` (except dose_events and notification_schedules)

### 4. Test Data Access

After seeding, run in SQL Editor:

```sql
-- Should return 2 journeys for your user
select id, name, status, start_date, preset
from public.journeys
where user_id = auth.uid();

-- Should return 5 medications
select m.name, m.dosage, j.name as journey_name
from public.medications m
join public.journeys j on j.id = m.journey_id
where m.user_id = auth.uid();

-- Should return 8 schedules
select ms.period, ms.target_time, m.name as medication_name
from public.medication_schedules ms
join public.medications m on m.id = ms.medication_id
where ms.user_id = auth.uid()
order by ms.target_time, m.name;

-- Should return dose events
select de.status, de.scheduled_for, m.name as medication_name
from public.dose_events de
join public.medications m on m.id = de.medication_id
where de.user_id = auth.uid()
order by de.scheduled_for desc
limit 10;
```

### 5. Test RLS Isolation

Create a second test user and verify they cannot see the first user's data:

```sql
-- Should return empty set when run as different user
select count(*) from public.journeys where user_id != auth.uid();
```

Expected: `0`

### 6. Test Constraints

Try inserting invalid data:

```sql
-- Should fail: invalid status
insert into public.journeys (user_id, name, status, start_date)
values (auth.uid(), 'Test', 'invalid_status', current_date);

-- Should fail: window_start >= target_time
insert into public.medication_schedules (
  medication_id, journey_id, user_id, period, 
  target_time, window_start, window_end
)
values (
  (select id from medications limit 1),
  (select id from journeys limit 1),
  auth.uid(),
  'morning',
  '08:00'::time,
  '09:00'::time,  -- Invalid: after target_time
  '10:00'::time
);
```

Both should fail with constraint errors.

## Troubleshooting

### Error: "relation does not exist"

**Cause:** Migrations not applied in order, or some migrations failed.

**Fix:** Check migration order and re-apply failed migrations.

### Error: "permission denied for table"

**Cause:** RLS policies not set up correctly, or user not authenticated.

**Fix:** 
1. Verify `auth.uid()` returns a UUID when running queries
2. Check RLS policies exist for the table
3. Ensure you're authenticated (run `select auth.uid();` first)

### Error: "insert violates foreign key constraint"

**Cause:** Seed data references non-existent parent records.

**Fix:** Ensure you're authenticated before running seed migration (auth.uid() must return a value).

### Anonymous auth not working

**Fix:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable **Anonymous** provider
3. Retry connection test

### Seed data creates no rows

**Cause:** `auth.uid()` returns null (not authenticated).

**Fix:**
1. Run `node scripts/test-supabase.js` to create anonymous session
2. Get the user ID from output
3. Replace `auth.uid()` in seed SQL with your actual UUID temporarily, or
4. Re-run seed migration while authenticated

## Next Steps

After successful verification:

✅ Phase 2 complete  
⏭️ Ready for Phase 3: Data Layer Rewrite

Phase 3 will:
- Expand `src/data/types.ts` with PRD-aligned types
- Replace `src/data/storage.ts` with Supabase repositories
- Rewrite `src/data/schedule.ts` for date-aware schedule computation

## Rollback

To rollback all migrations:

### Via Dashboard

Run in SQL Editor:

```sql
drop table if exists public.notification_schedules cascade;
drop table if exists public.dose_events cascade;
drop table if exists public.schedule_overrides cascade;
drop table if exists public.journey_session_configs cascade;
drop table if exists public.medication_schedules cascade;
drop table if exists public.medications cascade;
drop table if exists public.journeys cascade;
drop table if exists public.profiles cascade;
drop function if exists public.handle_updated_at cascade;
```

### Via CLI

```bash
supabase db reset
```

**Warning:** This deletes all data. Only use in development.
