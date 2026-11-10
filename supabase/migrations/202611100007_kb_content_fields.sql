alter table public.kb_community_entries
  add column if not exists meeting_number integer,
  add column if not exists event_date date,
  add column if not exists category text not null default '',
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists is_pinned boolean not null default false;

create index if not exists kb_community_entries_meeting_idx
  on public.kb_community_entries(menu_key, event_date desc, meeting_number asc);
