-- Chat Digital: sala asignada a cada asesor
-- Ejecutar en Supabase > SQL Editor
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS sala TEXT DEFAULT 'Sala 1';

UPDATE public.usuarios
SET sala = 'Sala 1'
WHERE sala IS NULL OR trim(sala) = '';

ALTER TABLE public.usuarios
ADD CONSTRAINT usuarios_sala_check
CHECK (sala IN ('Sala 1', 'Sala 2', 'Sala 3', 'Sala 4'));
