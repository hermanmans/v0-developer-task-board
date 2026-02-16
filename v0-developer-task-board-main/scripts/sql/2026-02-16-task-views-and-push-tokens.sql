-- Tracks when each user has viewed a task (for unread indicators)
create table if not exists public.task_views (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null,
  viewed_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index if not exists idx_task_views_user_id on public.task_views(user_id);
create index if not exists idx_task_views_task_id on public.task_views(task_id);

-- Stores Expo push tokens per user for mobile notifications
create table if not exists public.push_tokens (
  user_id uuid not null,
  token text not null,
  platform text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

create index if not exists idx_push_tokens_user_id on public.push_tokens(user_id);
