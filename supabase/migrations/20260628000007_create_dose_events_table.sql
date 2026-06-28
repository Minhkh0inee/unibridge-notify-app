-- Create dose_events table
-- Stores actual user behavior

create table public.dose_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade,
  schedule_id uuid references public.medication_schedules(id) on delete set null,
  scheduled_for timestamptz not null,
  action_taken_at timestamptz,
  status text not null check (status in ('pending', 'taken', 'skipped', 'late', 'missed')),
  photo_uri text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.dose_events enable row level security;

-- RLS Policies for dose_events
create policy "Users can read their own dose events"
  on public.dose_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own dose events"
  on public.dose_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own dose events"
  on public.dose_events
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own dose events"
  on public.dose_events
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Allow anonymous users
create policy "Anonymous users can read their own dose events"
  on public.dose_events
  for select
  to anon
  using (auth.uid() = user_id);

create policy "Anonymous users can insert their own dose events"
  on public.dose_events
  for insert
  to anon
  with check (auth.uid() = user_id);

create policy "Anonymous users can update their own dose events"
  on public.dose_events
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anonymous users can delete their own dose events"
  on public.dose_events
  for delete
  to anon
  using (auth.uid() = user_id);

-- Create indexes
create index dose_events_user_id_idx on public.dose_events(user_id);
create index dose_events_journey_id_idx on public.dose_events(journey_id);
create index dose_events_medication_id_idx on public.dose_events(medication_id);
create index dose_events_schedule_id_idx on public.dose_events(schedule_id);
create index dose_events_scheduled_for_idx on public.dose_events(scheduled_for);
create index dose_events_status_idx on public.dose_events(status);
create index dose_events_user_id_scheduled_for_idx on public.dose_events(user_id, scheduled_for desc);
