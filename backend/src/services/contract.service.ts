import { randomBytes } from 'node:crypto';
import { pureCircuits } from '../../../contract/managed/prescription/contract/index.js';

// ============================================================================
// CONTRATO COMPACT / MIDNIGHT ZK — estado real vs. mock
//
// REAL desde acá: deriveHolderCommitment y derivePrescriptionNullifier son
// los `pure circuit` compilados de verdad (contract/src/prescription.compact),
// corren localmente (sin proof server, sin wallet) — ver contract/README.md
// sección 3 y 6.
//
// TODAVÍA MOCK: registrarReceta/validarReceta (necesitan enviar una tx real
// — registerPrescription/validatePrescription son circuitos `impure`, con
// proof real — a un contrato deployado, vía el pipeline completo de
// midnight-js: deployContract/findDeployedContract + callTx, no alcanza con
// llamar una función pura) y verificarProofPropiedad (provePatientOwnership
// también es impure — la prueba la genera Lace en el navegador del
// paciente, no el backend; ver la nota debajo de esa función).
// ============================================================================

export interface RegistrarRecetaResult {
  success: boolean;
  commitment_hash: string;
  tx_id?: string;
}

export interface ValidarRecetaResult {
  valido: boolean;
  motivo?: string;
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

export class ContractService {
  /**
   * MOCK: Simula el registro del commitment hash en la blockchain Midnight.
   * // MOCK - reemplazar cuando se conecte el pipeline de deploy/callTx de midnight-js
   */
  static async registrarReceta(
    codigoMedicamento: string,
    fechaVigencia: string,
    secreto: string
  ): Promise<RegistrarRecetaResult> {
    console.log('⛓️ [MOCK ContractService] Registrando receta en blockchain...');
    const commitmentMock = `mock_commitment_${Date.now()}`;

    return {
      success: true,
      commitment_hash: commitmentMock,
      tx_id: `tx_mock_${Math.random().toString(36).substring(7)}`,
    };
  }

  /**
   * MOCK: Simula la validación de estado en el contrato Compact.
   * // MOCK - reemplazar cuando se conecte el pipeline de deploy/callTx de midnight-js
   */
  static async validarReceta(commitmentHash: string): Promise<ValidarRecetaResult> {
    console.log(`⛓️ [MOCK ContractService] Validando commitment: ${commitmentHash}`);
    return {
      valido: true,
    };
  }

  /**
   * REAL: llama al pure circuit deriveHolderCommitment del contrato compilado.
   * Determinístico — el mismo nonce_paciente siempre da el mismo commitment,
   * el mismo valor que el circuito on-chain va a verificar más tarde en
   * provePatientOwnership.
   *
   * @param noncePacienteHex nonce_paciente en hex (32 bytes = 64 chars)
   * @returns commitment en hex (32 bytes = 64 chars)
   */
  static deriveHolderCommitment(noncePacienteHex: string): string {
    const commitmentBytes = pureCircuits.deriveHolderCommitment(hexToBytes(noncePacienteHex));
    return bytesToHex(commitmentBytes);
  }

  /**
   * REAL: llama al pure circuit derivePrescriptionNullifier del contrato
   * compilado. `nonce` acá es prescription_nonce (secreto interno del
   * backend para este flujo) — NO nonce_paciente. Ver schema.sql 5.2 y el
   * comentario de `witness prescriptionNonce` en prescription.compact.
   *
   * @param commitmentHex commitment en hex
   * @param prescriptionNonceHex prescription_nonce en hex
   * @returns nullifier en hex
   */
  static derivePrescriptionNullifier(commitmentHex: string, prescriptionNonceHex: string): string {
    const nullifierBytes = pureCircuits.derivePrescriptionNullifier(
      hexToBytes(commitmentHex),
      hexToBytes(prescriptionNonceHex),
    );
    return bytesToHex(nullifierBytes);
  }

  /** Genera un prescription_nonce nuevo (32 bytes random), en hex. */
  static generatePrescriptionNonce(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * MOCK: verifica la prueba ZK de propiedad (provePatientOwnership) contra
   * el commitment guardado.
   * // MOCK - el camino real:
   *
   *   provePatientOwnership es un circuito `impure` (genera una prueba real,
   *   ver contract/README.md sección 3, nota sobre por qué NO es `pure`) —
   *   la prueba la genera Lace en el navegador del paciente, con el
   *   nonce_paciente que solo el paciente tiene. El backend nunca ve el
   *   nonce, solo recibe una prueba ya generada.
   *
   *   Para verificarla de verdad acá, hace falta el pipeline completo de
   *   midnight-js contra el contrato ya deployado — no una llamada directa
   *   a pureCircuits/impureCircuits con la "proof" como si fuera un dato
   *   más (los circuitos Compact no reciben un blob de prueba serializado
   *   como argumento; la llamada al circuito ES la que genera/consume la
   *   prueba a través del proof server). Algo así, una vez que haya
   *   contrato deployado + wallet configurada:
   *
   *     const deployed = await findDeployedContract(providers, {
   *       compiledContract,
   *       contractAddress: env.CONTRACT_ADDRESS,
   *       privateStateId: 'prescriptionPrivateState',
   *       initialPrivateState: createPrescriptionPrivateState(),
   *     });
   *     await deployed.callTx.provePatientOwnership(commitmentBytes, noncePacienteBytes);
   *     // el nonce_paciente lo aporta el witness del lado del paciente (Lace),
   *     // no un parámetro que el backend reciba y reenvíe.
   *
   *   Frontend todavía no genera pruebas reales (no existe la integración
   *   con Lace), así que por ahora esto queda mockeado.
   */
  static async verificarProofPropiedad(commitment: string, proof: string): Promise<boolean> {
    console.log(`⛓️ [MOCK ContractService] Verificando prueba de propiedad para commitment: ${commitment}`);

    // Regla de prueba opcional: Si la proof enviada es "proof_invalida", simula fallo 403
    if (proof === 'proof_invalida') {
      return false;
    }

    return true; // Devuelve true por defecto para el flujo feliz
  }
}
