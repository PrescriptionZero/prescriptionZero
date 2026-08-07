// prescription.test.ts
// Drives the compiled prescription.compact contract directly through
// @midnight-ntwrk/compact-runtime's in-memory simulation harness — no proof
// server, wallet, or devnet needed. This exercises the real circuit
// transition logic (assertions, ledger reads/writes), the same mechanism
// the production runtime-verification harness uses. See
// midnight-skills/compact-examples/.../NonFungibleToken.test.ts for the
// pattern this is based on.

import { describe, expect, it } from 'vitest';
import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import { randomBytes } from 'node:crypto';
import {
  Contract,
  ledger,
  pureCircuits,
} from '../managed/prescription/contract/index.js';
import type { PrescriptionPrivateState } from '../src/witnesses.js';

const ADDR = sampleContractAddress();
const COIN_PK = '0'.repeat(64); // not used for auth; identity comes from the doctorSecretKey witness

function makeDoctorKeys(n: number) {
  return Array.from({ length: n }, () => randomBytes(32));
}

// Minimal simulator: swaps the active doctor's secret via witnesses,
// evolves ledger state across circuit calls.
class Sim {
  private contract: Contract<PrescriptionPrivateState>;
  // Both ContractState.data (constructor output) and QueryContext.state
  // (post-circuit-call output) are ChargedState — normalize to that here so
  // led() has one consistent shape to read.
  private state: ReturnType<typeof this.contract.initialState>['currentContractState']['data'];
  private activeSecret: Uint8Array;

  constructor(doctorSecrets: Uint8Array[]) {
    this.activeSecret = doctorSecrets[0]!;
    this.contract = new Contract<PrescriptionPrivateState>(this.witnessesFor());
    const doctorPublicKeys = doctorSecrets.map((sk) => pureCircuits.doctorPublicKey(sk));
    const res = this.contract.initialState(
      createConstructorContext({}, COIN_PK),
      doctorPublicKeys,
    );
    this.state = res.currentContractState.data;
  }

  // commitment (hex) -> nonce, for the prescriptionNonce witness
  private nonces = new Map<string, Uint8Array>();

  private witnessesFor() {
    return {
      doctorSecretKey: (ctx: { privateState: PrescriptionPrivateState }): [PrescriptionPrivateState, Uint8Array] => [
        ctx.privateState,
        this.activeSecret,
      ],
      prescriptionNonce: (
        ctx: { privateState: PrescriptionPrivateState },
        commitment: Uint8Array,
      ): [PrescriptionPrivateState, Uint8Array] => {
        const nonce = this.nonces.get(Buffer.from(commitment).toString('hex'));
        if (!nonce) throw new Error('no nonce registered for this commitment');
        return [ctx.privateState, nonce];
      },
    };
  }

  /** Select which doctor's secret the next call uses. */
  as(secret: Uint8Array): this {
    this.activeSecret = secret;
    return this;
  }

  /** Register the nonce a later validatePrescription(commitment) call should use. */
  withNonce(commitment: Uint8Array, nonce: Uint8Array): this {
    this.nonces.set(Buffer.from(commitment).toString('hex'), nonce);
    return this;
  }

  registerPrescription(commitment: Uint8Array, drugCode: string, expiryDate: bigint): [] {
    this.contract.witnesses = this.witnessesFor();
    const ctx = createCircuitContext(ADDR, COIN_PK, this.state, {});
    const r = this.contract.circuits.registerPrescription(ctx, commitment, drugCode, expiryDate);
    this.state = r.context.currentQueryContext.state;
    return r.result as [];
  }

  /** @param atTime optional simulated block time (unix seconds); defaults to real now */
  validatePrescription(commitment: Uint8Array, drugCode: string, atTime?: number): [] {
    this.contract.witnesses = this.witnessesFor();
    const ctx = createCircuitContext(ADDR, COIN_PK, this.state, {}, undefined, undefined, atTime);
    const r = this.contract.circuits.validatePrescription(ctx, commitment, drugCode);
    this.state = r.context.currentQueryContext.state;
    return r.result as [];
  }

  led() {
    return ledger(this.state);
  }
}

describe('registerPrescription (PR3)', () => {
  it('stores the commitment with the correct drugCode and expiryDate', () => {
    const [doctor1, doctor2, doctor3, doctor4, doctor5] = makeDoctorKeys(5);
    const sim = new Sim([doctor1!, doctor2!, doctor3!, doctor4!, doctor5!]);

    const commitment = randomBytes(32);
    const drugCode = 'IBU400';
    const futureExpiry = BigInt(Math.floor(Date.now() / 1000) + 86_400); // +1 day

    sim.as(doctor1!).registerPrescription(commitment, drugCode, futureExpiry);

    const state = sim.led();
    expect(state.prescriptions.member(commitment)).toBe(true);
    const stored = state.prescriptions.lookup(commitment);
    expect(stored.drugCode).toEqual(drugCode);
    expect(stored.expiryDate).toEqual(futureExpiry);
  });

  it('rejects a caller who is not in the hardcoded doctor allowlist', () => {
    const [doctor1, doctor2, doctor3, doctor4, doctor5] = makeDoctorKeys(5);
    const sim = new Sim([doctor1!, doctor2!, doctor3!, doctor4!, doctor5!]);

    const impostor = randomBytes(32); // not one of the 5 constructor keys
    const futureExpiry = BigInt(Math.floor(Date.now() / 1000) + 86_400);

    expect(() =>
      sim.as(impostor).registerPrescription(randomBytes(32), 'IBU400', futureExpiry),
    ).toThrow('Unauthorized doctor');
  });

  it('rejects an expiry date in the past', () => {
    const [doctor1, doctor2, doctor3, doctor4, doctor5] = makeDoctorKeys(5);
    const sim = new Sim([doctor1!, doctor2!, doctor3!, doctor4!, doctor5!]);

    const pastExpiry = BigInt(Math.floor(Date.now() / 1000) - 86_400); // -1 day

    expect(() =>
      sim.as(doctor1!).registerPrescription(randomBytes(32), 'IBU400', pastExpiry),
    ).toThrow('Invalid expiry date');
  });

  it('rejects registering the same commitment twice', () => {
    const [doctor1, doctor2, doctor3, doctor4, doctor5] = makeDoctorKeys(5);
    const sim = new Sim([doctor1!, doctor2!, doctor3!, doctor4!, doctor5!]);

    const commitment = randomBytes(32);
    const futureExpiry = BigInt(Math.floor(Date.now() / 1000) + 86_400);

    sim.as(doctor1!).registerPrescription(commitment, 'IBU400', futureExpiry);
    expect(() =>
      sim.as(doctor2!).registerPrescription(commitment, 'IBU400', futureExpiry),
    ).toThrow('Prescription already registered');
  });
});

describe('validatePrescription + nullifier (PR4)', () => {
  function registeredPrescription() {
    const [doctor1, doctor2, doctor3, doctor4, doctor5] = makeDoctorKeys(5);
    const sim = new Sim([doctor1!, doctor2!, doctor3!, doctor4!, doctor5!]);
    const commitment = randomBytes(32);
    const nonce = randomBytes(32);
    const drugCode = 'IBU400';
    const registeredAt = Math.floor(Date.now() / 1000);
    const expiryDate = BigInt(registeredAt + 86_400); // +1 day
    sim.as(doctor1!).registerPrescription(commitment, drugCode, expiryDate);
    sim.withNonce(commitment, nonce);
    return { sim, commitment, nonce, drugCode, expiryDate, registeredAt };
  }

  // TEST 1: validatePrescription with a valid commitment + nonce
  it('accepts a valid, unexpired, unused prescription and marks its nullifier used', () => {
    const { sim, commitment, nonce, drugCode } = registeredPrescription();

    sim.validatePrescription(commitment, drugCode);

    const nullifier = pureCircuits.derivePrescriptionNullifier(commitment, nonce);
    expect(sim.led().usedNullifiers.member(nullifier)).toBe(true);
  });

  // TEST 2: validatePrescription against an expired prescription
  it('rejects an expired prescription', () => {
    const { sim, commitment, drugCode, expiryDate } = registeredPrescription();

    const afterExpiry = Number(expiryDate) + 100; // simulate time passing, no real sleep needed
    expect(() => sim.validatePrescription(commitment, drugCode, afterExpiry)).toThrow(
      'Prescription expired',
    );
  });

  // TEST 3: validatePrescription twice with the same commitment/nullifier
  it('rejects reusing an already-validated prescription (the double-spend / "already used" case)', () => {
    const { sim, commitment, drugCode } = registeredPrescription();

    sim.validatePrescription(commitment, drugCode); // 1st redemption: OK
    expect(() => sim.validatePrescription(commitment, drugCode)).toThrow(
      'Prescription already used',
    ); // 2nd redemption: rejected
  });

  it('rejects a drug code that does not match what was registered', () => {
    const { sim, commitment } = registeredPrescription();
    expect(() => sim.validatePrescription(commitment, 'PARACETAMOL500')).toThrow(
      'Drug code mismatch',
    );
  });

  it('rejects an unregistered commitment', () => {
    const [doctor1, doctor2, doctor3, doctor4, doctor5] = makeDoctorKeys(5);
    const sim = new Sim([doctor1!, doctor2!, doctor3!, doctor4!, doctor5!]);
    expect(() => sim.validatePrescription(randomBytes(32), 'IBU400')).toThrow(
      'Prescription not found',
    );
  });
});
