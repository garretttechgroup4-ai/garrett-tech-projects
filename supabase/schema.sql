-- Super Agent Deal Finder — initial migration
-- Run once in the Supabase SQL editor (or `supabase db push` with this file
-- copied into supabase/migrations/). Safe to re-run: everything is
-- "if not exists".
--
-- Phase 1 uses: searches, properties, search_results.
-- Phase 2 adds rows to: property_scores.
-- Phase 3 adds rows to: outreach_drafts.

create extension if not exists "pgcrypto";

-- One row per "Find properties" run.
create table if not exists public.searches (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null,
  name            text,
  boundary        jsonb not null,           -- GeoJSON Polygon the user drew
  source          text not null check (source in ('demo', 'live')),
  preview_count   integer,                  -- count shown before confirming
  result_count    integer not null default 0
);

-- Normalized property records (see docs/field-map.md).
create table if not exists public.properties (
  id                     text primary key,  -- e.g. pr_<RadarID> or demo_001
  source                 text not null check (source in ('demo', 'live')),
  address                text not null,
  city                   text not null,
  state                  text not null,
  zip                    text,
  neighborhood           text,
  lat                    double precision not null,
  lng                    double precision not null,
  property_type          text,
  beds                   numeric,
  baths                  numeric,
  sqft                   integer,
  lot_sqft               integer,
  year_built             integer,
  estimated_value        numeric,
  equity_amount          numeric,
  equity_percent         numeric,
  last_sale_date         date,
  last_sale_price        numeric,
  owner_name             text,
  owner_mailing_address  text,
  owner_mailing_state    text,
  owner_occupied         boolean,
  listed_for_sale        boolean,
  signals                text[] not null default '{}',
  raw                    jsonb,              -- original API record
  fetched_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists properties_lat_lng_idx on public.properties (lat, lng);
create index if not exists properties_signals_idx on public.properties using gin (signals);

-- Which properties came back for which search.
create table if not exists public.search_results (
  search_id    uuid not null references public.searches (id) on delete cascade,
  property_id  text not null references public.properties (id) on delete cascade,
  primary key (search_id, property_id)
);

-- Phase 2: score + AI rationale per property.
create table if not exists public.property_scores (
  id              uuid primary key default gen_random_uuid(),
  property_id     text not null references public.properties (id) on delete cascade,
  score           integer not null check (score between 0 and 100),
  rationale       text,
  model           text,
  config_version  integer not null,
  scored_at       timestamptz not null default now()
);
create index if not exists property_scores_property_idx on public.property_scores (property_id, scored_at desc);

-- Phase 3: outreach drafts behind the human review gate.
create table if not exists public.outreach_drafts (
  id            uuid primary key default gen_random_uuid(),
  property_id   text not null references public.properties (id) on delete cascade,
  channel       text not null check (channel in ('letter', 'email', 'sms', 'call_script')),
  body          text not null,
  status        text not null default 'pending_review'
                  check (status in ('pending_review', 'approved', 'rejected', 'sent')),
  reviewed_by   uuid references auth.users (id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- Row level security: signed-in team members can read and write.
-- The server (service role key) bypasses RLS.
alter table public.searches         enable row level security;
alter table public.properties       enable row level security;
alter table public.search_results   enable row level security;
alter table public.property_scores  enable row level security;
alter table public.outreach_drafts  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['searches','properties','search_results','property_scores','outreach_drafts'] loop
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_team_all'
    ) then
      execute format(
        'create policy %I on public.%I for all to authenticated using (true) with check (true)',
        t || '_team_all', t
      );
    end if;
  end loop;
end $$;
