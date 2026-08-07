# backend — API for "Recetas Digitales para Viajeros"

Express + PostgreSQL backend for the prescription hackathon project. Sits
between Frontend (React) and the compiled Compact contract (`../contract/`),
and never stores anything that identifies a patient or their diagnosis —
only a commitment hash, a wallet address, and non-sensitive metadata
(drug code, expiry date). See `../CONTEXTO.md` and
`../.claude/DIVISION-RESPONSABILIDADES.md` for the full product/interface
context.

## 1. Stack

- Node.js (ES modules, TypeScript via `tsx`)
- Express 4
- PostgreSQL (`pg`), schema in `db/schema.sql`
- `qrcode` for QR generation
- `zod` for env validation

## 2. Setup

```bash
cd backend
npm install

docker compose up -d        # starts Postgres on :5432 (see docker-compose.yml)
npm run db:init              # applies db/schema.sql + seed data (idempotent)
npm run dev                  # tsx watch src/index.ts — http://localhost:3001
```

`npm run db:init` is safe to re-run — every table/column uses
`CREATE ... IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, and seed rows use
`ON CONFLICT ... DO NOTHING`.

### Environment (`.env`)

| Var | Used for |
|---|---|
| `PORT` | Express listen port (default 3001) |
| `DATABASE_URL` | Postgres connection string |
| `PROOF_SERVER_URL` | Midnight proof server (not yet called — see §5) |
| `MIDNIGHT_NETWORK` | e.g. `preview` |
| `CONTRACT_ADDRESS` | deployed contract address (currently a placeholder — nothing is deployed yet) |
| `NODE_URL`, `INDEXER_URL` | present in `.env` but not yet validated by `config/env.ts`'s zod schema or read anywhere in code |

## 3. Endpoints

Contract of request/response shapes is `../.claude/DIVISION-RESPONSABILIDADES.md`
section 4 — that document is the source of truth; this table is a quick
reference.

| Method + path | Role | Notes |
|---|---|---|
| `GET /api/health` | — | Checks Postgres connectivity only (not proof server/node/indexer) |
| `POST /api/medico/recetas` | Doctor emits | Body: `{ patientWalletAddress, drugCode, expiryDate, medicoId }`. `expiryDate` must be a date string (`"2026-08-20"`) — the DB column is `DATE`, not a unix timestamp. `medicoId` is a UUID FK to `usuarios_prueba` (seeded test doctors, see `src/scripts/init-db.ts`). Returns `{ id_corto, nonce_paciente, commitment }`, 201. |
| `GET /api/paciente/mis-recetas?wallet=` | Patient lists | Returns `[{ id_corto, drugCode, expiryDate }]`, no commitment/nonce exposed |
| `POST /api/paciente/ver-receta/:id_corto` | Patient views one | Body: `{ walletAddress, proof }`. 403 if wallet doesn't match, else 200 with `{ drugCode, expiryDate }` |
| `POST /api/paciente/generar-qr` | Patient QR | Body: `{ id_corto }` → `{ qr_data_url }` (PNG data URL) |
| `POST /api/farmacia/validar` | Pharmacy redeems | Body: `{ id_corto_escaneado }` → `{ valido, medicamento?, vigente_hasta? }` or `{ valido: false, motivo }`. Marks the prescription used on success — a second call with the same `id_corto` correctly rejects with `"La receta ya fue utilizada"`. |

## 4. Data model (`db/schema.sql`)

`recetas` never stores diagnosis or patient identity — only:

- `commitment_hash` — the holder commitment (`deriveHolderCommitment(nonce_paciente)`), public
- `patient_wallet_address` — the patient's Lace wallet address, the only patient "identity" the system knows
- `prescription_nonce` — **not** `nonce_paciente**. A separate, backend-internal secret generated at registration, used only to derive the pharmacy-redemption nullifier. `nonce_paciente` itself is returned to the doctor exactly once in the `POST /api/medico/recetas` response and is never written to the database — see §5.
- `usada` / `nullifier` — double-spend tracking for the farmacia flow

## 5. Contract integration status

The real Compact contract (`../contract/`, compiled, tested, merged to
`main`) is wired in for the two pieces that don't require a deployed
contract or proof server:

| Function | Status | Where |
|---|---|---|
| `deriveHolderCommitment` | ✅ **real** — calls the compiled `pureCircuits.deriveHolderCommitment` directly (runs locally, no proof) | `medico.controller.ts`, via `ContractService.deriveHolderCommitment` |
| `derivePrescriptionNullifier` | ✅ **real** — same, `pureCircuits.derivePrescriptionNullifier` | `farmacia.controller.ts`, via `ContractService.derivePrescriptionNullifier` |
| `registerPrescription` / `validatePrescription` | ❌ **mock** | These are `impure` circuits — they generate a real ZK proof and need a transaction submitted through the full `midnight-js` `deployContract`/`callTx` pipeline against an actually-deployed contract, not a direct function call. Nothing is deployed yet. `ContractService.registrarReceta`/`validarReceta` return canned values. |
| `provePatientOwnership` | ❌ **mock** | Also `impure` — the proof is generated client-side by Lace in the patient's browser, not by the backend. `ContractService.verificarProofPropiedad` currently just checks `proof !== 'proof_invalida'`. The real verification path is documented in a comment directly above that function in `contract.service.ts`. |

`ContractService` imports `pureCircuits` from
`../../../contract/managed/prescription/contract/index.js` (three levels up
from `backend/src/services/` to the repo root, then into `contract/`). That
`managed/` directory is gitignored — regenerate it with `cd ../contract && npm run compile`
before running the backend if it's missing.

### Why `prescription_nonce` is a separate column from `nonce_paciente`

Two different secrets, two different circuits, two different lifetimes:

- **`nonce_paciente`** — the patient's secret for `provePatientOwnership` (the Lace flow). Generated once at registration, returned to the doctor in the response, **never persisted**. This is the privacy invariant `DIVISION-RESPONSABILIDADES.md` §2 requires.
- **`prescription_nonce`** — an internal secret for `derivePrescriptionNullifier` (the pharmacy flow). The contract's own design (`prescriptionNonce` witness in `prescription.compact`) always assumed the backend would generate and re-look-up this value — it's not patient-facing or privacy-sensitive the same way, so storing it is fine.

Reusing `nonce_paciente` for both would mean persisting the patient's
private secret server-side — a real privacy regression from the documented
design. Keeping them separate avoids that while still giving the pharmacy
flow what it needs.

## 6. Testing

No automated test suite yet — verified manually against live services
(Postgres, Midnight node, indexer, proof server, all via Docker) with the
7-request sequence covering health → doctor emit → patient list → patient
view (valid + wrong-wallet) → pharmacy validate (first + second/rejected).
See git history for the exact `curl` sequence used.

```bash
curl http://localhost:3001/api/health

curl -X POST http://localhost:3001/api/medico/recetas -H "Content-Type: application/json" -d '{
  "patientWalletAddress": "0xabc...",
  "drugCode": "IBU400",
  "expiryDate": "2026-08-20",
  "medicoId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
}'
```

## 7. Known gaps

- `provePatientOwnership` and `registerPrescription`/`validatePrescription` are not wired to a live deployed contract (see §5) — needs `midnight-js` provider/wallet setup plus an actual `deployContract` call once Frontend/Lace integration is ready.
- `GET /api/health` only checks Postgres, not the proof server/node/indexer.
- No automated tests — everything above was verified by hand against running services.
