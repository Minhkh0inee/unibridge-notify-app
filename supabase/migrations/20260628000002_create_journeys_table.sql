-- Create journeys table
-- Represents a medication journey or treatment course

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null check (status in ('active', 'paused', 'completed', 'cancelled')),
  start_date date not null,
  end_date date,
  preset text not null default 'balanced' check (preset in ('gentle', 'balanced', 'assertive', 'custom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.journeys enable row level security;

-- RLS Policies for journeys
create policy "Users can read their own journeys"
  on public.journeys
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own journeys"
  on public.journeys
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own journeys"
  on public.journeys
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own journeys"
  on public.journeys
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Allow anonymous users
create policy "Anonymous users can read their own journeys"
  on public.journeys
  for select
  to anon
  using (auth.uid() = user_id);

create policy "Anonymous users can insert their own journeys"
  on public.journeys
  for insert
  to anon
  with check (auth.uid() = user_id);

create policy "Anonymous users can update their own journeys"
  on public.journeys
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anonymous users can delete their own journeys"
  on public.journeys
  for delete
  to anon
  using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger journeys_updated_at
  before update on public.journeys
  for each row
  execute function public.handle_updated_at();

-- Create indexes
create index journeys_user_id_idx on public.journeys(user_id);
create index journeys_status_idx on public.journeys(status);
create index journeys_start_date_idx on public.journeys(start_date);
create index journeys_user_id_status_idx on public.journeys(user_id, status);
