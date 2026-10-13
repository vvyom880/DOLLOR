create table if not exists public.contact_messages (
 id bigint generated always as identity primary key,
 created_at timestamptz not null default now(),
 first_name text not null,
 last_name text not null,
 email text not null,
 phone_country_code text not null,
 phone_number text not null,
 message text not null
);
create unique index if not exists contact_unique_email on public.contact_messages (lower(trim(email)));
create unique index if not exists contact_unique_phone on public.contact_messages (phone_country_code,phone_number);
alter table public.contact_messages enable row level security;
-- No public policies. Server-side service-role access only.
