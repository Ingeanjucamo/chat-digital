-- Migracion exclusiva de campos de formulario Ventas Hogar AMV CRM.
-- No elimina ni recrea tablas, ni modifica campos/constraints de Ventas Movil salvo
-- ampliar el campo origen para aceptar las opciones compartidas actuales.
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS telefono_1 text,
  ADD COLUMN IF NOT EXISTS telefono_2 text,
  ADD COLUMN IF NOT EXISTS regional text;

DO $$
DECLARE constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'ventas'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%origen%'
  LOOP
    EXECUTE format('ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_origen_hogar_movil_check
  CHECK (origen IN ('CRM','BASE','GESTION PROPIA','REDES','REFERIDO','OCM','B2CHAT'));



-- Completar de forma segura todos los campos Hogar usados por el CRM nuevo.
-- ADD COLUMN IF NOT EXISTS no borra ni altera ventas existentes.
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS departamento text,
  ADD COLUMN IF NOT EXISTS cantidad_servicios text,
  ADD COLUMN IF NOT EXISTS todo_claro text,
  ADD COLUMN IF NOT EXISTS telefonia text,
  ADD COLUMN IF NOT EXISTS tv text,
  ADD COLUMN IF NOT EXISTS internet text,
  ADD COLUMN IF NOT EXISTS ultra_wifi numeric,
  ADD COLUMN IF NOT EXISTS cantidad_decos integer,
  ADD COLUMN IF NOT EXISTS instalacion text,
  ADD COLUMN IF NOT EXISTS fecha_instalacion date,
  ADD COLUMN IF NOT EXISTS servicios_adicionales text,
  ADD COLUMN IF NOT EXISTS tipo_venta_hogar text,
  ADD COLUMN IF NOT EXISTS ot text,
  ADD COLUMN IF NOT EXISTS ott_adicional text,
  ADD COLUMN IF NOT EXISTS ott_incluidas text,
  ADD COLUMN IF NOT EXISTS politica text,
  ADD COLUMN IF NOT EXISTS cuenta text,
  ADD COLUMN IF NOT EXISTS segmento text,
  ADD COLUMN IF NOT EXISTS oferta text,
  ADD COLUMN IF NOT EXISTS renta numeric(12,2),
  ADD COLUMN IF NOT EXISTS cantidad_decos_adicionales integer,
  ADD COLUMN IF NOT EXISTS telefono_1 text,
  ADD COLUMN IF NOT EXISTS telefono_2 text,
  ADD COLUMN IF NOT EXISTS regional text;

-- Recargar el cache de esquema de PostgREST/Supabase.
NOTIFY pgrst, 'reload schema';
