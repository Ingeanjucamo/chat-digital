-- AMV CRM | Reparacion definitiva RLS Ventas Cantadas
-- Ejecutar en Supabase SQL Editor como propietario del proyecto.
-- Permite INSERT y UPDATE (incluido upsert) a Supervisor/Admin/Jefe de Sala.
-- No desactiva RLS ni altera registros existentes.

ALTER TABLE public.ventas_cantadas_diarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ventas_cantadas_select ON public.ventas_cantadas_diarias;
CREATE POLICY ventas_cantadas_select
ON public.ventas_cantadas_diarias
FOR SELECT TO authenticated
USING (
  asesor_id = public.usuario_actual_id()
  OR LOWER(TRIM(COALESCE(public.usuario_actual_rol(), ''))) IN
     ('supervisor','revisor','administrador','admin','jefe de sala','jefe_sala','jefe sala')
  OR public.usuario_es_super_admin()
);

DROP POLICY IF EXISTS ventas_cantadas_insert ON public.ventas_cantadas_diarias;
CREATE POLICY ventas_cantadas_insert
ON public.ventas_cantadas_diarias
FOR INSERT TO authenticated
WITH CHECK (
  LOWER(TRIM(COALESCE(public.usuario_actual_rol(), ''))) IN
     ('supervisor','administrador','admin','jefe de sala','jefe_sala','jefe sala')
  OR public.usuario_es_super_admin()
);

DROP POLICY IF EXISTS ventas_cantadas_update ON public.ventas_cantadas_diarias;
CREATE POLICY ventas_cantadas_update
ON public.ventas_cantadas_diarias
FOR UPDATE TO authenticated
USING (
  LOWER(TRIM(COALESCE(public.usuario_actual_rol(), ''))) IN
     ('supervisor','administrador','admin','jefe de sala','jefe_sala','jefe sala')
  OR public.usuario_es_super_admin()
)
WITH CHECK (
  LOWER(TRIM(COALESCE(public.usuario_actual_rol(), ''))) IN
     ('supervisor','administrador','admin','jefe de sala','jefe_sala','jefe sala')
  OR public.usuario_es_super_admin()
);

GRANT SELECT, INSERT, UPDATE ON public.ventas_cantadas_diarias TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.ventas_cantadas_diarias_id_seq TO authenticated;
