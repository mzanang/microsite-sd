alter table public.kb_attendance_sessions
  add column if not exists material_entry_id uuid references public.kb_community_entries(id) on delete restrict,
  add column if not exists active_from timestamptz,
  add column if not exists active_until timestamptz;

create index if not exists kb_attendance_sessions_material_idx
  on public.kb_attendance_sessions(material_entry_id, event_date desc);

alter table public.kb_attendance_sessions
  drop constraint if exists kb_attendance_sessions_active_window_check;

alter table public.kb_attendance_sessions
  add constraint kb_attendance_sessions_active_window_check
  check (active_from is null or active_until is null or active_until > active_from);
