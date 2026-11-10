create or replace function public.get_kb_public_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'school', (
      select jsonb_build_object('name', s.name, 'description', s.description, 'address', s.address, 'logo_url', s.logo_url)
      from public.kb_school s
      where s.is_published = true
      order by s.created_at
      limit 1
    ),
    'principal', (
      select jsonb_build_object('name', p.full_name, 'teacher_type', coalesce(p.teacher_type, ''), 'title', coalesce(p.public_title, 'Kepala Sekolah'))
      from public.kb_profiles p
      where p.role = 'kepala_sekolah' and p.is_active = true and p.is_public = true
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
        order by case when p.community_position = 'ketua' then 0 else 1 end, case when p.teacher_type = 'Guru Kelas' then 0 else 1 end, p.teaching_grade nulls last, p.public_sort_order, p.full_name
      )
      from public.kb_profiles p
      where p.role = 'guru' and p.is_active = true and p.is_public = true
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_kb_public_overview() from public, anon, authenticated;
grant execute on function public.get_kb_public_overview() to anon, authenticated;
