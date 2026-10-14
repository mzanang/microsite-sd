alter table public.media_assets
  drop constraint if exists media_assets_mime_type_check;

alter table public.media_assets
  add constraint media_assets_mime_type_check
  check (mime_type in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime'
  ));

alter table public.media_assets
  drop constraint if exists media_assets_file_size_check;

alter table public.media_assets
  add constraint media_assets_file_size_check
  check (file_size > 0 and file_size <= 104857600);
