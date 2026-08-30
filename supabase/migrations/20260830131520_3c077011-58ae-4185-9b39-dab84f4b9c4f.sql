DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Signed-in users view products" ON public.products FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.products FROM anon;

DROP POLICY IF EXISTS "Anyone can view cheese lists" ON public.cheese_lists;
CREATE POLICY "Signed-in users view cheese lists" ON public.cheese_lists FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.cheese_lists FROM anon;

DROP POLICY IF EXISTS "Users read own orders" ON public.orders;
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);