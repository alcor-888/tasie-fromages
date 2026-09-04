ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS final_quantity numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoiced_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_total numeric;
CREATE UNIQUE INDEX IF NOT EXISTS orders_invoice_number_key ON public.orders (invoice_number) WHERE invoice_number IS NOT NULL;
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq;