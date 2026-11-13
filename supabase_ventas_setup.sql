
-- ============================================================
-- VENTAS MOVIL / HOGAR - compatible con public.usuarios
-- Ejecutar en Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.usuarios
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE public.usuarios
ADD CONSTRAINT usuarios_rol_check
CHECK (rol = ANY (ARRAY['Asesor'::text,'Supervisor'::text,'Revisor'::text,'Administrador'::text]));

CREATE TABLE IF NOT EXISTS public.ventas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asesor_id bigint NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  producto text NOT NULL DEFAULT 'MOVIL'
    CHECK (producto IN ('MOVIL','HOGAR')),

  tipo_cedula text NOT NULL CHECK (tipo_cedula IN ('C.C','C.E')),
  sala text NOT NULL CHECK (sala IN ('SALA 1','SALA 2','SALA 3')),
  origen text NOT NULL CHECK (origen IN ('CRM','BASE')),
  cedula_cliente text NOT NULL,
  nombre_cliente text NOT NULL,
  numero_portar text NOT NULL,
  nip text,
  email text NOT NULL,
  iccid text NOT NULL,
  direccion text NOT NULL,
  ciudad text,
  sim_adquirida text NOT NULL CHECK (sim_adquirida IN ('SI','NO')),
  tipo_venta text NOT NULL CHECK (tipo_venta IN ('PORTABILIDAD','MIGRACION','PORTABILIDAD POSPAGO','MIGRACION POSTPAGO')),
  operador_donante text NOT NULL CHECK (operador_donante IN ('TIGO','MOVISTAR','WOM','ETB','VIRGIN','OTRO','MIGRACION')),
  tipo_validacion text NOT NULL,
  codigo_plan text NOT NULL,
  id_descuento_oferta text NOT NULL,
  fecha_activacion date NOT NULL,
  cfm numeric(12,2) NOT NULL,
  plan_general text,
  envio_logistico text,
  cliente_todo_claro text NOT NULL CHECK (cliente_todo_claro IN ('SI','NO')),
  tipo_contrato text NOT NULL CHECK (tipo_contrato IN ('DIGITAL','GRABADO','CONTRATO DIGITAL','CONTRATO GRABADO')),
  numero_grabacion text NOT NULL,
  observacion text NOT NULL,

  -- Datos usados para el Excel de Power BI
  fecha_llamada date,
  hora_llamada time,
  agente_id bigint,
  agente text,

  estado text NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE','APROBADA','RECHAZADA')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venta_soportes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  venta_id bigint NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('RECTIFICACION_PLAN','VALIDACION','HABEAS_DATA','HABEAS_DATA_2')),
  nombre_archivo text NOT NULL,
  ruta_storage text NOT NULL,
  tipo_archivo text,
  tamano bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venta_revisiones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  venta_id bigint NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  revisor_id bigint NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  estado_anterior text,
  estado_nuevo text NOT NULL CHECK (estado_nuevo IN ('PENDIENTE','APROBADA','RECHAZADA')),
  observacion text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventas_asesor ON public.ventas(asesor_id);
CREATE INDEX IF NOT EXISTS idx_ventas_producto ON public.ventas(producto);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON public.ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON public.ventas(fecha_activacion);
CREATE INDEX IF NOT EXISTS idx_venta_soportes_venta ON public.venta_soportes(venta_id);
CREATE INDEX IF NOT EXISTS idx_venta_revisiones_venta ON public.venta_revisiones(venta_id);

-- Bucket privado para imágenes UMG.
-- Si tu proyecto ya tiene este bucket, no lo vuelvas a crear.
insert into storage.buckets (id, name, public)
values ('venta-soportes', 'venta-soportes', false)
on conflict (id) do nothing;

-- Helpers para RLS
CREATE OR REPLACE FUNCTION public.usuario_actual_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid()
     OR lower(u.usuario) = lower(split_part(COALESCE(auth.jwt()->>'email',''), '@', 1))
  ORDER BY CASE WHEN u.auth_user_id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.usuario_actual_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.rol FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid()
     OR lower(u.usuario) = lower(split_part(COALESCE(auth.jwt()->>'email',''), '@', 1))
  ORDER BY CASE WHEN u.auth_user_id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.usuario_es_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(u.es_super_admin,false) FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid()
     OR lower(u.usuario) = lower(split_part(COALESCE(auth.jwt()->>'email',''), '@', 1))
  ORDER BY CASE WHEN u.auth_user_id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1;
$$;

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_soportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_revisiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ventas_select" ON public.ventas;
CREATE POLICY "ventas_select" ON public.ventas
FOR SELECT TO authenticated
USING (
  asesor_id = public.usuario_actual_id()
  OR public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
  OR public.usuario_es_super_admin()
);

DROP POLICY IF EXISTS "ventas_insert" ON public.ventas;
CREATE POLICY "ventas_insert" ON public.ventas
FOR INSERT TO authenticated
WITH CHECK (asesor_id = public.usuario_actual_id());

DROP POLICY IF EXISTS "ventas_update" ON public.ventas;
CREATE POLICY "ventas_update" ON public.ventas
FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "venta_soportes_select" ON public.venta_soportes;
CREATE POLICY "venta_soportes_select" ON public.venta_soportes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ventas v
    WHERE v.id = venta_soportes.venta_id
    AND (
      v.asesor_id = public.usuario_actual_id()
      OR public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
      OR public.usuario_es_super_admin()
    )
  )
);

DROP POLICY IF EXISTS "venta_soportes_insert" ON public.venta_soportes;
CREATE POLICY "venta_soportes_insert" ON public.venta_soportes
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ventas v
    WHERE v.id = venta_soportes.venta_id
    AND v.asesor_id = public.usuario_actual_id()
  )
);

DROP POLICY IF EXISTS "venta_revisiones_select" ON public.venta_revisiones;
CREATE POLICY "venta_revisiones_select" ON public.venta_revisiones
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ventas v
    WHERE v.id = venta_revisiones.venta_id
    AND (
      v.asesor_id = public.usuario_actual_id()
      OR public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
      OR public.usuario_es_super_admin()
    )
  )
);

DROP POLICY IF EXISTS "venta_revisiones_insert" ON public.venta_revisiones;
CREATE POLICY "venta_revisiones_insert" ON public.venta_revisiones
FOR INSERT TO authenticated
WITH CHECK (
  public.usuario_actual_rol() IN ('Supervisor','Revisor','Administrador')
  OR public.usuario_es_super_admin()
);

-- Storage: cada archivo queda bajo una carpeta con el id de la venta.
DROP POLICY IF EXISTS "venta_storage_select" ON storage.objects;
CREATE POLICY "venta_storage_select" ON storage.objects
FOR SELECT TO authenticated
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

DROP POLICY IF EXISTS "venta_storage_insert" ON storage.objects;
CREATE POLICY "venta_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'venta-soportes'
  AND EXISTS (
    SELECT 1
    FROM public.ventas v
    WHERE v.id::text = (storage.foldername(name))[1]
    AND v.asesor_id = public.usuario_actual_id()
  )
);

-- updated_at
CREATE OR REPLACE FUNCTION public.ventas_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ventas_updated_at ON public.ventas;
CREATE TRIGGER trigger_ventas_updated_at
BEFORE UPDATE ON public.ventas
FOR EACH ROW EXECUTE FUNCTION public.ventas_updated_at();
