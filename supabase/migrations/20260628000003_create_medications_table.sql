-- Create medications table
-- Stores medication details

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  active_ingredient text,
  dosage text not null,
  instructions text,
  icon_url text,
  start_date date not null,
  end_date date,
  status text not null check (status in ('active', 'paused', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.medications enable row level security;

-- RLS Policies for medications
create policy "Users can read their own medications"
  on public.medications
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own medications"
  on public.medications
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own medications"
  on public.medications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own medications"
  on public.medications
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Allow anonymous users
create policy "Anonymous users can read their own medications"
  on public.medications
  for select
  to anon
  using (auth.uid() = user_id);

create policy "Anonymous users can insert their own medications"
  on public.medications
  for insert
  to anon
  with check (auth.uid() = user_id);

create policy "Anonymous users can update their own medications"
  on public.medications
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anonymous users can delete their own medications"
  on public.medications
  for delete
  to anon
  using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger medications_updated_at
  before update on public.medications
  for each row
  execute function public.handle_updated_at();

-- Create indexes
create index medications_journey_id_idx on public.medications(journey_id);
create index medications_user_id_idx on public.medications(user_id);
create index medications_status_idx on public.medications(status);
create index medications_user_id_status_idx on public.medications(user_id, status);
