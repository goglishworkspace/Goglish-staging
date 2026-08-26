with u as (select id from auth.users where email = '25495ed6f4@emailinbo.live'),
     r as (select id from public.roles where name = 'teacher')
insert into public.role_user (user_id, role_id) select u.id, r.id from u, r
on conflict do nothing;