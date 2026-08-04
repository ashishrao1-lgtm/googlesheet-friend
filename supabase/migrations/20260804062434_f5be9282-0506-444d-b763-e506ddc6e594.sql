CREATE TABLE public.fleet_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dri text NOT NULL,
  ref text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('adhoc','fixed')),
  action text NOT NULL CHECK (action IN ('resolved','called_driver','called_vendor','whatsapp','undo')),
  label text NOT NULL DEFAULT '',
  center text NOT NULL DEFAULT '',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.fleet_actions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_actions TO authenticated;
GRANT ALL ON public.fleet_actions TO service_role;

ALTER TABLE public.fleet_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log fleet actions" ON public.fleet_actions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(dri)) >= 1 AND length(trim(dri)) <= 120 AND
    length(trim(ref)) >= 1 AND length(trim(ref)) <= 120 AND
    length(label) <= 200 AND length(center) <= 200 AND
    (note IS NULL OR length(note) <= 500)
  );

CREATE POLICY "Anyone can read fleet actions" ON public.fleet_actions
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE INDEX fleet_actions_dri_ref_idx ON public.fleet_actions (dri, ref);
CREATE INDEX fleet_actions_created_idx ON public.fleet_actions (created_at DESC);