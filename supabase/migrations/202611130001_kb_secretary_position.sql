alter table public.kb_profiles
  drop constraint if exists kb_profiles_community_position_check;

alter table public.kb_profiles
  add constraint kb_profiles_community_position_check
  check (community_position is null or community_position in ('ketua', 'sekretaris', 'anggota'));

alter table public.kb_menu_permissions
  drop constraint if exists kb_menu_permissions_role_key_check;

alter table public.kb_menu_permissions
  add constraint kb_menu_permissions_role_key_check
  check (role_key in ('ketua', 'sekretaris', 'anggota', 'ks', 'pengawas'));

insert into public.kb_menu_permissions (role_key, menu_key, access_level, is_active)
select 'sekretaris', menu_key, access_level, is_active
from public.kb_menu_permissions
where role_key = 'ketua'
on conflict (role_key, menu_key) do update
set access_level = excluded.access_level,
    is_active = excluded.is_active,
    updated_at = now();

drop policy if exists "kb users read community entries" on public.kb_community_entries;
create policy "kb users read community entries"
  on public.kb_community_entries for select to authenticated
  using (
    public.kb_current_profile_id() is not null
    and (
      is_published = true
      or public.kb_current_role() = 'super_admin'
      or exists (
        select 1
        from public.kb_profiles p
        where p.id = public.kb_current_profile_id()
          and p.role = 'guru'
          and p.community_position in ('ketua', 'sekretaris')
      )
    )
  );

drop policy if exists "kb ketua manage community entries" on public.kb_community_entries;
create policy "kb ketua manage community entries"
  on public.kb_community_entries for all to authenticated
  using (
    public.kb_current_role() = 'super_admin'
    or exists (
      select 1
      from public.kb_profiles p
      where p.id = public.kb_current_profile_id()
        and p.role = 'guru'
        and p.community_position in ('ketua', 'sekretaris')
    )
  )
  with check (
    public.kb_current_role() = 'super_admin'
    or exists (
      select 1
      from public.kb_profiles p
      where p.id = public.kb_current_profile_id()
        and p.role = 'guru'
        and p.community_position in ('ketua', 'sekretaris')
    )
  );

drop policy if exists "kb ketua create attendance sessions" on public.kb_attendance_sessions;
create policy "kb ketua create attendance sessions"
  on public.kb_attendance_sessions for insert to authenticated
  with check (
    public.kb_current_role() = 'super_admin'
    or exists (
      select 1
      from public.kb_profiles p
      where p.id = public.kb_current_profile_id()
        and p.role = 'guru'
        and p.community_position in ('ketua', 'sekretaris')
    )
  );

drop policy if exists "kb users mark attendance" on public.kb_attendance_records;
create policy "kb users mark attendance"
  on public.kb_attendance_records for insert to authenticated
  with check (
    (profile_id = public.kb_current_profile_id() and public.kb_current_role() in ('guru', 'kepala_sekolah'))
    or public.kb_current_role() = 'super_admin'
    or exists (
      select 1
      from public.kb_profiles p
      where p.id = public.kb_current_profile_id()
        and p.role = 'guru'
        and p.community_position in ('ketua', 'sekretaris')
    )
  );

drop policy if exists "kb users update attendance" on public.kb_attendance_records;
create policy "kb users update attendance"
  on public.kb_attendance_records for update to authenticated
  using (
    (profile_id = public.kb_current_profile_id() and public.kb_current_role() in ('guru', 'kepala_sekolah'))
    or public.kb_current_role() = 'super_admin'
    or exists (
      select 1
      from public.kb_profiles p
      where p.id = public.kb_current_profile_id()
        and p.role = 'guru'
        and p.community_position in ('ketua', 'sekretaris')
    )
  )
  with check (
    (profile_id = public.kb_current_profile_id() and public.kb_current_role() in ('guru', 'kepala_sekolah'))
    or public.kb_current_role() = 'super_admin'
    or exists (
      select 1
      from public.kb_profiles p
      where p.id = public.kb_current_profile_id()
        and p.role = 'guru'
        and p.community_position in ('ketua', 'sekretaris')
    )
  );

create or replace function public.get_kb_public_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'school', (
      select jsonb_build_object(
        'name', s.name,
        'description', s.description,
        'address', s.address,
        'logo_url', s.logo_url
      )
      from public.kb_school s
      where s.is_published = true
      order by s.created_at
      limit 1
    ),
    'principal', (
      select jsonb_build_object(
        'name', p.full_name,
        'teacher_type', coalesce(p.teacher_type, ''),
        'title', coalesce(p.public_title, 'Kepala Sekolah'),
        'community_position', null
      )
      from public.kb_profiles p
      where p.role = 'kepala_sekolah'
        and p.is_active = true
        and p.is_public = true
      order by p.public_sort_order, p.full_name
      limit 1
    ),
    'teachers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', p.full_name,
          'teacher_type', coalesce(p.teacher_type, 'Guru'),
          'title', coalesce(p.public_title, ''),
          'community_position', coalesce(p.community_position, 'anggota')
        )
        order by case when p.community_position = 'ketua' then 0 when p.community_position = 'sekretaris' then 1 else 2 end, p.public_sort_order, p.full_name
      )
      from public.kb_profiles p
      where p.role = 'guru'
        and p.is_active = true
        and p.is_public = true
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_kb_public_overview() from public, anon, authenticated;
grant execute on function public.get_kb_public_overview() to anon, authenticated;
