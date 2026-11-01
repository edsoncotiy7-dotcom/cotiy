-- HILOS COTIY: cuentas iniciales
-- Ejecutar UNA SOLA VEZ después de instalar.sql en un proyecto Supabase NUEVO.
-- Las contraseñas se almacenan con hash bcrypt. La aplicación añade internamente "#cotiy"
-- a cada contraseña para mantener compatibilidad con contraseñas cortas de 4 dígitos.

begin;

-- Administrador: usuario admin / contraseña 1234
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'hilos.cotiy.admin@gmail.com',
  extensions.crypt('1234#cotiy', extensions.gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Administrador"}'::jsonb, now(), now(), ''
) on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

-- Cajero: usuario edson / contraseña 1111
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a1000000-0000-4000-8000-000000000002',
  'authenticated', 'authenticated', 'hilos.cotiy.edson@gmail.com',
  extensions.crypt('1111#cotiy', extensions.gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Edson"}'::jsonb, now(), now(), ''
) on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

-- Cajero: usuario adonias / contraseña 2222
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a1000000-0000-4000-8000-000000000003',
  'authenticated', 'authenticated', 'hilos.cotiy.adonias@gmail.com',
  extensions.crypt('2222#cotiy', extensions.gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Adonias"}'::jsonb, now(), now(), ''
) on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

-- Identidades de autenticación por correo (necesarias para el inicio de sesión de Supabase).
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '{"sub":"a1000000-0000-4000-8000-000000000001","email":"hilos.cotiy.admin@gmail.com"}'::jsonb, 'email', now(), now(), now()),
  ('a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', '{"sub":"a1000000-0000-4000-8000-000000000002","email":"hilos.cotiy.edson@gmail.com"}'::jsonb, 'email', now(), now(), now()),
  ('a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', '{"sub":"a1000000-0000-4000-8000-000000000003","email":"hilos.cotiy.adonias@gmail.com"}'::jsonb, 'email', now(), now(), now())
on conflict (provider_id, provider) do update set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = now();

-- Perfiles que usa la aplicación para asignar permisos.
insert into public.profiles (id, username, name, role, active)
values
  ('a1000000-0000-4000-8000-000000000001', 'admin', 'Administrador', 'admin', true),
  ('a1000000-0000-4000-8000-000000000002', 'edson', 'Edson', 'cajero', true),
  ('a1000000-0000-4000-8000-000000000003', 'adonias', 'Adonias', 'cajero', true)
on conflict (id) do update set
  username = excluded.username,
  name = excluded.name,
  role = excluded.role,
  active = true;

commit;
