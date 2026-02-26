-- Enable RLS on API-exposed tables that contain user-linked data.
-- Service-role requests used by Next.js API routes will continue to work,
-- while direct anon/authenticated access is restricted by these policies.

alter table if exists public.task_views enable row level security;
alter table if exists public.push_tokens enable row level security;

-- task_views: users can only access their own view markers.
drop policy if exists task_views_select_own on public.task_views;
create policy task_views_select_own
  on public.task_views
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists task_views_insert_own on public.task_views;
create policy task_views_insert_own
  on public.task_views
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists task_views_update_own on public.task_views;
create policy task_views_update_own
  on public.task_views
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists task_views_delete_own on public.task_views;
create policy task_views_delete_own
  on public.task_views
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- push_tokens: users can register/update/remove only their own tokens.
-- No SELECT policy is created to reduce token exposure from client contexts.
drop policy if exists push_tokens_insert_own on public.push_tokens;
create policy push_tokens_insert_own
  on public.push_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists push_tokens_update_own on public.push_tokens;
create policy push_tokens_update_own
  on public.push_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists push_tokens_delete_own on public.push_tokens;
create policy push_tokens_delete_own
  on public.push_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);
