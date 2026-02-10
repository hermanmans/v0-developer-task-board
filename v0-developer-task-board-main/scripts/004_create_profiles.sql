create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  company text,
  company_logo_url text,
  invite_emails text[] default '{}'::text[],
  contact_number text,
  disclaimer_accepted boolean default false,
  popia_accepted boolean default false,
  github_token_enc text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = user_id);
