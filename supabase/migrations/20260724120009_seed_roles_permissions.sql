-- Phase 1: seed base roles and a representative permission set (Section 4).
-- "Visitor" is not persisted - it is simply the absence of a session.
insert into public.roles (name, description) values
  ('student', 'طالب'),
  ('parent', 'ولي أمر'),
  ('teacher', 'مدرس'),
  ('moderator', 'مشرف - صلاحيات أدمن كاملة ما عدا حذف المستخدمين أو إيقاف المنصة'),
  ('support', 'دعم فني - وصول كامل'),
  ('content_manager', 'مسؤول محتوى - إضافة وحذف محتوى فقط'),
  ('accountant', 'محاسب - تقارير مالية فقط، بدون تعديل بيانات مستخدمين'),
  ('admin', 'أدمن - كل الصلاحيات'),
  ('super_admin', 'سوبر أدمن - كل الصلاحيات');

insert into public.permissions (name, description) values
  ('users.view', 'عرض بيانات المستخدمين'),
  ('users.manage', 'إنشاء/تعديل/حظر/إيقاف مستخدمين'),
  ('users.delete', 'حذف مستخدمين'),
  ('devices.reset', 'إعادة ضبط أجهزة مستخدم'),
  ('teachers.manage', 'إدارة المدرسين'),
  ('students.manage', 'إدارة الطلاب'),
  ('courses.manage', 'إدارة الكورسات'),
  ('lessons.manage', 'إدارة الدروس'),
  ('content.manage', 'إضافة وحذف محتوى عام'),
  ('comments.moderate', 'الموافقة/الرفض على التعليقات'),
  ('payments.view', 'عرض المدفوعات والإيرادات'),
  ('payments.manage', 'معالجة/استرجاع المدفوعات'),
  ('coupons.view', 'عرض الكوبونات'),
  ('coupons.manage', 'إدارة الكوبونات'),
  ('financial_reports.view', 'عرض التقارير المالية والضرائب والفواتير'),
  ('reports.view', 'عرض التقارير العامة'),
  ('roles.manage', 'إدارة الأدوار والصلاحيات'),
  ('settings.manage', 'إدارة إعدادات المنصة');

-- support: كل الصلاحيات
insert into public.permission_role (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.name = 'support';

-- admin & super_admin: كل الصلاحيات
insert into public.permission_role (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.name in ('admin', 'super_admin');

-- moderator: كل صلاحيات الأدمن ما عدا حذف المستخدمين
insert into public.permission_role (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.name = 'moderator' and p.name <> 'users.delete';

-- content_manager: محتوى فقط، بدون وصول لملفات شخصية
insert into public.permission_role (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p
  on p.name in ('courses.manage', 'lessons.manage', 'content.manage')
where r.name = 'content_manager';

-- accountant: عرض فقط (مالي)، بدون تعديل بيانات مستخدمين
insert into public.permission_role (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p
  on p.name in ('payments.view', 'coupons.view', 'financial_reports.view', 'reports.view')
where r.name = 'accountant';
