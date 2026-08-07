# Plan Backend — Camino completo para los dos devs (sin pisarse)

Misma lógica que usamos para ZK: cada uno en su propia rama (`git checkout -b backend-dev1-medico` / `git checkout -b backend-dev2-farmacia`), archivos separados hasta el punto de integración marcado con 🔀. Estado de partida: `schema.sql`, `config/db.ts`, `config/env.ts`, `scripts/init-db.ts` ya están hechos.

## ⚠️ ACTUALIZACIÓN — Holder Commitment con Lace (ver CONTEXTO.md sección 3.5 y DIVISION-RESPONSABILIDADES.md)
El paciente ya no usa login simulado — se identifica por `patientWalletAddress` (wallet Lace). Esto **desactualiza** lo ya hecho en el Camino A original: `medico.controller.ts` (recibía nombre de paciente, ahora recibe `patientWalletAddress`) y `paciente.controller.ts` (el endpoint `GET /api/paciente/recetas/:id_corto` se reemplaza por dos endpoints nuevos: `mis-recetas` y `ver-receta`). El Camino B (QR + Farmacia) **NO cambia** — el QR sigue siendo para el flujo de Farmacia, sin relación con este cambio. El plan de abajo ya está actualizado con esto.

---

## PASO 0 — Un solo bloqueante inicial, rápido (lo hace cualquiera de los dos, el que esté libre primero)

**`types/index.ts`** (ACTUALIZAR, ya existe pero desactualizado): agregar/ajustar tipos para reflejar Holder Commitment — `Receta` ahora tiene `patient_wallet_address` en vez de depender de `usuarios_prueba` para el paciente; nuevos tipos de request/response: `CrearRecetaRequest { patientWalletAddress, drugCode, expiryDate }`, `CrearRecetaResponse { id_corto, nonce_paciente, commitment }`, `MisRecetasResponse` (array de `{ id_corto, drugCode, expiryDate }`), `VerRecetaRequest { walletAddress, proof }`, `VerRecetaResponse { drugCode, expiryDate }`. Basarse en la sección 4 de `DIVISION-RESPONSABILIDADES.md`, es la fuente exacta de nombres de campo.
→ Commit, push, avisar al otro apenas esté en `main`. Esto desbloquea a los dos caminos.

---

## CAMINO A — Dev-BE-1: Médico + Paciente

*(Arranca apenas `types/index.ts` esté en `main`)*

**Paso 1 — `services/db.service.ts` (ACTUALIZAR)**
Ya existen `crearReceta`, `buscarRecetaPorIdCorto`, `marcarRecetaComoUsada`, `buscarUsuarioPorId`, `listarMedicamentos` — de la vez pasada. Agregar/ajustar:
- `crearReceta(...)` ahora recibe `patient_wallet_address` en vez de `medico_id` como identidad del paciente (el `medico_id` sigue existiendo, es quien emite, pero ya no identifica al paciente).
- `listarRecetasPorWallet(walletAddress)` — nueva, trae todas las recetas de esa wallet, sin nonces ni commitments en la respuesta.
- `buscarRecetaPorIdCortoConWallet(id_corto)` — trae la receta completa (incluyendo `patient_wallet_address` y `commitment`) para poder validar el endpoint `ver-receta`.
→ Probar cada query suelta con un script chico, igual que la vez pasada.

**Paso 2 — `controllers/medico.controller.ts` + `routes/medico.routes.ts` (REESCRIBIR)**
Endpoint `POST /api/medico/recetas`: recibe `{ patientWalletAddress, drugCode, expiryDate }` (ya NO nombre de paciente). Genera `nonce_paciente` random (32 bytes), llama a `contract.service.ts` → `deriveHolderCommitment(nonce)` (mock hasta que ZK entregue el helper real) para obtener el `commitment`, guarda con `db.service.crearReceta(...)`, devuelve `{ id_corto, nonce_paciente, commitment }`. El nonce se devuelve UNA vez acá y nunca se persiste en la base.
→ `npx tsc --noEmit`, confirmar sin errores.

**Paso 3 — `controllers/paciente.controller.ts` + `routes/paciente.routes.ts` (REESCRIBIR COMPLETO)**
Dos endpoints nuevos, reemplazan al viejo `GET /api/paciente/recetas/:id_corto`:
- `GET /api/paciente/mis-recetas?wallet={walletAddress}` — usa `db.service.listarRecetasPorWallet`, devuelve el array sin datos sensibles.
- `POST /api/paciente/ver-receta/:id_corto` — recibe `{ walletAddress, proof }`, busca la receta, verifica que `patient_wallet_address` coincida con el `walletAddress` recibido (si no coincide, `403` directo sin llamar al contrato), llama a `contract.service.ts` para verificar el `proof` contra el `commitment` usando `provePatientOwnership` (mock hasta que ZK lo entregue), devuelve `{ drugCode, expiryDate }` o `403`.
- El endpoint viejo `POST /api/paciente/generar-qr` **se mantiene sin cambios** — es responsabilidad de Dev-BE-2 (Camino B), no se toca acá.
→ Commit, push a tu rama.

**Paso 4 — Commit, push, PR a `main`**
Una vez que los tres controllers/rutas actualizados compilen sin errores de tipos.

---

## CAMINO B — Dev-BE-2: QR + Contrato (mock) + Farmacia

*(Arranca apenas `types/index.ts` esté en `main` — mientras tanto, puede ir leyendo la sección 7 del CONTEXTO.md para entender qué necesita simular del contrato)*

**Paso 1 — `services/qr.service.ts`**
Generar el `id_corto` + imagen de QR con la librería `qrcode` (ya está en `package.json`). Función simple: recibe un `id_corto`, devuelve el dataURL de la imagen.
→ Probar suelto con un script chico que genere un QR de prueba y lo guarde como archivo, para confirmar visualmente que funciona.

**Paso 2 — `services/contract.service.ts` (versión MOCK)**
Como el contrato Compact real todavía no está deployado (depende del equipo de ZK), armar acá un mock: `registrarReceta(...)` y `validarReceta(...)` que devuelven respuestas fijas simuladas (ej. siempre `{ success: true, commitment: "mock123" }`), con un comentario bien visible `// MOCK - reemplazar cuando el contrato esté deployado (ver CONTEXTO.md sección 5.5)`.
→ Esto permite que todo el backend se pueda probar de punta a punta sin esperar al equipo de ZK.

**Paso 3 — `controllers/farmacia.controller.ts` + `routes/farmacia.routes.ts`**
Endpoint `POST /api/farmacia/validar`: busca la receta en Postgres (`db.service.ts` de Dev-BE-1 — si no está mergeado todavía, coordinar o usar un mock propio temporal), llama al mock de `contract.service.ts`, devuelve el resultado sin datos sensibles (ver sección 5.4 del CONTEXTO.md, response exacto).
→ Probar con datos de prueba que el flujo "válido" y "ya usado" devuelvan lo esperado.

**Paso 4 — `routes/health.routes.ts`**
Endpoint `GET /api/health` simple, chequea conexión a Postgres y devuelve `ok`.
→ Commit, push, PR a `main`.

---

## 🔀 INTEGRACIÓN FINAL (juntos, los dos a la vez o coordinados por turno)

**Paso 1 — `index.ts`**
Armar el servidor: Express, `cors` (aceptando la IP local, no solo `localhost` — clave para el celular del Paciente), montar las 4 rutas (`medico`, `paciente`, `farmacia`, `health`), `app.listen(env.PORT, '0.0.0.0', ...)`.

**Paso 2 — `tsconfig.json`**
Configurar para el `"type": "module"` que ya está en `package.json` (necesita `module: "NodeNext"` o equivalente, para que los imports con `.js` que ya usan en `db.ts`/`init-db.ts` compilen bien).

**Paso 3 — Levantar todo junto**
```bash
npm run db:init   # puebla la base con los datos semilla
npm run dev       # levanta el servidor
```
Probar los 4 endpoints con `curl` o Postman, uno por uno, en el orden: health → medico (crear receta) → paciente (ver receta + generar QR) → farmacia (validar, usando el mock del contrato).

**Paso 4 — Commit final, push, PR, merge a `main`**
Con esto, el backend queda funcionalmente completo (con el contrato todavía mockeado) y listo para que, cuando el equipo de ZK termine, se reemplace el mock de `contract.service.ts` por la integración real — cambio acotado, no un rediseño.

---

## Checklist de coordinación
- [ ] `types/index.ts` mergeado primero — avisar apenas esté en `main`, desbloquea a los dos.
- [ ] Dev-BE-1 avisa si `db.service.ts` (Paso 1 de su camino) ya está listo, porque Dev-BE-2 lo necesita para `farmacia.controller.ts`.
- [ ] Dev-BE-2 avisa si `qr.service.ts` (Paso 1 de su camino) ya está listo, porque Dev-BE-1 lo necesita para `paciente.controller.ts`.
- [ ] Nadie mergea `index.ts` ni `tsconfig.json` sin que el otro esté presente/avisado — es la única parte realmente conjunta.
- [ ] Avisar al equipo de ZK cuando `contract.service.ts` (mock) esté listo, para que sepan la forma exacta de las funciones que van a tener que reemplazar.