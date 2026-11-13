-- ============================================================
-- CAMPOS HOGAR PARA LA TABLA EXISTENTE public.ventas
-- No borra ni recrea la tabla.
-- ============================================================

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
  ADD COLUMN IF NOT EXISTS cantidad_decos_adicionales integer;

CREATE INDEX IF NOT EXISTS idx_ventas_producto_hogar
  ON public.ventas(producto);
