-- Create profiles table
-- Stores app-level user profile data

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- RLS Policies for profiles
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Allow anonymous users to manage their profiles
create policy "Anonymous users can read their own profile"
  on public.profiles
  for select
  to anon
  using (auth.uid() = id);

create policy "Anonymous users can insert their own profile"
  on public.profiles
  for insert
  to anon
  with check (auth.uid() = id);

create policy "Anonymous users can update their own profile"
  on public.profiles
  for update
  to anon
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Create indexes
create index profiles_created_at_idx on public.profiles(created_at);
