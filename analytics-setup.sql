create table if not exists public.site_analytics_events (
 id bigint generated always as identity primary key,
 occurred_at timestamptz not null default now(),
 visitor_id text not null,
 session_id text,
 event_type text not null check(event_type in ('page_view','impression','click')),
 page_path text not null,
 section_id text,
 element_id text,
 element_label text,
 element_type text,
 element_url text,
 meta jsonb default '{}'::jsonb
);
create index if not exists analytics_time_idx on public.site_analytics_events(occurred_at desc);
create index if not exists analytics_event_idx on public.site_analytics_events(event_type,element_id,occurred_at desc);
alter table public.site_analytics_events enable row level security;
-- No public RLS policies. Only server-side service-role API accesses events.
