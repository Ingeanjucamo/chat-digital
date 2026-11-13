-- =========================================================
-- CORRECCIÓN DE VENTAS + SOPORTES + PERMISOS
--
-- Asesor: puede corregir SOLO sus ventas devueltas (POR_CORREGIR).
-- Supervisor: puede revisar, ver soportes, aprobar, rechazar y devolver.
-- Administrador: consulta, pero NO aprueba/rechaza/devuelve.
-- SuperAdmin: todo.
-- =========================================================

-- 1) Permitir el nuevo estado.
ALTER TABLE public.ventas
DROP CONSTRAINT IF EXISTS ventas_estado_check;

ALTER TABLE public.ventas
ADD CONSTRAINT ventas_estado_check
CHECK (estado IN ('PENDIENTE','APROBADA','RECHAZADA','POR_CORREGIR'));

ALTER TABLE public.venta_revisiones
DROP CONSTRAINT IF EXISTS venta_revisiones_estado_nuevo_check;

ALTER TABLE public.venta_revisiones
ADD CONSTRAINT venta_revisiones_estado_nuevo_check
CHECK (estado_nuevo IN ('PENDIENTE','APROBADA','RECHAZADA','POR_CORREGIR'));

-- 2) Supervisor/Admin/SuperAdmin pueden consultar ventas.
DROP POLICY IF EXISTS "ventas_ver" ON public.ventas;
DROP POLICY IF EXISTS "ventas_select" ON public.ventas;

CREATE POLICY "ventas_ver"
ON public.ventas
FOR SELECT
TO authenticated
USING (
  asesor_id = public.usuario_actual_id()
  OR public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
  OR public.usuario_es_super_admin()
);

-- 3) SOLO Supervisor/Revisor/SuperAdmin pueden cambiar estado de revisión.
DROP POLICY IF EXISTS "ventas_actualizar_revision" ON public.ventas;
DROP POLICY IF EXISTS "ventas_update" ON public.ventas;

CREATE POLICY "ventas_actualizar_revision"
ON public.ventas
FOR UPDATE
TO authenticated
USING (
  public.usuario_actual_rol() IN ('Supervisor','Revisor')
  OR public.usuario_es_super_admin()
)
WITH CHECK (
  public.usuario_actual_rol() IN ('Supervisor','Revisor')
  OR public.usuario_es_super_admin()
);

-- 4) El asesor puede actualizar su propia venta SOLO cuando fue devuelta.
--    Al guardar la corrección, obligatoriamente vuelve a PENDIENTE.
DROP POLICY IF EXISTS "ventas_asesor_corregir" ON public.ventas;

CREATE POLICY "ventas_asesor_corregir"
ON public.ventas
FOR UPDATE
TO authenticated
USING (
  asesor_id = public.usuario_actual_id()
  AND estado = 'POR_CORREGIR'
)
WITH CHECK (
  asesor_id = public.usuario_actual_id()
  AND estado = 'PENDIENTE'
);

-- 5) CORRECCIÓN IMPORTANTE: permitir que Supervisor vea los registros
--    de venta_soportes. Esto faltaba en la política anterior.
DROP POLICY IF EXISTS "venta_soportes_select" ON public.venta_soportes;

CREATE POLICY "venta_soportes_select"
ON public.venta_soportes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ventas v
    WHERE v.id = venta_soportes.venta_id
      AND (
        v.asesor_id = public.usuario_actual_id()
        OR public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
        OR public.usuario_es_super_admin()
      )
  )
);

-- 6) Insertar soportes: solo el asesor dueño de la venta.
DROP POLICY IF EXISTS "venta_soportes_insert" ON public.venta_soportes;

CREATE POLICY "venta_soportes_insert"
ON public.venta_soportes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ventas v
    WHERE v.id = venta_soportes.venta_id
      AND v.asesor_id = public.usuario_actual_id()
  )
);

-- 7) Revisiones: Supervisor/Revisor/SuperAdmin pueden crear historial.
DROP POLICY IF EXISTS "venta_revisiones_insert" ON public.venta_revisiones;
DROP POLICY IF EXISTS "venta_revisiones_insertar" ON public.venta_revisiones;

CREATE POLICY "venta_revisiones_insert"
ON public.venta_revisiones
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.usuario_actual_rol() IN ('Supervisor','Revisor')
    OR public.usuario_es_super_admin()
  )
  AND revisor_id = public.usuario_actual_id()
);

-- El asesor puede registrar que corrigió su propia venta.
DROP POLICY IF EXISTS "venta_revisiones_asesor_correccion" ON public.venta_revisiones;

CREATE POLICY "venta_revisiones_asesor_correccion"
ON public.venta_revisiones
FOR INSERT
TO authenticated
WITH CHECK (
  revisor_id = public.usuario_actual_id()
  AND estado_anterior = 'POR_CORREGIR'
  AND estado_nuevo = 'PENDIENTE'
  AND EXISTS (
    SELECT 1
    FROM public.ventas v
    WHERE v.id = venta_revisiones.venta_id
      AND v.asesor_id = public.usuario_actual_id()
  )
);

-- 8) Historial visible para Supervisor/Admin/Asesor dueño/SuperAdmin.
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

-- 9) STORAGE: el bucket es privado y Supervisor debe poder generar
--    signed URLs para ver las imágenes.
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

-- 10) El asesor dueño puede subir nuevos soportes.
DROP POLICY IF EXISTS "venta_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "venta_soportes_subir" ON storage.objects;

CREATE POLICY "venta_storage_insert"
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

-- 11) El asesor puede eliminar/reemplazar un soporte de una venta propia.
DROP POLICY IF EXISTS "venta_storage_delete" ON storage.objects;

CREATE POLICY "venta_storage_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'venta-soportes'
  AND EXISTS (
    SELECT 1
    FROM public.ventas v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.asesor_id = public.usuario_actual_id()
      AND v.estado = 'POR_CORREGIR'
  )
);

DROP POLICY IF EXISTS "venta_soportes_delete" ON public.venta_soportes;

CREATE POLICY "venta_soportes_delete"
ON public.venta_soportes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ventas v
    WHERE v.id = venta_soportes.venta_id
      AND v.asesor_id = public.usuario_actual_id()
      AND v.estado = 'POR_CORREGIR'
  )
);

-- =========================================================
-- NOTIFICACIÓN
-- =========================================================
-- La aplicación utiliza la tabla mensajes para las notificaciones
-- privadas. Al devolver una venta, el Supervisor crea un mensaje:
-- "⚠️ Venta #X debe corregirse..."
-- El sistema existente de Realtime lo muestra al asesor.
-- =========================================================
