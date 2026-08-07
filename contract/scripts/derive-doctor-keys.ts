// derive-doctor-keys.ts
// Generates the 5 hardcoded demo doctor identities for the prescription
// contract's constructor. Run this ONCE before deploying; commit the
// printed public keys into the deploy script's constructor args, and hand
// each doctor their own secret (e.g. via registerDoctorSecret in the
// backend, or a per-doctor .env value).
//
//   npx tsx contracts/scripts/derive-doctor-keys.ts
//
// This calls pureCircuits.doctorPublicKey — the exact same domain-separated
// hash (persistentHash([pad(32,"rx0:doctor:pk:"), secret])) that
// prescription.compact uses internally — so the keys printed here are
// guaranteed to match what the deployed contract expects.

import { randomBytes } from 'node:crypto';
import { pureCircuits } from '../managed/prescription/contract/index.js';

const DOCTOR_IDS = [
  'dr-garcia',
  'dra-fernandez',
  'dr-lopez',
  'dra-martinez',
  'dr-rodriguez',
] as const;

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

const doctors = DOCTOR_IDS.map((id) => {
  const secretKey = randomBytes(32);
  const publicKey = pureCircuits.doctorPublicKey(secretKey);
  return { id, secretKey, publicKey };
});

console.log('# Doctor secrets — keep these OUT of source control.');
console.log('# Feed each one to witnesses.ts via registerDoctorSecret(id, secret).\n');
for (const d of doctors) {
  console.log(`${d.id}.secretKey = ${toHex(d.secretKey)}`);
}

console.log('\n# Public keys — hardcode these as the constructor args when deploying');
console.log('# prescription.compact (order matters, must match this array):\n');
console.log('const doctorPublicKeys = [');
for (const d of doctors) {
  console.log(`  Buffer.from('${toHex(d.publicKey)}', 'hex'), // ${d.id}`);
}
console.log('];');
