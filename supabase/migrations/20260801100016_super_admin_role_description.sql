-- Documents the real distinction now enforced in code (see
-- /api/admin/users/[id]/roles route.ts): a plain admin can manage every
-- role except admin/super_admin itself - only a super_admin can grant or
-- revoke those two. Previously both descriptions read identically
-- ("كل الصلاحيات"), which no longer reflects reality.
update public.roles set description = 'أدمن - كل الصلاحيات ما عدا تعيين/إلغاء دور الأدمن' where name = 'admin';
update public.roles set description = 'سوبر أدمن - كل الصلاحيات، بما فيها تعيين وإلغاء دور الأدمن لأي مستخدم' where name = 'super_admin';
