-- Create comments table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.comments enable row level security;

-- Policies: users can CRUD their own comments and read comments on their own tasks
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select using (
    auth.uid() = user_id
    or task_id in (select id from public.tasks where user_id = auth.uid())
  );

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "comments_update" on public.comments;
create policy "comments_update" on public.comments
  for update using (auth.uid() = user_id);

drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments
  for delete using (auth.uid() = user_id);

-- Index for fast lookups by task
create index if not exists idx_comments_task_id on public.comments(task_id);
create index if not exists idx_comments_created_at on public.comments(created_at);
