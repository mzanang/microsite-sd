alter table public.kb_profiles
  add column if not exists teaching_grade smallint;

alter table public.kb_profiles
  drop constraint if exists kb_profiles_teaching_grade_check;

alter table public.kb_profiles
  add constraint kb_profiles_teaching_grade_check
  check (teaching_grade is null or teaching_grade between 1 and 6);

create table if not exists public.kb_public_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type = 'application/pdf'),
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_published boolean not null default true,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kb_public_documents_order_idx
  on public.kb_public_documents(is_published, sort_order, created_at desc);

alter table public.kb_public_documents enable row level security;
revoke all on table public.kb_public_documents from public, anon, authenticated;
grant select on table public.kb_public_documents to anon, authenticated;

drop policy if exists "kb public reads published documents" on public.kb_public_documents;
create policy "kb public reads published documents"
  on public.kb_public_documents for select
  using (is_published = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kb-public-documents', 'kb-public-documents', true, 20971520, array['application/pdf']::text[])
on conflict (id) do update set public = true, file_size_limit = 20971520, allowed_mime_types = array['application/pdf']::text[];

drop policy if exists "public reads kb documents" on storage.objects;
create policy "public reads kb documents"
  on storage.objects for select
  using (bucket_id = 'kb-public-documents');

drop policy if exists "admins upload kb documents" on storage.objects;
create policy "admins upload kb documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'kb-public-documents' and (public.is_admin() or public.kb_current_role() = 'super_admin'));

drop policy if exists "admins update kb documents" on storage.objects;
create policy "admins update kb documents"
  on storage.objects for update to authenticated
  using (bucket_id = 'kb-public-documents' and (public.is_admin() or public.kb_current_role() = 'super_admin'))
  with check (bucket_id = 'kb-public-documents' and (public.is_admin() or public.kb_current_role() = 'super_admin'));

drop policy if exists "admins delete kb documents" on storage.objects;
create policy "admins delete kb documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'kb-public-documents' and (public.is_admin() or public.kb_current_role() = 'super_admin'));

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
      select jsonb_agg(jsonb_build_object('name', p.full_name, 'teacher_type', coalesce(p.teacher_type, 'Guru'), 'title', coalesce(p.public_title, '')) order by case when p.teacher_type = 'Guru Kelas' then 0 else 1 end, p.teaching_grade nulls last, p.public_sort_order, p.full_name)
      from public.kb_profiles p
      where p.role = 'guru' and p.is_active = true and p.is_public = true
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_kb_public_overview() from public, anon, authenticated;
grant execute on function public.get_kb_public_overview() to anon, authenticated;
