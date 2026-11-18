-- Home for Paws database
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run again: it only creates what is missing and resets the access rules.

create extension if not exists pgcrypto;

-- ---------- Who is an admin ----------
create table if not exists admins (
  email text primary key,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- ---------- Clients (pet owners) ----------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  suburb text,
  emergency_contact text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Shelters (partners and prospects) ----------
create table if not exists shelters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  suburb text,
  address text,
  phone text,
  email text,
  website text,
  hours text,
  status text not null default 'prospect'
    check (status in ('prospect','contacted','visited','partner','not_interested')),
  next_step text,
  next_step_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Pets (adoptable shelter pets and sitting guests) ----------
create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'adoptable'
    check (status in ('adoptable','guest','adopted','archived')),
  visibility text not null default 'public'
    check (visibility in ('public','unlisted','private')),
  name text not null,
  species text,
  breed text,
  age text,
  sex text,
  size text,
  colour text,
  photo_url text,
  traits text[] not null default '{}',
  good_with jsonb not null default '{}'::jsonb,
  story text,
  needs text,
  shelter_id uuid references shelters(id) on delete set null,
  shelter_name text,
  enquire_url text,
  client_id uuid references clients(id) on delete set null,
  profile jsonb not null default '{}'::jsonb, -- questionnaire answers for guests
  sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Enquiries (every form on the site lands here) ----------
create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'general' check (kind in ('booking','adoption','general')),
  status text not null default 'new' check (status in ('new','replied','booked','closed')),
  name text,
  email text,
  phone text,
  pet_id uuid references pets(id) on delete set null,
  pet_name text,
  message text,
  answers jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

-- ---------- Stays (pet sitting bookings) ----------
create table if not exists stays (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references pets(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  enquiry_id uuid references enquiries(id) on delete set null,
  service text,
  start_date date,
  end_date date,
  status text not null default 'confirmed'
    check (status in ('requested','confirmed','in_care','completed','cancelled')),
  price_total numeric(10,2),
  paid boolean not null default false,
  payment_link text,
  care_plan jsonb,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Updates and photos shared with owners ----------
create table if not exists stay_updates (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references pets(id) on delete cascade,
  stay_id uuid references stays(id) on delete cascade,
  note text,
  photo_url text,
  created_at timestamptz not null default now()
);

-- ---------- Emergency contacts ----------
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Other',
  name text not null,
  phone text,
  address text,
  hours text,
  website text,
  notes text,
  sort int not null default 100,
  created_at timestamptz not null default now()
);

-- ---------- Reminders you have ticked off, and your own to-dos ----------
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  key text unique,          -- set for automatic reminders, e.g. 'photo:<stay id>:2026-12-02'
  title text,               -- set for your own to-dos
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Access rules ----------
alter table admins enable row level security;
alter table clients enable row level security;
alter table shelters enable row level security;
alter table pets enable row level security;
alter table enquiries enable row level security;
alter table stays enable row level security;
alter table stay_updates enable row level security;
alter table contacts enable row level security;
alter table reminders enable row level security;

do $$
declare t text;
begin
  foreach t in array array['admins','clients','shelters','pets','enquiries','stays','stay_updates','contacts','reminders'] loop
    execute format('drop policy if exists "admin full access" on %I', t);
    execute format('create policy "admin full access" on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- Visitors can see public and unlisted pets (unlisted = only with the direct link).
drop policy if exists "public can view pets" on pets;
create policy "public can view pets" on pets for select to anon, authenticated
  using (visibility in ('public','unlisted') and status in ('adoptable','guest'));

-- Visitors can see updates for pets they can see.
drop policy if exists "public can view updates" on stay_updates;
create policy "public can view updates" on stay_updates for select to anon, authenticated
  using (exists (select 1 from pets p where p.id = pet_id and p.visibility in ('public','unlisted') and p.status in ('adoptable','guest')));

-- Visitors can send enquiries but never read them.
drop policy if exists "public can send enquiries" on enquiries;
create policy "public can send enquiries" on enquiries for insert to anon, authenticated
  with check (status = 'new' and notes is null and handled_at is null);

-- ---------- Photo storage ----------
insert into storage.buckets (id, name, public) values ('pet-photos', 'pet-photos', true)
  on conflict (id) do nothing;

drop policy if exists "admin uploads photos" on storage.objects;
create policy "admin uploads photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'pet-photos' and is_admin());
drop policy if exists "admin manages photos" on storage.objects;
create policy "admin manages photos" on storage.objects for update to authenticated
  using (bucket_id = 'pet-photos' and is_admin());
drop policy if exists "admin deletes photos" on storage.objects;
create policy "admin deletes photos" on storage.objects for delete to authenticated
  using (bucket_id = 'pet-photos' and is_admin());

-- ---------- Finally: make yourself an admin ----------
-- Replace the address below with the email you will log in with, then run this line.
-- insert into admins (email) values ('you@example.com') on conflict do nothing;
