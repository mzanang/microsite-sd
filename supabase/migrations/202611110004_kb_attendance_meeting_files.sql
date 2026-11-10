alter table public.kb_attendance_sessions
  add column if not exists meeting_number integer,
  add column if not exists attendance_file_path text,
  add column if not exists attendance_file_name text,
  add column if not exists attendance_file_mime_type text;

with numbered_sessions as (
  select id, row_number() over (order by created_at asc, id asc)::integer as meeting_number
  from public.kb_attendance_sessions
)
update public.kb_attendance_sessions as session
set meeting_number = numbered_sessions.meeting_number
from numbered_sessions
where numbered_sessions.id = session.id
  and session.meeting_number is null;

alter table public.kb_attendance_sessions
  alter column meeting_number set default 1,
  alter column meeting_number set not null;

alter table public.kb_attendance_sessions
  drop constraint if exists kb_attendance_sessions_meeting_number_check;

alter table public.kb_attendance_sessions
  add constraint kb_attendance_sessions_meeting_number_check check (meeting_number > 0);
