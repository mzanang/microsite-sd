alter table public.kb_document_requirements
  add column if not exists attendance_session_id uuid references public.kb_attendance_sessions(id) on delete set null;

create index if not exists kb_requirements_attendance_session_idx
  on public.kb_document_requirements(attendance_session_id);
