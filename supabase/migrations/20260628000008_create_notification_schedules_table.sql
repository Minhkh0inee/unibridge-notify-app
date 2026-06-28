-- Create notification_schedules table
-- Stores local notification metadata so old reminders can be cancelled after edits

create table public.notification_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  schedule_id uuid references public.medication_schedules(id) on delete cascade,
  notification_identifier text not null,
  kind text not null check (kind in ('reminder', 'prep', 'carry', 'escalation')),
  scheduled_for timestamptz not null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.notification_schedules enable row level security;

-- RLS Policies for notification_schedules
create policy "Users can read their own notification schedules"
  on public.notification_schedules
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own notification schedules"
  on public.notification_schedules
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own notification schedules"
  on public.notification_schedules
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own notification schedules"
  on public.notification_schedules
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Allow anonymous users
create policy "Anonymous users can read their own notification schedules"
  on public.notification_schedules
  for select
  to anon
  using (auth.uid() = user_id);

create policy "Anonymous users can insert their own notification schedules"
  on public.notification_schedules
  for insert
  to anon
  with check (auth.uid() = user_id);

create policy "Anonymous users can update their own notification schedules"
  on public.notification_schedules
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anonymous users can delete their own notification schedules"
  on public.notification_schedules
  for delete
  to anon
  using (auth.uid() = user_id);

-- Create indexes
create index notification_schedules_user_id_idx on public.notification_schedules(user_id);
create index notification_schedules_journey_id_idx on public.notification_schedules(journey_id);
create index notification_schedules_schedule_id_idx on public.notification_schedules(schedule_id);
create index notification_schedules_scheduled_for_idx on public.notification_schedules(scheduled_for);
create index notification_schedules_kind_idx on public.notification_schedules(kind);
create index notification_schedules_identifier_idx on public.notification_schedules(notification_identifier);
