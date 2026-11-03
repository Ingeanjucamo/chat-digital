-- AMV CRM: reparación de permisos y bucket de soportes de ventas
-- Ejecutar en Supabase SQL Editor una sola vez.
-- El bucket se mantiene privado.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venta-soportes',
  'venta-soportes',
  false,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 52428800,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Permite al asesor propietario subir soportes de sus propias ventas.
DROP POLICY IF EXISTS "amv_venta_soportes_insert_storage" ON storage.objects;
CREATE POLICY "amv_venta_soportes_insert_storage"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'venta-soportes'
  AND EXISTS (
    SELECT 1
    FROM public.ventas v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.asesor_id = public.usuario_actual_id()
  )
);

-- Permite al propietario y a los roles de revisión generar/ver enlaces firmados.
DROP POLICY IF EXISTS "amv_venta_soportes_select_storage" ON storage.objects;
CREATE POLICY "amv_venta_soportes_select_storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'venta-soportes'
  AND (
    public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
    OR public.usuario_es_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.ventas v
      WHERE v.id::text = (storage.foldername(name))[1]
        AND v.asesor_id = public.usuario_actual_id()
    )
  )
);
