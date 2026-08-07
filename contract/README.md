# prescription.compact — Contract Layer

Compact smart contract for **"Recetas Digitales para Viajeros"** (Hack Buenos
Aires, Midnight Network). Lets a doctor in a partner network register a
prescription commitment, and a pharmacy abroad redeem it via a ZK proof —
without either side ever learning the patient's diagnosis or identity. See
`../CONTEXTO.md` for the full product/architecture context and
`../prompt-compact-monorepo.md` for the original task brief.

Status: **compiles cleanly** with `compact 0.5.1` (language `>= 0.16`,
runtime `0.16.0`). No warnings.

## 1. Directory layout

```
contract/
├── src/
│   ├── prescription.compact   # the contract
│   └── witnesses.ts           # TS implementations of the two witnesses
├── scripts/
│   └── derive-doctor-keys.ts  # generates the 5 demo doctor identities
├── managed/prescription/      # compiler output (gitignored — regenerate with `npm run compile`)
└── package.json
```

## 2. What changed vs. the original spec

The task brief (`prompt-compact-monorepo.md`) was written before anyone had
looked at real Compact syntax, so a few things there don't map onto the
language as-is. These were resolved with the team (see the "Open Questions"
section of that doc) before writing any code — full rationale is in the
comments at the top of `prescription.compact`:

| Spec said | Contract actually does | Why |
|---|---|---|
| `validatePrescription(proof, nullifier, drugCode)` | `validatePrescription(commitment, drugCode)` | There's no "proof" parameter type in Compact — calling an `export circuit` *is* producing the proof. The nullifier isn't caller-supplied either (that would let anyone submit any nullifier for any commitment); it's derived inside the circuit from `commitment` + a secret `nonce` witness, so redeeming requires actually holding the secret. |
| "Verify caller's wallet is in valid doctors list" | Hash-based auth: `doctorSecretKey()` witness → `doctorPublicKey()` hash → checked against `validDoctors: Set<Bytes<32>>` | Compact has no `msg.sender`/wallet-address concept inside a circuit. Identity is proven by hashing a secret the caller holds. |
| `Prescription { ..., registeredAt: Timestamp }` | No `registeredAt` field | The standard library deliberately exposes only time *comparisons* (`blockTimeLt`, `blockTimeGte`, ...), not a raw "current time" getter — so there's nothing to store. Expiry is enforced with `blockTimeLt(expiryDate)` directly. |
| Rust-style `src/{lib,state,events,errors}.rs` split | Single `prescription.compact` file | Compact isn't Rust; there's no module system that maps onto that split for a contract this size. Sections are marked with comment banners instead. |
| `pub event PrescriptionRegistered { ... }` | No native events | Compact has no `event`/`emit`. The equivalent is: every `export circuit` call is itself a visible on-chain transaction, and the resulting ledger state change is queryable — the indexer's `contractActions` subscription (see the `indexer` skill) is what the backend should watch instead of an event log. |
| `Cargo.toml` | `package.json` | Compact tooling isn't Cargo-based; `compact compile` + npm/pnpm is the actual toolchain. |

## 3. Contract shape

**Ledger (public state):**

| Field | Type | What it holds |
|---|---|---|
| `prescriptions` | `Map<Bytes<32>, Prescription>` | commitment → `{ drugCode, expiryDate }` |
| `usedNullifiers` | `Set<Bytes<32>>` | spent nullifiers (double-spend guard) |
| `validDoctors` | `sealed Set<Bytes<32>>` | hash(doctor secret key) for the 5 demo doctors, fixed at deploy time |

**Witnesses (private, implemented in `src/witnesses.ts`):**

| Witness | Signature | Supplied by |
|---|---|---|
| `doctorSecretKey` | `(): Bytes<32>` | backend, for whichever doctor test-user is authenticated |
| `prescriptionNonce` | `(commitment: Bytes<32>): Bytes<32>` | backend, looked up by commitment (generated at registration time, delivered to the patient via the QR payload) |

**Circuits:**

```
export circuit registerPrescription(
  commitment: Bytes<32>,
  drugCode: Opaque<"string">,
  expiryDate: Uint<64>       // unix seconds
): []
```
Doctor-only (checked via `doctorSecretKey` witness against `validDoctors`).
Rejects if `expiryDate` isn't in the future, or if `commitment` was already
registered. Stores `{ drugCode, expiryDate }` under `commitment`.

```
export circuit validatePrescription(
  commitment: Bytes<32>,
  drugCode: Opaque<"string">
): []
```
Looks up `commitment`, checks `drugCode` matches, checks not expired, derives
`nullifier = persistentHash("rx0:nullifier:v1:", commitment, prescriptionNonce(commitment))`,
rejects if that nullifier was already used, then marks it used. A second call
with the same commitment/nonce always fails on this last check — that's the
double-spend / "already used" demo moment.

**Pure helpers (exported so TypeScript can call them directly, no proof
needed):**

- `doctorPublicKey(sk: Bytes<32>): Bytes<32>` — used by `scripts/derive-doctor-keys.ts` to compute the constructor args, and by the contract itself.
- `derivePrescriptionNullifier(commitment: Bytes<32>, nonce: Bytes<32>): Bytes<32>` — lets the backend precompute a nullifier off-chain (e.g. to fill the `recetas.nullifier` column, CONTEXTO.md §5.3) without spending a proof.

## 4. Compile / typecheck / regenerate keys

```bash
cd contract
pnpm install        # or npm install
pnpm run compile     # compact compile src/prescription.compact managed/prescription
pnpm run typecheck   # tsc --noEmit over src/ + scripts/
```

`managed/` is gitignored (see repo `.gitignore`: `contract/managed/`) —
regenerate it locally before running anything that imports from it.

## 5. Deploying: doctor key setup

The constructor takes the 5 doctor public keys directly (not secrets — those
never touch the chain):

```compact
constructor(doctorPublicKeys: Vector<5, Bytes<32>>)
```

Generate them with:

```bash
pnpm run derive-doctor-keys
```

This calls `pureCircuits.doctorPublicKey` from the compiled contract (the
literal same hash the deployed contract will check against), so the printed
public keys are guaranteed correct — nothing hand-derived. It prints:

1. Five secret keys (32 bytes, hex) — **do not commit these**. Hand one to
   each demo doctor's backend session via `registerDoctorSecret(id, secret)`
   in `witnesses.ts`.
2. A ready-to-paste `doctorPublicKeys` array — pass this as the constructor
   argument when deploying (`deployContract(providers, { ..., args: [doctorPublicKeys] })` in `midnight-js`, per the `midnight-js`/`compact-witness-ts` skills).

## 6. Backend integration (`contract.service.ts`)

Per CONTEXTO.md §5.5, the backend's `contract.service.ts` is the bridge. What
it needs to do, mapped to this contract:

- **On doctor login**: call `setActiveDoctor(doctorId)` from `witnesses.ts`
  before submitting a `registerPrescription` transaction, so the
  `doctorSecretKey` witness resolves to the right doctor.
- **`POST /api/medico/recetas`**: generate a random 32-byte nonce, compute
  `commitment` off-chain from `(diagnosis, patient_id, nonce)` (this contract
  never sees diagnosis/patient_id — only the resulting `Bytes<32>`), call
  `registerPrescriptionNonce(commitment, nonce)` so `validatePrescription`
  can find it later, then submit `registerPrescription(commitment, drugCode, expiryDate)`.
  Deliver `nonce` to the patient alongside `id_corto` (e.g. embedded in the
  QR payload) — it's required to redeem later.
- **`POST /api/farmacia/validar`**: look up the scanned `id_corto` in
  Postgres to get `commitment` + `drugCode`, submit
  `validatePrescription(commitment, drugCode)`. On success, optionally call
  `pureCircuits.derivePrescriptionNullifier(commitment, nonce)` locally to
  fill `recetas.nullifier` — no extra proof needed for that, it's a pure
  function.
- **Watching for confirmation / "events"**: since Compact has no event
  system, subscribe to the indexer's `contractActions` for this contract
  address, or just poll `queryContractState` + `ledger(state)` after
  submitting — see the `indexer` skill for the exact GraphQL shape.

## 7. What's genuinely verified vs. not (be honest with the team)

Verified in this session, with the local toolchain:
- ✅ `compact compile` succeeds with zero errors/warnings (the hackathon's
  automatic-disqualification gate).
- ✅ `tsc --noEmit` passes over `witnesses.ts` and the derivation script
  against the real generated `.d.ts`.
- ✅ `derive-doctor-keys.ts` actually runs and produces real keys via the
  compiled `pureCircuits.doctorPublicKey`.

**Not yet verified** (needs infra beyond this session's scope): an actual
`deployContract` → `registerPrescription` → `validatePrescription` →
second-`validatePrescription`-fails round trip against a running proof
server + local devnet (only the proof server container was up, not a full
node/indexer stack). That's the natural next step for the Saturday
09:00–11:00 "nullifier blocks reuse" testing slot in the timeline — happy to
scaffold the vitest integration test (mirroring `example-hello-world`'s
`src/test/`) once the local devnet (`docker compose up`) is available to
actually run it against, rather than committing an untested guess.

## 8. QA checklist status

- [x] Contract compiles cleanly, no warnings
- [x] Comments explain *why*, not just *what*
- [x] Error messages are clear (`"Unauthorized doctor"`, `"Prescription expired"`, `"Prescription already used"`, ...)
- [x] `registerPrescription` stores the commitment correctly
- [x] `validatePrescription` retrieves it correctly and checks drug code match
- [x] Expiry validation present (`blockTimeLt`)
- [x] Nullifier prevents reuse (enforced in-circuit via `Set.member`/`insert`)
- [ ] Live end-to-end test against deployed contract (blocked on local devnet — see §7)
- [ ] Backend `contract.service.ts` itself (owned by the backend/frontend team per CONTEXTO.md's role split — this doc gives them everything needed to wire it up)
