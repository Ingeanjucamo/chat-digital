-- Política para permitir borrar ventas únicamente al SuperAdmin.
-- Ejecutar en Supabase SQL Editor antes de usar la selección/eliminación.
DROP POLICY IF EXISTS "ventas_delete_superadmin" ON public.ventas;
CREATE POLICY "ventas_delete_superadmin"
ON public.ventas
FOR DELETE
TO authenticated
USING (public.usuario_es_super_admin());

DROP POLICY IF EXISTS "venta_soportes_delete_superadmin" ON public.venta_soportes;
CREATE POLICY "venta_soportes_delete_superadmin"
ON public.venta_soportes
FOR DELETE
TO authenticated
USING (public.usuario_es_super_admin());

-- Permite borrar archivos de evidencia en el bucket solo al SuperAdmin.
DROP POLICY IF EXISTS "venta_storage_delete_superadmin" ON storage.objects;
CREATE POLICY "venta_storage_delete_superadmin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'venta-soportes'
  AND public.usuario_es_super_admin()
);
