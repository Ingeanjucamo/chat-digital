-- AMV CRM: habilitar adjuntos del chat para TODOS los usuarios autenticados
-- Ejecutar en Supabase > SQL Editor.
-- Bucket utilizado por el chat: archivos
-- La subida desde el cliente usa upsert:true, por eso se requieren INSERT y UPDATE.

DROP POLICY IF EXISTS "amv_chat_archivos_insert_authenticated" ON storage.objects;
CREATE POLICY "amv_chat_archivos_insert_authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'archivos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "amv_chat_archivos_update_authenticated" ON storage.objects;
CREATE POLICY "amv_chat_archivos_update_authenticated"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'archivos' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'archivos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "amv_chat_archivos_select_authenticated" ON storage.objects;
CREATE POLICY "amv_chat_archivos_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'archivos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "amv_chat_archivos_delete_authenticated" ON storage.objects;
CREATE POLICY "amv_chat_archivos_delete_authenticated"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'archivos' AND auth.uid() IS NOT NULL);
