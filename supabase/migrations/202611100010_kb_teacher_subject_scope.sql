alter table public.kb_profiles
  add column if not exists teaching_subject text;

alter table public.kb_profiles
  add column if not exists teaching_grades smallint[] not null default '{}'::smallint[];

alter table public.kb_profiles
  drop constraint if exists kb_profiles_teaching_grades_check;

alter table public.kb_profiles
  add constraint kb_profiles_teaching_grades_check
  check (teaching_grades <@ array[1, 2, 3, 4, 5, 6]::smallint[]);
