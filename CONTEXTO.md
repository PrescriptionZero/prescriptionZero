# Contexto Completo — Proyecto "Recetas Digitales para Viajeros" (Hack Buenos Aires, Midnight)

Pegar este archivo completo al inicio de un chat nuevo para continuar sin perder contexto. Versión extendida con detalle profundo de backend y frontend.

---

## 1. El evento (resumen)

- **Hack Buenos Aires**, hackathon oficial de Midnight Network (LATAM), 7-8 de agosto 2026, Palermo, Buenos Aires.
- 48 horas, red de pruebas **Preview** de Midnight (requiere dust del faucet de Preview). Deadline: sábado 13:00 GMT-3, sin extensión.
- Premios: $10.000 USD total, Track Beginner (equipo sin experiencia previa en Midnight) y Track Open, $3.500/$1.500 cada uno.
- **Evaluación**: 70% código (Engineering & Implementation 40%, QA & Reliability 15%, UX/Design 15%) + 30% pitch (Producto/Visión 15%, Comunicación 10%, Negocio 5%). **Descalificación automática si el contrato Compact no compila.**
- Submission: repo público con label `midnightntwrk`, pitch deck, video demo, código 100% net-new (nada escrito antes del 7/8), Apache 2.0.

## 2. El equipo

4 personas, experiencia en React/TypeScript/PostgreSQL, primera vez con Web3/ZK. División: **Dev-ZK-1, Dev-ZK-2** (contratos Compact) / **Dev-FE-1, Dev-FE-2** (React + PostgreSQL + integración).

## 3. El proyecto — resumen ejecutivo

**Pitch en una frase**: un viajero que contrata asistencia médica internacional recibe su receta como QR privado, validado por una farmacia partner en el país donde está, sin exponer su diagnóstico ni su identidad a nadie de la cadena.

**Modelo de negocio**: B2B — el cliente que paga es la empresa de asistencia al viajero/seguro de viaje (tipo Assist Card, Universal Assistance, Assist America), no el viajero directamente. El viajero es el usuario final del producto.

**Validación de mercado (ya investigada)**:
- Assist America tiene un "US Pharmacy Locator" real.
- International Assistance Group: +160 partners/proveedores acreditados, 150 centros de alarma 24/7, +180 millones de viajeros/año cubiertos.
- WorldTrips y Universal Assistance confirman ayuda para encontrar farmacias/cubrir medicamentos en destino.
- **Conclusión**: el modelo de red de farmacias/médicos partner en el exterior YA EXISTE. Lo que no existe es la digitalización privada — hoy la coordinación es manual/telefónica y expone el diagnóstico completo en cada paso. Ahí está la innovación del proyecto.

**Nombre**: sin definir. Opciones: Rx0 (recomendado, top 1), Nyx, ZKeta, RecetaZero, Cripta Rx, VeilRx, Umbral.

---

## 4. Arquitectura general (visión de punta a punta)

```
[Médico de la red] --(1) emite receta--> [Backend] --(2) hash/commitment--> [Contrato Compact, red Preview]
                                              |
                                              v
                                     [PostgreSQL: metadata no sensible]

[Paciente/celular] --(3) recibe receta (privada, local)--> genera QR con ID corto

[Farmacia partner] --(4) escanea QR--> [Backend] --(5) arma prueba ZK + llama al contrato--> [Contrato Compact]
                                                                                                     |
                                                                                          (6) responde válido/inválido
                                                                                                     |
                                                                                       [Farmacia ve solo ✅/❌ + datos del medicamento]
```

Tres roles de usuario = tres experiencias de frontend distintas, un solo backend, un solo contrato.

---

## 5. BACKEND — Detalle completo

### 5.1 Stack
- **Runtime**: Node.js v22+.
- **Framework**: Express (o Fastify, lo que el equipo ya conozca de proyectos anteriores) — API REST simple, no hace falta GraphQL para el alcance de 48h.
- **Base de datos**: PostgreSQL.
- **ORM/query builder sugerido**: Prisma o Knex (lo que agilice más dado que ya conocen Postgres) — opcional, con SQL plano también alcanza para el MVP.
- **SDK de Midnight**: TypeScript SDK que genera el propio compilador de Compact al compilar el contrato — el backend importa esa API generada para llamar a `registerPrescription` y `validatePrescription`.
- **Generación de QR**: librería `qrcode` (del lado de la ruta que atiende al Paciente).
- **Variables de entorno necesarias** (`.env`):
  ```
  DATABASE_URL=postgresql://usuario:password@localhost:5432/recetas_viajero
  PROOF_SERVER_URL=http://localhost:6300
  MIDNIGHT_NETWORK=preview
  CONTRACT_ADDRESS=<dirección del contrato ya deployado en Preview>
  PORT=3001
  ```

### 5.2 Estructura de carpetas sugerida
```
backend/
├── src/
│   ├── index.ts                 # arranque del server, CORS, escucha en 0.0.0.0
│   ├── routes/
│   │   ├── medico.routes.ts      # endpoints del rol Médico
│   │   ├── paciente.routes.ts    # endpoints del rol Paciente
│   │   └── farmacia.routes.ts    # endpoints del rol Farmacia
│   ├── services/
│   │   ├── contract.service.ts   # toda la lógica de llamar al contrato Compact vía SDK
│   │   ├── db.service.ts         # conexión y queries a PostgreSQL
│   │   └── qr.service.ts         # generación/lectura de IDs cortos para QR
│   ├── models/
│   │   └── (tipos TypeScript compartidos con el frontend, si el repo es monorepo)
│   └── config/
│       └── env.ts                # carga y valida las variables de entorno
├── .env
└── package.json
```

### 5.3 Esquema de PostgreSQL (detallado)

**Tabla `usuarios_prueba`** (login simulado — reemplaza un sistema de auth real):
| Columna | Tipo | Detalle |
|---|---|---|
| id | UUID (PK) | |
| nombre | text | "Dr. García", "Paciente Juan", etc. |
| rol | enum('medico', 'paciente', 'farmacia') | |
| matricula | text, nullable | solo para rol médico — este mismo dato es la "lista de médicos válidos" que usa el circuito |
| pais | text, nullable | para el rol farmacia, en qué país está (refuerza el storytelling "exterior") |

**Tabla `medicamentos_controlados`** (catálogo, dato público):
| Columna | Tipo |
|---|---|
| codigo | text (PK) — ej. "IBU400" |
| nombre | text |
| requiere_receta | boolean |

**Tabla `recetas`** (metadata NO sensible — el contenido real vive solo en el celular del paciente):
| Columna | Tipo | Detalle |
|---|---|---|
| id_corto | text (PK) | el que va codificado en el QR, ej. "receta_a8f3" |
| commitment_hash | text | el hash que se subió al contrato |
| codigo_medicamento | text (FK a medicamentos_controlados) | dato público |
| fecha_vigencia | date | dato público |
| medico_id | UUID (FK a usuarios_prueba) | quién la emitió — dato que el backend conoce, pero que NUNCA se expone a la farmacia en la respuesta |
| usada | boolean, default false | se actualiza cuando se canjea — redundante con el nullifier del contrato, pero útil para queries rápidas sin ir a la blockchain cada vez |
| nullifier | text, nullable | se completa cuando se usa |

**Importante**: en ningún lado de esta base vive el diagnóstico, el nombre del paciente vinculado a la receta, ni su identidad — eso vive solo en el celular del paciente (localStorage/IndexedDB del lado cliente), nunca llega al backend en texto plano.

### 5.4 Endpoints de la API (detallado)

**Rol Médico**
- `POST /api/medico/recetas`
  - Body: `{ medico_id, paciente_nombre_local (no se guarda, solo para mostrar en su pantalla), codigo_medicamento, fecha_vigencia }`
  - Lógica: (1) genera un secreto random del lado del backend (o lo recibe ya generado del frontend, según cuánta "pureza ZK" quieran mostrar), (2) calcula el commitment (hash), (3) llama a `contract.service.ts` → `registerPrescription(commitment, codigo_medicamento, fecha_vigencia)` en el contrato, (4) guarda la fila en `recetas`, (5) devuelve `{ id_corto, commitment_hash }` al frontend para que arme el QR o se lo mande al paciente.
  - Response: `201 { id_corto, mensaje: "Receta emitida y registrada en blockchain" }`

**Rol Paciente**
- `GET /api/paciente/recetas/:id_corto`
  - Devuelve los datos NO sensibles de una receta (medicamento, vigencia, si ya fue usada) para que la pantalla del paciente la muestre.
- `POST /api/paciente/generar-qr`
  - Body: `{ id_corto }`
  - Devuelve una imagen (dataURL) del QR generado con la librería `qrcode`, codificando el `id_corto`.

**Rol Farmacia**
- `POST /api/farmacia/validar`
  - Body: `{ id_corto_escaneado }`
  - Lógica: (1) busca la receta en Postgres por `id_corto`, (2) si no existe o ya está `usada = true`, responde inválido sin llamar al contrato (ahorra una llamada), (3) si es válida, arma la prueba ZK con los datos privados asociados y llama a `contract.service.ts` → `validatePrescription(proof, nullifier, codigo_medicamento)`, (4) si el contrato confirma, marca `usada = true` y guarda el `nullifier`, (5) devuelve SOLO lo que la farmacia necesita ver.
  - Response caso éxito: `200 { valido: true, medicamento: "Ibuprofeno 400mg", vigente_hasta: "2026-08-15" }`
  - Response caso ya usada: `200 { valido: false, motivo: "Receta ya utilizada" }`
  - **Nunca** se incluye en la respuesta: nombre del paciente, nombre del médico, diagnóstico (que ni siquiera vive en el backend).

**Utilitario / demo**
- `GET /api/health` — chequeo simple de que el backend, la conexión a Postgres y la conexión al proof server están arriba (útil para probar rápido la mañana del hackathon).

### 5.5 `contract.service.ts` — qué hace exactamente
Esta pieza es el puente entre el backend Node y el contrato Compact:
1. Al arrancar el server, se conecta al proof server local (`PROOF_SERVER_URL`) y a la red Preview.
2. Carga el contrato ya deployado usando `CONTRACT_ADDRESS` y la API TypeScript que el compilador de Compact genera automáticamente al compilar (`compact compile`).
3. Expone dos funciones internas simples para el resto del backend: `registrarReceta(...)` y `validarReceta(...)`, que internamente arman la prueba ZK, firman con la wallet correspondiente (Médico o Farmacia, según el caso) y esperan la confirmación en la red.
4. Maneja errores de red/timeout de forma que el frontend pueda mostrar un mensaje claro ("no se pudo conectar a la blockchain, reintentando...") en vez de que la app se rompa en silencio — importante para la demo en vivo.

### 5.6 Notas de seguridad/CORS para la demo
- El backend debe escuchar en `0.0.0.0`, no solo `localhost`, para que el celular (conectado por IP local) pueda llegar a él.
- CORS configurado para aceptar el origen de la IP local del frontend (o `*` de forma permisiva, aceptable para un hackathon, no para producción).

---

## 6. FRONTEND — Detalle completo

### 6.1 Stack
- React + TypeScript + Vite.
- Tailwind CSS (mismo criterio que usan en su otro proyecto, LaburApp) — además resuelve gratis que la vista de Paciente sea responsive para el celular.
- React Router para las 3-4 rutas.
- `html5-qrcode` (o `jsQR`) para la lectura de cámara en la vista Farmacia.

### 6.2 Estructura de rutas
```
/                    → Selector de rol (login simulado)
/medico              → Pantalla Médico
/paciente            → Pantalla Paciente (esta es la que se abre también desde el celular)
/farmacia            → Pantalla Farmacia
```

### 6.3 Pantalla 0 — Selector de rol / Login simulado
- Lista de los usuarios de prueba precargados (Dr. García, Dra. Fernández, Paciente Juan, Farmacia San Martín).
- Al hacer click en uno, guarda ese usuario en el estado de la app (Context de React o simplemente en memoria) y redirige a la ruta correspondiente según el `rol`.
- **No hay passwords ni JWT** — es solo un dropdown/lista de tarjetas clickeables. Deliberadamente simple para no gastar tiempo de desarrollo en algo que no suma al puntaje.

### 6.4 Pantalla "Médico"
**Objetivo**: emitir una receta.

Elementos:
- Header con el nombre del médico logueado y su matrícula.
- Formulario:
  - Selector de medicamento (dropdown poblado desde `GET /api/medicamentos` — catálogo).
  - Campo de fecha de vigencia (date picker simple).
  - Campo de texto libre "nombre del paciente" (esto es solo para que el médico lo vea en SU pantalla, para no perderse — nunca se envía al backend como dato vinculado a la receta pública).
- Botón "Emitir receta" → dispara `POST /api/medico/recetas`.
- Estado de carga mientras espera la confirmación de la blockchain (puede tardar unos segundos reales) — mostrar un spinner con texto tipo "Registrando en blockchain...".
- Al confirmar: mensaje de éxito con el `id_corto` generado y un botón "Copiar código para el paciente" (para la demo, si no quieren depender de que el paciente vea la receta automáticamente en su login).
- Lista simple abajo: "Recetas emitidas hoy" (histórico corto, solo para mostrar contexto en la demo).

### 6.5 Pantalla "Paciente"
**Objetivo**: ver la receta y mostrar el QR. Esta es la pantalla que se abre desde el **celular**.

Elementos:
- Header simple con el nombre del paciente logueado.
- "Mis recetas": lista de recetas asociadas a ese paciente (en el MVP de 48h, alcanza con mostrar la última emitida, buscándola por `id_corto` que el backend le devolvió al médico y que en la demo se "pasa" al paciente manualmente o automáticamente si comparten el mismo mock de datos).
- Por cada receta: nombre del medicamento, vigencia, estado (vigente / usada).
- Botón grande "Mostrar código para la farmacia" → genera y muestra el QR en pantalla completa (importante: que ocupe la mayor parte de la pantalla del celular, con buen contraste — esto quedó definido como clave para que la cámara de la laptop de Farmacia lo lea bien).
- Diseño mobile-first: esta pantalla es la que más cuidado necesita en el responsive, ya que se ve en vivo desde un celular real frente al jurado.

### 6.6 Pantalla "Farmacia"
**Objetivo**: escanear y validar.

Elementos:
- Header con el nombre/país de la farmacia logueada (refuerza el storytelling "farmacia en el exterior").
- Botón "Escanear QR" → activa la cámara vía `html5-qrcode`, mostrando el video en vivo dentro de un `<div>`.
- **Input de texto manual como respaldo** ("¿no anda la cámara? Pegá el código acá" + botón "Validar") — definido como necesario, no opcional, por el riesgo de que la cámara falle con las luces del escenario.
- Al detectar/ingresar un código, dispara `POST /api/farmacia/validar` automáticamente.
- Resultado mostrado en grande, con color:
  - ✅ verde: "Receta válida — [Medicamento] — Vigente hasta [fecha]".
  - ❌ rojo: "Receta ya utilizada" o "Receta no encontrada/vencida".
- Historial corto de validaciones recientes en esa sesión (para mostrar en la demo que el sistema "recuerda" sin exponer nada).

### 6.7 Pantalla opcional — "Farmacias cercanas" (nice to have, solo si sobra tiempo)
- Lista simple (no mapa real con API externa) de 3-4 tarjetas mockeadas: nombre de farmacia partner, dirección, distancia aproximada, horario — datos fijos/hardcodeados para la ciudad de la demo.
- Ubicarla como una pestaña extra dentro de la vista Paciente.
- Explícitamente de último en el cronograma, después de que el flujo principal esté 100% probado.

### 6.8 Componentes compartidos sugeridos
- `<RoleGuard>` — protege cada ruta mostrando solo lo que corresponde al rol logueado (simple, basado en el estado en memoria, no seguridad real).
- `<StatusBadge>` — el chip verde/rojo de válido/inválido, reutilizable.
- `<LoadingSpinner>` con texto configurable (para los estados de "esperando blockchain").
- `<QRDisplay>` — encapsula la librería `qrcode` y el tamaño/contraste ya optimizado para lectura por cámara.

---

## 7. Circuito Compact — Detalle

### Funciones
1. `registerPrescription(commitment, drugCode, expiryDate)` — llamada por el backend en nombre del Médico. Guarda el compromiso en el ledger.
2. `validatePrescription(proof, nullifier, drugCode)` — llamada por el backend en nombre de la Farmacia. Verifica: (a) el compromiso existe y no venció, (b) el firmante pertenece a la lista/red de médicos válidos, (c) el nullifier no fue usado antes (evita reuso/reventa). Si todo cierra, emite `true` y registra el nullifier.

### Simplificación recomendada para 48h
Lista fija hardcodeada de 3-5 médicos de prueba (los mismos `usuarios_prueba` con rol médico) en vez de un árbol Merkle completo. Migrar a Merkle solo si sobra tiempo el sábado a la mañana — no arriesgar el gate de "debe compilar" por sofisticación extra.

### Dato público vs. privado (resumen)
| Dato | Dónde vive | Público / Privado |
|---|---|---|
| Red de médicos/farmacias de la aseguradora | Contrato Compact | Público el compromiso, no la identidad puntual |
| Diagnóstico + identidad del viajero | Celular del paciente | 100% privado |
| Receta (medicamento + vigencia) | Compromiso (hash) en contrato | Público el hash, no el contenido |
| Validación en farmacia | Nullifier | Público, evita doble uso |
| Catálogo de medicamentos, lista de médicos | PostgreSQL | Público, no sensible |

---

## 8. Entorno de desarrollo — Setup y troubleshooting (resumen)

### Stack de herramientas ya configurado
WSL2 + Ubuntu, Node.js v22+, Compact compiler, Docker Desktop (motor WSL2, proof server puerto 6300), Wallet Lace (apuntando a Local/localhost:6300), VS Code conectado a WSL vía extensión "WSL" de Microsoft, extensión Compact (`.vsix` manual), Claude Code (CLI + extensión, cuenta Pro), extensiones adicionales (ESLint, Prettier, Tailwind CSS IntelliSense, Docker, PostgreSQL/SQLTools, GitLens, Error Lens).

### Herramientas de IA de Midnight (agregadas)
- **Kapa** (MCP, responde preguntas con documentación actualizada): `claude mcp add --transport http midnight https://midnight.mcp.kapa.ai` — verificar con `/mcp` **dentro de una sesión `claude`** (no en bash directo).
- **Midnight Expert** (plugins para escribir/validar contratos): `curl -fsSL https://midnightntwrk.expert/install.sh | bash` — después, dentro de una sesión `claude`: `/reload-plugins` y `/midnight-expert:doctor` para verificar. Comandos clave: `/midnight-verify:verify`, `/midnight-tooling:devnet start`, `/midnight-status-codes:lookup`.
- **Nota recurrente importante**: los comandos que empiezan con `/` (como `/mcp`, `/plugin`, `/midnight-expert:doctor`) SOLO funcionan escritos dentro de una sesión activa de `claude` — nunca en la terminal de bash directamente (tira error "No such file or directory" si se hace así, ya pasó dos veces).

### Problemas ya resueltos
| Problema | Causa | Solución |
|---|---|---|
| Extensión Compact no aparece en marketplace | No publicada ahí | Instalar manualmente el `.vsix` |
| `yarn install`/WSL timeout | VPN (Proton) bloqueando red | Desactivar VPN durante instalación |
| WSL colgado | Motor trabado | `wsl --shutdown` desde PowerShell + reiniciar |
| Tests Vitest colgados en `[queued]` | Cruce de filesystem `/mnt/c/...` ↔ Linux | Trabajar el proyecto directo en `~` (home de Linux) |
| VS Code no muestra "WSL: Ubuntu" | Se abrió desde terminal Windows o PowerShell-admin con `wsl` | Abrir app "Ubuntu" del menú de Windows directo; si persiste, `Ctrl+Shift+P` → "WSL: Connect to WSL"; verificar con `which code` |
| Carpeta con espacios (`cd Carpeta de prueba`) | Bash necesita comillas | `cd "Carpeta de prueba"` |
| Comandos `/algo` tirando error en bash | Son comandos internos de Claude Code, no de bash | Ejecutarlos solo dentro de una sesión `claude` activa |

### Secuencia de arranque diario
1. Levantar Docker Desktop.
2. Terminal Ubuntu (WSL).
3. `docker run -p 6300:6300 midnightntwrk/proof-server:latest midnight-proof-server -v` (ocupa la terminal).
4. Confirmar Compact: `compact --version`.
5. `cd ~/proyecto && code .` (confirmar `WSL: Ubuntu` abajo a la izquierda).
6. Lace → Settings → Midnight → Local (`http://localhost:6300`).
7. `npm run dev -- --host` (frontend) + levantar backend (escuchando en `0.0.0.0`).
8. Dentro de `claude`: `/midnight-expert:doctor` para chequeo de salud completo.

---

## 9. Cronograma de desarrollo (48h)

- **Viernes 10-13**: diseño del circuito en papel (sin código — regla "net-new code only" desde el kickoff del viernes).
- **Viernes 14-20**: primer código — contrato mínimo + esqueleto de frontend en paralelo.
- **Viernes 20-00**: integración inicial.
- **Sábado 09-11**: pulido de funcionalidad core + manejo de errores.
- **Sábado 11-13**: freeze, pruebas end-to-end, video demo.
- **Sábado 13:00**: submission.

### Asignación sugerida
| Persona | Viernes AM | Viernes PM–noche | Sábado AM |
|---|---|---|---|
| Dev-ZK-1 | Estructura del contrato | `registerPrescription` | Testing + fixes |
| Dev-ZK-2 | Patrón de lista de médicos válidos | `validatePrescription` + nullifier | Integrar, probar doble canje |
| Dev-FE-1 | Wireframes de las 3-4 pantallas | Pantalla Médico + conexión wallet | Pulido UI + errores visibles |
| Dev-FE-2 | Esquema PostgreSQL (secc. 5.3) | Pantallas Paciente + Farmacia + QR | Integración end-to-end + video |

---

## 10. Guion de demo (referencia — pendiente de actualizar textos al enfoque "viajero/exterior")
Estructura de 6 bloques (~3 min): (1) planteo del problema, (2) Médico emite receta, (3) Paciente recibe y genera QR, (4) Farmacia escanea y valida, (5) momento "wow" — reintento bloqueado por nullifier, (6) cierre de negocio con datos de mercado validados (Assist America, 180M viajeros/año). Roles: Presentador, Médico, Paciente (con celular en escena), Farmacia (laptop + cámara + input manual de respaldo).

---

## 11. Pendiente / próximos pasos abiertos
- [ ] Definir nombre final del proyecto.
- [ ] Confirmar en Discord del evento si el pitch debe ser en inglés.
- [ ] Terminar de instalar Kapa y Midnight Expert en las 4 computadoras + correr `/midnight-expert:doctor` en cada una.
- [ ] Pedir dust del faucet de la red Preview para las wallets de Médico y Farmacia.
- [ ] Revisar la Matriz de Compatibilidad de versiones antes de instalar paquetes.
- [ ] Correr Hello World end-to-end en las 2 computadoras que faltan.
- [ ] Actualizar guion de demo y pitch deck con el enfoque final de "asistencia al viajero".
- [ ] Decidir si suman la pantalla de "farmacias cercanas" (mockeada).
- [ ] Confirmar roles exactos (Dev-ZK-1/2, Dev-FE-1/2) entre las 4 personas reales del equipo.
- [ ] Definir si usan Prisma/Knex o SQL plano para el backend, según lo que el equipo ya conozca de proyectos anteriores.
