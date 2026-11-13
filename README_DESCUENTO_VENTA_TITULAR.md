# Descuento de venta caída por titular

Esta versión modifica el módulo **Administración > Metas y novedades** para que el SuperAdmin pueda:

1. Seleccionar un asesor.
2. Ver las ventas reales de ese asesor del mes seleccionado.
3. Seleccionar una venta mostrando **cliente + número + fecha**.
4. Registrar el motivo de la caída por titular.
5. Descontar exactamente **1 venta** de la meta ajustada.
6. Guardar una referencia a la venta (`venta_id`) y una copia del nombre/número del cliente.
7. Evitar que la misma venta tenga dos descuentos activos.

## Supabase

Ejecuta `supabase_control_comercial.sql` completo. El archivo ahora incluye también las columnas necesarias para las ventas descontadas y es compatible con una instalación donde la tabla ya existía.

El descuento **no elimina ni cambia el estado de la venta original**. La venta queda en el histórico de ventas y el registro comercial descuenta 1 de la meta ajustada del asesor.
