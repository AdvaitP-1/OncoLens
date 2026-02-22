-- OncoLens Supabase schema and RLS policies
-- Research prototype only. Decision-support for screening triage, not diagnosis.

create extension if not exists pgcrypto;

-- 1) profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('clinician', 'patient')),
  full_name text,
  created_at timestamptz not null default now()
);

-- 2) cases
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  patient_id uuid not null references public.profiles(id),
  status text not null default 'new' check (status in ('new', 'running', 'ready', 'high_priority', 'needs_review', 'monitor', 'deferred')),
  created_at timestamptz not null default now(),
  last_updated timestamptz not null default now(),
  data_quality jsonb,
  scores jsonb,
  recommendations jsonb,
  abstain boolean not null default false,
  abstain_reasons jsonb,
  clinician_report text,
  patient_summary text
);

-- 3) case_assets
create table if not exists public.case_assets (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  asset_type text not null check (asset_type in ('wearables_csv', 'image')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- 4) messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- 5) doctor_notes
create table if not exists public.doctor_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  note text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'patient_visible')),
  created_at timestamptz not null default now()
);

-- Trigger to keep cases.last_updated in sync
create or replace function public.set_cases_last_updated()
returns trigger
language plpgsql
as $$
begin
  new.last_updated = now();
  return new;
end;
$$;

drop trigger if exists trg_cases_last_updated on public.cases;
create trigger trg_cases_last_updated
before update on public.cases
for each row
execute function public.set_cases_last_updated();

-- Useful indexes
create index if not exists idx_cases_created_by on public.cases(created_by);
create index if not exists idx_cases_patient_id on public.cases(patient_id);
create index if not exists idx_messages_case_id_created_at on public.messages(case_id, created_at desc);
create index if not exists idx_case_assets_case_id on public.case_assets(case_id);
create index if not exists idx_doctor_notes_case_id_created_at on public.doctor_notes(case_id, created_at desc);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.case_assets enable row level security;
alter table public.messages enable row level security;
alter table public.doctor_notes enable row level security;

-- PROFILES POLICIES
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self
on public.profiles
for select
using (id = auth.uid());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- CASES POLICIES
drop policy if exists cases_clinician_select_owned on public.cases;
create policy cases_clinician_select_owned
on public.cases
for select
using (
  created_by = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'clinician'
  )
);

drop policy if exists cases_patient_select_assigned on public.cases;
create policy cases_patient_select_assigned
on public.cases
for select
using (
  patient_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'patient'
  )
);

drop policy if exists cases_clinician_insert_owned on public.cases;
create policy cases_clinician_insert_owned
on public.cases
for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'clinician'
  )
);

drop policy if exists cases_clinician_update_owned on public.cases;
create policy cases_clinician_update_owned
on public.cases
for update
using (
  created_by = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'clinician'
  )
)
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'clinician'
  )
);

-- CASE_ASSETS POLICIES
drop policy if exists case_assets_select_case_participants on public.case_assets;
create policy case_assets_select_case_participants
on public.case_assets
for select
using (
  exists (
    select 1 from public.cases c
    where c.id = case_assets.case_id
      and (c.created_by = auth.uid() or c.patient_id = auth.uid())
  )
);

drop policy if exists case_assets_insert_clinician_owned_case on public.case_assets;
create policy case_assets_insert_clinician_owned_case
on public.case_assets
for insert
with check (
  exists (
    select 1 from public.cases c
    join public.profiles p on p.id = auth.uid()
    where c.id = case_assets.case_id
      and c.created_by = auth.uid()
      and p.role = 'clinician'
  )
);

drop policy if exists case_assets_update_clinician_owned_case on public.case_assets;
create policy case_assets_update_clinician_owned_case
on public.case_assets
for update
using (
  exists (
    select 1 from public.cases c
    join public.profiles p on p.id = auth.uid()
    where c.id = case_assets.case_id
      and c.created_by = auth.uid()
      and p.role = 'clinician'
  )
)
with check (
  exists (
    select 1 from public.cases c
    join public.profiles p on p.id = auth.uid()
    where c.id = case_assets.case_id
      and c.created_by = auth.uid()
      and p.role = 'clinician'
  )
);

-- MESSAGES POLICIES
drop policy if exists messages_select_sender_or_recipient on public.messages;
create policy messages_select_sender_or_recipient
on public.messages
for select
using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists messages_insert_sender_only on public.messages;
create policy messages_insert_sender_only
on public.messages
for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.cases c
    where c.id = messages.case_id
      and (
        (c.created_by = sender_id and c.patient_id = recipient_id)
        or
        (c.patient_id = sender_id and c.created_by = recipient_id)
      )
  )
);

drop policy if exists messages_update_read_by_participants on public.messages;
create policy messages_update_read_by_participants
on public.messages
for update
using (sender_id = auth.uid() or recipient_id = auth.uid())
with check (sender_id = auth.uid() or recipient_id = auth.uid());

-- DOCTOR_NOTES POLICIES
drop policy if exists doctor_notes_clinician_select_owned_case on public.doctor_notes;
create policy doctor_notes_clinician_select_owned_case
on public.doctor_notes
for select
using (
  exists (
    select 1
    from public.cases c
    join public.profiles p on p.id = auth.uid()
    where c.id = doctor_notes.case_id
      and c.created_by = auth.uid()
      and p.role = 'clinician'
  )
);

drop policy if exists doctor_notes_patient_select_visible_only on public.doctor_notes;
create policy doctor_notes_patient_select_visible_only
on public.doctor_notes
for select
using (
  visibility = 'patient_visible'
  and exists (
    select 1 from public.cases c
    where c.id = doctor_notes.case_id
      and c.patient_id = auth.uid()
  )
);

drop policy if exists doctor_notes_clinician_insert_owned_case on public.doctor_notes;
create policy doctor_notes_clinician_insert_owned_case
on public.doctor_notes
for insert
with check (
  author_id = auth.uid()
  and visibility in ('internal', 'patient_visible')
  and exists (
    select 1
    from public.cases c
    join public.profiles p on p.id = auth.uid()
    where c.id = doctor_notes.case_id
      and c.created_by = auth.uid()
      and p.role = 'clinician'
  )
);

-- Optional bucket setup notes and policies
-- Run this once in SQL editor (if bucket does not already exist):
insert into storage.buckets (id, name, public)
values ('case-assets', 'case-assets', false)
on conflict (id) do nothing;

-- Storage RLS: lock down to case participants.
-- Path convention expected: cases/{case_id}/wearables.csv and cases/{case_id}/image.png
drop policy if exists storage_case_assets_select on storage.objects;
create policy storage_case_assets_select
on storage.objects
for select
using (
  bucket_id = 'case-assets'
  and split_part(name, '/', 1) = 'cases'
  and exists (
    select 1 from public.cases c
    where c.id::text = split_part(name, '/', 2)
      and (c.created_by = auth.uid() or c.patient_id = auth.uid())
  )
);

drop policy if exists storage_case_assets_insert on storage.objects;
create policy storage_case_assets_insert
on storage.objects
for insert
with check (
  bucket_id = 'case-assets'
  and split_part(name, '/', 1) = 'cases'
  and exists (
    select 1 from public.cases c
    join public.profiles p on p.id = auth.uid()
    where c.id::text = split_part(name, '/', 2)
      and c.created_by = auth.uid()
      and p.role = 'clinician'
  )
);

drop policy if exists storage_case_assets_update on storage.objects;
create policy storage_case_assets_update
on storage.objects
for update
using (
  bucket_id = 'case-assets'
  and split_part(name, '/', 1) = 'cases'
  and exists (
    select 1 from public.cases c
    join public.profiles p on p.id = auth.uid()
    where c.id::text = split_part(name, '/', 2)
      and c.created_by = auth.uid()
      and p.role = 'clinician'
  )
)
with check (
  bucket_id = 'case-assets'
  and split_part(name, '/', 1) = 'cases'
  and exists (
    select 1 from public.cases c
    join public.profiles p on p.id = auth.uid()
    where c.id::text = split_part(name, '/', 2)
      and c.created_by = auth.uid()
      and p.role = 'clinician'
  )
);

-- ----------------------------
-- Gemini migration section
-- ----------------------------
alter table public.cases
  add column if not exists gemini_reasoning jsonb not null default '{}'::jsonb;

alter table public.cases
  add column if not exists gemini_meta jsonb not null default '{}'::jsonb;

alter table public.cases
  add column if not exists clinician_visible_scores boolean not null default true;
