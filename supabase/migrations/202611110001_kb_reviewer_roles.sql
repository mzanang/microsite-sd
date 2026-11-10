update public.kb_menu_permissions
set access_level = 'lihat', updated_at = now()
where role_key = 'pengawas'
  and menu_key = 'verifikasi';
