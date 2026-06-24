# Deployment: Vercel + Railway

## Objetivo

Desplegar DataLegal con:

- Frontend React/Vite en Vercel.
- Backend FastAPI en Railway.
- PostgreSQL administrado en Railway.

El frontend sigue llamando `/api/v1`; Vercel reescribe `/api/*` hacia Railway.

## Backend En Railway

1. Crear un proyecto en Railway.
2. Agregar un servicio PostgreSQL.
3. Crear un servicio backend desde el repo con root directory `backend`.
4. Usar el Dockerfile del backend.
5. Configurar variables:

```text
ENVIRONMENT=production
DATABASE_URL=<Railway Postgres URL>
SECRET_KEY=<random 48+ chars>
MFA_ENCRYPTION_KEY=<Fernet key>
CORS_ORIGINS=https://<frontend>.vercel.app
SHOW_DOCS=false
SEED_DEV_DATA=false
SEED_MOCK_DATA=false
```

Generar secretos localmente:

```powershell
cd backend
python -c "from app.core.config import generate_secret_key; print(generate_secret_key())"
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

El contenedor ejecuta automaticamente:

```sh
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Validar:

```text
https://<backend>.railway.app/health
```

En production, `/api/docs` debe responder 404.

## Bootstrap Inicial De Produccion

No activar seed demo en production. Para crear el primer tenant y usuario `SUPER_ADMIN`,
ejecutar una sola vez:

```sh
python -m app.db.bootstrap_prod
```

Con estas variables disponibles en Railway:

```text
BOOTSTRAP_TENANT_NAME=DataLegal Produccion
BOOTSTRAP_TENANT_RUC=<ruc>
BOOTSTRAP_TENANT_COUNTRY=Ecuador
BOOTSTRAP_TENANT_SECTOR=TECHNOLOGY
BOOTSTRAP_ADMIN_EMAIL=<email admin>
BOOTSTRAP_ADMIN_PASSWORD=<password fuerte>
BOOTSTRAP_ADMIN_NAME=<nombre admin>
```

El comando es idempotente:

- Si el tenant ya existe por RUC, lo reutiliza.
- Si el admin ya existe y es `SUPER_ADMIN`, no lo duplica.
- Si el admin existe con otro rol, falla y no lo modifica.

Despues del bootstrap, remover las variables `BOOTSTRAP_*` si no se volveran a usar.

## Frontend En Vercel

1. Crear proyecto Vercel desde el repo con root directory `frontend`.
2. Build command:

```text
npm run build
```

3. Output directory:

```text
dist
```

4. Actualizar `frontend/vercel.json`:

```json
{
  "source": "/api/:path*",
  "destination": "https://<backend>.railway.app/api/:path*"
}
```

5. Deploy.

Validar:

```text
https://<frontend>.vercel.app/
https://<frontend>.vercel.app/dashboard
```

Login debe llamar a:

```text
https://<frontend>.vercel.app/api/v1/auth/login
```

y Vercel debe reenviar esa llamada a Railway.

## Checklist

- `docker compose config`
- `pylint backend`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `GET /health` en Railway
- `/api/docs` apagado en production
- Login con usuario bootstrap
- Dashboard carga datos sin errores de red

## Pendientes Posteriores

- Dominio custom.
- Backups administrados y prueba de restore.
- Storage externo para documentos.
- Logging/monitoring externo.
- Sentry o equivalente.
- WAF/Cloudflare si se requiere endurecimiento adicional.
