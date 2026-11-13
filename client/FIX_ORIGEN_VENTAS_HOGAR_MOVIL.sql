-- AMV CRM: corregir validación de origen para ventas Móvil y Hogar
-- Ejecutar en Supabase > SQL Editor sobre la base de datos del CRM.
-- Permite las opciones que muestran actualmente los formularios y conserva MASIVOS
-- como valor histórico para registros anteriores.

ALTER TABLE public.ventas
  DROP CONSTRAINT IF EXISTS ventas_origen_hogar_movil_check;

ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_origen_hogar_movil_check
  CHECK (
    origen IS NOT NULL
    AND origen IN (
      'CRM',
      'BASE',
      'GESTION PROPIA',
      'CAMPAÑA',
      'MASIVOS',
      'REDES',
      'REFERIDO',
      'OCM',
      'B2CHAT'
    )
  );
