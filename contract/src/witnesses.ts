// witnesses.ts
// TypeScript implementations of prescription.compact's witness functions.
// This is the "backend" side of the ZK boundary: the Compact side declares
// the *signature*, this file supplies the *body*.
//
// HACKATHON SCOPE NOTE: secrets are held in process memory (Map), keyed by
// doctor id / commitment. A real deployment would pull these from a secure
// per-user secret store (device keychain, HSM, etc.) — never a shared
// in-process map. See CONTEXTO.md 5.4/5.5 for how contract.service.ts is
// expected to wire this into the Express backend.

import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger, Witnesses } from '../managed/prescription/contract/index.js';

// No private state needs to persist across calls for this contract — every
// witness value is looked up fresh per call — so the private state shape is
// deliberately empty.
export type PrescriptionPrivateState = Record<string, never>;

export const createPrescriptionPrivateState = (): PrescriptionPrivateState => ({});

// --- Doctor secrets -----------------------------------------------------
// One secret key per demo doctor (Dr. García, Dra. Fernández, ...). The
// corresponding public keys (pureCircuits.doctorPublicKey(secret)) are what
// gets hardcoded into the contract's constructor at deploy time — see
// scripts/derive-doctor-keys.ts.

const doctorSecrets = new Map<string, Uint8Array>();

export function registerDoctorSecret(doctorId: string, secret: Uint8Array): void {
  doctorSecrets.set(doctorId, secret);
}

// The backend sets this right before submitting a registerPrescription tx,
// based on which doctor test-user is authenticated for the request.
let activeDoctorId: string | undefined;

export function setActiveDoctor(doctorId: string): void {
  activeDoctorId = doctorId;
}

// --- Witnesses -------------------------------------------------------------
// (prescriptionNonce, for validatePrescription, is added in PR4 once the
// Compact side declares it.)

export const witnesses: Witnesses<PrescriptionPrivateState> = {
  doctorSecretKey(
    context: WitnessContext<Ledger, PrescriptionPrivateState>,
  ): [PrescriptionPrivateState, Uint8Array] {
    if (!activeDoctorId) {
      throw new Error('doctorSecretKey: no active doctor set — call setActiveDoctor() first');
    }
    const secret = doctorSecrets.get(activeDoctorId);
    if (!secret) {
      throw new Error(`doctorSecretKey: unknown doctor id "${activeDoctorId}"`);
    }
    return [context.privateState, secret];
  },
};
