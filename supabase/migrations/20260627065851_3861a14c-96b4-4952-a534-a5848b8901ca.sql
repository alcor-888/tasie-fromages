CREATE TABLE public.cheese_lists (
  cheese_id text NOT NULL,
  list_type text NOT NULL CHECK (list_type IN ('promotion','selection')),
  cheese_name text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cheese_id, list_type)
);
GRANT SELECT ON public.cheese_lists TO anon, authenticated;
GRANT ALL ON public.cheese_lists TO service_role;
ALTER TABLE public.cheese_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view cheese lists" ON public.cheese_lists FOR SELECT USING (true);
CREATE POLICY "Admins manage cheese lists" ON public.cheese_lists FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));