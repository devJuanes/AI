# Pasarela de pagos — Matu AI + PayMatuByte + Bold

Guía corta para entender el flujo sin leer todo el código.

## ¿Quién hace qué?

| Pieza | Rol |
|-------|-----|
| **Matu AI** (este repo) | Tu app: recargas, saldo, tokens. El usuario paga desde Facturación. |
| **PayMatuByte** (`PayMatuByte/`) | API central de MatuByte: habla con Bold y redirige de vuelta a tu app. |
| **Bold** | Pasarela: tarjeta, PSE, Nequi, etc. El usuario paga en la página de Bold. |

No metes las llaves de Bold en Matu AI. Solo en PayMatuByte (`.env`).

## Flujo en 5 pasos

```text
1. Usuario en Facturación → "Ir a pagar"
2. API Matu AI crea recarga pendiente y llama a PayMatuByte (POST /v1/payment)
3. El navegador abre la URL de checkout de Bold
4. Bold cobra y redirige a PayMatuByte (/v1/pay/return/matu-ai?reference=...)
5. PayMatuByte consulta el estado y redirige a tu dashboard con ?paid=true&reference=...
   → La pantalla "pago-resultado" confirma con la API y acredita el saldo
```

## Importante: Bold y `localhost`

Bold **no acepta** `callback_url` con `http://localhost` → responde **403** (`BOLD_API_ERROR`).

Opciones en local:

1. **Rápido (solo tarjeta):** en PayMatuByte `.env` agrega `BOLD_DEV_NO_CALLBACK=true` y reinicia PayMatuByte. Pagas en Bold; el retorno automático al dashboard no funcionará hasta usar HTTPS.
2. **Completo (PSE + retorno):** `ngrok http 3000` y en PayMatuByte `.env` pon `PAYMATUBYTE_PUBLIC_URL=https://TU-SUBDOMINIO.ngrok-free.app` (HTTPS).

## Producción (VPS)

**PayMatuByte:** `https://pay.matubyte.com`  
**Matu AI API** (`~/apps/matu-ai/.env`):

```env
PAYMATUBYTE_URL=https://pay.matubyte.com
PAYMATUBYTE_API_KEY=<igual que apiKey en ~/apps/pay/config/apps/matu-ai.yaml>
BILLING_MOCK_CHECKOUT=false
```

En el servidor:

```bash
cd ~/apps/matu-ai
bash deploy/patch-paymatu-production.sh
pm2 restart matu-ai-api
```

Si `https://pay.matubyte.com/health` muestra HTML 404, arregla nginx en `~/apps/pay` (`deploy/fix-nginx-pay.sh`).

---

## Qué debes tener encendido para probar en local

1. **PayMatuByte** en `http://localhost:3000` (`npm run dev` en esa carpeta).
2. **API Matu AI** en `http://localhost:3001`.
3. **Dashboard** en `http://localhost:5173` (`npm run dev` en `dashboard/`).
4. Variables en `AI/api/.env` (ver `.env.example`): `PAYMATUBYTE_*` y `BILLING_MOCK_CHECKOUT=false`.
5. El `apiKey` del YAML `config/apps/matu-ai.yaml` debe ser **igual** a `PAYMATUBYTE_API_KEY` en la API de AI.

## Monedas (USD / COP)

- En el dashboard el usuario elige **USD** o **COP**.
- Siempre guardamos el saldo en **USD** (tokens por USD).
- PayMatuByte envía el cobro a Bold en **COP** (`convertUsdToCop: true` en `matu-ai.yaml`):
  - Monto en COP → se cobra ese valor en pesos.
  - Monto en USD → PayMatuByte convierte con la API de cambio (misma idea que fymapp).

## Variables importantes (API Matu AI)

```env
PAYMATUBYTE_URL=http://localhost:3000
PAYMATUBYTE_API_KEY=pk_matu_ai_local_dev_cambiar
PAYMATUBYTE_APP_ID=matu-ai
BILLING_MOCK_CHECKOUT=false
```

- `BILLING_MOCK_CHECKOUT=true` → recarga al instante sin Bold (solo pruebas de saldo).
- Con `false` y PayMatuByte configurado → flujo real con Bold.

## Producción (cuando subas)

En `matu-ai.yaml` ya está la URL de retorno de producción. En la API de AI:

```env
PAYMATUBYTE_URL=https://pay.matubyte.com
PAYMATUBYTE_API_KEY=<mismo apiKey que config/apps/matu-ai.yaml en el servidor>
BILLING_MOCK_CHECKOUT=false
```

En el VPS PayMatuByte (`~/apps/pay`): `PAYMATUBYTE_PUBLIC_URL=https://pay.matubyte.com`.  
Deploy: [PayMatuByte deploy/DEPLOY.md](https://github.com/MatuByte-S-A-S/pay/blob/main/deploy/DEPLOY.md).

## Endpoints que usa Matu AI

| Llamada | Desde |
|---------|--------|
| `POST /v1/payment` | API AI → PayMatuByte (crear link) |
| `GET /v1/payment/link/:reference` | API AI → PayMatuByte (verificar PAID) |
| `POST /api/billing/recharge` | Dashboard → API AI |
| `POST /api/billing/confirm-return` | Pantalla pago-resultado → API AI |

## Si algo falla

- **403 en PayMatuByte**: revisa `AUTHORIZATION_BOLD_DEV` en PayMatuByte (formato `x-api-key ...`).
- **No redirige al dashboard**: `returnUrls.development` en `matu-ai.yaml` debe coincidir con la URL del Vite (puerto 5173).
- **Pago OK pero saldo no sube**: abre la URL de retorno con `reference`; la pantalla llama a `confirm-return`. Revisa que la referencia coincida con la transacción pendiente.

Más detalle técnico de PayMatuByte: `PayMatuByte/README.md` y `Bold.md`.
