# Corrección Dashboard Comercial — Cantadas por día

Se actualizó `client/src/components/DashboardComercial/DashboardComercial.jsx` y su CSS.

## Cambios

- Filtro por fecha desde/hasta.
- Filtro por sala.
- Filtro por asesor.
- Cantadas del período seleccionado.
- Cantadas acumuladas desde el primer día del mes hasta la fecha final seleccionada.
- Tabla de rendimiento para varios asesores.
- Meta, faltantes, descuentos y cumplimiento por asesor.
- Resumen operativo con HC, meta, ejecutado, cumplimiento y ratio por asesor.
- Gráfico de cantadas por día.
- Distribución de cantadas por sala.
- Resumen de activos vs cantadas.
- Presupuesto diario según la fecha filtrada y presupuesto mensual.
- Compatibilidad de Supabase con `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_SUPABASE_ANON_KEY`.
- Se eliminó la dependencia de un `empresaResumen` declarado después de su uso.

## Importante

Después de cambiar `client/.env`, reinicia Vite (`npm run dev`).

### Supabase: paso obligatorio

En el proyecto de Supabase abre **SQL Editor** y ejecuta el archivo:

`SUPABASE_CONTROL_COMERCIAL_COMPLETO.sql`

Ese archivo crea las tablas `metas_comerciales` y `novedades_comerciales`, agrega los campos de venta caída por titular y deja las políticas necesarias para que el SuperAdmin pueda modificar metas y registrar descuentos.

Si no se ejecuta ese SQL, Administración mostrará el error `Could not find the table public.metas_comerciales`.

### Corrección visual

El indicador circular de **Meta del período** ahora queda contenido dentro de su tarjeta. El círculo interior ya no usa posicionamiento absoluto respecto de toda la página, por lo que no debe aparecer como una bola blanca flotando al hacer scroll.

El ZIP conserva el `.env` que venía en el proyecto para el entorno local. No publiques ese archivo en un repositorio.

## Base de datos

El dashboard utiliza las estructuras que ya existen en el proyecto, especialmente:

- `vw_dashboard_asesores`
- `vw_dashboard_empresa`
- `calendario_comercial`
- `ventas`

La aplicación no intenta cambiar tipos de columnas de las vistas, evitando el error de PostgreSQL relacionado con `numeric` vs `numeric(14,2)`.

### Ajuste adicional
Se eliminó del dashboard administrativo el panel duplicado "Ventas cantadas por día" con sus filtros propios. Los filtros globales de fecha, sala y asesor que están arriba ahora son los únicos filtros de la vista administrativa, mientras que el gráfico de cantadas por día se mantiene como visualización.

## Control comercial SuperAdmin

Se agregó `supabase_control_comercial.sql` para crear:

- `metas_comerciales`: meta mensual configurable por asesor.
- `novedades_comerciales`: novedades con descuento por asesor y fecha.
- RLS: lectura para dashboard y escritura únicamente SuperAdmin.

En **Administración**, el SuperAdmin verá el bloque **Metas y novedades** para modificar la meta mensual y registrar/eliminar descuentos.

El dashboard utiliza esas configuraciones cuando existen. Si todavía no se ejecutó el SQL, conserva la información de las vistas actuales.
