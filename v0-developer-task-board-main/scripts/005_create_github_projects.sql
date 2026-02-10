create table if not exists public.github_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  owner text not null,
  repo text not null,
  created_at timestamptz default now()
);

alter table public.github_projects enable row level security;

create policy "GitHub projects viewable by owner"
  on public.github_projects for select
  using (auth.uid() = user_id);

create policy "GitHub projects insertable by owner"
  on public.github_projects for insert
  with check (auth.uid() = user_id);

create policy "GitHub projects deletable by owner"
  on public.github_projects for delete
  using (auth.uid() = user_id);
