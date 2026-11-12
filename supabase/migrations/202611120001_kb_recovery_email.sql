-- Migration: Add recovery_email and recovery_email_verified to kb_profiles
-- Purpose: Enable Supabase Auth password recovery flow for Komunitas Belajar users

alter table public.kb_profiles
  add column if not exists recovery_email text,
  add column if not exists recovery_email_verified boolean not null default false;

-- Create index for quick lookup by recovery_email while keeping RLS safe
create index if not exists kb_profiles_recovery_email_idx
  on public.kb_profiles(recovery_email)
  where recovery_email is not null;

