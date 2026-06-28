# Phase 2 Migration Checklist

Use this checklist to track migration application and verification.

## Pre-Migration

- [ ] Supabase project exists and is accessible
- [ ] Supabase credentials in `.env` are correct
- [ ] Can connect to Supabase (run `node scripts/test-supabase.js`)
- [ ] Decided on auth strategy (anonymous or email)
- [ ] Auth provider enabled in Supabase dashboard

## Migration Application

### Core Tables (Apply in order)
- [ ] `20260628000001_create_profiles_table.sql` ✓
- [ ] `20260628000002_create_journeys_table.sql` ✓
- [ ] `20260628000003_create_medications_table.sql` ✓
- [ ] `20260628000004_create_medication_schedules_table.sql` ✓
- [ ] `20260628000005_create_journey_session_configs_table.sql` ✓
- [ ] `20260628000006_create_schedule_overrides_table.sql` ✓
- [ ] `20260628000007_create_dose_events_table.sql` ✓
- [ ] `20260628000008_create_notification_schedules_table.sql` ✓

### Authentication Test
- [ ] Run `node scripts/test-supabase.js`
- [ ] Verify connection successful
- [ ] Verify auth successful (anonymous or email)
- [ ] Note user ID: `________________`

### Seed Data
- [ ] `20260628000009_seed_demo_data.sql` (run while authenticated) ✓

## Verification

### Table Creation
- [ ] 8 tables created in public schema
- [ ] All tables visible in Supabase dashboard

### RLS Enabled
- [ ] All 8 tables have RLS enabled
- [ ] Query `select tablename, rowsecurity from pg_tables where schemaname = 'public'` shows all true

### RLS Policies
- [ ] Each table has read policy for authenticated users
- [ ] Each table has insert policy for authenticated users
- [ ] Each table has update policy for authenticated users
- [ ] Each table has read policy for anonymous users
- [ ] Each table has insert policy for anonymous users
- [ ] Each table has update policy for anonymous users
- [ ] Query returns 48+ policies total

### Seed Data Verification
- [ ] 2 journeys created (HP, Asthma)
- [ ] 5 medications created (2 HP, 3 Asthma)
- [ ] 8 medication schedules created
- [ ] 5 journey session configs created
- [ ] Sample dose events created

Run verification queries from `phase-2-migration-guide.md`:
- [ ] Journey query returns 2 rows
- [ ] Medication query returns 5 rows
- [ ] Schedule query returns 8 rows
- [ ] Dose events query returns sample data

### Constraint Testing
- [ ] Invalid journey status rejected
- [ ] Invalid time window rejected
- [ ] Invalid period rejected
- [ ] Foreign key constraints enforced

### RLS Isolation
- [ ] Queries as different user return empty set
- [ ] Cannot access other user's data

## Post-Migration

- [ ] All tables created successfully
- [ ] All RLS policies working
- [ ] Seed data accessible
- [ ] Ready for Phase 3: Data Layer Rewrite

## Issues Encountered

(Document any issues and resolutions here)

---

## Migration Status: ⏳ PENDING APPLICATION

**Next Step:** Apply migrations via Supabase dashboard or CLI following `phase-2-migration-guide.md`

**Estimated Time:** 15-30 minutes

**Blocker:** None - migrations are ready to apply
