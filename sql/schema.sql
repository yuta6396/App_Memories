-- Phase 1: app_members のみ。
-- Supabase Dashboard → SQL Editor で実行する。

create table if not exists public.app_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.app_members enable row level security;

drop policy if exists "users can read own membership" on public.app_members;
create policy "users can read own membership"
  on public.app_members
  for select
  to authenticated
  using (user_id = auth.uid());

-- 後のテーブル用。RLS 再帰を避けるため SECURITY DEFINER。
create or replace function public.is_app_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_members
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_app_member() from public;
grant execute on function public.is_app_member() to authenticated;

-- 2人を追加する例（Authentication → Users の UUID に置き換える）:
-- insert into public.app_members (user_id, display_name)
-- values
--   ('00000000-0000-0000-0000-000000000001', 'Partner A'),
--   ('00000000-0000-0000-0000-000000000002', 'Partner B');
