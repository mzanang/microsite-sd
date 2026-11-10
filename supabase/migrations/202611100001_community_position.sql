alter table public.kb_profiles
  add column if not exists community_position text;

alter table public.kb_profiles
  drop constraint if exists kb_profiles_community_position_check;

alter table public.kb_profiles
  add constraint kb_profiles_community_position_check
  check (community_position is null or community_position in ('ketua', 'anggota'));

update public.kb_profiles
set community_position = 'anggota'
where role = 'guru' and community_position is null;

update public.kb_profiles
set community_position = null
where role <> 'guru';
