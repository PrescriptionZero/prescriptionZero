# prescription.compact — Contract Layer

Compact smart contract for **"Recetas Digitales para Viajeros"** (Hack Buenos
Aires, Midnight Network). Lets a doctor in a partner network register a
prescription commitment, and a pharmacy abroad redeem it via a ZK proof —
without either side ever learning the patient's diagnosis or identity. See
`../CONTEXTO.md` for the full product/architecture context.

Status: **compiles cleanly** with `compact 0.5.1` (language `>= 0.16`,
runtime `0.16.0`). No warnings. **10/10 tests passing** (real, run via
`@midnight-ntwrk/compact-runtime`'s in-memory simulation — no proof server
or devnet required).

> **Scope note**: `../tasks/zk/` splits this contract into Camino A
> (struct + doctors + `registerPrescription`, Dev-ZK-2) and Camino B
> (nullifier + `validatePrescription`, Dev-ZK-1). This file/branch
> implements **both** end to end, solo — see the PR history on
> `compact/prescription-contract` for the incremental build. Coordinate with
> Dev-ZK-1 before merging so her in-progress work isn't duplicated or
> conflicted.

## 1. Directory layout

```
contract/
├── src/
│   ├── prescription.compact   # the contract
│   └── witnesses.ts           # TS implementations of the two witnesses
├── scripts/
│   └── derive-doctor-keys.ts  # generates the 5 demo doctor identities
├── test/
│   └── prescription.test.ts   # 10 tests: unit-style + full E2E scenario
├── managed/prescription/      # compiler output (gitignored — regenerate with `npm run compile`)
└── package.json
```

## 2. What changed vs. the original plain-English spec

Some of the pseudocode in the task prompts (`pub ledger`, `fn`, `.contains()`,
sealed-set array literals, a caller-supplied `nullifier` parameter, a
`registeredAt: Timestamp` field) doesn't match real Compact syntax/semantics.
Resolved while building, with rationale in the file's own comments:

| Spec said | Contract actually does | Why |
|---|---|---|
| `validatePrescription(proof, nullifier, drugCode)` | `validatePrescription(commitment, drugCode)` | There's no "proof" parameter type in Compact — calling an `export circuit` *is* producing the proof. The nullifier isn't caller-supplied either (that would let anyone submit any nullifier for any commitment); it's derived inside the circuit from `commitment` + a secret `nonce` witness, so redeeming requires actually holding the secret. |
| "Verify caller's wallet is in valid doctors list" | Hash-based auth: `doctorSecretKey()` witness → `doctorPublicKey()` hash → checked against `validDoctors: Set<Bytes<32>>` | Compact has no `msg.sender`/wallet-address concept inside a circuit. Identity is proven by hashing a secret the caller holds. |
| `pub ledger x: sealed Set<...> = [0x..., ...]` | `sealed Set` populated via constructor args + `.insert()` | Compact doesn't support ledger initializer literals; `sealed` just means "only constructor may write it". |
| `Prescription { ..., registeredAt: Timestamp }` | No `registeredAt` field | The standard library deliberately exposes only time *comparisons* (`blockTimeLt`, `blockTimeGte`, ...), not a raw "current time" getter — so there's nothing to store. Expiry is enforced with `blockTimeLt(expiryDate)` directly. |
| `Cargo.toml` | `package.json` | Compact tooling isn't Cargo-based; `compact compile` + npm is the actual toolchain. |
| Pseudocode integration test (`await registerPrescription(...)` called directly) | `test/prescription.test.ts` via `createCircuitContext`/`createConstructorContext` | Calling `impureCircuits`/`circuits` directly without a `CircuitContext` isn't how the compiled contract works — see §5. |

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

## 4. Compile / typecheck / test

```bash
cd contract
npm install
npm run compile      # compact compile src/prescription.compact managed/prescription
npm run typecheck    # tsc --noEmit
npm test             # vitest run — 10/10 passing
```

`managed/` and `node_modules/` are gitignored — regenerate/reinstall before
running anything.

### How the tests actually run without a devnet

`test/prescription.test.ts` drives the compiled contract directly via
`@midnight-ntwrk/compact-runtime`'s `createCircuitContext` /
`createConstructorContext` — an in-memory simulation of the same transition
logic (assertions, ledger reads/writes) the production runtime-verification
harness uses. No proof server, wallet, or Docker devnet needed. It even lets
tests pass an explicit block time to `createCircuitContext(..., atTime)`, so
the expiry test simulates time passing without a real `sleep()`. Pattern
based on `midnight-skills/compact-examples/.../NonFungibleToken.test.ts`.

What this does **not** cover: actual ZK proof generation/verification (needs
the proof server) or a real `deployContract` → indexer round trip (needs a
running devnet). Those are the natural next step once the local devnet is up.

## 5. Deploying: doctor key setup

The constructor takes the 5 doctor public keys directly (not secrets — those
never touch the chain):

```compact
constructor(doctorPublicKeys: Vector<5, Bytes<32>>)
```

Generate them with:

```bash
npm run derive-doctor-keys
```

This calls `pureCircuits.doctorPublicKey` from the compiled contract (the
literal same hash the deployed contract will check against), so the printed
public keys are guaranteed correct. It prints:

1. Five secret keys (32 bytes, hex) — **do not commit these**. Hand one to
   each demo doctor's backend session via `registerDoctorSecret(id, secret)`
   in `witnesses.ts`.
2. A ready-to-paste `doctorPublicKeys` array — pass this as the constructor
   argument when deploying (`deployContract(providers, { ..., args: [doctorPublicKeys] })` in `midnight-js`).

## 6. Backend integration (`contract.service.ts`)

Per CONTEXTO.md §5.5, the backend's `contract.service.ts` is the bridge:

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
  fill `recetas.nullifier` — no extra proof needed, it's a pure function.
- **No native events**: Compact has no `emit`. Subscribe to the indexer's
  `contractActions` for this contract address, or poll `queryContractState`
  + `ledger(state)` after submitting.

## 7. QA checklist status

- [x] Contract compiles cleanly, no warnings
- [x] Comments explain *why*, not just *what*
- [x] Error messages are clear (`"Unauthorized doctor"`, `"Invalid expiry date..."`, `"Prescription already registered"`, `"Prescription not found"`, `"Drug code mismatch"`, `"Prescription expired"`, `"Prescription already used"`)
- [x] `registerPrescription` stores commitment + drugCode + expiryDate correctly (tested)
- [x] `validatePrescription` retrieves it correctly and checks drug code match (tested)
- [x] Expiry validation works — tested both directions (future accepted, past/simulated-future rejected)
- [x] Nullifier derived correctly and prevents reuse — tested (the double-spend "wow" moment)
- [x] E2E test: register → validate (OK) → validate (REJECT), all 3 steps verified
- [ ] Live test against a deployed contract on a running devnet (needs `docker compose up` for a full node/indexer stack — only the proof server container was available in this session)
- [ ] Backend `contract.service.ts` itself (see §6 for what it needs to do; not built in this session)
