CREATE SEQUENCE IF NOT EXISTS public.order_number_seq;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'BC-' || to_char(COALESCE(NEW.created_at, now()), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;
CREATE TRIGGER set_order_number_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

UPDATE public.orders
SET order_number = 'BC-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0')
WHERE order_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key ON public.orders (order_number);