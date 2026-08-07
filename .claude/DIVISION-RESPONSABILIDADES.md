# División de Responsabilidades: Holder Commitment con Lace

**Objetivo de este documento**: que las 3 partes (Contracts, Backend, Frontend) entiendan qué hace cada una y qué necesitan del resto, SIN entrar en el detalle de implementación (eso lo arma cada equipo por su cuenta).

---

## 🗺️ VISIÓN GENERAL (1 minuto)

```
SETUP (Doctor emite):
┌─────────────┐         ┌─────────────┐
│  CONTRACTS  │ ──────► │   BACKEND   │
│  (Compact)  │         │  (Node.js)  │
└─────────────┘         └─────────────┘
     │                        │
     │ Define QUÉ se          │ Guarda: commitment + wallet_address
     │ puede probar           │ (sin identidad sensible)
     │ (los circuits)         │

ACCESO (Paciente ve recetas):
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  CONTRACTS  │         │   BACKEND   │ ──────► │  FRONTEND   │
│  (Compact)  │ ◄───────│  (Node.js)  │         │  (React)    │
└─────────────┘         └─────────────┘         └─────────────┘
     │                        │                        │
     │ Verifica proofs        │ Lista recetas por      │ Conecta Lace
     │                        │ wallet_address + verif │ Muestra lista
     │                        │ proofs de acceso       │ Genera proofs
     └────────────────────────┴────────────────────────┘
              Todos hablan el mismo "contrato de datos"
              (definido abajo, sección 4)
```

**Flujo Opción B (Multiple recipes per wallet)**:
1. Doctor emite Receta 1, 2, 3 → Backend las guarda todas con el mismo `wallet_address` del paciente.
2. Paciente se conecta (Lace) → Frontend ve su `wallet_address`.
3. Frontend pide lista → Backend devuelve todas las recetas del wallet_address (SIN detalles, solo metadata).
4. Paciente click en Receta 1 → Frontend genera proof → Backend verifica → devuelve detalles.

**Regla de oro**: Contracts define las reglas → Backend las ejecuta, guarda metadata por wallet_address, y verifica proofs → Frontend las dispara vía Lace. Nadie inventa su propio formato de datos; todos usan el que está en la sección 4.

---

## 1️⃣ CONTRACTS (Compact) — "Las reglas del juego"

### Qué le corresponde

Definir **qué se puede probar criptográficamente**, sin saber nada de UI ni de bases de datos. Contracts es la capa de verdad matemática: "esto es válido" o "esto no es válido".

### Responsabilidad concreta

- Un circuit nuevo: **`provePatientOwnership`** — prueba que quien lo llama conoce el `nonce_paciente` correcto para un `commitment` dado, sin revelar el nonce.
- Mantener los circuits ya existentes: `registerPrescription`, `validatePrescription`.
- Exponer, como **helper puro** (no requiere proof, callable directo desde TS), una función para calcular el `commitment` a partir de un nonce — así Backend puede calcularlo sin gastar una prueba.

### Qué NO le corresponde

- No decide qué campos van en Postgres.
- No decide cómo se conecta Lace al frontend.
- No sabe qué es un QR ni un `id_corto`.

### Qué necesita de los demás

- **De nadie**. Contracts puede arrancar y terminar su parte sin esperar a Backend o Frontend — es la primera pieza que debe estar lista porque los otros dos la consumen.

### Qué entrega a los demás

Un **paquete compilado** (`managed/prescription/`) con:
1. Los tres circuits: `registerPrescription`, `validatePrescription`, `provePatientOwnership`.
2. El helper puro para derivar `commitment` desde un `nonce` (Backend lo necesita).
3. Un README corto documentando la firma exacta de cada circuit (nombres de parámetros, tipos) — esto es el "contrato de interfaz" que Backend y Frontend van a usar para no adivinar tipos.

### Cómo se comunica

- Avisa a Backend y Frontend cuando el circuit `provePatientOwnership` está compilado y mergeado a `main` — es lo que ambos están esperando para poder tipar sus llamadas.
- Si cambia una firma de función (nombre de parámetro, tipo), avisa explícitamente — eso rompe compilación en Backend/Frontend sin aviso previo.

---

## 2️⃣ BACKEND (Node.js) — "El orquestador sin memoria sensible"

### Qué le corresponde

Recibir pedidos de Frontend, guardar/leer metadata **no sensible**, y llamar a los circuits de Contracts cuando corresponde. Backend es el que sabe "qué receta existe" pero **nunca sabe quién es el paciente ni cuál es su diagnóstico**.

### Responsabilidad concreta

**Endpoint 1 — Doctor emite receta** (`POST /api/medico/recetas`)
- Recibe: `{ patientWalletAddress, drugCode, expiryDate }`.
- Genera el `nonce_paciente` (aleatorio).
- Llama al helper de Contracts para calcular `commitment` a partir del nonce.
- Guarda en Postgres: `{ id_corto, commitment, patient_wallet_address, drugCode, expiryDate }` — **nunca** `diagnosis`, `patient_name` ni cualquier dato que identifique a la persona.
- Devuelve al Doctor: `{ id_corto, nonce_paciente, commitment }` — el nonce viaja UNA sola vez, en esta respuesta; después de esto, Backend no vuelve a tener el nonce en ningún lado.
- (Opcionalmente el doctor puede pasarle el nonce al paciente vía email/WhatsApp/QR, o ambos pueden verlo en la pantalla — es un detalle de UX).

**Endpoint 2 — Paciente lista sus recetas** (`GET /api/paciente/mis-recetas`)
- Frontend envía (por default, vía header de Authorization o body): `{ walletAddress }` (que ya obtuvo de Lace).
- Backend busca todas las recetas en Postgres donde `patient_wallet_address = walletAddress`.
- Devuelve lista (SIN los nonces, SIN los commitments privados): `[ { id_corto, drugCode, expiryDate }, { ... }, ... ]`.
- Frontend muestra esta lista al paciente.

**Endpoint 3 — Paciente ve detalles de UNA receta** (`POST /api/paciente/ver-receta/:id_corto`)
- Recibe `{ walletAddress, proof }` (el proof ya lo generó Lace del lado del Frontend con `provePatientOwnership`).
- Busca receta por `id_corto` y verifica que `patient_wallet_address` en la DB coincida con el `walletAddress` enviado (evita que alguien intente acceder a una receta ajena).
- Llama al circuit `provePatientOwnership` de Contracts, pasándole el `commitment` público y el `proof` recibido.
- Si es válido: devuelve `{ drugCode, expiryDate }` — nada más.
- Si no es válido: `403 Unauthorized`, sin dar pistas de por qué.

**Endpoint 4 — Farmacia valida** (`POST /api/farmacia/validar`) — sin cambios respecto al diseño anterior, no lo toca esta iniciativa.

### Qué NO le corresponde

- No genera pruebas ZK — eso lo hace Lace en el navegador del paciente.
- No muestra ninguna UI.
- No decide el circuit de `provePatientOwnership` — solo lo consume.
- No guarda ni procesa el `nonce_paciente` después de la respuesta inicial al doctor.

### Qué necesita de los demás

- **De Contracts**: el paquete compilado + la firma exacta de `provePatientOwnership` y el helper de `commitment`. Sin esto, Backend no puede tipar sus llamadas.
- **De Frontend**: nada para empezar a construir — Backend puede mockear el `proof` con un valor cualquiera mientras Frontend no esté listo, y reemplazarlo después.

### Qué entrega a los demás

- Los 2 endpoints (`POST /api/medico/recetas`, `POST /api/paciente/ver-receta`) con sus contratos de request/response documentados (ver sección 4) — esto es lo que Frontend necesita para saber qué mandar y qué esperar de vuelta.
- Confirmación de que el `commitment` que calcula coincide con el que espera Contracts (evita bugs de "hash calculado distinto en dos lados").

### Cómo se comunica

- Avisa a Frontend en cuanto el endpoint `/api/medico/recetas` esté funcionando — Frontend necesita el `id_corto` + `nonce_paciente` reales para poder probar el flujo de guardado local.
- Avisa a Frontend en cuanto `/api/paciente/ver-receta` esté funcionando — ahí Frontend puede probar el flujo completo con Lace en vivo.
- Si Backend decide agregar/cambiar un campo en las respuestas, actualiza la sección 4 de este documento y avisa — Frontend depende literalmente de esos nombres de campo.

---

## 3️⃣ FRONTEND (React) — "La cara visible, sin lógica criptográfica propia"

### Qué le corresponde

Toda la interacción con el usuario: conectar Lace, mostrar el flujo de doctor/paciente/farmacia, y disparar la generación de pruebas a través de Lace (nunca implementando crypto propia).

### Responsabilidad concreta

**Conexión de wallet**
- Botón "Conectar Lace" en la pantalla de Paciente (y Médico/Farmacia, que también firman transacciones).
- Guardar la dirección pública que devuelve Lace — es la única "identidad" que el sistema conoce del paciente.

**Listar recetas (flow nuevo — Opción B)**
- Una vez conectado, Frontend automáticamente llama a `GET /api/paciente/mis-recetas?wallet={walletAddress}`.
- Muestra lista: [Receta 1: IBU400, vigente hasta X], [Receta 2: Amoxicilina, vigente hasta Y], ...
- Cada receta muestra solo `drugCode` + `expiryDate` — nada que requiera proof.

**Ver detalles de UNA receta (el flujo nuevo — Opción B)**
- Paciente click en "Ver detalles" de Receta 1.
- Frontend busca localmente el `commitment` + `nonce_paciente` de esa receta (guardados cuando el doctor la emitió).
  - **Alternativa 1**: Frontend pidió al doctor que le pase el nonce (vía email, WhatsApp, QR, o ambos lo ven en la pantalla).
  - **Alternativa 2**: Frontend lo tiene en localStorage si lo guardó cuando se emitió.
- Llama al circuit `provePatientOwnership` vía `midnight-js`, pasando `signer: wallet`.
- Lace muestra su ventana emergente de autorización — el usuario aprueba.
- Frontend recibe el `proof` de vuelta y lo manda a `POST /api/paciente/ver-receta/{id_corto}`.
- Backend verifica, devuelve `{ drugCode, expiryDate }` — Frontend muestra.

### Qué NO le corresponde

- No genera claves, no las guarda, no las encripta — eso es 100% Lace.
- No calcula el `commitment` — eso ya viene calculado desde Backend.
- No decide la lógica del circuit — solo lo invoca con los parámetros que Contracts documentó.

### Qué necesita de los demás

- **De Contracts**: la firma exacta de `provePatientOwnership` (nombres y tipos de los dos parámetros) para tipar la llamada en TypeScript.
- **De Backend**: los 2 endpoints funcionando (o al menos su contrato de datos documentado) para saber qué mandar y qué esperar.

### Qué entrega a los demás

- Nada que los otros dos consuman directamente — Frontend es la punta del flujo. Pero si encuentra un mismatch entre lo que Contracts/Backend documentaron y lo que realmente reciben en runtime, es quien lo detecta primero y debe avisar.

### Cómo se comunica

- Antes de empezar a codear la pantalla "Ver receta", confirma con Contracts que `provePatientOwnership` ya compiló y con Backend que el endpoint `/api/paciente/ver-receta` existe (aunque sea con un mock).
- Si Lace devuelve un formato de `proof` distinto al que Backend espera recibir en el body, es un bug de integración — se resuelve entre Frontend y Backend directamente, no involucra a Contracts salvo que sea un problema del circuit en sí.

---

## 4️⃣ EL "CONTRATO DE DATOS" COMPARTIDO

Esto es lo único que **las 3 partes deben acordar antes de escribir código** — son los nombres de campo exactos que van a viajar entre las capas. Si alguien cambia esto sin avisar, rompe a los otros dos.

### Circuit de Contracts (firma que Backend y Frontend consumen)

```
provePatientOwnership(
  commitment: Bytes<32>,       // público
  nonce_paciente: Bytes<32>    // privado — nunca sale del lado del paciente
): []
```

### Request/Response de Backend (lo que Frontend manda y recibe)

**`POST /api/medico/recetas`** (Doctor emite)
```
Request:  { patientWalletAddress, drugCode, expiryDate }
Response: { id_corto, nonce_paciente, commitment }
```

**`GET /api/paciente/mis-recetas?wallet={walletAddress}`** (Paciente lista)
```
Request:  ?wallet=0xabc123...
Response (200): [
  { id_corto: "receta_a8f3", drugCode: "IBU400", expiryDate: 1724000000 },
  { id_corto: "receta_b9d4", drugCode: "Amoxicilina", expiryDate: 1724086400 }
]
```

**`POST /api/paciente/ver-receta/:id_corto`** (Paciente ve detalles)
```
Request:  { walletAddress, proof }
Response (200): { drugCode, expiryDate }
Response (403): { error: "Unauthorized" }
```

### Lo que Frontend guarda en localStorage

Cuando el doctor emite y devuelve `{ id_corto, nonce_paciente, commitment }`, Frontend lo guarda:

```json
{
  "id_corto": "receta_a8f3",
  "nonce_paciente": "0x...",
  "commitment": "0x...",
  "drugCode": "IBU400",
  "expiryDate": 1724000000
}
```

**Nota**: En Opción B, el Frontend puede **no** guardar el nonce si se arregla que el doctor se lo pase de otra forma (email, QR, etc.). O guarda una lista parcial sin los nonces, y pide el nonce al usuario cuando quiere ver detalles. Eso es UX, se decide durante implementación.

**Si alguna de las 3 partes necesita cambiar uno de estos nombres o tipos, se avisa a las otras dos antes de mergear — no después.**

---

## 5️⃣ ORDEN DE ARRANQUE (quién puede empezar sin esperar a nadie)

```
Contracts   → puede arrancar YA (no depende de nadie)
              entrega: provePatientOwnership circuit compilado

Backend     → puede arrancar YA con los endpoints:
              - POST /api/medico/recetas (genera nonce + commitment)
              - GET /api/paciente/mis-recetas (lista por wallet)
              - POST /api/paciente/ver-receta/:id_corto (verifica proof)
              mockeando el proof hasta que Contracts entregue el circuit

Frontend    → puede arrancar YA con la UI:
              - Botón conectar Lace
              - Listar recetas (mockear respuesta de Backend)
              - Ver detalles (mockear proof generation)
              mockeando las respuestas de Backend hasta que existan
```

Los tres pueden trabajar en paralelo desde el primer minuto. Los puntos reales de sincronización son:

> 1. **Contracts entrega `provePatientOwnership` compilado** → Backend y Frontend reemplazan mocks por las llamadas reales.
> 2. **Backend entrega los 3 endpoints** → Frontend conecta los botones a URLs reales en lugar de mocks.
> 3. **Frontend + Backend coordinan el flujo del nonce** → si el nonce viaja por email/QR/pantalla compartida o por localStorage, eso se negocia en implementación.

---

## 6️⃣ CHECKLIST DE COMUNICACIÓN (para no perderse mensajes)

- [ ] Contracts avisa: "circuit `provePatientOwnership` compilado, firma es X" → Backend + Frontend
- [ ] Backend avisa: "`/api/medico/recetas` funcionando, devuelve { id_corto, nonce_paciente, commitment }" → Frontend
- [ ] Backend avisa: "`/api/paciente/ver-receta` funcionando" → Frontend
- [ ] Frontend avisa: "conexión a Lace probada, wallet.address se obtiene correctamente" → Backend (para que sepa qué esperar en `patientWalletAddress`)
- [ ] Cualquiera avisa inmediatamente si cambia un nombre de campo de la sección 4

---

## Resumen en una frase por equipo

- **Contracts**: "Yo defino qué es matemáticamente válido (los tres circuits), y le doy a los otros dos las herramientas para pedirlo/verificarlo."
- **Backend**: "Yo guardo lo mínimo necesario (commitment + wallet_address, nunca diagnóstico ni identidad), listo recetas por wallet, y verifico proofs de acceso."
- **Frontend**: "Yo muestro la interfaz, conecto Lace, listo las recetas del paciente, y dejo que Lace genere proofs; solo paso los datos correctos de un lado al otro."

---

## Flujo de usuario final (Opción B - Multiple recipes)

```
1. Paciente abre la app → botón "Conectar Lace"
2. Conecta Lace → Frontend guarda wallet.address
3. Frontend lista: "GET /api/paciente/mis-recetas?wallet=0xabc..."
4. Backend devuelve: [ Receta 1 (IBU400), Receta 2 (Amoxicilina), ... ]
5. Paciente elige Receta 1
6. Frontend pide nonce al paciente (o lo tiene guardado)
7. Frontend llama provePatientOwnership vía Lace
8. Lace muestra: "Autorizar prueba?"
9. Usuario: "Autorizar"
10. Lace genera proof, Frontend lo manda: POST /api/paciente/ver-receta/receta_a8f3
11. Backend verifica proof, devuelve: { drugCode: "IBU400", expiryDate: 1724000000 }
12. Frontend muestra: "Ibuprofeno 400mg - Vigente hasta 18/08/2024"
```
