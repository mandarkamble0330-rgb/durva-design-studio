-- Run this in your Supabase SQL Editor to create the projects table and storage buckets

-- Projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Section 1: Project Basics
  project_name text not null,
  client_name text not null default '',
  company_name text not null default '',
  exhibition_name text not null default '',
  industry_type text not null default '',
  event_date date,

  -- Section 2: Booth Dimensions
  booth_size text not null default '',
  ceiling_height text not null default '',
  meeting_rooms integer not null default 0,
  entry_exit_points integer not null default 1,

  -- Section 3: Design Language
  design_theme text not null default '',
  primary_color text not null default '#000000',
  secondary_color text not null default '#ffffff',

  -- Section 4: Zones & Elements
  zones text[] not null default '{}',

  -- Section 5: Materials & Lighting
  flooring_type text not null default '',
  lighting_preferences text[] not null default '{}',

  -- Section 6: Client Brief
  branding_requirements text not null default '',
  product_categories text not null default '',
  required_zones text not null default '',
  display_requirements text not null default '',
  visitor_engagement text not null default '',
  color_guidelines text not null default '',

  -- Section 7: References
  logo_url text,
  reference_images text[] not null default '{}',
  reference_pdfs text[] not null default '{}',
  reference_pdf_pages text not null default '',
  additional_requirements text not null default ''
);

-- Index for fast user queries
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_created_at on public.projects(created_at desc);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_project_updated on public.projects;
create trigger on_project_updated
  before update on public.projects
  for each row execute function public.handle_updated_at();

-- RLS policies
alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Storage bucket for project files
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', true)
on conflict (id) do nothing;

create policy "Users can upload project files"
  on storage.objects for insert
  with check (bucket_id = 'project-files' and auth.role() = 'authenticated');

create policy "Users can view project files"
  on storage.objects for select
  using (bucket_id = 'project-files');

create policy "Users can delete own project files"
  on storage.objects for delete
  using (bucket_id = 'project-files' and auth.uid()::text = (storage.foldername(name))[1]);
