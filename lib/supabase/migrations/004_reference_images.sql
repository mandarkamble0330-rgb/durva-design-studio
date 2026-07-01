-- Run this in your Supabase SQL Editor to create the reference_images table

create table if not exists public.reference_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  init_image_id text,
  fingerprint text not null,
  width integer not null default 0,
  height integer not null default 0,
  file_size integer not null default 0,
  file_type text not null default 'image/png',
  is_primary boolean not null default false,
  booth_view text check (booth_view is null or booth_view in (
    'perspective', 'front', 'left', 'right', 'rear'
  )),
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_reference_images_project_id on public.reference_images(project_id);
create index if not exists idx_reference_images_user_id on public.reference_images(user_id);
create index if not exists idx_reference_images_fingerprint on public.reference_images(project_id, fingerprint);
create index if not exists idx_reference_images_primary on public.reference_images(project_id, is_primary) where is_primary = true;
create index if not exists idx_reference_images_booth_view on public.reference_images(project_id, booth_view) where booth_view is not null;

-- Unique constraint: one fingerprint per project (prevents duplicates)
create unique index if not exists idx_reference_images_unique_fingerprint
  on public.reference_images(project_id, fingerprint);

-- Unique constraint: one image per booth view per project
create unique index if not exists idx_reference_images_unique_view
  on public.reference_images(project_id, booth_view) where booth_view is not null;

-- RLS policies
alter table public.reference_images enable row level security;

create policy "Users can view own reference images"
  on public.reference_images for select
  using (auth.uid() = user_id);

create policy "Users can insert own reference images"
  on public.reference_images for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reference images"
  on public.reference_images for update
  using (auth.uid() = user_id);

create policy "Users can delete own reference images"
  on public.reference_images for delete
  using (auth.uid() = user_id);
