# Supabase Migrations

This directory contains database migrations for the Custom Journey and Calendar feature.

## Migration Files

Migrations are numbered sequentially and should be applied in order:

1. **20260628000001_create_profiles_table.sql**
   - Creates `profiles` table for user profile data
   - Enables RLS with ownership policies
   - Creates `handle_updated_at()` trigger function

2. **20260628000002_create_journeys_table.sql**
   - Creates `journeys` table for treatment courses
   - Status: active, paused, completed, cancelled
   - Preset: gentle, balanced, assertive, custom

3. **20260628000003_create_medications_table.sql**
   - Creates `medications` table
   - Links to journeys via foreign key
   - Supports active ingredient, dosage, instructions, icon

4. **20260628000004_create_medication_schedules_table.sql**
   - Creates `medication_schedules` table
   - Defines recurring sessions per medication
   - Period: morning, noon, afternoon, evening, bedtime
   - Includes valid time window constraints

5. **20260628000005_create_journey_session_configs_table.sql**
   - Creates `journey_session_configs` table
   - Stores reminder behavior per session
   - Escalation intervals, sound mode, completion method
   - Prep and carry reminder toggles

6. **20260628000006_create_schedule_overrides_table.sql**
   - Creates `schedule_overrides` table
   - Captures user edits with apply scope
   - Scope: once, from_date, entire_course
   - Config stored as JSONB

7. **20260628000007_create_dose_events_table.sql**
   - Creates `dose_events` table
   - Records actual user actions
   - Status: pending, taken, skipped, late, missed
   - Includes photo URI for photo confirmations

8. **20260628000008_create_notification_schedules_table.sql**
   - Creates `notification_schedules` table
   - Tracks local notifications for cancellation
   - Kind: reminder, prep, carry, escalation

9. **20260628000009_seed_demo_data.sql**
   - Seeds demo HP and Asthma journeys
   - Creates sample medications and schedules
   - Inserts dose events for calendar testing
   - **Run while authenticated** (requires `auth.uid()`)

## How to Apply

See `../docs/phase-2-migration-guide.md` for detailed instructions.

### Quick Start (Dashboard)

1. Sign in to Supabase dashboard
2. Go to SQL Editor
3. Copy/paste each migration file (1-8)
4. Click Run
5. Enable anonymous auth (if using)
6. Run seed migration (9)

### Quick Start (CLI)

```bash
supabase link --project-ref your-project-ref
supabase db push
```

## Key Features

### Row Level Security (RLS)

- **All tables** have RLS enabled
- **Ownership model**: Users can only access their own data via `auth.uid()`
- **Anonymous support**: Policies support both authenticated and anonymous users
- **No service role needed**: Client can read/write directly with proper policies

### Data Model

- **User ownership**: Every user-data table has `user_id` foreign key to `auth.users(id)`
- **Cascade deletes**: Deleting a journey cascades to medications, schedules, etc.
- **Timestamps**: All tables have `created_at` and most have `updated_at` with triggers
- **Constraints**: CHECK constraints enforce valid enums and time windows
- **Indexes**: Optimized for common queries (user_id, status, scheduled_for, etc.)

### Presets

Three journey presets control reminder intensity:

- **Gentle**: Longer intervals, no photo required, low escalation
- **Balanced**: Moderate intervals, tap to confirm, medium escalation (default)
- **Assertive**: Short intervals, photo required, high escalation
- **Custom**: User-defined configuration

## Schema Diagram

```
auth.users (Supabase Auth)
    ↓
profiles
    ↓
journeys
    ↓
    ├── medications
    │   └── medication_schedules
    │       ├── journey_session_configs
    │       ├── schedule_overrides
    │       ├── dose_events
    │       └── notification_schedules
    └── dose_events
```

## Migration Best Practices

1. **Test locally first**: Use Supabase local development if possible
2. **Backup before applying**: Supabase dashboard → Database → Backups
3. **Apply in order**: Migrations have foreign key dependencies
4. **Verify after each**: Check for errors before proceeding
5. **Don't modify applied migrations**: Create new migration instead

## Rollback

See `../docs/phase-2-migration-guide.md` for rollback instructions.

**Warning:** Rollback deletes all data. Only use in development.

## Troubleshooting

### Common Issues

**"relation does not exist"**: Migrations not applied in order  
**"permission denied"**: RLS enabled but no valid auth session  
**"foreign key violation"**: Parent record doesn't exist or wrong user_id  
**Seed data inserts nothing**: Not authenticated (auth.uid() returns null)

See migration guide for detailed troubleshooting.

## Next Steps

After migrations are applied and verified:

- ✅ Phase 2 complete
- ⏭️ Phase 3: Data Layer Rewrite (`src/data/*`)
- ⏭️ Phase 4: Calendar Screen Refactor (`src/app/explore.tsx`)

See `../docs/feature-04-custom-journey-calendar-plan.md` for the full plan.
