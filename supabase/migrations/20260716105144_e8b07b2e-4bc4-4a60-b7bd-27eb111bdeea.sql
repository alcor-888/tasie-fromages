
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ref integer,
  ADD COLUMN IF NOT EXISTS type_desc text,
  ADD COLUMN IF NOT EXISTS fabriquant text,
  ADD COLUMN IF NOT EXISTS ville text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS matiere_grasse text,
  ADD COLUMN IF NOT EXISTS colissage numeric,
  ADD COLUMN IF NOT EXISTS nombre_poids_reel numeric,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS packaging_unit text;
