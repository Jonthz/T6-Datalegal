# Incidente AWS: HTTP 500 en `/api/v1/treatment-activities`

Fecha de investigacion local: 2026-08-17

## Resumen ejecutivo

El fallo mas probable no esta en el frontend ni en los cambios pendientes del asistente RoT. En la rama local que se usaria para PR (`main` local, tambien publicada como `origin/merge-rot-wizard-fixes-main`), el diff contra `origin/main` solo toca:

- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/pages/TreatmentActivities.tsx`

El backend de `treatment-activities` no cambia en esa rama pendiente. El error reproducido localmente apunta a deriva de esquema: el backend actual espera columnas nuevas en `treatment_activities`, pero la base de datos no las tiene.

La traza local relevante fue:

```text
sqlite3.OperationalError: no such column: treatment_activities.rat_code
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such column: treatment_activities.rat_code
```

En PostgreSQL/AWS el equivalente esperado seria algo como:

```text
psycopg2.errors.UndefinedColumn: column treatment_activities.rat_code does not exist
```

## Impacto

Si la base desplegada no tiene las columnas esperadas por el ORM, cualquier lectura que cargue el modelo completo `TreatmentActivity` puede fallar con 500. Eso bloquea:

- `GET /api/v1/treatment-activities`
- `GET /api/v1/treatment-activities?status=ACTIVE`
- `GET /api/v1/treatment-activities/{id}`
- pantallas que dependen de esa lista, por ejemplo evaluaciones de riesgo.

## Evidencia en el codigo

El endpoint lista actividades cargando el ORM completo:

```py
q = db.query(TreatmentActivity).filter(TreatmentActivity.tenant_id == tenant_id)
return q.offset(skip).limit(limit).all()
```

Archivo: `backend/app/api/v1/treatment_activities.py`

El modelo actual contiene columnas nuevas, entre ellas:

- `rat_code`
- `legal_bases`
- `complementary_legal_bases`
- `area`
- `operational_owner`
- `data_categories`
- `data_origin`
- `treatment_operations`
- `uses_profiling`
- `uses_ai`
- `automated_decision`
- `requires_dpia`
- `has_special_data`
- `involves_minors`
- `recipients`
- `processors`
- `system_platform`
- `technical_measures`
- `organizational_measures`
- `physical_measures`
- `legal_measures`
- `mtge_score`
- `mtge_result`

Archivo: `backend/app/models/treatment_activity.py`

Esas columnas se agregan en la migracion:

```text
backend/alembic/versions/d1a7b2c3e4f5_rat_catalog_versioning.py
revision = d1a7b2c3e4f5
```

## Contraste con la rama pendiente de PR

La rama pendiente (`origin/merge-rot-wizard-fixes-main`) no introduce este backend. Contra `origin/main`, los cambios pendientes son de frontend y estan relacionados con:

- redireccion de usuarios de plataforma desde rutas de tenant;
- flujo del asistente RoT para no guardar borradores en pasos intermedios y guardar al finalizar.

Conclusion: no conviene meter un "fix" de backend en ese PR salvo que se decida ampliar el alcance. El problema AWS debe tratarse principalmente como problema de migraciones/deploy.

## Por que puede verse distinto en `/ropa`

El reporte de AWS indicaba que `/api/v1/ropa` devuelve 200. En el codigo actual, `/ropa` tambien consulta `TreatmentActivity` completo:

```py
activities = db.query(TreatmentActivity).filter(TreatmentActivity.tenant_id == tenant_id).all()
```

Archivo: `backend/app/api/v1/ropa.py`

Si AWS realmente responde 200 en `/ropa` pero 500 en `/treatment-activities`, hay dos posibilidades importantes:

1. AWS no esta ejecutando exactamente el mismo backend que esta rama/main actual.
2. Hay despliegue desfasado o mixto: frontend/backend/version de imagen/base no estan alineados.

Por eso se recomienda confirmar commit o version de imagen desplegada, ademas del estado de Alembic.

## Comandos recomendados en AWS

Ejecutar dentro del entorno real del backend, con `DATABASE_URL` apuntando a la base de produccion.

### 1. Confirmar revision de migracion

```bash
cd backend
alembic current
alembic heads
```

Resultado esperado:

```text
d1a7b2c3e4f5 (head)
```

Si `current` esta vacio, atrasado, o no coincide con `heads`, la base no esta al dia.

### 2. Confirmar columnas reales

En PostgreSQL:

```sql
select column_name
from information_schema.columns
where table_name = 'treatment_activities'
  and column_name in (
    'rat_code',
    'legal_bases',
    'complementary_legal_bases',
    'area',
    'mtge_result'
  )
order by column_name;
```

Tambien sirve:

```sql
\d+ treatment_activities
```

Si faltan esas columnas, esa es la causa del 500.

### 3. Aplicar migraciones

Antes de ejecutar, hacer backup/snapshot de la base de produccion.

```bash
cd backend
alembic upgrade head
```

Luego volver a comprobar:

```bash
alembic current
```

Debe quedar en:

```text
d1a7b2c3e4f5 (head)
```

### 4. Probar endpoints

Con token valido:

```bash
curl -i "$API_BASE/api/v1/treatment-activities" \
  -H "Authorization: Bearer $TOKEN"

curl -i "$API_BASE/api/v1/treatment-activities?status=ACTIVE" \
  -H "Authorization: Bearer $TOKEN"

curl -i "$API_BASE/api/v1/treatment-activities/1" \
  -H "Authorization: Bearer $TOKEN"
```

Resultado esperado: `200`, no `500`.

## Revisar entrypoint/comando de AWS

En el repo, el Dockerfile actual si corre migraciones antes de iniciar Uvicorn:

```dockerfile
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

Archivo: `backend/Dockerfile`

Tambien `docker-compose.yml` corre:

```bash
alembic upgrade head && python -m app.db.seed_dev && uvicorn ...
```

Si AWS usa otro entrypoint, ECS task definition, Elastic Beanstalk command, script, imagen antigua o override de comando, puede estar saltandose `alembic upgrade head`. Esa es la primera configuracion a revisar.

## Checklist para el agente/persona de AWS

1. Identificar commit SHA o tag de la imagen backend actualmente desplegada.
2. Confirmar si el comando real de arranque ejecuta `alembic upgrade head`.
3. Obtener logs del backend alrededor del 500 y buscar `UndefinedColumn`, `rat_code` o `treatment_activities`.
4. Ejecutar `alembic current` y `alembic heads` contra la DB de produccion.
5. Verificar columnas reales de `treatment_activities`.
6. Hacer backup/snapshot.
7. Ejecutar `alembic upgrade head` si la DB esta atrasada.
8. Reprobar los tres endpoints de lectura.
9. Reprobar pantallas dependientes: Treatment activities y Risk assessments.

## Que hacer en local para el PR

Para el PR de la rama actual, no hace falta cambiar backend por este incidente. Lo correcto es:

1. Mantener el PR enfocado en los cambios de frontend del asistente RoT y rutas de tenant.
2. No agregar una solucion que oculte el error seleccionando menos columnas en el endpoint; eso podria esconder una base desactualizada y dejar otros endpoints rotos.
3. Incluir este reporte como referencia para quien haga el despliegue AWS.
4. Si se quiere validar localmente con DB limpia, levantar via Docker Compose, porque ese flujo si ejecuta `alembic upgrade head`.

## Nota sobre la DB local directa

La DB SQLite local usada por el backend levantado directo (`backend/datalegal.db`) no estaba versionada en Alembic (`NO_VERSION`) y no tenia las columnas nuevas. Al correr `alembic upgrade head`, Alembic intento aplicar la migracion baseline desde cero y fallo porque ya existian tablas como `action_plan_templates`.

Eso no cambia el diagnostico de AWS, pero explica por que el entorno local directo puede reproducir el 500 si su DB esta vieja o creada fuera de Alembic.
