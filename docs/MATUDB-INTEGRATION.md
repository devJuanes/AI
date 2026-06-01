# MatuDB en Matu AI

Matu AI usa **MatuDB** como base de datos (PostgreSQL self-hosted vía `@devjuanes/matuclient`), igual que MatuSupport y Winquina.

## Configuración

En `.env` del proyecto:

```env
MATUDB_URL=https://db.matudb.com
MATUDB_PROJECT_ID=tu-project-id-matu-ai
MATUDB_SERVICE_KEY=mb_tu_service_key
```

El backend usa la **service key** para operaciones de servidor (registro, API keys, logs). No confundir `MATUDB_URL` con `API_PORT` (Matu AI API local en 3001).

## Esquema

Ejecutar una vez por proyecto MatuDB:

```bash
npm run db:setup
```

Crea las tablas en `api/sql/schema.sql`:

- `ai_users` — cuentas del dashboard
- `ai_api_keys` — claves de consumo `mai_live_*`
- `ai_usage_logs` — telemetría de uso

## Cliente en código

```typescript
import { getDb } from './db/matu.js'

const db = getDb()
const { data, error } = await db
  .from('ai_users')
  .select('id, email, name')
  .eq('email', email)
  .maybeSingle()
```

Patrones importantes (igual que en MatuSupport):

- Filtros **antes** de update: `db.from('t').eq('id', x).update({ ... })`
- `.maybeSingle()` cuando puede no existir fila
- `.is('revoked_at', null)` para valores NULL

## Referencia completa del SDK

Ver [MATUDB.md](./MATUDB.md) (documentación de `@devjuanes/matuclient`).
