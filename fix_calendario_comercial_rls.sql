-- ============================================================
-- FIX: calendario_comercial no debe aparecer como 0 en el dashboard
-- ============================================================
-- El SQL Editor puede ver la tabla aunque el usuario autenticado de
-- la aplicación no tenga una política SELECT. En ese caso Supabase
-- devuelve [] y el dashboard termina mostrando 0 días.
--
-- Ejecutar este archivo UNA VEZ en Supabase > SQL Editor.
-- ============================================================

ALTER TABLE public.calendario_comercial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendario_comercial_select" ON public.calendario_comercial;

CREATE POLICY "calendario_comercial_select"
ON public.calendario_comercial
FOR SELECT
TO authenticated
USING (true);

GRANT SELECT ON TABLE public.calendario_comercial TO authenticated;

-- Comprobación rápida:
-- SELECT fecha, es_habil, meta_diaria
-- FROM public.calendario_comercial
-- WHERE anio = 2026 AND mes = 9
-- ORDER BY fecha;
