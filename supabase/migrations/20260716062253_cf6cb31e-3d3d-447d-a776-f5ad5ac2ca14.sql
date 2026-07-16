
CREATE TYPE public.product_list AS ENUM ('all', 'curated', 'promotions');

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_type public.product_list NOT NULL,
  position integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  region text,
  category text,
  milk text,
  price_label text,
  price_per_kg numeric NOT NULL DEFAULT 0,
  unit text,
  weight text,
  age text,
  saveur text,
  conseils text,
  fabrication text,
  season text,
  producer text,
  stock integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX products_list_type_idx ON public.products (list_type, position);

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Admins manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER products_touch_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
