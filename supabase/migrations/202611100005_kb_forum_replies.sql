create table if not exists public.kb_forum_replies (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.kb_community_entries(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_by uuid references public.kb_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kb_forum_replies_entry_idx
  on public.kb_forum_replies(entry_id, created_at asc);

alter table public.kb_forum_replies enable row level security;
revoke all on table public.kb_forum_replies from public, anon;
grant select, insert, update, delete on table public.kb_forum_replies to authenticated;

drop policy if exists "kb users read forum replies" on public.kb_forum_replies;
create policy "kb users read forum replies"
  on public.kb_forum_replies for select to authenticated
  using (public.kb_current_profile_id() is not null);

drop policy if exists "kb users create forum replies" on public.kb_forum_replies;
create policy "kb users create forum replies"
  on public.kb_forum_replies for insert to authenticated
  with check (created_by = public.kb_current_profile_id());

drop policy if exists "kb users manage own forum replies" on public.kb_forum_replies;
create policy "kb users manage own forum replies"
  on public.kb_forum_replies for update to authenticated
  using (created_by = public.kb_current_profile_id() or public.kb_current_role() = 'super_admin')
  with check (created_by = public.kb_current_profile_id() or public.kb_current_role() = 'super_admin');

drop policy if exists "kb users delete own forum replies" on public.kb_forum_replies;
create policy "kb users delete own forum replies"
  on public.kb_forum_replies for delete to authenticated
  using (created_by = public.kb_current_profile_id() or public.kb_current_role() = 'super_admin');
