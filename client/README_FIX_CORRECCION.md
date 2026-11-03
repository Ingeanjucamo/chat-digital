CAMBIOS DE CORRECCIÓN DE VENTAS

- El supervisor devuelve la venta y deja la observación; no se eliminan los soportes.
- El asesor corrige campos y puede mantener soportes cargados antes.
- En caso de elegir una imagen nueva, se reemplaza solo el soporte correspondiente.
- Se guarda tipo_cargue (NORMAL = Hoy, FIN_SEMANA = Fin de semana) y fecha_llamada al reenviar.
- En el formulario de corrección se muestran enlaces firmados a los soportes existentes.

Si el envío de imágenes continúa fallando por permisos/configuración de Supabase Storage,
ejecuta REPARAR_STORAGE_SOPORTES_VENTAS.sql desde Supabase SQL Editor una vez.
El bucket queda privado y los permisos están limitados al asesor propietario y los revisores autorizados.
