-- =========================================================
-- ROLES: ASESOR / SUPERVISOR / ADMINISTRADOR / SUPERADMIN
-- =========================================================
-- SuperAdmin NO se guarda como un rol nuevo.
-- El SuperAdmin sigue teniendo rol "Administrador" y
-- es_super_admin = true.
-- Supervisor tendrá permisos de revisión de ventas,
-- pero NO acceso al panel de Administración.
-- =========================================================

ALTER TABLE public.usuarios
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE public.usuarios
ADD CONSTRAINT usuarios_rol_check
CHECK (
  rol = ANY (
    ARRAY[
      'Asesor'::text,
      'Supervisor'::text,
      'Revisor'::text,
      'Administrador'::text
    ]
  )
);

-- =========================================================
-- SUPERADMIN: puede actualizar perfiles (por ejemplo cédula)
-- =========================================================

DROP POLICY IF EXISTS "usuarios_superadmin_update" ON public.usuarios;
CREATE POLICY "usuarios_superadmin_update"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (public.usuario_es_super_admin())
WITH CHECK (public.usuario_es_super_admin());

-- =========================================================
-- VENTAS: Supervisor funciona como Revisor
-- =========================================================

DROP POLICY IF EXISTS "ventas_select" ON public.ventas;
DROP POLICY IF EXISTS "ventas_ver" ON public.ventas;
CREATE POLICY "ventas_select"
ON public.ventas
FOR SELECT
TO authenticated
USING (
  asesor_id = public.usuario_actual_id()
  OR public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
  OR public.usuario_es_super_admin()
);

DROP POLICY IF EXISTS "ventas_update" ON public.ventas;
DROP POLICY IF EXISTS "ventas_actualizar_revision" ON public.ventas;
CREATE POLICY "ventas_update"
ON public.ventas
FOR UPDATE
TO authenticated
USING (
  asesor_id = public.usuario_actual_id()
  OR public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
  OR public.usuario_es_super_admin()
)
WITH CHECK (
  asesor_id = public.usuario_actual_id()
  OR public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
  OR public.usuario_es_super_admin()
);

-- =========================================================
-- REVISIONES
-- =========================================================

DROP POLICY IF EXISTS "venta_revisiones_select" ON public.venta_revisiones;
DROP POLICY IF EXISTS "venta_revisiones_ver" ON public.venta_revisiones;
CREATE POLICY "venta_revisiones_select"
ON public.venta_revisiones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ventas v
    WHERE v.id = venta_revisiones.venta_id
      AND (
        v.asesor_id = public.usuario_actual_id()
        OR public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
        OR public.usuario_es_super_admin()
      )
  )
);

DROP POLICY IF EXISTS "venta_revisiones_insert" ON public.venta_revisiones;
CREATE POLICY "venta_revisiones_insert"
ON public.venta_revisiones
FOR INSERT
TO authenticated
WITH CHECK (
  public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
  OR public.usuario_es_super_admin()
);

-- =========================================================
-- STORAGE: Supervisor/Revisor/Administrador pueden ver soportes
-- =========================================================

DROP POLICY IF EXISTS "venta_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "venta_soportes_ver" ON storage.objects;
CREATE POLICY "venta_storage_select"
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

-- =========================================================
-- IMPORTANTE
-- La creación de Auth sigue pasando por la Edge Function
-- admin-create-user. El frontend le envía ahora rol + cédula.
-- =========================================================
