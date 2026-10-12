alter table public.microsites
  alter column latitude type numeric(18,15) using latitude::numeric,
  alter column longitude type numeric(18,15) using longitude::numeric,
  alter column published_latitude type numeric(18,15) using published_latitude::numeric,
  alter column published_longitude type numeric(18,15) using published_longitude::numeric;

update public.microsites
set latitude = -6.969376957480174,
    longitude = 109.09867575461168,
    published_latitude = -6.969376957480174,
    published_longitude = 109.09867575461168,
    updated_at = now()
where slug = 'sd-negeri-dukuhwaru-01';
