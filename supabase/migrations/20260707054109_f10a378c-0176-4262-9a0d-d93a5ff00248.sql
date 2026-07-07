-- Set a known password for the existing owner account so we can verify end-to-end auth + CRUD
UPDATE auth.users
SET encrypted_password = crypt('TestPass123!', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'vkhushalani0001@gmail.com';