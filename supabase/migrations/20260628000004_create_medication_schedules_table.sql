-- Create medication_schedules table
-- Defines the default recurring sessions for each medication

create table public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('morning', 'noon', 'afternoon', 'evening', 'bedtime')),
  target_time time not null,
  window_start time not null,
  window_end time not null,
  days_of_week int[] check (
    days_of_week is null or (
      array_length(days_of_week, 1) > 0 and
      days_of_week <@ array[0,1,2,3,4,5,6]
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_time_window check (window_start < target_time and target_time < window_end)
);

-- Enable Row Level Security
alter table public.medication_schedules enable row level security;

-- RLS Policies for medication_schedules
create policy "Users can read their own schedules"
  on public.medication_schedules
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own schedules"
  on public.medication_schedules
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own schedules"
  on public.medication_schedules
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own schedules"
  on public.medication_schedules
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Allow anonymous users
create policy "Anonymous users can read their own schedules"
  on public.medication_schedules
  for select
  to anon
  using (auth.uid() = user_id);

create policy "Anonymous users can insert their own schedules"
  on public.medication_schedules
  for insert
  to anon
  with check (auth.uid() = user_id);

create policy "Anonymous users can update their own schedules"
  on public.medication_schedules
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anonymous users can delete their own schedules"
  on public.medication_schedules
  for delete
  to anon
  using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger medication_schedules_updated_at
  before update on public.medication_schedules
  for each row
  execute function public.handle_updated_at();

-- Create indexes
create index medication_schedules_medication_id_idx on public.medication_schedules(medication_id);
create index medication_schedules_journey_id_idx on public.medication_schedules(journey_id);
create index medication_schedules_user_id_idx on public.medication_schedules(user_id);
create index medication_schedules_period_idx on public.medication_schedules(period);
