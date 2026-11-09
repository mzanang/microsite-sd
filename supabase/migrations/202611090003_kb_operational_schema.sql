create table if not exists public.kb_document_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_by uuid references public.kb_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kb_academic_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default true,
  created_by uuid references public.kb_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table if not exists public.kb_document_requirements (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.kb_document_categories(id) on delete restrict,
  period_id uuid not null references public.kb_academic_periods(id) on delete restrict,
  name text not null,
  description text not null default '',
  collection_method text not null default 'both' check (collection_method in ('file', 'link', 'both')),
  is_required boolean not null default true,
  due_at timestamptz,
  max_file_size_bytes bigint not null default 20971520 check (max_file_size_bytes > 0 and max_file_size_bytes <= 104857600),
  allowed_mime_types text[] not null default array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png']::text[],
  allowed_link_domains text[] not null default array['drive.google.com','docs.google.com','onedrive.live.com','1drv.ms','dropbox.com','www.dropbox.com']::text[],
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_by uuid references public.kb_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, period_id, name)
);

create table if not exists public.kb_submissions (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.kb_document_requirements(id) on delete restrict,
  teacher_profile_id uuid not null references public.kb_profiles(id) on delete restrict,
  status text not null default 'belum_diunggah' check (status in ('belum_diunggah','menunggu_pemeriksaan','lengkap','perlu_perbaikan')),
  current_version_no integer not null default 0 check (current_version_no >= 0),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requirement_id, teacher_profile_id)
);

create table if not exists public.kb_submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.kb_submissions(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  collection_method text not null check (collection_method in ('file', 'link')),
  storage_path text,
  original_name text,
  mime_type text,
  file_size bigint,
  external_url text,
  submitted_by uuid not null references public.kb_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (submission_id, version_no),
  check (
    (collection_method = 'file' and storage_path is not null and original_name is not null and mime_type is not null and file_size is not null and external_url is null)
    or
    (collection_method = 'link' and external_url is not null and storage_path is null and original_name is null and mime_type is null and file_size is null)
  )
);

create table if not exists public.kb_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.kb_submissions(id) on delete cascade,
  reviewer_profile_id uuid not null references public.kb_profiles(id) on delete restrict,
  reviewer_role text not null check (reviewer_role in ('kepala_sekolah', 'pengawas_dabin')),
  status text not null check (status in ('menunggu_pemeriksaan','lengkap','perlu_perbaikan')),
  notes text not null default '',
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, reviewer_role)
);

create table if not exists public.kb_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.kb_profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.kb_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.kb_profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists kb_requirements_period_idx on public.kb_document_requirements(period_id, is_active, sort_order);
create index if not exists kb_requirements_category_idx on public.kb_document_requirements(category_id, is_active, sort_order);
create index if not exists kb_submissions_teacher_idx on public.kb_submissions(teacher_profile_id, status, updated_at desc);
create index if not exists kb_submissions_requirement_idx on public.kb_submissions(requirement_id, status);
create index if not exists kb_versions_submission_idx on public.kb_submission_versions(submission_id, version_no desc);
create index if not exists kb_reviews_submission_idx on public.kb_reviews(submission_id, reviewer_role, reviewed_at desc);
create index if not exists kb_activity_logs_created_idx on public.kb_activity_logs(created_at desc);
create index if not exists kb_notifications_recipient_idx on public.kb_notifications(recipient_profile_id, read_at, created_at desc);

create or replace function public.kb_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.kb_profiles
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.kb_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.kb_profiles
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.kb_is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.kb_current_role() in ('super_admin', 'kepala_sekolah', 'pengawas_dabin'), false);
$$;

revoke all on function public.kb_current_profile_id() from public, anon;
revoke all on function public.kb_current_role() from public, anon;
revoke all on function public.kb_is_reviewer() from public, anon;
grant execute on function public.kb_current_profile_id() to authenticated;
grant execute on function public.kb_current_role() to authenticated;
grant execute on function public.kb_is_reviewer() to authenticated;

alter table public.kb_document_categories enable row level security;
alter table public.kb_academic_periods enable row level security;
alter table public.kb_document_requirements enable row level security;
alter table public.kb_submissions enable row level security;
alter table public.kb_submission_versions enable row level security;
alter table public.kb_reviews enable row level security;
alter table public.kb_activity_logs enable row level security;
alter table public.kb_notifications enable row level security;

revoke all on table public.kb_document_categories, public.kb_academic_periods, public.kb_document_requirements, public.kb_submissions, public.kb_submission_versions, public.kb_reviews, public.kb_activity_logs, public.kb_notifications from public, anon;
grant select on table public.kb_profiles, public.kb_school, public.kb_document_categories, public.kb_academic_periods, public.kb_document_requirements, public.kb_submissions, public.kb_submission_versions, public.kb_reviews, public.kb_notifications to authenticated;
grant insert, update on table public.kb_submissions, public.kb_submission_versions to authenticated;
grant insert, update on table public.kb_reviews to authenticated;

drop policy if exists "kb active users read school" on public.kb_school;
create policy "kb active users read school" on public.kb_school for select to authenticated using (public.kb_current_profile_id() is not null);
drop policy if exists "kb super admins manage school" on public.kb_school;
create policy "kb super admins manage school" on public.kb_school for all to authenticated using (public.kb_current_role() = 'super_admin') with check (public.kb_current_role() = 'super_admin');
drop policy if exists "kb active users read own or public profiles" on public.kb_profiles;
create policy "kb active users read own or public profiles" on public.kb_profiles for select to authenticated using (id = public.kb_current_profile_id() or public.kb_current_role() in ('super_admin','kepala_sekolah','pengawas_dabin'));
drop policy if exists "kb super admins manage profiles" on public.kb_profiles;
create policy "kb super admins manage profiles" on public.kb_profiles for all to authenticated using (public.kb_current_role() = 'super_admin') with check (public.kb_current_role() = 'super_admin');

drop policy if exists "kb users read active categories" on public.kb_document_categories;
create policy "kb users read active categories" on public.kb_document_categories for select to authenticated using (public.kb_current_profile_id() is not null and is_active = true);
drop policy if exists "kb super admins manage categories" on public.kb_document_categories;
create policy "kb super admins manage categories" on public.kb_document_categories for all to authenticated using (public.kb_current_role() = 'super_admin') with check (public.kb_current_role() = 'super_admin');
drop policy if exists "kb users read active periods" on public.kb_academic_periods;
create policy "kb users read active periods" on public.kb_academic_periods for select to authenticated using (public.kb_current_profile_id() is not null and is_active = true);
drop policy if exists "kb super admins manage periods" on public.kb_academic_periods;
create policy "kb super admins manage periods" on public.kb_academic_periods for all to authenticated using (public.kb_current_role() = 'super_admin') with check (public.kb_current_role() = 'super_admin');
drop policy if exists "kb users read active requirements" on public.kb_document_requirements;
create policy "kb users read active requirements" on public.kb_document_requirements for select to authenticated using (public.kb_current_profile_id() is not null and is_active = true);
drop policy if exists "kb super admins manage requirements" on public.kb_document_requirements;
create policy "kb super admins manage requirements" on public.kb_document_requirements for all to authenticated using (public.kb_current_role() = 'super_admin') with check (public.kb_current_role() = 'super_admin');

drop policy if exists "kb teachers read own submissions" on public.kb_submissions;
create policy "kb teachers read own submissions" on public.kb_submissions for select to authenticated using (teacher_profile_id = public.kb_current_profile_id() or public.kb_is_reviewer());
drop policy if exists "kb teachers create own submissions" on public.kb_submissions;
create policy "kb teachers create own submissions" on public.kb_submissions for insert to authenticated with check (teacher_profile_id = public.kb_current_profile_id());
drop policy if exists "kb teachers update own submissions" on public.kb_submissions;
create policy "kb teachers update own submissions" on public.kb_submissions for update to authenticated using (teacher_profile_id = public.kb_current_profile_id()) with check (teacher_profile_id = public.kb_current_profile_id());

drop policy if exists "kb users read permitted versions" on public.kb_submission_versions;
create policy "kb users read permitted versions" on public.kb_submission_versions for select to authenticated using (exists (select 1 from public.kb_submissions s where s.id = submission_id and (s.teacher_profile_id = public.kb_current_profile_id() or public.kb_is_reviewer())));
drop policy if exists "kb teachers create own versions" on public.kb_submission_versions;
create policy "kb teachers create own versions" on public.kb_submission_versions for insert to authenticated with check (submitted_by = public.kb_current_profile_id() and exists (select 1 from public.kb_submissions s where s.id = submission_id and s.teacher_profile_id = public.kb_current_profile_id()));

drop policy if exists "kb users read permitted reviews" on public.kb_reviews;
create policy "kb users read permitted reviews" on public.kb_reviews for select to authenticated using (reviewer_profile_id = public.kb_current_profile_id() or exists (select 1 from public.kb_submissions s where s.id = submission_id and s.teacher_profile_id = public.kb_current_profile_id()) or public.kb_current_role() = 'super_admin');
drop policy if exists "kb reviewers create own reviews" on public.kb_reviews;
create policy "kb reviewers create own reviews" on public.kb_reviews for insert to authenticated with check (reviewer_profile_id = public.kb_current_profile_id() and reviewer_role = public.kb_current_role() and public.kb_current_role() in ('kepala_sekolah','pengawas_dabin'));
drop policy if exists "kb reviewers update own reviews" on public.kb_reviews;
create policy "kb reviewers update own reviews" on public.kb_reviews for update to authenticated using (reviewer_profile_id = public.kb_current_profile_id() and reviewer_role = public.kb_current_role()) with check (reviewer_profile_id = public.kb_current_profile_id() and reviewer_role = public.kb_current_role());

drop policy if exists "kb users read own notifications" on public.kb_notifications;
create policy "kb users read own notifications" on public.kb_notifications for select to authenticated using (recipient_profile_id = public.kb_current_profile_id());
drop policy if exists "kb users update own notifications" on public.kb_notifications;
create policy "kb users update own notifications" on public.kb_notifications for update to authenticated using (recipient_profile_id = public.kb_current_profile_id()) with check (recipient_profile_id = public.kb_current_profile_id());

drop policy if exists "kb users read activity logs by scope" on public.kb_activity_logs;
create policy "kb users read activity logs by scope" on public.kb_activity_logs for select to authenticated using (public.kb_current_role() = 'super_admin');

create or replace function public.kb_protect_teacher_submission_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.kb_current_role() = 'guru' and (new.status <> old.status or new.requirement_id <> old.requirement_id or new.teacher_profile_id <> old.teacher_profile_id) then
    raise exception 'teacher cannot change protected submission fields';
  end if;
  return new;
end;
$$;

drop trigger if exists kb_protect_teacher_submission_fields on public.kb_submissions;
create trigger kb_protect_teacher_submission_fields
before update on public.kb_submissions
for each row execute function public.kb_protect_teacher_submission_fields();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kb-administrasi',
  'kb-administrasi',
  false,
  20971520,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png']::text[]
)
on conflict (id) do nothing;

drop policy if exists "kb users upload through authorized paths" on storage.objects;
create policy "kb users upload through authorized paths" on storage.objects for insert to authenticated with check (bucket_id = 'kb-administrasi' and public.kb_current_profile_id() is not null);
