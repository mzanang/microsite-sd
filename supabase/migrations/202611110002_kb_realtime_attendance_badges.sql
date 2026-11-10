-- Keep the teacher-facing submission status aligned with the Kepala Sekolah review.
create or replace function public.kb_sync_submission_status_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reviewer_role = 'kepala_sekolah' then
    update public.kb_submissions
    set status = new.status,
        updated_at = coalesce(new.updated_at, now())
    where id = new.submission_id;
  end if;
  return new;
end;
$$;

drop trigger if exists kb_sync_submission_status_from_review on public.kb_reviews;
create trigger kb_sync_submission_status_from_review
after insert or update of status, updated_at on public.kb_reviews
for each row execute function public.kb_sync_submission_status_from_review();

drop policy if exists "kb reviewers create own reviews" on public.kb_reviews;
create policy "kb reviewers create own reviews"
  on public.kb_reviews for insert to authenticated
  with check (
    reviewer_profile_id = public.kb_current_profile_id()
    and reviewer_role = 'kepala_sekolah'
    and public.kb_current_role() in ('kepala_sekolah', 'super_admin')
  );

drop policy if exists "kb reviewers update own reviews" on public.kb_reviews;
create policy "kb reviewers update own reviews"
  on public.kb_reviews for update to authenticated
  using (reviewer_profile_id = public.kb_current_profile_id() and reviewer_role = 'kepala_sekolah' and public.kb_current_role() in ('kepala_sekolah', 'super_admin'))
  with check (reviewer_profile_id = public.kb_current_profile_id() and reviewer_role = 'kepala_sekolah' and public.kb_current_role() in ('kepala_sekolah', 'super_admin'));

drop policy if exists "kb users mark attendance" on public.kb_attendance_records;
create policy "kb users mark attendance"
  on public.kb_attendance_records for insert to authenticated
  with check (
    (profile_id = public.kb_current_profile_id() and public.kb_current_role() in ('guru', 'kepala_sekolah'))
    or public.kb_current_role() = 'super_admin'
    or exists (select 1 from public.kb_profiles p where p.id = public.kb_current_profile_id() and p.role = 'guru' and p.community_position = 'ketua')
  );

drop policy if exists "kb users update attendance" on public.kb_attendance_records;
create policy "kb users update attendance"
  on public.kb_attendance_records for update to authenticated
  using (
    (profile_id = public.kb_current_profile_id() and public.kb_current_role() in ('guru', 'kepala_sekolah'))
    or public.kb_current_role() = 'super_admin'
    or exists (select 1 from public.kb_profiles p where p.id = public.kb_current_profile_id() and p.role = 'guru' and p.community_position = 'ketua')
  )
  with check (
    (profile_id = public.kb_current_profile_id() and public.kb_current_role() in ('guru', 'kepala_sekolah'))
    or public.kb_current_role() = 'super_admin'
    or exists (select 1 from public.kb_profiles p where p.id = public.kb_current_profile_id() and p.role = 'guru' and p.community_position = 'ketua')
  );

do $$
declare
  table_name text;
begin
  foreach table_name in array array['kb_submissions', 'kb_reviews', 'kb_attendance_sessions', 'kb_attendance_records', 'kb_notifications'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
