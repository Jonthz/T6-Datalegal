# Demo Credentials

Credenciales para demostracion del MVP. Estos usuarios vienen de
`backend/app/db/seed_dev.py` y deben usarse solo en entornos demo/desarrollo.

## Password Comun

```text
Admin123!
```

## Usuarios Demo

| Email | Nombre | Rol | Departamento | Uso recomendado |
| --- | --- | --- | --- | --- |
| `admin@datalegal.local` | DataLegal Admin | `SUPER_ADMIN` | N/A | Administracion total del tenant demo |
| `dpo@datalegal.local` | Camila Andrade | `DPO` | Legal y Cumplimiento | Gestion de cumplimiento y privacidad |
| `admin.ops@datalegal.local` | Mateo Rivas | `ADMIN` | Legal y Cumplimiento | Operacion administrativa del tenant |
| `tech@datalegal.local` | Sofia Molina | `DEPT_HEAD` | Tecnologia | Responsable departamental tecnico |
| `rrhh@datalegal.local` | Daniel Paredes | `DEPT_HEAD` | Talento Humano | Responsable departamental de RRHH |
| `auditor@datalegal.local` | Valeria Torres | `AUDITOR` | Legal y Cumplimiento | Revision, auditoria y lectura |

## Diferencias Esperadas

- `SUPER_ADMIN` puede administrar tenants, usuarios, backups y configuracion amplia.
- `DEPT_HEAD` tiene permisos limitados y, en modulos con alcance departamental, ve solo registros de su departamento.
- `AUDITOR` opera principalmente en modo lectura y auditoria; no debe crear usuarios, departamentos, catalogos ni actividades.

## Reset Controlado En Neon

Si un usuario demo ya existe en Neon pero no acepta `Admin123!`, cargar `.env.render`
en una terminal local y ejecutar el siguiente comando desde `backend` para resetear
solo esos usuarios demo:

```powershell
uv run python -c "import app.db.init_db; from app.db.session import SessionLocal; from app.core.security import get_password_hash; from app.models.user import User; emails=['admin@datalegal.local','dpo@datalegal.local','admin.ops@datalegal.local','tech@datalegal.local','rrhh@datalegal.local','auditor@datalegal.local']; db=SessionLocal(); updated=0; pwd=get_password_hash('Admin123!'); users=db.query(User).filter(User.email.in_(emails)).all(); [setattr(u,'hashed_password',pwd) for u in users]; updated=len(users); db.commit(); print('reset demo passwords:', updated); db.close()"
```

No usar estas credenciales como usuarios reales de produccion.
