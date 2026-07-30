CREATE TABLE public.joss_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker text NOT NULL,
  intake_date date NOT NULL,
  done_date date,
  baskets_in numeric NOT NULL DEFAULT 0,
  bags_out numeric NOT NULL DEFAULT 0,
  stacks_out numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.joss_records TO anon, authenticated;
GRANT ALL ON public.joss_records TO service_role;
ALTER TABLE public.joss_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read joss_records" ON public.joss_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert joss_records" ON public.joss_records FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public update joss_records" ON public.joss_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public delete joss_records" ON public.joss_records FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX joss_records_intake_date_idx ON public.joss_records (intake_date DESC);