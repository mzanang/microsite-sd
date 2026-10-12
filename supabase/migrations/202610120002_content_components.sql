alter table public.microsites add column if not exists latitude numeric(18,15) not null default -6.969480;
alter table public.microsites add column if not exists longitude numeric(18,15) not null default 109.098568;
alter table public.microsites add column if not exists published_latitude numeric(18,15) not null default -6.969480;
alter table public.microsites add column if not exists published_longitude numeric(18,15) not null default 109.098568;

alter table public.microsite_components drop constraint if exists microsite_components_microsite_id_component_type_key;
alter table public.microsite_components drop constraint if exists microsite_components_component_type_check;
alter table public.microsite_components add constraint microsite_components_component_type_check check (component_type in ('service_links','location','contact','link','text','image','embed','divider','whatsapp','email','instagram','phone'));
create index if not exists microsite_components_type_idx on public.microsite_components(microsite_id, component_type, sort_order);
update public.microsite_components set title = 'Komponen sekolah' where component_type = 'service_links' and title = 'Layanan sekolah';
update public.microsite_components set title = 'Terhubung bersama kami' where component_type = 'contact' and title = 'Terhubung';
update public.microsite_settings
set settings = jsonb_set(settings, '{overlay_opacity}', '0.12'::jsonb),
    published_settings = jsonb_set(published_settings, '{overlay_opacity}', '0.12'::jsonb)
where coalesce((settings->>'overlay_opacity')::numeric, 0.3) > 0.18;

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
