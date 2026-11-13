-- CHAT DIGITAL - CORRECCIÓN FINAL CONTROL COMERCIAL
-- Ejecutar DESPUÉS de supabase_ventas_setup.sql y SUPABASE_CONTROL_COMERCIAL_FINAL.sql
-- Corrige el caso usuario_actual_id = NULL cuando auth_user_id no está asociado.

CREATE OR REPLACE FUNCTION public.usuario_actual_id()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.id
  FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid()
     OR lower(u.usuario) = lower(split_part(COALESCE(auth.jwt()->>'email',''), '@', 1))
  ORDER BY CASE WHEN u.auth_user_id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.usuario_actual_rol()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.rol
  FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid()
     OR lower(u.usuario) = lower(split_part(COALESCE(auth.jwt()->>'email',''), '@', 1))
  ORDER BY CASE WHEN u.auth_user_id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.usuario_es_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(u.es_super_admin,false)
  FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid()
     OR lower(u.usuario) = lower(split_part(COALESCE(auth.jwt()->>'email',''), '@', 1))
  ORDER BY CASE WHEN u.auth_user_id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1;
$$;

-- Asegura que el usuario del correo de Auth quede asociado a su perfil.
-- No cambia contraseñas ni datos personales.
UPDATE public.usuarios u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.auth_user_id IS NULL
  AND lower(u.usuario) = lower(split_part(COALESCE(au.email,''), '@', 1));

-- Verificación: debe devolver el ID, rol y si es SuperAdmin del usuario conectado.
SELECT public.usuario_actual_id() AS usuario_actual_id,
       public.usuario_actual_rol() AS usuario_actual_rol,
       public.usuario_es_super_admin() AS usuario_es_super_admin;

-- Verificación de metas del mes actual.
SELECT id, asesor_id, anio, mes, meta, activo
FROM public.metas_comerciales
WHERE anio = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  AND mes = EXTRACT(MONTH FROM CURRENT_DATE)::integer
ORDER BY asesor_id;
