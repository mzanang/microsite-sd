-- Repair submissions that were reviewed before the realtime status trigger existed.
update public.kb_submissions as submission
set status = review.status,
    updated_at = coalesce(review.updated_at, now())
from public.kb_reviews as review
where review.submission_id = submission.id
  and review.reviewer_role = 'kepala_sekolah'
  and submission.status is distinct from review.status;

-- Ketua Kombel needs row-level visibility so Supabase Realtime can deliver
-- submission updates to the Tugas Masuk screen.
drop policy if exists "kb teachers read own submissions" on public.kb_submissions;
create policy "kb teachers read own submissions"
  on public.kb_submissions for select to authenticated
  using (
    teacher_profile_id = public.kb_current_profile_id()
    or public.kb_is_reviewer()
    or exists (
      select 1
      from public.kb_profiles p
      where p.id = public.kb_current_profile_id()
        and p.role = 'guru'
        and p.community_position = 'ketua'
    )
  );
