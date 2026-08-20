-- Section 15/23 - hard-deleting a user must actually work for every kind of
-- account, not just ones who never created/reviewed/uploaded anything. Every
-- "who did this" column below referenced auth.users with no ON DELETE action
-- (Postgres default NO ACTION), so deleting a teacher who'd ever created a
-- lesson, an admin who'd ever posted an announcement, or a content_manager
-- who'd ever uploaded a media file failed at the database level -
-- hardDeleteDueUsers() silently logged the error and moved on, so nobody
-- with any content history actually got hard-deleted despite `deleted_at`
-- being set well past the grace period. This matches the one column that
-- already got this right (audit_logs.actor_user_id, ON DELETE SET NULL) -
-- the record survives, it just loses the "who" once that account is gone.
--
-- courses.created_by is deliberately excluded here - a course is the one
-- place a deleted creator could orphan real paying students' access, so
-- that stays a hard block at the application layer (see
-- TeacherHasCoursesError in admin-user-management.service.ts) rather than
-- silently going anonymous.
--
-- orders.user_id / invoices.user_id / refunds.processed_by move to SET NULL
-- for the same reason as the content columns, plus one more: the financial
-- trail (who paid what, who processed which refund) needs to survive
-- account deletion for accounting/legal purposes even though the account
-- itself is gone.

alter table public.academic_calendar_events alter column created_by drop not null;
alter table public.academic_calendar_events drop constraint academic_calendar_events_created_by_fkey;
alter table public.academic_calendar_events add constraint academic_calendar_events_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.announcements alter column created_by drop not null;
alter table public.announcements drop constraint announcements_created_by_fkey;
alter table public.announcements add constraint announcements_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.course_bundles alter column created_by drop not null;
alter table public.course_bundles drop constraint course_bundles_created_by_fkey;
alter table public.course_bundles add constraint course_bundles_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.courses drop constraint courses_reviewed_by_fkey;
alter table public.courses add constraint courses_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users(id) on delete set null;

alter table public.exams alter column created_by drop not null;
alter table public.exams drop constraint exams_created_by_fkey;
alter table public.exams add constraint exams_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.exams drop constraint exams_deletion_requested_by_fkey;
alter table public.exams add constraint exams_deletion_requested_by_fkey
  foreign key (deletion_requested_by) references auth.users(id) on delete set null;

alter table public.lesson_comments drop constraint lesson_comments_reviewed_by_fkey;
alter table public.lesson_comments add constraint lesson_comments_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users(id) on delete set null;

alter table public.lesson_resources alter column created_by drop not null;
alter table public.lesson_resources drop constraint lesson_resources_created_by_fkey;
alter table public.lesson_resources add constraint lesson_resources_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.lesson_resources drop constraint lesson_resources_deletion_requested_by_fkey;
alter table public.lesson_resources add constraint lesson_resources_deletion_requested_by_fkey
  foreign key (deletion_requested_by) references auth.users(id) on delete set null;

alter table public.lessons alter column created_by drop not null;
alter table public.lessons drop constraint lessons_created_by_fkey;
alter table public.lessons add constraint lessons_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.lessons drop constraint lessons_reviewed_by_fkey;
alter table public.lessons add constraint lessons_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users(id) on delete set null;

alter table public.lessons drop constraint lessons_deletion_requested_by_fkey;
alter table public.lessons add constraint lessons_deletion_requested_by_fkey
  foreign key (deletion_requested_by) references auth.users(id) on delete set null;

alter table public.media_files alter column uploaded_by drop not null;
alter table public.media_files drop constraint media_files_uploaded_by_fkey;
alter table public.media_files add constraint media_files_uploaded_by_fkey
  foreign key (uploaded_by) references auth.users(id) on delete set null;

alter table public.modules drop constraint modules_deletion_requested_by_fkey;
alter table public.modules add constraint modules_deletion_requested_by_fkey
  foreign key (deletion_requested_by) references auth.users(id) on delete set null;

alter table public.platform_settings drop constraint platform_settings_updated_by_fkey;
alter table public.platform_settings add constraint platform_settings_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.questions drop constraint questions_deletion_requested_by_fkey;
alter table public.questions add constraint questions_deletion_requested_by_fkey
  foreign key (deletion_requested_by) references auth.users(id) on delete set null;

alter table public.quizzes alter column created_by drop not null;
alter table public.quizzes drop constraint quizzes_created_by_fkey;
alter table public.quizzes add constraint quizzes_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.quizzes drop constraint quizzes_deletion_requested_by_fkey;
alter table public.quizzes add constraint quizzes_deletion_requested_by_fkey
  foreign key (deletion_requested_by) references auth.users(id) on delete set null;

alter table public.refunds alter column processed_by drop not null;
alter table public.refunds drop constraint refunds_processed_by_fkey;
alter table public.refunds add constraint refunds_processed_by_fkey
  foreign key (processed_by) references auth.users(id) on delete set null;

alter table public.orders alter column user_id drop not null;
alter table public.orders drop constraint orders_user_id_fkey;
alter table public.orders add constraint orders_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.invoices alter column user_id drop not null;
alter table public.invoices drop constraint invoices_user_id_fkey;
alter table public.invoices add constraint invoices_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
