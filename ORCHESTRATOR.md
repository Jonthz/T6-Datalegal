# DataLegal 2.0 — Manera de trabajar del Orquestador

Yo (Hermes/Claude opus-4-7) actúo como **orquestador**. Claude Code (`claude -p`) es el
**ejecutor** que escribe el código real. Este documento describe el flujo. Es la fuente
de verdad: si cambia, se actualiza acá primero.

## 0. Fuentes y rutas

- **Repo de código**: `~/workspace/projects/datalegal-2.0/` → GitHub `lacedeno11/datalegal-2.0` (privado).
- **Plan / contexto humano-curado**: `~/workspace/plans/datalegal-2.0/`
  - `raw/` → el PDF original y assets crudos del cliente.
  - `sprints/` → un `sprint-NN.md` por sprint, autocontenido.
  - `requirements/` → RF y RNF troceados (`RF-XXX.md`, `RNF-XXX.md`).
  - `diagrams/` → imágenes UML + un `.md` por diagrama con la descripción.
  - `INDEX.md` → índice maestro (qué hay, dónde, en qué sprint se usa).
- **Memoria de ejecución**: `~/workspace/memory/sprints/datalegal-2.0/`
  - `sprint-NN-session.json` → resumen de cada corrida de Claude Code.
- **Logs crudos**: `~/workspace/logs/datalegal-2.0/sprint-NN.log`.

## 1. Fase de ingesta (una sola vez, antes del Sprint 1)

1. Recibo el PDF, lo guardo en `plans/datalegal-2.0/raw/`.
2. Extraigo texto + imágenes (`pdftotext`, `pdfimages` o `marker-pdf`).
3. Troceo el contenido en archivos chicos:
   - Un `.md` por sprint en `plans/.../sprints/`.
   - Un `.md` por RF / RNF en `plans/.../requirements/`.
   - Un `.md` por diagrama (con la imagen al lado y descripción del UML).
4. Genero `plans/datalegal-2.0/INDEX.md` con:
   - Lista de sprints (id, objetivo, RFs asociados, diagramas asociados).
   - Lista de RF/RNF (id, título, sprint dueño).
   - Lista de diagramas (archivo, tipo UML, sprints que lo consumen).
5. Hago commit en el repo de un `docs/PROJECT_BRIEF.md` con el resumen global
   (visión, alcance, stack si está definido, glosario). Eso queda dentro del repo
   para que Claude Code lo lea en todos los sprints.

## 2. Ciclo por sprint (automatizado)

Para cada sprint N (1..K):

1. **Preparar contexto**: armo un *briefing* en `/tmp/datalegal-sprint-N-brief.md`
   concatenando:
   - `docs/PROJECT_BRIEF.md`
   - `plans/.../sprints/sprint-NN.md`
   - Los RF/RNF que el sprint referencia
   - Las descripciones de los diagramas que aplican
   - Reglas duras (abajo).
2. **Lanzar Claude Code** en el repo:
   ```
   cd ~/workspace/projects/datalegal-2.0
   claude -p "$(cat /tmp/datalegal-sprint-N-brief.md)" \
          --permission-mode acceptEdits \
          --output-format stream-json --verbose \
          > ~/workspace/logs/datalegal-2.0/sprint-NN.log
   ```
3. **Reglas duras que le paso a Claude Code en cada sprint**:
   - Crear rama `sprint/NN-<slug>` desde `main` antes de tocar nada.
   - Implementar SOLO el alcance del sprint (no adelantar otros).
   - Generar/actualizar tests; dejar el build verde.
   - Actualizar `CLAUDE.md` (raíz) y `docs/sprints/sprint-NN.md` con
     decisiones, cómo correr, qué quedó pendiente.
   - Commits convencionales (`feat:`, `fix:`, `docs:` …).
   - Push de la rama y abrir PR `main` ← `sprint/NN-...` con checklist.
   - NO mergear a `main` automáticamente (lo reviso yo / el humano).
4. **Verificación del orquestador** al terminar:
   - Confirmar que la rama existe en remoto, el PR está abierto,
     `CLAUDE.md` y `docs/sprints/sprint-NN.md` están actualizados.
   - Correr `scripts/run-tests.sh` si aplica.
   - Guardar `memory/sprints/datalegal-2.0/sprint-NN-session.json` con
     status, archivos tocados, problemas, próximos pasos.
5. **Avanzar al siguiente sprint** automáticamente (siguiente proceso `claude -p`,
   contexto fresco; lo único compartido es lo que ya está commiteado en el repo
   y los `.md` del plan). Esto se repite hasta el último sprint, sin pedir
   permiso entre sprints.

## 3. Qué pasa si algo falla

- Si Claude Code termina con exit != 0 o no abre PR: marco el sprint como
  `failed` en memory/, dejo el log, e intento UNA segunda corrida con el
  mismo contexto + el error. Si vuelve a fallar, paro la cadena y reporto al usuario.
- Nunca borro ramas ni fuerzo push sobre `main`.
- Credenciales nunca van al PDF, al brief ni a commits. El token vive en
  `~/workspace/credentials/git-token` y solo se usa para `git push` vía HTTPS.

## 4. Scripts que sostienen esto

- `~/workspace/scripts/datalegal/ingest-pdf.sh` — extrae texto+imágenes y prepara plans/.
- `~/workspace/scripts/datalegal/run-sprint.sh N` — arma brief y lanza Claude Code.
- `~/workspace/scripts/datalegal/run-all.sh` — corre sprint 1..K en cadena.

Se crean cuando lleguen el PDF y los sprints reales (no antes, para no inventar).
