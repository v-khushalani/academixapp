DO $$
DECLARE uid uuid := gen_random_uuid();
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'qa.owner@academix.app') THEN RETURN; END IF;
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    'qa.owner@academix.app', crypt('Academix@123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"QA Owner","institute_name":"QA Test Institute"}'::jsonb,
    now(), now()
  );
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), uid, uid::text,
    json_build_object('sub', uid::text, 'email', 'qa.owner@academix.app')::jsonb,
    'email', now(), now(), now());
END $$;