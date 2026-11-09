create table if not exists public.kb_school (
  id uuid primary key default gen_random_uuid(),
  microsite_id uuid not null unique references public.microsites(id) on delete cascade,
  name text not null,
  description text not null default '',
  address text not null default '',
  logo_url text not null default '/logo.png',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kb_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  login_identifier text unique,
  role text not null check (role in ('super_admin', 'kepala_sekolah', 'guru', 'pengawas_dabin')),
  teacher_type text,
  public_title text,
  is_active boolean not null default true,
  is_public boolean not null default false,
  public_sort_order integer not null default 0 check (public_sort_order >= 0),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kb_profiles_public_idx
  on public.kb_profiles(is_public, is_active, role, public_sort_order, full_name);

alter table public.kb_school enable row level security;
alter table public.kb_profiles enable row level security;

revoke all on table public.kb_school from public, anon, authenticated;
revoke all on table public.kb_profiles from public, anon, authenticated;

insert into public.kb_school (microsite_id, name, description, address)
select id, title, coalesce(description, ''), address
from public.microsites
where slug = 'sd-negeri-dukuhwaru-01'
on conflict (microsite_id) do nothing;

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
        'title', coalesce(p.public_title, 'Kepala Sekolah')
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
          'title', coalesce(p.public_title, '')
        )
        order by p.public_sort_order, p.full_name
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
