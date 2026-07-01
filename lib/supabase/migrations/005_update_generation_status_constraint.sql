-- Run this in your Supabase SQL Editor to update the generation_jobs status constraint
-- Adds: preparing_reference, sending_to_leonardo, rendering_images

alter table public.generation_jobs
  drop constraint if exists generation_jobs_status_check;

alter table public.generation_jobs
  add constraint generation_jobs_status_check
  check (status in (
    'draft',
    'queued',
    'preparing_prompt',
    'ready_for_ai',
    'generating',
    'preparing_reference',
    'sending_to_leonardo',
    'rendering_images',
    'completed',
    'failed',
    'cancelled'
  ));
