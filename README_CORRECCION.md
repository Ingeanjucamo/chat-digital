# Corrección Dashboard Comercial

## 1. Frontend
En `client/.env` ya están configuradas las variables de Supabase usadas por el proyecto.

Si se copia el proyecto a otro entorno, revisar que existan:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## 2. Supabase
Ejecutar una sola vez en Supabase SQL Editor:

`fix_calendario_comercial_rls.sql`

Esto permite que usuarios autenticados consulten `public.calendario_comercial`. Sin esta política, la aplicación puede recibir `[]` aunque el SQL Editor sí vea las filas.

## 3. Ejecutar
Desde `client`:

```bash
npm install
npm run dev
```

## 4. Resultado esperado para septiembre de 2026
Con los registros de calendario existentes, el asesor debe ver los días laborales y la proyección calculados desde `calendario_comercial`.

El cálculo usa:

- días laborales: `es_habil = true`
- días transcurridos: días hábiles con `fecha <= hoy`
- días restantes: días hábiles con `fecha > hoy`
- días disponibles desde hoy: días hábiles con `fecha >= hoy`
- hoy debo hacer: `ceil(faltan / días disponibles desde hoy)`
- proyección: ritmo actual por días laborales del mes
