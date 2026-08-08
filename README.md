# 🛡️ PrescriptionZero

**Digital Prescriptions with Zero-Knowledge Privacy**

A decentralized healthcare application built on [Midnight Network](https://midnight.network) that lets a patient redeem a prescription abroad — proving it's genuinely theirs and unused — without ever revealing their diagnosis or identity to the pharmacy, or persisting either in the backend.

**Status**: Hackathon build. Contract layer compiles cleanly and passes 14/14 tests against an in-memory circuit simulation; backend and frontend are fully wired end-to-end with the contract's *pure* helpers, while the two proof-generating flows (`registerPrescription`/`validatePrescription` and `provePatientOwnership`) are mocked pending a deployed contract + proof server. See [Known Limitations](#known-limitations--roadmap) below for the exact split.

---

## The Problem

A traveler needs medication abroad. They walk into a pharmacy and have to hand a stranger, in a foreign language, their full diagnosis and identity just to prove a prescription is real. The doctor, the pharmacy, and often an insurer all end up holding sensitive medical data they never needed — and nothing stops the same prescription from being filled twice.

## The Solution

**PrescriptionZero** uses Zero-Knowledge Proofs so a pharmacy can validate a prescription without learning who the patient is or what they were treated for.

- **Doctor** issues a prescription → the backend derives a `commitment` (a public hash) and a private `nonce_paciente`, and only the commitment + the patient's wallet address are stored.
- **Patient** holds the secret `nonce_paciente` and, via their Lace wallet, generates a ZK proof (`provePatientOwnership`) that they know it — without ever disclosing it.
- **Pharmacy** submits the commitment + drug code to `validatePrescription`; the contract checks expiry and derives a `nullifier` to mark it spent. A second redemption attempt is rejected on-chain.
- The patient's name and diagnosis never touch the contract, the ledger, or the pharmacy's screen — they never leave the doctor's own session.

This is powered by **Midnight Network's ZK-SNARKs** and the **Compact** contract language.

---

## How It Works (End-to-End Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          THREE ROLES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [DOCTOR]  /medico                                                  │
│  ├─ Issues a prescription for a patient wallet address              │
│  ├─ Backend generates nonce_paciente + derives commitment           │
│  │    (pureCircuits.deriveHolderCommitment — real, no proof needed) │
│  └─ Contract stores: commitment → { drugCode, expiryDate }          │
│                                                                       │
│  ↓                                                                    │
│                                                                       │
│  [PATIENT]  /paciente                                               │
│  ├─ Connects Lace wallet, lists prescriptions by wallet address     │
│  ├─ Generates a ZK proof: provePatientOwnership(commitment, nonce)  │
│  ├─ Proof is verified without the nonce ever leaving the browser    │
│  └─ Shows a QR code (id_corto) to the pharmacy                      │
│                                                                       │
│  ↓                                                                    │
│                                                                       │
│  [PHARMACY]  /farmacia                                              │
│  ├─ Scans the patient's QR                                          │
│  ├─ Backend calls validatePrescription(commitment, drugCode)        │
│  ├─ Sees: "✅ Valid — Ibuprofen 400mg, expires 2026-08-20"          │
│  ├─ Patient's name/diagnosis? Never seen — never stored anywhere.   │
│  └─ Second scan of the same QR → "❌ Already used" (nullifier)      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

The exact circuit/field contract between the three layers (naming, request/response shapes) is pinned down in [`.claude/DIVISION-RESPONSABILIDADES.md`](./.claude/DIVISION-RESPONSABILIDADES.md) — it's the source of truth if any of the three teams needs to change a signature.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Smart Contracts** | Compact (`compact 0.5.1`, runtime `0.16.0`) | `registerPrescription`, `validatePrescription`, `provePatientOwnership` circuits + pure helpers (`deriveHolderCommitment`, `derivePrescriptionNullifier`, `doctorPublicKey`) |
| **Backend** | Node.js + Express 4 + PostgreSQL | REST API, commitment/nullifier derivation, prescription storage (`recetas` table — no diagnosis, no patient name) |
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS | Doctor / Patient / Pharmacy UIs, Lace wallet connector, QR generation & camera scanning |
| **Crypto / Wallet** | `@midnight-ntwrk/midnight-js`, `@midnight-ntwrk/dapp-connector-api`, Lace Wallet | ZK proof generation, wallet signing |
| **Geolocation** | Overpass API (OpenStreetMap) + Haversine formula | "Nearby pharmacies" radar in the patient view |
| **Network** | Midnight Preview | Target test network for ZK verification |

---

## Quick Start (Demo)

### Prerequisites
- Node.js 18+ (Node 22+ recommended for the contract toolchain)
- Docker (for PostgreSQL via `docker-compose.yml`)
- Lace Wallet browser extension

### 1. Clone & install

```bash
git clone <repo_url>
cd prescriptionZero

cd contract && npm install && npm run compile   # compiles the Compact circuits into managed/
cd ../backend && npm install
cd ../frontend && npm install
```

`contract/managed/` and every `node_modules/` are gitignored — `npm run compile` must be re-run after a fresh clone before the backend can import `pureCircuits`.

### 2. Start services

```bash
# Terminal 1: Postgres
cd backend && docker compose up -d
npm run db:init          # applies db/schema.sql + seed data (idempotent)

# Terminal 2: Backend
cd backend && npm run dev
# → http://localhost:3001

# Terminal 3: Frontend
cd frontend && npm run dev
# → http://localhost:5173
```

### 3. Walk the flow

1. Open http://localhost:5173
2. `/medico` → issue a prescription for a patient wallet address (e.g. drug `IBU400`, expiry `2026-08-20`)
3. `/paciente` → connect Lace, see the prescription, generate a ZK proof → get a QR
4. `/farmacia` → scan the QR → see it validated
5. Scan the same QR again → see it rejected as already used

---

## Project Structure

```
prescriptionZero/
├── contract/                      # Compact smart contract
│   ├── src/
│   │   ├── prescription.compact   # the 3 circuits + pure helpers
│   │   └── witnesses.ts           # TS implementations of the private witnesses
│   ├── scripts/derive-doctor-keys.ts
│   ├── test/prescription.test.ts  # 14/14 tests, in-memory circuit simulation
│   └── managed/                   # compiler output (gitignored)
│
├── backend/                       # Express + PostgreSQL API
│   ├── src/
│   │   ├── controllers/           # medico, paciente, farmacia route handlers
│   │   ├── services/              # db.service, contract.service, qr.service
│   │   └── index.ts
│   ├── db/schema.sql               # recetas, medicamentos, usuarios_prueba
│   └── docker-compose.yml
│
├── frontend/                      # React + TypeScript + Vite
│   └── src/
│       ├── pages/                 # Home, Medico, Paciente, Farmacia
│       └── components/ui/         # Button, Card, Badge design system
│
├── .claude/
│   └── DIVISION-RESPONSABILIDADES.md   # circuit/field contract between the 3 layers
│
├── CONTEXTO.md                    # full product/architecture background
└── README.md                      # you are here
```

---

## Key Features

- **Zero-Knowledge Proofs** — patient identity is proven, never disclosed
- **Real Lace wallet integration** on the frontend (`@midnight-ntwrk/dapp-connector-api`)
- **Nullifier-based double-spend protection** — a redeemed prescription can't be redeemed twice
- **Privacy-by-construction backend** — `recetas` stores a commitment hash and a wallet address, never a name or diagnosis
- **3-role demo** — Doctor issues → Patient proves → Pharmacy validates, at `/medico`, `/paciente`, `/farmacia`
- **Nearby-pharmacy radar** — Overpass API + Haversine distance calculation, patient-side
- **14/14 passing contract tests**, run without a proof server or devnet via `@midnight-ntwrk/compact-runtime`'s in-memory simulation

---

## Testing

### Contracts (14/14 tests passing)
```bash
cd contract
npm test
```

### Backend
```bash
cd backend
npm run dev
curl http://localhost:3001/api/health
```
No automated backend test suite yet — verified manually against live Postgres with the full 7-request sequence (health → issue → list → view → validate → validate-again-rejected). See [`backend/README.md`](./backend/README.md) §6 for the exact `curl` calls.

### Frontend
```bash
cd frontend
npm run build   # tsc -b && vite build
npm run dev
```

---

## Important Documentation

| Document | Purpose |
|---|---|
| [`.claude/DIVISION-RESPONSABILIDADES.md`](./.claude/DIVISION-RESPONSABILIDADES.md) | Contract between the 3 layers — exact circuit/field names, request/response shapes |
| [`CONTEXTO.md`](./CONTEXTO.md) | Backend implementation plan and product/architecture background |
| [`contract/README.md`](./contract/README.md) | Compact circuit documentation, spec deviations, deployment notes |
| [`backend/README.md`](./backend/README.md) | API endpoints, data model, contract integration status |
| [`frontend/README.md`](./frontend/README.md) | UI architecture, design system, page-by-page breakdown |

---

## Known Limitations & Roadmap

| Limitation | Status |
|---|---|
| `registerPrescription` / `validatePrescription` are impure (proof-generating) circuits — not yet callable against a deployed contract | Mocked in `contract.service.ts`; needs `midnight-js` `deployContract`/`callTx` against a running devnet |
| `provePatientOwnership` proof is generated client-side by Lace; backend verification is currently a placeholder check | Real verification path documented in `contract.service.ts` |
| `GET /api/health` only checks Postgres | Doesn't check proof server / node / indexer |
| No automated backend test suite | Verified manually so far |
| Doctor/Pharmacy identity via a selector, not real auth | Fine for a demo, not for production |

### Roadmap
- [ ] Deploy the contract to a running Midnight devnet/testnet and wire `registerPrescription`/`validatePrescription` for real
- [ ] Wire real `provePatientOwnership` verification server-side
- [ ] Automated backend test suite
- [ ] Real doctor authentication (medical license verification)
- [ ] Pharmacy partner verification

---

## Team

- **Lautaro Sardina** — Smart Contracts (Compact)
- **Lourdes Barrientos** — Backend / Frontend
- **Lucas Diaz** — Backend / Frontend
- **Tomás Navas** — Backend / Frontend

## Resources

- [Midnight Network Docs](https://docs.midnight.network)
- [Compact Language Guide](https://docs.midnight.network/build/compact/overview)
- [Lace Wallet](https://www.lace.io)
