-- Phase 2: entries テーブルと RLS。
-- Supabase Dashboard → SQL Editor でこのファイルを実行する。
-- Phase 1 の app_members は参照のみ。変更・削除しない。
-- public.is_app_member() は使わない。

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  title text not null,
  place_name text,
  latitude double precision,
  longitude double precision,
  visited_on date,
  memo text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entries_status_check
    check (status in ('visited', 'wishlist')),
  constraint entries_latitude_range
    check (latitude is null or (latitude >= -90 and latitude <= 90)),
  constraint entries_longitude_range
    check (longitude is null or (longitude >= -180 and longitude <= 180)),
  constraint entries_visited_on_by_status
    check (
      (status = 'visited' and visited_on is not null)
      or (status = 'wishlist')
    )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row
  execute function public.set_updated_at();

alter table public.entries enable row level security;
alter table public.entries force row level security;

revoke all on table public.entries from anon, public;
grant select, insert, update, delete on table public.entries to authenticated;

drop policy if exists "members can select entries" on public.entries;
create policy "members can select entries"
  on public.entries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.app_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "members can insert own entries" on public.entries;
create policy "members can insert own entries"
  on public.entries
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.app_members
      where user_id = auth.uid()
    )
    and created_by = auth.uid()
  );

drop policy if exists "members can update entries" on public.entries;
create policy "members can update entries"
  on public.entries
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.app_members
      where user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.app_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "members can delete entries" on public.entries;
create policy "members can delete entries"
  on public.entries
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.app_members
      where user_id = auth.uid()
    )
  );
