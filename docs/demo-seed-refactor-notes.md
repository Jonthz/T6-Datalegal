# Demo Seed Refactor Notes

## Contexto

El mock data actual se carga desde el backend para poblar Postgres y permitir que el frontend use la API real. Esto es mejor que simular datos solo en React porque valida rutas, permisos, reportes, relaciones y pantallas completas.

El problema es que el dataset demo crecio dentro de `backend/app/db/seed_dev.py`, mezclando logica de seed con datos hardcoded. Funciona para desarrollo, pero no es la forma mas mantenible para dejarlo como base final.

## Evaluacion

Para un seed minimo de desarrollo, tener datos hardcoded en Python es aceptable:

- tenant demo
- usuario admin
- algunos catalogos base
- pocos registros necesarios para arrancar

Para mock data mediana o grande, conviene separar responsabilidades:

- la logica de idempotencia y relaciones debe vivir en Python
- los datos demo deberian vivir en estructuras aparte
- `seed_dev.py` deberia ser un orquestador pequeno

## Riesgo De Dejarlo Como Esta

- `seed_dev.py` se vuelve dificil de revisar.
- Cambiar nombres, cantidades o escenarios demo implica tocar logica.
- Aumenta el riesgo de romper pylint o introducir duplicados.
- Es menos claro que datos son mock y que datos son seed base real.

## Refactor Recomendado

Separar el seed en tres capas:

```text
backend/app/db/seed_dev.py
  - valida ENVIRONMENT y flags
  - abre/cierra sesion DB
  - ejecuta seed minimo y, si aplica, demo completo

backend/app/db/demo_seed.py
  - helpers get_or_create
  - funciones idempotentes por dominio
  - armado de relaciones entre entidades

backend/app/db/demo_data.py
  - listas/dicts de departamentos
  - usuarios demo
  - catalogos
  - actividades
  - riesgos
  - incidentes
  - documentos
  - training
```

Alternativa: mover `demo_data.py` a JSON/YAML si se quiere que el dataset sea editable por personas no tecnicas. Para este proyecto, un `demo_data.py` tipado es probablemente suficiente y evita agregar parsers o dependencias.

## Decision Temporal

Por ahora se deja el seed funcional como esta para no cortar el avance visual/demo. Antes de abrir PR o antes de consolidar la rama, conviene refactorizarlo para que `seed_dev.py` no concentre todo el mock data.

## Criterio De Aceptacion Futuro

- `seed_dev.py` queda corto y solo orquesta.
- El dataset demo sigue siendo idempotente y no destructivo.
- `SEED_MOCK_DATA=true` sigue activando el dataset completo.
- No se cambian rutas, modelos, migraciones ni contratos API.
- `pylint backend` y `tests/test_sprint5.py` siguen pasando.
