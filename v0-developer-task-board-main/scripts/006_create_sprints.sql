-- Sprint status enum
do $$ begin
  create type sprint_status as enum ('planned', 'active', 'completed');
exception when duplicate_object then null;
end $$;

-- Sprints table
create table if not exists public.sprints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status sprint_status not null default 'planned',
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date <= end_date)
);

-- Ticket fields for scrum support
alter table public.tasks add column if not exists sprint_id uuid references public.sprints(id) on delete set null;
alter table public.tasks add column if not exists story_points integer;
alter table public.tasks add column if not exists completed_at timestamptz;

alter table public.tasks
  drop constraint if exists tasks_story_points_check;

alter table public.tasks
  add constraint tasks_story_points_check
  check (story_points is null or story_points in (1, 2, 3, 5, 8, 13, 21));

-- One active sprint max per board owner
create unique index if not exists idx_sprints_one_active_per_user
  on public.sprints(user_id)
  where status = 'active';

-- Enable RLS
alter table public.sprints enable row level security;

drop policy if exists "sprints_select_own" on public.sprints;
drop policy if exists "sprints_insert_own" on public.sprints;
drop policy if exists "sprints_update_own" on public.sprints;
drop policy if exists "sprints_delete_own" on public.sprints;

create policy "sprints_select_own" on public.sprints
  for select using (auth.uid() = user_id);

create policy "sprints_insert_own" on public.sprints
  for insert with check (auth.uid() = user_id);

create policy "sprints_update_own" on public.sprints
  for update using (auth.uid() = user_id);

create policy "sprints_delete_own" on public.sprints
  for delete using (auth.uid() = user_id);

-- Trigger for updated_at
drop trigger if exists sprints_updated_at on public.sprints;
create trigger sprints_updated_at
  before update on public.sprints
  for each row
  execute function public.update_updated_at();

-- Indexes
create index if not exists idx_sprints_user_id on public.sprints(user_id);
create index if not exists idx_sprints_dates on public.sprints(start_date, end_date);
create index if not exists idx_tasks_sprint_id on public.tasks(sprint_id);
create index if not exists idx_tasks_completed_at on public.tasks(completed_at);
