-- pms_reports: owner-submitted PMS cost data, feeding the future TCO calculator.
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

create table if not exists public.pms_reports (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now(),
	make text not null,
	model text not null,
	model_year int not null check (model_year between 1990 and 2100),
	trim text,
	service_type text not null check (service_type in ('light', 'major', 'other')),
	mileage_km int not null check (mileage_km >= 0),
	amount_php numeric(10, 2) not null check (amount_php > 0),
	service_location text not null check (service_location in ('casa', 'independent')),
	region text,
	service_date date,
	status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
	notes text
);

create index if not exists pms_reports_status_idx on public.pms_reports (status);
create index if not exists pms_reports_make_model_idx on public.pms_reports (make, model);

alter table public.pms_reports enable row level security;

-- Public form submissions: insert-only, and the row is forced to start as 'pending'
-- no matter what the client sends. No SELECT policy exists for anon, so the public
-- can never read back submissions (moderated or not) through this key.
create policy "public can submit reports"
	on public.pms_reports
	for insert
	to anon
	with check (status = 'pending');

-- The secret/service_role key bypasses RLS entirely (Supabase default), which is what
-- the admin moderation route uses to read pending rows and approve/reject them.
