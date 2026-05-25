INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalogo',
  'catalogo',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public reads catalogo"
ON storage.objects FOR SELECT
USING (bucket_id = 'catalogo');

CREATE POLICY "Admins upload catalogo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'catalogo' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update catalogo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'catalogo' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete catalogo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'catalogo' AND public.has_role(auth.uid(), 'admin'));