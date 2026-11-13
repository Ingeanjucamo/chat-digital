-- =========================================================
-- ROLES DEFINITIVOS
-- Asesor: registra sus ventas
-- Supervisor: revisa, aprueba y rechaza
-- Administrador: consulta/reportes, NO aprueba/rechaza
-- SuperAdmin: todo
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

-- VENTAS: consultar
DROP POLICY IF EXISTS "ventas_ver" ON public.ventas;
DROP POLICY IF EXISTS "ventas_select" ON public.ventas;

CREATE POLICY "ventas_ver"
ON public.ventas
FOR SELECT
TO authenticated
USING (
  asesor_id = public.usuario_actual_id()
  OR public.usuario_actual_rol() IN ('Supervisor','Administrador','Revisor')
  OR public.usuario_es_super_admin()
);

-- VENTAS: cambiar estado
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

-- REVISIONES: insertar
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

-- REVISIONES: consultar
DROP POLICY IF EXISTS "venta_revisiones_select" ON public.venta_revisiones;
DROP POLICY IF EXISTS "venta_revisiones_ver" ON public.venta_revisiones;

CREATE POLICY "venta_revisiones_select"
ON public.venta_revisiones
FOR SELECT
TO authenticated
USING (
  public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
  OR public.usuario_es_super_admin()
);

-- REVISIONES: actualizar
DROP POLICY IF EXISTS "venta_revisiones_actualizar" ON public.venta_revisiones;

CREATE POLICY "venta_revisiones_actualizar"
ON public.venta_revisiones
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
