-- 全体スキーマ（Phase 1 + Phase 2）。
-- 既存プロジェクトで Phase 1 済みなら、追加分は sql/phase2_entries.sql だけ実行する。

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

-- 2人を追加する例（Authentication → Users の UUID に置き換える）:
-- insert into public.app_members (user_id, display_name)
-- values
--   ('00000000-0000-0000-0000-000000000001', 'Partner A'),
--   ('00000000-0000-0000-0000-000000000002', 'Partner B');

-- ---------------------------------------------------------------------------
-- Phase 2: entries
-- 追加実行は sql/phase2_entries.sql と同じ内容。
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Phase 3: photos と Private Storage
-- 追加実行は sql/phase3_photos.sql と同じ内容。
-- ---------------------------------------------------------------------------

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  storage_path text not null unique,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;
alter table public.photos force row level security;

revoke all on table public.photos from anon, public;
grant select, insert, update, delete on table public.photos to authenticated;

drop policy if exists "members can select photos" on public.photos;
create policy "members can select photos"
  on public.photos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.app_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "members can insert photos" on public.photos;
create policy "members can insert photos"
  on public.photos
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

drop policy if exists "members can update photos" on public.photos;
create policy "members can update photos"
  on public.photos
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

drop policy if exists "members can delete photos" on public.photos;
create policy "members can delete photos"
  on public.photos
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.app_members
      where user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('memory-photos', 'memory-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "members can select memory-photos" on storage.objects;
create policy "members can select memory-photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'memory-photos'
    and exists (
      select 1
      from public.app_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "members can insert memory-photos" on storage.objects;
create policy "members can insert memory-photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'memory-photos'
    and exists (
      select 1
      from public.app_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "members can update memory-photos" on storage.objects;
create policy "members can update memory-photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'memory-photos'
    and exists (
      select 1
      from public.app_members
      where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'memory-photos'
    and exists (
      select 1
      from public.app_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "members can delete memory-photos" on storage.objects;
create policy "members can delete memory-photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'memory-photos'
    and exists (
      select 1
      from public.app_members
      where user_id = auth.uid()
    )
  );
