# Chat Digital — versión final Control Comercial

## Qué se corrigió

### 1. Meta del asesor
La meta configurada por SuperAdmin ahora es la fuente de verdad del panel del asesor.

Si SuperAdmin asigna 45 ventas a un asesor para octubre de 2026, el asesor verá inmediatamente:

- Meta: 45
- Cantadas: 0 (si todavía no ha registrado ventas)
- Me faltan: 45
- Cumplimiento: 0%
- Proyección calculada según el calendario laboral

No necesita subir una venta para que aparezca la meta.

### 2. Descuentos / novedades
Una venta caída por titular se selecciona desde las ventas reales del asesor.

Se guarda:
- asesor
- venta
- nombre del cliente
- número del cliente
- fecha
- motivo
- observación
- descuento de 1 venta

La meta ajustada se calcula como:

`Meta ajustada = Meta base - descuentos`

Nunca se suma el descuento a la meta.

### 3. Cantadas
Cada venta registrada cuenta como cantada, independientemente de si después queda pendiente, aprobada, rechazada o por corregir.

El dashboard permite filtrar por:
- fecha inicial
- fecha final
- sala
- asesor

El acumulado mensual conserva las ventas anteriores aunque se filtre un día concreto.

### 4. Administración
- Sidebar fijo.
- Contenido de Administración con scroll vertical real.
- Lista de usuarios sin una segunda barra que bloquee el resto de la página.
- Metas y novedades quedan debajo de usuarios y se pueden alcanzar normalmente.
- Seleccionar asesores no debe mandar la página a un espacio vacío.
- Se pueden seleccionar varios asesores y aplicar la misma meta de una sola vez.

### 5. Identidad Supabase
Se corrigió la función que identifica al usuario conectado para que primero use `auth_user_id` y, si un perfil antiguo todavía no lo tiene, pueda resolverlo mediante el usuario del correo Auth (`usuario@chat-digital.online`).

Esto evita que un asesor tenga una meta guardada en Supabase pero no pueda verla por RLS.

## IMPORTANTE — Supabase

Ejecuta una sola vez en Supabase SQL Editor:

`SUPABASE_CONTROL_COMERCIAL_FINAL.sql`

Después de ejecutarlo, verifica:

```sql
SELECT public.usuario_actual_id(), public.usuario_actual_rol(), public.usuario_es_super_admin();
```

Para comprobar metas:

```sql
SELECT *
FROM public.metas_comerciales
ORDER BY anio DESC, mes DESC, asesor_id;
```

## Ejecutar el proyecto

Dentro de `client`:

```bash
npm install
npm run dev -- --port 5173
```

Después de cambiar SQL o `.env`, recarga con `Ctrl + Shift + R`.


### 6. Eliminación segura por Super Admin (actualización 2026-10-09)
- Solo Super Admin ve las acciones para retirar usuarios y eliminar ventas.
- Retirar usuario lo archiva (`activo=false`, `eliminado=true`); no borra físicamente el registro ni rompe las claves foráneas de ventas, revisiones o mensajes.
- Las ventas siguen asociadas a su fecha original. Al cambiar de mes, el panel mensual filtra por el período seleccionado y no arrastra ventas al mes siguiente.
- Eliminar venta la marca como eliminada y exige motivo. Deja de contar en los indicadores y se guarda una auditoría en `ventas_eliminaciones`; no se destruyen automáticamente los soportes.
- **Antes de probar estas acciones, ejecutar `SUPERADMIN_ELIMINACION_SEGURA.sql` en Supabase > SQL Editor.** El archivo crea columnas y funciones RPC protegidas por la verificación de Super Admin.
