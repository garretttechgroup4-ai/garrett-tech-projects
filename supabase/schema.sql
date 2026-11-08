-- Super Agent — Deal Finder schema (Phase 1)
-- Run in the Supabase SQL editor. Row Level Security is on for every table.

create extension if not exists postgis;

-- Team members and roles
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  role text not null default 'researcher' check (role in ('admin','agent','researcher')),
  created_at timestamptz default now()
);

-- Search areas drawn on the map
create table boundaries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  shape geography(polygon, 4326) not null,
  active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- One buy box per developer
create table buy_boxes (
  id uuid primary key default gen_random_uuid(),
  developer_name text not null,
  min_lot_width_ft numeric,
  property_types text[],
  max_land_price_usd numeric,
  areas text[],
  avoid text[],
  notes text,
  active boolean default true
);

-- Cached PropertyRadar records (never re-purchase within 30 days)
create table properties (
  radar_id text primary key,
  apn text,                          -- Cook County PIN
  address text not null,
  city text default 'Chicago',
  zip text,
  location geography(point, 4326),
  property_type text,
  units int,
  year_built int,
  sqft int,
  lot_sqft int,
  lot_width_est_ft numeric generated always as (round(lot_sqft / 125.0, 1)) stored,
  avm numeric,
  equity_percent numeric,
  available_equity numeric,
  open_loans int,
  last_sale_date date,
  last_sale_price numeric,
  properties_owned int,
  owner_mailing_state text,
  distress_flags text[],             -- inDistress values returned by PropertyRadar
  raw jsonb,                         -- full API response for audit
  purchased_at timestamptz not null default now(),
  boundary_id uuid references boundaries(id)
);
create index on properties using gist (location);

-- Score history (one row per scoring run, config version kept)
create table scores (
  id uuid primary key default gen_random_uuid(),
  radar_id text references properties(radar_id) on delete cascade,
  score int not null check (score between 1 and 10),
  matched_signals jsonb not null,    -- [{id,label,points,evidence}]
  summary text,                      -- Claude's one-line reason
  config_version int not null,
  list text not null check (list in ('call','review')),
  created_at timestamptz default now()
);

-- Team flags and audit decisions
create table reviews (
  id uuid primary key default gen_random_uuid(),
  radar_id text references properties(radar_id) on delete cascade,
  reviewer uuid references profiles(id),
  action text not null check (action in ('agree','override','eyes_on','teardown_confirmed','teardown_rejected')),
  new_score int check (new_score between 1 and 10),
  reason text not null,
  created_at timestamptz default now()
);

-- Owners and relatives
create table persons (
  id uuid primary key default gen_random_uuid(),
  radar_id text references properties(radar_id) on delete cascade,
  pr_person_key text,
  full_name text,
  role text not null check (role in ('owner','relative','poa')),
  age int,
  mailing_address text,
  created_at timestamptz default now()
);

create table phones (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references persons(id) on delete cascade,
  number text not null,
  line_type text check (line_type in ('mobile','landline','other','unknown')),
  status text,                       -- active, disconnected, opted_out, wrong_person
  is_dnc boolean default false,
  is_litigator boolean default false,
  rank int,                          -- 1 = call this number first
  checked_at timestamptz default now()
);

-- Every call and text, logged by a person
create table call_logs (
  id uuid primary key default gen_random_uuid(),
  radar_id text references properties(radar_id),
  person_id uuid references persons(id),
  phone_id uuid references phones(id),
  caller uuid references profiles(id),
  channel text not null check (channel in ('call','voicemail','text')),
  outcome text check (outcome in ('no_answer','left_voicemail','spoke','interested','not_interested','call_back','wrong_number','do_not_contact')),
  notes text,
  follow_up_on date,
  created_at timestamptz default now()
);

-- PropertyRadar credit tracking
create table credit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,              -- preview, purchase_properties, purchase_contacts
  records int not null,
  boundary_id uuid references boundaries(id),
  run_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Row Level Security: signed-in team members only; admins manage config
alter table profiles   enable row level security;
alter table boundaries enable row level security;
alter table buy_boxes  enable row level security;
alter table properties enable row level security;
alter table scores     enable row level security;
alter table reviews    enable row level security;
alter table persons    enable row level security;
alter table phones     enable row level security;
alter table call_logs  enable row level security;
alter table credit_log enable row level security;

create function is_team() returns boolean language sql stable as
  $$ select exists (select 1 from profiles where id = auth.uid()) $$;
create function is_admin() returns boolean language sql stable as
  $$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create policy team_read on profiles   for select using (is_team());
create policy team_read on boundaries for select using (is_team());
create policy team_read on buy_boxes  for select using (is_team());
create policy team_read on properties for select using (is_team());
create policy team_read on scores     for select using (is_team());
create policy team_read on reviews    for select using (is_team());
create policy team_read on persons    for select using (is_team());
create policy team_read on phones     for select using (is_team());
create policy team_read on call_logs  for select using (is_team());
create policy admin_read on credit_log for select using (is_admin());

create policy admin_write on boundaries for all using (is_admin()) with check (is_admin());
create policy admin_write on buy_boxes  for all using (is_admin()) with check (is_admin());
create policy team_insert on reviews   for insert with check (is_team() and reviewer = auth.uid());
create policy team_insert on call_logs for insert with check (is_team() and caller = auth.uid());
-- properties, scores, persons, phones, credit_log are written only by server code using the service key.
