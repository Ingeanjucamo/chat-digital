-- Chat Digital: campo para identificar las ventas cargadas desde el módulo de fin de semana.
-- Ejecutar una sola vez en Supabase: SQL Editor.
ALTER TABLE public.ventas
ADD COLUMN IF NOT EXISTS cargue_fin_semana boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ventas_cargue_fin_semana
ON public.ventas (asesor_id, fecha_llamada, cedula_cliente)
WHERE cargue_fin_semana = true;
