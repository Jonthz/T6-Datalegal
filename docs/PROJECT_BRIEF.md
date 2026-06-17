# DataLegal 2.0 — Project Brief

> Resumen ejecutivo que **todo agente** (humano o IA) debe leer antes de tocar el repo.
> Esto se genera por el orquestador a partir del PDF de requerimientos
> (`plans/datalegal-2.0/raw/datalegal-source.pdf`, 216 pp).

## 1. Qué es DataLegal 2.0

Plataforma **multi-tenant** de cumplimiento normativo para empresas que tienen que
adecuarse a la **LOPDP** (Ley Orgánica de Protección de Datos Personales — Ecuador).
Cubre el ciclo completo:

1. Gestión de la organización (multi-tenant, roles, departamentos, MFA).
2. Inventario de datos y procesamiento (RoT — Records of Treatment, ROPA).
3. Análisis y evaluación de riesgo (EIPD / DPIA, score, real-time).
4. Generación documental (avisos de privacidad, contratos, ROPA).
5. Planes de acción (remediación, seguimiento, KPIs).
6. Soporte transversal: auditoría inmutable, alertas, backups, import/export,
   notificaciones, capacitación, dashboards, SLA ARCO.

## 2. Stakeholders principales

- Cliente / Sponsor: Eng. Daniel Villalba.
- Equipo de desarrollo: Team 6 (ESPOL).
- Usuarios finales: DPO, oficiales de cumplimiento, jefes de departamento,
  auditores internos/externos, titulares de datos.

## 3. Alcance del MVP (resumido)

- Onboarding multi-tenant con aislamiento por empresa y por departamento.
- Autenticación con MFA, lockout, matriz de permisos por módulo.
- RoT wizard guiado, catálogos maestros versionados, carga masiva.
- Cálculo de riesgo en tiempo real con score y EIPD.
- ARCO: solicitudes, SLA, entregables interoperables.
- Bitácora inmutable y exportable.
- Reportes filtrables (PDF/CSV), dashboards con KPIs.
- Backups con RPO/RTO definidos.
- Interfaz y documentos en inglés para el MVP.

## 4. Cifras del plan

- **5 Sprints**, 45 User Stories totales (US-RF01-1 … US-RF43-1).
- **43 Requerimientos Funcionales** agrupados en **6 módulos** (4.1 … 4.6).
- **RNFs** en 3 grupos (producto, externos, organizacionales).
- **16 Use Cases** documentados.
- **147 imágenes/diagramas UML** extraídos del PDF (use case, clase, componentes,
  objetos, despliegue, actividad, secuencia, comunicación, estado, prototipo).

## 5. Sprints (orden de ejecución)

| Sprint | Foco | User Stories |
|--------|------|--------------|
| 1 | Foundation and Core Architecture | RF01-1, RF02-1, RF17-1, RF19-1, RF22-1, RF24-1, RF26-1, RF27-1, RF40-1, RF41-1 |
| 2 | Data Inventory and Initial Risk Analysis | RF01-2, RF02-2, RF08-1, RF28-1, RF29-1, RF35-1, RF36-1, RF37-1, RF38-1, RF39-1 |
| 3 | Compliance Functionalities and Advanced Management | RF03-1, RF04-1, RF09-1, RF10-1, RF11-1, RF30-1, RF31-1, RF43-1 |
| 4 | Auditing, Documentation, and Refinement | RF05-1, RF12-1, RF13-1, RF14-1, RF20-1, RF25-1, RF32-1, RF33-1, RF34-1, RF42-1 |
| 5 | Operations, Reports, and Dashboards | RF06-1, RF07-1, RF15-1, RF16-1, RF18-1, RF21-1, RF23-1 |

Detalle de cada uno en `docs/plan/sprints/sprint-NN.md`.

## 6. Mapa de módulos funcionales

| Código | Módulo | RFs |
|--------|--------|-----|
| 4.1 | Organization Management | RF-01, 02, 03, 19, 24, 34, 39, 41 |
| 4.2 | Data Registry and Processing | RF-04, 05, 06, 11, 29, 32, 35, 36 |
| 4.3 | Risk Analysis | RF-09, 10, 37, 40 |
| 4.4 | Document Generation | RF-07, 08, 14, 25, 26, 30, 31, 33, 38 |
| 4.5 | Action Plan | RF-12, 13, 15, 16, 42, 43 |
| 4.6 | Transversal and Support | RF-17, 18, 20, 21, 22, 23, 27, 28 |

Detalle por módulo en `docs/plan/requirements/module-*.md` y RNFs en
`docs/plan/requirements/rnf.md`.

## 7. Decisiones técnicas

**Pendiente.** El PDF no fija un stack obligatorio (sí menciona Jira para Scrum
y testing con CI/CD + Codecov). El stack se decide en el **Sprint 1** y queda
fijado en `CLAUDE.md` por el ejecutor.

Restricciones explícitas que sí hay:
- Multi-tenant con aislamiento estricto (R-01 es riesgo crítico).
- MFA obligatorio.
- Logs inmutables (append-only / hash-chain).
- Backups con RPO/RTO.
- UI y documentos en inglés (MVP).
- Cumplimiento LOPDP (Ecuador).

## 8. Cómo se trabaja este repo

Ver `ORCHESTRATOR.md` (cómo orquesta el agente) y `CLAUDE.md` (qué se le pide
al ejecutor cada sprint). Resumen:

1. El orquestador genera un briefing por sprint con: este Brief, el sprint MD,
   los RFs/RNFs referenciados y las imágenes UML aplicables.
2. Lanza `claude -p` en el repo. Claude Code crea rama `sprint/NN-...`,
   implementa, testea, documenta y abre PR a `main`.
3. El humano (Luis) revisa y mergea los PRs.

## 9. Riesgos top declarados en el PDF

- **R-01**: Fallo de aislamiento multi-tenant (crítico).
- **R-03**: Mala interpretación de la LOPDP.
- **R-08**: Estrategia de testing deficiente.

(Detalle de planes de acción en el PDF, pp.19-23.)
