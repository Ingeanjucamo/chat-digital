-- Chat Digital: clasificacion interna de ventas normales y fin de semana
-- Ejecutar una sola vez en Supabase > SQL Editor.
ALTER TABLE public.ventas
ADD COLUMN IF NOT EXISTS tipo_cargue TEXT NOT NULL DEFAULT 'NORMAL';

UPDATE public.ventas
SET tipo_cargue = 'NORMAL'
WHERE tipo_cargue IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ventas_tipo_cargue_check'
      AND conrelid = 'public.ventas'::regclass
  ) THEN
    ALTER TABLE public.ventas
    ADD CONSTRAINT ventas_tipo_cargue_check
    CHECK (tipo_cargue IN ('NORMAL', 'FIN_SEMANA'));
  END IF;
END $$;
