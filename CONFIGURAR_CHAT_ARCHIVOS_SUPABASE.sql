-- Configuracion necesaria para adjuntar imagenes/archivos en el chat interno.
-- Ejecutar en Supabase SQL Editor del proyecto.

ALTER TABLE public.mensajes
  ADD COLUMN IF NOT EXISTS archivo jsonb;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-archivos',
  'chat-archivos',
  true,
  10485760,
  ARRAY['image/*','application/pdf','text/plain']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760;

-- Lectura publica de los archivos adjuntos del chat (bucket publico).
DROP POLICY IF EXISTS "chat_archivos_lectura_publica" ON storage.objects;
CREATE POLICY "chat_archivos_lectura_publica"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-archivos');

-- Usuarios autenticados pueden subir archivos al bucket.
DROP POLICY IF EXISTS "chat_archivos_subida_autenticados" ON storage.objects;
CREATE POLICY "chat_archivos_subida_autenticados"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-archivos');

-- Usuarios autenticados pueden eliminar archivos del bucket, por limpieza.
DROP POLICY IF EXISTS "chat_archivos_borrado_autenticados" ON storage.objects;
CREATE POLICY "chat_archivos_borrado_autenticados"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-archivos');
