-- Create journey_session_configs table
-- Stores default or session-specific reminder behavior

create table public.journey_session_configs (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  schedule_id uuid references public.medication_schedules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('morning', 'noon', 'afternoon', 'evening', 'bedtime')),
  target_time time not null,
  window_start time not null,
  window_end time not null,
  reminder_offset_minutes int not null default 0,
  escalation_intervals_minutes int[] not null default array[3, 6, 10],
  max_escalation_level text not null default 'medium' check (max_escalation_level in ('low', 'medium', 'high')),
  completion_method text not null default 'tap_taken' check (completion_method in ('tap_taken', 'photo', 'photo_and_confirm', 'none')),
  ask_later_minutes int not null default 10,
  sound_mode text not null default 'gentle_sound' check (sound_mode in ('silent', 'vibrate', 'gentle_sound', 'escalating_sound')),
  prep_reminder_enabled boolean not null default false,
  prep_reminder_minutes int,
  carry_reminder_enabled boolean not null default false,
  preset text not null default 'balanced' check (preset in ('gentle', 'balanced', 'assertive', 'custom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_time_window check (window_start < target_time and target_time < window_end),
  constraint valid_prep_reminder check (
    (prep_reminder_enabled = false and prep_reminder_minutes is null) or
    (prep_reminder_enabled = true and prep_reminder_minutes is not null and prep_reminder_minutes > 0)
  )
);

-- Enable Row Level Security
alter table public.journey_session_configs enable row level security;

-- RLS Policies for journey_session_configs
create policy "Users can read their own session configs"
  on public.journey_session_configs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own session configs"
  on public.journey_session_configs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own session configs"
  on public.journey_session_configs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own session configs"
  on public.journey_session_configs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Allow anonymous users
create policy "Anonymous users can read their own session configs"
  on public.journey_session_configs
  for select
  to anon
  using (auth.uid() = user_id);

create policy "Anonymous users can insert their own session configs"
  on public.journey_session_configs
  for insert
  to anon
  with check (auth.uid() = user_id);

create policy "Anonymous users can update their own session configs"
  on public.journey_session_configs
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anonymous users can delete their own session configs"
  on public.journey_session_configs
  for delete
  to anon
  using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger journey_session_configs_updated_at
  before update on public.journey_session_configs
  for each row
  execute function public.handle_updated_at();

-- Create indexes
create index journey_session_configs_journey_id_idx on public.journey_session_configs(journey_id);
create index journey_session_configs_schedule_id_idx on public.journey_session_configs(schedule_id);
create index journey_session_configs_user_id_idx on public.journey_session_configs(user_id);
create index journey_session_configs_period_idx on public.journey_session_configs(period);
