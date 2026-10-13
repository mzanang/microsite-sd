create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  microsite_id uuid not null references public.microsites(id) on delete cascade,
  event_type text not null check (event_type in ('page_view', 'session_start', 'link_click', 'download')),
  page_path text not null default '/' check (char_length(page_path) between 1 and 240),
  page_title text not null default '' check (char_length(page_title) <= 160),
  target_url text check (target_url is null or char_length(target_url) <= 1000),
  session_id text not null check (char_length(session_id) between 16 and 128),
  visitor_id text not null check (char_length(visitor_id) between 16 and 128),
  referrer_source text not null default 'direct' check (referrer_source in ('direct', 'search', 'social', 'referral', 'unknown')),
  device_category text not null default 'unknown' check (device_category in ('mobile', 'desktop', 'tablet', 'unknown')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_site_time_idx on public.analytics_events(microsite_id, occurred_at desc);
create index if not exists analytics_events_site_type_time_idx on public.analytics_events(microsite_id, event_type, occurred_at desc);
create index if not exists analytics_events_site_path_time_idx on public.analytics_events(microsite_id, page_path, occurred_at desc);
create index if not exists analytics_events_site_visitor_time_idx on public.analytics_events(microsite_id, visitor_id, occurred_at desc);

alter table public.analytics_events enable row level security;
grant insert on table public.analytics_events to anon, authenticated;
grant select on table public.analytics_events to authenticated;

drop policy if exists "public can record published microsite analytics" on public.analytics_events;
create policy "public can record published microsite analytics"
  on public.analytics_events for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.microsites m
      where m.id = microsite_id and m.publication_status = 'published'
    )
    and occurred_at between now() - interval '15 minutes' and now() + interval '5 minutes'
  );

drop policy if exists "admins read microsite analytics" on public.analytics_events;
create policy "admins read microsite analytics"
  on public.analytics_events for select
  to authenticated
  using (public.is_admin());

create or replace function public.get_analytics_summary(
  p_microsite_slug text,
  p_from timestamptz,
  p_to timestamptz,
  p_granularity text default 'day'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_to <= p_from then raise exception 'invalid analytics range'; end if;
  if p_granularity not in ('day', 'week', 'month') then raise exception 'invalid analytics granularity'; end if;

  select id into v_site_id from public.microsites where slug = p_microsite_slug;
  if v_site_id is null then raise exception 'microsite not found'; end if;

  return jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'visits', count(*) filter (where event_type = 'session_start'),
        'unique_visitors', count(distinct visitor_id),
        'page_views', count(*) filter (where event_type = 'page_view'),
        'interactions', count(*) filter (where event_type in ('link_click', 'download'))
      )
      from public.analytics_events
      where microsite_id = v_site_id and occurred_at >= p_from and occurred_at < p_to
    ),
    'trend', coalesce((
      select jsonb_agg(to_jsonb(bucketed) order by bucketed.bucket)
      from (
        select
          date_trunc(p_granularity, occurred_at at time zone 'Asia/Jakarta') as bucket,
          count(*) filter (where event_type = 'session_start') as visits,
          count(distinct visitor_id) as unique_visitors,
          count(*) filter (where event_type = 'page_view') as page_views,
          count(*) filter (where event_type in ('link_click', 'download')) as interactions
        from public.analytics_events
        where microsite_id = v_site_id and occurred_at >= p_from and occurred_at < p_to
        group by 1
      ) bucketed
    ), '[]'::jsonb),
    'popular_pages', coalesce((
      select jsonb_agg(to_jsonb(pages) order by pages.page_views desc, pages.page_path)
      from (
        select
          page_path,
          max(page_title) as page_title,
          count(*) filter (where event_type = 'page_view') as page_views,
          count(distinct visitor_id) as unique_visitors
        from public.analytics_events
        where microsite_id = v_site_id and occurred_at >= p_from and occurred_at < p_to
        group by page_path
        order by page_views desc, page_path
        limit 50
      ) pages
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(to_jsonb(sources) order by sources.count desc, sources.source)
      from (
        select referrer_source as source, count(*) as count
        from public.analytics_events
        where microsite_id = v_site_id and occurred_at >= p_from and occurred_at < p_to
        group by referrer_source
      ) sources
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(to_jsonb(devices) order by devices.count desc, devices.device)
      from (
        select device_category as device, count(distinct visitor_id) as count
        from public.analytics_events
        where microsite_id = v_site_id and occurred_at >= p_from and occurred_at < p_to
        group by device_category
      ) devices
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_analytics_summary(text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.get_analytics_summary(text, timestamptz, timestamptz, text) to authenticated;
