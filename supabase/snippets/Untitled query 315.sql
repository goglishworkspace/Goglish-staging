-- تأكد إن الـ role اتحدث صح
SELECT id, first_name, last_name, role_type 
FROM profiles 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'khaled.elngargg@gmail.com'
);