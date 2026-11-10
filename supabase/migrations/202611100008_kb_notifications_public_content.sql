alter table public.kb_notifications
  add column if not exists link_url text,
  add column if not exists dedupe_key text,
  add column if not exists available_at timestamptz not null default now();

create unique index if not exists kb_notifications_dedupe_idx
  on public.kb_notifications(dedupe_key)
  where dedupe_key is not null;

create index if not exists kb_notifications_available_idx
  on public.kb_notifications(recipient_profile_id, read_at, available_at, created_at desc);
