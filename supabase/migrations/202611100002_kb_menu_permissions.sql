create table if not exists public.kb_menu_permissions (
  id uuid primary key default gen_random_uuid(),
  role_key text not null check (role_key in ('ketua', 'anggota', 'ks', 'pengawas')),
  menu_key text not null,
  access_level text not null check (access_level in ('lihat', 'kelola', 'monitoring')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_key, menu_key)
);

create index if not exists kb_menu_permissions_role_idx
  on public.kb_menu_permissions(role_key, is_active, menu_key);

alter table public.kb_menu_permissions enable row level security;
revoke all on table public.kb_menu_permissions from public, anon;
grant select on table public.kb_menu_permissions to authenticated;
grant insert, update, delete on table public.kb_menu_permissions to authenticated;

drop policy if exists "kb users read active menu permissions" on public.kb_menu_permissions;
create policy "kb users read active menu permissions"
  on public.kb_menu_permissions for select to authenticated
  using (is_active = true and public.kb_current_profile_id() is not null);

drop policy if exists "kb super admins manage menu permissions" on public.kb_menu_permissions;
create policy "kb super admins manage menu permissions"
  on public.kb_menu_permissions for all to authenticated
  using (public.kb_current_role() = 'super_admin')
  with check (public.kb_current_role() = 'super_admin');

insert into public.kb_menu_permissions (role_key, menu_key, access_level)
values
  ('ketua', 'dashboard', 'lihat'),
  ('ketua', 'upload_sk', 'kelola'),
  ('ketua', 'materi', 'kelola'),
  ('ketua', 'dokumentasi', 'kelola'),
  ('ketua', 'praktik_baik', 'kelola'),
  ('ketua', 'forum', 'kelola'),
  ('ketua', 'upload_tugas', 'kelola'),
  ('ketua', 'memberikan_tugas', 'kelola'),
  ('ketua', 'daftar_hadir', 'kelola'),
  ('ketua', 'profil', 'kelola'),
  ('anggota', 'dashboard', 'lihat'),
  ('anggota', 'materi', 'lihat'),
  ('anggota', 'forum', 'lihat'),
  ('anggota', 'upload_tugas', 'kelola'),
  ('anggota', 'daftar_hadir', 'kelola'),
  ('anggota', 'profil', 'kelola'),
  ('ks', 'dashboard', 'lihat'),
  ('ks', 'upload_sk', 'lihat'),
  ('ks', 'materi', 'lihat'),
  ('ks', 'dokumentasi', 'lihat'),
  ('ks', 'praktik_baik', 'lihat'),
  ('ks', 'forum', 'lihat'),
  ('ks', 'upload_tugas', 'lihat'),
  ('ks', 'daftar_hadir', 'monitoring'),
  ('ks', 'verifikasi', 'kelola'),
  ('ks', 'grafik', 'lihat'),
  ('ks', 'monitoring', 'lihat'),
  ('ks', 'profil', 'kelola'),
  ('pengawas', 'dashboard', 'lihat'),
  ('pengawas', 'upload_sk', 'lihat'),
  ('pengawas', 'materi', 'lihat'),
  ('pengawas', 'dokumentasi', 'lihat'),
  ('pengawas', 'praktik_baik', 'lihat'),
  ('pengawas', 'forum', 'lihat'),
  ('pengawas', 'upload_tugas', 'lihat'),
  ('pengawas', 'daftar_hadir', 'monitoring'),
  ('pengawas', 'verifikasi', 'kelola'),
  ('pengawas', 'grafik', 'lihat'),
  ('pengawas', 'monitoring', 'lihat'),
  ('pengawas', 'profil', 'kelola')
on conflict (role_key, menu_key) do update
set access_level = excluded.access_level,
    is_active = true,
    updated_at = now();
