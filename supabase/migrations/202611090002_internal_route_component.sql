alter table public.microsite_components
  drop constraint if exists microsite_components_component_type_check;

alter table public.microsite_components
  add constraint microsite_components_component_type_check
  check (component_type in (
    'service_links',
    'location',
    'contact',
    'link',
    'text',
    'image',
    'embed',
    'divider',
    'whatsapp',
    'email',
    'instagram',
    'phone',
    'internal_route'
  ));

do $$
declare
  v_microsite_id uuid;
begin
  select id into v_microsite_id
  from public.microsites
  where slug = 'sd-negeri-dukuhwaru-01';

  if v_microsite_id is not null and not exists (
    select 1
    from public.microsite_components
    where microsite_id = v_microsite_id
      and component_type = 'internal_route'
      and (config->>'href') = '/komunitas-belajar'
  ) then
    insert into public.microsite_components (
      microsite_id,
      component_type,
      title,
      config,
      published_config,
      sort_order,
      is_enabled,
      is_published
    ) values (
      v_microsite_id,
      'internal_route',
      'Komunitas Belajar Guru',
      jsonb_build_object(
        'href', '/komunitas-belajar',
        'body', 'Portal administrasi dan kegiatan komunitas belajar guru.',
        'icon', 'users'
      ),
      jsonb_build_object(
        'href', '/komunitas-belajar',
        'body', 'Portal administrasi dan kegiatan komunitas belajar guru.',
        'icon', 'users'
      ),
      coalesce((select max(sort_order) + 1 from public.microsite_components where microsite_id = v_microsite_id), 1),
      true,
      true
    );
  end if;
end $$;
