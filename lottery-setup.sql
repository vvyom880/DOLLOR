-- $ DOLLOR lottery schema; run in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.lottery_users(id uuid primary key default gen_random_uuid(),username text not null,created_at timestamptz not null default now(),created_by text not null, constraint lottery_username_valid check(username ~ '^[A-Za-z0-9_.-]{3,40}$'));
create unique index if not exists lottery_username_unique on public.lottery_users(lower(username));
create table if not exists public.lottery_settings(id integer primary key default 1 check(id=1),ticket_price integer not null default 500 check(ticket_price>0),prefix_allocation_mode text not null default 'sequential' check(prefix_allocation_mode in ('sequential','random')),updated_at timestamptz not null default now(),updated_by text not null default 'system');
insert into public.lottery_settings(id,ticket_price,updated_by) values(1,500,'system') on conflict(id) do nothing;
create table if not exists public.lottery_prefixes(id uuid primary key default gen_random_uuid(),prefix char(2) not null unique check(prefix ~ '^[0-9]{2}$'),is_active boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.lottery_draws(id uuid primary key default gen_random_uuid(),draw_date date not null unique,status text not null default 'open' check(status in ('open','closed','finalized')),sales_close_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.lottery_issuances(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.lottery_users(id),draw_id uuid not null references public.lottery_draws(id),total_amount integer not null check(total_amount>0),ticket_price_snapshot integer not null check(ticket_price_snapshot>0),ticket_quantity integer not null check(ticket_quantity>0),issued_at timestamptz not null default now(),issued_by text not null,idempotency_key text not null unique, constraint lottery_issuance_math check(total_amount=ticket_price_snapshot*ticket_quantity));
create table if not exists public.lottery_tickets(id uuid primary key default gen_random_uuid(),issuance_id uuid not null references public.lottery_issuances(id),user_id uuid not null references public.lottery_users(id),draw_id uuid not null references public.lottery_draws(id),ticket_number char(6) not null check(ticket_number ~ '^[0-9]{6}$'),ticket_date date not null,status text not null default 'active' check(status in ('active','canceled','replaced')),created_at timestamptz not null default now(),canceled_at timestamptz,replaced_by_ticket_id uuid references public.lottery_tickets(id));
create unique index if not exists lottery_active_draw_number on public.lottery_tickets(draw_id,ticket_number) where status='active';
create index if not exists lottery_tickets_user_date on public.lottery_tickets(user_id,ticket_date desc);
create index if not exists lottery_tickets_draw_status on public.lottery_tickets(draw_id,status);
create table if not exists public.lottery_ticket_events(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.lottery_tickets(id),event_type text not null,previous_value jsonb,new_value jsonb,reason text,admin_id text not null,created_at timestamptz not null default now());
create table if not exists public.lottery_admin_audit(id uuid primary key default gen_random_uuid(),admin_id text not null,action text not null,entity_type text not null,entity_id text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create table if not exists public.lottery_import_jobs(id uuid primary key default gen_random_uuid(),filename text not null,imported_count integer not null default 0,rejected_count integer not null default 0,uploaded_by text not null,created_at timestamptz not null default now());
create index if not exists lottery_audit_created on public.lottery_admin_audit(created_at desc);
-- Server service-role only: deny all access via anon/authenticated REST, including unverified username lookups.
do $$ declare t text; begin foreach t in array array['lottery_users','lottery_settings','lottery_prefixes','lottery_draws','lottery_issuances','lottery_tickets','lottery_ticket_events','lottery_admin_audit','lottery_import_jobs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
end loop; end $$;
-- Atomic issue, safe under concurrency, serialized per draw. Admin authorization must be enforced by server before RPC.
create or replace function public.lottery_issue(p_user uuid,p_draw uuid,p_amount integer,p_key text,p_admin text,p_numbers text[])
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_price integer;v_qty integer;v_draw public.lottery_draws%rowtype;v_issue uuid;v_n text;v_prefix text;v_numbers text[];v_result jsonb;
begin
 if p_key is null or length(p_key)<12 or length(p_key)>150 then raise exception 'Invalid idempotency key';end if;
 if p_admin is null or length(p_admin)<1 then raise exception 'Admin identity required';end if;
 select id into v_issue from lottery_issuances where idempotency_key=p_key;
 if found then return jsonb_build_object('issuance_id',v_issue,'idempotent',true);end if;
 select * into v_draw from lottery_draws where id=p_draw for update;
 if not found or v_draw.status<>'open' or (v_draw.sales_close_at is not null and now()>=v_draw.sales_close_at) then raise exception 'Draw is not open';end if;
 if not exists(select 1 from lottery_users where id=p_user) then raise exception 'Unknown user';end if;
 select ticket_price into v_price from lottery_settings where id=1;
 if p_amount is null or p_amount<=0 or p_amount%v_price<>0 then raise exception 'Amount must be positive and divisible by price';end if;
 v_qty:=p_amount/v_price;
 if v_qty>10000 then raise exception 'Maximum 10000 tickets per issuance';end if;
 if cardinality(p_numbers)<>v_qty then raise exception 'Ticket quantity mismatch';end if;
 if (select count(distinct x) from unnest(p_numbers) x)<>v_qty then raise exception 'Duplicate numbers in request';end if;
 foreach v_n in array p_numbers loop
  if v_n !~ '^[0-9]{6}$' or not exists(select 1 from lottery_prefixes where prefix=left(v_n,2) and is_active) then raise exception 'Invalid ticket number or prefix';end if;
 end loop;
 insert into lottery_issuances(user_id,draw_id,total_amount,ticket_price_snapshot,ticket_quantity,issued_by,idempotency_key) values(p_user,p_draw,p_amount,v_price,v_qty,p_admin,p_key) returning id into v_issue;
 insert into lottery_tickets(issuance_id,user_id,draw_id,ticket_number,ticket_date) select v_issue,p_user,p_draw,x,v_draw.draw_date from unnest(p_numbers) x;
 insert into lottery_admin_audit(admin_id,action,entity_type,entity_id,metadata) values(p_admin,'issue','lottery_issuances',v_issue::text,jsonb_build_object('quantity',v_qty,'amount',p_amount));
 select jsonb_build_object('issuance_id',v_issue,'quantity',v_qty,'ticket_numbers',jsonb_agg(ticket_number order by ticket_number)) into v_result from lottery_tickets where issuance_id=v_issue;
 return v_result;
end $$;
revoke all on function public.lottery_issue(uuid,uuid,integer,text,text,text[]) from public,anon,authenticated;
-- Cancellation is always soft and audit-logged, with row locking.
create or replace function public.lottery_cancel(p_day date,p_user uuid,p_reason text,p_admin text)
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;v_ids uuid[];
begin
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Reason required';end if;
 if p_admin is null or p_admin='' then raise exception 'Admin required';end if;
 if exists(select 1 from lottery_tickets t join lottery_draws d on d.id=t.draw_id where t.ticket_date=p_day and (p_user is null or t.user_id=p_user) and t.status='active' and d.status='finalized') then raise exception 'Finalized draw requires formal correction';end if;
 select array_agg(id) into v_ids from lottery_tickets where ticket_date=p_day and (p_user is null or user_id=p_user) and status='active' for update;
 v_count:=coalesce(cardinality(v_ids),0);
 if v_count=0 then return 0;end if;
 update lottery_tickets set status='canceled',canceled_at=now() where id=any(v_ids);
 insert into lottery_ticket_events(ticket_id,event_type,previous_value,new_value,reason,admin_id)
 select unnest(v_ids),'canceled','{"status":"active"}'::jsonb,'{"status":"canceled"}'::jsonb,p_reason,p_admin;
 insert into lottery_admin_audit(admin_id,action,entity_type,entity_id,metadata) values(p_admin,'cancel','lottery_tickets',p_day::text,jsonb_build_object('ticket_ids',v_ids,'user_id',p_user,'reason',p_reason));
 return v_count;
end $$;
revoke all on function public.lottery_cancel(date,uuid,text,text) from public,anon,authenticated;
