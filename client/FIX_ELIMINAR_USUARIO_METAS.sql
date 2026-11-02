-- Corrige el error al eliminar un usuario que tiene una meta asignada.
-- La meta pertenece al asesor, por lo que al eliminar el asesor
-- también deben eliminarse sus registros de metas_asesores.

ALTER TABLE public.metas_asesores
DROP CONSTRAINT IF EXISTS metas_asesores_asesor_id_fkey;

ALTER TABLE public.metas_asesores
ADD CONSTRAINT metas_asesores_asesor_id_fkey
FOREIGN KEY (asesor_id)
REFERENCES public.usuarios(id)
ON DELETE CASCADE;

-- Verificación opcional:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'metas_asesores_asesor_id_fkey';
