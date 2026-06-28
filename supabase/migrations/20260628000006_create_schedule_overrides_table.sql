-- Create schedule_overrides table
-- Captures user edits and their apply scope

create table public.schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  schedule_id uuid references public.medication_schedules(id) on delete cascade,
  effective_date date not null,
  scope text not null check (scope in ('once', 'from_date', 'entire_course')),
  period text not null check (period in ('morning', 'noon', 'afternoon', 'evening', 'bedtime')),
  target_time time not null,
  window_start time not null,
  window_end time not null,
  config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_time_window check (window_start < target_time and target_time < window_end)
);

-- Enable Row Level Security
alter table public.schedule_overrides enable row level security;

-- RLS Policies for schedule_overrides
create policy "Users can read their own overrides"
  on public.schedule_overrides
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own overrides"
  on public.schedule_overrides
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own overrides"
  on public.schedule_overrides
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own overrides"
  on public.schedule_overrides
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Allow anonymous users
create policy "Anonymous users can read their own overrides"
  on public.schedule_overrides
  for select
  to anon
  using (auth.uid() = user_id);

create policy "Anonymous users can insert their own overrides"
  on public.schedule_overrides
  for insert
  to anon
  with check (auth.uid() = user_id);

create policy "Anonymous users can update their own overrides"
  on public.schedule_overrides
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anonymous users can delete their own overrides"
  on public.schedule_overrides
  for delete
  to anon
  using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger schedule_overrides_updated_at
  before update on public.schedule_overrides
  for each row
  execute function public.handle_updated_at();

-- Create indexes
create index schedule_overrides_user_id_idx on public.schedule_overrides(user_id);
create index schedule_overrides_journey_id_idx on public.schedule_overrides(journey_id);
create index schedule_overrides_schedule_id_idx on public.schedule_overrides(schedule_id);
create index schedule_overrides_effective_date_idx on public.schedule_overrides(effective_date);
create index schedule_overrides_user_id_effective_date_idx on public.schedule_overrides(user_id, effective_date);
