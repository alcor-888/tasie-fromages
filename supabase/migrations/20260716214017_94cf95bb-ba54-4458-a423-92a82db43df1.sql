
-- Restrict has_role execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- Explicit storage policies for product-photos bucket (admin-only)
DROP POLICY IF EXISTS "Admins can view product photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product photos" ON storage.objects;

CREATE POLICY "Admins can view product photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can upload product photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update product photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'product-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete product photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));
