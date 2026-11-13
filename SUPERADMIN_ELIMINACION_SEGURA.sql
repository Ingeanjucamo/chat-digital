-- ============================================================
-- CHAT DIGITAL: archivo seguro de usuarios por SUPER ADMIN
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Archivar un usuario no borra sus ventas, soportes, revisiones ni mensajes históricos.

-- Deshabilita cualquier versión previa de la función para eliminar ventas.
-- Esto solo elimina la función SQL; no borra ninguna venta ni su historial.
DROP FUNCTION IF EXISTS public.superadmin_eliminar_venta(bigint, text);
DROP FUNCTION IF EXISTS public.superadmin_eliminar_venta(text, bigint);
-- ============================================================

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS eliminado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eliminado_en timestamptz,
  ADD COLUMN IF NOT EXISTS eliminado_por bigint;

-- Compatibilidad: recuperar usuarios existentes si la columna ya existía
-- pero quedó con NULL. No se elimina ni modifica su historial.
UPDATE public.usuarios SET eliminado = false WHERE eliminado IS NULL;
ALTER TABLE public.usuarios ALTER COLUMN eliminado SET DEFAULT false;



CREATE OR REPLACE FUNCTION public.superadmin_archivar_usuario(p_usuario_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_id bigint;
BEGIN
  IF NOT public.usuario_es_super_admin() THEN
    RAISE EXCEPTION 'Solo el Super Admin puede retirar usuarios.' USING ERRCODE = '42501';
  END IF;

  v_super_id := public.usuario_actual_id();

  IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id AND COALESCE(es_super_admin,false)) THEN
    RAISE EXCEPTION 'No se puede retirar una cuenta Super Admin.';
  END IF;

  UPDATE public.usuarios
  SET activo = false,
      eliminado = true,
      eliminado_en = now(),
      eliminado_por = v_super_id
  WHERE id = p_usuario_id AND COALESCE(eliminado,false) = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el usuario o ya está retirado.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'usuario_id', p_usuario_id);
END;
$$;


REVOKE ALL ON FUNCTION public.superadmin_archivar_usuario(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.superadmin_archivar_usuario(bigint) TO authenticated;

-- Índice para consultar usuarios no retirados.
CREATE INDEX IF NOT EXISTS idx_usuarios_no_eliminados ON public.usuarios(id) WHERE eliminado = false;

-- Verificación rápida después de ejecutar:
-- SELECT id, usuario, activo, eliminado, eliminado_en FROM public.usuarios ORDER BY id;


-- Recargar la caché de funciones de la API REST de Supabase.
NOTIFY pgrst, 'reload schema';
