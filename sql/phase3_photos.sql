-- Phase 3: photos テーブルと Private Storage RLS。
-- Supabase Dashboard → SQL Editor でこのファイルを実行する。
-- Phase 1 の app_members、Phase 2 の entries は変更・削除しない。
-- public.is_app_member() は使わない。

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
