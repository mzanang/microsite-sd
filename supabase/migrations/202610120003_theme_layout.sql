update public.microsite_components
set title = 'Terhubung bersama kami'
where component_type = 'contact' and title = 'Terhubung';

update public.microsite_settings
set settings = jsonb_set(settings, '{overlay_opacity}', '0.12'::jsonb),
    published_settings = jsonb_set(published_settings, '{overlay_opacity}', '0.12'::jsonb),
    updated_at = now()
where coalesce((settings->>'overlay_opacity')::numeric, 0.3) > 0.18;
