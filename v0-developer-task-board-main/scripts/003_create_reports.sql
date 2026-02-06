-- Reports table: external bug/feature/task/improvement reports from users
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  type text not null default 'bug' check (type in ('bug', 'feature', 'improvement', 'task')),
  priority text not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
  reporter_name text not null,
  reporter_email text not null default '',
  status text not null default 'open' check (status in ('open', 'accepted', 'declined')),
  user_id uuid not null references auth.users(id) on delete cascade,
  promoted_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add report_id column to tasks table for linking back to original report
alter table public.tasks add column if not exists report_id uuid references public.reports(id) on delete set null;

-- Enable RLS
alter table public.reports enable row level security;

-- RLS policies: users can CRUD their own reports
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports for select using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert with check (auth.uid() = user_id);

drop policy if exists "reports_update_own" on public.reports;
create policy "reports_update_own" on public.reports for update using (auth.uid() = user_id);

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own" on public.reports for delete using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_reports_user_id on public.reports(user_id);
create index if not exists idx_reports_created_at on public.reports(created_at desc);
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_tasks_report_id on public.tasks(report_id);

-- Auto-update updated_at trigger
create or replace function public.update_reports_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists reports_updated_at on public.reports;
create trigger reports_updated_at
  before update on public.reports
  for each row
  execute function public.update_reports_updated_at();
