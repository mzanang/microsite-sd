create table if not exists public.kb_community_entries (
  id uuid primary key default gen_random_uuid(),
  menu_key text not null check (menu_key in ('materi', 'dokumentasi', 'praktik_baik', 'forum')),
  title text not null check (char_length(title) between 2 and 180),
  body text not null default '',
  external_url text,
  is_published boolean not null default true,
  created_by uuid references public.kb_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kb_community_entries_menu_idx
  on public.kb_community_entries(menu_key, is_published, created_at desc);

create table if not exists public.kb_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 180),
  event_date date not null,
  location text not null default '',
  notes text not null default '',
  created_by uuid not null references public.kb_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kb_attendance_sessions_date_idx
  on public.kb_attendance_sessions(event_date desc, created_at desc);

create table if not exists public.kb_attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.kb_attendance_sessions(id) on delete cascade,
  profile_id uuid not null references public.kb_profiles(id) on delete cascade,
  status text not null default 'hadir' check (status in ('hadir', 'izin', 'sakit', 'alpa')),
  note text not null default '',
  marked_at timestamptz not null default now(),
  unique (session_id, profile_id)
);

create index if not exists kb_attendance_records_session_idx
  on public.kb_attendance_records(session_id, status);

alter table public.kb_community_entries enable row level security;
alter table public.kb_attendance_sessions enable row level security;
alter table public.kb_attendance_records enable row level security;

revoke all on table public.kb_community_entries, public.kb_attendance_sessions, public.kb_attendance_records from public, anon;
grant select on table public.kb_community_entries, public.kb_attendance_sessions, public.kb_attendance_records to authenticated;
grant insert, update, delete on table public.kb_community_entries, public.kb_attendance_sessions, public.kb_attendance_records to authenticated;

drop policy if exists "kb users read community entries" on public.kb_community_entries;
create policy "kb users read community entries"
  on public.kb_community_entries for select to authenticated
  using (public.kb_current_profile_id() is not null and (is_published = true or public.kb_current_role() = 'super_admin' or exists (select 1 from public.kb_profiles p where p.id = public.kb_current_profile_id() and p.role = 'guru' and p.community_position = 'ketua')));

drop policy if exists "kb ketua manage community entries" on public.kb_community_entries;
create policy "kb ketua manage community entries"
  on public.kb_community_entries for all to authenticated
  using (public.kb_current_role() = 'super_admin' or exists (select 1 from public.kb_profiles p where p.id = public.kb_current_profile_id() and p.role = 'guru' and p.community_position = 'ketua'))
  with check (public.kb_current_role() = 'super_admin' or exists (select 1 from public.kb_profiles p where p.id = public.kb_current_profile_id() and p.role = 'guru' and p.community_position = 'ketua'));

drop policy if exists "kb users read attendance sessions" on public.kb_attendance_sessions;
create policy "kb users read attendance sessions"
  on public.kb_attendance_sessions for select to authenticated
  using (public.kb_current_profile_id() is not null);

drop policy if exists "kb ketua create attendance sessions" on public.kb_attendance_sessions;
create policy "kb ketua create attendance sessions"
  on public.kb_attendance_sessions for insert to authenticated
  with check (public.kb_current_role() = 'super_admin' or exists (select 1 from public.kb_profiles p where p.id = public.kb_current_profile_id() and p.role = 'guru' and p.community_position = 'ketua'));

drop policy if exists "kb ketua update attendance sessions" on public.kb_attendance_sessions;
create policy "kb ketua update attendance sessions"
  on public.kb_attendance_sessions for update to authenticated
  using (public.kb_current_role() = 'super_admin' or created_by = public.kb_current_profile_id())
  with check (public.kb_current_role() = 'super_admin' or created_by = public.kb_current_profile_id());

drop policy if exists "kb users read attendance records" on public.kb_attendance_records;
create policy "kb users read attendance records"
  on public.kb_attendance_records for select to authenticated
  using (public.kb_current_profile_id() is not null);

drop policy if exists "kb users mark attendance" on public.kb_attendance_records;
create policy "kb users mark attendance"
  on public.kb_attendance_records for insert to authenticated
  with check (profile_id = public.kb_current_profile_id() or public.kb_current_role() = 'super_admin' or exists (select 1 from public.kb_profiles p where p.id = public.kb_current_profile_id() and p.role = 'guru' and p.community_position = 'ketua'));

drop policy if exists "kb users update attendance" on public.kb_attendance_records;
create policy "kb users update attendance"
  on public.kb_attendance_records for update to authenticated
  using (profile_id = public.kb_current_profile_id() or public.kb_current_role() = 'super_admin' or exists (select 1 from public.kb_profiles p where p.id = public.kb_current_profile_id() and p.role = 'guru' and p.community_position = 'ketua'))
  with check (profile_id = public.kb_current_profile_id() or public.kb_current_role() = 'super_admin' or exists (select 1 from public.kb_profiles p where p.id = public.kb_current_profile_id() and p.role = 'guru' and p.community_position = 'ketua'));
