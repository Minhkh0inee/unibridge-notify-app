-- Seed demo data - Self-contained version
-- This creates an anonymous user and seed data in one transaction
-- No pre-authentication required!

do $$
declare
  test_user_id uuid;
  journey_hp_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
  journey_asthma_id uuid := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
  med_hp_001_id uuid := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
  med_hp_002_id uuid := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
  med_asthma_001_id uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
  med_asthma_002_id uuid := 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
begin
  -- Create anonymous test user (or use existing if auth.uid() is available)
  test_user_id := auth.uid();

  if test_user_id is null then
    -- No authenticated user, create a dummy UUID for seeding
    test_user_id := '00000000-0000-0000-0000-000000000001'::uuid;

    -- Insert into auth.users manually (only works if you have direct access)
    -- Skip this if RLS prevents it - user will need to sign in first
    insert into auth.users (id, email)
    values (test_user_id, 'demo@example.com')
    on conflict (id) do nothing;
  end if;

  -- Insert HP Journey
  insert into public.journeys (id, user_id, name, status, start_date, preset)
  values (journey_hp_id, test_user_id, 'HP', 'active', current_date - interval '7 days', 'balanced');

  -- Insert HP Medications
  insert into public.medications (id, journey_id, user_id, name, dosage, start_date, status)
  values
    (med_hp_001_id, journey_hp_id, test_user_id, 'Lisinopril', '10mg', current_date - interval '7 days', 'active'),
    (med_hp_002_id, journey_hp_id, test_user_id, 'Atenolol', '25mg', current_date - interval '7 days', 'active');

  -- Insert HP Medication Schedules
  insert into public.medication_schedules (medication_id, journey_id, user_id, period, target_time, window_start, window_end)
  values
    (med_hp_001_id, journey_hp_id, test_user_id, 'morning', '08:00'::time, '07:00'::time, '10:00'::time),
    (med_hp_002_id, journey_hp_id, test_user_id, 'morning', '08:00'::time, '07:00'::time, '10:00'::time),
    (med_hp_002_id, journey_hp_id, test_user_id, 'evening', '20:00'::time, '19:00'::time, '22:00'::time);

  -- Insert HP Journey Session Configs
  insert into public.journey_session_configs (
    journey_id, user_id, period, target_time, window_start, window_end,
    reminder_offset_minutes, escalation_intervals_minutes, max_escalation_level,
    completion_method, ask_later_minutes, sound_mode, preset
  )
  values
    (journey_hp_id, test_user_id, 'morning', '08:00'::time, '07:00'::time, '10:00'::time, 0, array[3,6,10], 'medium', 'tap_taken', 10, 'gentle_sound', 'balanced'),
    (journey_hp_id, test_user_id, 'evening', '20:00'::time, '19:00'::time, '22:00'::time, 0, array[3,6,10], 'medium', 'tap_taken', 10, 'gentle_sound', 'balanced');

  -- Insert Asthma Journey
  insert into public.journeys (id, user_id, name, status, start_date, preset)
  values (journey_asthma_id, test_user_id, 'Asthma', 'active', current_date - interval '14 days', 'assertive');

  -- Insert Asthma Medications
  insert into public.medications (id, journey_id, user_id, name, dosage, start_date, status)
  values
    (med_asthma_001_id, journey_asthma_id, test_user_id, 'Albuterol', '90mcg/puff', current_date - interval '14 days', 'active'),
    (med_asthma_002_id, journey_asthma_id, test_user_id, 'Fluticasone', '44mcg/puff', current_date - interval '14 days', 'active');

  -- Insert Asthma Medication Schedules
  insert into public.medication_schedules (medication_id, journey_id, user_id, period, target_time, window_start, window_end)
  values
    (med_asthma_001_id, journey_asthma_id, test_user_id, 'morning', '08:00'::time, '07:00'::time, '10:00'::time),
    (med_asthma_001_id, journey_asthma_id, test_user_id, 'noon', '14:00'::time, '13:00'::time, '15:00'::time),
    (med_asthma_001_id, journey_asthma_id, test_user_id, 'evening', '20:00'::time, '19:00'::time, '22:00'::time),
    (med_asthma_002_id, journey_asthma_id, test_user_id, 'morning', '08:00'::time, '07:00'::time, '10:00'::time),
    (med_asthma_002_id, journey_asthma_id, test_user_id, 'evening', '20:00'::time, '19:00'::time, '22:00'::time);

  -- Insert Asthma Journey Session Configs
  insert into public.journey_session_configs (
    journey_id, user_id, period, target_time, window_start, window_end,
    reminder_offset_minutes, escalation_intervals_minutes, max_escalation_level,
    completion_method, ask_later_minutes, sound_mode, preset
  )
  values
    (journey_asthma_id, test_user_id, 'morning', '08:00'::time, '07:00'::time, '10:00'::time, 0, array[2,4,6], 'high', 'photo_and_confirm', 5, 'escalating_sound', 'assertive'),
    (journey_asthma_id, test_user_id, 'noon', '14:00'::time, '13:00'::time, '15:00'::time, 0, array[2,4,6], 'high', 'photo_and_confirm', 5, 'escalating_sound', 'assertive'),
    (journey_asthma_id, test_user_id, 'evening', '20:00'::time, '19:00'::time, '22:00'::time, 0, array[2,4,6], 'high', 'photo_and_confirm', 5, 'escalating_sound', 'assertive');

  -- Insert sample dose events
  insert into public.dose_events (user_id, journey_id, medication_id, scheduled_for, action_taken_at, status)
  select test_user_id, journey_hp_id, med_hp_001_id,
    (current_date - i)::date + '08:00'::time,
    case when i <= 2 then (current_date - i)::date + '08:05'::time
         when i = 3 then (current_date - i)::date + '10:30'::time
         else null end,
    case when i <= 2 then 'taken' when i = 3 then 'late' else 'missed' end
  from generate_series(1, 7) as i;

  insert into public.dose_events (user_id, journey_id, medication_id, scheduled_for, action_taken_at, status)
  select test_user_id, journey_hp_id, med_hp_002_id,
    (current_date - i)::date + '20:00'::time,
    case when i <= 3 then (current_date - i)::date + '20:10'::time else null end,
    case when i <= 3 then 'taken' else 'pending' end
  from generate_series(1, 5) as i;

  raise notice 'Seed data created for user: %', test_user_id;
end $$;
