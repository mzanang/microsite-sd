create or replace function public.get_public_visitor_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
  v_total_visits bigint;
begin
  select id into v_site_id
  from public.microsites
  where slug = 'sd-negeri-dukuhwaru-01'
    and publication_status = 'published';

  if v_site_id is null then
    return jsonb_build_object('total_visits', 0);
  end if;

  select count(*) into v_total_visits
  from public.analytics_events
  where microsite_id = v_site_id
    and event_type = 'session_start';

  return jsonb_build_object('total_visits', coalesce(v_total_visits, 0));
end;
$$;

revoke all on function public.get_public_visitor_stats() from public, anon, authenticated;
grant execute on function public.get_public_visitor_stats() to anon, authenticated;
