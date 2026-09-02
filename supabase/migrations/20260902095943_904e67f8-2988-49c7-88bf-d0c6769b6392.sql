CREATE TABLE public.fleet_sync_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'ok',
  fixed_rows integer NOT NULL DEFAULT 0,
  adhoc_rows integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fleet_sync_runs_started_idx ON public.fleet_sync_runs (started_at DESC);

GRANT SELECT ON public.fleet_sync_runs TO anon, authenticated;
GRANT ALL ON public.fleet_sync_runs TO service_role;
ALTER TABLE public.fleet_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sync runs" ON public.fleet_sync_runs FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.fleet_fixed_current (
  row_key text NOT NULL PRIMARY KEY,
  contract_code text NOT NULL DEFAULT '',
  contract_number text NOT NULL DEFAULT '',
  vehicle text NOT NULL DEFAULT '',
  vendor text NOT NULL DEFAULT '',
  center text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zone text NOT NULL DEFAULT '',
  facility_type text NOT NULL DEFAULT '',
  contract_hrs text NOT NULL DEFAULT '',
  contract_days text NOT NULL DEFAULT '',
  attendance_date text NOT NULL DEFAULT '',
  reporting_time text NOT NULL DEFAULT '',
  reported_at text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  attendance_status text NOT NULL DEFAULT '',
  start_date text NOT NULL DEFAULT '',
  fleet_dri text NOT NULL DEFAULT '',
  synced_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fleet_fixed_current_dri_idx ON public.fleet_fixed_current (fleet_dri);
CREATE INDEX fleet_fixed_current_synced_idx ON public.fleet_fixed_current (synced_at DESC);

GRANT SELECT ON public.fleet_fixed_current TO anon, authenticated;
GRANT ALL ON public.fleet_fixed_current TO service_role;
ALTER TABLE public.fleet_fixed_current ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read fixed mirror" ON public.fleet_fixed_current FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.fleet_adhoc_current (
  row_key text NOT NULL PRIMARY KEY,
  indent_id text NOT NULL DEFAULT '',
  ticket_no text NOT NULL DEFAULT '',
  lob text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  vehicle text NOT NULL DEFAULT '',
  driver_phone text NOT NULL DEFAULT '',
  sp_phone text NOT NULL DEFAULT '',
  center text NOT NULL DEFAULT '',
  facility_type text NOT NULL DEFAULT '',
  dr text NOT NULL DEFAULT '',
  sdr text NOT NULL DEFAULT '',
  vehicle_type text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  zone text NOT NULL DEFAULT '',
  creation_time text NOT NULL DEFAULT '',
  reporting_time text NOT NULL DEFAULT '',
  attendance_in_time text NOT NULL DEFAULT '',
  vendor text NOT NULL DEFAULT '',
  ticket_status text NOT NULL DEFAULT '',
  creation_bucket text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  target_price text NOT NULL DEFAULT '',
  bid_amount text NOT NULL DEFAULT '',
  bid_origin text NOT NULL DEFAULT '',
  fleet_dri text NOT NULL DEFAULT '',
  ontime_placement text NOT NULL DEFAULT '',
  synced_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fleet_adhoc_current_dri_idx ON public.fleet_adhoc_current (fleet_dri);
CREATE INDEX fleet_adhoc_current_synced_idx ON public.fleet_adhoc_current (synced_at DESC);

GRANT SELECT ON public.fleet_adhoc_current TO anon, authenticated;
GRANT ALL ON public.fleet_adhoc_current TO service_role;
ALTER TABLE public.fleet_adhoc_current ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read adhoc mirror" ON public.fleet_adhoc_current FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.fleet_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  synced_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  ref text NOT NULL,
  status text NOT NULL DEFAULT '',
  attendance_status text NOT NULL DEFAULT '',
  reported_at text NOT NULL DEFAULT '',
  reporting_time text NOT NULL DEFAULT '',
  dri text NOT NULL DEFAULT '',
  center text NOT NULL DEFAULT '',
  vendor text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fleet_snapshots_synced_idx ON public.fleet_snapshots (synced_at DESC);
CREATE INDEX fleet_snapshots_ref_idx ON public.fleet_snapshots (kind, ref, synced_at DESC);

GRANT SELECT ON public.fleet_snapshots TO anon, authenticated;
GRANT ALL ON public.fleet_snapshots TO service_role;
ALTER TABLE public.fleet_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read snapshots" ON public.fleet_snapshots FOR SELECT TO anon, authenticated USING (true);