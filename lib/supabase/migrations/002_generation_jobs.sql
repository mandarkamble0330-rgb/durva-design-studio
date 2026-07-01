-- Run this in your Supabase SQL Editor to create the generation_jobs table

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in (
    'draft', 'queued', 'preparing_prompt', 'ready_for_ai',
    'generating', 'completed', 'failed', 'cancelled'
  )),
  prompt text,
  ai_provider text,
  ai_model text,
  ai_response text,
  image_urls text[] not null default '{}',
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_generation_jobs_project_id on public.generation_jobs(project_id);
create index if not exists idx_generation_jobs_user_id on public.generation_jobs(user_id);
create index if not exists idx_generation_jobs_status on public.generation_jobs(status);
create index if not exists idx_generation_jobs_created_at on public.generation_jobs(created_at desc);

-- Auto-update updated_at
drop trigger if exists on_generation_job_updated on public.generation_jobs;
create trigger on_generation_job_updated
  before update on public.generation_jobs
  for each row execute function public.handle_updated_at();

-- RLS policies
alter table public.generation_jobs enable row level security;

create policy "Users can view own generation jobs"
  on public.generation_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own generation jobs"
  on public.generation_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own generation jobs"
  on public.generation_jobs for update
  using (auth.uid() = user_id);

create policy "Users can delete own generation jobs"
  on public.generation_jobs for delete
  using (auth.uid() = user_id);
