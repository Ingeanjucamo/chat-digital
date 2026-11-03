-- Ejecutar una sola vez en Supabase SQL Editor para reparar el check constraint.
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS tipo_cargue TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS ventas_tipo_cargue_check;
UPDATE public.ventas SET tipo_cargue='NORMAL' WHERE tipo_cargue IS NULL OR tipo_cargue NOT IN ('NORMAL','FIN_SEMANA');
ALTER TABLE public.ventas ADD CONSTRAINT ventas_tipo_cargue_check CHECK (tipo_cargue IN ('NORMAL','FIN_SEMANA'));
