create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default 'Admin Sekolah',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.microsites (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  address text not null default '',
  maps_url text not null default '',
  latitude numeric(18,15) not null default -6.969480,
  longitude numeric(18,15) not null default 109.098568,
  published_title text not null default '',
  published_description text not null default '',
  published_address text not null default '',
  published_maps_url text not null default '',
  published_latitude numeric(18,15) not null default -6.969480,
  published_longitude numeric(18,15) not null default 109.098568,
  publication_status text not null default 'draft' check (publication_status in ('draft','published')),
  last_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.microsite_settings (
  id uuid primary key default gen_random_uuid(),
  microsite_id uuid not null unique references public.microsites(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  published_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.microsite_components (
  id uuid primary key default gen_random_uuid(),
  microsite_id uuid not null references public.microsites(id) on delete cascade,
  component_type text not null check (component_type in ('service_links','location','contact','link','text','image','embed','divider','whatsapp','email','instagram','phone')),
  title text not null,
  config jsonb not null default '{}'::jsonb,
  published_config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_enabled boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(microsite_id, component_type)
);

alter table public.microsite_settings add column if not exists published_settings jsonb not null default '{}'::jsonb;
alter table public.microsite_components add column if not exists published_config jsonb not null default '{}'::jsonb;
alter table public.microsites add column if not exists published_title text not null default '';
alter table public.microsites add column if not exists published_description text not null default '';
alter table public.microsites add column if not exists published_address text not null default '';
alter table public.microsites add column if not exists published_maps_url text not null default '';
alter table public.microsites add column if not exists latitude numeric(18,15) not null default -6.969480;
alter table public.microsites add column if not exists longitude numeric(18,15) not null default 109.098568;
alter table public.microsites add column if not exists published_latitude numeric(18,15) not null default -6.969480;
alter table public.microsites add column if not exists published_longitude numeric(18,15) not null default 109.098568;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  microsite_id uuid not null references public.microsites(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/svg+xml')),
  file_size bigint not null check (file_size > 0 and file_size <= 5242880),
  alt_text text not null default '',
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.publication_versions (
  id uuid primary key default gen_random_uuid(),
  microsite_id uuid not null references public.microsites(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  published_by uuid references auth.users(id),
  published_at timestamptz not null default now(),
  unique(microsite_id, version_number)
);

create index if not exists microsite_components_order_idx on public.microsite_components(microsite_id, sort_order);
create index if not exists publication_versions_site_idx on public.publication_versions(microsite_id, published_at desc);

alter table public.admin_profiles enable row level security;
alter table public.microsites enable row level security;
alter table public.microsite_settings enable row level security;
alter table public.microsite_components enable row level security;
alter table public.media_assets enable row level security;
alter table public.publication_versions enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.admin_profiles where user_id = auth.uid() and is_active = true); $$;

drop policy if exists "public reads published microsites" on public.microsites;
create policy "public reads published microsites" on public.microsites for select using (publication_status = 'published' or public.is_admin());
drop policy if exists "admins manage microsites" on public.microsites;
create policy "admins manage microsites" on public.microsites for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public reads published settings" on public.microsite_settings;
create policy "public reads published settings" on public.microsite_settings for select using (exists(select 1 from public.microsites m where m.id = microsite_id and m.publication_status = 'published') or public.is_admin());
drop policy if exists "admins manage settings" on public.microsite_settings;
create policy "admins manage settings" on public.microsite_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "public reads published components" on public.microsite_components;
create policy "public reads published components" on public.microsite_components for select using ((is_published = true and exists(select 1 from public.microsites m where m.id = microsite_id and m.publication_status = 'published')) or public.is_admin());
drop policy if exists "admins manage components" on public.microsite_components;
create policy "admins manage components" on public.microsite_components for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage media" on public.media_assets;
create policy "admins manage media" on public.media_assets for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins read publication versions" on public.publication_versions;
create policy "admins read publication versions" on public.publication_versions for select using (public.is_admin());
drop policy if exists "admins write publication versions" on public.publication_versions;
create policy "admins write publication versions" on public.publication_versions for insert with check (public.is_admin());
drop policy if exists "admins read own profile" on public.admin_profiles;
create policy "admins read own profile" on public.admin_profiles for select using (user_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public) values ('microsite-media', 'microsite-media', true) on conflict (id) do nothing;
drop policy if exists "public reads microsite media" on storage.objects;
create policy "public reads microsite media" on storage.objects for select using (bucket_id = 'microsite-media');
drop policy if exists "admins upload microsite media" on storage.objects;
create policy "admins upload microsite media" on storage.objects for insert with check (bucket_id = 'microsite-media' and public.is_admin());
drop policy if exists "admins update microsite media" on storage.objects;
create policy "admins update microsite media" on storage.objects for update using (bucket_id = 'microsite-media' and public.is_admin());
drop policy if exists "admins delete microsite media" on storage.objects;
create policy "admins delete microsite media" on storage.objects for delete using (bucket_id = 'microsite-media' and public.is_admin());

create or replace function public.publish_microsite(p_microsite_slug text, p_publisher uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_site public.microsites; v_version integer; v_snapshot jsonb;
begin
  if not exists(select 1 from public.admin_profiles where user_id = auth.uid() and is_active = true) then raise exception 'not authorized'; end if;
  select * into v_site from public.microsites where slug = p_microsite_slug for update;
  if v_site.id is null then raise exception 'microsite not found'; end if;
  select coalesce(max(version_number), 0) + 1 into v_version from public.publication_versions where microsite_id = v_site.id;
  update public.microsite_settings set published_settings = settings, updated_at = now() where microsite_id = v_site.id;
  update public.microsite_components set published_config = config, is_published = true, updated_at = now() where microsite_id = v_site.id;
  update public.microsites set published_title = title, published_description = coalesce(description, ''), published_address = address, published_maps_url = maps_url, published_latitude = latitude, published_longitude = longitude where id = v_site.id;
  select * into v_site from public.microsites where id = v_site.id;
  v_snapshot := jsonb_build_object('microsite', to_jsonb(v_site), 'settings', (select jsonb_build_object('settings', s.published_settings) from public.microsite_settings s where s.microsite_id = v_site.id), 'components', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'component_type', c.component_type, 'title', c.title, 'config', c.published_config, 'sort_order', c.sort_order, 'is_enabled', c.is_enabled) order by c.sort_order), '[]'::jsonb) from public.microsite_components c where c.microsite_id = v_site.id));
  update public.microsites set publication_status = 'published', last_published_at = now(), updated_at = now() where id = v_site.id;
  insert into public.publication_versions(microsite_id, version_number, snapshot, published_by) values (v_site.id, v_version, v_snapshot, p_publisher);
  return jsonb_build_object('version', v_version, 'published_at', now());
end; $$;

grant execute on function public.publish_microsite(text, uuid) to authenticated;

insert into public.microsites (slug, title, description, address, maps_url, latitude, longitude, published_latitude, published_longitude, publication_status) values ('sd-negeri-dukuhwaru-01', 'SD NEGERI DUKUHWARU 01', 'Ruang informasi dan layanan digital sekolah untuk keluarga besar SD Negeri Dukuhwaru 01.', 'Jl. Hayam Wuruk No. 1, Desa Dukuhwaru, Kecamatan Dukuhwaru, Kabupaten Tegal, Jawa Tengah, 52451', 'https://maps.google.com/?q=SD+Negeri+Dukuhwaru+01', -6.969480, 109.098568, -6.969480, 109.098568, 'published') on conflict (slug) do nothing;

do $$
declare v_site uuid;
begin
  select id into v_site from public.microsites where slug = 'sd-negeri-dukuhwaru-01';
  insert into public.microsite_settings (microsite_id, settings) values (v_site, jsonb_build_object(
    'primary_color', '#2F6B55', 'accent_color', '#D7864A', 'page_background', '#F6F3EC', 'text_color', '#19342B',
    'font_family', 'poppins', 'content_width', 'standard', 'card_radius', 'soft', 'element_spacing', 'comfortable',
    'card_style', 'solid', 'overlay_opacity', 0.12, 'background_position', 'center', 'background_url', '', 'banner_url', '', 'logo_url', ''
  )) on conflict (microsite_id) do nothing;
  insert into public.microsite_components (microsite_id, component_type, title, config, sort_order, is_enabled, is_published) values
    (v_site, 'service_links', 'Komponen sekolah', jsonb_build_object('links', jsonb_build_array(
      jsonb_build_object('id','tkad','title','Informasi TKAD','description','Akses informasi dan jadwal layanan TKAD.','href','https://example.com/tkad','icon','book-open','is_enabled',true,'sort_order',1),
      jsonb_build_object('id','public','title','Pelayanan Publik','description','Informasi administrasi dan layanan sekolah.','href','https://example.com/pelayanan','icon','landmark','is_enabled',true,'sort_order',2),
      jsonb_build_object('id','complaint','title','Layanan Pengaduan','description','Sampaikan pertanyaan atau masukan kepada sekolah.','href','https://example.com/pengaduan','icon','message-circle','is_enabled',true,'sort_order',3),
      jsonb_build_object('id','library','title','e-Perpus','description','Otomasi perpustakaan sekolah.','href','https://example.com/eperpus','icon','library','is_enabled',true,'sort_order',4)
    )), 1, true, true),
    (v_site, 'location', 'Temukan kami', '{}'::jsonb, 2, true, true),
    (v_site, 'contact', 'Terhubung bersama kami', jsonb_build_object('contacts', jsonb_build_array(
      jsonb_build_object('id','instagram','label','Instagram','value','@sdndukuhwaru01','href','https://instagram.com/','icon','instagram','is_enabled',true),
      jsonb_build_object('id','youtube','label','YouTube','value','SDN Dukuhwaru 01','href','https://youtube.com/','icon','youtube','is_enabled',true),
      jsonb_build_object('id','email','label','Email','value','sdndukuhwaru1@gmail.com','href','mailto:sdndukuhwaru1@gmail.com','icon','mail','is_enabled',true),
      jsonb_build_object('id','whatsapp','label','WhatsApp','value','Hubungi admin sekolah','href','https://wa.me/','icon','whatsapp','is_enabled',true)
    )), 3, true, true)
  on conflict (microsite_id, component_type) do nothing;
  update public.microsite_settings set published_settings = settings where microsite_id = v_site and published_settings = '{}'::jsonb and settings <> '{}'::jsonb;
  update public.microsite_components set published_config = config where microsite_id = v_site and published_config = '{}'::jsonb and config <> '{}'::jsonb;
  update public.microsites set published_title = title, published_description = coalesce(description, ''), published_address = address, published_maps_url = maps_url, published_latitude = latitude, published_longitude = longitude where id = v_site and published_title = '';
end $$;
