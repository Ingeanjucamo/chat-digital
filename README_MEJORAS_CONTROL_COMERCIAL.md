# Chat Digital — mejoras Control Comercial

Esta versión trabaja sobre el proyecto original `client/` y conserva el módulo de ventas, administración y dashboard.

## Cambios principales

### Ventas por período
- Al entrar a Ventas se muestra automáticamente el mes actual.
- Las ventas de meses anteriores no se borran.
- Un asesor solo trabaja/consulta el mes actual.
- Supervisor, Administrador y SuperAdmin pueden seleccionar otro mes/año.
- SuperAdmin/Supervisor/Administrador tienen acceso a **Ver histórico**.
- Los indicadores y el listado se calculan sobre el período seleccionado.
- El Excel respeta el período seleccionado cuando no está activo el histórico.

### Dashboard Comercial
- Al cambiar mes/año se actualizan automáticamente las fechas Desde/Hasta.
- Se reinician los filtros de sala y asesor al cambiar de período para evitar mezclar meses.
- Se eliminó una instrucción duplicada que podía generar problemas de mantenimiento.

### Administración / Control Comercial
- El bloque de Control Comercial puede ocultarse/mostrarse.
- Se agregaron tarjetas resumen de asesores activos, metas configuradas, seleccionados y novedades.
- La asignación de metas sigue permitiendo seleccionar varios asesores a la vez.
- El período de metas se mantiene separado por año/mes.

### Supabase / identidad
- `usuario_actual_id()`, `usuario_actual_rol()` y `usuario_es_super_admin()` ahora intentan identificar el perfil por `auth_user_id` y, como respaldo, por el nombre de usuario del correo de Auth.
- Se agregó `SUPABASE_CONTROL_COMERCIAL_ULTIMO.sql` para corregir perfiles que quedaron sin `auth_user_id` y verificar la identidad actual.
- Las políticas de ventas contemplan Supervisor, Revisor y Administrador donde corresponde.

## Importante
El cambio de mes es un filtro de período: **no elimina ventas históricas**. Las ventas quedan almacenadas en Supabase y se pueden consultar mediante Histórico.

Para corregir el mensaje:
`usuario_actual_id: null`
se debe ejecutar en Supabase SQL Editor:
`SUPABASE_CONTROL_COMERCIAL_ULTIMO.sql`

Después de ejecutarlo, cerrar sesión y volver a entrar a Chat Digital.
