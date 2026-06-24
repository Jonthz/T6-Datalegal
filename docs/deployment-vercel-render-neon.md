# Deployment: Vercel + Render + Neon

Esta es la ruta recomendada para un MVP sin Railway:

- Frontend React/Vite en Vercel.
- Backend FastAPI en Render Free Web Service.
- PostgreSQL administrado en Neon Free.

El frontend sigue llamando `/api/v1`; Vercel reescribe `/api/*` hacia Render.

## 1. Crear Base En Neon

1. Crear proyecto en Neon.
2. Copiar el connection string de PostgreSQL.
3. Usar la variante pooled si Neon la ofrece para aplicaciones web.
4. Confirmar que la URL incluya SSL, por ejemplo:

```text
postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

Ese valor sera `DATABASE_URL` en Render.

## 2. Backend En Render

Opcion recomendada: crear el servicio desde el `render.yaml` del repo.

Render debe detectar:

- Service name: `datalegal-backend`
- Runtime: Docker
- Root directory: `backend`
- Dockerfile: `backend/Dockerfile`
- Plan: Free
- Health check: `/health`

Variables de entorno obligatorias:

```text
ENVIRONMENT=production
DATABASE_URL=<Neon Postgres URL con sslmode=require>
SECRET_KEY=<random 48+ chars>
MFA_ENCRYPTION_KEY=<Fernet key>
CORS_ORIGINS=https://<frontend>.vercel.app
SHOW_DOCS=false
SEED_DEV_DATA=false
SEED_MOCK_DATA=false
```

Tambien existe una plantilla en `.env.render.example`. Puedes copiar sus valores en
Render > Web Service > Environment y reemplazar los placeholders por secretos reales.
No subas un `.env` real al repo.

Generar secretos localmente:

```powershell
cd backend
python -c "import secrets; print(secrets.token_urlsafe(48))"
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

El `Dockerfile` ya ejecuta migraciones antes de arrancar:

```sh
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Validar backend:

```text
https://<backend>.onrender.com/health
```

Debe responder algo como:

```json
{"status":"ok","version":"0.1.0","environment":"production"}
```

En production, `/api/docs` debe estar apagado si `SHOW_DOCS=false`.

## 3. Bootstrap Del Primer Admin

Render no debe correr mock data en production. Para crear el primer tenant y usuario, ejecutar una vez un shell/job manual en Render con estas variables:

```text
BOOTSTRAP_TENANT_NAME=DataLegal MVP
BOOTSTRAP_TENANT_RUC=1799999999001
BOOTSTRAP_ADMIN_EMAIL=<email real>
BOOTSTRAP_ADMIN_PASSWORD=<password fuerte>
BOOTSTRAP_ADMIN_NAME=<nombre real>
```

Comando:

```sh
python -m app.db.bootstrap_prod
```

Es idempotente:

- Si el tenant por RUC no existe, lo crea.
- Si el admin por email no existe, lo crea como `SUPER_ADMIN`.
- Si el usuario existe con otro rol, falla para no sobrescribir datos.

## 4. Frontend En Vercel

Configurar proyecto Vercel:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Actualizar `frontend/vercel.json` cuando Render entregue la URL real:

```json
{
  "source": "/api/:path*",
  "destination": "https://<backend>.onrender.com/api/:path*"
}
```

Despues del primer deploy de Vercel, volver a Render y ajustar:

```text
CORS_ORIGINS=https://<frontend>.vercel.app
```

Si luego se usa dominio propio, agregarlo tambien separado por coma:

```text
CORS_ORIGINS=https://<frontend>.vercel.app,https://app.datalegal.example
```

## 5. Validaciones

Backend:

```text
GET https://<backend>.onrender.com/health
GET https://<backend>.onrender.com/api/docs
```

Resultado esperado:

- `/health` responde `200`.
- `/api/docs` responde `404` en production con docs apagados.

Frontend:

```text
GET https://<frontend>.vercel.app/
GET https://<frontend>.vercel.app/dashboard
POST https://<frontend>.vercel.app/api/v1/auth/login
```

Resultado esperado:

- `/` carga la app.
- `/dashboard` no da 404 por fallback SPA.
- Login usa el rewrite de Vercel hacia Render.

## 6. Limitaciones Del MVP

- Render Free puede dormir por inactividad, por lo que el primer request puede tardar.
- Neon Free puede pausar o escalar a cero cuando esta inactivo.
- No hay storage externo productivo para documentos/backups avanzados.
- No hay dominio custom, observabilidad, Sentry ni backups operativos completos.
- Para cliente real en uso continuo, pasar a un plan pago o VPS administrado.
