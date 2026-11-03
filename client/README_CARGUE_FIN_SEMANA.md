# Cargue de ventas de fin de semana

Se agregó en el menú lateral un módulo separado para capturar ventas realizadas el sábado o domingo anterior, con acceso de lunes y martes.

## Importante: ejecutar la migración en Supabase
Antes de desplegar/usar el módulo, abra Supabase > SQL Editor y ejecute el archivo `CARGUE_FIN_SEMANA.sql`. Este agrega el campo `cargue_fin_semana` para identificar el origen de esas ventas.

El módulo registra `fecha_llamada` como fecha real de realización y Supabase registra `created_at` como fecha/hora del cargue. La venta queda con estado `PENDIENTE`, igual que el flujo regular, y el módulo realiza una comprobación preventiva de duplicados por asesor, fecha, identificación y producto.

La pantalla es una entrada simplificada para datos principales. Asegúrese de revisar y completar datos requeridos de la operación antes de aprobación.
