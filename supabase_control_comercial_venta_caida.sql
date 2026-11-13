-- ================================================================
-- CONTROL COMERCIAL: DESCUENTO DE UNA VENTA REAL
-- Ejecutar DESPUÉS de supabase_control_comercial.sql
-- ================================================================

ALTER TABLE public.novedades_comerciales
  ADD COLUMN IF NOT EXISTS venta_id bigint NULL REFERENCES public.ventas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente_nombre text NULL,
  ADD COLUMN IF NOT EXISTS cliente_numero text NULL;

CREATE INDEX IF NOT EXISTS idx_novedades_comerciales_venta
  ON public.novedades_comerciales(venta_id);

-- Una venta no puede descontarse dos veces mientras el descuento siga activo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_novedades_comerciales_venta_activa
  ON public.novedades_comerciales(venta_id)
  WHERE activo = true AND venta_id IS NOT NULL;

-- Las ventas ya existen y se consultan desde el panel del SuperAdmin.
-- No se modifica el estado de la venta: el descuento queda registrado
-- como una novedad comercial y resta 1 a la meta ajustada del asesor.

-- Verificación:
-- SELECT id, asesor_id, venta_id, cliente_nombre, cliente_numero, fecha, motivo, descuento, activo
-- FROM public.novedades_comerciales
-- ORDER BY created_at DESC;
