alter table public.kb_community_entries
  add column if not exists session_id uuid references public.kb_attendance_sessions(id) on delete set null;

create index if not exists kb_community_entries_session_idx
  on public.kb_community_entries(session_id, created_at desc);
